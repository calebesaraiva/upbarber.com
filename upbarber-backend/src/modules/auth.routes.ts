// @ts-nocheck
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../shared/prisma.js";
import { validate } from "../shared/middleware/validate.js";
import { authenticate, enforceTenantAccess, signAccessToken, signRefreshToken, type TokenPayload } from "../shared/middleware/auth.js";
import { env } from "../shared/env.js";
import { AppError, created, ok } from "../shared/utils/http.js";
import { emailButton, emailCode, emailLayout, emailParagraph, emailSecondaryButton, sendMail } from "../shared/utils/mail.js";

const router = Router();

const registerSchema = z.object({
  barbershopName: z.string().min(2),
  city: z.string().optional(),
  phone: z.string().optional(),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  saasPlansId: z.string().optional().nullable(),
  inviteToken: z.string().optional()
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const refreshSchema = z.object({ refreshToken: z.string().min(10) });
const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ email: z.string().email(), code: z.string().length(6), newPassword: z.string().min(6) });
const emailStatusSchema = z.object({ email: z.string().email() });

function tokenPayload(user: { id: string; barbershopId: string | null; role: TokenPayload["role"]; email: string }) {
  return { userId: user.id, barbershopId: user.barbershopId, role: user.role, email: user.email };
}

router.get("/email-status", validate({ query: emailStatusSchema }), async (req, res) => {
  const email = String(req.query.email).toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return ok(res, { exists: Boolean(user) });
});

router.post("/register", validate({ body: registerSchema }), async (req, res) => {
  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const email = req.body.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) throw new AppError(409, "EMAIL_ALREADY_IN_USE", "Este email já está em uso");
  if (req.body.inviteToken) {
    const invite = await prisma.registrationInvite.findFirst({ where: { tokenHash: hash(req.body.inviteToken), status: "pending", expiresAt: { gt: new Date() } } });
    if (!invite || invite.email.toLowerCase() !== email) throw new AppError(400, "INVALID_INVITE", "Convite inválido ou expirado");
  }

  const result = await prisma.$transaction(async (tx) => {
    const barbershop = await tx.barbershop.create({
      data: {
        name: req.body.barbershopName,
        city: req.body.city,
        phone: req.body.phone,
        saasPlansId: req.body.saasPlansId,
        saasPlanId: req.body.saasPlansId,
        saasStatus: "suspended",
        subscriptionStatus: "suspended",
        approvalStatus: "pending",
        registrationSource: req.body.inviteToken ? "invite" : "public"
      }
    });

    const user = await tx.user.create({
      data: {
        barbershopId: barbershop.id,
        name: req.body.name,
        email,
        passwordHash,
        role: "admin",
        isActive: false
      }
    });

    await tx.barbershopPaymentMethods.create({ data: { barbershopId: barbershop.id } });
    await tx.whatsAppConnection.create({ data: { barbershopId: barbershop.id } });
    if (req.body.inviteToken) await tx.registrationInvite.update({ where: { tokenHash: hash(req.body.inviteToken) }, data: { status: "used", usedAt: new Date() } });

    return { barbershop, user };
  });

  await issueEmailVerification(result.user.id, email);
  return created(res, { barbershop: result.barbershop, user: { ...result.user, passwordHash: undefined }, status: "pending_approval" });
});

router.post("/login", validate({ body: loginSchema }), async (req, res) => {
  const email = req.body.email.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email },
    include: { barbershop: true }
  });
  if (!user || !user.isActive) throw new AppError(401, "INVALID_CREDENTIALS", "Email ou senha inválidos");
  if (!user.emailVerifiedAt) throw new AppError(403, "EMAIL_NOT_VERIFIED", "Confirme o código enviado ao seu email");
  if (user.barbershop?.approvalStatus !== "approved") throw new AppError(403, "REGISTRATION_PENDING", "Seu cadastro está aguardando aprovação");
  const valid = await bcrypt.compare(req.body.password, user.passwordHash);
  if (!valid) throw new AppError(401, "INVALID_CREDENTIALS", "Email ou senha inválidos");
  if (!user.barbershop || ["suspended", "cancelled"].includes(user.barbershop.saasStatus)) {
    throw new AppError(403, "SUBSCRIPTION_BLOCKED", "A assinatura da barbearia está bloqueada");
  }
  if (user.barbershop.saasStatus === "trial" && user.barbershop.trialEndsAt && user.barbershop.trialEndsAt < new Date()) {
    throw new AppError(403, "TRIAL_EXPIRED", "O período de avaliação terminou");
  }

  const payload = tokenPayload(user);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken, lastLoginAt: new Date() } });

  return ok(res, { user: { ...user, passwordHash: undefined }, accessToken, refreshToken });
});

router.post("/refresh", validate({ body: refreshSchema }), async (req, res) => {
  try {
    const payload = jwt.verify(req.body.refreshToken, env.JWT_REFRESH_SECRET) as TokenPayload;
    const user = await prisma.user.findFirst({ where: { id: payload.userId, refreshToken: req.body.refreshToken, isActive: true } });
    if (!user) throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token inválido");
    const nextPayload = tokenPayload(user);
    const accessToken = signAccessToken(nextPayload);
    const refreshToken = signRefreshToken(nextPayload);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });
    return ok(res, { accessToken, refreshToken });
  } catch {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token inválido");
  }
});

router.post("/logout", validate({ body: refreshSchema }), async (req, res) => {
  await prisma.user.updateMany({ where: { refreshToken: req.body.refreshToken }, data: { refreshToken: null } });
  return ok(res, { success: true });
});

