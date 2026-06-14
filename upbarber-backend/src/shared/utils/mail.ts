import nodemailer from "nodemailer";
import { env } from "../env.js";
import { AppError } from "./http.js";

type EmailTone = "gold" | "green" | "blue" | "red";

type EmailLayoutOptions = {
  eyebrow?: string;
  preheader?: string;
  footerNote?: string;
  tone?: EmailTone;
};

const palette: Record<EmailTone, { accent: string; accentSoft: string; contrast: string }> = {
  gold: { accent: "#D4AF37", accentSoft: "#FFF7D6", contrast: "#111111" },
  green: { accent: "#16A34A", accentSoft: "#DCFCE7", contrast: "#052E16" },
  blue: { accent: "#2563EB", accentSoft: "#DBEAFE", contrast: "#0F172A" },
  red: { accent: "#DC2626", accentSoft: "#FEE2E2", contrast: "#450A0A" }
};

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

export function emailLayout(title: string, content: string, options: EmailLayoutOptions = {}) {
  const colors = palette[options.tone ?? "gold"];
  const safeTitle = escapeHtml(title);
  const safeEyebrow = escapeHtml(options.eyebrow ?? "UpBarber");
  const footerNote = options.footerNote ? `<p style="margin:12px 0 0;color:#94A3B8;font-size:12px;line-height:18px">${escapeHtml(options.footerNote)}</p>` : "";
  const preheader = options.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(options.preheader)}</div>` : "";

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background:#F3F0E8;font-family:Arial,Helvetica,sans-serif;color:#111827">
    ${preheader}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#F3F0E8;margin:0;padding:0">
      <tr>
        <td align="center" style="padding:32px 14px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;border-collapse:separate;border-spacing:0">
            <tr>
              <td style="background:#0C0C0D;border-radius:22px 22px 0 0;padding:28px 30px 24px;border:1px solid #1F2937;border-bottom:0">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align:middle">
                      <table role="presentation" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="width:42px;height:42px;background:${colors.accent};border-radius:14px;text-align:center;color:#111111;font-weight:900;font-size:18px">UB</td>
                          <td style="padding-left:12px">
                            <div style="color:#FFFFFF;font-size:18px;font-weight:800;letter-spacing:.2px">UpBarber</div>
                            <div style="color:#CBD5E1;font-size:12px;line-height:18px">Gestão inteligente para barbearias</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" style="vertical-align:middle">
                      <span style="display:inline-block;background:rgba(212,175,55,.12);border:1px solid rgba(212,175,55,.38);color:${colors.accent};font-size:12px;font-weight:700;border-radius:999px;padding:8px 12px">${safeEyebrow}</span>
                    </td>
                  </tr>
                </table>
                <div style="height:26px;line-height:26px">&nbsp;</div>
                <h1 style="margin:0;color:#FFFFFF;font-size:30px;line-height:38px;font-weight:900;letter-spacing:0">${safeTitle}</h1>
                <p style="margin:10px 0 0;color:#CBD5E1;font-size:15px;line-height:24px">Uma experiência UpBarber pensada para ser clara, bonita e fácil de acompanhar em qualquer dispositivo.</p>
              </td>
            </tr>
            <tr>
              <td style="background:#FFFFFF;border:1px solid #E5E7EB;border-top:0;border-radius:0 0 22px 22px;padding:30px;box-shadow:0 18px 48px rgba(15,23,42,.12)">
                <div style="border-left:4px solid ${colors.accent};padding-left:18px">
                  ${content}
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:30px;background:#111111;border-radius:18px">
                  <tr>
                    <td style="padding:22px 24px">
                      <div style="color:#FFFFFF;font-size:16px;font-weight:800">UpBarber</div>
                      <p style="margin:6px 0 0;color:#CBD5E1;font-size:13px;line-height:20px">Tecnologia para barbearias que crescem com controle, agenda organizada e atendimento mais profissional.</p>
                      ${footerNote}
                      <p style="margin:14px 0 0;color:#94A3B8;font-size:12px;line-height:18px">Enviado por comercial@nexustecnologialtda.com.br</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function emailParagraph(value: string) {
  return `<p style="margin:0 0 18px;color:#374151;font-size:16px;line-height:25px">${escapeHtml(value)}</p>`;
}

export function emailButton(label: string, href: string) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 4px">
    <tr>
      <td bgcolor="#D4AF37" style="border-radius:14px">
        <a href="${escapeAttribute(href)}" style="display:inline-block;padding:15px 22px;color:#111111;text-decoration:none;font-weight:900;font-size:15px;line-height:18px;border-radius:14px">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export function emailCode(code: string) {
  return `<div style="margin:22px 0;background:#111111;border-radius:18px;padding:22px;text-align:center">
    <div style="color:#94A3B8;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.8px">Código de segurança</div>
    <div style="margin-top:10px;color:#D4AF37;font-size:34px;line-height:42px;font-weight:900;letter-spacing:8px">${escapeHtml(code)}</div>
  </div>`;
}

export function emailInfoRows(rows: Array<[string, string]>) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;border:1px solid #E5E7EB;border-radius:16px;overflow:hidden">
    ${rows.map(([label, value], index) => `<tr>
      <td style="padding:14px 16px;background:${index % 2 === 0 ? "#FAFAFA" : "#FFFFFF"};color:#6B7280;font-size:13px;font-weight:700;width:42%">${escapeHtml(label)}</td>
      <td style="padding:14px 16px;background:${index % 2 === 0 ? "#FAFAFA" : "#FFFFFF"};color:#111827;font-size:14px;font-weight:800">${escapeHtml(value)}</td>
    </tr>`).join("")}
  </table>`;
}

export function emailCopyBox(value: string, label = "Pix copia e cola") {
  return `<div style="margin:20px 0;padding:18px;background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:16px">
    <div style="color:#64748B;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.8px">${escapeHtml(label)}</div>
    <div style="margin-top:10px;color:#111827;font-size:13px;line-height:20px;font-family:Consolas,Monaco,monospace;word-break:break-all">${escapeHtml(value)}</div>
  </div>`;
}

export function emailSteps(items: string[]) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0">
    ${items.map((item, index) => `<tr>
      <td style="width:34px;vertical-align:top;padding:0 10px 12px 0">
        <div style="width:26px;height:26px;border-radius:999px;background:#111111;color:#D4AF37;text-align:center;font-size:13px;font-weight:900;line-height:26px">${index + 1}</div>
      </td>
      <td style="padding:2px 0 12px;color:#374151;font-size:15px;line-height:22px">${escapeHtml(item)}</td>
    </tr>`).join("")}
  </table>`;
}

export function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
