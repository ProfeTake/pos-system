import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../db';
import { returns, returnItems, sales, saleItems, products } from '../db/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';

/**
 * GET /api/returns
 * Get all returns with optional filters
 */
export async function getReturns(req: Request, res: Response) {
  try {
    const { startDate, endDate, status, method } = req.query;

    let whereConditions: any[] = [];

    // Date filters
    if (startDate) {
      whereConditions.push(gte(returns.createdAt, new Date(startDate as string)));
    }
    if (endDate) {
      whereConditions.push(lte(returns.createdAt, new Date(endDate as string)));
    }

    // Status filter
    if (status) {
      whereConditions.push(eq(returns.status, status as string));
    }

    // Method filter
    if (method) {
      whereConditions.push(eq(returns.method, method as string));
    }

    const allReturns = whereConditions.length > 0
      ? await db.select().from(returns).where(and(...whereConditions)).orderBy(desc(returns.createdAt))
      : await db.select().from(returns).orderBy(desc(returns.createdAt));

    // Get items for each return
    const returnsWithItems = await Promise.all(allReturns.map(async (ret) => {
      const items = await db
        .select()
        .from(returnItems)
        .where(eq(returnItems.returnId, ret.id));
      
      return { ...ret, items };
    }));

    return res.json(returnsWithItems);
  } catch (error) {
    console.error('Error fetching returns:', error);
    return res.status(500).json({ error: 'Error al obtener devoluciones' });
  }
}

/**
 * GET /api/returns/:id
 * Get a single return with items
 */
export async function getReturnById(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const [returnRecord] = await db
      .select()
      .from(returns)
      .where(eq(returns.id, id))
      .limit(1);

    if (!returnRecord) {
      return res.status(404).json({ error: 'Devolución no encontrada' });
    }

    const items = await db
      .select()
      .from(returnItems)
      .where(eq(returnItems.returnId, id));

    // Get original sale
    const [sale] = await db
      .select()
      .from(sales)
      .where(eq(sales.id, returnRecord.saleId))
      .limit(1);

    return res.json({
      ...returnRecord,
      items,
      originalSale: sale || null,
    });
  } catch (error) {
    console.error('Error fetching return:', error);
    return res.status(500).json({ error: 'Error al obtener devolución' });
  }
}

/**
 * POST /api/returns
 * Create a new return/refund
 */
export async function createReturn(req: Request, res: Response) {
  try {
    const { saleId, reason, items, method, notes } = req.body;
    const userId = (req as any).userId; // From auth middleware

    // Validations
    if (!saleId || !reason || !items || items.length === 0) {
      return res.status(400).json({ 
        error: 'Venta, razón e items son requeridos' 
      });
    }

    // Verify sale exists
    const [sale] = await db
      .select()
      .from(sales)
      .where(eq(sales.id, saleId))
      .limit(1);

    if (!sale) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    if (sale.status === 'voided') {
      return res.status(400).json({ error: 'No se puede devolver una venta anulada' });
    }

    // Get original sale items
    const originalItems = await db
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, saleId));

    // Validate items to return
    const itemsToReturn: any[] = [];
    let totalRefund = 0;

    for (const item of items) {
      const originalItem = originalItems.find(oi => oi.productId === item.productId);
      
      if (!originalItem) {
        return res.status(400).json({ 
          error: `Producto ${item.productId} no está en la venta original` 
        });
      }

      if (item.quantity > originalItem.quantity) {
        return res.status(400).json({ 
          error: `Cantidad a devolver excede la cantidad original para producto ${item.productId}` 
        });
      }

      const subtotal = originalItem.price * item.quantity;
      totalRefund += subtotal;

      itemsToReturn.push({
        productId: item.productId,
        productName: originalItem.productName,
        quantity: item.quantity,
        price: originalItem.price,
        subtotal,
      });
    }

    // Create return record
    const newReturnId = randomUUID();
    await db.insert(returns).values({
      id: newReturnId,
      saleId,
      reason,
      totalRefund: String(totalRefund),
      method: method || 'cash',
      status: 'completed',
      processedBy: userId,
      notes: notes || null,
      createdAt: new Date(),
    });

    const [newReturn] = await db.select().from(returns).where(eq(returns.id, newReturnId)).limit(1);

    // Create return items
    const returnItemsData = itemsToReturn.map(item => ({
      returnId: newReturnId,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    }));

    await db.insert(returnItems).values(returnItemsData);

    // Restore stock for returned items
    for (const item of itemsToReturn) {
      await db
        .update(products)
        .set({
          stock: sql`${products.stock} + ${item.quantity}`,
        })
        .where(eq(products.id, item.productId));
    }

    // Get complete return with items
    const items_returned = await db
      .select()
      .from(returnItems)
      .where(eq(returnItems.returnId, newReturnId));

    return res.status(201).json({
      ...newReturn,
      items: items_returned,
    });
  } catch (error) {
    console.error('Error creating return:', error);
    return res.status(500).json({ error: 'Error al crear devolución' });
  }
}

