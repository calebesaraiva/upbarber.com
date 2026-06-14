// @ts-nocheck
import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../shared/prisma.js";
import { validate } from "../shared/middleware/validate.js";
import { authorizeMaster, signMasterToken } from "../shared/middleware/master-auth.js";
import { signAccessToken } from "../shared/middleware/auth.js";
import { AppError, created, noContent, ok, paginated } from "../shared/utils/http.js";
import { pagination, textSearch } from "../shared/utils/query.js";

const router = Router();

const idParams = z.object({ id: z.string() });
const pagingQuery = z.object({ page: z.coerce.number().optional(), limit: z.coerce.number().optional(), search: z.string().optional() }).passthrough();
const provisionBarbershopSchema = z.object({
  barbershopName: z.string().min(2),
  ownerName: z.string().min(2),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(6),
  planId: z.string(),
  dueDate: z.coerce.date(),
  paymentMethod: z.enum(["pix", "credit", "debit", "boleto"]),
  phone: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  invoiceStatus: z.enum(["pending", "paid"]).default("pending")
});

router.post("/auth/login", validate({ body: z.object({ email: z.string().email(), password: z.string().min(1) }) }), async (req, res) => {
  const admin = await prisma.masterAdmin.findUnique({ where: { email: req.body.email } });
  if (!admin || !await bcrypt.compare(req.body.password, admin.passwordHash)) {
    throw new AppError(401, "INVALID_MASTER_CREDENTIALS", "Email ou senha inválidos");
  }
  const token = signMasterToken({ type: "master", adminId: admin.id, role: admin.role, email: admin.email });
  return ok(res, { token, admin: publicAdmin(admin) });
});

router.use(authorizeMaster);

router.get("/auth/me", async (req, res) => {
  const admin = await prisma.masterAdmin.findUniqueOrThrow({ where: { id: req.masterAdmin.adminId } });
  return ok(res, publicAdmin(admin));
});

router.get("/barbershops/stats", async (_req, res) => {
  const [total, active, trial, overdue, suspended, cancelled] = await Promise.all([
    prisma.barbershop.count(),
    prisma.barbershop.count({ where: { saasStatus: "active" } }),
    prisma.barbershop.count({ where: { saasStatus: "trial" } }),
    prisma.barbershop.count({ where: { saasStatus: "overdue" } }),
    prisma.barbershop.count({ where: { saasStatus: "suspended" } }),
    prisma.barbershop.count({ where: { saasStatus: "cancelled" } })
  ]);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  return ok(res, {
    total, active, trial, overdue, suspended,
    newThisMonth: await prisma.barbershop.count({ where: { createdAt: { gte: monthStart } } }),
    cancelledThisMonth: cancelled
  });
});

