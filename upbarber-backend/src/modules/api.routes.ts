// @ts-nocheck
import { Router } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../shared/prisma.js";
import { authenticate, authorize, authorizeAppAccess, enforceTenantAccess } from "../shared/middleware/auth.js";
import { validate } from "../shared/middleware/validate.js";
import { authRateLimit } from "../shared/middleware/rate-limit.js";
import { AppError, created, noContent, ok, paginated } from "../shared/utils/http.js";
import { addMinutes, addMonths, sameDateOnly, timeToMinutes } from "../shared/utils/time.js";
import { pagination, parseDateRange, tenantId, textSearch } from "../shared/utils/query.js";
import { barberSchema, clientSchema, financialTransactionSchema, hhmm, idParams, pagingQuery, productSchema, serviceSchema, subscriptionPlanSchema } from "../shared/schemas.js";
import { crudRouter } from "../shared/utils/crud-router.js";
import authRoutes from "./auth.routes.js";
import { env } from "../shared/env.js";
import { createPixCharge } from "../shared/utils/pix.js";
import { auditLog, selectedBranchId, v2Router, withBranch } from "./v2.routes.js";
import masterRoutes from "./master.routes.js";

const router = Router();
router.use("/auth", authRoutes);
router.use("/master", masterRoutes);
router.get("/public/plans", async (_req, res) => ok(res, await prisma.saasPlan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } })));

router.post("/banners/:id/view", validate({ params: idParams }), async (req, res) => ok(res, await prisma.banner.update({ where: { id: req.params.id }, data: { viewCount: { increment: 1 } } })));
router.post("/banners/:id/click", validate({ params: idParams }), async (req, res) => ok(res, await prisma.banner.update({ where: { id: req.params.id }, data: { clickCount: { increment: 1 } } })));

const upload = multer({
  dest: env.UPLOAD_DIR,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 }
});

router.use(authenticate, enforceTenantAccess, authRateLimit, authorizeAppAccess);
router.use(v2Router());

router.get("/barbershop", async (req, res) => {
  const barbershop = await prisma.barbershop.findUnique({ where: { id: tenantId(req) } });
  return ok(res, barbershop);
});

router.put("/barbershop", validate({ body: z.object({
  name: z.string().optional(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  intervalMinutes: z.coerce.number().int().positive().optional()
}) }), async (req, res) => {
  const barbershop = await prisma.barbershop.update({ where: { id: tenantId(req) }, data: req.body });
  return ok(res, barbershop);
});

router.put("/barbershop/logo", upload.single("file"), async (req, res) => {
  if (!req.file) throw new AppError(400, "FILE_REQUIRED", "Arquivo obrigatório");
  const logoUrl = `/uploads/${req.file.filename}`;
  const barbershop = await prisma.barbershop.update({ where: { id: tenantId(req) }, data: { logoUrl } });
  return ok(res, barbershop);
});

router.get("/barbershop/hours", async (req, res) => {
  const hours = await prisma.barbershopHour.findMany({ where: { barbershopId: tenantId(req) }, orderBy: { day: "asc" } });
  return ok(res, hours);
});

router.put("/barbershop/hours", validate({ body: z.object({
  hours: z.array(z.object({ day: z.coerce.number().int().min(0).max(6), isOpen: z.boolean(), openTime: hhmm, closeTime: hhmm }))
}) }), async (req, res) => {
  const data = await prisma.$transaction(req.body.hours.map((hour: any) => prisma.barbershopHour.upsert({
    where: { barbershopId_day: { barbershopId: tenantId(req), day: hour.day } },
    update: hour,
    create: { ...hour, barbershopId: tenantId(req) }
  })));
  return ok(res, data);
});

router.get("/barbershop/payment-methods", async (req, res) => {
  const methods = await prisma.barbershopPaymentMethods.upsert({
    where: { barbershopId: tenantId(req) },
    update: {},
    create: { barbershopId: tenantId(req) }
  });
  return ok(res, methods);
});

router.put("/barbershop/payment-methods", validate({ body: z.object({
  pix: z.boolean().optional(),
  cash: z.boolean().optional(),
  credit: z.boolean().optional(),
  debit: z.boolean().optional(),
  subscription: z.boolean().optional()
}) }), async (req, res) => {
  const methods = await prisma.barbershopPaymentMethods.upsert({
    where: { barbershopId: tenantId(req) },
    update: req.body,
    create: { ...req.body, barbershopId: tenantId(req) }
  });
  return ok(res, methods);
});

router.get("/users", async (req, res) => {
  const users = await prisma.user.findMany({ where: { barbershopId: tenantId(req) }, orderBy: { createdAt: "desc" } });
  return ok(res, users.map((u) => ({ ...u, passwordHash: undefined, refreshToken: undefined })));
});

router.post("/users", authorize("admin"), validate({ body: z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "barber", "receptionist"])
}) }), async (req, res) => {
  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const user = await prisma.user.create({ data: { barbershopId: tenantId(req), name: req.body.name, email: req.body.email, passwordHash, role: req.body.role, emailVerifiedAt: new Date() } });
  return created(res, { ...user, passwordHash: undefined });
});

router.get("/users/:id", validate({ params: idParams }), async (req, res) => {
  const user = await prisma.user.findFirst({ where: { id: req.params.id, barbershopId: tenantId(req) } });
  return ok(res, user ? { ...user, passwordHash: undefined, refreshToken: undefined } : null);
});

router.put("/users/:id", authorize("admin"), validate({ params: idParams, body: z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "barber", "receptionist"]).optional(),
  isActive: z.boolean().optional()
}) }), async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.params.id }, data: req.body });
  return ok(res, { ...user, passwordHash: undefined });
});

router.delete("/users/:id", authorize("admin"), validate({ params: idParams }), async (req, res) => {
  await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
  return noContent(res);
});

router.put("/users/:id/password", authorize("admin"), validate({ params: idParams, body: z.object({ newPassword: z.string().min(6) }) }), async (req, res) => {
  await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash: await bcrypt.hash(req.body.newPassword, 10) } });
  return noContent(res);
});

const barberCreateSchema = barberSchema;
router.get("/barbers", validate({ query: pagingQuery }), async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const where: any = { barbershopId: tenantId(req), ...withBranch(req), ...textSearch(req.query.search, ["name", "email", "phone", "specialty"]) };
  if (req.query.isActive !== undefined) where.isActive = req.query.isActive === "true";
  const [data, total] = await Promise.all([
    prisma.barber.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include: { services: { include: { service: true } } } }),
    prisma.barber.count({ where })
  ]);
  return paginated(res, data, total, page, limit);
});

router.post("/barbers", validate({ body: barberCreateSchema }), async (req, res) => {
  const { serviceIds, ...data } = req.body;
    const barber = await prisma.barber.create({
    data: {
      ...data,
      barbershopId: tenantId(req),
      branchId: selectedBranchId(req) ?? data.branchId,
      services: serviceIds?.length ? { create: serviceIds.map((serviceId: string) => ({ serviceId })) } : undefined
    },
    include: { services: true }
  });
  return created(res, barber);
});
router.put("/barbers/:id", validate({ params: idParams, body: barberCreateSchema.partial() }), async (req, res) => {
  const { serviceIds, ...data } = req.body;
  const barber = await prisma.barber.update({
    where: { id: req.params.id },
    data: {
      ...data,
      branchId: selectedBranchId(req) ?? data.branchId,
      ...(serviceIds ? { services: { deleteMany: {}, create: serviceIds.map((serviceId: string) => ({ serviceId })) } } : {})
    },
    include: { services: { include: { service: true } } }
  });
  return ok(res, barber);
});

router.get("/barbers/:id/schedule", validate({ params: idParams, query: z.object({ date: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional() }) }), async (req, res) => {
    const where: any = { barbershopId: tenantId(req), barberId: req.params.id, ...withBranch(req), ...parseDateRange(req.query, "date") };
  if (req.query.date) where.date = sameDateOnly(String(req.query.date));
  return ok(res, await prisma.appointment.findMany({ where, orderBy: [{ date: "asc" }, { startTime: "asc" }] }));
});

