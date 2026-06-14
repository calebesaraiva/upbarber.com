// @ts-nocheck
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../shared/prisma.js";
import { validate } from "../shared/middleware/validate.js";
import { AppError, created, noContent, ok, paginated } from "../shared/utils/http.js";
import { pagination, parseDateRange, tenantId, textSearch } from "../shared/utils/query.js";
import { idParams, pagingQuery } from "../shared/schemas.js";
import { env } from "../shared/env.js";
import { addMonths } from "../shared/utils/time.js";

const upload = multer({ dest: env.UPLOAD_DIR, limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 } });

export function selectedBranchId(req: Express.Request) {
  const header = req.headers["x-branch-id"];
  const raw = req.query.branchId ?? header;
  if (!raw || raw === "all") return undefined;
  return Array.isArray(raw) ? raw[0] : String(raw);
}

export function withBranch(req: Express.Request, where: Record<string, unknown> = {}) {
  const branchId = selectedBranchId(req);
  return branchId ? { ...where, branchId } : where;
}

export async function auditLog(req: Express.Request, input: { module: string; action: string; entityType?: string; entityId?: string; metadata?: unknown }) {
  if (!req.user?.userId || !req.user?.barbershopId) return;
  await prisma.auditLog.create({
    data: {
      barbershopId: req.user.barbershopId,
      branchId: selectedBranchId(req),
      userId: req.user.userId,
      module: input.module,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      ipAddress: req.ip,
      metadata: input.metadata as any
    }
  }).catch(() => undefined);
}

export function v2Router() {
  const router = Router();

  router.use("/branches", branchesRouter());
  router.use("/cash-registers", cashRegistersRouter());
  router.use("/audit-logs", auditLogsRouter());
  router.use("/access-groups", accessGroupsRouter());
  router.use("/banners", bannersRouter());
  router.use("/club-benefits", simpleToggleRouter("clubBenefit", z.object({
    name: z.string().min(2),
    description: z.string().min(2),
    type: z.string(),
    value: z.string(),
    isActive: z.boolean().optional()
  }), "Marketing", "benefício"));
  router.use("/promotions", promotionsRouter());
  router.use("/subscription-pipeline", subscriptionPipelineRouter());
  router.use("/commissions", commissionsRouter());
  router.use("/reports/advanced", advancedReportsRouter());

  return router;
}

function branchesRouter() {
  const r = Router();
  const schema = z.object({
    name: z.string().min(2),
    address: z.string().min(2),
    neighborhood: z.string().optional().nullable(),
    city: z.string().min(2),
    state: z.string().min(2),
    zipCode: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    isActive: z.boolean().optional()
  });

  r.get("/", async (req, res) => {
    const branches = await prisma.branch.findMany({ where: { barbershopId: tenantId(req) }, orderBy: [{ isMain: "desc" }, { name: "asc" }] });
    const data = await Promise.all(branches.map(async (branch) => ({
      ...branch,
      barberCount: await prisma.barber.count({ where: { barbershopId: tenantId(req), branchId: branch.id } }),
      clientCount: await prisma.client.count({ where: { barbershopId: tenantId(req) } }),
      monthRevenue: Number((await prisma.financialTransaction.aggregate({ where: { barbershopId: tenantId(req), branchId: branch.id, type: "income" }, _sum: { amount: true } }))._sum.amount ?? 0)
    })));
    return ok(res, data);
  });

  r.post("/", validate({ body: schema }), async (req, res) => {
    const count = await prisma.branch.count({ where: { barbershopId: tenantId(req) } });
    const branch = await prisma.branch.create({ data: { ...req.body, barbershopId: tenantId(req), isMain: count === 0 } });
    await auditLog(req, { module: "Filiais", action: `Criou filial ${branch.name}`, entityType: "branch", entityId: branch.id });
    return created(res, branch);
  });

  r.get("/:id", validate({ params: idParams }), async (req, res) => {
    const branch = await prisma.branch.findFirstOrThrow({ where: { id: req.params.id, barbershopId: tenantId(req) } });
    const [barbers, clients, appointments, revenue] = await Promise.all([
      prisma.barber.findMany({ where: { branchId: branch.id, barbershopId: tenantId(req) } }),
      prisma.client.count({ where: { barbershopId: tenantId(req) } }),
      prisma.appointment.count({ where: { branchId: branch.id, barbershopId: tenantId(req) } }),
      prisma.financialTransaction.aggregate({ where: { branchId: branch.id, barbershopId: tenantId(req), type: "income" }, _sum: { amount: true } })
    ]);
    return ok(res, { branch, barbers, stats: { clients, appointments, revenue: Number(revenue._sum.amount ?? 0) } });
  });

  r.put("/:id", validate({ params: idParams, body: schema.partial().extend({ isMain: z.boolean().optional() }) }), async (req, res) => {
    const branch = await prisma.branch.update({ where: { id: req.params.id }, data: req.body });
    await auditLog(req, { module: "Filiais", action: `Editou filial ${branch.name}`, entityType: "branch", entityId: branch.id });
    return ok(res, branch);
  });

  r.delete("/:id", validate({ params: idParams }), async (req, res) => {
    const branch = await prisma.branch.findFirstOrThrow({ where: { id: req.params.id, barbershopId: tenantId(req) } });
    if (branch.isMain) throw new AppError(422, "MAIN_BRANCH_DELETE", "A filial principal não pode ser excluída");
    await prisma.branch.update({ where: { id: branch.id }, data: { isActive: false } });
    await auditLog(req, { module: "Filiais", action: `Inativou filial ${branch.name}`, entityType: "branch", entityId: branch.id });
    return noContent(res);
  });

  r.patch("/:id/toggle", validate({ params: idParams }), async (req, res) => {
    const current = await prisma.branch.findFirstOrThrow({ where: { id: req.params.id, barbershopId: tenantId(req) } });
    const branch = await prisma.branch.update({ where: { id: current.id }, data: { isActive: !current.isActive } });
    return ok(res, branch);
  });

  return r;
}

