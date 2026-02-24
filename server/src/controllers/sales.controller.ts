import { Request, Response } from "express";
import { db } from "../db";
import { sales, saleItems, products } from "../db/schema";
import { eq, sql, desc, ne } from "drizzle-orm";
import { logAuditAction, AuditActions } from "../middlewares/audit.middleware";

export const getAll = async (req: Request, res: Response) => {
  try {
    const allSales = await db
      .select()
      .from(sales)
      .orderBy(desc(sales.createdAt));

    // Fetch items for each sale
    const salesWithItems = await Promise.all(allSales.map(async (sale) => {
      const items = await db
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, sale.id));
      return {
        ...sale,
        items,
      };
    }));

    res.json(salesWithItems);
  } catch (error) {
    console.error("Error fetching sales:", error);
    res.status(500).json({ message: "Error fetching sales" });
  }
};

/**
 * GET /api/sales/:id
 * Obtener una venta por ID
 */
export const getById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const [sale] = await db
      .select()
      .from(sales)
      .where(eq(sales.id, parseInt(id)))
      .limit(1);

    if (!sale) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    const items = await db
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, sale.id));

    res.json({ ...sale, items });
  } catch (error) {
    console.error("Error fetching sale:", error);
    res.status(500).json({ message: "Error fetching sale" });
  }
};

export const create = async (req: Request, res: Response) => {
  const { items, paymentMethod, total, customerName } = req.body;

  try {
    const result = await db.transaction(async (tx) => {
      // Asegurar que existe un producto "Venta Variada" para items sin producto
      const [miscRow] = await tx
        .select({ id: products.id })
        .from(products)
        .where(eq(products.name, "Venta Variada"))
        .limit(1);
      let miscProductId = miscRow?.id;

      if (!miscProductId) {
        // Crear producto especial para ventas variadas
        const [insertResult] = await tx
          .insert(products)
          .values({
            name: "Venta Variada",
            category: "Varios",
            stock: 0,
            minStock: 0,
            price: 0,
            cost: 0,
            estado: "NORMAL",
          });
        miscProductId = insertResult.insertId;
      }

      // Validar stocks antes de crear la venta para evitar negativos.
      // Items con id=0 son ventas variadas (usarán el producto especial)
      for (const item of items) {
        // Saltar validación para items variados
        if (item.id === 0) continue;
        
        const [currentProduct] = await tx
          .select()
          .from(products)
          .where(eq(products.id, item.id))
          .limit(1);
        if (!currentProduct) {
          throw new Error(`Producto no encontrado (id=${item.id})`);
        }
        if (currentProduct.stock < item.quantity) {
          throw new Error(
            `Stock insuficiente para '${currentProduct.name}': disponible=${currentProduct.stock}, solicitado=${item.quantity}`
          );
        }
      }
      
      // Create sale
      const [saleInsertResult] = await tx
        .insert(sales)
        .values({
          total,
          paymentMethod,
          customerName,
        });
      const [newSale] = await tx
        .select()
        .from(sales)
        .where(eq(sales.id, saleInsertResult.insertId))
        .limit(1);

      // Create items and update stock
      for (const item of items) {
        const productIdToUse = item.id === 0 ? miscProductId : item.id;
        
        await tx.insert(saleItems).values({
          saleId: newSale.id,
          productId: productIdToUse,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
        });

        // Update stock solo para productos normales (no variados)
        if (item.id !== 0) {
          await tx
            .update(products)
            .set({
              stock: sql`${products.stock} - ${item.quantity}`,
            })
            .where(eq(products.id, item.id));
        }
      }

      return newSale;
    });

    // Registrar auditoría
    await logAuditAction(req, {
      action: AuditActions.SALE_CREATE,
      entity: "sale",
      entityId: result.id.toString(),
      details: {
        total,
        paymentMethod,
        customerName,
        itemCount: items.length,
      },
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error creando venta",
      detalle: (error as Error).message,
    });
  }
};

/**
 * POST /api/sales/:id/void
 * Anular una venta (sin devolver stock)
 */
export const voidSale = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { reason } = req.body;
  const userId = (req as any).user?.id;

  try {
    const [sale] = await db
      .select()
      .from(sales)
      .where(eq(sales.id, parseInt(id)))
      .limit(1);

    if (!sale) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    if (sale.status !== "completed") {
      return res.status(400).json({
        message: `No se puede anular una venta con estado '${sale.status}'`,
      });
    }

    await db
      .update(sales)
      .set({
        status: "voided",
        voidedAt: new Date(),
        voidedBy: userId,
        voidReason: reason || "Anulada por usuario",
      })
      .where(eq(sales.id, parseInt(id)));

    const [updated] = await db
      .select()
      .from(sales)
      .where(eq(sales.id, parseInt(id)))
      .limit(1);

    // Registrar auditoría
    await logAuditAction(req, {
      action: AuditActions.SALE_VOID,
      entity: "sale",
      entityId: id,
      details: {
        reason: reason || "Anulada por usuario",
        originalTotal: sale.total,
      },
    });

    res.json({
      message: "Venta anulada exitosamente",
      sale: updated,
    });
  } catch (error) {
    console.error("Error voiding sale:", error);
    res.status(500).json({ message: "Error al anular venta" });
  }
};

/**
 * POST /api/sales/:id/refund
 * Devolver una venta (anula y devuelve stock)
 */
