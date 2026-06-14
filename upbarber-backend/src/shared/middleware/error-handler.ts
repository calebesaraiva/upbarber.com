import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "../utils/http.js";

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, "NOT_FOUND", `Rota ${req.method} ${req.path} não encontrada`));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Dados inválidos", details: error.flatten() } });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const status = error.code === "P2025" ? 404 : error.code === "P2002" ? 409 : 400;
    return res.status(status).json({ error: { code: error.code, message: "Erro no banco de dados", details: error.meta } });
  }

  console.error(error);
  return res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Erro interno do servidor" } });
}
