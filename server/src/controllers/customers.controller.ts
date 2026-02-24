import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../db';
import { customers, customerDebts, sales } from '../db/schema';
import { eq, and, desc, sql, sum, count, or, like } from 'drizzle-orm';

/**
 * GET /api/customers
 * Get all customers with optional search
 */
export async function getCustomers(req: Request, res: Response) {
  try {
    const { search, active } = req.query;

    let whereConditions: any[] = [];

    // Filter by active status
    if (active !== undefined) {
      whereConditions.push(eq(customers.active, active === 'true' ? 1 : 0));
    }

    // Search by name, phone, or RUT
    if (search) {
      whereConditions.push(
        or(
          like(customers.name, `%${search}%`),
          like(customers.phone, `%${search}%`),
          like(customers.rut, `%${search}%`)
        )
      );
    }

    const allCustomers = whereConditions.length > 0
      ? await db.select().from(customers).where(and(...whereConditions)).orderBy(desc(customers.createdAt))
      : await db.select().from(customers).orderBy(desc(customers.createdAt));

    return res.json(allCustomers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return res.status(500).json({ error: 'Error al obtener clientes' });
  }
}

/**
 * GET /api/customers/:id
 * Get a single customer with debts
 */
export async function getCustomerById(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Get customer debts
    const debts = await db
      .select()
      .from(customerDebts)
      .where(eq(customerDebts.customerId, id))
      .orderBy(desc(customerDebts.createdAt));

    // Get purchase history
    const purchaseHistory = await db
      .select()
      .from(sales)
      .where(eq(sales.customerId, id))
      .orderBy(desc(sales.createdAt))
      .limit(10);

    return res.json({
      ...customer,
      debts,
      recentPurchases: purchaseHistory,
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return res.status(500).json({ error: 'Error al obtener cliente' });
  }
}

/**
 * POST /api/customers
 * Create a new customer
 */
export async function createCustomer(req: Request, res: Response) {
  try {
    const {
      name,
      email,
      phone,
      rut,
      address,
      creditLimit,
      notes,
    } = req.body;

    // Validations
    if (!name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    // Check if RUT already exists (if provided)
    if (rut) {
      const [existing] = await db
        .select()
        .from(customers)
        .where(eq(customers.rut, rut))
        .limit(1);

      if (existing) {
        return res.status(400).json({ error: 'Ya existe un cliente con ese RUT' });
      }
    }

    const newId = randomUUID();

    await db.insert(customers).values({
      id: newId,
      name,
      email: email || null,
      phone: phone || null,
      rut: rut || null,
      address: address || null,
      creditLimit: String(creditLimit || 0),
      creditUsed: "0",
      loyaltyPoints: 0,
      totalPurchases: "0",
      totalSales: 0,
      lastPurchase: null,
      notes: notes || null,
      active: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [result] = await db.select().from(customers).where(eq(customers.id, newId)).limit(1);

    return res.status(201).json(result);
  } catch (error) {
    console.error('Error creating customer:', error);
    return res.status(500).json({ error: 'Error al crear cliente' });
  }
}

/**
 * PATCH /api/customers/:id
 * Update a customer
 */
export async function updateCustomer(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const updates = req.body;

    // Check if customer exists
    const [existing] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Check RUT uniqueness if updating
    if (updates.rut && updates.rut !== existing.rut) {
      const [rutExists] = await db
        .select()
        .from(customers)
        .where(and(eq(customers.rut, updates.rut), sql`${customers.id} != ${id}`))
        .limit(1);

      if (rutExists) {
        return res.status(400).json({ error: 'Ya existe un cliente con ese RUT' });
      }
    }

    await db.update(customers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customers.id, id));

    const [result] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);

    return res.json(result);
  } catch (error) {
    console.error('Error updating customer:', error);
    return res.status(500).json({ error: 'Error al actualizar cliente' });
  }
}

/**
 * DELETE /api/customers/:id
 * Delete a customer
 */
export async function deleteCustomer(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    // Check if exists
    const [existing] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Check for pending debts
    const pendingDebts = await db
      .select()
      .from(customerDebts)
      .where(and(
        eq(customerDebts.customerId, id),
        eq(customerDebts.status, 'pending')
      ));

    if (pendingDebts.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar un cliente con deudas pendientes',
        pendingDebts: pendingDebts.length
      });
    }

    await db.delete(customers).where(eq(customers.id, id));

    return res.json({ message: 'Cliente eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return res.status(500).json({ error: 'Error al eliminar cliente' });
  }
}

/**
 * POST /api/customers/:id/toggle
 * Toggle active status
 */
export async function toggleCustomer(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const [existing] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const newStatus = existing.active ? 0 : 1;

    await db.update(customers)
      .set({ active: newStatus, updatedAt: new Date() })
      .where(eq(customers.id, id));

    const [result] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);

    return res.json(result);
  } catch (error) {
    console.error('Error toggling customer:', error);
    return res.status(500).json({ error: 'Error al cambiar estado del cliente' });
  }
}

/**
 * POST /api/customers/:id/purchase
 * Record a purchase for a customer (updates stats)
 */
export async function recordCustomerPurchase(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { amount, points } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Monto inválido' });
    }

    const [existing] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const customer = existing;
    const earnedPoints = points || Math.floor(amount / 1000); // 1 point per $1000

    await db.update(customers)
      .set({
        totalPurchases: String(Number(customer.totalPurchases) + amount),
        totalSales: customer.totalSales + 1,
        loyaltyPoints: customer.loyaltyPoints + earnedPoints,
        lastPurchase: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id));

    const [result] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);

    return res.json(result);
  } catch (error) {
    console.error('Error recording purchase:', error);
    return res.status(500).json({ error: 'Error al registrar compra' });
  }
}

