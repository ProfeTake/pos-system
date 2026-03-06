import { Request, Response } from "express";
import { db } from "../db";
import { cashMovements, cashSessions } from "../db/schema";
import { eq, isNull, desc } from "drizzle-orm";
import { toDBType, normalizeAmount } from "../utils/cashTypes";

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
    const { sessionId, type, amount, reason, description, paymentMethod } = req.body;

    // Mapear tipo del frontend al enum de DB y normalizar monto
    const dbType = toDBType(type);
    const normalizedAmount = normalizeAmount(Number(amount), type);
    const movementReason = reason || description || type;

    try {
        // Si no se proporcionó sessionId, buscar sesión abierta
        let effectiveSessionId = sessionId;
        if (!effectiveSessionId) {
            const [openSession] = await db
                .select()
                .from(cashSessions)
                .where(isNull(cashSessions.closeTime))
                .orderBy(desc(cashSessions.openTime))
                .limit(1);
            if (!openSession) {
                return res.status(400).json({ message: "No hay sesión de caja abierta" });
            }
            effectiveSessionId = openSession.id;
        }

        const [result] = await db
            .insert(cashMovements)
            .values({
                sessionId: effectiveSessionId,
                type: dbType,
                amount: normalizedAmount,
                reason: movementReason,
            });

        const [newMovement] = await db
            .select()
            .from(cashMovements)
            .where(eq(cashMovements.id, result.insertId))
            .limit(1);

        // Return with the original frontend type for UI compatibility
        res.status(201).json({
            movement: {
                ...newMovement,
                type: type, // Preserve frontend type for display
                paymentMethod: paymentMethod || "cash",
                description: description || reason,
            },
        });
    } catch (error) {
        console.error("Error creating movement:", error);
        res.status(500).json({ message: "Error creating movement" });
    }
};