router.post("/forgot-password", validate({ body: forgotSchema }), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email.toLowerCase() } });
  if (!user) throw new AppError(404, "EMAIL_NOT_FOUND", "E-mail errado ou não cadastrado no sistema");
  await issueCode(user.id, "reset_password", user.email);
  return ok(res, { message: "Enviamos um código de recuperação para seu e-mail." });
});

router.post("/reset-password", validate({ body: resetSchema }), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email.toLowerCase() } });
  if (!user) throw new AppError(400, "INVALID_CODE", "Código inválido ou expirado");
  await consumeCode(user.id, "reset_password", req.body.code);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(req.body.newPassword, 10), refreshToken: null } });
  return ok(res, { message: "Senha redefinida com sucesso." });
});

router.post("/verify-email", validate({ body: z.object({ email: z.string().email(), code: z.string().length(6) }) }), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email.toLowerCase() } });
  if (!user) throw new AppError(400, "INVALID_CODE", "Código inválido ou expirado");
  await consumeCode(user.id, "verify_email", req.body.code);
  await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
  return ok(res, { message: "Email verificado. Aguarde a aprovação do cadastro." });
});

router.get("/verify-email-link", validate({ query: z.object({ token: z.string().min(16) }) }), async (req, res) => {
  const token = String(req.query.token);
  const item = await prisma.authCode.findFirst({
    where: {
      purpose: "verify_email_link",
      codeHash: hash(token),
      consumedAt: null,
      expiresAt: { gt: new Date() }
    },
    include: { user: true },
    orderBy: { createdAt: "desc" }
  });
  if (!item) throw new AppError(400, "INVALID_CODE", "Link de verificação inválido ou expirado");
  await prisma.authCode.update({ where: { id: item.id }, data: { consumedAt: new Date() } });
  await prisma.user.update({ where: { id: item.userId }, data: { emailVerifiedAt: new Date() } });
  return ok(res, { message: "Email verificado com sucesso. Aguarde a aprovação do cadastro." });
});

router.get("/me", authenticate, enforceTenantAccess, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { barbershop: { include: { masterSaasPlan: { select: { name: true, modality: true, defaultModules: true, slug: true } } } } }
  });
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "Usuário não encontrado");
  return ok(res, { user: { ...user, passwordHash: undefined }, barbershop: user.barbershop });
});

export default router;

const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

async function issueCode(userId: string, purpose: string, email: string) {
  const code = String(crypto.randomInt(100000, 1000000));
  await prisma.authCode.create({ data: { userId, purpose, codeHash: hash(code), expiresAt: new Date(Date.now() + 15 * 60 * 1000) } });
  const isReset = purpose === "reset_password";
  await sendMail(
    email,
    isReset ? "Código para redefinir sua senha UpBarber" : "Código de verificação UpBarber",
    emailLayout(
      isReset ? "Vamos proteger seu acesso" : "Confirme seu acesso ao UpBarber",
      `${emailParagraph(isReset
        ? "Recebemos uma solicitação para redefinir sua senha. Use o código abaixo para criar uma nova senha com segurança."
        : "Seu cadastro está quase pronto. Confirme este código para validar seu email e seguir para a análise da sua barbearia."
      )}
      ${emailCode(code)}
      ${emailParagraph("Este código expira em 15 minutos. Se você não solicitou esta ação, pode ignorar este email com segurança.")}`,
      {
        eyebrow: isReset ? "Segurança da conta" : "Cadastro em andamento",
        preheader: isReset ? "Use seu código para redefinir a senha no UpBarber." : "Use seu código para confirmar o cadastro no UpBarber.",
        footerNote: "Nunca compartilhe este código com terceiros. A equipe UpBarber não solicita sua senha por email.",
        tone: isReset ? "blue" : "gold"
      }
    )
  );
}

async function issueEmailVerification(userId: string, email: string) {
  const code = String(crypto.randomInt(100000, 1000000));
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.authCode.create({ data: { userId, purpose: "verify_email", codeHash: hash(code), expiresAt } }),
    prisma.authCode.create({ data: { userId, purpose: "verify_email_link", codeHash: hash(token), expiresAt } })
  ]);

  const verifyUrl = `${env.APP_URL.replace(/\/$/, "")}/verificar-email?token=${encodeURIComponent(token)}`;

  await sendMail(
    email,
    "Confirme seu email para acessar o UpBarber",
    emailLayout(
      "Seu acesso está quase pronto",
      `${emailParagraph("Confirme seu e-mail com um clique para liberar o próximo passo do cadastro. Se preferir, use o código de segurança como alternativa.")}
      ${emailButton("Verificar email agora", verifyUrl)}
      ${emailSecondaryButton("Abrir o link de verificação", verifyUrl)}
      ${emailCode(code)}
      ${emailParagraph("Esse link e o código expiram em 24 horas. Depois da confirmação, o cadastro segue para análise no painel master.")}`,
      {
        eyebrow: "Confirmação de e-mail",
        preheader: "Clique para verificar seu e-mail no UpBarber.",
        footerNote: "Se você não criou este cadastro, apenas ignore este e-mail.",
        tone: "gold"
      }
    )
  );
}

async function consumeCode(userId: string, purpose: string, code: string) {
  const item = await prisma.authCode.findFirst({ where: { userId, purpose, codeHash: hash(code), consumedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  if (!item) throw new AppError(400, "INVALID_CODE", "Código inválido ou expirado");
  await prisma.authCode.update({ where: { id: item.id }, data: { consumedAt: new Date() } });
}
