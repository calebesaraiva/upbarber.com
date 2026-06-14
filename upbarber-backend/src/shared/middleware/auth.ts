import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Secret, SignOptions } from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import { env } from "../env.js";
import { prisma } from "../prisma.js";
import { AppError } from "../utils/http.js";

export type TokenPayload = {
  userId: string;
  barbershopId?: string | null;
  role: UserRole;
  email: string;
};

export function signAccessToken(payload: TokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET as Secret, { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] });
}

export function signRefreshToken(payload: TokenPayload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET as Secret, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"] });
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "UNAUTHORIZED", "Token de autenticação ausente");
  }

  try {
    req.user = jwt.verify(header.slice(7), env.JWT_SECRET) as TokenPayload;
    next();
  } catch {
    throw new AppError(401, "INVALID_TOKEN", "Token inválido ou expirado");
  }
}

export async function enforceTenantAccess(req: Request, _res: Response, next: NextFunction) {
  const barbershopId = req.user?.barbershopId;
  if (!barbershopId) throw new AppError(403, "TENANT_REQUIRED", "Usuário sem barbearia vinculada");

  const shop = await prisma.barbershop.findUnique({
    where: { id: barbershopId },
    select: { saasStatus: true, trialEndsAt: true }
  });
  if (!shop) throw new AppError(403, "TENANT_NOT_FOUND", "Barbearia não encontrada");
  if (["suspended", "cancelled"].includes(shop.saasStatus)) {
    throw new AppError(403, "SUBSCRIPTION_BLOCKED", "A assinatura da barbearia está bloqueada");
  }
  if (shop.saasStatus === "trial" && shop.trialEndsAt && shop.trialEndsAt < new Date()) {
    throw new AppError(403, "TRIAL_EXPIRED", "O período de avaliação terminou");
  }
  next();
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Usuário não autenticado");
    if (!roles.includes(req.user.role)) throw new AppError(403, "FORBIDDEN", "Permissão insuficiente");
    next();
  };
}

export function authorizeAppAccess(req: Request, _res: Response, next: NextFunction) {
  const role = req.user?.role;
  if (!role) throw new AppError(401, "UNAUTHORIZED", "Usuário não autenticado");
  if (role === "admin" || role === "saas_admin") return next();

  const path = req.path;
  const startsWithAny = (allowed: string[]) => allowed.some(prefix => path === prefix || path.startsWith(`${prefix}/`));

  if (role === "barber") {
    const allowed = ["/appointments", "/clients", "/barbers", "/services", "/notifications", "/support", "/auth/me"];
    const canWrite = startsWithAny(["/appointments", "/notifications", "/support"]);
    if (startsWithAny(allowed) && (req.method === "GET" || canWrite)) return next();
  }

  if (role === "receptionist") {
    const allowed = [
      "/appointments", "/clients", "/barbers", "/services", "/service-packages",
      "/products", "/stock", "/orders", "/cash-registers", "/notifications", "/support",
      "/barbershop/payment-methods"
    ];
    if (startsWithAny(allowed)) return next();
  }

  throw new AppError(403, "FORBIDDEN", "Seu perfil não possui acesso a este recurso");
}