router.get("/barbers/:id/performance", validate({ params: idParams }), async (req, res) => {
  const appointments = await prisma.appointment.findMany({ where: { barbershopId: tenantId(req), barberId: req.params.id, status: "completed", ...withBranch(req) }, include: { service: true } });
  const revenue = appointments.reduce((sum, item) => sum + Number(item.price), 0);
  const commissions = appointments.reduce((sum, item) => sum + (Number(item.price) * Number(item.service.commissionPercent)) / 100, 0);
  return ok(res, { totalCuts: appointments.length, revenue, commissions });
});

router.post("/barbers/:id/services", validate({ params: idParams, body: z.object({ serviceIds: z.array(z.string()) }) }), async (req, res) => {
  await prisma.barberService.deleteMany({ where: { barberId: req.params.id } });
  const data = await prisma.barberService.createMany({ data: req.body.serviceIds.map((serviceId: string) => ({ barberId: req.params.id, serviceId })), skipDuplicates: true });
  return ok(res, data);
});

router.use("/barbers", crudRouter({ prisma, model: "barber", createSchema: barberSchema.omit({ serviceIds: true }), searchFields: ["name", "email", "phone"], softDelete: true }));

router.get("/services/categories", async (_req, res) => ok(res, ["Corte", "Barba", "Combo", "Estetica", "Coloracao", "Tratamento", "Outro"]));
router.use("/services", crudRouter({ prisma, model: "service", createSchema: serviceSchema, searchFields: ["name", "description"], softDelete: true }));

const packageSchema = z.object({ name: z.string().min(2), description: z.string().optional().nullable(), price: z.coerce.number(), serviceIds: z.array(z.string()).default([]) });
router.get("/service-packages", async (req, res) => ok(res, await prisma.servicePackage.findMany({ where: { barbershopId: tenantId(req) }, include: { items: { include: { service: true } } } })));
router.post("/service-packages", validate({ body: packageSchema }), async (req, res) => {
  const { serviceIds, ...data } = req.body;
  const item = await prisma.servicePackage.create({ data: { ...data, barbershopId: tenantId(req), items: { create: serviceIds.map((serviceId: string) => ({ serviceId })) } }, include: { items: true } });
  return created(res, item);
});
router.use("/service-packages", crudRouter({ prisma, model: "servicePackage", createSchema: packageSchema.omit({ serviceIds: true }), searchFields: ["name"], softDelete: true }));

router.use("/clients", buildClientsRouter());
router.use("/appointments", buildAppointmentsRouter());
router.use("/subscription-plans", buildSubscriptionPlansRouter());
router.use("/subscriptions", buildSubscriptionsRouter());
router.use("/subscription-payments", buildSubscriptionPaymentsRouter());

router.get("/products/categories", async (_req, res) => ok(res, ["Cabelo", "Barba", "Ferramentas", "Bebidas", "Alimentacao", "Outro"]));
router.get("/products/low-stock", async (req, res) => {
  const products = await prisma.product.findMany({ where: { barbershopId: tenantId(req), ...withBranch(req) } });
  return ok(res, products.filter((product) => product.stock <= product.minStock));
});
router.use("/products", crudRouter({
  prisma,
  model: "product",
  createSchema: productSchema,
  searchFields: ["name", "description", "internalCode"],
  softDelete: true,
  listWhere: (req) => withBranch(req),
  itemWhere: (req) => withBranch(req),
  beforeCreate: (data, req) => ({
    ...data,
    branchId: data.branchId ?? selectedBranchId(req) ?? undefined
  }),
  beforeUpdate: (data, req) => ({
    ...data,
    branchId: data.branchId ?? selectedBranchId(req) ?? undefined
  })
}));
router.use("/stock", buildStockRouter());
router.use("/orders", buildOrdersRouter());
router.use("/financial", buildFinancialRouter());
router.use("/reports", buildReportsRouter());
router.use("/whatsapp", buildWhatsappRouter());
router.use("/notifications", buildNotificationsRouter());
router.use("/support", buildTenantSupportRouter());

router.get("/saas/plans", async (_req, res) => ok(res, await prisma.saasPlan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } })));
router.get("/saas/plans/:id", validate({ params: idParams }), async (req, res) => ok(res, await prisma.saasPlan.findUnique({ where: { id: req.params.id } })));
router.get("/saas/invoices/current", async (req, res) => {
  const invoice = await prisma.saasInvoice.findFirst({ where: { barbershopId: tenantId(req), status: { in: ["pending", "overdue"] } }, orderBy: { dueDate: "asc" } });
  if (!invoice) return ok(res, null);
  return ok(res, { ...invoice, pix: await createPixCharge(Number(invoice.amount), `UPB${invoice.id.slice(-12)}`) });
});
router.get("/saas/plan-change-requests", async (req, res) => {
  const requests = await prisma.saasPlanChangeRequest.findMany({
    where: { barbershopId: tenantId(req) },
    include: { currentPlan: true, targetPlan: true },
    orderBy: { createdAt: "desc" }
  });
  return ok(res, requests);
});
router.post("/saas/plan-change-requests", validate({ body: z.object({ targetPlanId: z.string(), note: z.string().optional().nullable() }) }), async (req, res) => {
  const shop = await prisma.barbershop.findUniqueOrThrow({ where: { id: tenantId(req) }, select: { saasPlanId: true, saasPlansId: true } });
  const currentPlanId = shop.saasPlanId ?? shop.saasPlansId ?? null;
  const targetPlan = await prisma.saasPlan.findFirstOrThrow({ where: { id: req.body.targetPlanId, isActive: true } });
  if (currentPlanId && currentPlanId === targetPlan.id) {
    throw new AppError(409, "PLAN_ALREADY_ACTIVE", "Este já é o plano ativo da sua conta");
  }
  const pending = await prisma.saasPlanChangeRequest.findFirst({ where: { barbershopId: tenantId(req), status: "pending" } });
  if (pending) throw new AppError(409, "PLAN_CHANGE_PENDING", "Já existe uma solicitação de migração em análise");
  const request = await prisma.saasPlanChangeRequest.create({
    data: {
      barbershopId: tenantId(req),
      currentPlanId,
      targetPlanId: targetPlan.id,
      note: req.body.note ?? null
    },
    include: { currentPlan: true, targetPlan: true }
  });
  return created(res, request);
});
router.post("/saas/plans", authorize("saas_admin"), validate({ body: z.object({ name: z.string(), price: z.coerce.number(), maxBarbers: z.number().nullable().optional(), maxClients: z.number().nullable().optional(), features: z.any().default({}), isActive: z.boolean().optional() }) }), async (req, res) => created(res, await prisma.saasPlan.create({ data: req.body })));
router.put("/saas/plans/:id", authorize("saas_admin"), validate({ params: idParams, body: z.object({ name: z.string().optional(), price: z.coerce.number().optional(), maxBarbers: z.number().nullable().optional(), maxClients: z.number().nullable().optional(), features: z.any().optional(), isActive: z.boolean().optional() }) }), async (req, res) => ok(res, await prisma.saasPlan.update({ where: { id: req.params.id }, data: req.body })));
router.delete("/saas/plans/:id", authorize("saas_admin"), validate({ params: idParams }), async (req, res) => { await prisma.saasPlan.update({ where: { id: req.params.id }, data: { isActive: false } }); return noContent(res); });

