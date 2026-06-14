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

  const MODULES_BASE = ["agenda", "clientes", "barbeiros", "servicos", "financeiro", "caixa", "relatorios", "configuracoes", "notificacoes", "suporte", "saas-planos"];
  const MODULES_SUBSCRIPTION = [...MODULES_BASE, "assinaturas", "planos", "assinantes", "pagamentos-assinatura"];
  const MODULES_FULL = [...MODULES_SUBSCRIPTION, "produtos", "estoque", "comandas", "whatsapp", "campanhas"];
  const MODULES_NORMAL_FULL = [...MODULES_BASE, "produtos", "estoque", "comandas", "whatsapp", "campanhas"];

  const plans = [
    // --- Barbearia Normal ---
    {
      name: "Essencial", slug: "essencial", price: 89, annualPrice: 69, maxFiliais: 1, maxBarbers: 3, maxClients: 300, storageGb: 1,
      color: "#6B7280", icon: "zap", sortOrder: 1, modality: "normal",
      defaultModules: [...MODULES_BASE, "produtos", "estoque", "comandas"],
      features: ["1 filial", "3 barbeiros", "Agenda completa", "Clientes e histórico", "Caixa do dia", "Comandas", "Estoque básico", "Relatórios simples", "Suporte por email"]
    },
    {
      name: "Profissional", slug: "profissional", price: 169, annualPrice: 139, maxFiliais: 3, maxBarbers: 10, maxClients: 1500, storageGb: 10,
      color: "#8B5CF6", icon: "rocket", sortOrder: 2, modality: "normal",
      defaultModules: MODULES_NORMAL_FULL,
      features: ["3 filiais", "10 barbeiros", "Tudo do Essencial", "Estoque avançado", "Comissões automáticas", "WhatsApp manual", "Campanhas", "Relatórios avançados", "Suporte prioritário"]
    },
    {
      name: "Premium", slug: "premium", price: 299, annualPrice: 239, maxFiliais: 99, maxBarbers: null, maxClients: null, storageGb: 100,
      color: "#F59E0B", icon: "crown", sortOrder: 3, modality: "normal",
      defaultModules: MODULES_NORMAL_FULL,
      features: ["Filiais ilimitadas", "Barbeiros ilimitados", "Tudo do Profissional", "Multi-unidade", "API access", "Relatórios customizados", "WhatsApp + campanhas avançadas", "SLA 4h", "Onboarding dedicado"]
    },
    // --- Barbearia por Assinatura ---
    {
      name: "Clube Starter", slug: "clube-starter", price: 129, annualPrice: 99, maxFiliais: 1, maxBarbers: 3, maxClients: 300, storageGb: 1,
      color: "#10B981", icon: "zap", sortOrder: 4, modality: "subscription",
      defaultModules: MODULES_SUBSCRIPTION,
      features: ["1 filial", "3 barbeiros", "Clube de assinantes", "Planos de assinatura", "Controle de mensalidades", "Agenda com assinantes", "Relatórios de assinatura", "Suporte por email"]
    },
    {
      name: "Clube Pro", slug: "clube-pro", price: 229, annualPrice: 189, maxFiliais: 3, maxBarbers: 10, maxClients: 2000, storageGb: 10,
      color: "#6366F1", icon: "rocket", sortOrder: 5, modality: "subscription",
      defaultModules: MODULES_FULL,
      features: ["3 filiais", "10 barbeiros", "Tudo do Clube Starter", "Comandas", "Estoque", "WhatsApp automático para assinantes", "Controle de churn", "Comissões", "Suporte prioritário"]
    },
    {
      name: "Clube Business", slug: "clube-business", price: 399, annualPrice: 319, maxFiliais: 99, maxBarbers: null, maxClients: null, storageGb: 100,
      color: "#F59E0B", icon: "crown", sortOrder: 6, modality: "subscription",
      defaultModules: MODULES_FULL,
      features: ["Filiais ilimitadas", "Assinantes ilimitados", "Tudo do Clube Pro", "Pipeline de assinantes", "Campanhas de retenção", "API access", "Relatórios customizados", "Onboarding dedicado", "SLA 4h"]
    },
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