router.get("/barbershops", validate({ query: pagingQuery }), async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const where: any = { ...textSearch(req.query.search, ["name", "email", "phone", "city"]) };
  if (req.query.status) where.saasStatus = req.query.status;
  const planFilter = req.query.plan ? { masterSaasPlan: { slug: req.query.plan } } : {};
  const [rows, total] = await Promise.all([
    prisma.barbershop.findMany({ where: { ...where, ...planFilter }, skip, take: limit, include: { masterSaasPlan: true, users: { where: { role: "admin" }, take: 1 }, invoices: { where: { status: { in: ["pending", "overdue"] } }, orderBy: { dueDate: "asc" }, take: 1 }, _count: { select: { clients: true, branches: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.barbershop.count({ where: { ...where, ...planFilter } })
  ]);
  return paginated(res, rows.map(shop => ({
    id: shop.id,
    name: shop.name,
    ownerName: shop.users[0]?.name ?? "Administrador",
    email: shop.email ?? shop.users[0]?.email,
    phone: shop.phone,
    plan: shop.masterSaasPlan?.name ?? "Sem plano",
    saasStatus: shop.saasStatus,
    mrr: Number(shop.masterSaasPlan?.price ?? 0),
    filiais: shop._count.branches,
    clientsCount: shop._count.clients,
    since: shop.createdAt,
    nextBillingDate: shop.invoices[0]?.dueDate?.toISOString().slice(0, 10) ?? null,
    paymentMethod: shop.invoices[0]?.paymentMethod ?? null
  })), total, page, limit);
});

router.post("/barbershops", validate({ body: provisionBarbershopSchema }), async (req, res) => {
  const email = req.body.ownerEmail.toLowerCase();
  const [plan, existing] = await Promise.all([
    prisma.saasPlan.findFirst({ where: { id: req.body.planId, isActive: true } }),
    prisma.user.findUnique({ where: { email } })
  ]);
  if (!plan) throw new AppError(404, "PLAN_NOT_FOUND", "Plano ativo não encontrado");
  if (existing) throw new AppError(409, "EMAIL_ALREADY_IN_USE", "Este email já está em uso");

  const passwordHash = await bcrypt.hash(req.body.ownerPassword, 10);
  const result = await prisma.$transaction(async (tx) => {
    const barbershop = await tx.barbershop.create({
      data: {
        name: req.body.barbershopName,
        email,
        phone: req.body.phone,
        city: req.body.city,
        state: req.body.state,
        saasPlansId: plan.id,
        saasPlanId: plan.id,
        saasStatus: "active",
        subscriptionStatus: "active"
      }
    });
    const owner = await tx.user.create({
      data: { barbershopId: barbershop.id, name: req.body.ownerName, email, passwordHash, role: "admin" }
    });
    const branch = await tx.branch.create({
      data: {
        barbershopId: barbershop.id,
        name: "Matriz",
        isMain: true,
        phone: req.body.phone,
        address: "Não informado",
        city: req.body.city ?? "Não informado",
        state: req.body.state ?? "NI"
      }
    });
    await tx.barbershopPaymentMethods.create({ data: { barbershopId: barbershop.id } });
    await tx.whatsAppConnection.create({ data: { barbershopId: barbershop.id } });
    const invoice = await tx.saasInvoice.create({
      data: {
        barbershopId: barbershop.id,
        amount: plan.price,
        dueDate: req.body.dueDate,
        paymentMethod: req.body.paymentMethod,
        status: req.body.invoiceStatus,
        paidAt: req.body.invoiceStatus === "paid" ? new Date() : null
      }
    });
    return { barbershop, owner, branch, invoice, plan };
  });

  return created(res, {
    ...result,
    owner: { ...result.owner, passwordHash: undefined, refreshToken: undefined }
  });
});

router.get("/barbershops/:id", validate({ params: idParams }), async (req, res) => {
  const shop = await prisma.barbershop.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      masterSaasPlan: true,
      users: { where: { role: "admin" }, take: 1 },
      invoices: { orderBy: { dueDate: "desc" }, take: 5 },
      tickets: { where: { status: { in: ["open", "in_progress"] } }, orderBy: { createdAt: "desc" } },
      _count: { select: { clients: true, branches: true, barbers: true } }
    }
  });
  return ok(res, shop);
});

router.patch("/barbershops/:id/suspend", validate({ params: idParams, body: z.object({ reason: z.string().optional() }) }), async (req, res) => {
  const shop = await prisma.barbershop.update({ where: { id: req.params.id }, data: { saasStatus: "suspended", suspendedAt: new Date() } });
  await prisma.auditLog.create({ data: { barbershopId: shop.id, userId: await firstUserId(shop.id), module: "master", action: `suspend_barbershop: ${req.body.reason ?? "sem motivo"}` } }).catch(() => undefined);
  return ok(res, shop, "Barbearia suspensa");
});

router.patch("/barbershops/:id/reactivate", validate({ params: idParams }), async (req, res) => {
  const shop = await prisma.barbershop.update({ where: { id: req.params.id }, data: { saasStatus: "active", suspendedAt: null } });
  return ok(res, shop, "Barbearia reativada");
});

router.post("/barbershops/:id/impersonate", validate({ params: idParams }), async (req, res) => {
  const owner = await prisma.user.findFirstOrThrow({ where: { barbershopId: req.params.id, role: "admin", isActive: true } });
  const impersonateToken = signAccessToken({ userId: owner.id, barbershopId: owner.barbershopId, role: owner.role, email: owner.email });
  await prisma.impersonateLog.create({ data: { adminId: req.masterAdmin.adminId, barbershopId: req.params.id, ip: req.ip } });
  return ok(res, { impersonateToken });
});

router.get("/invoices/summary", async (_req, res) => {
  const invoices = await prisma.saasInvoice.findMany();
  const totalPaid = sum(invoices.filter(i => i.status === "paid"), "amount");
  const totalOverdue = sum(invoices.filter(i => i.status === "overdue"), "amount");
  const totalPending = sum(invoices.filter(i => i.status === "pending"), "amount");
  const activePlans = await prisma.barbershop.findMany({ where: { saasStatus: { in: ["active", "overdue"] } }, include: { masterSaasPlan: true } });
  const mrr = activePlans.reduce((acc, shop) => acc + Number(shop.masterSaasPlan?.price ?? 0), 0);
  return ok(res, { totalPaid, totalOverdue, totalPending, mrr, arr: mrr * 12, overdueCount: invoices.filter(i => i.status === "overdue").length });
});

router.get("/invoices", validate({ query: pagingQuery }), async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const where: any = {};
  for (const key of ["status", "barbershopId"]) if (req.query[key]) where[key] = req.query[key];
  if (req.query.month) {
    const [year, month] = String(req.query.month).split("-").map(Number);
    where.dueDate = { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) };
  }
  const [data, total] = await Promise.all([
    prisma.saasInvoice.findMany({ where, skip, take: limit, include: { barbershop: { include: { masterSaasPlan: true } } }, orderBy: { dueDate: "desc" } }),
    prisma.saasInvoice.count({ where })
  ]);
  return paginated(res, data.map(i => ({ ...i, barbershopName: i.barbershop.name, planName: i.barbershop.masterSaasPlan?.name })), total, page, limit);
});

