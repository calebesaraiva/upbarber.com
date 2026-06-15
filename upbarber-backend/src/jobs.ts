import { Queue, Worker } from "bullmq";
import { prisma } from "./shared/prisma.js";
import { env } from "./shared/env.js";
import { createPixCharge } from "./shared/utils/pix.js";
import { emailButton, emailCopyBox, emailInfoRows, emailLayout, emailParagraph, sendMail } from "./shared/utils/mail.js";

const redisUrl = new URL(env.REDIS_URL);
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  password: redisUrl.password || undefined
};

function createQueues() {
  return {
    appointmentReminders: new Queue("appointment-reminders", { connection }),
    subscriptionRenewal: new Queue("subscription-renewal", { connection }),
    birthdayMessages: new Queue("birthday-messages", { connection }),
    inactiveClientMessages: new Queue("inactive-client-messages", { connection }),
    subscriptionDueSoon: new Queue("subscription-due-soon", { connection }),
    campaignDispatcher: new Queue("campaign-dispatcher", { connection }),
    stockAlerts: new Queue("stock-alerts", { connection }),
    saas: new Queue("saas", { connection })
  };
}

export async function scheduleRecurringJobs() {
  const queues = createQueues();
  await queues.appointmentReminders.upsertJobScheduler("every-30-min", { every: 30 * 60 * 1000 });
  await queues.subscriptionRenewal.upsertJobScheduler("daily-0001", { pattern: "1 0 * * *" });
  await queues.birthdayMessages.upsertJobScheduler("daily-0800", { pattern: "0 8 * * *" });
  await queues.inactiveClientMessages.upsertJobScheduler("daily-1000", { pattern: "0 10 * * *" });
  await queues.subscriptionDueSoon.upsertJobScheduler("daily-0900", { pattern: "0 9 * * *" });
  await queues.campaignDispatcher.upsertJobScheduler("every-5-min", { every: 5 * 60 * 1000 });
  await queues.stockAlerts.upsertJobScheduler("hourly", { pattern: "0 * * * *" });
  await queues.saas.upsertJobScheduler("generate-monthly-invoices", { pattern: "0 8 * * *" });
  await queues.saas.upsertJobScheduler("check-overdue-invoices", { pattern: "0 9 * * *" });
  await queues.saas.upsertJobScheduler("suspend-overdue-barbershops", { pattern: "0 10 * * *" });
  await queues.saas.upsertJobScheduler("expire-trials", { pattern: "30 8 * * *" });
  return queues;
}

export function startWorkers() {
  return Object.keys(createQueues()).map((name) => new Worker(name, async (job) => {
    if (name === "saas") return handleSaasJob(job.name);
    console.log(`[job:${name}] processing`, job.name, job.id);
  }, { connection }));
}

async function handleSaasJob(jobName: string) {
  switch (jobName) {
    case "generate-monthly-invoices":
      return generateMonthlyInvoices();
    case "check-overdue-invoices":
      return markOverdueInvoices();
    case "suspend-overdue-barbershops":
      return suspendOverdueBarbershops();
    case "expire-trials":
      return expireTrials();
    default:
      return undefined;
  }
}

async function generateMonthlyInvoices() {
  const shops = await prisma.barbershop.findMany({
    where: {
      saasStatus: { in: ["active", "overdue"] },
      saasPlanId: { not: null }
    },
    include: {
      masterSaasPlan: true,
      users: { where: { role: "admin", isActive: true }, take: 1 },
      invoices: { orderBy: { dueDate: "desc" }, take: 1 }
    }
  });

  const now = new Date();
  let created = 0;

  for (const shop of shops) {
    const latestInvoice = shop.invoices[0];
    if (!latestInvoice || latestInvoice.status !== "paid") continue;

    const nextDueDate = nextBillingDueDate(latestInvoice.dueDate);
    if (nextDueDate > now) continue;

    const exists = await prisma.saasInvoice.findFirst({
      where: { barbershopId: shop.id, dueDate: nextDueDate }
    });
    if (exists) continue;

    const invoice = await prisma.saasInvoice.create({
      data: {
        barbershopId: shop.id,
        amount: shop.masterSaasPlan?.price ?? 0,
        dueDate: nextDueDate,
        status: "pending",
        paymentMethod: "pix"
      }
    });

    const pix = await createPixCharge(Number(invoice.amount), invoice.id, {
      dueDate: invoice.dueDate,
      description: `Mensalidade UpBarber - ${shop.name}`,
      reference: invoice.id
    });

    await prisma.saasInvoice.update({
      where: { id: invoice.id },
      data: {
        pixPayload: pix.copyPaste,
        gatewayRef: pix.txid,
        paymentMethod: "pix"
      }
    });

    await notifyBillingEmail(shop, invoice.id, invoice.amount, invoice.dueDate, pix.copyPaste);
    created++;
  }

  return { created };
}