function buildClientsRouter() {
  const r = Router();
  r.get("/", validate({ query: pagingQuery }), async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const where: any = { barbershopId: tenantId(req), ...textSearch(req.query.search, ["name", "email", "phone"]) };
    if (req.query.status) where.isActive = req.query.status === "active";
    const [data, total] = await Promise.all([
      prisma.client.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include: { subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 } } }),
      prisma.client.count({ where })
    ]);
    return paginated(res, data, total, page, limit);
  });
  r.post("/", validate({ body: clientSchema }), async (req, res) => {
    const { planId, birthdate, tags, ...data } = req.body;
    const client = await prisma.client.create({ data: { ...data, birthdate: birthdate ? new Date(birthdate) : null, tags: tags ?? [], barbershopId: tenantId(req) } });
    if (planId) await createClientSubscription(client.id, planId, tenantId(req), "pix");
    return created(res, client);
  });
  r.get("/:id", validate({ params: idParams }), async (req, res) => ok(res, {
    client: await prisma.client.findFirst({ where: { id: req.params.id, barbershopId: tenantId(req) } }),
    subscription: await prisma.clientSubscription.findFirst({ where: { clientId: req.params.id, barbershopId: tenantId(req), status: "active" }, include: { plan: true } }),
    appointments: await prisma.appointment.findMany({ where: { clientId: req.params.id, barbershopId: tenantId(req) }, take: 20, orderBy: { date: "desc" } }),
    orders: await prisma.order.findMany({ where: { clientId: req.params.id, barbershopId: tenantId(req) }, take: 20, orderBy: { createdAt: "desc" } })
  }));
  r.put("/:id", validate({ params: idParams, body: clientSchema.partial() }), async (req, res) => ok(res, await prisma.client.update({ where: { id: req.params.id }, data: req.body })));
  r.delete("/:id", validate({ params: idParams }), async (req, res) => { await prisma.client.update({ where: { id: req.params.id }, data: { isActive: false } }); return noContent(res); });
  r.get("/:id/history", validate({ params: idParams }), async (req, res) => ok(res, await prisma.appointment.findMany({ where: { clientId: req.params.id, barbershopId: tenantId(req) }, orderBy: { date: "desc" } })));
  r.get("/:id/purchases", validate({ params: idParams }), async (req, res) => ok(res, await prisma.order.findMany({ where: { clientId: req.params.id, barbershopId: tenantId(req) }, include: { items: true } })));
  r.get("/:id/payments", validate({ params: idParams }), async (req, res) => ok(res, await prisma.subscriptionPayment.findMany({ where: { clientId: req.params.id, barbershopId: tenantId(req) } })));
  r.post("/:id/subscription", validate({ params: idParams, body: z.object({ planId: z.string(), paymentMethod: z.enum(["pix", "credit", "debit", "boleto"]) }) }), async (req, res) => created(res, await createClientSubscription(req.params.id, req.body.planId, tenantId(req), req.body.paymentMethod)));
  r.delete("/:id/subscription", validate({ params: idParams }), async (req, res) => { await prisma.clientSubscription.updateMany({ where: { clientId: req.params.id, barbershopId: tenantId(req), status: "active" }, data: { status: "cancelled", cancelledAt: new Date() } }); return noContent(res); });
  return r;
}

function buildAppointmentsRouter() {
  const r = Router();
  const body = z.object({ clientId: z.string(), barberId: z.string(), serviceId: z.string(), branchId: z.string().optional().nullable(), date: z.string(), startTime: hhmm, paymentMethod: z.enum(["pix", "cash", "credit", "debit", "subscription", "courtesy"]).optional(), notes: z.string().optional().nullable(), subscriptionId: z.string().optional().nullable() });
  r.get("/", validate({ query: pagingQuery }), async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const where: any = { barbershopId: tenantId(req), ...withBranch(req), ...parseDateRange(req.query, "date") };
    for (const key of ["barberId", "clientId", "status", "paymentMethod"]) if (req.query[key]) where[key] = req.query[key];
    if (req.query.date) where.date = sameDateOnly(String(req.query.date));
    const [data, total] = await Promise.all([
      prisma.appointment.findMany({ where, skip, take: limit, orderBy: [{ date: "desc" }, { startTime: "asc" }], include: { client: true, barber: true, service: true, branch: true } }),
      prisma.appointment.count({ where })
    ]);
    return paginated(res, data, total, page, limit);
  });
  r.post("/", validate({ body }), async (req, res) => created(res, await createAppointment(req, req.body)));
  r.get("/today", async (req, res) => ok(res, await prisma.appointment.findMany({ where: { barbershopId: tenantId(req), ...withBranch(req), date: sameDateOnly(new Date()) }, include: { client: true, barber: true, service: true, branch: true } })));
  r.get("/summary", async (req, res) => {
    const date = req.query.date ? sameDateOnly(String(req.query.date)) : sameDateOnly(new Date());
    const items = await prisma.appointment.findMany({ where: { barbershopId: tenantId(req), ...withBranch(req), date }, include: { branch: true } });
    return ok(res, { total: items.length, revenueEstimated: items.reduce((s, a) => s + Number(a.price), 0), byStatus: countBy(items, "status") });
  });
  r.get("/availability", validate({ query: z.object({ barberId: z.string(), date: z.string(), serviceId: z.string(), branchId: z.string().optional() }) }), async (req, res) => {
    const service = await prisma.service.findFirstOrThrow({ where: { id: String(req.query.serviceId), barbershopId: tenantId(req) } });
    const barbershop = await prisma.barbershop.findUniqueOrThrow({ where: { id: tenantId(req) } });
    const day = new Date(String(req.query.date)).getDay();
    const hour = await prisma.barbershopHour.findUnique({ where: { barbershopId_day: { barbershopId: tenantId(req), day } } });
    const open = hour?.isOpen ? hour.openTime : "09:00";
    const close = hour?.isOpen ? hour.closeTime : "18:00";
    const booked = await prisma.appointment.findMany({ where: { barbershopId: tenantId(req), ...withBranch(req), barberId: String(req.query.barberId), date: sameDateOnly(String(req.query.date)), status: { notIn: ["cancelled", "no_show"] } } });
    const availableSlots = [];
    for (let m = timeToMinutes(open); m + service.durationMinutes <= timeToMinutes(close); m += barbershop.intervalMinutes) {
      const start = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      const end = addMinutes(start, service.durationMinutes);
      if (!booked.some((a) => timeToMinutes(start) < timeToMinutes(a.endTime) && timeToMinutes(end) > timeToMinutes(a.startTime))) availableSlots.push(start);
    }
    return ok(res, { availableSlots });
  });
  r.get("/:id", validate({ params: idParams }), async (req, res) => ok(res, await prisma.appointment.findFirst({ where: { id: req.params.id, barbershopId: tenantId(req) }, include: { client: true, barber: true, service: true } })));
  r.put("/:id", validate({ params: idParams, body: body.partial().extend({ status: z.enum(["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"]).optional() }) }), async (req, res) => ok(res, await updateAppointment(req, req.params.id, req.body)));
  r.delete("/:id", validate({ params: idParams, body: z.object({ cancelReason: z.string().optional() }) }), async (req, res) => ok(res, await prisma.appointment.update({ where: { id: req.params.id }, data: { status: "cancelled", cancelReason: req.body.cancelReason } })));
  r.patch("/:id/status", validate({ params: idParams, body: z.object({ status: z.enum(["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"]) }) }), async (req, res) => ok(res, await updateAppointmentStatus(req.params.id, tenantId(req), req.body.status)));
  return r;
}

async function createAppointment(req: Express.Request, input: any) {
  const shopId = tenantId(req);
  input.branchId = input.branchId ?? selectedBranchId(req);
  const service = await prisma.service.findFirstOrThrow({ where: { id: input.serviceId, barbershopId: shopId } });
  const endTime = addMinutes(input.startTime, service.durationMinutes);
  const date = sameDateOnly(input.date);

  let price = Number(service.price);
  let paymentMethod = input.paymentMethod ?? "cash";
  let isSubscriber = false;
  let subscriptionId = input.subscriptionId;
  const subscription = subscriptionId ? await prisma.clientSubscription.findFirst({ where: { id: subscriptionId, barbershopId: shopId, status: "active" }, include: { plan: { include: { planServices: true } } } }) : null;
  if (subscription) {
    const included = subscription.plan.planServices.some((ps) => ps.serviceId === service.id);
    if (!included) throw new AppError(422, "SERVICE_NOT_IN_PLAN", "Serviço não incluso no plano");
    if (subscription.plan.usageLimit && subscription.usedThisCycle >= subscription.plan.usageLimit) throw new AppError(422, "PLAN_USAGE_LIMIT", "Limite do ciclo atingido");
    price = 0;
    paymentMethod = "subscription";
    isSubscriber = true;
    subscriptionId = subscription.id;
  }

  return prisma.$transaction(async (tx) => {
    await lockAppointmentSlot(tx, shopId, input.barberId, date);
    await ensureAppointmentAvailability(tx, {
      shopId,
      barberId: input.barberId,
      branchId: input.branchId ?? undefined,
      date,
      startTime: input.startTime,
      endTime
    });
    const appointment = await tx.appointment.create({ data: { ...input, date, endTime, durationMinutes: service.durationMinutes, price, paymentMethod, isSubscriber, subscriptionId, barbershopId: shopId } });
    if (subscriptionId) await tx.clientSubscription.update({ where: { id: subscriptionId }, data: { usedThisCycle: { increment: 1 } } });
    if (price > 0) await tx.financialTransaction.create({ data: { barbershopId: shopId, branchId: input.branchId, type: "income", category: "Servico", description: `Agendamento - ${service.name}`, amount: price, paymentMethod, appointmentId: appointment.id, barberId: input.barberId, date, status: "pending" } });
    await tx.notification.create({ data: { barbershopId: shopId, type: "info", title: "Novo agendamento", message: `Agendamento criado para ${input.startTime}`, relatedEntity: "appointment", relatedId: appointment.id } });
    await auditLog(req, { module: "Agenda", action: `Criou agendamento ${appointment.id}`, entityType: "appointment", entityId: appointment.id });
    return appointment;
  });
}