router.post("/invoices/generate-monthly", async (_req, res) => {
  const shops = await prisma.barbershop.findMany({ where: { saasStatus: { in: ["active", "overdue"] }, saasPlanId: { not: null } }, include: { masterSaasPlan: true } });
  const dueDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
  let createdCount = 0;
  for (const shop of shops) {
    const exists = await prisma.saasInvoice.findFirst({ where: { barbershopId: shop.id, dueDate } });
    if (!exists) {
      await prisma.saasInvoice.create({ data: { barbershopId: shop.id, amount: shop.masterSaasPlan?.price ?? 0, dueDate, status: "pending" } });
      createdCount++;
    }
  }
  return created(res, { created: createdCount });
});

router.post("/invoices/:id/charge", validate({ params: idParams, body: z.object({ method: z.string() }) }), async (req, res) => {
  if (!env.PAGARME_API_KEY && !env.STRIPE_SECRET_KEY) {
    throw new AppError(503, "PAYMENT_GATEWAY_NOT_CONFIGURED", "Configure Pagar.me ou Stripe para realizar cobranças");
  }
  throw new AppError(501, "PAYMENT_GATEWAY_ADAPTER_REQUIRED", "O adaptador do gateway configurado ainda não foi habilitado");
});

router.patch("/invoices/:id/mark-paid", validate({ params: idParams, body: z.object({ method: z.string().optional(), paidAt: z.string().optional() }) }), async (req, res) => {
  const invoice = await prisma.saasInvoice.update({ where: { id: req.params.id }, data: { status: "paid", paidAt: req.body.paidAt ? new Date(req.body.paidAt) : new Date(), paymentMethod: req.body.method ?? "manual" } });
  await prisma.barbershop.update({ where: { id: invoice.barbershopId }, data: { saasStatus: "active", suspendedAt: null } });
  return ok(res, invoice);
});

const planSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  price: z.coerce.number(),
  annualPrice: z.coerce.number().default(0),
  features: z.array(z.string()).default([]),
  maxFiliais: z.coerce.number().default(1),
  maxBarbers: z.coerce.number().nullable().optional(),
  maxClients: z.coerce.number().nullable().optional(),
  storageGb: z.coerce.number().default(1),
  color: z.string().default("#6B7280"),
  icon: z.string().default("bolt"),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().optional()
});

router.get("/plans", async (_req, res) => {
  const plans = await prisma.saasPlan.findMany({ include: { _count: { select: { barbershopSubscriptions: true } } }, orderBy: { sortOrder: "asc" } });
  return ok(res, plans.map(plan => ({ ...plan, subscribersCount: plan._count.barbershopSubscriptions })));
});

router.post("/plans", validate({ body: planSchema }), async (req, res) => created(res, await prisma.saasPlan.create({ data: req.body })));
router.put("/plans/:id", validate({ params: idParams, body: planSchema.partial() }), async (req, res) => ok(res, await prisma.saasPlan.update({ where: { id: req.params.id }, data: req.body })));
router.delete("/plans/:id", validate({ params: idParams }), async (req, res) => {
  const subscribersCount = await prisma.barbershop.count({ where: { saasPlanId: req.params.id } });
  if (subscribersCount > 0) throw new AppError(400, "PLAN_HAS_SUBSCRIBERS", "Não é possível excluir plano com assinantes");
  await prisma.saasPlan.delete({ where: { id: req.params.id } });
  return noContent(res);
});

router.get("/reports/summary", async (_req, res) => {
  const invoices = await prisma.saasInvoice.findMany();
  const paidRevenue = sum(invoices.filter(i => i.status === "paid"), "amount");
  const activeShops = await prisma.barbershop.findMany({ where: { saasStatus: { in: ["active", "overdue"] } }, include: { masterSaasPlan: true } });
  const mrr = activeShops.reduce((acc, shop) => acc + Number(shop.masterSaasPlan?.price ?? 0), 0);
  const totalBarbershops = await prisma.barbershop.count();
  return ok(res, { mrr, arr: mrr * 12, churnRate: 0, nps: 72, totalBarbershops, active: activeShops.length, trial: await prisma.barbershop.count({ where: { saasStatus: "trial" } }), suspended: await prisma.barbershop.count({ where: { saasStatus: "suspended" } }), totalRevenue: paidRevenue, avgRevenuePerBarbershop: totalBarbershops ? paidRevenue / totalBarbershops : 0 });
});

router.get("/reports/mrr-history", async (req, res) => ok(res, monthSeries(Number(req.query.months ?? 6)).map(row => ({ ...row, mrr: 0, newSubscribers: 0, cancelled: 0 }))));
router.get("/reports/churn", async (req, res) => ok(res, monthSeries(Number(req.query.months ?? 6)).map(row => ({ ...row, churnRate: 0, retentionRate: 100, churned: 0, total: 0 }))));
router.get("/reports/growth", async (req, res) => ok(res, monthSeries(Number(req.query.months ?? 6)).map(row => ({ ...row, newBarbershops: 0, totalBarbershops: 0 }))));
router.get("/reports/revenue-by-plan", async (_req, res) => {
  const plans = await prisma.saasPlan.findMany({ include: { barbershopSubscriptions: true } });
  return ok(res, plans.map(plan => ({ planName: plan.name, subscribers: plan.barbershopSubscriptions.length, mrr: Number(plan.price) * plan.barbershopSubscriptions.length, avgTicket: Number(plan.price), churnRate: 0, ltv: Number(plan.price) * 24 })));
});
router.get("/reports/export", async (req, res) => res.type("text/csv").send("type,value\n" + `${req.query.type ?? "summary"},0\n`));