function cashRegistersRouter() {
  const r = Router();

  r.get("/current", async (req, res) => {
    const register = await prisma.cashRegister.findFirst({ where: { barbershopId: tenantId(req), status: "open", ...withBranch(req) }, include: { branch: true, openedBy: true }, orderBy: { openedAt: "desc" } });
    return ok(res, { register });
  });

  r.post("/open", validate({ body: z.object({ branchId: z.string(), openingBalance: z.coerce.number().default(0), notes: z.string().optional().nullable() }) }), async (req, res) => {
    const existing = await prisma.cashRegister.findFirst({ where: { barbershopId: tenantId(req), branchId: req.body.branchId, status: "open" } });
    if (existing) throw new AppError(409, "CASH_REGISTER_OPEN", "Já existe caixa aberto para esta filial");
    const register = await prisma.cashRegister.create({ data: { ...req.body, barbershopId: tenantId(req), openedById: req.user!.userId } });
    await auditLog(req, { module: "Financeiro", action: "Abriu caixa", entityType: "cashRegister", entityId: register.id });
    return created(res, register);
  });

  r.post("/:id/close", validate({ params: idParams, body: z.object({ notes: z.string().optional().nullable() }) }), async (req, res) => {
    const register = await prisma.cashRegister.findFirstOrThrow({ where: { id: req.params.id, barbershopId: tenantId(req) } });
    const totals = await prisma.financialTransaction.groupBy({
      by: ["type"],
      where: { barbershopId: tenantId(req), branchId: register.branchId, date: { gte: register.openedAt, lte: new Date() }, status: "completed" },
      _sum: { amount: true }
    });
    const income = Number(totals.find((t) => t.type === "income")?._sum.amount ?? 0);
    const expense = Number(totals.find((t) => t.type === "expense")?._sum.amount ?? 0);
    const closed = await prisma.cashRegister.update({ where: { id: register.id }, data: { status: "closed", closedAt: new Date(), notes: req.body.notes, totalIncome: income, totalExpense: expense, closingBalance: Number(register.openingBalance) + income - expense } });
    await auditLog(req, { module: "Financeiro", action: "Fechou caixa", entityType: "cashRegister", entityId: closed.id });
    return ok(res, closed);
  });

  r.get("/history", validate({ query: pagingQuery }), async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const where = { barbershopId: tenantId(req), status: "closed", ...withBranch(req), ...parseDateRange(req.query, "openedAt") };
    const [data, total] = await Promise.all([
      prisma.cashRegister.findMany({ where, skip, take: limit, include: { openedBy: true, branch: true }, orderBy: { openedAt: "desc" } }),
      prisma.cashRegister.count({ where })
    ]);
    return paginated(res, data, total, page, limit);
  });

  r.get("/:id", validate({ params: idParams }), async (req, res) => {
    const register = await prisma.cashRegister.findFirstOrThrow({ where: { id: req.params.id, barbershopId: tenantId(req) }, include: { branch: true, openedBy: true } });
    const transactions = await prisma.financialTransaction.findMany({ where: { barbershopId: tenantId(req), branchId: register.branchId, date: { gte: register.openedAt, lte: register.closedAt ?? new Date() } } });
    return ok(res, { register, transactions });
  });

  return r;
}