async function ensureAppointmentAvailability(tx: any, input: {
  shopId: string;
  barberId: string;
  branchId?: string;
  date: Date;
  startTime: string;
  endTime: string;
  excludeAppointmentId?: string;
}) {
  const conflict = await tx.appointment.findFirst({
    where: {
      barbershopId: input.shopId,
      barberId: input.barberId,
      ...(input.branchId ? { branchId: input.branchId } : {}),
      date: input.date,
      status: { notIn: ["cancelled", "no_show"] },
      ...(input.excludeAppointmentId ? { id: { not: input.excludeAppointmentId } } : {}),
      AND: [{ startTime: { lt: input.endTime } }, { endTime: { gt: input.startTime } }]
    },
    select: { id: true }
  });
  if (conflict) throw new AppError(409, "APPOINTMENT_CONFLICT", "Barbeiro indisponível neste horário");
}

async function lockAppointmentSlot(tx: any, shopId: string, barberId: string, date: Date) {
  const lockKey = `${shopId}:${barberId}:${date.toISOString().slice(0, 10)}`;
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('${lockKey.replace(/'/g, "''")}'))`);
}

async function updateAppointment(req: Express.Request, id: string, input: any) {
  const shopId = tenantId(req);
  const existing = await prisma.appointment.findFirstOrThrow({ where: { id, barbershopId: shopId } });
  const serviceId = input.serviceId ?? existing.serviceId;
  const barberId = input.barberId ?? existing.barberId;
  const branchId = input.branchId ?? existing.branchId ?? selectedBranchId(req) ?? undefined;
  const date = input.date ? sameDateOnly(input.date) : existing.date;
  const startTime = input.startTime ?? existing.startTime;
  const service = await prisma.service.findFirstOrThrow({ where: { id: serviceId, barbershopId: shopId } });
  const endTime = addMinutes(startTime, service.durationMinutes);

  return prisma.$transaction(async (tx) => {
    await lockAppointmentSlot(tx, shopId, barberId, date);
    await ensureAppointmentAvailability(tx, {
      shopId,
      barberId,
      branchId,
      date,
      startTime,
      endTime,
      excludeAppointmentId: id
    });

    return tx.appointment.update({
      where: { id },
      data: {
        ...input,
        barberId,
        serviceId,
        branchId,
        date,
        startTime,
        endTime,
        durationMinutes: service.durationMinutes
      }
    });
  });
}

async function updateAppointmentStatus(id: string, shopId: string, status: any) {
  if (status !== "completed") return prisma.appointment.update({ where: { id }, data: { status } });
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.update({ where: { id }, data: { status, completedAt: new Date() }, include: { service: true } });
    await tx.barber.update({ where: { id: appointment.barberId }, data: { totalCuts: { increment: 1 } } });
    await tx.client.update({ where: { id: appointment.clientId }, data: { totalVisits: { increment: 1 }, lastVisitAt: new Date(), totalSpent: { increment: appointment.price } } });
    await tx.service.update({ where: { id: appointment.serviceId }, data: { soldCount: { increment: 1 } } });
    await tx.financialTransaction.updateMany({ where: { appointmentId: id, barbershopId: shopId }, data: { status: "completed" } });
    return appointment;
  });
}

function buildSubscriptionPlansRouter() {
  const r = Router();
  r.get("/", async (req, res) => ok(res, await prisma.subscriptionPlan.findMany({ where: { barbershopId: tenantId(req) }, include: { planServices: { include: { service: true } } } })));
  r.post("/", validate({ body: subscriptionPlanSchema }), async (req, res) => {
    const { serviceIds, ...data } = req.body;
    return created(res, await prisma.subscriptionPlan.create({ data: { ...data, barbershopId: tenantId(req), planServices: { create: serviceIds?.map((serviceId: string) => ({ serviceId })) ?? [] } }, include: { planServices: true } }));
  });
  r.put("/:id", validate({ params: idParams, body: subscriptionPlanSchema.partial() }), async (req, res) => {
    const { serviceIds, ...data } = req.body;
    return ok(res, await prisma.subscriptionPlan.update({
      where: { id: req.params.id },
      data: {
        ...data,
        ...(serviceIds ? { planServices: { deleteMany: {}, create: serviceIds.map((serviceId: string) => ({ serviceId })) } } : {})
      },
      include: { planServices: { include: { service: true } } }
    }));
  });
  r.get("/:id/subscribers", validate({ params: idParams }), async (req, res) => ok(res, await prisma.clientSubscription.findMany({ where: { planId: req.params.id, barbershopId: tenantId(req) }, include: { client: true } })));
  r.use(crudRouter({ prisma, model: "subscriptionPlan", createSchema: subscriptionPlanSchema.omit({ serviceIds: true }), searchFields: ["name"], softDelete: true }));
  return r;
}

async function createClientSubscription(clientId: string, planId: string, shopId: string, paymentMethod: any) {
  const plan = await prisma.subscriptionPlan.findFirstOrThrow({ where: { id: planId, barbershopId: shopId } });
  const start = new Date();
  const months = plan.billingCycle === "yearly" ? 12 : plan.billingCycle === "quarterly" ? 3 : 1;
  return prisma.clientSubscription.create({ data: { clientId, planId, barbershopId: shopId, paymentMethod, price: plan.price, currentPeriodStart: start, currentPeriodEnd: addMonths(start, months) } });
}

function buildSubscriptionsRouter() {
  const r = Router();
  r.get("/", validate({ query: pagingQuery }), async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const where: any = { barbershopId: tenantId(req) };
    for (const key of ["status", "planId", "clientId"]) if (req.query[key]) where[key] = req.query[key];
    const [data, total] = await Promise.all([prisma.clientSubscription.findMany({ where, skip, take: limit, include: { client: true, plan: true } }), prisma.clientSubscription.count({ where })]);
    return paginated(res, data, total, page, limit);
  });
  r.post("/", validate({ body: z.object({ clientId: z.string(), planId: z.string(), paymentMethod: z.enum(["pix", "credit", "debit", "boleto"]) }) }), async (req, res) => created(res, await createClientSubscription(req.body.clientId, req.body.planId, tenantId(req), req.body.paymentMethod)));
  r.get("/summary", async (req, res) => {
    const active = await prisma.clientSubscription.findMany({ where: { barbershopId: tenantId(req), status: "active" } });
    const mrr = active.reduce((s, item) => s + Number(item.price), 0);
    return ok(res, { mrr, arr: mrr * 12, active: active.length, overdue: await prisma.clientSubscription.count({ where: { barbershopId: tenantId(req), status: "overdue" } }) });
  });
  r.get("/overdue", async (req, res) => ok(res, await prisma.clientSubscription.findMany({ where: { barbershopId: tenantId(req), status: "overdue" }, include: { client: true, plan: true } })));
  r.post("/:id/cancel", validate({ params: idParams, body: z.object({ reason: z.string().optional() }) }), async (req, res) => ok(res, await prisma.clientSubscription.update({ where: { id: req.params.id }, data: { status: "cancelled", cancelledAt: new Date() } })));
  r.post("/:id/renew", validate({ params: idParams }), async (req, res) => ok(res, await prisma.clientSubscription.update({ where: { id: req.params.id }, data: { currentPeriodStart: new Date(), currentPeriodEnd: addMonths(new Date(), 1), usedThisCycle: 0, status: "active" } })));
  r.post("/:id/charge", validate({ params: idParams, body: z.object({ paymentMethod: z.enum(["pix", "credit", "debit", "boleto"]) }) }), async (req, res) => {
    const sub = await prisma.clientSubscription.findFirstOrThrow({ where: { id: req.params.id, barbershopId: tenantId(req) } });
    return created(res, await prisma.subscriptionPayment.create({ data: { subscriptionId: sub.id, clientId: sub.clientId, barbershopId: tenantId(req), amount: sub.price, paymentMethod: req.body.paymentMethod, dueDate: new Date(), status: "pending" } }));
  });
  r.get("/:id", validate({ params: idParams }), async (req, res) => ok(res, await prisma.clientSubscription.findFirst({ where: { id: req.params.id, barbershopId: tenantId(req) }, include: { client: true, plan: true, payments: true } })));
  r.put("/:id", validate({ params: idParams, body: z.object({ status: z.enum(["active", "overdue", "cancelled", "suspended"]).optional(), paymentMethod: z.enum(["pix", "credit", "debit", "boleto"]).optional() }) }), async (req, res) => ok(res, await prisma.clientSubscription.update({ where: { id: req.params.id }, data: req.body })));
  return r;
}

