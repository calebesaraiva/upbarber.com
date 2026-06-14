import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/shared/prisma.js";

const app = createApp();
let userToken = "";
let masterToken = "";

describe("UpBarber API end-to-end", () => {
  beforeAll(async () => {
    await prisma.platformConfig.upsert({
      where: { key: "master_mfa_enabled" },
      update: { value: "false" },
      create: { key: "master_mfa_enabled", value: "false" }
    });

    const userLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@upbarber.com", password: "123456" });

    const masterLogin = await request(app)
      .post("/api/v1/master/auth/login")
      .send({ email: "admin@upbarber.com.br", password: "Admin@2026!" });

    expect(userLogin.status).toBe(200);
    expect(masterLogin.status).toBe(200);
    userToken = userLogin.body.data.accessToken;
    masterToken = masterLogin.body.data.token;
  });

  it("rejects invalid credentials without crashing", async () => {
    const invalid = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@upbarber.com", password: "invalid" });
    expect(invalid.status).toBe(401);

    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
  });

  it("protects private routes", async () => {
    const response = await request(app).get("/api/v1/auth/me");
    expect(response.status).toBe(401);
  });

  it("returns the authenticated barbershop user", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user.role).toBe("admin");
    expect(response.body.data.barbershop).toBeTruthy();
  });

  it("completes a client create, read, update and deactivate lifecycle", async () => {
    const unique = Date.now();
    const created = await request(app)
      .post("/api/v1/clients")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: `Cliente E2E ${unique}`, email: `e2e-${unique}@upbarber.test` });

    expect(created.status).toBe(201);
    const clientId = created.body.data.id;

    const detail = await request(app)
      .get(`/api/v1/clients/${clientId}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.client.id).toBe(clientId);

    const updated = await request(app)
      .put(`/api/v1/clients/${clientId}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ notes: "Atualizado pelo teste ponta a ponta" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.notes).toContain("ponta a ponta");

    const removed = await request(app)
      .delete(`/api/v1/clients/${clientId}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(removed.status).toBe(204);
  });

  it("enforces barber and receptionist business permissions", async () => {
    const unique = Date.now();
    const password = "Perfil@123";
    const barberEmail = `barber-${unique}@upbarber.test`;
    const receptionistEmail = `reception-${unique}@upbarber.test`;

    const barberUser = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Barbeiro E2E", email: barberEmail, password, role: "barber" });
    const receptionistUser = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Recepcao E2E", email: receptionistEmail, password, role: "receptionist" });

    expect(barberUser.status).toBe(201);
    expect(receptionistUser.status).toBe(201);

    const barberLogin = await request(app).post("/api/v1/auth/login").send({ email: barberEmail, password });
    const receptionistLogin = await request(app).post("/api/v1/auth/login").send({ email: receptionistEmail, password });
    const barberToken = barberLogin.body.data.accessToken;
    const receptionistToken = receptionistLogin.body.data.accessToken;

    expect((await request(app).get("/api/v1/appointments").set("Authorization", `Bearer ${barberToken}`)).status).toBe(200);
    expect((await request(app).get("/api/v1/financial/summary").set("Authorization", `Bearer ${barberToken}`)).status).toBe(403);
    expect((await request(app).get("/api/v1/products").set("Authorization", `Bearer ${receptionistToken}`)).status).toBe(200);
    expect((await request(app).get("/api/v1/financial/summary").set("Authorization", `Bearer ${receptionistToken}`)).status).toBe(403);

    expect((await request(app).delete(`/api/v1/users/${barberUser.body.data.id}`).set("Authorization", `Bearer ${userToken}`)).status).toBe(204);
    expect((await request(app).delete(`/api/v1/users/${receptionistUser.body.data.id}`).set("Authorization", `Bearer ${userToken}`)).status).toBe(204);
  });

  it("walks through a full operational flow with real appointment and sale data", async () => {
    const unique = Date.now();
    const serviceName = `Corte E2E ${unique}`;
    const productName = `Pomada E2E ${unique}`;
    const clientEmail = `client-${unique}@upbarber.test`;
    const barberEmail = `masterbarber-${unique}@upbarber.test`;
    const receptionistEmail = `masterreception-${unique}@upbarber.test`;
    const password = "Fluxo@123";
    const appointmentDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    let serviceId = "";
    let barberId = "";
    let productId = "";
    let clientId = "";
    let appointmentId = "";
    let orderId = "";
    let receptionistId = "";

    try {
      const service = await request(app)
        .post("/api/v1/services")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          name: serviceName,
          description: "Serviço criado automaticamente pelo teste ponta a ponta",
          price: 65,
          durationMinutes: 30,
          commissionPercent: 40,
          category: "Corte"
        });
      expect(service.status).toBe(201);
      serviceId = service.body.data.id;

      const barber = await request(app)
        .post("/api/v1/barbers")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          name: "Barbeiro Fluxo E2E",
          email: barberEmail,
          phone: "11999990000",
          specialty: "Cortes masculinos",
          commissionPercent: 40,
          serviceIds: [serviceId]
        });
      expect(barber.status).toBe(201);
      barberId = barber.body.data.id;

      const receptionist = await request(app)
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ name: "Recepcionista Fluxo E2E", email: receptionistEmail, password, role: "receptionist" });
      expect(receptionist.status).toBe(201);
      receptionistId = receptionist.body.data.id;

      const product = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          name: productName,
          description: "Produto criado pelo teste ponta a ponta",
          category: "Barba",
          salePrice: 45,
          costPrice: 20,
          stock: 10,
          minStock: 2,
          internalCode: `E2E-${unique}`
        });
      expect(product.status).toBe(201);
      productId = product.body.data.id;

      const client = await request(app)
        .post("/api/v1/clients")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ name: `Cliente Fluxo ${unique}`, email: clientEmail, phone: "11988887777" });
      expect(client.status).toBe(201);
      clientId = client.body.data.id;

      const availability = await request(app)
        .get("/api/v1/appointments/availability")
        .set("Authorization", `Bearer ${userToken}`)
        .query({ barberId, date: appointmentDate, serviceId });
      expect(availability.status).toBe(200);
      expect(Array.isArray(availability.body.data.availableSlots)).toBe(true);
      expect(availability.body.data.availableSlots.length).toBeGreaterThan(0);
      const startTime = availability.body.data.availableSlots[0];

      const appointment = await request(app)
        .post("/api/v1/appointments")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          clientId,
          barberId,
          serviceId,
          date: appointmentDate,
          startTime,
          paymentMethod: "pix",
          notes: "Agendamento criado no teste ponta a ponta"
        });
      expect(appointment.status).toBe(201);
      appointmentId = appointment.body.data.id;

      const conflictAppointment = await request(app)
        .post("/api/v1/appointments")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          clientId,
          barberId,
          serviceId,
          date: appointmentDate,
          startTime,
          paymentMethod: "pix",
          notes: "Conflito esperado"
        });
      expect(conflictAppointment.status).toBe(409);
      expect(conflictAppointment.body.error.code).toBe("APPOINTMENT_CONFLICT");

      const completed = await request(app)
        .patch(`/api/v1/appointments/${appointmentId}/status`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ status: "completed" });
      expect(completed.status).toBe(200);
      expect(completed.body.data.status).toBe("completed");

      const order = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          clientId,
          barberId,
          notes: "Venda criada no fluxo ponta a ponta",
          items: [{ productId, quantity: 2 }]
        });
      expect(order.status).toBe(201);
      orderId = order.body.data.id;
      expect(Number(order.body.data.total)).toBeGreaterThan(0);

      const closedOrder = await request(app)
        .patch(`/api/v1/orders/${orderId}/close`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ paymentMethod: "pix" });
      expect(closedOrder.status).toBe(200);
      expect(closedOrder.body.data.status).toBe("closed");

      const clientDetail = await request(app)
        .get(`/api/v1/clients/${clientId}`)
        .set("Authorization", `Bearer ${userToken}`);
      expect(clientDetail.status).toBe(200);
      expect(clientDetail.body.data.appointments.length).toBeGreaterThan(0);
      expect(clientDetail.body.data.orders.length).toBeGreaterThan(0);

      const productDetail = await request(app)
        .get(`/api/v1/products/${productId}`)
        .set("Authorization", `Bearer ${userToken}`);
      expect(productDetail.status).toBe(200);
      expect(Number(productDetail.body.data.stock)).toBe(8);

      const financialSummary = await request(app)
        .get("/api/v1/financial/summary")
        .set("Authorization", `Bearer ${userToken}`);
      expect(financialSummary.status).toBe(200);
      expect(Number(financialSummary.body.data.totalIncome)).toBeGreaterThan(0);

      const receptionistLogin = await request(app).post("/api/v1/auth/login").send({ email: receptionistEmail, password });
      expect(receptionistLogin.status).toBe(200);
      const receptionistToken = receptionistLogin.body.data.accessToken;
      expect((await request(app).get("/api/v1/products").set("Authorization", `Bearer ${receptionistToken}`)).status).toBe(200);
      expect((await request(app).get("/api/v1/financial/summary").set("Authorization", `Bearer ${receptionistToken}`)).status).toBe(403);
    } finally {
      for (const cleanup of [
        () => orderId && request(app).patch(`/api/v1/orders/${orderId}/cancel`).set("Authorization", `Bearer ${userToken}`),
        () => appointmentId && request(app).delete(`/api/v1/appointments/${appointmentId}`).set("Authorization", `Bearer ${userToken}`).send({ cancelReason: "cleanup" }),
        () => productId && request(app).delete(`/api/v1/products/${productId}`).set("Authorization", `Bearer ${userToken}`),
        () => barberId && request(app).delete(`/api/v1/barbers/${barberId}`).set("Authorization", `Bearer ${userToken}`),
        () => serviceId && request(app).delete(`/api/v1/services/${serviceId}`).set("Authorization", `Bearer ${userToken}`),
        () => clientId && request(app).delete(`/api/v1/clients/${clientId}`).set("Authorization", `Bearer ${userToken}`),
        () => receptionistId && request(app).delete(`/api/v1/users/${receptionistId}`).set("Authorization", `Bearer ${userToken}`),
      ]) {
        try {
          const result = cleanup();
          if (result) await result;
        } catch {
          // cleanup best-effort
        }
      }
    }
  });

  it.each([
    "/api/v1/barbershop",
    "/api/v1/barbershop/hours",
    "/api/v1/barbershop/payment-methods",
    "/api/v1/users",
    "/api/v1/barbers",
    "/api/v1/services/categories",
    "/api/v1/services",
    "/api/v1/service-packages",
    "/api/v1/clients",
    "/api/v1/appointments",
    "/api/v1/appointments/today",
    "/api/v1/appointments/summary",
    "/api/v1/subscription-plans",
    "/api/v1/subscriptions",
    "/api/v1/subscriptions/summary",
    "/api/v1/subscriptions/overdue",
    "/api/v1/subscription-payments",
    "/api/v1/subscription-payments/summary",
    "/api/v1/products/categories",
    "/api/v1/products/low-stock",
    "/api/v1/products",
    "/api/v1/stock/movements",
    "/api/v1/orders",
    "/api/v1/financial/transactions",
    "/api/v1/financial/summary",
    "/api/v1/financial/cash-flow",
    "/api/v1/financial/commissions",
    "/api/v1/reports/daily",
    "/api/v1/reports/weekly",
    "/api/v1/reports/biweekly",
    "/api/v1/reports/monthly",
    "/api/v1/reports/export/csv",
    "/api/v1/whatsapp/connection",
    "/api/v1/whatsapp/messages",
    "/api/v1/whatsapp/metrics",
    "/api/v1/notifications",
    "/api/v1/saas/plans",
    "/api/v1/branches",
    "/api/v1/cash-registers/current",
    "/api/v1/cash-registers/history",
    "/api/v1/audit-logs",
    "/api/v1/access-groups",
    "/api/v1/banners",
    "/api/v1/club-benefits",
    "/api/v1/promotions",
    "/api/v1/subscription-pipeline",
    "/api/v1/commissions/reports",
    "/api/v1/reports/advanced/financial/revenue",
    "/api/v1/reports/advanced/clients/appointments",
  ])("serves core authenticated route %s", async (path) => {
    const response = await request(app)
      .get(path)
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(200);
  });

  it("serves master owner routes with a master token", async () => {
    const me = await request(app)
      .get("/api/v1/master/auth/me")
      .set("Authorization", `Bearer ${masterToken}`);
    const stats = await request(app)
      .get("/api/v1/master/barbershops/stats")
      .set("Authorization", `Bearer ${masterToken}`);
    const plans = await request(app)
      .get("/api/v1/master/plans")
      .set("Authorization", `Bearer ${masterToken}`);

    expect(me.status).toBe(200);
    expect(me.body.data.role).toBe("master");
    expect(stats.status).toBe(200);
    expect(plans.status).toBe(200);
  });

  it("returns a 2fa challenge for master login when enabled", async () => {
    await prisma.platformConfig.upsert({
      where: { key: "master_mfa_enabled" },
      update: { value: "true" },
      create: { key: "master_mfa_enabled", value: "true" }
    });

    const challenge = await request(app)
      .post("/api/v1/master/auth/login")
      .send({ email: "admin@upbarber.com.br", password: "Admin@2026!" });

    expect(challenge.status).toBe(202);
    expect(challenge.body.data.requires2fa).toBe(true);

    await prisma.platformConfig.upsert({
      where: { key: "master_mfa_enabled" },
      update: { value: "false" },
      create: { key: "master_mfa_enabled", value: "false" }
    });
  });

  it("provisions a paid SaaS tenant that can log in, manage only its data, and is blocked when suspended", async () => {
    const unique = Date.now();
    const email = `owner-${unique}@upbarber.test`;
    const password = "Tenant@123";
    const plans = await request(app).get("/api/v1/master/plans").set("Authorization", `Bearer ${masterToken}`);
    const planId = plans.body.data[0].id;
    const targetPlanId = plans.body.data.find((plan: { id: string }) => plan.id !== planId)?.id;
    const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();

    const provisioned = await request(app)
      .post("/api/v1/master/barbershops")
      .set("Authorization", `Bearer ${masterToken}`)
      .send({
        barbershopName: `Barbearia SaaS ${unique}`,
        ownerName: "Novo Proprietário",
        ownerEmail: email,
        ownerPassword: password,
        planId,
        dueDate,
        paymentMethod: "pix",
        invoiceStatus: "paid",
        city: "São Paulo",
        state: "SP"
      });

    expect(provisioned.status).toBe(201);
    expect(provisioned.body.data.invoice.paymentMethod).toBe("pix");
    expect(provisioned.body.data.invoice.status).toBe("paid");
    expect(provisioned.body.data.barbershop.saasPlanId).toBe(planId);
    const shopId = provisioned.body.data.barbershop.id;
    const pix = await request(app)
      .get(`/api/v1/master/invoices/${provisioned.body.data.invoice.id}/pix`)
      .set("Authorization", `Bearer ${masterToken}`);
    expect(pix.status).toBe(200);
    expect(pix.body.data.copyPaste).toMatch(/^000201/);
    expect(pix.body.data.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(pix.body.data.key).toBe("52.671.137/0001-71");

    try {
      const login = await request(app).post("/api/v1/auth/login").send({ email, password });
      expect(login.status).toBe(200);
      const tenantToken = login.body.data.accessToken;

      const client = await request(app)
        .post("/api/v1/clients")
        .set("Authorization", `Bearer ${tenantToken}`)
        .send({ name: "Cliente exclusivo do novo tenant" });
      expect(client.status).toBe(201);
      expect(client.body.data.barbershopId).toBe(shopId);

      const primaryTenantCannotRead = await request(app)
        .get(`/api/v1/clients/${client.body.data.id}`)
        .set("Authorization", `Bearer ${userToken}`);
      expect(primaryTenantCannotRead.body.data.client).toBeNull();

      if (targetPlanId) {
        const migration = await request(app)
          .post("/api/v1/saas/plan-change-requests")
          .set("Authorization", `Bearer ${tenantToken}`)
          .send({ targetPlanId, note: "Teste automatizado de migração de plano" });
        expect(migration.status).toBe(201);
        expect(migration.body.data.status).toBe("pending");
        expect(migration.body.data.currentPlanId).toBe(planId);
        expect(migration.body.data.targetPlanId).toBe(targetPlanId);

        const listedRequests = await request(app)
          .get("/api/v1/saas/plan-change-requests")
          .set("Authorization", `Bearer ${tenantToken}`);
        expect(listedRequests.status).toBe(200);
        expect(listedRequests.body.data.some((item: { id: string }) => item.id === migration.body.data.id)).toBe(true);

        const approved = await request(app)
          .patch(`/api/v1/master/plan-change-requests/${migration.body.data.id}/approve`)
          .set("Authorization", `Bearer ${masterToken}`)
          .send({});
        expect(approved.status).toBe(200);
        expect(approved.body.data.saasPlanId).toBe(targetPlanId);

        const afterPlan = await request(app)
          .get("/api/v1/barbershop")
          .set("Authorization", `Bearer ${tenantToken}`);
        expect(afterPlan.status).toBe(200);
        expect(afterPlan.body.data.saasPlanId || afterPlan.body.data.saasPlansId).toBe(targetPlanId);
      }

      const suspended = await request(app)
        .patch(`/api/v1/master/barbershops/${shopId}/suspend`)
        .set("Authorization", `Bearer ${masterToken}`)
        .send({ reason: "Teste de bloqueio SaaS" });
      expect(suspended.status).toBe(200);
      expect((await request(app).get("/api/v1/clients").set("Authorization", `Bearer ${tenantToken}`)).status).toBe(403);
      expect((await request(app).post("/api/v1/auth/login").send({ email, password })).status).toBe(403);

      expect((await request(app).patch(`/api/v1/master/barbershops/${shopId}/reactivate`).set("Authorization", `Bearer ${masterToken}`)).status).toBe(200);
      expect((await request(app).post("/api/v1/auth/login").send({ email, password })).status).toBe(200);
    } finally {
      await prisma.barbershop.delete({ where: { id: shopId } });
    }
  });

  it.each([
    "/api/v1/master/barbershops",
    "/api/v1/master/barbershops/stats",
    "/api/v1/master/invoices",
    "/api/v1/master/invoices/summary",
    "/api/v1/master/plans",
    "/api/v1/master/reports/summary",
    "/api/v1/master/reports/mrr-history",
    "/api/v1/master/reports/churn",
    "/api/v1/master/reports/growth",
    "/api/v1/master/reports/revenue-by-plan",
    "/api/v1/master/reports/export",
    "/api/v1/master/support/stats",
    "/api/v1/master/support/tickets",
    "/api/v1/master/config",
    "/api/v1/master/flags",
  ])("serves master route %s", async (path) => {
    const response = await request(app)
      .get(path)
      .set("Authorization", `Bearer ${masterToken}`);

    expect(response.status).toBe(200);
  });

  it("rejects a regular user token on master routes", async () => {
    const response = await request(app)
      .get("/api/v1/master/auth/me")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(401);
  });

  it("creates and lists a real tenant support ticket", async () => {
    const created = await request(app)
      .post("/api/v1/support/tickets")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ subject: "Teste E2E", body: "Chamado criado pelo teste automatizado", priority: "low" });
    const listed = await request(app)
      .get("/api/v1/support/tickets")
      .set("Authorization", `Bearer ${userToken}`);

    expect(created.status).toBe(201);
    expect(listed.status).toBe(200);
    expect(listed.body.data.some((ticket: { id: string }) => ticket.id === created.body.data.id)).toBe(true);
  });

  it("does not simulate WhatsApp success without a configured provider", async () => {
    const response = await request(app)
      .post("/api/v1/whatsapp/connect")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("WHATSAPP_NOT_CONFIGURED");
  });
});