function auditLogsRouter() {
  const r = Router();
  r.get("/", validate({ query: pagingQuery }), async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const where: any = { barbershopId: tenantId(req), ...withBranch(req), ...parseDateRange(req.query, "createdAt"), ...textSearch(req.query.search, ["module", "action", "entityType"]) };
    for (const key of ["module", "userId"]) if (req.query[key]) where[key] = req.query[key];
    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({ where, skip, take: limit, include: { user: true, branch: true }, orderBy: { createdAt: "desc" } }),
      prisma.auditLog.count({ where })
    ]);
    return paginated(res, data, total, page, limit);
  });
  return r;
}

function accessGroupsRouter() {
  const r = Router();
  const schema = z.object({ name: z.string().min(2), color: z.string().default("#6B7280"), description: z.string().optional().nullable(), permissions: z.record(z.boolean()), isDefault: z.boolean().optional() });
  r.get("/", async (req, res) => {
    const groups = await prisma.accessGroup.findMany({ where: { barbershopId: tenantId(req) }, include: { users: true }, orderBy: { createdAt: "asc" } });
    return ok(res, groups.map((group) => ({ ...group, userCount: group.users.length, users: undefined })));
  });
  r.post("/", validate({ body: schema }), async (req, res) => {
    const group = await prisma.accessGroup.create({ data: { ...req.body, barbershopId: tenantId(req) } });
    await auditLog(req, { module: "Configurações", action: `Criou grupo ${group.name}`, entityType: "accessGroup", entityId: group.id });
    return created(res, group);
  });
  r.get("/:id", validate({ params: idParams }), async (req, res) => ok(res, await prisma.accessGroup.findFirst({ where: { id: req.params.id, barbershopId: tenantId(req) }, include: { users: true } })));
  r.put("/:id", validate({ params: idParams, body: schema.partial() }), async (req, res) => ok(res, await prisma.accessGroup.update({ where: { id: req.params.id }, data: req.body })));
  r.delete("/:id", validate({ params: idParams }), async (req, res) => {
    const group = await prisma.accessGroup.findFirstOrThrow({ where: { id: req.params.id, barbershopId: tenantId(req) } });
    if (group.name.toLowerCase() === "admin" || group.isDefault) throw new AppError(422, "DEFAULT_GROUP_DELETE", "Grupo padrão/admin não pode ser excluído");
    await prisma.accessGroup.delete({ where: { id: group.id } });
    return noContent(res);
  });
  r.post("/:id/users", validate({ params: idParams, body: z.object({ userId: z.string() }) }), async (req, res) => ok(res, await prisma.accessGroup.update({ where: { id: req.params.id }, data: { users: { connect: { id: req.body.userId } } }, include: { users: true } })));
  r.delete("/:id/users/:userId", async (req, res) => {
    await prisma.accessGroup.update({ where: { id: req.params.id }, data: { users: { disconnect: { id: req.params.userId } } } });
    return noContent(res);
  });
  return r;
}

function bannersRouter() {
  const schema = z.object({ title: z.string().min(2), linkUrl: z.string().optional().nullable(), startsAt: z.string(), endsAt: z.string(), isActive: z.boolean().optional() });
  const r = simpleToggleRouter("banner", schema, "Marketing", "banner");
  r.post("/:id/image", upload.single("file"), validate({ params: idParams }), async (req, res) => {
    if (!req.file) throw new AppError(400, "FILE_REQUIRED", "Arquivo obrigatório");
    return ok(res, await prisma.banner.update({ where: { id: req.params.id }, data: { imageUrl: `/uploads/${req.file.filename}` } }));
  });
  r.post("/:id/view", validate({ params: idParams }), async (req, res) => ok(res, await prisma.banner.update({ where: { id: req.params.id }, data: { viewCount: { increment: 1 } } })));
  r.post("/:id/click", validate({ params: idParams }), async (req, res) => ok(res, await prisma.banner.update({ where: { id: req.params.id }, data: { clickCount: { increment: 1 } } })));
  return r;
}