function buildSubscriptionPaymentsRouter() {
  const r = Router();
  r.get("/", validate({ query: pagingQuery }), async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const where: any = { barbershopId: tenantId(req), ...withBranch(req), ...parseDateRange(req.query, "createdAt") };
    for (const key of ["subscriptionId", "clientId", "status"]) if (req.query[key]) where[key] = req.query[key];
    const [data, total] = await Promise.all([prisma.subscriptionPayment.findMany({ where, skip, take: limit, include: { client: true, subscription: true } }), prisma.subscriptionPayment.count({ where })]);
    return paginated(res, data, total, page, limit);
  });
  r.post("/", validate({ body: z.object({ subscriptionId: z.string(), amount: z.coerce.number(), paymentMethod: z.enum(["pix", "credit", "debit", "boleto"]), paidAt: z.string().optional() }) }), async (req, res) => {
    const sub = await prisma.clientSubscription.findFirstOrThrow({ where: { id: req.body.subscriptionId, barbershopId: tenantId(req) } });
    return created(res, await prisma.subscriptionPayment.create({ data: { subscriptionId: sub.id, clientId: sub.clientId, barbershopId: tenantId(req), amount: req.body.amount, paymentMethod: req.body.paymentMethod, paidAt: req.body.paidAt ? new Date(req.body.paidAt) : new Date(), dueDate: new Date(), status: "paid" } }));
  });
  r.get("/summary", async (req, res) => {
    const payments = await prisma.subscriptionPayment.findMany({ where: { barbershopId: tenantId(req) } });
    return ok(res, { paid: sum(payments.filter((p) => p.status === "paid"), "amount"), pending: sum(payments.filter((p) => p.status === "pending"), "amount"), failed: sum(payments.filter((p) => p.status === "failed"), "amount") });
  });
  r.get("/:id", validate({ params: idParams }), async (req, res) => ok(res, await prisma.subscriptionPayment.findFirst({ where: { id: req.params.id, barbershopId: tenantId(req) } })));
  r.patch("/:id/status", validate({ params: idParams, body: z.object({ status: z.enum(["paid", "failed", "refunded"]) }) }), async (req, res) => ok(res, await prisma.subscriptionPayment.update({ where: { id: req.params.id }, data: { status: req.body.status, paidAt: req.body.status === "paid" ? new Date() : undefined } })));
  return r;
}

function buildStockRouter() {
  const r = Router();
  r.get("/movements", validate({ query: pagingQuery }), async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const where: any = { barbershopId: tenantId(req), ...withBranch(req), ...parseDateRange(req.query, "createdAt") };
    for (const key of ["productId", "type"]) if (req.query[key]) where[key] = req.query[key];
    const [data, total] = await Promise.all([prisma.stockMovement.findMany({ where, skip, take: limit, include: { product: true, user: true } }), prisma.stockMovement.count({ where })]);
    return paginated(res, data, total, page, limit);
  });
  r.post("/movements", validate({ body: z.object({ productId: z.string(), type: z.enum(["in", "out", "adjustment"]), quantity: z.coerce.number().int(), reason: z.enum(["purchase", "sale", "adjustment", "loss", "return"]), notes: z.string().optional() }) }), async (req, res) => created(res, await moveStock(req, req.body)));
  r.post("/adjustment", validate({ body: z.object({ items: z.array(z.object({ productId: z.string(), newQuantity: z.coerce.number().int(), reason: z.string().default("adjustment") })) }) }), async (req, res) => {
    const data = [];
  for (const item of req.body.items) {
      const product = await prisma.product.findFirstOrThrow({ where: { id: item.productId, barbershopId: tenantId(req), ...withBranch(req) } });
      data.push(await moveStock(req, { productId: item.productId, type: "adjustment", quantity: item.newQuantity - product.stock, reason: "adjustment", notes: item.reason }));
    }
    return ok(res, data);
  });
  r.post("/transfer", validate({ body: z.object({ productId: z.string(), targetBranchId: z.string(), quantity: z.coerce.number().int().positive() }) }), async (req, res) => created(res, await transferStock(req, req.body)));
  return r;
}

async function moveStock(req: Express.Request, input: any) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirstOrThrow({ where: { id: input.productId, barbershopId: tenantId(req), ...withBranch(req) } });
    const delta = input.type === "in" ? input.quantity : input.type === "out" ? -input.quantity : input.quantity;
    const updated = await tx.product.update({ where: { id: product.id }, data: { stock: { increment: delta }, isActive: product.stock + delta > 0 } });
    const movement = await tx.stockMovement.create({ data: { ...input, barbershopId: tenantId(req), branchId: product.branchId ?? selectedBranchId(req) ?? undefined, userId: req.user!.userId } });
    if (updated.stock <= updated.minStock) await tx.notification.create({ data: { barbershopId: tenantId(req), type: updated.stock <= 0 ? "alert" : "warning", title: "Alerta de estoque", message: `${updated.name} está com estoque ${updated.stock}`, relatedEntity: "product", relatedId: updated.id } });
    return movement;
  });
}

async function transferStock(req: Express.Request, input: { productId: string; targetBranchId: string; quantity: number; }) {
  if (input.quantity <= 0) throw new AppError(422, "INVALID_QUANTITY", "Quantidade inválida");
  const shopId = tenantId(req);
  return prisma.$transaction(async (tx) => {
    const source = await tx.product.findFirstOrThrow({ where: { id: input.productId, barbershopId: shopId, ...withBranch(req) }, include: { branch: true } });
    if (!source.branchId) throw new AppError(422, "SOURCE_BRANCH_REQUIRED", "O produto de origem precisa estar vinculado a uma filial");
    if (source.branchId === input.targetBranchId) throw new AppError(422, "TRANSFER_SAME_BRANCH", "A filial de destino precisa ser diferente da origem");

    const targetBranch = await tx.branch.findFirstOrThrow({ where: { id: input.targetBranchId, barbershopId: shopId, isActive: true } });
    if (source.stock < input.quantity) throw new AppError(422, "INSUFFICIENT_STOCK", "Estoque insuficiente para transferir");

    const baseProductData = {
      name: source.name,
      description: source.description,
      category: source.category,
      salePrice: source.salePrice,
      costPrice: source.costPrice,
      minStock: source.minStock,
      internalCode: source.internalCode,
      isActive: source.isActive,
    };

    const targetProduct = await tx.product.findFirst({
      where: {
        barbershopId: shopId,
        branchId: targetBranch.id,
        ...(source.internalCode
          ? { internalCode: source.internalCode }
          : { name: source.name, category: source.category })
      }
    }) ?? await tx.product.create({
      data: {
        ...baseProductData,
        stock: 0,
        barbershopId: shopId,
        branchId: targetBranch.id
      }
    });

    const sourceUpdated = await tx.product.update({
      where: { id: source.id },
      data: { stock: { decrement: input.quantity }, isActive: source.stock - input.quantity > 0 }
    });

    const destinationUpdated = await tx.product.update({
      where: { id: targetProduct.id },
      data: { stock: { increment: input.quantity }, isActive: true }
    });

    const note = `Transferência para ${targetBranch.name}`;
    const outMovement = await tx.stockMovement.create({
      data: {
        productId: source.id,
        barbershopId: shopId,
        branchId: source.branchId,
        type: "out",
        quantity: input.quantity,
        reason: "adjustment",
        notes: note,
        userId: req.user!.userId
      }
    });
    const inMovement = await tx.stockMovement.create({
      data: {
        productId: targetProduct.id,
        barbershopId: shopId,
        branchId: targetBranch.id,
        type: "in",
        quantity: input.quantity,
        reason: "adjustment",
        notes: `Transferência recebida de ${source.branch?.name ?? "outra filial"}`,
        userId: req.user!.userId
      }
    });

    await auditLog(req, { module: "Estoque", action: `Transferiu ${input.quantity}x ${source.name} para ${targetBranch.name}`, entityType: "stockTransfer", entityId: outMovement.id, metadata: { sourceProductId: source.id, targetProductId: targetProduct.id, sourceBranchId: source.branchId, targetBranchId: targetBranch.id } });

    return { source: sourceUpdated, target: destinationUpdated, movements: [outMovement, inMovement] };
  });
}

