import { Queue, Worker } from "bullmq";
import { env } from "./shared/env.js";

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
  await queues.saas.upsertJobScheduler("generate-monthly-invoices", { pattern: "0 8 25 * *" });
  await queues.saas.upsertJobScheduler("check-overdue-invoices", { pattern: "0 9 * * *" });
  await queues.saas.upsertJobScheduler("suspend-overdue-barbershops", { pattern: "0 10 * * *" });
  await queues.saas.upsertJobScheduler("expire-trials", { pattern: "30 8 * * *" });
  return queues;
}

export function startWorkers() {
  return Object.keys(createQueues()).map((name) => new Worker(name, async (job) => {
    console.log(`[job:${name}] processing`, job.name, job.id);
  }, { connection }));
}
