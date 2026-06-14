import { z } from "zod";

export const idParams = z.object({ id: z.string() });
export const pagingQuery = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional()
}).passthrough();

export const money = z.coerce.number().nonnegative();
export const optionalDate = z.union([z.string().datetime(), z.string().date()]).optional();
export const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  price: money,
  durationMinutes: z.coerce.number().int().positive(),
  commissionPercent: z.coerce.number().min(0).max(100).default(0),
  category: z.enum(["Corte", "Barba", "Combo", "Estetica", "Coloracao", "Tratamento", "Outro"]).default("Outro"),
  isActive: z.boolean().optional()
});

export const barberSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  specialty: z.string().optional().nullable(),
  commissionPercent: z.coerce.number().min(0).max(100).default(0),
  avatarUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  serviceIds: z.array(z.string()).optional()
});

export const clientSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  birthdate: optionalDate.nullable(),
  notes: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  planId: z.string().optional().nullable()
});

export const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  category: z.enum(["Cabelo", "Barba", "Ferramentas", "Bebidas", "Alimentacao", "Outro"]).default("Outro"),
  salePrice: money,
  costPrice: money,
  stock: z.coerce.number().int().default(0),
  minStock: z.coerce.number().int().default(0),
  internalCode: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  isActive: z.boolean().optional()
});

export const subscriptionPlanSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  price: money,
  billingCycle: z.enum(["monthly", "quarterly", "yearly"]).default("monthly"),
  usageLimit: z.coerce.number().int().positive().optional().nullable(),
  color: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  serviceIds: z.array(z.string()).optional()
});

export const financialTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  category: z.enum(["Servico", "Produto", "Assinatura", "Comissao", "Aluguel", "Estoque", "Outro"]),
  description: z.string().min(2),
  amount: money,
  paymentMethod: z.enum(["pix", "cash", "credit", "debit", "boleto", "subscription", "courtesy"]).optional().nullable(),
  barberId: z.string().optional().nullable(),
  date: optionalDate.default(new Date().toISOString()),
  status: z.enum(["completed", "pending", "cancelled"]).default("completed"),
  notes: z.string().optional().nullable()
});