function buildOrdersRouter() {
  const r = Router();
  const body = z.object({ branchId: z.string().optional().nullable(), clientId: z.string().optional().nullable(), barberId: z.string().optional().nullable(), notes: z.string().optional().nullable(), items: z.array(z.object({ productId: z.string(), quantity: z.coerce.number().int().positive() })).default([]) });
  r.get("/", validate({ query: pagingQuery }), async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const where: any = { barbershopId: tenantId(req), ...parseDateRange(req.query, "createdAt") };
    for (const key of ["status", "clientId", "barberId"]) if (req.query[key]) where[key] = req.query[key];
    const [data, total] = await Promise.all([prisma.order.findMany({ where, skip, take: limit, include: { items: true, client: true, barber: true } }), prisma.order.count({ where })]);
    return paginated(res, data, total, page, limit);
  });
  r.post("/", validate({ body }), async (req, res) => created(res, await createOrder(req, req.body)));
  r.get("/:id", validate({ params: idParams }), async (req, res) => ok(res, await prisma.order.findFirst({ where: { id: req.params.id, barbershopId: tenantId(req) }, include: { items: { include: { product: true } }, client: true, barber: true } })));
  r.patch("/:id/close", validate({ params: idParams, body: z.object({ paymentMethod: z.enum(["pix", "cash", "credit", "debit"]) }) }), async (req, res) => ok(res, await closeOrder(req, req.params.id, req.body.paymentMethod)));
  r.patch("/:id/cancel", validate({ params: idParams }), async (req, res) => ok(res, await prisma.order.update({ where: { id: req.params.id }, data: { status: "cancelled" } })));
  r.post("/:id/items", validate({ params: idParams, body: z.object({ productId: z.string(), quantity: z.coerce.number().int().positive() }) }), async (req, res) => {
    const order = await prisma.order.findFirstOrThrow({ where: { id: req.params.id, barbershopId: tenantId(req) } });
    const product = await prisma.product.findFirstOrThrow({ where: { id: req.body.productId, barbershopId: tenantId(req), ...(order.branchId ? { branchId: order.branchId } : {}) } });
    const item = await prisma.orderItem.create({ data: { orderId: req.params.id, productId: product.id, quantity: req.body.quantity, unitPrice: product.salePrice, total: Number(product.salePrice) * req.body.quantity } });
    await prisma.order.update({ where: { id: req.params.id }, data: { total: { increment: item.total } } });
    return created(res, item);
  });
  r.delete("/:id/items/:itemId", async (req, res) => {
    const item = await prisma.orderItem.delete({ where: { id: req.params.itemId } });
    await prisma.order.update({ where: { id: req.params.id }, data: { total: { decrement: item.total } } });
    return noContent(res);
  });
  return r;
}

async function createOrder(req: Express.Request, input: any) {
  const branchId = input.branchId ?? selectedBranchId(req) ?? undefined;
  const products = await prisma.product.findMany({ where: { id: { in: input.items.map((i: any) => i.productId) }, barbershopId: tenantId(req), ...(branchId ? { branchId } : {}) } });
  const items = input.items.map((item: any) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new AppError(404, "PRODUCT_NOT_FOUND", "Produto não encontrado");
    return { productId: product.id, quantity: item.quantity, unitPrice: product.salePrice, total: Number(product.salePrice) * item.quantity };
  });
  const total = items.reduce((s: number, item: any) => s + item.total, 0);
  const order = await prisma.order.create({ data: { barbershopId: tenantId(req), branchId, clientId: input.clientId, barberId: input.barberId, notes: input.notes, total, items: { create: items } }, include: { items: true } });
  await auditLog(req, { module: "Comandas", action: `Criou comanda ${order.id}`, entityType: "order", entityId: order.id });
  return order;
}

async function closeOrder(req: Express.Request, id: string, paymentMethod: any) {
  const order = await prisma.order.findFirstOrThrow({ where: { id, barbershopId: tenantId(req) }, include: { items: true } });
  return prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      const product = await tx.product.findFirstOrThrow({ where: { id: item.productId, barbershopId: tenantId(req), ...(order.branchId ? { branchId: order.branchId } : {}) } });
      await tx.product.update({ where: { id: product.id }, data: { stock: { decrement: item.quantity }, soldCount: { increment: item.quantity } } });
      await tx.stockMovement.create({ data: { productId: product.id, branchId: order.branchId ?? selectedBranchId(req) ?? product.branchId ?? undefined, barbershopId: tenantId(req), type: "out", quantity: item.quantity, reason: "sale", referenceId: order.id, userId: req.user!.userId } });
    }
    await tx.financialTransaction.create({ data: { barbershopId: tenantId(req), branchId: order.branchId ?? selectedBranchId(req) ?? undefined, type: "income", category: "Produto", description: `Comanda ${order.id}`, amount: order.total, paymentMethod, orderId: order.id, date: new Date(), status: "completed" } });
    await auditLog(req, { module: "Comandas", action: `Fechou comanda ${order.id}`, entityType: "order", entityId: order.id });
    return tx.order.update({ where: { id }, data: { status: "closed", paymentMethod, closedAt: new Date() } });
  });
}

function buildFinancialRouter() {
  const r = Router();
  r.get("/transactions", validate({ query: pagingQuery }), async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const where: any = { barbershopId: tenantId(req), ...withBranch(req), ...parseDateRange(req.query, "date") };
    for (const key of ["type", "category", "paymentMethod", "barberId"]) if (req.query[key]) where[key] = req.query[key];
    const [data, total] = await Promise.all([prisma.financialTransaction.findMany({ where, skip, take: limit, orderBy: { date: "desc" }, include: { branch: true } }), prisma.financialTransaction.count({ where })]);
    return paginated(res, data, total, page, limit);
  });
  r.post("/transactions", validate({ body: financialTransactionSchema }), async (req, res) => created(res, await prisma.financialTransaction.create({ data: { ...req.body, branchId: selectedBranchId(req), date: new Date(req.body.date), barbershopId: tenantId(req) } })));
  r.get("/summary", async (req, res) => ok(res, financialSummary(await prisma.financialTransaction.findMany({ where: { barbershopId: tenantId(req), ...withBranch(req), ...parseDateRange(req.query, "date") } }))));
  r.get("/cash-flow", async (req, res) => {
    const date = req.query.date ? sameDateOnly(String(req.query.date)) : sameDateOnly(new Date());
    const transactions = await prisma.financialTransaction.findMany({ where: { barbershopId: tenantId(req), ...withBranch(req), date } });
    return ok(res, { ...financialSummary(transactions), transactions });
  });
  r.get("/commissions", async (req, res) => {
    const bId = tenantId(req);
    const barbers = await prisma.barber.findMany({
      where: { barbershopId: bId, isActive: true, ...withBranch(req) },
      include: { commissionReports: { orderBy: { createdAt: "desc" }, take: 1 } }
    });
    return ok(res, { barbers: barbers.map(b => ({
      id: b.id,
      name: b.name,
      commissionPercent: Number(b.commissionPercent),
      lastReport: b.commissionReports[0] ?? null,
    })) });
  });
  r.get("/transactions/:id", validate({ params: idParams }), async (req, res) => ok(res, await prisma.financialTransaction.findFirst({ where: { id: req.params.id, barbershopId: tenantId(req) } })));
  r.put("/transactions/:id", validate({ params: idParams, body: financialTransactionSchema.partial() }), async (req, res) => ok(res, await prisma.financialTransaction.update({ where: { id: req.params.id }, data: req.body })));
  r.delete("/transactions/:id", validate({ params: idParams }), async (req, res) => { await prisma.financialTransaction.update({ where: { id: req.params.id }, data: { status: "cancelled" } }); return noContent(res); });
  return r;
}

