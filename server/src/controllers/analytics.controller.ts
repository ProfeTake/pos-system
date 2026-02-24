import { Request, Response } from "express";
import { db } from "../db";
import { sales, saleItems, products } from "../db/schema";
import { eq, sql, desc, and, gte, lte, isNull, ne } from "drizzle-orm";

// Helper para calcular fechas según período
function getPeriodDates(period: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case "today":
      // Ya está configurado
      break;
    case "week":
      start.setDate(start.getDate() - 7);
      break;
    case "month":
      start.setMonth(start.getMonth() - 1);
      break;
    case "year":
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setDate(start.getDate() - 7);
  }

  return { start, end };
}

// Helper para período anterior (para comparaciones)
function getPreviousPeriodDates(period: string): { start: Date; end: Date } {
  const current = getPeriodDates(period);
  const duration = current.end.getTime() - current.start.getTime();

  return {
    start: new Date(current.start.getTime() - duration),
    end: new Date(current.start.getTime() - 1),
  };
}

/**
 * GET /api/analytics/metrics
 * Métricas principales del período
 */
export const getMetrics = async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || "week";
    const { start, end } = getPeriodDates(period);

    // Ventas del período
    const [salesData] = await db
      .select({
        count: sql<number>`count(*)`,
        total: sql<number>`coalesce(sum(${sales.total}), 0)`,
      })
      .from(sales)
      .where(sql`created_at >= ${start} AND created_at <= ${end}`);

    // Productos vendidos
    const [itemsSold] = await db
      .select({
        total: sql<number>`coalesce(sum(${saleItems.quantity}), 0)`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(sql`sales.created_at >= ${start} AND sales.created_at <= ${end}`);

    // Top productos por cantidad vendida
    const topProductsRaw = await db
      .select({
        id: saleItems.productId,
        name: saleItems.productName,
        quantity: sql<number>`sum(${saleItems.quantity})`,
        revenue: sql<number>`sum(${saleItems.subtotal})`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(sql`sales.created_at >= ${start} AND sales.created_at <= ${end}`)
      .groupBy(saleItems.productId, saleItems.productName)
      .orderBy(desc(sql`sum(${saleItems.quantity})`))
      .limit(10);

    const topProducts = topProductsRaw.map((p) => ({
      id: p.id,
      name: p.name,
      totalQuantity: p.quantity,
      totalRevenue: p.revenue,
    }));

    // Ventas por categoría
    const categoryStatsRaw = await db
      .select({
        category: products.category,
        quantity: sql<number>`sum(${saleItems.quantity})`,
        revenue: sql<number>`sum(${saleItems.subtotal})`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(sql`sales.created_at >= ${start} AND sales.created_at <= ${end}`)
      .groupBy(products.category)
      .orderBy(desc(sql`sum(${saleItems.subtotal})`));

    const categoryStats = categoryStatsRaw.map((c) => ({
      category: c.category,
      totalQuantity: c.quantity,
      totalRevenue: c.revenue,
    }));

    // Ventas por método de pago
    const paymentMethods = await db
      .select({
        paymentMethod: sales.paymentMethod,
        count: sql<number>`count(*)`,
        total: sql<number>`sum(${sales.total})`,
      })
      .from(sales)
      .where(sql`created_at >= ${start} AND created_at <= ${end}`)
      .groupBy(sales.paymentMethod);

    // Productos estancados (con stock pero sin ventas en 30 días)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const allProducts = await db
      .select()
      .from(products)
      .where(
        and(ne(products.estado, "DESHABILITADO"), sql`${products.stock} > 0`)
      );

    const recentlySoldIds = await db
      .select({ productId: saleItems.productId })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(sql`sales.created_at >= ${thirtyDaysAgo}`)
      .groupBy(saleItems.productId);

    const soldIdsSet = new Set(recentlySoldIds.map((r) => r.productId));
    const stagnantProducts = allProducts
      .filter((p) => !soldIdsSet.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        stock: p.stock,
        inventoryValue: p.stock * p.price,
      }))
      .sort((a, b) => b.inventoryValue - a.inventoryValue)
      .slice(0, 10);

    // Top productos por margen (necesita costo)
    const topMarginRaw = await db
      .select({
        id: products.id,
        name: products.name,
        quantity: sql<number>`sum(${saleItems.quantity})`,
        revenue: sql<number>`sum(${saleItems.subtotal})`,
        profit: sql<number>`sum((${saleItems.price} - ${products.cost}) * ${saleItems.quantity})`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(sql`sales.created_at >= ${start} AND sales.created_at <= ${end}`)
      .groupBy(products.id, products.name)
      .orderBy(
        desc(
          sql`sum((${saleItems.price} - ${products.cost}) * ${saleItems.quantity})`
        )
      )
      .limit(10);

    const topMargin = topMarginRaw.map((p) => ({
      id: p.id,
      name: p.name,
      totalQuantity: p.quantity,
      totalRevenue: p.revenue,
      totalProfit: p.profit,
    }));

    const totalSales = salesData?.count || 0;
    const totalRevenue = salesData?.total || 0;

    res.json({
      sales: {
        totalSales,
        totalRevenue,
        avgTicket: totalSales > 0 ? totalRevenue / totalSales : 0,
        itemsSold: itemsSold?.total || 0,
      },
      topProducts,
      topMargin,
      categoryStats,
      paymentMethods,
      stagnantProducts,
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    res.status(500).json({ message: "Error fetching metrics" });
  }
};

/**
 * GET /api/analytics/sales-trend
 * Tendencia de ventas por día
 */
export const getSalesTrend = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    // Incluir el día actual. Si days=1 -> solo hoy.
    // (Antes: restaba days y generaba días-1 puntos terminando en ayer.)
    startDate.setDate(startDate.getDate() - Math.max(days - 1, 0));
    startDate.setHours(0, 0, 0, 0);

    // Agrupar ventas por día
    const trend = await db
      .select({
        date: sql<string>`DATE(created_at)`,
        count: sql<number>`count(*)`,
        total: sql<number>`sum(${sales.total})`,
      })
      .from(sales)
      .where(sql`created_at >= ${startDate}`)
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    // Llenar días sin ventas con ceros
    const trendMap = new Map(trend.map((t) => [t.date, t]));
    const filledTrend = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      // Usar fecha local Chile (no UTC) para que las etiquetas coincidan
      // con el agrupamiento de MySQL DATE(created_at)
      const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

      const existing = trendMap.get(dateStr);
      const salesCount = existing?.count || 0;
      const revenue = existing?.total || 0;
      filledTrend.push({
        date: dateStr,
        salesCount: salesCount,
        revenue: revenue,
        avgTicket: salesCount > 0 ? revenue / salesCount : 0,
      });
    }

    res.json({ trend: filledTrend });
  } catch (error) {
    console.error("Error fetching sales trend:", error);
    res.status(500).json({ message: "Error fetching sales trend" });
  }
};

/**
 * GET /api/analytics/sales-by-hour
 * Distribución de ventas por hora del día
 */
export const getSalesByHour = async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || "week";
    const { start, end } = getPeriodDates(period);

    // MySQL HOUR() extrae la hora directamente del TIMESTAMP
    const hourlyStats = await db
      .select({
        hour: sql<number>`HOUR(created_at)`,
        count: sql<number>`count(*)`,
        total: sql<number>`sum(${sales.total})`,
      })
      .from(sales)
      .where(sql`created_at >= ${start} AND created_at <= ${end}`)
      .groupBy(sql`HOUR(created_at)`)
      .orderBy(
        sql`HOUR(created_at)`
      );

    // Llenar todas las horas (0-23)
    const hourMap = new Map(hourlyStats.map((h) => [h.hour, h]));
    const fullHourlyStats = [];

    for (let hour = 0; hour < 24; hour++) {
      const existing = hourMap.get(hour);
      fullHourlyStats.push({
        hour,
        salesCount: existing?.count || 0,
        revenue: existing?.total || 0,
      });
    }

    res.json({ hourlyStats: fullHourlyStats });
  } catch (error) {
    console.error("Error fetching sales by hour:", error);
    res.status(500).json({ message: "Error fetching sales by hour" });
  }
};

/**
 * GET /api/analytics/period-comparison
 * Comparación con período anterior
 */
export const getPeriodComparison = async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || "week";
    const current = getPeriodDates(period);
    const previous = getPreviousPeriodDates(period);

    // Métricas período actual
    const [currentData] = await db
      .select({
        count: sql<number>`count(*)`,
        total: sql<number>`coalesce(sum(${sales.total}), 0)`,
      })
      .from(sales)
      .where(sql`created_at >= ${current.start} AND created_at <= ${current.end}`);

    // Métricas período anterior
    const [previousData] = await db
      .select({
        count: sql<number>`count(*)`,
        total: sql<number>`coalesce(sum(${sales.total}), 0)`,
      })
      .from(sales)
      .where(sql`created_at >= ${previous.start} AND created_at <= ${previous.end}`);

    const currentCount = currentData?.count || 0;
    const currentTotal = currentData?.total || 0;
    const previousCount = previousData?.count || 0;
    const previousTotal = previousData?.total || 0;

    const currentAvg = currentCount > 0 ? currentTotal / currentCount : 0;
    const previousAvg = previousCount > 0 ? previousTotal / previousCount : 0;

    // Calcular cambios porcentuales
    const calcChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    res.json({
      comparison: {
        current: {
          salesCount: currentCount,
          revenue: currentTotal,
          avgTicket: currentAvg,
        },
        previous: {
          salesCount: previousCount,
          revenue: previousTotal,
          avgTicket: previousAvg,
        },
        changes: {
          salesCount: calcChange(currentCount, previousCount),
          revenue: calcChange(currentTotal, previousTotal),
          avgTicket: calcChange(currentAvg, previousAvg),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching period comparison:", error);
    res.status(500).json({ message: "Error fetching period comparison" });
  }
};

/**
 * GET /api/analytics/restock-predictions
 * Predicción de reabastecimiento basada en ventas recientes
 */
export const getRestockPredictions = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Obtener ventas por producto en el período
    const salesByProduct = await db
      .select({
        productId: saleItems.productId,
        totalSold: sql<number>`sum(${saleItems.quantity})`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(sql`sales.created_at >= ${startDate}`)
      .groupBy(saleItems.productId);

    const salesMap = new Map(
      salesByProduct.map((s) => [s.productId, s.totalSold])
    );

    // Obtener todos los productos activos
    const allProducts = await db
      .select()
      .from(products)
      .where(ne(products.estado, "DESHABILITADO"));

    // Calcular predicciones
    const predictions = allProducts
      .map((p) => {
        const totalSold = salesMap.get(p.id) || 0;
        const avgDailySales = totalSold / days;

        // Días hasta llegar al mínimo
        const daysUntilReorder =
          avgDailySales > 0
            ? Math.floor((p.stock - p.minStock) / avgDailySales)
            : Infinity;

        // Días hasta agotar
        const daysUntilEmpty =
          avgDailySales > 0 ? Math.floor(p.stock / avgDailySales) : Infinity;

        return {
          id: p.id,
          name: p.name,
          category: p.category,
          stock: p.stock,
          minStock: p.minStock,
          avgDailySales,
          daysUntilReorder:
            daysUntilReorder === Infinity ? null : daysUntilReorder,
          daysUntilEmpty: daysUntilEmpty === Infinity ? null : daysUntilEmpty,
        };
      })
      .filter(
        (p) =>
          p.avgDailySales > 0 &&
          p.daysUntilReorder !== null &&
          p.daysUntilReorder <= 14
      )
      .sort(
        (a, b) => (a.daysUntilReorder || 999) - (b.daysUntilReorder || 999)
      );

    res.json({ predictions });
  } catch (error) {
    console.error("Error fetching restock predictions:", error);
    res.status(500).json({ message: "Error fetching restock predictions" });
  }
};