export const refundSale = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { reason, items: itemsToRefund } = req.body;
  const userId = (req as any).user?.id;

  try {
    const result = await db.transaction(async (tx) => {
      const [sale] = await tx
        .select()
        .from(sales)
        .where(eq(sales.id, parseInt(id)))
        .limit(1);

      if (!sale) {
        throw new Error("Venta no encontrada");
      }

      if (sale.status !== "completed") {
        throw new Error(
          `No se puede devolver una venta con estado '${sale.status}'`
        );
      }

      // Obtener items de la venta
      const saleItemsList = await tx
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, sale.id));

      // Si se especifican items, devolver solo esos; sino, todos
      const itemsToProcess = itemsToRefund
        ? saleItemsList.filter((item) =>
            itemsToRefund.some((r: any) => r.productId === item.productId)
          )
        : saleItemsList;

      // Devolver stock
      for (const item of itemsToProcess) {
        const refundQty = itemsToRefund
          ? itemsToRefund.find((r: any) => r.productId === item.productId)
              ?.quantity || item.quantity
          : item.quantity;

        await tx
          .update(products)
          .set({
            stock: sql`${products.stock} + ${refundQty}`,
          })
          .where(eq(products.id, item.productId));
      }

      // Calcular monto devuelto
      let refundTotal = sale.total;
      if (itemsToRefund && itemsToRefund.length < saleItemsList.length) {
        refundTotal = itemsToProcess.reduce((sum, item) => {
          const refundQty =
            itemsToRefund.find((r: any) => r.productId === item.productId)
              ?.quantity || item.quantity;
          return sum + item.price * refundQty;
        }, 0);
      }

      // Marcar venta como devuelta
      await tx
        .update(sales)
        .set({
          status: "refunded",
          voidedAt: new Date(),
          voidedBy: userId,
          voidReason: reason || "Devolución completa",
        })
        .where(eq(sales.id, parseInt(id)));

      const [updated] = await tx
        .select()
        .from(sales)
        .where(eq(sales.id, parseInt(id)))
        .limit(1);

      return {
        sale: updated,
        refundedItems: itemsToProcess.length,
        refundTotal,
      };
    });

    // Registrar auditoría
    await logAuditAction(req, {
      action: AuditActions.SALE_REFUND,
      entity: "sale",
      entityId: id,
      details: {
        reason: reason || "Devolución completa",
        refundTotal: result.refundTotal,
        refundedItems: result.refundedItems,
      },
    });

    res.json({
      message: "Devolución procesada exitosamente",
      ...result,
    });
  } catch (error: any) {
    console.error("Error refunding sale:", error);
    res.status(500).json({
      message: "Error al procesar devolución",
      detalle: error.message,
    });
  }
};

// Analytics
export const getMetrics = async (req: Request, res: Response) => {
  const { period } = req.query;
  // Simplified implementation
  try {
    const [totalSales] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sales);

    const [revenue] = await db
      .select({ total: sql<number>`sum(${sales.total})` })
      .from(sales);

    res.json({
      totalRevenue: revenue?.total || 0,
      totalSales: totalSales?.count || 0,
      averageTicket: (revenue?.total || 0) / (totalSales?.count || 1),
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching metrics" });
  }
};

export const getSalesTrend = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Get daily aggregated sales using MySQL date functions
    const dailySales = await db
      .select({
        date: sql<string>`DATE(created_at)`,
        salesCount: sql<number>`count(*)`,
        revenue: sql<number>`coalesce(sum(${sales.total}), 0)`,
      })
      .from(sales)
      .where(sql`created_at >= ${startDate} AND ${sales.status} = 'completed'`)
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    // Fill in missing days with zeros
    const trend: Array<{ date: string; salesCount: number; revenue: number; avgTicket: number }> = [];
    const salesMap = new Map(dailySales.map(d => [d.date, d]));

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      // Usar fecha local Chile (no UTC) para que coincida con DATE(created_at)
      const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      const dayData = salesMap.get(dateStr);
      
      trend.push({
        date: dateStr,
        salesCount: dayData?.salesCount || 0,
        revenue: dayData?.revenue || 0,
        avgTicket: dayData && dayData.salesCount > 0 ? Math.round(dayData.revenue / dayData.salesCount) : 0,
      });
    }

    res.json({ ok: true, days, trend });
  } catch (error) {
    console.error('Error fetching sales trend:', error);
    res.status(500).json({ message: 'Error fetching sales trend' });
  }
};

export const getSalesByHour = async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || 'today';
    const now = new Date();
    
    // Calculate start time based on period
    let startDate: Date;
    switch (period) {
      case 'today':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get hourly aggregated sales using MySQL date functions
    const hourlySales = await db
      .select({
        hour: sql<number>`HOUR(created_at)`,
        salesCount: sql<number>`count(*)`,
        revenue: sql<number>`coalesce(sum(${sales.total}), 0)`,
      })
      .from(sales)
      .where(sql`created_at >= ${startDate} AND ${sales.status} = 'completed'`)
      .groupBy(sql`HOUR(created_at)`);

    // Fill in all 24 hours with zeros for missing hours
    const hourlyStats: Array<{ hour: number; salesCount: number; revenue: number }> = [];
    const salesMap = new Map(hourlySales.map(h => [h.hour, h]));

    for (let hour = 0; hour < 24; hour++) {
      const hourData = salesMap.get(hour);
      hourlyStats.push({
        hour,
        salesCount: hourData?.salesCount || 0,
        revenue: hourData?.revenue || 0,
      });
    }

    res.json({ ok: true, period, hourlyStats });
  } catch (error) {
    console.error('Error fetching sales by hour:', error);
    res.status(500).json({ message: 'Error fetching sales by hour' });
  }
};

export const getPeriodComparison = async (req: Request, res: Response) => {
  res.json({ current: 0, previous: 0, change: 0 });
};

export const getRestockPredictions = async (req: Request, res: Response) => {
  res.json([]);
};