function financialSummary(items: any[]) {
  const totalIncome = sum(items.filter((i) => i.type === "income"), "amount");
  const totalExpense = sum(items.filter((i) => i.type === "expense"), "amount");
  return { totalIncome, totalExpense, profit: totalIncome - totalExpense, byCategory: countMoney(items, "category"), byPaymentMethod: countMoney(items, "paymentMethod"), byBarber: countMoney(items, "barberId"), byDay: countMoney(items, "date") };
}

function reportDateRange(period: string, ref?: string) {
  const now = ref ? new Date(ref) : new Date();
  if (period === "daily") {
    const s = new Date(now); s.setHours(0, 0, 0, 0);
    const e = new Date(now); e.setHours(23, 59, 59, 999);
    return { start: s, end: e };
  }
  if (period === "weekly") {
    const day = now.getDay();
    const s = new Date(now); s.setDate(now.getDate() - day); s.setHours(0, 0, 0, 0);
    const e = new Date(now); e.setDate(now.getDate() + (6 - day)); e.setHours(23, 59, 59, 999);
    return { start: s, end: e };
  }
  if (period === "biweekly") {
    const s = new Date(now); s.setDate(now.getDate() - 14); s.setHours(0, 0, 0, 0);
    const e = new Date(now); e.setHours(23, 59, 59, 999);
    return { start: s, end: e };
  }
  // monthly
  const s = new Date(now.getFullYear(), now.getMonth(), 1);
  const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start: s, end: e };
}

async function buildFullReport(req: any, period: string) {
  const bId = tenantId(req);
  const branch = withBranch(req);
  const { start, end } = reportDateRange(period, req.query.date as string);

  const [transactions, appointments, newClients] = await Promise.all([
    prisma.financialTransaction.findMany({ where: { barbershopId: bId, ...branch, date: { gte: start, lte: end } } }),
    prisma.appointment.findMany({ where: { barbershopId: bId, ...branch, date: { gte: start, lte: end } }, include: { barber: { select: { id: true, name: true } }, service: { select: { id: true, name: true } } } }),
    prisma.client.count({ where: { barbershopId: bId, createdAt: { gte: start, lte: end } } }),
  ]);

  const revenue = financialSummary(transactions);

  const barberMap: Record<string, { id: string; name: string; count: number; revenue: number }> = {};
  const serviceMap: Record<string, { id: string; name: string; count: number; revenue: number }> = {};
  const pmMap: Record<string, number> = {};

  for (const a of appointments) {
    if (!barberMap[a.barberId]) barberMap[a.barberId] = { id: a.barberId, name: a.barber.name, count: 0, revenue: 0 };
    barberMap[a.barberId].count++;
    barberMap[a.barberId].revenue += Number(a.price);
    if (!serviceMap[a.serviceId]) serviceMap[a.serviceId] = { id: a.serviceId, name: a.service.name, count: 0, revenue: 0 };
    serviceMap[a.serviceId].count++;
    serviceMap[a.serviceId].revenue += Number(a.price);
    pmMap[a.paymentMethod] = (pmMap[a.paymentMethod] || 0) + 1;
  }

  const activeClientsSet = new Set(appointments.map(a => a.clientId));

  return {
    period: { start, end, label: period },
    revenue,
    appointments: {
      total: appointments.length,
      completed: appointments.filter(a => a.status === "completed").length,
      confirmed: appointments.filter(a => a.status === "confirmed").length,
      cancelled: appointments.filter(a => a.status === "cancelled").length,
      noShow: appointments.filter(a => a.status === "no_show").length,
    },
    clients: { active: activeClientsSet.size, new: newClients },
    services: Object.values(serviceMap).sort((a, b) => b.count - a.count),
    barbers: Object.values(barberMap).sort((a, b) => b.revenue - a.revenue),
    paymentMethods: pmMap,
    expenses: { total: revenue.totalExpense, byCategory: revenue.byCategory },
    profit: revenue.profit,
  };
}

function buildReportsRouter() {
  const r = Router();

  r.get("/daily",    async (req, res) => ok(res, await buildFullReport(req, "daily")));
  r.get("/weekly",   async (req, res) => ok(res, await buildFullReport(req, "weekly")));
  r.get("/biweekly", async (req, res) => ok(res, await buildFullReport(req, "biweekly")));
  r.get("/monthly",  async (req, res) => ok(res, await buildFullReport(req, "monthly")));

  r.get("/export/pdf", async (req, res) => {
    const period = String(req.query.period || "monthly");
    const report = await buildFullReport(req, period);
    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="relatorio-${period}-${new Date().toISOString().slice(0,10)}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font("Helvetica-Bold").text("UpBarber — Relatório Financeiro", { align: "center" });
    doc.fontSize(10).font("Helvetica").text(`Período: ${period}  |  Gerado em: ${new Date().toLocaleString("pt-BR")}`, { align: "center" });
    doc.moveDown();

    // Summary
    doc.fontSize(13).font("Helvetica-Bold").text("Resumo Financeiro");
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke(); doc.moveDown(0.3);
    const rows = [
      ["Receita Total", `R$ ${Number(report.revenue.totalIncome).toFixed(2)}`],
      ["Despesas",      `R$ ${Number(report.revenue.totalExpense).toFixed(2)}`],
      ["Lucro",         `R$ ${Number(report.profit).toFixed(2)}`],
    ];
    for (const [k, v] of rows) {
      doc.fontSize(11).font("Helvetica").text(k, 40, doc.y, { continued: true }).font("Helvetica-Bold").text(v, { align: "right" });
      doc.moveDown(0.3);
    }
    doc.moveDown();

    // Appointments
    doc.fontSize(13).font("Helvetica-Bold").text("Agendamentos");
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke(); doc.moveDown(0.3);
    const appts = report.appointments as any;
    doc.fontSize(11).font("Helvetica")
      .text(`Total: ${appts.total}  |  Concluídos: ${appts.completed}  |  Cancelados: ${appts.cancelled}  |  No-show: ${appts.noShow}`);
    doc.moveDown();

    // Top Services
    if ((report.services as any[]).length > 0) {
      doc.fontSize(13).font("Helvetica-Bold").text("Top Serviços");
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke(); doc.moveDown(0.3);
      for (const s of (report.services as any[]).slice(0, 5)) {
        doc.fontSize(11).font("Helvetica").text(`${s.name}`, { continued: true }).text(`${s.count}x  R$ ${s.revenue.toFixed(2)}`, { align: "right" });
        doc.moveDown(0.3);
      }
      doc.moveDown();
    }

    // Top Barbeiros
    if ((report.barbers as any[]).length > 0) {
      doc.fontSize(13).font("Helvetica-Bold").text("Desempenho por Barbeiro");
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke(); doc.moveDown(0.3);
      for (const b of (report.barbers as any[])) {
        doc.fontSize(11).font("Helvetica").text(`${b.name}  ${b.count} atend.`, { continued: true }).text(`R$ ${b.revenue.toFixed(2)}`, { align: "right" });
        doc.moveDown(0.3);
      }
    }

    doc.end();
  });

  r.get("/export/csv", async (req, res) => {
    const rows = await prisma.financialTransaction.findMany({ where: { barbershopId: tenantId(req) }, orderBy: { date: "desc" } });
    const csv = ["data,tipo,categoria,descricao,valor,forma_pagamento", ...rows.map(row => [
      row.date.toISOString(), row.type, row.category, JSON.stringify(row.description ?? ""), row.amount, row.paymentMethod ?? ""
    ].join(","))].join("\n");
    return res.type("text/csv").send(csv);
  });
  return r;
}

