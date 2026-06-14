import { sameDateOnly } from "./time.js";
import { AppError } from "./http.js";

export function tenantId(req: Express.Request) {
  if (!req.user?.barbershopId) throw new AppError(403, "TENANT_REQUIRED", "Token sem barbershopId");
  return req.user.barbershopId;
}

export function pagination(query: Record<string, unknown>) {
  const page = Math.max(Number(query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

export function textSearch(search: unknown, fields: string[]) {
  if (!search || typeof search !== "string") return {};
  return {
    OR: fields.map((field) => ({ [field]: { contains: search, mode: "insensitive" } }))
  };
}

export function parseDateRange(query: Record<string, unknown>, field = "createdAt") {
  const range: Record<string, Date> = {};
  if (typeof query.startDate === "string") range.gte = sameDateOnly(query.startDate);
  if (typeof query.endDate === "string") {
    const end = sameDateOnly(query.endDate);
    end.setHours(23, 59, 59, 999);
    range.lte = end;
  }
  return Object.keys(range).length ? { [field]: range } : {};
}
