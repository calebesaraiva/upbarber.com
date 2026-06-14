import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(3333),
  API_URL: z.string().default("http://localhost:3333"),
  CORS_ORIGINS: z.string().default("http://localhost:5173,http://localhost:5174"),
  DATABASE_URL: z.string().default("postgresql://upbarber:upbarber123@localhost:5432/upbarber"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().default("dev_access_secret_change_me"),
  JWT_REFRESH_SECRET: z.string().default("dev_refresh_secret_change_me"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  MASTER_JWT_SECRET: z.string().default("master_dev_secret_change_me"),
  MASTER_JWT_EXPIRES_IN: z.string().default("8h"),
  UPLOAD_DIR: z.string().default("./uploads"),
  MAX_FILE_SIZE_MB: z.coerce.number().default(5),
  WHATSAPP_PROVIDER: z.string().default("disabled"),
  LOG_LEVEL: z.string().default("info"),
  PAYMENT_GATEWAY: z.string().default("disabled"),
  STRIPE_PUBLIC_KEY: z.string().default(""),
  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().default(""),
  EFI_ENVIRONMENT: z.string().default("production"),
  EFI_CLIENT_ID: z.string().default(""),
  EFI_CLIENT_SECRET: z.string().default(""),
  EFI_CERT_PATH: z.string().default(""),
  EFI_CERT_PASSWORD: z.string().default(""),
  EFI_CERT_BASE64: z.string().default(""),
  EFI_PIX_KEY: z.string().default(""),
  EFI_RECEIVER_NAME: z.string().default(""),
  EFI_RECEIVER_CITY: z.string().default("")
  ,SMTP_HOST: z.string().default("smtp.hostinger.com")
  ,SMTP_PORT: z.coerce.number().default(465)
  ,SMTP_USER: z.string().default("")
  ,SMTP_PASS: z.string().default("")
  ,SMTP_FROM_EMAIL: z.string().default("")
  ,SMTP_FROM_NAME: z.string().default("UpBarber")
  ,APP_URL: z.string().default("http://localhost:5174")
  ,PIX_KEY: z.string().default("52671137000171")
  ,PIX_RECEIVER_NAME: z.string().default("NEXUS TECNOLOGIA LTDA")
  ,PIX_RECEIVER_CITY: z.string().default("SAO PAULO")
});

export const env = envSchema.parse(process.env);
export const corsOrigins = env.CORS_ORIGINS.split(",").map((origin) => origin.trim());
