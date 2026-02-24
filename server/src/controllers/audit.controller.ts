import { Request, Response } from "express";
import { db } from "../db";
import { auditLog, users } from "../db/schema";
import { desc, eq, and, gte, lte, sql } from "drizzle-orm";

/**
 * GET /api/audit
 * Lista entradas del audit log con filtros
 */
export const getAuditLog = async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "50",
      action,
      entity,
      userId,
      dateFrom,
      dateTo,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const offset = (pageNum - 1) * limitNum;

    // Construir condiciones
    const conditions = [];

    if (action) {
      conditions.push(eq(auditLog.action, action as string));
    }
    if (entity) {
      conditions.push(eq(auditLog.entity, entity as string));
    }
    if (userId) {
      conditions.push(eq(auditLog.userId, parseInt(userId as string)));
    }
    if (dateFrom) {
      const fromTimestamp = Math.floor(
        new Date(dateFrom as string).getTime() / 1000
      );
      conditions.push(gte(auditLog.createdAt, sql`${fromTimestamp}`));
    }
    if (dateTo) {
      const toTimestamp = Math.floor(
        new Date(dateTo as string).getTime() / 1000
      );
      conditions.push(lte(auditLog.createdAt, sql`${toTimestamp}`));
    }

    // Query con filtros
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const entries = await db
      .select()
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.createdAt))
      .limit(limitNum)
      .offset(offset);

    // Count total
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLog)
      .where(where)
      .limit(1);

    const total = countResult?.count || 0;

    res.json({
      entries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching audit log:", error);
    res.status(500).json({ message: "Error fetching audit log" });
  }
};

/**
 * GET /api/audit/actions
 * Lista acciones únicas para filtros
 */
export const getUniqueActions = async (req: Request, res: Response) => {
  try {
    const actions = await db
      .selectDistinct({ action: auditLog.action })
      .from(auditLog);

    res.json(actions.map((a) => a.action));
  } catch (error) {
    console.error("Error fetching unique actions:", error);
    res.status(500).json({ message: "Error fetching actions" });
  }
};

/**
 * GET /api/audit/entities
 * Lista entidades únicas para filtros
 */
export const getUniqueEntities = async (req: Request, res: Response) => {
  try {
    const entities = await db
      .selectDistinct({ entity: auditLog.entity })
      .from(auditLog);

    res.json(entities.map((e) => e.entity).filter(Boolean));
  } catch (error) {
    console.error("Error fetching unique entities:", error);
    res.status(500).json({ message: "Error fetching entities" });
  }
};

/**
 * GET /api/audit/stats
 * Estadísticas del audit log
 */
export const getAuditStats = async (req: Request, res: Response) => {
  try {
    const { days = "7" } = req.query;
    const daysNum = parseInt(days as string);
    const startTimestamp = Math.floor(
      (Date.now() - daysNum * 24 * 60 * 60 * 1000) / 1000
    );

    // Acciones por tipo
    const byAction = await db
      .select({
        action: auditLog.action,
        count: sql<number>`count(*)`,
      })
      .from(auditLog)
      .where(gte(auditLog.createdAt, sql`${startTimestamp}`))
      .groupBy(auditLog.action)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Actividad por usuario (join con users ya que username fue removido de audit_log)
    const byUser = await db
      .select({
        username: users.username,
        count: sql<number>`count(*)`,
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.userId, users.id))
      .where(gte(auditLog.createdAt, sql`${startTimestamp}`))
      .groupBy(users.username)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Total de entradas
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLog)
      .where(gte(auditLog.createdAt, sql`${startTimestamp}`))
      .limit(1);

    res.json({
      period: `${daysNum} días`,
      total: totalResult?.count || 0,
      byAction,
      byUser,
    });
  } catch (error) {
    console.error("Error fetching audit stats:", error);
    res.status(500).json({ message: "Error fetching audit stats" });
  }
};
