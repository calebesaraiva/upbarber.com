import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const accounts = parseAccounts();
  if (accounts.length === 0) throw new Error("Defina MASTER_ADMIN_EMAIL/MASTER_ADMIN_PASSWORD ou MASTER_ADMIN_ACCOUNTS");

  for (const account of accounts) {
    await prisma.masterAdmin.upsert({
      where: { email: account.email },
      update: {
        ...(account.password ? { passwordHash: await bcrypt.hash(account.password, 12) } : {}),
        ...(account.name ? { name: account.name } : {})
      },
      create: {
        email: account.email,
        passwordHash: await bcrypt.hash(account.password, 12),
        name: account.name ?? "Admin Master",
        role: account.role ?? "master"
      }
    });
  }

  const plans = [
    { name: "Starter", slug: "starter", price: 99, annualPrice: 79, maxFiliais: 1, maxBarbers: 2, maxClients: 500, storageGb: 1, color: "#6B7280", icon: "zap", sortOrder: 1, features: ["1 filial", "2 barbeiros", "Agenda básica", "Relatórios simples", "WhatsApp manual", "Suporte por email"] },
    { name: "Pro", slug: "pro", price: 199, annualPrice: 159, maxFiliais: 3, maxBarbers: 10, maxClients: 2000, storageGb: 10, color: "#8B5CF6", icon: "rocket", sortOrder: 2, features: ["3 filiais", "10 barbeiros", "Agenda completa", "Relatórios avançados", "WhatsApp automático", "Clube de assinantes", "Suporte prioritário", "Comissões automáticas"] },
    { name: "Business", slug: "business", price: 349, annualPrice: 279, maxFiliais: 99, maxBarbers: null, maxClients: null, storageGb: 100, color: "#F59E0B", icon: "crown", sortOrder: 3, features: ["Filiais ilimitadas", "Barbeiros ilimitados", "Multi-unidade", "API access", "Relatórios customizados", "WhatsApp + campanhas", "Gestor de grupos", "SLA 4h", "Onboarding dedicado"] }
  ];

  for (const plan of plans) {
    const existing = await prisma.saasPlan.findFirst({ where: { OR: [{ slug: plan.slug }, { name: plan.name }] } });
    if (existing) {
      await prisma.saasPlan.update({ where: { id: existing.id }, data: plan });
    } else {
      await prisma.saasPlan.create({ data: plan });
    }
  }

  const flags = [
    { key: "whatsapp_auto", label: "WhatsApp Automático", description: "Mensagens automáticas via API oficial" },
    { key: "multi_filial", label: "Multi-filial", description: "Suporte a múltiplas unidades" },
    { key: "ai_insights", label: "AI Insights (Beta)", description: "Análises inteligentes com IA" },
    { key: "api_access", label: "API Pública", description: "Acesso à API REST pública" },
    { key: "custom_reports", label: "Relatórios Customizados", description: "Builder de relatórios drag-and-drop" },
    { key: "nps_widget", label: "Widget NPS", description: "Coleta automática de NPS via WhatsApp" }
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: flag,
      create: flag
    });
  }

  const pro = await prisma.saasPlan.findUnique({ where: { slug: "pro" } });
  const shops = await prisma.barbershop.findMany({ where: { saasPlanId: null } });
  for (const shop of shops) {
    await prisma.barbershop.update({ where: { id: shop.id }, data: { saasPlanId: pro?.id, saasStatus: "active" } });
  }

  console.log("Seed master concluído");
}

function parseAccounts() {
  const raw = process.env.MASTER_ADMIN_ACCOUNTS;
  if (raw) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("MASTER_ADMIN_ACCOUNTS deve ser uma lista JSON");
    return parsed.map((item: any) => ({
      email: String(item.email || "").toLowerCase(),
      password: String(item.password || ""),
      name: item.name ? String(item.name) : undefined,
      role: item.role ? String(item.role) : "master"
    })).filter((item: any) => item.email && item.password);
  }

  const email = process.env.MASTER_ADMIN_EMAIL;
  const password = process.env.MASTER_ADMIN_PASSWORD;
  if (!email || !password) return [];
  return [{
    email: email.toLowerCase(),
    password,
    name: "Admin Master",
    role: "master"
  }];
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
