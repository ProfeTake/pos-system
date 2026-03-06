import { Request, Response } from "express";
import { db } from "../db";
import { cashSessions, sales, cashMovements } from "../db/schema";
import { eq, isNull, desc, and, sql, gte, lte, or } from "drizzle-orm";
import { logAuditAction, AuditActions } from "../middlewares/audit.middleware";

export const getCurrent = async (req: Request, res: Response) => {
  try {
    const [session] = await db
      .select()
      .from(cashSessions)
      .where(isNull(cashSessions.closeTime))
      .orderBy(desc(cashSessions.openTime))
      .limit(1);

    res.json(session || null);
  } catch (error) {
    console.error("Error fetching cash session:", error);
    res.status(500).json({ message: "Error fetching cash session" });
  }
};

export const openSession = async (req: Request, res: Response) => {
  // Frontend sends 'openingAmount', backend uses 'initialCash'
  const { openingAmount, initialCash, windowOpen, windowClose } = req.body;
  const amount = openingAmount ?? initialCash;

  console.log("Opening session with:", {
    openingAmount,
    initialCash,
    amount,
    windowOpen,
    windowClose,
  });

  if (amount === undefined || amount === null) {
    return res
      .status(400)
      .json({ message: "openingAmount/initialCash is required" });
  }

  try {
    // Verificar si ya hay una sesión abierta
    const [existingOpen] = await db
      .select()
      .from(cashSessions)
      .where(isNull(cashSessions.closeTime))
      .limit(1);

    if (existingOpen) {
      // Ya hay sesión abierta — 409 Conflict para que el frontend distinga
      return res.status(409).json({ ...existingOpen, already: true });
    }

    // Obtener la última sesión cerrada para detectar si es nuevo turno
    const [lastClosedSession] = await db
      .select()
      .from(cashSessions)
      .orderBy(desc(cashSessions.closeTime))
      .limit(1);

    // Detectar si es un nuevo turno comparando ventanas operacionales
    let isNewShift = true;
    if (lastClosedSession && lastClosedSession.windowOpen && windowOpen) {
      const lastWindowOpen = new Date(lastClosedSession.windowOpen).getTime();
      const currentWindowOpen = new Date(windowOpen).getTime();
      isNewShift = lastWindowOpen !== currentWindowOpen;
    }

    const [insertResult] = await db
      .insert(cashSessions)
      .values({
        openTime: new Date(),
        initialCash: Number(amount),
        windowOpen: windowOpen ? new Date(windowOpen) : undefined,
        windowClose: windowClose ? new Date(windowClose) : undefined,
      });

    const [newSession] = await db
      .select()
      .from(cashSessions)
      .where(eq(cashSessions.id, insertResult.insertId))
      .limit(1);

    res.status(201).json({ ...newSession, isNewShift });
  } catch (error) {
    console.error("Error opening session:", error);
    res
      .status(500)
      .json({ message: "Error opening session", error: String(error) });
  }
};

export const closeSession = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { finalCash, declaredCash, notes } = req.body;

  try {
    const difference = declaredCash - finalCash;
    await db.update(cashSessions)
      .set({
        closeTime: new Date(),
        finalCash,
        declaredCash,
        difference,
        notes,
      })
      .where(eq(cashSessions.id, Number(id)));

    const [updated] = await db
      .select()
      .from(cashSessions)
      .where(eq(cashSessions.id, Number(id)))
      .limit(1);

    res.json(updated);
  } catch (error) {
    console.error("Error closing session:", error);
    res.status(500).json({ message: "Error closing session" });
  }
};

