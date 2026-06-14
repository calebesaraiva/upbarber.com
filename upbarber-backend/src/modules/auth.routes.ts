import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../shared/prisma.js";
import { validate } from "../shared/middleware/validate.js";
import { authenticate, enforceTenantAccess, signAccessToken, signRefreshToken, type TokenPayload } from "../shared/middleware/auth.js";
import { env } from "../shared/env.js";
import { AppError, created, ok } from "../shared/utils/http.js";

const router = Router();

const registerSchema = z.object({
  barbershopName: z.string().min(2),
  city: z.string().optional(),
  phone: z.string().optional(),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  saasPlansId: z.string().optional().nullable()
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const refreshSchema = z.object({ refreshToken: z.string().min(10) });
const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string(), newPassword: z.string().min(6) });

function tokenPayload(user: { id: string; barbershopId: string | null; role: TokenPayload["role"]; email: string }) {
  return { userId: user.id, barbershopId: user.barbershopId, role: user.role, email: user.email };
}

router.post("/register", validate({ body: registerSchema }), async (req, res) => {
  const passwordHash = await bcrypt.hash(req.body.password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const barbershop = await tx.barbershop.create({
      data: {
        name: req.body.barbershopName,
        city: req.body.city,
        phone: req.body.phone,
        saasPlansId: req.body.saasPlansId,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      }
    });

    const user = await tx.user.create({
      data: {
        barbershopId: barbershop.id,
        name: req.body.name,
        email: req.body.email,
        passwordHash,
        role: "admin"
      }
    });

    await tx.barbershopPaymentMethods.create({ data: { barbershopId: barbershop.id } });
    await tx.whatsAppConnection.create({ data: { barbershopId: barbershop.id } });

    return { barbershop, user };
  });

  const payload = tokenPayload(result.user);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  await prisma.user.update({ where: { id: result.user.id }, data: { refreshToken, lastLoginAt: new Date() } });

  return created(res, { ...result, user: { ...result.user, passwordHash: undefined }, accessToken, refreshToken });
});

router.post("/login", validate({ body: loginSchema }), async (req, res) => {
  const email = req.body.email.toLowerCase();
  const demoAliasEmail = email === "admin@upbarber.com.br" ? "admin@upbarber.com" : email;
  const user = await prisma.user.findFirst({
    where: { email: { in: [email, demoAliasEmail] } },
    include: { barbershop: true }
  });
  if (!user || !user.isActive) throw new AppError(401, "INVALID_CREDENTIALS", "Email ou senha inválidos");
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

router.post("/forgot-password", validate({ body: forgotSchema }), async (_req, res) => {
  return ok(res, { message: "Se o email existir, enviaremos instruções para redefinição." });
});

router.post("/reset-password", validate({ body: resetSchema }), async (_req, res) => {
  return ok(res, { message: "Fluxo de recuperação preparado para integração SMTP." });
});

router.get("/me", authenticate, enforceTenantAccess, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, include: { barbershop: true } });
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "Usuário não encontrado");
  return ok(res, { user: { ...user, passwordHash: undefined }, barbershop: user.barbershop });
});

export default router;
