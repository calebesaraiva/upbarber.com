import net from "node:net";
import { createApp } from "./app.js";
import { env } from "./shared/env.js";

const app = createApp();

app.listen(env.PORT, "0.0.0.0", async () => {
  console.log(`UpBarber API running on http://0.0.0.0:${env.PORT}`);
  if (env.REDIS_URL && await canConnectRedis(env.REDIS_URL)) {
    try {
      const { scheduleRecurringJobs, startWorkers } = await import("./jobs.js");
      await scheduleRecurringJobs();
      startWorkers();
      console.log("BullMQ jobs scheduled");
    } catch (error) {
      console.warn("Redis/BullMQ indisponível; API continua sem workers", error);
    }
  } else {
    console.warn("Redis indisponível; API continua sem workers BullMQ");
  }
});

function canConnectRedis(url: string) {
  const parsed = new URL(url);
  const host = parsed.hostname;
  const port = Number(parsed.port || 6379);

  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host, port, timeout: 500 }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}
