import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Usuario requerido")
    .max(120, "Usuario demasiado largo"),
  password: z.string().min(1, "Contraseña requerida"),
  remember: z.boolean().optional(),
});

export const productCreateSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  category: z.string().min(1, "Categoría requerida"),
  stock: z.number().int().min(0, "Stock >= 0"),
  minStock: z.number().int().min(0, "Stock mínimo >= 0"),
  price: z.number().int().min(0, "Precio >= 0"),
  cost: z.number().int().min(0).optional(),
  marginPct: z.number().int().min(0).max(400).optional(),
  BarCode: z.string().trim().min(8).max(20).nullable().optional(),
  ml: z.number().int().min(0, "Cantidad >= 0"),
  measureUnit: z.enum(["ml", "g", "none"]),
  estado: z.enum(["NORMAL", "BAJO", "AGOTADO", "DESHABILITADO"]).optional(),
  supplier: z.string().trim().max(100).nullable().optional(),
});

export const productUpdateSchema = productCreateSchema.partial();

export const saleItemSchema = z.object({
  productId: z.union([z.string(), z.number()]),
  quantity: z.number().int().min(1, "Cantidad >= 1"),
  price: z.number().int().min(0).optional(),
});

export const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Debe tener al menos un ítem"),
  customerName: z.string().trim().max(120).optional(),
  paymentMethod: z.enum(["cash", "debit", "credit", "transfer"]),
});

export const cashMovementSchema = z.object({
  type: z.enum(["sale", "expense", "adjustment", "income"]),
  amount: z.number().int().min(1, "Monto >= 1"),
  description: z.string().trim().max(200).optional(),
  paymentMethod: z.enum(["cash", "debit", "credit", "transfer"]).optional(),
  referenceId: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type CashMovementInput = z.infer<typeof cashMovementSchema>;

export function safeParse<T extends z.ZodTypeAny>(schema: T, data: unknown) {
  const r = schema.safeParse(data);
  if (!r.success) {
    const msg = r.error.errors.map((e) => e.message).join("; ");
    return { ok: false as const, error: msg };
  }
  return { ok: true as const, data: r.data as z.infer<T> };
}
