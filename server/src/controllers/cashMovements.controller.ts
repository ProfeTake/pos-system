import { Request, Response } from "express";
import { db } from "../db";
import { cashMovements, cashSessions } from "../db/schema";
import { eq, isNull, desc } from "drizzle-orm";

/**
 * GET /api/cash-movements/current
 * Obtiene los movimientos de la sesión de caja activa (abierta)
 */
export const getCurrentMovements = async (req: Request, res: Response) => {
    try {
        // Buscar sesión abierta
        const [openSession] = await db
            .select()
            .from(cashSessions)
            .where(isNull(cashSessions.closeTime))
            .orderBy(desc(cashSessions.openTime))
            .limit(1);

        if (!openSession) {
            return res.json([]);
        }

        const movements = await db
            .select()
            .from(cashMovements)
            .where(eq(cashMovements.sessionId, openSession.id));

        res.json(movements);
    } catch (error) {
        console.error("Error fetching current movements:", error);
        res.status(500).json({ message: "Error fetching current movements" });
    }
};

export const getBySession = async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    try {
        const movements = await db
            .select()
            .from(cashMovements)
            .where(eq(cashMovements.sessionId, Number(sessionId)));

        res.json(movements);
    } catch (error) {
        console.error("Error fetching movements:", error);
        res.status(500).json({ message: "Error fetching movements" });
    }
};

export const create = async (req: Request, res: Response) => {
    const { sessionId, type, amount, reason } = req.body;
    try {
        const [result] = await db
            .insert(cashMovements)
            .values({
                sessionId,
                type,
                amount,
                reason,
            });

        const [newMovement] = await db
            .select()
            .from(cashMovements)
            .where(eq(cashMovements.id, result.insertId))
            .limit(1);

        res.status(201).json(newMovement);
    } catch (error) {
        console.error("Error creating movement:", error);
        res.status(500).json({ message: "Error creating movement" });
    }
};
