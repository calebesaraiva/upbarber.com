import type { Response } from "express";

export function ok<T>(res: Response, data: T, message?: string) {
  return res.json(message ? { data, message } : { data });
}

export function created<T>(res: Response, data: T, message?: string) {
  return res.status(201).json(message ? { data, message } : { data });
}

export function noContent(res: Response) {
  return res.status(204).send();
}

export function paginated<T>(res: Response, data: T[], total: number, page: number, limit: number) {
  return res.json({ data, pagination: { total, page, pages: Math.ceil(total / limit), limit } });
}

export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
