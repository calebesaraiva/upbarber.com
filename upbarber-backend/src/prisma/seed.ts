import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { addMinutes, addMonths, sameDateOnly } from "../shared/utils/time.js";

const prisma = new PrismaClient();

async function main() {
  const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL;
  const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  if (!initialAdminEmail || !initialAdminPassword) throw new Error("Defina INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD");
  await prisma.$transaction([
    prisma.financialTransaction.deleteMany(),
    prisma.commissionReport.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.subscriptionPayment.deleteMany(),
    prisma.subscriptionPipeline.deleteMany(),
    prisma.clientSubscription.deleteMany(),
    prisma.client.deleteMany(),
    prisma.planService.deleteMany(),
    prisma.subscriptionPlan.deleteMany(),
    prisma.packageItem.deleteMany(),
    prisma.servicePackage.deleteMany(),
    prisma.barberService.deleteMany(),
    prisma.service.deleteMany(),
    prisma.barber.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.cashRegister.deleteMany(),
    prisma.accessGroup.deleteMany(),
    prisma.banner.deleteMany(),
    prisma.clubBenefit.deleteMany(),
    prisma.promotion.deleteMany(),
    prisma.autoMessage.deleteMany(),
    prisma.whatsAppFlow.deleteMany(),
    prisma.whatsAppCampaign.deleteMany(),
    prisma.whatsAppConnection.deleteMany(),
    prisma.barbershopPaymentMethods.deleteMany(),
    prisma.barbershopHour.deleteMany(),
    prisma.user.deleteMany(),
    prisma.product.deleteMany(),
    prisma.branch.deleteMany(),
    prisma.barbershop.deleteMany(),
    prisma.saasPlan.deleteMany()
  ]);

  const [starter, pro, business] = await Promise.all([
    prisma.saasPlan.create({ data: { name: "Starter", price: 97, maxBarbers: 3, maxClients: 300, features: ["agenda", "clientes", "servicos"] } }),
    prisma.saasPlan.create({ data: { name: "Pro", price: 197, maxBarbers: 10, maxClients: 1500, features: ["agenda", "assinaturas", "financeiro", "whatsapp"] } }),
    prisma.saasPlan.create({ data: { name: "Business", price: 397, maxBarbers: null, maxClients: null, features: ["multiunidade", "relatorios", "automacoes", "suporte_prioritario"] } })
  ]);

  const barbershop = await prisma.barbershop.create({
    data: {
      name: "UpBarber Inicial",
      phone: "(11) 99999-0000",
      whatsapp: "(11) 99999-0000",
      email: "contato@upbarber.com",
      address: "Endereço inicial",
      city: "São Paulo",
      state: "SP",
      saasPlansId: pro.id,
      trialEndsAt: addMonths(new Date(), 1),
      subscriptionStatus: "active"
    }
  });

  await prisma.barbershopPaymentMethods.create({ data: { barbershopId: barbershop.id } });
  await prisma.whatsAppConnection.create({ data: { barbershopId: barbershop.id, status: "disconnected" } });
  const branch = await prisma.branch.create({
    data: {
      barbershopId: barbershop.id,
      name: "Matriz",
      address: "Endereço inicial",
      neighborhood: "Centro",
      city: "São Paulo",
      state: "SP",
      zipCode: "01000-000",
      phone: "(11) 99999-0000",
      isMain: true
    }
  });
  await prisma.barbershopHour.createMany({
    data: [1, 2, 3, 4, 5, 6].map((day) => ({ barbershopId: barbershop.id, day, isOpen: true, openTime: "09:00", closeTime: day === 6 ? "16:00" : "19:00" }))
  });

  const admin = await prisma.user.create({
    data: {
      barbershopId: barbershop.id,
      name: "Admin UpBarber",
      email: initialAdminEmail,
      passwordHash: await bcrypt.hash(initialAdminPassword, 10),
      emailVerifiedAt: new Date(),
      role: "admin"
    }
  });

  const services = await Promise.all([
    ["Corte Masculino", "Corte clássico ou moderno", 45, 40, "Corte"],
    ["Barba", "Modelagem e toalha quente", 35, 30, "Barba"],
    ["Corte + Barba", "Combo completo", 70, 70, "Combo"],
    ["Sobrancelha", "Acabamento na navalha", 20, 15, "Estetica"],
    ["Pigmentação", "Pigmentação capilar ou barba", 55, 45, "Coloracao"],
    ["Luzes", "Luzes masculinas", 120, 120, "Coloracao"],
    ["Hidratação", "Tratamento capilar", 60, 35, "Tratamento"],
    ["Pezinho", "Acabamento rápido", 15, 10, "Corte"],
    ["Relaxamento", "Tratamento químico", 90, 60, "Tratamento"],
    ["Combo Premium", "Corte, barba e hidratação", 120, 100, "Combo"]
  ].map(([name, description, price, durationMinutes, category]) =>
    prisma.service.create({
      data: {
        barbershopId: barbershop.id,
        name: String(name),
        description: String(description),
        price: Number(price),
        durationMinutes: Number(durationMinutes),
        commissionPercent: 40,
        category: category as any
      }
    })
  ));

  const barbers = await Promise.all([
    ["Carlos Silva", "(11) 99999-0001", "carlos@upbarber.com", "Corte e Barba", 40],
    ["Rafael Santos", "(11) 99999-0002", "rafael@upbarber.com", "Corte Moderno", 35],
    ["Diego Lima", "(11) 99999-0003", "diego@upbarber.com", "Barba e Pigmentação", 40],
    ["Mateus Costa", "(11) 99999-0004", "mateus@upbarber.com", "Luzes e Coloração", 45]
  ].map(([name, phone, email, specialty, commissionPercent], index) =>
    prisma.barber.create({
      data: {
        barbershopId: barbershop.id,
        name: String(name),
        phone: String(phone),
        email: String(email),
        specialty: String(specialty),
        commissionPercent: Number(commissionPercent),
        branchId: branch.id,
        isActive: index !== 3,
        services: { create: services.slice(0, index === 3 ? 6 : 8).map((service) => ({ serviceId: service.id })) }
      }
    })
  ));

  const plans = await Promise.all([
    ["Básico", "Até 4 cortes/mês", 89.9, 4, "#6B7280", [services[0].id]],
    ["Premium", "Cortes ilimitados + barba", 149.9, null, "#C9A84C", [services[0].id, services[1].id, services[2].id]],
    ["Black", "Todos os serviços ilimitados", 199.9, null, "#111827", services.slice(0, 5).map((s) => s.id)],
    ["Família", "Até 12 usos compartilhados", 299.9, 12, "#7C3AED", [services[0].id, services[1].id, services[2].id]]
  ].map(([name, description, price, usageLimit, color, serviceIds]) =>
    prisma.subscriptionPlan.create({
      data: {
        barbershopId: barbershop.id,
        name: String(name),
        description: String(description),
        price: Number(price),
        usageLimit: usageLimit as number | null,
        color: String(color),
        planServices: { create: (serviceIds as string[]).map((serviceId) => ({ serviceId })) }
      }
    })
  ));

  const clients = await Promise.all(Array.from({ length: 10 }).map((_, index) =>
    prisma.client.create({
      data: {
        barbershopId: barbershop.id,
        name: `Cliente Inicial ${index + 1}`,
        phone: `(11) 98888-00${String(index + 1).padStart(2, "0")}`,
        email: `cliente${index + 1}@email.com`,
        birthdate: new Date(1990 + index, 5, 14),
        tags: index % 2 === 0 ? ["vip"] : ["recorrente"],
        isActive: index !== 9
      }
    })
  ));

  for (let i = 0; i < 6; i++) {
    await prisma.clientSubscription.create({
      data: {
        clientId: clients[i].id,
        planId: plans[i % plans.length].id,
        barbershopId: barbershop.id,
        status: i === 5 ? "overdue" : "active",
        paymentMethod: "pix",
        price: plans[i % plans.length].price,
        usedThisCycle: i,
        currentPeriodStart: addMonths(new Date(), -1),
        currentPeriodEnd: addMonths(new Date(), i === 5 ? -0.1 : 1)
      }
    });
  }

  for (let i = 0; i < 10; i++) {
    const service = services[i % services.length];
    const startTime = `${String(9 + (i % 8)).padStart(2, "0")}:00`;
    const status = ["scheduled", "confirmed", "completed", "cancelled"][i % 4] as any;
    const appointment = await prisma.appointment.create({
      data: {
        barbershopId: barbershop.id,
        branchId: branch.id,
        clientId: clients[i % clients.length].id,
        barberId: barbers[i % barbers.length].id,
        serviceId: service.id,
        date: sameDateOnly(new Date()),
        startTime,
        endTime: addMinutes(startTime, service.durationMinutes),
        durationMinutes: service.durationMinutes,
        price: service.price,
        status,
        paymentMethod: "cash",
        isSubscriber: i < 4,
        completedAt: status === "completed" ? new Date() : null
      }
    });
    if (status === "completed") {
      await prisma.financialTransaction.create({ data: { barbershopId: barbershop.id, branchId: branch.id, type: "income", category: "Servico", description: `Atendimento ${service.name}`, amount: service.price, paymentMethod: "cash", appointmentId: appointment.id, barberId: appointment.barberId, date: new Date(), status: "completed" } });
    }
  }

  const products = await Promise.all([
    "Pomada Matte", "Shampoo Antiqueda", "Óleo para Barba", "Gel Fixador", "Máquina Pro", "Lâmina Navalha",
    "Cerveja Artesanal", "Água Mineral", "Café Gelado", "Balm Pós Barba", "Pente Carbono", "Escova Fade"
  ].map((name, index) => prisma.product.create({
    data: {
      barbershopId: barbershop.id,
      name,
      description: `${name} inicial`,
      category: index < 4 ? "Cabelo" : index < 6 ? "Ferramentas" : index < 9 ? "Bebidas" : "Barba",
      salePrice: 15 + index * 5,
      costPrice: 8 + index * 3,
      stock: index < 2 ? 3 : 20 + index,
      minStock: 5,
      internalCode: `BP-${String(index + 1).padStart(3, "0")}`
    }
  })));

  await prisma.financialTransaction.createMany({
    data: [
      { barbershopId: barbershop.id, branchId: branch.id, type: "income", category: "Produto", description: "Venda balcão", amount: 180, paymentMethod: "credit", date: new Date(), status: "completed" },
      { barbershopId: barbershop.id, branchId: branch.id, type: "income", category: "Assinatura", description: "Assinaturas do mês", amount: 1120, paymentMethod: "pix", date: new Date(), status: "completed" },
      { barbershopId: barbershop.id, branchId: branch.id, type: "expense", category: "Aluguel", description: "Aluguel", amount: 2500, paymentMethod: "pix", date: new Date(), status: "completed" },
      { barbershopId: barbershop.id, branchId: branch.id, type: "expense", category: "Estoque", description: "Reposição de produtos", amount: 740, paymentMethod: "debit", date: new Date(), status: "completed" }
    ]
  });

  await prisma.autoMessage.createMany({
    data: [
      { barbershopId: barbershop.id, name: "Agendamento criado", trigger: "appointment_created", template: "Olá {cliente}, seu horário foi marcado para {data} às {hora}." },
      { barbershopId: barbershop.id, name: "Lembrete 24h", trigger: "appointment_reminder_24h", template: "Lembrete: amanhã você tem horário na {barbearia}." },
      { barbershopId: barbershop.id, name: "Assinatura vencida", trigger: "subscription_overdue", template: "Sua assinatura está vencida. Regularize para continuar usando os benefícios." }
    ]
  });

  await prisma.whatsAppFlow.create({
    data: {
      barbershopId: barbershop.id,
      name: "Atendimento padrão",
      triggerKeywords: ["oi", "agenda", "horário"],
      steps: [{ type: "message", text: "Olá! Quer agendar um horário?" }]
    }
  });

  await prisma.notification.createMany({
    data: [
      { barbershopId: barbershop.id, userId: admin.id, type: "success", title: "Bem-vindo", message: "Ambiente inicial criado com sucesso." },
      { barbershopId: barbershop.id, userId: admin.id, type: "warning", title: "Estoque baixo", message: `${products[0].name} está abaixo do mínimo.`, relatedEntity: "product", relatedId: products[0].id }
    ]
  });

  await prisma.accessGroup.createMany({
    data: [
      { barbershopId: barbershop.id, name: "admin", color: "#C9A84C", description: "Acesso total", permissions: { "settings.users": true, "branches.manage": true, "financial.reports": true }, isDefault: true },
      { barbershopId: barbershop.id, name: "Atendimento", color: "#60A5FA", description: "Agenda e clientes", permissions: { "agenda.view": true, "agenda.create": true, "clients.view": true } }
    ]
  });

  await prisma.banner.create({
    data: { barbershopId: barbershop.id, title: "Semana do Combo Premium", linkUrl: "/planos", startsAt: new Date(), endsAt: addMonths(new Date(), 1) }
  });

  await prisma.clubBenefit.createMany({
    data: [
      { barbershopId: barbershop.id, name: "Prioridade na agenda", description: "Assinantes têm prioridade nos horários mais disputados.", type: "info", value: "priority" },
      { barbershopId: barbershop.id, name: "10% em produtos", description: "Desconto em produtos selecionados.", type: "discount", value: "10%" }
    ]
  });

  await prisma.promotion.create({
    data: { barbershopId: barbershop.id, name: "Terça do Corte", discountType: "percent", discountValue: 10, serviceIds: [services[0].id], daysOfWeek: [2] }
  });

  await prisma.cashRegister.create({
    data: { barbershopId: barbershop.id, branchId: branch.id, openedById: admin.id, openingBalance: 100, notes: "Caixa inicial aberto" }
  });

  await prisma.auditLog.create({
    data: { barbershopId: barbershop.id, branchId: branch.id, userId: admin.id, module: "Sistema", action: "Carga inicial executada", ipAddress: "127.0.0.1" }
  });

  console.log({ starter: starter.id, pro: pro.id, business: business.id, barbershop: barbershop.id, branch: branch.id, admin: admin.email });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
