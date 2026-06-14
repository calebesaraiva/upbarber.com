import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { z, type AnyZodObject } from "zod";
import { validate } from "../middleware/validate.js";
import { AppError, created, noContent, ok, paginated } from "./http.js";
import { pagination, tenantId, textSearch } from "./query.js";

type Delegate = {
  findMany(args?: unknown): Promise<unknown[]>;
  count(args?: unknown): Promise<number>;
  findFirst(args?: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
};

type CrudOptions = {
  prisma: PrismaClient;
  model: keyof PrismaClient;
  createSchema: AnyZodObject;
  updateSchema?: AnyZodObject;
  searchFields?: string[];
  tenantField?: string;
  softDelete?: boolean;
  include?: unknown;
  listWhere?: (req: Express.Request) => Record<string, unknown>;
  itemWhere?: (req: Express.Request) => Record<string, unknown>;
  beforeCreate?: (data: Record<string, unknown>, req: Express.Request) => Record<string, unknown>;
  beforeUpdate?: (data: Record<string, unknown>, req: Express.Request) => Record<string, unknown>;
};

const idParams = z.object({ id: z.string() });
const listQuery = z.object({ page: z.coerce.number().optional(), limit: z.coerce.number().optional(), search: z.string().optional() }).passthrough();

export function crudRouter(options: CrudOptions) {
  const router = Router();
  const delegate = options.prisma[options.model] as Delegate;
  const tenantField = options.tenantField ?? "barbershopId";
  const updateSchema = options.updateSchema ?? options.createSchema.partial();

  router.get("/", validate({ query: listQuery }), async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const where: Record<string, unknown> = {
      [tenantField]: tenantId(req),
      ...(options.listWhere?.(req) ?? {}),
      ...textSearch(req.query.search, options.searchFields ?? ["name"])
    };

    for (const [key, value] of Object.entries(req.query)) {
      if (["page", "limit", "search"].includes(key) || value === undefined || value === "") continue;
      where[key] = value === "true" ? true : value === "false" ? false : value;
    }

    const [data, total] = await Promise.all([
      delegate.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include: options.include }),
      delegate.count({ where })
    ]);
    return paginated(res, data, total, page, limit);
  });

  router.post("/", validate({ body: options.createSchema }), async (req, res) => {
    const data = options.beforeCreate?.(req.body, req) ?? req.body;
    const item = await delegate.create({ data: { ...data, [tenantField]: tenantId(req) }, include: options.include });
    return created(res, item);
  });

  router.get("/:id", validate({ params: idParams }), async (req, res) => {
    const item = await delegate.findFirst({ where: { id: req.params.id, [tenantField]: tenantId(req), ...(options.itemWhere?.(req) ?? {}) }, include: options.include });
    return ok(res, item);
  });

  router.put("/:id", validate({ params: idParams, body: updateSchema }), async (req, res) => {
    const data = options.beforeUpdate?.(req.body, req) ?? req.body;
    const scope = { id: req.params.id, [tenantField]: tenantId(req), ...(options.itemWhere?.(req) ?? {}) };
    const existing = await delegate.findFirst({ where: scope });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Registro não encontrado");
    const item = await delegate.update({ where: { id: req.params.id }, data, include: options.include });
    return ok(res, item);
  });

  router.delete("/:id", validate({ params: idParams }), async (req, res) => {
    const scope = { id: req.params.id, [tenantField]: tenantId(req), ...(options.itemWhere?.(req) ?? {}) };
    const existing = await delegate.findFirst({ where: scope });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Registro não encontrado");
    await delegate.update({ where: { id: req.params.id }, data: { isActive: false } });
    return noContent(res);
  });

  return router;
}
