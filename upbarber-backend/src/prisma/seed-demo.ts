import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, mins + minutes);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function sameDateOnly(date: Date | string) {
  const parsed = typeof date === "string" ? new Date(date) : date;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

const DEMO = {
  shopEmail: "demo@upbarber.com",
  ownerEmail: "demo@upbarber.com",
  ownerPassword: "Demo@12345",
  receptionistEmail: "recepcao.demo@upbarber.com",
  receptionistPassword: "Demo@12345",
  barberEmail: "barbeiro.demo@upbarber.com",
  barberPassword: "Demo@12345",
};

async function main() {
  let plan = await prisma.saasPlan.findFirst({
    where: { OR: [{ slug: "pro" }, { name: "Pro" }] },
  });

  if (!plan) {
    plan = await prisma.saasPlan.create({
      data: {
        name: "Pro",
        slug: "pro",
        price: 197,
        annualPrice: 0,
        features: ["agenda", "assinaturas", "financeiro", "whatsapp"],
        maxFiliais: 3,
        maxBarbers: 10,
        maxClients: 1500,
        storageGb: 10,
        modality: "normal",
        defaultModules: ["agenda", "clientes", "barbeiros", "servicos", "produtos", "estoque", "financeiro", "suporte"],
      },
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.barbershop.deleteMany({ where: { email: DEMO.shopEmail } });
    await tx.user.deleteMany({
      where: {
        email: {
          in: [DEMO.ownerEmail, DEMO.receptionistEmail, DEMO.barberEmail],
        },
      },
    });
  });

  const barbershop = await prisma.barbershop.create({
    data: {
      name: "Barbearia Demo UpBarber",
      phone: "(11) 98888-0000",
      whatsapp: "(11) 98888-0000",
      email: DEMO.shopEmail,
      address: "Av. Demo, 1000",
      city: "São Paulo",
      state: "SP",
      saasPlansId: plan.id,
      saasPlanId: plan.id,
      saasStatus: "active",
      trialEndsAt: addMonths(new Date(), 12),
      subscriptionStatus: "active",
      approvalStatus: "approved",
      registrationSource: "master",
      enabledModules: ["agenda", "clientes", "barbeiros", "servicos", "produtos", "estoque", "comandas", "financeiro", "relatorios", "suporte"],
    },
  });

  const branch = await prisma.branch.create({
    data: {
      barbershopId: barbershop.id,
      name: "Matriz Demo",
      address: "Av. Demo, 1000",
      neighborhood: "Centro",
      city: "São Paulo",
      state: "SP",
      zipCode: "01000-000",
      phone: "(11) 98888-0000",
      isMain: true,
    },
  });

  await prisma.barbershopPaymentMethods.create({ data: { barbershopId: barbershop.id } });
  await prisma.whatsAppConnection.create({ data: { barbershopId: barbershop.id, status: "disconnected" } });

  await prisma.barbershopHour.createMany({
    data: [1, 2, 3, 4, 5, 6].map((day) => ({
      barbershopId: barbershop.id,
      day,
      isOpen: true,
      openTime: "09:00",
      closeTime: day === 6 ? "16:00" : "19:00",
    })),
  });

  const owner = await prisma.user.create({
    data: {
      barbershopId: barbershop.id,
      name: "Dono Demo",
      email: DEMO.ownerEmail,
      passwordHash: await bcrypt.hash(DEMO.ownerPassword, 10),
      emailVerifiedAt: new Date(),
      role: "admin",
    },
  });

  const receptionist = await prisma.user.create({
    data: {
      barbershopId: barbershop.id,
      name: "Recepção Demo",
      email: DEMO.receptionistEmail,
      passwordHash: await bcrypt.hash(DEMO.receptionistPassword, 10),
      emailVerifiedAt: new Date(),
      role: "receptionist",
    },
  });

  const barberUser = await prisma.user.create({
    data: {
      barbershopId: barbershop.id,
      name: "Barbeiro Demo",
      email: DEMO.barberEmail,
      passwordHash: await bcrypt.hash(DEMO.barberPassword, 10),
      emailVerifiedAt: new Date(),
      role: "barber",
    },
  });

  const services = await Promise.all([
    prisma.service.create({
      data: {
        barbershopId: barbershop.id,
        name: "Corte Demo",
        description: "Corte moderno para demonstração",
        price: 60,
        durationMinutes: 30,
        commissionPercent: 40,
        category: "Corte",
      },
    }),
    prisma.service.create({
      data: {
        barbershopId: barbershop.id,
        name: "Barba Demo",
        description: "Modelagem premium",
        price: 40,
        durationMinutes: 25,
        commissionPercent: 40,
        category: "Barba",
      },
    }),
    prisma.service.create({
      data: {
        barbershopId: barbershop.id,
        name: "Combo Demo",
        description: "Corte + barba",
        price: 90,
        durationMinutes: 60,
        commissionPercent: 40,
        category: "Combo",
      },
    }),
  ]);

  await prisma.barber.create({
    data: {
      barbershopId: barbershop.id,
      userId: barberUser.id,
      name: "Barbeiro Demo",
      email: DEMO.barberEmail,
      phone: "(11) 97777-0000",
      specialty: "Corte e barba",
      commissionPercent: 40,
      branchId: branch.id,
      services: { create: services.map((service) => ({ serviceId: service.id })) },
    },
  });

  const clients = await Promise.all([
    prisma.client.create({
      data: {
        barbershopId: barbershop.id,
        name: "Cliente Demo 1",
        email: "cliente.demo1@upbarber.com",
        phone: "(11) 95555-0001",
        tags: ["vip"],
      },
    }),
    prisma.client.create({
      data: {
        barbershopId: barbershop.id,
        name: "Cliente Demo 2",
        email: "cliente.demo2@upbarber.com",
        phone: "(11) 95555-0002",
        tags: ["recorrente"],
      },
    }),
  ]);

  const subscriptionPlan = await prisma.subscriptionPlan.create({
    data: {
      barbershopId: barbershop.id,
      name: "Plano Demo Premium",
      description: "Plano de assinatura para a demonstração",
      price: 149.9,
      billingCycle: "monthly",
      usageLimit: null,
      color: "#C9A84C",
      planServices: { create: [{ serviceId: services[0].id }, { serviceId: services[1].id }] },
    },
  });

  const activeSubscription = await prisma.clientSubscription.create({
    data: {
      clientId: clients[0].id,
      planId: subscriptionPlan.id,
      barbershopId: barbershop.id,
      status: "active",
      paymentMethod: "pix",
      price: subscriptionPlan.price,
      usedThisCycle: 1,
      currentPeriodStart: addMonths(new Date(), -1),
      currentPeriodEnd: addMonths(new Date(), 1),
    },
  });

  const yesterday = sameDateOnly(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const today = sameDateOnly(new Date());

  const appointmentOne = await prisma.appointment.create({
    data: {
      barbershopId: barbershop.id,
      branchId: branch.id,
      clientId: clients[0].id,
      barberId: (await prisma.barber.findFirstOrThrow({ where: { barbershopId: barbershop.id } })).id,
      serviceId: services[0].id,
      date: today,
      startTime: "10:00",
      endTime: addMinutes("10:00", services[0].durationMinutes),
      durationMinutes: services[0].durationMinutes,
      price: services[0].price,
      status: "completed",
      paymentMethod: "pix",
      isSubscriber: false,
      completedAt: new Date(),
    },
  });

  await prisma.appointment.create({
    data: {
      barbershopId: barbershop.id,
      branchId: branch.id,
      clientId: clients[1].id,
      barberId: (await prisma.barber.findFirstOrThrow({ where: { barbershopId: barbershop.id } })).id,
      serviceId: services[2].id,
      date: yesterday,
      startTime: "14:00",
      endTime: addMinutes("14:00", services[2].durationMinutes),
      durationMinutes: services[2].durationMinutes,
      price: services[2].price,
      status: "scheduled",
      paymentMethod: "cash",
      isSubscriber: true,
      subscriptionId: activeSubscription.id,
    },
  });

  const product = await prisma.product.create({
    data: {
      barbershopId: barbershop.id,
      name: "Pomada Demo",
      description: "Produto para teste da vitrine",
      category: "Cabelo",
      salePrice: 49.9,
      costPrice: 22,
      stock: 12,
      minStock: 3,
      internalCode: "DEMO-001",
    },
  });

  const order = await prisma.order.create({
    data: {
      barbershopId: barbershop.id,
      branchId: branch.id,
      clientId: clients[0].id,
      barberId: (await prisma.barber.findFirstOrThrow({ where: { barbershopId: barbershop.id } })).id,
      notes: "Comanda demo para mostrar fluxo de vendas",
      total: 99.8,
      status: "closed",
      paymentMethod: "pix",
      closedAt: new Date(),
      items: {
        create: [{ productId: product.id, quantity: 2, unitPrice: product.salePrice, total: 99.8 }],
      },
    },
  });

  await prisma.financialTransaction.createMany({
    data: [
      {
        barbershopId: barbershop.id,
        branchId: branch.id,
        type: "income",
        category: "Servico",
        description: `Atendimento demo ${appointmentOne.id}`,
        amount: services[0].price,
        paymentMethod: "pix",
        appointmentId: appointmentOne.id,
        barberId: appointmentOne.barberId,
        date: new Date(),
        status: "completed",
      },
      {
        barbershopId: barbershop.id,
        branchId: branch.id,
        type: "income",
        category: "Produto",
        description: `Venda demo ${order.id}`,
        amount: 99.8,
        paymentMethod: "pix",
        orderId: order.id,
        date: new Date(),
        status: "completed",
      },
      {
        barbershopId: barbershop.id,
        branchId: branch.id,
        type: "expense",
        category: "Estoque",
        description: "Reposição demo",
        amount: 55,
        paymentMethod: "debit",
        date: new Date(),
        status: "completed",
      },
    ],
  });

  await prisma.notification.create({
    data: {
      barbershopId: barbershop.id,
      type: "success",
      title: "Demo pronta",
      message: "Barbearia demo criada com agenda, vendas e assinatura de exemplo.",
      relatedEntity: "barbershop",
      relatedId: barbershop.id,
      userId: owner.id,
    },
  });

  console.log(`Demo criada: ${DEMO.ownerEmail} / ${DEMO.ownerPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