function simpleToggleRouter(model: string, schema: z.AnyZodObject, module: string, label: string) {
  const r = Router();
  const delegate = prisma[model];
  r.get("/", validate({ query: pagingQuery }), async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const searchFields = model === "banner" ? ["title"] : ["name", "description"];
    const where: any = { barbershopId: tenantId(req), ...textSearch(req.query.search, searchFields) };
    if (req.query.isActive !== undefined) where.isActive = req.query.isActive === "true";
    const [data, total] = await Promise.all([delegate.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }), delegate.count({ where })]);
    return paginated(res, data, total, page, limit);
  });
  r.post("/", validate({ body: schema }), async (req, res) => {
    const data = { ...req.body, barbershopId: tenantId(req) };
    if (data.startsAt) data.startsAt = new Date(data.startsAt);
    if (data.endsAt) data.endsAt = new Date(data.endsAt);
    const item = await delegate.create({ data });
    await auditLog(req, { module, action: `Criou ${label}`, entityType: model, entityId: item.id });
    return created(res, item);
  });
  r.get("/:id", validate({ params: idParams }), async (req, res) => ok(res, await delegate.findFirst({ where: { id: req.params.id, barbershopId: tenantId(req) } })));
  r.put("/:id", validate({ params: idParams, body: schema.partial() }), async (req, res) => ok(res, await delegate.update({ where: { id: req.params.id }, data: req.body })));
  r.delete("/:id", validate({ params: idParams }), async (req, res) => { await delegate.delete({ where: { id: req.params.id } }); return noContent(res); });
  r.patch("/:id/toggle", validate({ params: idParams }), async (req, res) => {
    const current = await delegate.findFirstOrThrow({ where: { id: req.params.id, barbershopId: tenantId(req) } });
    return ok(res, await delegate.update({ where: { id: current.id }, data: { isActive: !current.isActive } }));
  });
  return r;
}

function promotionsRouter() {
  const schema = z.object({ name: z.string(), discountType: z.enum(["percent", "fixed"]), discountValue: z.coerce.number(), serviceIds: z.array(z.string()), daysOfWeek: z.array(z.number()), startsAt: z.string().optional().nullable(), endsAt: z.string().optional().nullable(), isActive: z.boolean().optional() });
  const r = simpleToggleRouter("promotion", schema, "Marketing", "promoção");
  r.get("/applicable", validate({ query: z.object({ serviceId: z.string(), dayOfWeek: z.coerce.number().optional() }) }), async (req, res) => {
    const day = Number(req.query.dayOfWeek ?? new Date().getDay());
    const items = await prisma.promotion.findMany({ where: { barbershopId: tenantId(req), isActive: true } });
    return ok(res, items.filter((item) => (item.serviceIds as string[]).includes(String(req.query.serviceId)) && (item.daysOfWeek as number[]).includes(day)));
  });
  return r;
}

function subscriptionPipelineRouter() {
  const r = Router();
  const schema = z.object({ clientId: z.string(), planId: z.string(), stage: z.enum(["pre_approved", "pre_cancelled"]), reason: z.string().optional().nullable(), interestLevel: z.string().optional().nullable(), notes: z.string().optional().nullable() });
  r.get("/", validate({ query: pagingQuery }), async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const where: any = { barbershopId: tenantId(req) };
    for (const key of ["stage", "planId"]) if (req.query[key]) where[key] = req.query[key];
    const [data, total] = await Promise.all([prisma.subscriptionPipeline.findMany({ where, skip, take: limit, include: { client: true, plan: true } }), prisma.subscriptionPipeline.count({ where })]);
    return paginated(res, data, total, page, limit);
  });
  r.post("/", validate({ body: schema }), async (req, res) => created(res, await prisma.subscriptionPipeline.create({ data: { ...req.body, barbershopId: tenantId(req) } })));
  r.get("/:id", validate({ params: idParams }), async (req, res) => ok(res, await prisma.subscriptionPipeline.findFirst({ where: { id: req.params.id, barbershopId: tenantId(req) }, include: { client: true, plan: true } })));
  r.put("/:id", validate({ params: idParams, body: schema.partial() }), async (req, res) => ok(res, await prisma.subscriptionPipeline.update({ where: { id: req.params.id }, data: req.body })));
  r.delete("/:id", validate({ params: idParams }), async (req, res) => { await prisma.subscriptionPipeline.delete({ where: { id: req.params.id } }); return noContent(res); });
  r.post("/:id/convert", validate({ params: idParams }), async (req, res) => {
    const item = await prisma.subscriptionPipeline.findFirstOrThrow({ where: { id: req.params.id, barbershopId: tenantId(req) }, include: { plan: true } });
    const start = new Date();
    const sub = await prisma.clientSubscription.create({ data: { clientId: item.clientId, planId: item.planId, barbershopId: tenantId(req), paymentMethod: "pix", price: item.plan.price, currentPeriodStart: start, currentPeriodEnd: addMonths(start, 1) } });
    await prisma.subscriptionPipeline.delete({ where: { id: item.id } });
    return created(res, sub);
  });
  r.post("/:id/retain", validate({ params: idParams }), async (req, res) => {
    await prisma.subscriptionPipeline.delete({ where: { id: req.params.id } });
    return ok(res, { retained: true });
  });
  return r;
}

