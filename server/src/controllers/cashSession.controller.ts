import { Request, Response } from "express";
import { db } from "../db";
import { cashSessions, sales, cashMovements } from "../db/schema";
import { eq, isNull, desc, and, sql, gte, lte } from "drizzle-orm";

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
      // Ya hay sesión abierta, devolver esa
      return res.status(200).json({ ...existingOpen, already: true });
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
    const final = finalCash ?? closingAmount ?? 0;
    const declared = declaredCash ?? closingAmount ?? 0;
    const difference = declared - final;

    await db.update(cashSessions)
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

    res.json(updated);
  } catch (error) {
    console.error("Error closing current session:", error);
    res.status(500).json({ message: "Error closing session" });
  }
};

// Get session summary
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
      windowClose: session.windowClose,
      initialCash: session.initialCash,
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

    const sessionStartTs =
      s.openTime instanceof Date
        ? Math.floor(s.openTime.getTime() / 1000)
        : s.openTime;
    const nowTs = Math.floor(Date.now() / 1000);

    // Ventas en efectivo dentro de la ventana de la sesión
    const [efectivoRow] = await db
      .select({ total: sql<number>`COALESCE(sum(${sales.total}),0)` })
      .from(sales)
      .where(
        and(
          eq(sales.paymentMethod, "efectivo"),
          sql`${sales.createdAt} >= ${sessionStartTs}`,
          sql`${sales.createdAt} <= ${nowTs}`
        )
      );

    const efectivoVentas = efectivoRow?.total || 0;

    // Movimientos de caja (ingresos / egresos) asociados a la sesión
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
      .select({ total: sql<number>`COALESCE(sum(${cashMovements.amount}),0)` })
      .from(cashMovements)
      .where(
        and(eq(cashMovements.sessionId, s.id), eq(cashMovements.type, "EGRESO"))
      );

    const ingresos = ingresosRow?.total || 0;
    const egresos = egresosRow?.total || 0;

    const balanceCalculado =
      s.initialCash + efectivoVentas + ingresos - egresos;

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

// Add movement
export const addMovement = async (req: Request, res: Response) => {
  // This endpoint is handled by cash movements controller
  res.status(404).json({ message: "Use /api/cash-movements instead" });
};