router.get("/support/stats", async (_req, res) => {
  const [open, inProgress, answered, closed] = await Promise.all(["open", "in_progress", "answered", "closed"].map(status => prisma.supportTicket.count({ where: { status } })));
  return ok(res, { open, inProgress, answered, closed, avgResponseTimeHours: 0 });
});
router.get("/support/tickets", validate({ query: pagingQuery }), async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const where: any = {};
  for (const key of ["status", "priority", "barbershopId"]) if (req.query[key]) where[key] = req.query[key];
  const [data, total] = await Promise.all([
    prisma.supportTicket.findMany({ where, skip, take: limit, include: { barbershop: true, assignee: true }, orderBy: { createdAt: "desc" } }),
    prisma.supportTicket.count({ where })
  ]);
  return paginated(res, data.map(t => ({ ...t, barbershopName: t.barbershop.name, assigneeName: t.assignee?.name })), total, page, limit);
});
router.get("/support/tickets/:id", validate({ params: idParams }), async (req, res) => ok(res, await prisma.supportTicket.findUniqueOrThrow({ where: { id: req.params.id }, include: { messages: { orderBy: { createdAt: "asc" } }, barbershop: true, assignee: true } })));
router.post("/support/tickets/:id/reply", validate({ params: idParams, body: z.object({ body: z.string().min(1) }) }), async (req, res) => {
  const message = await prisma.ticketMessage.create({ data: { ticketId: req.params.id, authorId: req.masterAdmin.adminId, authorType: "master", body: req.body.body } });
  await prisma.supportTicket.update({ where: { id: req.params.id }, data: { status: "answered" } });
  return created(res, message);
});
router.patch("/support/tickets/:id", validate({ params: idParams, body: z.object({ status: z.string().optional(), priority: z.string().optional(), assigneeId: z.string().nullable().optional() }) }), async (req, res) => ok(res, await prisma.supportTicket.update({ where: { id: req.params.id }, data: req.body })));

router.get("/config", async (_req, res) => {
  const rows = await prisma.platformConfig.findMany();
  return ok(res, Object.fromEntries(rows.map(row => [row.key, isSensitive(row.key) ? "••••••••" : row.value])));
});
router.put("/config", async (req, res) => {
  const entries = Object.entries(req.body ?? {});
  for (const [key, value] of entries) {
    if (isSensitive(key) && value === "••••••••") continue;
    await prisma.platformConfig.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } });
  }
  return ok(res, { updated: entries.length });
});

router.get("/flags", async (_req, res) => {
  const [flags, plans] = await Promise.all([
    prisma.featureFlag.findMany({ include: { planFlags: true }, orderBy: { key: "asc" } }),
    prisma.saasPlan.findMany({ orderBy: { sortOrder: "asc" } })
  ]);
  return ok(res, flags.map(flag => ({ ...flag, plans: plans.map(plan => ({ planId: plan.id, planName: plan.name, enabled: flag.planFlags.some(pf => pf.planId === plan.id && pf.enabled) })) })));
});
router.patch("/flags/:flagId/plan/:planId", validate({ body: z.object({ enabled: z.boolean() }) }), async (req, res) => {
  const item = await prisma.planFeatureFlag.upsert({ where: { planId_flagId: { planId: req.params.planId, flagId: req.params.flagId } }, update: { enabled: req.body.enabled }, create: { planId: req.params.planId, flagId: req.params.flagId, enabled: req.body.enabled } });
  return ok(res, item);
});

function publicAdmin(admin: any) {
  return { id: admin.id, name: admin.name, email: admin.email, role: admin.role };
}

function sum(items: any[], field: string) {
  return items.reduce((acc, item) => acc + Number(item[field] ?? 0), 0);
}

function monthSeries(months: number) {
  return Array.from({ length: months }).map((_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (months - 1 - i));
    return { month: date.toISOString().slice(0, 7) };
  });
}

async function firstUserId(barbershopId: string) {
  const user = await prisma.user.findFirst({ where: { barbershopId } });
  return user?.id ?? (await prisma.user.findFirstOrThrow()).id;
}

function isSensitive(key: string) {
  return ["smtp_pass", "stripe_secret_key", "stripe_webhook_secret"].includes(key);
}

export default router;
