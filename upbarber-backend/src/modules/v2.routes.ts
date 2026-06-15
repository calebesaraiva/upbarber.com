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
    const { isMain, ...data } = req.body as any;
    const branch = await prisma.$transaction(async (tx) => {
      if (isMain) {
        await tx.branch.updateMany({ where: { barbershopId: tenantId(req), NOT: { id: req.params.id } }, data: { isMain: false } });
      }
      return tx.branch.update({ where: { id: req.params.id }, data: { ...data, ...(typeof isMain === "boolean" ? { isMain } : {}) } });
    });
    await auditLog(req, { module: "Filiais", action: `Editou filial ${branch.name}`, entityType: "branch", entityId: branch.id });
    return ok(res, branch);
  });

  r.patch("/:id/main", validate({ params: idParams }), async (req, res) => {
    const branch = await prisma.$transaction(async (tx) => {
      await tx.branch.updateMany({ where: { barbershopId: tenantId(req) }, data: { isMain: false } });
      return tx.branch.update({ where: { id: req.params.id }, data: { isMain: true } });
    });
    await auditLog(req, { module: "Filiais", action: `Definiu ${branch.name} como matriz`, entityType: "branch", entityId: branch.id });
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
    const branchId = req.body.branchId && req.body.branchId !== "all" ? req.body.branchId : null;
    const whereBranch = branchId ? { branchId } : {};
    const barbers = await prisma.barber.findMany({ where: { barbershopId: tenantId(req), ...whereBranch } });
    const rows = [];
    for (const barber of barbers) {
      const appointments = await prisma.appointment.findMany({ where: { barbershopId: tenantId(req), barberId: barber.id, status: "completed", ...whereBranch }, include: { service: true } });
      const serviceRevenue = appointments.reduce((s, a) => s + Number(a.price), 0);
      const serviceCommission = appointments.reduce((s, a) => s + Number(a.price) * Number(a.service.commissionPercent) / 100, 0);
      const report = await prisma.commissionReport.create({ data: { barbershopId: tenantId(req), branchId: branchId ?? undefined, barberId: barber.id, period: req.body.period, serviceCount: appointments.length, serviceRevenue, serviceCommission, totalCommission: serviceCommission } });
      rows.push({ barberId: barber.id, name: barber.name, commissionPercent: Number(barber.commissionPercent), services: { count: appointments.length, revenue: serviceRevenue, commission: serviceCommission }, products: { count: 0, revenue: 0, commission: 0 }, total: serviceCommission, reportId: report.id });
    }
    return ok(res, { period: req.body.period, barbers: rows });
  });
  r.get("/reports", validate({ query: pagingQuery }), async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const where: any = { barbershopId: tenantId(req) };
    for (const key of ["period", "barberId"]) if (req.query[key]) where[key] = req.query[key];
    if (req.query.branchId && req.query.branchId !== "all") where.branchId = req.query.branchId;
    if (req.query.isPaid !== undefined) where.isPaid = req.query.isPaid === "true";
    return paginated(res, await prisma.commissionReport.findMany({ where, skip, take: limit, include: { barber: true, branch: true } }), await prisma.commissionReport.count({ where }), page, limit);
  });
  r.patch("/reports/:id/pay", validate({ params: idParams, body: z.object({ paidAt: z.string().optional() }) }), async (req, res) => ok(res, await prisma.commissionReport.update({ where: { id: req.params.id }, data: { isPaid: true, paidAt: req.body.paidAt ? new Date(req.body.paidAt) : new Date() } })));
  r.get("/reports/:id", validate({ params: idParams }), async (req, res) => ok(res, await prisma.commissionReport.findFirst({ where: { id: req.params.id, barbershopId: tenantId(req) }, include: { barber: true, branch: true } })));
  r.get("/reports/:id/pdf", validate({ params: idParams }), async (req, res) => {
    const report = await prisma.commissionReport.findFirstOrThrow({ where: { id: req.params.id, barbershopId: tenantId(req) }, include: { barber: true, branch: true } });
    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="comissao-${report.barber.name.replace(/\s/g, "-")}-${report.period}.pdf"`);
    doc.pipe(res);
    doc.fontSize(18).font("Helvetica-Bold").text("UpBarber — Relatório de Comissão", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(12).font("Helvetica").text(`Barbeiro: ${report.barber.name}`);
    doc.text(`Filial: ${report.branch?.name ?? "Todas as filiais"}`);
    doc.text(`Período: ${report.period}`);
    doc.text(`Status: ${report.isPaid ? "Pago" : "Pendente"}${report.paidAt ? " em " + report.paidAt.toLocaleDateString("pt-BR") : ""}`);
    doc.moveDown();
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);
    const rows = [
      ["Atendimentos realizados", String(report.serviceCount)],
      ["Receita de serviços", `R$ ${Number(report.serviceRevenue).toFixed(2)}`],
      ["Comissão de serviços", `R$ ${Number(report.serviceCommission).toFixed(2)}`],
      ["Total da comissão", `R$ ${Number(report.totalCommission).toFixed(2)}`],
    ];
    for (const [k, v] of rows) {
      doc.fontSize(11).font("Helvetica").text(k, { continued: true }).font("Helvetica-Bold").text(v, { align: "right" });
      doc.moveDown(0.4);
    }
    doc.end();
  });
  return r;
}

export async function buildBranchRevenueSplit(req: any, start: Date, end: Date) {
  const shopId = tenantId(req);
  const branchId = selectedBranchId(req);
  const branchWhere = branchId ? { id: branchId } : {};

  const [branches, transactions, subscriberAppointments, subscriptionPayments] = await Promise.all([
    prisma.branch.findMany({
      where: { barbershopId: shopId, ...branchWhere },
      orderBy: [{ isMain: "desc" }, { name: "asc" }],
      select: { id: true, name: true, isMain: true }
    }),
    prisma.financialTransaction.findMany({
      where: {
        barbershopId: shopId,
        ...(branchId ? { branchId } : {}),
        type: "income",
        status: "completed",
        date: { gte: start, lte: end }
      },
      select: { amount: true, branchId: true }
    }),
    prisma.appointment.findMany({
      where: {
        barbershopId: shopId,
        ...(branchId ? { branchId } : {}),
        isSubscriber: true,
        status: "completed",
        date: { gte: start, lte: end }
      },
      include: { service: { select: { price: true } } }
    }),
    prisma.subscriptionPayment.findMany({
      where: {
        barbershopId: shopId,
        status: "paid",
        paidAt: { gte: start, lte: end }
      },
      select: { amount: true }
    })
  ]);

  const bucketMap = new Map<string, {
    id: string;
    name: string;
    isMain: boolean;
    directIncome: number;
    subscriberAppointments: number;
    subscriberUsageValue: number;
    allocatedSubscription: number;
    totalAttributedIncome: number;
    sharePercent: number;
  }>();

  const ensureBucket = (id: string, name: string, isMain = false) => {
    if (!bucketMap.has(id)) {
      bucketMap.set(id, {
        id,
        name,
        isMain,
        directIncome: 0,
        subscriberAppointments: 0,
        subscriberUsageValue: 0,
        allocatedSubscription: 0,
        totalAttributedIncome: 0,
        sharePercent: 0
      });
    }
    return bucketMap.get(id)!;
  };

  for (const branch of branches) ensureBucket(branch.id, branch.name, branch.isMain);

  let operationalIncome = 0;
  for (const tx of transactions) {
    const bucketId = tx.branchId ?? "sem-filial";
    const bucket = ensureBucket(bucketId, bucketId === "sem-filial" ? "Sem filial" : "Filial sem nome");
    const amount = Number(tx.amount);
    bucket.directIncome += amount;
    operationalIncome += amount;
  }

  let subscriptionRevenue = 0;
  for (const payment of subscriptionPayments) subscriptionRevenue += Number(payment.amount);

  let totalSubscriberUsageValue = 0;
  for (const appointment of subscriberAppointments) {
    const bucketId = appointment.branchId ?? "sem-filial";
    const bucket = ensureBucket(bucketId, bucketId === "sem-filial" ? "Sem filial" : "Filial sem nome");
    const usageValue = Number(appointment.service?.price ?? 0);
    bucket.subscriberAppointments += 1;
    bucket.subscriberUsageValue += usageValue;
    totalSubscriberUsageValue += usageValue;
  }

  const grossIncome = operationalIncome + subscriptionRevenue;
  for (const bucket of bucketMap.values()) {
    bucket.allocatedSubscription = totalSubscriberUsageValue > 0 ? (subscriptionRevenue * bucket.subscriberUsageValue) / totalSubscriberUsageValue : 0;
    bucket.totalAttributedIncome = bucket.directIncome + bucket.allocatedSubscription;
    bucket.sharePercent = grossIncome > 0 ? (bucket.totalAttributedIncome / grossIncome) * 100 : 0;
  }

  const branchesData = [...bucketMap.values()].sort((a, b) => {
    if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
    return b.totalAttributedIncome - a.totalAttributedIncome;
  });

  return {
    allocationMethod: "Rateio por uso real dos assinantes, com base no valor dos serviços consumidos por filial",
    period: {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10)
    },
    central: {
      operationalIncome,
      subscriptionRevenue,
      grossIncome
    },
    branches: branchesData,
    totals: {
      branches: branchesData.length,
      directIncome: operationalIncome,
      subscriptionRevenue,
      grossIncome
    }
  };
}

function advancedReportsRouter() {
  const r = Router();

  function parsePeriod(req: any) {
    const now = new Date();
    const start = req.query.startDate ? new Date(String(req.query.startDate)) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = req.query.endDate ? new Date(String(req.query.endDate) + "T23:59:59") : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end, startStr: start.toISOString().slice(0, 10), endStr: end.toISOString().slice(0, 10) };
  }

  function branchFilter(req: any) {
    const bId = req.query.branchId;
    return bId && bId !== "all" ? { branchId: bId } : {};
  }

  function barberFilter(req: any) {
    const bId = req.query.barberId;
    return bId && bId !== "all" ? { barberId: bId } : {};
  }

  async function generatePdf(res: any, title: string, table: any[], summary: Record<string, any>) {
    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${title.toLowerCase().replace(/\s/g,"-")}.pdf"`);
    doc.pipe(res);
    doc.fontSize(18).font("Helvetica-Bold").text(`UpBarber — ${title}`, { align: "center" });
    doc.fontSize(10).font("Helvetica").text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, { align: "center" });
    doc.moveDown();
    for (const [k, v] of Object.entries(summary)) {
      doc.fontSize(11).font("Helvetica").text(`${k}: `, { continued: true }).font("Helvetica-Bold").text(String(v));
    }
    doc.moveDown();
    if (table.length > 0) {
      const cols = Object.keys(table[0]);
      doc.fontSize(10).font("Helvetica-Bold").text(cols.join("   |   "));
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      for (const row of table.slice(0, 50)) {
        doc.fontSize(9).font("Helvetica").text(cols.map(c => String(row[c] ?? "")).join("   |   "));
      }
    }
    doc.end();
  }

  // Financial: Revenue
  r.get("/financial/revenue", async (req, res) => {
    const { start, end, startStr, endStr } = parsePeriod(req);
    const bId = tenantId(req);
    const transactions = await prisma.financialTransaction.findMany({
      where: { barbershopId: bId, ...branchFilter(req), type: "income", date: { gte: start, lte: end } }
    });
    const byDay: Record<string, number> = {};
    for (const t of transactions) {
      const day = t.date.toISOString().slice(0, 10);
      byDay[day] = (byDay[day] || 0) + Number(t.amount);
    }
    const chart = Object.entries(byDay).sort().map(([date, value]) => ({ date, value }));
    const total = transactions.reduce((s, t) => s + Number(t.amount), 0);
    const branchSummary = await buildBranchRevenueSplit(req, start, end);
    const payload = { period: { start: startStr, end: endStr }, summary: { total, count: transactions.length }, chart, table: chart, totals: { revenue: total }, branchSummary };
    if (req.query.format === "pdf") return generatePdf(res, "Receita por Período", chart, { Total: `R$ ${total.toFixed(2)}`, Transações: transactions.length });
    if (req.query.format === "csv") return res.type("text/csv").send(["data,valor", ...chart.map(r => `${r.date},${r.value}`)].join("\n"));
    return ok(res, payload);
  });

  r.get("/financial/branch-summary", async (req, res) => {
    const { start, end } = parsePeriod(req);
    return ok(res, await buildBranchRevenueSplit(req, start, end));
  });

  // Financial: Payment methods
  r.get("/financial/payment-methods", async (req, res) => {
    const { start, end, startStr, endStr } = parsePeriod(req);
    const bId = tenantId(req);
    const transactions = await prisma.financialTransaction.findMany({
      where: { barbershopId: bId, ...branchFilter(req), date: { gte: start, lte: end } }
    });
    const byMethod: Record<string, { count: number; total: number }> = {};
    for (const t of transactions) {
      const m = t.paymentMethod ?? "Outro";
      if (!byMethod[m]) byMethod[m] = { count: 0, total: 0 };
      byMethod[m].count++;
      byMethod[m].total += Number(t.amount);
    }
    const table = Object.entries(byMethod).map(([method, d]) => ({ method, count: d.count, total: d.total.toFixed(2) }));
    const payload = { period: { start: startStr, end: endStr }, summary: { methods: table.length }, chart: table, table, totals: {} };
    if (req.query.format === "pdf") return generatePdf(res, "Formas de Pagamento", table, {});
    if (req.query.format === "csv") return res.type("text/csv").send(["forma,quantidade,total", ...table.map(r => `${r.method},${r.count},${r.total}`)].join("\n"));
    return ok(res, payload);
  });

  // Financial: Movements
  r.get("/financial/movements", async (req, res) => {
    const { start, end, startStr, endStr } = parsePeriod(req);
    const bId = tenantId(req);
    const transactions = await prisma.financialTransaction.findMany({
      where: { barbershopId: bId, ...branchFilter(req), date: { gte: start, lte: end } },
      orderBy: { date: "desc" }, take: 200
    });
    const table = transactions.map(t => ({ data: t.date.toISOString().slice(0, 10), tipo: t.type, categoria: t.category, descricao: t.description ?? "", valor: Number(t.amount).toFixed(2), forma: t.paymentMethod ?? "" }));
    const payload = { period: { start: startStr, end: endStr }, summary: { total: transactions.length }, chart: [], table, totals: {} };
    if (req.query.format === "pdf") return generatePdf(res, "Movimentações Financeiras", table, { Total: transactions.length });
    if (req.query.format === "csv") return res.type("text/csv").send(["data,tipo,categoria,descricao,valor,forma", ...table.map(r => Object.values(r).map(v => JSON.stringify(v)).join(","))].join("\n"));
    return ok(res, payload);
  });

  // Financial: Sales
  r.get("/financial/sales", async (req, res) => {
    const { start, end, startStr, endStr } = parsePeriod(req);
    const bId = tenantId(req);
    const orders = await prisma.order.findMany({
      where: { barbershopId: bId, ...branchFilter(req), status: "closed", closedAt: { gte: start, lte: end } },
      include: { items: { include: { product: { select: { name: true } } } } }
    });
    const total = orders.reduce((s, o) => s + Number(o.total), 0);
    const table = orders.map(o => ({ comanda: o.id.slice(-6), itens: o.items.length, total: Number(o.total).toFixed(2), forma: o.paymentMethod ?? "", data: (o.closedAt ?? o.createdAt).toISOString().slice(0, 10) }));
    const payload = { period: { start: startStr, end: endStr }, summary: { total, orders: orders.length }, chart: [], table, totals: { total } };
    if (req.query.format === "pdf") return generatePdf(res, "Vendas", table, { Total: `R$ ${total.toFixed(2)}`, Comandas: orders.length });
    if (req.query.format === "csv") return res.type("text/csv").send(["comanda,itens,total,forma,data", ...table.map(r => Object.values(r).join(","))].join("\n"));
    return ok(res, payload);
  });

  // Subscriptions: Count
  r.get("/subscriptions/count", async (req, res) => {
    const bId = tenantId(req);
    const [active, trial, suspended, cancelled, overdue] = await Promise.all([
      prisma.clientSubscription.count({ where: { barbershopId: bId, status: "active" } }),
      prisma.clientSubscription.count({ where: { barbershopId: bId, status: "trial" } }),
      prisma.clientSubscription.count({ where: { barbershopId: bId, status: "suspended" } }),
      prisma.clientSubscription.count({ where: { barbershopId: bId, status: "cancelled" } }),
      prisma.clientSubscription.count({ where: { barbershopId: bId, status: "overdue" } }),
    ]);
    return ok(res, { period: {}, summary: { active, trial, suspended, cancelled, overdue, total: active + trial + suspended + cancelled + overdue }, chart: [], table: [], totals: { active } });
  });

  // Subscriptions: Transactions
  r.get("/subscriptions/transactions", async (req, res) => {
    const { start, end, startStr, endStr } = parsePeriod(req);
    const bId = tenantId(req);
    const payments = await prisma.subscriptionPayment.findMany({
      where: { barbershopId: bId, dueDate: { gte: start, lte: end } },
      include: { client: { select: { name: true } }, subscription: { include: { plan: { select: { name: true } } } } },
      orderBy: { dueDate: "desc" }, take: 200
    });
    const total = payments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
    const table = payments.map(p => ({ cliente: p.client.name, plano: p.subscription.plan.name, valor: Number(p.amount).toFixed(2), status: p.status, vencimento: p.dueDate.toISOString().slice(0, 10) }));
    return ok(res, { period: { start: startStr, end: endStr }, summary: { total, count: payments.length }, chart: [], table, totals: { total } });
  });

  // Subscriptions: New sales
  r.get("/subscriptions/new-sales", async (req, res) => {
    const { start, end, startStr, endStr } = parsePeriod(req);
    const bId = tenantId(req);
    const subs = await prisma.clientSubscription.findMany({
      where: { barbershopId: bId, createdAt: { gte: start, lte: end } },
      include: { client: { select: { name: true } }, plan: { select: { name: true } } },
      orderBy: { createdAt: "desc" }
    });
    const table = subs.map(s => ({ cliente: s.client.name, plano: s.plan.name, valor: Number(s.price).toFixed(2), status: s.status, data: s.createdAt.toISOString().slice(0, 10) }));
    return ok(res, { period: { start: startStr, end: endStr }, summary: { total: subs.length }, chart: [], table, totals: { count: subs.length } });
  });

  // Subscriptions: Cancelled
  r.get("/subscriptions/cancelled", async (req, res) => {
    const { start, end, startStr, endStr } = parsePeriod(req);
    const bId = tenantId(req);
    const subs = await prisma.clientSubscription.findMany({
      where: { barbershopId: bId, status: "cancelled", cancelledAt: { gte: start, lte: end } },
      include: { client: { select: { name: true } }, plan: { select: { name: true } } }
    });
    const table = subs.map(s => ({ cliente: s.client.name, plano: s.plan.name, data_cancelamento: (s.cancelledAt ?? s.updatedAt).toISOString().slice(0, 10) }));
    return ok(res, { period: { start: startStr, end: endStr }, summary: { total: subs.length }, chart: [], table, totals: { cancelled: subs.length } });
  });

  // Subscriptions: Changes
  r.get("/subscriptions/changes", async (req, res) => {
    const { start, end, startStr, endStr } = parsePeriod(req);
    const bId = tenantId(req);
    const [active, cancelled] = await Promise.all([
      prisma.clientSubscription.count({ where: { barbershopId: bId, createdAt: { gte: start, lte: end } } }),
      prisma.clientSubscription.count({ where: { barbershopId: bId, status: "cancelled", cancelledAt: { gte: start, lte: end } } }),
    ]);
    return ok(res, { period: { start: startStr, end: endStr }, summary: { novas: active, canceladas: cancelled, churn: cancelled }, chart: [], table: [], totals: {} });
  });

  // Subscriptions: By origin
  r.get("/subscriptions/by-origin", async (req, res) => {
    const bId = tenantId(req);
    const subs = await prisma.clientSubscription.findMany({ where: { barbershopId: bId }, include: { plan: { select: { name: true } } } });
    const byPlan: Record<string, number> = {};
    for (const s of subs) { byPlan[s.plan.name] = (byPlan[s.plan.name] || 0) + 1; }
    const table = Object.entries(byPlan).map(([plano, count]) => ({ plano, count }));
    return ok(res, { summary: { total: subs.length }, chart: table, table, totals: {} });
  });

  // Clients: Frequency
  r.get("/clients/frequency", async (req, res) => {
    const { start, end, startStr, endStr } = parsePeriod(req);
    const bId = tenantId(req);
    const appointments = await prisma.appointment.findMany({
      where: { barbershopId: bId, date: { gte: start, lte: end }, status: "completed" },
      include: { client: { select: { name: true } } }
    });
    const byClient: Record<string, { name: string; count: number }> = {};
    for (const a of appointments) {
      if (!byClient[a.clientId]) byClient[a.clientId] = { name: a.client.name, count: 0 };
      byClient[a.clientId].count++;
    }
    const table = Object.entries(byClient).map(([id, d]) => ({ id, cliente: d.name, visitas: d.count })).sort((a, b) => b.visitas - a.visitas);
    return ok(res, { period: { start: startStr, end: endStr }, summary: { totalClients: table.length }, chart: table.slice(0, 20), table: table.slice(0, 100), totals: {} });
  });

  // Clients: Appointments
  r.get("/clients/appointments", async (req, res) => {
    const { start, end, startStr, endStr } = parsePeriod(req);
    const bId = tenantId(req);
    const clients = await prisma.client.findMany({
      where: { barbershopId: bId },
      select: { id: true, name: true, totalVisits: true, totalSpent: true, lastVisitAt: true }
    });
    const table = clients.map(c => ({ cliente: c.name, visitas: c.totalVisits, gasto_total: Number(c.totalSpent).toFixed(2), ultima_visita: c.lastVisitAt?.toISOString().slice(0, 10) ?? "—" }));
    return ok(res, { period: { start: startStr, end: endStr }, summary: { total: clients.length }, chart: [], table, totals: {} });
  });

  // Clients: By service
  r.get("/clients/by-service", async (req, res) => {
    const { start, end, startStr, endStr } = parsePeriod(req);
    const bId = tenantId(req);
    const appointments = await prisma.appointment.findMany({
      where: { barbershopId: bId, date: { gte: start, lte: end }, status: "completed" },
      include: { service: { select: { name: true } } }
    });
    const byService: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const a of appointments) {
      const n = a.service.name;
      if (!byService[n]) byService[n] = { name: n, count: 0, revenue: 0 };
      byService[n].count++;
      byService[n].revenue += Number(a.price);
    }
    const table = Object.values(byService).sort((a, b) => b.count - a.count);
    return ok(res, { period: { start: startStr, end: endStr }, summary: { services: table.length }, chart: table, table, totals: {} });
  });

  // Clients: Product purchases
  r.get("/clients/product-purchases", async (req, res) => {
    const { start, end, startStr, endStr } = parsePeriod(req);
    const bId = tenantId(req);
    const items = await prisma.orderItem.findMany({
      where: { order: { barbershopId: bId, status: "closed", closedAt: { gte: start, lte: end } } },
      include: { product: { select: { name: true } }, order: { select: { closedAt: true } } }
    });
    const byProduct: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const i of items) {
      const n = i.product.name;
      if (!byProduct[n]) byProduct[n] = { name: n, count: 0, revenue: 0 };
      byProduct[n].count += i.quantity;
      byProduct[n].revenue += Number(i.total);
    }
    const table = Object.values(byProduct).sort((a, b) => b.count - a.count);
    return ok(res, { period: { start: startStr, end: endStr }, summary: { products: table.length }, chart: table, table, totals: {} });
  });

  // Clients: By period service
  r.get("/clients/by-period-service", async (req, res) => {
    const { start, end, startStr, endStr } = parsePeriod(req);
    const bId = tenantId(req);
    const appts = await prisma.appointment.findMany({
      where: { barbershopId: bId, date: { gte: start, lte: end }, status: "completed" },
      select: { date: true, serviceId: true, service: { select: { name: true } } }
    });
    const byWeek: Record<string, Record<string, number>> = {};
    for (const a of appts) {
      const week = a.date.toISOString().slice(0, 10);
      if (!byWeek[week]) byWeek[week] = {};
      byWeek[week][a.service.name] = (byWeek[week][a.service.name] || 0) + 1;
    }
    const chart = Object.entries(byWeek).sort().map(([date, services]) => ({ date, ...services }));
    return ok(res, { period: { start: startStr, end: endStr }, summary: {}, chart, table: chart, totals: {} });
  });

  // Marketing: Birthdays
  r.get("/marketing/birthdays", async (req, res) => {
    const bId = tenantId(req);
    const now = new Date();
    const clients = await prisma.client.findMany({ where: { barbershopId: bId, birthdate: { not: null }, isActive: true }, select: { id: true, name: true, phone: true, birthdate: true } });
    const upcoming = clients
      .map(c => { const bd = new Date(c.birthdate!); const next = new Date(now.getFullYear(), bd.getMonth(), bd.getDate()); if (next < now) next.setFullYear(now.getFullYear() + 1); return { ...c, nextBirthday: next.toISOString().slice(0, 10), daysUntil: Math.ceil((next.getTime() - now.getTime()) / 86400000) }; })
      .filter(c => c.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);
    return ok(res, { summary: { total: upcoming.length }, chart: [], table: upcoming, totals: {} });
  });

  // Marketing: New clients
  r.get("/marketing/new-clients", async (req, res) => {
    const { start, end, startStr, endStr } = parsePeriod(req);
    const bId = tenantId(req);
    const clients = await prisma.client.findMany({ where: { barbershopId: bId, createdAt: { gte: start, lte: end } }, orderBy: { createdAt: "desc" } });
    const table = clients.map(c => ({ nome: c.name, telefone: c.phone ?? "—", data: c.createdAt.toISOString().slice(0, 10) }));
    return ok(res, { period: { start: startStr, end: endStr }, summary: { total: clients.length }, chart: [], table, totals: { novos: clients.length } });
  });

  // Marketing: Inactive
  r.get("/marketing/inactive", async (req, res) => {
    const bId = tenantId(req);
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const clients = await prisma.client.findMany({ where: { barbershopId: bId, isActive: true, OR: [{ lastVisitAt: { lt: cutoff } }, { lastVisitAt: null }] }, select: { id: true, name: true, phone: true, lastVisitAt: true } });
    const table = clients.map(c => ({ nome: c.name, telefone: c.phone ?? "—", ultima_visita: c.lastVisitAt?.toISOString().slice(0, 10) ?? "Nunca" }));
    return ok(res, { summary: { total: clients.length }, chart: [], table, totals: { inativos: clients.length } });
  });

  // Marketing: Ratings
  r.get("/marketing/ratings", async (req, res) => {
    const bId = tenantId(req);
    const barbers = await prisma.barber.findMany({ where: { barbershopId: bId, isActive: true }, select: { name: true, rating: true, totalCuts: true } });
    const table = barbers.map(b => ({ barbeiro: b.name, avaliacao: Number(b.rating).toFixed(1), atendimentos: b.totalCuts }));
    return ok(res, { summary: { avg: barbers.length ? (barbers.reduce((s, b) => s + Number(b.rating), 0) / barbers.length).toFixed(1) : 0 }, chart: table, table, totals: {} });
  });

  // Marketing: Acquisition, No-preference, Waitlist (simplified)
  for (const path of ["/marketing/acquisition", "/marketing/no-preference", "/marketing/waitlist"]) {
    r.get(path, async (_req, res) => ok(res, { summary: {}, chart: [], table: [], totals: {} }));
  }

  // Professional: Service commissions
  r.get("/professional/service-commissions", async (req, res) => {
    const { start, end, startStr, endStr } = parsePeriod(req);
    const bId = tenantId(req);
    const bf = barberFilter(req);
    const appointments = await prisma.appointment.findMany({
      where: { barbershopId: bId, ...bf, status: "completed", date: { gte: start, lte: end } },
      include: { barber: { select: { name: true, commissionPercent: true } }, service: { select: { name: true, commissionPercent: true } } }
    });
    const byBarber: Record<string, { name: string; count: number; revenue: number; commission: number }> = {};
    for (const a of appointments) {
      const n = a.barber.name;
      if (!byBarber[n]) byBarber[n] = { name: n, count: 0, revenue: 0, commission: 0 };
      const pct = Number(a.service.commissionPercent) || Number(a.barber.commissionPercent) || 0;
      byBarber[n].count++;
      byBarber[n].revenue += Number(a.price);
      byBarber[n].commission += Number(a.price) * pct / 100;
    }
    const table = Object.values(byBarber).map(b => ({ barbeiro: b.name, atendimentos: b.count, receita: b.revenue.toFixed(2), comissao: b.commission.toFixed(2) }));
    if (req.query.format === "pdf") return generatePdf(res, "Comissões por Serviço", table, { Total: `R$ ${table.reduce((s, r) => s + Number(r.comissao), 0).toFixed(2)}` });
    if (req.query.format === "csv") return res.type("text/csv").send(["barbeiro,atendimentos,receita,comissao", ...table.map(r => Object.values(r).join(","))].join("\n"));
    return ok(res, { period: { start: startStr, end: endStr }, summary: { total: table.reduce((s, r) => s + Number(r.comissao), 0) }, chart: table, table, totals: {} });
  });

  // Professional: Product commissions
  r.get("/professional/product-commissions", async (req, res) => {
    const { start, end, startStr, endStr } = parsePeriod(req);
    const bId = tenantId(req);
    const orders = await prisma.order.findMany({
      where: { barbershopId: bId, status: "closed", closedAt: { gte: start, lte: end }, barberId: { not: null } },
      include: { barber: { select: { name: true, commissionPercent: true } }, items: { include: { product: { select: { costPrice: true } } } } }
    });
    const byBarber: Record<string, { name: string; revenue: number; commission: number }> = {};
    for (const o of orders) {
      if (!o.barber) continue;
      const n = o.barber.name;
      if (!byBarber[n]) byBarber[n] = { name: n, revenue: 0, commission: 0 };
      byBarber[n].revenue += Number(o.total);
      byBarber[n].commission += Number(o.total) * Number(o.barber.commissionPercent) / 100;
    }
    const table = Object.values(byBarber).map(b => ({ barbeiro: b.name, receita: b.revenue.toFixed(2), comissao: b.commission.toFixed(2) }));
    return ok(res, { period: { start: startStr, end: endStr }, summary: { total: table.reduce((s, r) => s + Number(r.comissao), 0) }, chart: table, table, totals: {} });
  });

  // Professional: Avg ticket per client
  r.get("/professional/avg-ticket-client", async (req, res) => {
    const { start, end, startStr, endStr } = parsePeriod(req);
    const bId = tenantId(req);
    const transactions = await prisma.financialTransaction.findMany({
      where: { barbershopId: bId, type: "income", date: { gte: start, lte: end } }
    });
    const total = transactions.reduce((s, t) => s + Number(t.amount), 0);
    const uniqueClients = new Set(transactions.map(t => t.category)).size;
    return ok(res, { period: { start: startStr, end: endStr }, summary: { avgTicket: uniqueClients ? (total / transactions.length).toFixed(2) : 0 }, chart: [], table: [], totals: {} });
  });

  // Professional: Avg ticket per service
  r.get("/professional/avg-ticket-service", async (req, res) => {
    const { start, end, startStr, endStr } = parsePeriod(req);
    const bId = tenantId(req);
    const appts = await prisma.appointment.findMany({
      where: { barbershopId: bId, date: { gte: start, lte: end }, status: "completed" },
      include: { service: { select: { name: true } } }
    });
    const byService: Record<string, { name: string; total: number; count: number }> = {};
    for (const a of appts) {
      const n = a.service.name;
      if (!byService[n]) byService[n] = { name: n, total: 0, count: 0 };
      byService[n].total += Number(a.price);
      byService[n].count++;
    }
    const table = Object.values(byService).map(s => ({ servico: s.name, ticket_medio: (s.total / s.count).toFixed(2), atendimentos: s.count }));
    return ok(res, { period: { start: startStr, end: endStr }, summary: {}, chart: table, table, totals: {} });
  });

  // Professional: Documents
  r.get("/professional/documents", async (req, res) => {
    const bId = tenantId(req);
    const reports = await prisma.commissionReport.findMany({
      where: { barbershopId: bId }, include: { barber: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 100
    });
    const table = reports.map(r => ({ barbeiro: r.barber.name, periodo: r.period, comissao: Number(r.totalCommission).toFixed(2), pago: r.isPaid ? "Sim" : "Não", data_pagamento: r.paidAt?.toISOString().slice(0, 10) ?? "—" }));
    return ok(res, { summary: { total: reports.length }, chart: [], table, totals: {} });
  });

  return r;
}
