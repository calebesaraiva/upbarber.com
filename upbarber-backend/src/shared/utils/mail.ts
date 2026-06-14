import nodemailer from "nodemailer";
import { env } from "../env.js";
import { AppError } from "./http.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
});

export async function sendMail(to: string, subject: string, html: string) {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    throw new AppError(503, "EMAIL_NOT_CONFIGURED", "O envio de email ainda não foi configurado");
  }
  return transporter.sendMail({
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL || env.SMTP_USER}>`,
    to,
    subject,
    html
  });
}

export function emailLayout(title: string, content: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222">
    <h1 style="color:#c9a84c">${title}</h1>${content}
    <p style="font-size:12px;color:#666;margin-top:32px">UpBarber</p>
  </div>`;
}