/**
 * GET /api/returns/sale/:saleId
 * Get returns for a specific sale
 */
export async function getReturnsBySale(req: Request, res: Response) {
  try {
    const saleId = Number(req.params.saleId);

    const saleReturns = await db
      .select()
      .from(returns)
      .where(eq(returns.saleId, saleId))
      .orderBy(desc(returns.createdAt));

    // Get items for each return
    const returnsWithItems = await Promise.all(saleReturns.map(async (ret) => {
      const items = await db
        .select()
        .from(returnItems)
        .where(eq(returnItems.returnId, ret.id));
      
      return { ...ret, items };
    }));

    return res.json(returnsWithItems);
  } catch (error) {
    console.error('Error fetching returns for sale:', error);
    return res.status(500).json({ error: 'Error al obtener devoluciones' });
  }
}

/**
 * GET /api/returns/stats
 * Get return statistics
 */
export async function getReturnStats(req: Request, res: Response) {
  try {
    const { period = '30d' } = req.query;

    // Calculate date range
    let daysAgo: number;
    
    switch (period) {
      case '7d': daysAgo = 7; break;
      case '30d': daysAgo = 30; break;
      case '90d': daysAgo = 90; break;
      default: daysAgo = 30;
    }
    
    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    // Total returns and refund amount
    const totalReturns = await db
      .select()
      .from(returns)
      .where(gte(returns.createdAt, startDate));

    const totalRefunded = totalReturns.reduce((sum, ret) => sum + Number(ret.totalRefund), 0);

    // Returns by reason
    const byReason: Record<string, number> = {};
    totalReturns.forEach(ret => {
      byReason[ret.reason] = (byReason[ret.reason] || 0) + 1;
    });

    // Returns by method
    const byMethod: Record<string, { count: number; total: number }> = {};
    totalReturns.forEach(ret => {
      if (!byMethod[ret.method]) {
        byMethod[ret.method] = { count: 0, total: 0 };
      }
      byMethod[ret.method].count++;
      byMethod[ret.method].total += Number(ret.totalRefund);
    });

    // Most returned products
    const allReturnItems = await db
      .select()
      .from(returnItems)
      .innerJoin(returns, eq(returnItems.returnId, returns.id))
      .where(gte(returns.createdAt, startDate)) as any[];

    const productReturns: Record<number, { name: string; quantity: number; count: number }> = {};
    
    allReturnItems.forEach((item: any) => {
      const pid = item.return_items.productId;
      if (!productReturns[pid]) {
        productReturns[pid] = {
          name: item.return_items.productName,
          quantity: 0,
          count: 0,
        };
      }
      productReturns[pid].quantity += item.return_items.quantity;
      productReturns[pid].count++;
    });

    const topReturnedProducts = Object.entries(productReturns)
      .map(([productId, data]) => ({
        productId: parseInt(productId),
        productName: data.name,
        totalQuantity: data.quantity,
        returnCount: data.count,
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    return res.json({
      period,
      summary: {
        totalReturns: totalReturns.length,
        totalRefunded: Math.round(totalRefunded),
        averageRefund: totalReturns.length > 0 ? Math.round(totalRefunded / totalReturns.length) : 0,
      },
      byReason: Object.entries(byReason).map(([reason, count]) => ({ reason, count })),
      byMethod: Object.entries(byMethod).map(([method, data]) => ({
        method,
        count: data.count,
        total: Math.round(data.total),
      })),
      topReturnedProducts,
    });
  } catch (error) {
    console.error('Error fetching return stats:', error);
    return res.status(500).json({ error: 'Error al obtener estadísticas de devoluciones' });
  }
}

/**
 * PATCH /api/returns/:id
 * Update a return (limited fields)
 */
export async function updateReturn(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { status, notes } = req.body;

    const [existing] = await db
      .select()
      .from(returns)
      .where(eq(returns.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Devolución no encontrada' });
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    await db
      .update(returns)
      .set(updates)
      .where(eq(returns.id, id));

    const [result] = await db.select().from(returns).where(eq(returns.id, id)).limit(1);

    return res.json(result);
  } catch (error) {
    console.error('Error updating return:', error);
    return res.status(500).json({ error: 'Error al actualizar devolución' });
  }
}