function buildWhatsappRouter() {
  const r = Router();
  r.get("/connection", async (req, res) => ok(res, await prisma.whatsAppConnection.upsert({ where: { barbershopId: tenantId(req) }, update: {}, create: { barbershopId: tenantId(req) } })));
  r.post("/connect", async (req, res) => {
    const response = await evolutionRequest("/instance/create", {
      method: "POST",
      body: JSON.stringify({ instanceName: `upbarber-${tenantId(req)}`, qrcode: true })
    });
    return ok(res, await prisma.whatsAppConnection.upsert({
      where: { barbershopId: tenantId(req) },
      update: { status: "connecting", qrCode: response?.qrcode?.base64 ?? response?.base64 ?? null },
      create: { barbershopId: tenantId(req), status: "connecting", qrCode: response?.qrcode?.base64 ?? response?.base64 ?? null }
    }));
  });
  r.post("/disconnect", async (req, res) => ok(res, await prisma.whatsAppConnection.update({ where: { barbershopId: tenantId(req) }, data: { status: "disconnected", qrCode: null, connectedAt: null } })));
  r.use("/auto-messages", crudRouter({ prisma, model: "autoMessage", createSchema: z.object({ name: z.string(), trigger: z.enum(["appointment_created", "appointment_reminder_24h", "appointment_reminder_1h", "birthday", "inactive_client", "subscription_overdue", "subscription_due_soon"]), template: z.string(), isActive: z.boolean().optional() }), searchFields: ["name"] }));
  r.post("/auto-messages/:id/test", validate({ params: idParams, body: z.object({ phone: z.string() }) }), async (req, res) => {
    const message = await prisma.autoMessage.findFirstOrThrow({ where: { id: req.params.id, barbershopId: tenantId(req) } });
    const result = await evolutionRequest(`/message/sendText/upbarber-${tenantId(req)}`, {
      method: "POST",
      body: JSON.stringify({ number: req.body.phone, text: message.template })
    });
    return ok(res, result);
  });
  r.patch("/auto-messages/:id/toggle", validate({ params: idParams }), async (req, res) => {
    const msg = await prisma.autoMessage.findFirstOrThrow({ where: { id: req.params.id, barbershopId: tenantId(req) } });
    return ok(res, await prisma.autoMessage.update({ where: { id: msg.id }, data: { isActive: !msg.isActive } }));
  });
  r.use("/flows", crudRouter({ prisma, model: "whatsAppFlow", createSchema: z.object({ name: z.string(), triggerKeywords: z.array(z.string()), steps: z.any(), isActive: z.boolean().optional() }), searchFields: ["name"] }));
  r.patch("/flows/:id/toggle", validate({ params: idParams }), async (req, res) => {
    const flow = await prisma.whatsAppFlow.findFirstOrThrow({ where: { id: req.params.id, barbershopId: tenantId(req) } });
    return ok(res, await prisma.whatsAppFlow.update({ where: { id: flow.id }, data: { isActive: !flow.isActive } }));
  });
  r.use("/campaigns", crudRouter({ prisma, model: "whatsAppCampaign", createSchema: z.object({ name: z.string(), message: z.string(), audience: z.enum(["all", "subscribers", "common", "inactive", "overdue"]), status: z.enum(["draft", "scheduled", "sending", "completed", "cancelled"]).optional(), scheduledAt: z.string().optional().nullable() }), searchFields: ["name"] }));
  r.post("/campaigns/:id/send", validate({ params: idParams }), async (req, res) => {
    const campaign = await prisma.whatsAppCampaign.findFirstOrThrow({ where: { id: req.params.id, barbershopId: tenantId(req) } });
    const ticket = await prisma.supportTicket.create({
      data: {
        barbershopId: tenantId(req),
        subject: `Solicitação de disparo de campanha: ${campaign.name}`,
        message: `Olá! Gostaria de ativar o disparo da campanha "${campaign.name}" (ID: ${campaign.id}) com público: ${campaign.audience}. Por favor, entre em contato para realizarmos a implantação do WhatsApp e agendar o envio.`,
        status: "open",
        priority: "normal",
      }
    });
    await prisma.whatsAppCampaign.update({ where: { id: req.params.id }, data: { status: "scheduled" } });
    return ok(res, { ticket, message: "Chamado de suporte aberto. Nossa equipe entrará em contato para implantar o WhatsApp e agendar o disparo." });
  });
  r.post("/campaigns/:id/cancel", validate({ params: idParams }), async (req, res) => ok(res, await prisma.whatsAppCampaign.update({ where: { id: req.params.id }, data: { status: "cancelled" } })));
  r.get("/messages", async (_req, res) => ok(res, []));
  r.get("/metrics", async (req, res) => {
    const conn = await prisma.whatsAppConnection.findUnique({ where: { barbershopId: tenantId(req) } });
    return ok(res, { connected: conn?.status === "connected", status: conn?.status ?? "disconnected", delivered: 0, read: 0, clicks: 0 });
  });
  return r;
}

async function evolutionRequest(path: string, init: RequestInit) {
  if (!env.EVOLUTION_API_URL || !env.EVOLUTION_API_KEY || env.WHATSAPP_PROVIDER === "disabled") {
    throw new AppError(503, "WHATSAPP_NOT_CONFIGURED", "Configure a Evolution API para usar o WhatsApp");
  }
  const response = await fetch(`${env.EVOLUTION_API_URL.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", apikey: env.EVOLUTION_API_KEY, ...(init.headers ?? {}) }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new AppError(response.status, "WHATSAPP_PROVIDER_ERROR", "Falha na comunicação com o provedor WhatsApp", payload);
  return payload;
}

function buildNotificationsRouter() {
  const r = Router();
  r.get("/", validate({ query: pagingQuery }), async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const where: any = { barbershopId: tenantId(req) };
    if (req.query.isRead !== undefined) where.isRead = req.query.isRead === "true";
    const [data, total] = await Promise.all([prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }), prisma.notification.count({ where })]);
    return paginated(res, data, total, page, limit);
  });
  r.patch("/read-all", async (req, res) => ok(res, await prisma.notification.updateMany({ where: { barbershopId: tenantId(req), userId: req.user!.userId }, data: { isRead: true } })));
  r.patch("/:id/read", validate({ params: idParams }), async (req, res) => ok(res, await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } })));
  r.delete("/:id", validate({ params: idParams }), async (req, res) => { await prisma.notification.delete({ where: { id: req.params.id } }); return noContent(res); });
  return r;
}

function buildTenantSupportRouter() {
  const r = Router();
  r.get("/tickets", async (req, res) => ok(res, await prisma.supportTicket.findMany({
    where: { barbershopId: tenantId(req) },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" }
  })));
  r.post("/tickets", validate({ body: z.object({ subject: z.string().min(2), body: z.string().min(2), priority: z.string().optional() }) }), async (req, res) => {
    const code = `UPB-${Date.now().toString(36).toUpperCase()}`;
    return created(res, await prisma.supportTicket.create({ data: { ...req.body, code, barbershopId: tenantId(req) } }));
  });
  return r;
}

function sum(items: any[], field: string) {
  return items.reduce((acc, item) => acc + Number(item[field] ?? 0), 0);
}

function countBy(items: any[], field: string) {
  return items.reduce((acc, item) => ({ ...acc, [item[field]]: (acc[item[field]] ?? 0) + 1 }), {} as Record<string, number>);
}

function countMoney(items: any[], field: string) {
  return items.reduce((acc, item) => {
    const key = String(item[field] ?? "none");
    acc[key] = (acc[key] ?? 0) + Number(item.amount ?? 0);
    return acc;
  }, {} as Record<string, number>);
}

export default router;
