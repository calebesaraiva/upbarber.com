import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/shared/prisma.js";

const app = createApp();
let userToken = "";
let masterToken = "";

describe("UpBarber API end-to-end", () => {
  beforeAll(async () => {
    const userLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@upbarber.com.br", password: "123456" });

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
      .send({ email: "admin@upbarber.com.br", password: "invalid" });
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

  it("provisions a paid SaaS tenant that can log in, manage only its data, and is blocked when suspended", async () => {
    const unique = Date.now();
    const email = `owner-${unique}@upbarber.test`;
    const password = "Tenant@123";
    const plans = await request(app).get("/api/v1/master/plans").set("Authorization", `Bearer ${masterToken}`);
    const planId = plans.body.data[0].id;
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