function commissionsRouter() {
  const r = Router();
  r.post("/generate", validate({ body: z.object({ period: z.string().regex(/^\d{4}-\d{2}$/), branchId: z.string().optional().nullable() }) }), async (req, res) => {
    const whereBranch = req.body.branchId && req.body.branchId !== "all" ? { branchId: req.body.branchId } : {};
    const barbers = await prisma.barber.findMany({ where: { barbershopId: tenantId(req), ...whereBranch } });
    const rows = [];
    for (const barber of barbers) {
      const appointments = await prisma.appointment.findMany({ where: { barbershopId: tenantId(req), barberId: barber.id, status: "completed", ...whereBranch }, include: { service: true } });
      const serviceRevenue = appointments.reduce((s, a) => s + Number(a.price), 0);
      const serviceCommission = appointments.reduce((s, a) => s + Number(a.price) * Number(a.service.commissionPercent) / 100, 0);
      const report = await prisma.commissionReport.create({ data: { barbershopId: tenantId(req), barberId: barber.id, period: req.body.period, serviceCount: appointments.length, serviceRevenue, serviceCommission, totalCommission: serviceCommission } });
      rows.push({ barberId: barber.id, name: barber.name, commissionPercent: Number(barber.commissionPercent), services: { count: appointments.length, revenue: serviceRevenue, commission: serviceCommission }, products: { count: 0, revenue: 0, commission: 0 }, total: serviceCommission, reportId: report.id });
    }
    return ok(res, { period: req.body.period, barbers: rows });
  });
  r.get("/reports", validate({ query: pagingQuery }), async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const where: any = { barbershopId: tenantId(req) };
    for (const key of ["period", "barberId"]) if (req.query[key]) where[key] = req.query[key];
    if (req.query.isPaid !== undefined) where.isPaid = req.query.isPaid === "true";
    return paginated(res, await prisma.commissionReport.findMany({ where, skip, take: limit, include: { barber: true } }), await prisma.commissionReport.count({ where }), page, limit);
  });
  r.patch("/reports/:id/pay", validate({ params: idParams, body: z.object({ paidAt: z.string().optional() }) }), async (req, res) => ok(res, await prisma.commissionReport.update({ where: { id: req.params.id }, data: { isPaid: true, paidAt: req.body.paidAt ? new Date(req.body.paidAt) : new Date() } })));
  r.get("/reports/:id", validate({ params: idParams }), async (req, res) => ok(res, await prisma.commissionReport.findFirst({ where: { id: req.params.id, barbershopId: tenantId(req) }, include: { barber: true } })));
  r.get("/reports/:id/pdf", validate({ params: idParams }), async () => {
    throw new AppError(501, "PDF_EXPORT_NOT_CONFIGURED", "Configure um gerador de PDF para exportar comissões");
  });
  return r;
}

function advancedReportsRouter() {
  const r = Router();
  const paths = [
    "/financial/revenue", "/financial/payment-methods", "/financial/movements", "/financial/sales",
    "/subscriptions/changes", "/subscriptions/cancelled", "/subscriptions/transactions", "/subscriptions/count", "/subscriptions/new-sales", "/subscriptions/by-origin",
    "/clients/frequency", "/clients/appointments", "/clients/product-purchases", "/clients/by-service", "/clients/by-period-service",
    "/marketing/birthdays", "/marketing/ratings", "/marketing/acquisition", "/marketing/inactive", "/marketing/no-preference", "/marketing/waitlist", "/marketing/new-clients",
    "/professional/product-commissions", "/professional/service-commissions", "/professional/documents", "/professional/avg-ticket-client", "/professional/avg-ticket-service"
  ];
  for (const path of paths) {
    r.get(path, async (req, res) => {
      const start = String(req.query.startDate ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
      const end = String(req.query.endDate ?? new Date().toISOString().slice(0, 10));
      const payload = { period: { start, end }, filters: { branchId: req.query.branchId ?? "all", barberId: req.query.barberId ?? "all" }, summary: {}, chart: [], table: [], totals: {} };
      if (req.query.format === "csv") return res.type("text/csv").send("metric,value\nrecords,0\n");
      if (req.query.format === "pdf") throw new AppError(501, "PDF_EXPORT_NOT_CONFIGURED", "Configure um gerador de PDF para exportar relatórios");
      return ok(res, payload);
    });
  }
  return r;
}