/**
 * GET /api/customers/:id/debts
 * Get customer debts
 */
export async function getCustomerDebts(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { status } = req.query;

    let whereConditions: any[] = [eq(customerDebts.customerId, id)];

    if (status) {
      whereConditions.push(eq(customerDebts.status, status as string));
    }

    const debts = await db
      .select()
      .from(customerDebts)
      .where(and(...whereConditions))
      .orderBy(desc(customerDebts.createdAt));

    return res.json(debts);
  } catch (error) {
    console.error('Error fetching customer debts:', error);
    return res.status(500).json({ error: 'Error al obtener deudas' });
  }
}

/**
 * POST /api/customers/:id/debts
 * Create a new debt
 */
export async function createCustomerDebt(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { saleId, amount, dueDate, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Monto inválido' });
    }

    // Check customer exists and has credit available
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const availableCredit = Number(customer.creditLimit) - Number(customer.creditUsed);
    if (amount > availableCredit) {
      return res.status(400).json({ 
        error: 'Monto excede el crédito disponible',
        available: availableCredit,
        requested: amount
      });
    }

    const debtId = randomUUID();

    // Create debt
    await db.insert(customerDebts).values({
      id: debtId,
      customerId: id,
      saleId: saleId || null,
      amount: String(amount),
      amountPaid: "0",
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'pending',
      notes: notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [debt] = await db.select().from(customerDebts).where(eq(customerDebts.id, debtId)).limit(1);

    // Update customer credit used
    await db.update(customers)
      .set({ 
        creditUsed: String(Number(customer.creditUsed) + amount),
        updatedAt: new Date()
      })
      .where(eq(customers.id, id));

    return res.status(201).json(debt);
  } catch (error) {
    console.error('Error creating debt:', error);
    return res.status(500).json({ error: 'Error al crear deuda' });
  }
}

/**
 * POST /api/customers/debts/:debtId/payment
 * Record a payment towards a debt
 */
export async function recordDebtPayment(req: Request, res: Response) {
  try {
    const debtId = req.params.debtId as string;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Monto inválido' });
    }

    const [currentDebt] = await db
      .select()
      .from(customerDebts)
      .where(eq(customerDebts.id, debtId))
      .limit(1);

    if (!currentDebt) {
      return res.status(404).json({ error: 'Deuda no encontrada' });
    }

    const remaining = Number(currentDebt.amount) - Number(currentDebt.amountPaid);

    if (amount > remaining) {
      return res.status(400).json({ 
        error: 'El monto excede la deuda restante',
        remaining
      });
    }

    const newAmountPaid = Number(currentDebt.amountPaid) + amount;
    const newStatus = newAmountPaid >= Number(currentDebt.amount) ? 'paid' : 
                      newAmountPaid > 0 ? 'partial' : 'pending';

    // Update debt
    await db.update(customerDebts)
      .set({
        amountPaid: String(newAmountPaid),
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(customerDebts.id, debtId));

    const [updated] = await db.select().from(customerDebts).where(eq(customerDebts.id, debtId)).limit(1);

    // Update customer credit used
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, currentDebt.customerId))
      .limit(1);

    if (customer) {
      await db.update(customers)
        .set({
          creditUsed: String(Math.max(0, Number(customer.creditUsed) - amount)),
          updatedAt: new Date(),
        })
        .where(eq(customers.id, currentDebt.customerId));
    }

    return res.json(updated);
  } catch (error) {
    console.error('Error recording payment:', error);
    return res.status(500).json({ error: 'Error al registrar pago' });
  }
}

/**
 * GET /api/customers/stats
 * Get overall customer statistics
 */
export async function getCustomerStats(req: Request, res: Response) {
  try {
    // Total customers
    const [totalCustomers] = await db
      .select({ count: count() })
      .from(customers)
      .limit(1);

    // Active customers
    const [activeCustomers] = await db
      .select({ count: count() })
      .from(customers)
      .where(eq(customers.active, 1))
      .limit(1);

    // Total credit
    const [creditStats] = await db
      .select({
        totalLimit: sum(customers.creditLimit),
        totalUsed: sum(customers.creditUsed),
      })
      .from(customers)
      .limit(1);

    // Pending debts
    const [pendingDebts] = await db
      .select({
        count: count(),
        total: sum(customerDebts.amount),
        totalPaid: sum(customerDebts.amountPaid),
      })
      .from(customerDebts)
      .where(eq(customerDebts.status, 'pending'))
      .limit(1);

    // Top customers by purchases
    const topCustomers = await db
      .select({
        id: customers.id,
        name: customers.name,
        totalPurchases: customers.totalPurchases,
        totalSales: customers.totalSales,
      })
      .from(customers)
      .orderBy(desc(customers.totalPurchases))
      .limit(10);

    return res.json({
      totalCustomers: Number(totalCustomers?.count) || 0,
      activeCustomers: Number(activeCustomers?.count) || 0,
      credit: {
        totalLimit: Number(creditStats?.totalLimit) || 0,
        totalUsed: Number(creditStats?.totalUsed) || 0,
        available: (Number(creditStats?.totalLimit) || 0) - (Number(creditStats?.totalUsed) || 0),
      },
      debts: {
        count: Number(pendingDebts?.count) || 0,
        total: Number(pendingDebts?.total) || 0,
        paid: Number(pendingDebts?.totalPaid) || 0,
        remaining: (Number(pendingDebts?.total) || 0) - (Number(pendingDebts?.totalPaid) || 0),
      },
      topCustomers,
    });
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    return res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
}
