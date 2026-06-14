import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Secret, SignOptions } from "jsonwebtoken";
import { env } from "../env.js";
import { AppError } from "../utils/http.js";

export type MasterPayload = {
  type: "master";
  adminId: string;
  role: string;
  email: string;
};

export function signMasterToken(payload: MasterPayload) {
  return jwt.sign(payload, env.MASTER_JWT_SECRET as Secret, { expiresIn: env.MASTER_JWT_EXPIRES_IN as SignOptions["expiresIn"] });
}

export function authorizeMaster(req: Request, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) throw new AppError(401, "MASTER_UNAUTHORIZED", "Token master não fornecido");

  try {
    const payload = jwt.verify(auth.slice(7), env.MASTER_JWT_SECRET) as MasterPayload;
    if (payload.type !== "master") throw new Error("invalid token type");
    (req as any).masterAdmin = payload;
    next();
  } catch {
    throw new AppError(401, "MASTER_INVALID_TOKEN", "Token master inválido ou expirado");
  }
}
