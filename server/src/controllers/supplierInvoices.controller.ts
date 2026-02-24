import { Request, Response } from "express";
import { db } from "../db";
import { 
  supplierInvoices, 
  supplierInvoiceItems, 
  supplierInvoicePayments,
  products 
} from "../db/schema";
import { eq, and, gte, lte, sql, desc, asc, like } from "drizzle-orm";
import { TenantRequest } from "../middlewares/tenant.middleware";

type InsertInvoice = typeof supplierInvoices.$inferInsert;
type InsertInvoiceItem = typeof supplierInvoiceItems.$inferInsert;
type InsertInvoicePayment = typeof supplierInvoicePayments.$inferInsert;

// Helper para parsear fechas
function parseDate(date: any): Date {
  if (!date) return new Date();
  return new Date(date);
}

// GET todas las facturas con filtros opcionales
export const getAll = async (req: TenantRequest, res: Response) => {
  try {
    const { 
      status, 
      supplier, 
      category,
      dateFrom,
      dateTo,
      sortBy = 'invoiceDate',
      sortOrder = 'desc'
    } = req.query;

    let query = db.select().from(supplierInvoices);
    const conditions = [];

    // Filtros
    if (status && status !== 'all') {
      conditions.push(eq(supplierInvoices.paymentStatus, status as any));
    }
    if (supplier) {
      conditions.push(like(supplierInvoices.supplierName, `%${supplier}%`));
    }
    if (category) {
      conditions.push(eq(supplierInvoices.expenseCategory, category as any));
    }
    if (dateFrom) {
      conditions.push(gte(supplierInvoices.invoiceDate, parseDate(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(supplierInvoices.invoiceDate, parseDate(dateTo)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Ordenamiento
    const orderCol = sortBy === 'total' ? supplierInvoices.total :
                     sortBy === 'dueDate' ? supplierInvoices.dueDate :
                     supplierInvoices.invoiceDate;
    query = query.orderBy(sortOrder === 'asc' ? asc(orderCol) : desc(orderCol)) as any;

    const invoices = await query;

    res.json(invoices);
  } catch (error) {
    console.error("[supplierInvoices.getAll]", error);
    res.status(500).json({ message: "Error fetching invoices" });
  }
};

// GET factura por ID con detalles (items y pagos)
export const getById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoiceId = parseInt(String(id));

    const [invoice] = await db
      .select()
      .from(supplierInvoices)
      .where(eq(supplierInvoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Obtener items
    const items = await db
      .select()
      .from(supplierInvoiceItems)
      .where(eq(supplierInvoiceItems.invoiceId, invoiceId));

    // Obtener pagos
    const payments = await db
      .select()
      .from(supplierInvoicePayments)
      .where(eq(supplierInvoicePayments.invoiceId, invoiceId))
      .orderBy(desc(supplierInvoicePayments.paymentDate));

    res.json({
      ...invoice,
      items,
      payments,
    });
  } catch (error) {
    console.error("[supplierInvoices.getById]", error);
    res.status(500).json({ message: "Error fetching invoice" });
  }
};

// CREATE nueva factura
export const create = async (req: TenantRequest, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    const {
      invoiceNumber,
      supplierName,
      invoiceDate,
      dueDate,
      subtotal,
      taxAmount,
      total,
      currency = 'CLP',
      expenseCategory,
      accountingCode,
      description,
      notes,
      items = [],
    } = req.body;

    // Validaciones
    if (!invoiceNumber || !supplierName || !expenseCategory) {
      return res.status(400).json({ 
        message: "Faltan campos requeridos: invoiceNumber, supplierName, expenseCategory" 
      });
    }

    // Verificar si ya existe la factura
    const [existing] = await db
      .select()
      .from(supplierInvoices)
      .where(and(
        eq(supplierInvoices.invoiceNumber, invoiceNumber),
        eq(supplierInvoices.supplierName, supplierName)
      ))
      .limit(1);

    if (existing) {
      return res.status(409).json({ 
        message: "Ya existe una factura con ese número para este proveedor" 
      });
    }

    const invoiceDateTs = parseDate(invoiceDate);
    const dueDateTs = dueDate ? parseDate(dueDate) : null;

    // Calcular totales
    const calculatedSubtotal = subtotal || 0;
    const calculatedTax = taxAmount || Math.round(calculatedSubtotal * 0.19);
    const calculatedTotal = total || (calculatedSubtotal + calculatedTax);

    // Crear factura
    const [insertResult] = await db
      .insert(supplierInvoices)
      .values({
        invoiceNumber,
        supplierName,
        invoiceDate: invoiceDateTs,
        dueDate: dueDateTs,
        subtotal: calculatedSubtotal,
        taxAmount: calculatedTax,
        total: calculatedTotal,
        amountPaid: 0,
        paymentStatus: 'pending',
        currency,
        expenseCategory,
        accountingCode,
        description,
        notes,
        registeredBy: userId,
      } as InsertInvoice);
    const [newInvoice] = await db.select().from(supplierInvoices).where(eq(supplierInvoices.id, insertResult.insertId)).limit(1);

    // Crear items si existen
    if (items && items.length > 0) {
      for (const item of items) {
        await db.insert(supplierInvoiceItems).values({
          invoiceId: newInvoice.id,
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
          taxRate: item.taxRate || 19,
        } as InsertInvoiceItem);
      }
    }

    // Si la factura es de inventario y tiene items con productId, actualizar stock
    if (expenseCategory === 'inventory' && items.length > 0) {
      for (const item of items) {
        if (item.productId) {
          await db.update(products)
            .set({ 
              stock: sql`${products.stock} + ${item.quantity}` 
            })
            .where(eq(products.id, item.productId));
        }
      }
    }

    res.status(201).json(newInvoice);
  } catch (error: any) {
    console.error("[supplierInvoices.create]", error);
    res.status(500).json({ message: "Error creating invoice" });
  }
};

// UPDATE factura
export const update = async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const invoiceId = parseInt(String(id));

    const [existing] = await db
      .select()
      .from(supplierInvoices)
      .where(eq(supplierInvoices.id, invoiceId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const {
      invoiceNumber,
      supplierName,
      invoiceDate,
      dueDate,
      subtotal,
      taxAmount,
      total,
      currency,
      expenseCategory,
      accountingCode,
      description,
      notes,
    } = req.body;

    const updateData: any = {};
    if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber;
    if (supplierName !== undefined) updateData.supplierName = supplierName;
    if (invoiceDate !== undefined) updateData.invoiceDate = parseDate(invoiceDate);
    if (dueDate !== undefined) updateData.dueDate = dueDate ? parseDate(dueDate) : null;
    if (subtotal !== undefined) updateData.subtotal = subtotal;
    if (taxAmount !== undefined) updateData.taxAmount = taxAmount;
    if (total !== undefined) {
      updateData.total = total;
    }
    if (currency !== undefined) updateData.currency = currency;
    if (expenseCategory !== undefined) updateData.expenseCategory = expenseCategory;
    if (accountingCode !== undefined) updateData.accountingCode = accountingCode;
    if (description !== undefined) updateData.description = description;
    if (notes !== undefined) updateData.notes = notes;
    updateData.updatedAt = new Date();

    await db.update(supplierInvoices)
      .set(updateData)
      .where(eq(supplierInvoices.id, invoiceId));
    const [updated] = await db.select().from(supplierInvoices).where(eq(supplierInvoices.id, invoiceId)).limit(1);

    if (!updated) {
      return res.status(404).json({ message: "Invoice not found after update" });
    }

    res.json(updated);
  } catch (error) {
    console.error("[supplierInvoices.update]", error);
    res.status(500).json({ message: "Error updating invoice" });
  }
};

// DELETE factura
export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoiceId = parseInt(String(id));

    const [existing] = await db
      .select()
      .from(supplierInvoices)
      .where(eq(supplierInvoices.id, invoiceId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // No permitir eliminar facturas pagadas
    if (existing.paymentStatus === 'paid') {
      return res.status(400).json({ 
        message: "No se puede eliminar una factura pagada" 
      });
    }

    await db.delete(supplierInvoices)
      .where(eq(supplierInvoices.id, invoiceId));

    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("[supplierInvoices.delete]", error);
    res.status(500).json({ message: "Error deleting invoice" });
  }
};

// POST registrar pago
export const registerPayment = async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const invoiceId = parseInt(String(id));
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    const { amount, paymentDate, paymentMethod, reference, notes } = req.body;

    if (!amount || !paymentMethod) {
      return res.status(400).json({ 
        message: "amount y paymentMethod son requeridos" 
      });
    }

    const [invoice] = await db
      .select()
      .from(supplierInvoices)
      .where(eq(supplierInvoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (invoice.paymentStatus === 'paid') {
      return res.status(400).json({ 
        message: "La factura ya está completamente pagada" 
      });
    }

    // Validar que el monto no exceda lo pendiente
    const pendingAmount = invoice.total - invoice.amountPaid;
    if (amount > pendingAmount) {
      return res.status(400).json({ 
        message: `El monto excede lo pendiente: ${pendingAmount}` 
      });
    }

    const paymentDateTs = paymentDate ? parseDate(paymentDate) : new Date();

    // Registrar pago
    const [paymentInsertResult] = await db
      .insert(supplierInvoicePayments)
      .values({
        invoiceId,
        paymentDate: paymentDateTs,
        amount,
        paymentMethod,
        reference,
        notes,
        registeredBy: userId,
      } as InsertInvoicePayment);
    const [payment] = await db.select().from(supplierInvoicePayments).where(eq(supplierInvoicePayments.id, paymentInsertResult.insertId)).limit(1);

    // Actualizar estado de la factura
    const newAmountPaid = invoice.amountPaid + amount;
    const newAmountPending = invoice.total - newAmountPaid;
    const newStatus = newAmountPending <= 0 ? 'paid' : 
                      newAmountPaid > 0 ? 'partial' : 'pending';

    await db.update(supplierInvoices)
      .set({
        amountPaid: newAmountPaid,
        paymentStatus: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(supplierInvoices.id, invoiceId));

    res.status(201).json(payment);
  } catch (error) {
    console.error("[supplierInvoices.registerPayment]", error);
    res.status(500).json({ message: "Error registering payment" });
  }
};

// GET estadísticas
export const getStats = async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const conditions = [];
    if (dateFrom) {
      conditions.push(gte(supplierInvoices.invoiceDate, parseDate(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(supplierInvoices.invoiceDate, parseDate(dateTo)));
    }

    let query = db.select().from(supplierInvoices);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const allInvoices = await query;

    // Calcular estadísticas
    const now = new Date();
    const next7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const stats = {
      totalPending: 0,
      totalPaid: 0,
      totalOverdue: 0,
      countPending: 0,
      countPaid: 0,
      countOverdue: 0,
      upcomingDue7Days: 0,
      upcomingDueAmount: 0,
      byCategory: {} as Record<string, { count: number; total: number }>,
      bySupplier: {} as Record<string, { count: number; total: number }>,
    };

    allInvoices.forEach(inv => {
      const isPaid = inv.paymentStatus === 'paid';
      const isOverdue = inv.paymentStatus === 'overdue' || 
                       (inv.dueDate && inv.dueDate < now && !isPaid);
      
      // Totales por estado
      if (isPaid) {
        stats.totalPaid += inv.total;
        stats.countPaid++;
      } else if (isOverdue) {
        stats.totalOverdue += (inv.total - inv.amountPaid);
        stats.countOverdue++;
      } else if (inv.paymentStatus === 'pending' || inv.paymentStatus === 'partial') {
        stats.totalPending += (inv.total - inv.amountPaid);
        stats.countPending++;
      }

      // Próximas a vencer
      if (inv.dueDate && inv.dueDate <= next7Days && inv.dueDate >= now && inv.paymentStatus !== 'paid') {
        stats.upcomingDue7Days++;
        stats.upcomingDueAmount += (inv.total - inv.amountPaid);
      }

      // Por categoría
      if (!stats.byCategory[inv.expenseCategory]) {
        stats.byCategory[inv.expenseCategory] = { count: 0, total: 0 };
      }
      stats.byCategory[inv.expenseCategory].count++;
      stats.byCategory[inv.expenseCategory].total += inv.total;

      // Por proveedor
      if (!stats.bySupplier[inv.supplierName]) {
        stats.bySupplier[inv.supplierName] = { count: 0, total: 0 };
      }
      stats.bySupplier[inv.supplierName].count++;
      stats.bySupplier[inv.supplierName].total += inv.total;
    });

    res.json({
      ...stats,
      byCategory: Object.entries(stats.byCategory).map(([category, data]) => ({
        category,
        ...data,
      })),
      bySupplier: Object.entries(stats.bySupplier)
        .map(([supplier, data]) => ({ supplier, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10), // Top 10 proveedores
    });
  } catch (error) {
    console.error("[supplierInvoices.getStats]", error);
    res.status(500).json({ message: "Error fetching stats" });
  }
};