// Cerrar la sesión activa actual (sin necesidad de pasar ID)
export const closeCurrentSession = async (req: Request, res: Response) => {
  const { closingAmount, finalCash, declaredCash, notes } = req.body;

  try {
    // Buscar sesión abierta
    const [openSession] = await db
      .select()
      .from(cashSessions)
      .where(isNull(cashSessions.closeTime))
      .orderBy(desc(cashSessions.openTime))
      .limit(1);

    if (!openSession) {
      return res.status(404).json({ message: "No hay sesión abierta" });
    }

    const sessionId = openSession.id;

    // Calcular balance real del sistema (server-side)
    const sessionStart =
      openSession.openTime instanceof Date
        ? openSession.openTime
        : new Date(openSession.openTime);
    const now = new Date();

    const [efectivoRow] = await db
      .select({ total: sql<number>`COALESCE(sum(${sales.total}),0)` })
      .from(sales)
      .where(
        and(
          eq(sales.paymentMethod, "efectivo"),
          eq(sales.status, "completed"),
          or(
            eq(sales.cashSessionId, sessionId),
            and(
              isNull(sales.cashSessionId),
              gte(sales.createdAt, sessionStart),
              lte(sales.createdAt, now)
            )
          )
        )
      );
    const [movRow] = await db
      .select({ total: sql<number>`COALESCE(sum(${cashMovements.amount}),0)` })
      .from(cashMovements)
      .where(eq(cashMovements.sessionId, sessionId));

    const efectivoVentas = efectivoRow?.total || 0;
    const movimientosNeto = movRow?.total || 0;
    const systemBalance =
      openSession.initialCash + efectivoVentas + movimientosNeto;

    // El finalCash es el balance calculado por el sistema
    const final = finalCash ?? systemBalance;
    // El declaredCash es lo que el cajero declaró contar físicamente
    // Si no se envía declaredCash, usar closingAmount como fallback de compatibilidad
    const declared = declaredCash ?? closingAmount ?? final;
    const difference = declared - final;

    await db
      .update(cashSessions)
      .set({
        closeTime: new Date(),
        finalCash: final,
        declaredCash: declared,
        difference,
        notes,
      })
      .where(eq(cashSessions.id, sessionId));

    const [updated] = await db
      .select()
      .from(cashSessions)
      .where(eq(cashSessions.id, sessionId))
      .limit(1);

    // Auditar el cierre
    logAuditAction(req, {
      action: AuditActions.CASH_SESSION_CLOSE,
      entity: "cash_session",
      entityId: sessionId,
      details: {
        finalCash: final,
        declaredCash: declared,
        difference,
        efectivoVentas,
        movimientosNeto,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error closing current session:", error);
    res.status(500).json({ message: "Error closing session" });
  }
};

// Get session summary (enriched)
export const getSummary = async (req: Request, res: Response) => {
  try {
    const [session] = await db
      .select()
      .from(cashSessions)
      .where(isNull(cashSessions.closeTime))
      .orderBy(desc(cashSessions.openTime))
      .limit(1);

    if (!session) {
      return res.json({ open: false });
    }

    res.json({
      open: true,
      id: session.id,
      openTime: session.openTime,
      openedAt: session.openTime, // alias for frontend compatibility
      windowOpen: session.windowOpen,
      windowClose: session.windowClose,
      initialCash: session.initialCash,
      openingAmount: session.initialCash, // alias for frontend compatibility
    });
  } catch (error) {
    console.error("Error fetching summary:", error);
    res.status(500).json({ message: "Error fetching summary" });
  }
};

// Get balance
export const getBalance = async (req: Request, res: Response) => {
  try {
    const [s] = await db
      .select()
      .from(cashSessions)
      .where(isNull(cashSessions.closeTime))
      .orderBy(desc(cashSessions.openTime))
      .limit(1);

    if (!s) {
      return res.json({ open: false, balance: 0 });
    }

    const sessionStart =
      s.openTime instanceof Date ? s.openTime : new Date(s.openTime);
    const now = new Date();

    // Ventas en efectivo: preferir FK cashSessionId, fallback a rango de fechas (legacy)
    const [efectivoRow] = await db
      .select({ total: sql<number>`COALESCE(sum(${sales.total}),0)` })
      .from(sales)
      .where(
        and(
          eq(sales.paymentMethod, "efectivo"),
          eq(sales.status, "completed"),
          or(
            eq(sales.cashSessionId, s.id),
            and(
              isNull(sales.cashSessionId),
              gte(sales.createdAt, sessionStart),
              lte(sales.createdAt, now)
            )
          )
        )
      );

    const efectivoVentas = efectivoRow?.total || 0;

    // Movimientos de caja asociados a la sesión — sumar TODOS los tipos.
    // INGRESO tiene amount > 0, EGRESO tiene amount < 0 (normalizado al crear).
    const [movRow] = await db
      .select({ total: sql<number>`COALESCE(sum(${cashMovements.amount}),0)` })
      .from(cashMovements)
      .where(eq(cashMovements.sessionId, s.id));

    const movimientosNeto = movRow?.total || 0;

    // Desglosar ingresos y egresos para el response detallado
    const [ingresosRow] = await db
      .select({ total: sql<number>`COALESCE(sum(${cashMovements.amount}),0)` })
      .from(cashMovements)
      .where(
        and(
          eq(cashMovements.sessionId, s.id),
          eq(cashMovements.type, "INGRESO")
        )
      );
    const [egresosRow] = await db
      .select({
        total: sql<number>`COALESCE(sum(ABS(${cashMovements.amount})),0)`,
      })
      .from(cashMovements)
      .where(
        and(
          eq(cashMovements.sessionId, s.id),
          eq(cashMovements.type, "EGRESO")
        )
      );

    const ingresos = ingresosRow?.total || 0;
    const egresos = egresosRow?.total || 0;

    const balanceCalculado = s.initialCash + efectivoVentas + movimientosNeto;

    res.json({
      open: true,
      sessionId: s.id,
      initialCash: s.initialCash,
      efectivoVentas,
      ingresos,
      egresos,
      balance: balanceCalculado,
    });
  } catch (error) {
    console.error("Error fetching balance:", error);
    res.status(500).json({ message: "Error fetching balance" });
  }
};

// Extend session window (server-controlled, audited)
export const extendSession = async (req: Request, res: Response) => {
  const { reason } = req.body;
  const MAX_EXTEND_MINUTES = 120; // Máximo 2 horas de extensión total
  const EXTEND_STEP_MINUTES = 30; // Cada extensión agrega 30 minutos

  try {
    const [openSess] = await db
      .select()
      .from(cashSessions)
      .where(isNull(cashSessions.closeTime))
      .orderBy(desc(cashSessions.openTime))
      .limit(1);

    if (!openSess) {
      return res.status(404).json({ message: "No hay sesión abierta" });
    }

    // Calcular el nuevo windowClose
    const currentClose = openSess.windowClose
      ? new Date(openSess.windowClose)
      : new Date();
    const newClose = new Date(
      currentClose.getTime() + EXTEND_STEP_MINUTES * 60 * 1000
    );

    // Calcular cuánto se ha extendido ya desde el windowClose original de la ventana operacional
    const originalOpen = openSess.openTime
      ? new Date(openSess.openTime)
      : new Date();
    const maxAllowed = new Date(
      originalOpen.getTime() + (12 + MAX_EXTEND_MINUTES / 60) * 60 * 60 * 1000
    ); // 12h de jornada + 2h extensión máxima

    if (newClose > maxAllowed) {
      return res.status(400).json({
        message: `No se puede extender más allá del límite máximo (${MAX_EXTEND_MINUTES} minutos de extensión)`,
        maxAllowed: maxAllowed.toISOString(),
      });
    }

    await db
      .update(cashSessions)
      .set({ windowClose: newClose })
      .where(eq(cashSessions.id, openSess.id));

    // Auditar la extensión
    logAuditAction(req, {
      action: "cash_session.extend",
      entity: "cash_session",
      entityId: openSess.id,
      details: {
        previousClose: currentClose.toISOString(),
        newClose: newClose.toISOString(),
        extendedMinutes: EXTEND_STEP_MINUTES,
        reason: reason || "Extensión solicitada por operador",
      },
    });

    const [updated] = await db
      .select()
      .from(cashSessions)
      .where(eq(cashSessions.id, openSess.id))
      .limit(1);

    res.json({
      success: true,
      session: updated,
      windowClose: newClose.toISOString(),
      extendedMinutes: EXTEND_STEP_MINUTES,
    });
  } catch (error) {
    console.error("Error extending session:", error);
    res.status(500).json({ message: "Error extending session" });
  }
};