async function markOverdueInvoices() {
  const overdue = await prisma.saasInvoice.findMany({
    where: { status: "pending", dueDate: { lt: new Date() } },
    include: { barbershop: { include: { users: { where: { role: "admin", isActive: true }, take: 1 } } } }
  });
  let updated = 0;
  for (const invoice of overdue) {
    await prisma.saasInvoice.update({ where: { id: invoice.id }, data: { status: "overdue" } });
    if (invoice.barbershop.saasStatus === "active") {
      await prisma.barbershop.update({ where: { id: invoice.barbershopId }, data: { saasStatus: "overdue", subscriptionStatus: "overdue" } });
    }
    updated++;
  }
  return { updated };
}

async function suspendOverdueBarbershops() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const overdueInvoices = await prisma.saasInvoice.findMany({
    where: { status: "overdue", dueDate: { lt: cutoff } },
    select: { barbershopId: true }
  });
  const ids = [...new Set(overdueInvoices.map((invoice) => invoice.barbershopId))];
  if (ids.length === 0) return { suspended: 0 };
  const result = await prisma.barbershop.updateMany({
    where: { id: { in: ids }, saasStatus: { notIn: ["suspended", "cancelled"] } },
    data: { saasStatus: "suspended", subscriptionStatus: "suspended", suspendedAt: new Date() }
  });
  return { suspended: result.count };
}

async function expireTrials() {
  const result = await prisma.barbershop.updateMany({
    where: { saasStatus: "trial", trialEndsAt: { lt: new Date() } },
    data: { saasStatus: "overdue", subscriptionStatus: "overdue" }
  });
  return { expired: result.count };
}

function nextBillingDueDate(previousDueDate: Date) {
  const next = new Date(previousDueDate);
  const originalDay = next.getDate();
  const hours = next.getHours();
  const minutes = next.getMinutes();
  const seconds = next.getSeconds();
  const milliseconds = next.getMilliseconds();
  next.setMonth(next.getMonth() + 1, 1);
  const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(originalDay, maxDay));
  next.setHours(hours, minutes, seconds, milliseconds);
  return next;
}

async function notifyBillingEmail(shop: { id: string; name: string; users: Array<{ email: string }> }, invoiceId: string, amount: unknown, dueDate: Date, copyPaste: string) {
  const email = shop.users[0]?.email;
  if (!email || !env.SMTP_USER || !env.SMTP_PASS) return;
  try {
    await sendMail(
      email,
      `Cobrança mensal UpBarber - ${shop.name}`,
      emailLayout(
        "Sua assinatura mensal foi gerada",
        `${emailParagraph("A nova mensalidade da sua barbearia já está disponível. O pagamento por Pix mantém o acesso ativo no próximo ciclo.")}${emailInfoRows([
          ["Barbearia", shop.name],
          ["Valor", Number(amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })],
          ["Vencimento", dueDate.toLocaleDateString("pt-BR")],
          ["Referência", invoiceId]
        ])}${emailCopyBox(copyPaste)}${emailButton("Abrir painel", `${env.APP_URL.replace(/\/$/, "")}/login`)}`,
        {
          eyebrow: "Cobrança recorrente",
          preheader: "Sua mensalidade UpBarber foi gerada.",
          footerNote: "Se o pagamento já foi realizado, desconsidere este email."
        }
      )
    );
  } catch {
    return;
  }
}
