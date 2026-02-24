import { Request, Response } from "express";
import { db } from "../db";
import { settings, cashSessions } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export const getSettings = async (req: Request, res: Response) => {
    try {
        const allSettings = await db.select().from(settings);
        // Transform to object
        const settingsObj = allSettings.reduce((acc: any, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        res.json(settingsObj);
    } catch (error) {
        res.status(500).json({ message: "Error fetching settings" });
    }
};

export const updateSetting = async (req: Request, res: Response) => {
    const key = String(req.params.key);
    const { value } = req.body;
    try {
        await db
            .insert(settings)
            .values({ key, value })
            .onDuplicateKeyUpdate({
                set: { value, updatedAt: new Date() },
            });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Error updating setting" });
    }
};

export const getCashSession = async (req: Request, res: Response) => {
    try {
        const session = await db.query.cashSessions.findFirst({
            where: (sessions, { isNull }) => isNull(sessions.closeTime),
            orderBy: [desc(cashSessions.openTime)],
        });
        res.json(session || null);
    } catch (error) {
        res.status(500).json({ message: "Error fetching cash session" });
    }
};

export const recalculateWindow = async (req: Request, res: Response) => {
    try {
        const mode = req.query.mode || "current"; // "current" o "next"
        
        // Buscar sesión activa (sin closeTime)
        const activeSession = await db.query.cashSessions.findFirst({
            where: (sessions, { isNull }) => isNull(sessions.closeTime),
            orderBy: [desc(cashSessions.openTime)],
        });

        if (!activeSession) {
            return res.status(404).json({ message: "No hay sesión de caja activa" });
        }

        // Obtener configuración de horarios
        const settingsResult = await db.select().from(settings);
        const settingsMap = settingsResult.reduce((acc: any, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        // Calcular nueva ventana de cierre
        const now = new Date();
        let newWindowClose: Date;

        // Intentar usar businessHoursV2 si existe
        const v2 = settingsMap.businessHoursV2;
        if (v2?.week) {
            const dayOfWeek = now.getDay();
            const todayConfig = v2.week[String(dayOfWeek)];
            
            if (todayConfig?.closeTime) {
                const [closeH, closeM] = todayConfig.closeTime.split(":").map(Number);
                newWindowClose = new Date(now);
                newWindowClose.setHours(closeH, closeM, 0, 0);
                
                // Si la hora de cierre ya pasó y es para el turno "current", 
                // el cierre es al día siguiente
                if (newWindowClose <= now && mode === "current") {
                    newWindowClose.setDate(newWindowClose.getDate() + 1);
                }
            } else {
                // Fallback: cierre a las 01:30 del día siguiente
                newWindowClose = new Date(now);
                newWindowClose.setDate(newWindowClose.getDate() + 1);
                newWindowClose.setHours(1, 30, 0, 0);
            }
        } else {
            // Fallback legacy: usar businessHours
            const legacy = settingsMap.businessHours || {};
            const dayOfWeek = now.getDay();
            const closeMinutes = legacy.closeMinutesByWeekday?.[String(dayOfWeek)] ?? 90;
            
            // Los minutos son desde medianoche del día siguiente
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            newWindowClose = new Date(tomorrow.getTime() + closeMinutes * 60 * 1000);
        }

        // Actualizar la sesión con la nueva ventana de cierre
        await db
            .update(cashSessions)
            .set({ windowClose: newWindowClose })
            .where(eq(cashSessions.id, activeSession.id));

        // Obtener la sesión actualizada
        const updatedSession = await db.query.cashSessions.findFirst({
            where: eq(cashSessions.id, activeSession.id),
        });

        res.json({ 
            success: true, 
            windowClose: newWindowClose.toISOString(),
            session: updatedSession 
        });
    } catch (error) {
        console.error("Error recalculating window:", error);
        res.status(500).json({ message: "Error recalculating window" });
    }
};

/**
 * Detecta si estamos en un nuevo turno respecto a la sesión actual.
 * Compara la ventana operacional de la sesión actual con la ventana operacional del momento actual.
 */
export const checkShiftChange = async (req: Request, res: Response) => {
    try {
        // Buscar sesión activa (sin closeTime)
        const activeSession = await db.query.cashSessions.findFirst({
            where: (sessions, { isNull }) => isNull(sessions.closeTime),
            orderBy: [desc(cashSessions.openTime)],
        });

        // Obtener configuración de horarios
        const settingsResult = await db.select().from(settings);
        const settingsMap = settingsResult.reduce((acc: any, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        const now = new Date();
        
        // Calcular ventana operacional actual
        const currentWindow = calculateOperationalWindow(now, settingsMap);
        
        // Si no hay sesión activa, siempre es nuevo turno
        if (!activeSession) {
            return res.json({
                isNewShift: true,
                hasActiveSession: false,
                currentWindow: {
                    open: currentWindow.open.toISOString(),
                    close: currentWindow.close.toISOString(),
                },
                reason: "No hay sesión activa",
            });
        }

        const sessionOpenTime = new Date(activeSession.openTime);
        const sessionWindowClose = activeSession.windowClose 
            ? new Date(activeSession.windowClose) 
            : null;

        // Calcular ventana operacional de cuando se abrió la sesión
        const sessionWindow = calculateOperationalWindow(sessionOpenTime, settingsMap);

        // Comparar ventanas por su hora de apertura
        const sameShift = currentWindow.open.getTime() === sessionWindow.open.getTime();
        
        // También verificar si hemos pasado el cierre programado
        const pastScheduledClose = sessionWindowClose && now > sessionWindowClose;

        const isNewShift = !sameShift || (pastScheduledClose && now >= currentWindow.open);

        res.json({
            isNewShift,
            hasActiveSession: true,
            sessionId: activeSession.id,
            sessionOpenTime: sessionOpenTime.toISOString(),
            sessionWindowClose: sessionWindowClose?.toISOString() || null,
            currentWindow: {
                open: currentWindow.open.toISOString(),
                close: currentWindow.close.toISOString(),
            },
            previousWindow: {
                open: sessionWindow.open.toISOString(),
                close: sessionWindow.close.toISOString(),
            },
            pastScheduledClose,
            reason: isNewShift 
                ? pastScheduledClose 
                    ? "El turno programado ha terminado"
                    : "Ha comenzado un nuevo turno operativo"
                : "Mismo turno operativo",
        });
    } catch (error) {
        console.error("Error checking shift change:", error);
        res.status(500).json({ message: "Error checking shift change" });
    }
};

/**
 * Helper para calcular la ventana operacional basada en configuración
 */
function calculateOperationalWindow(
    baseDate: Date, 
    settingsMap: any
): { open: Date; close: Date } {
    const baseDay = new Date(baseDate);
    baseDay.setHours(0, 0, 0, 0);
    const dayOfWeek = baseDay.getDay();

    // Intentar usar businessHoursV2
    const v2 = settingsMap.businessHoursV2;
    if (v2?.week) {
        const todayConfig = v2.week[String(dayOfWeek)];
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
        
        // Valores por defecto
        const defaultOpen = "12:00";
        const defaultClose = isWeekend ? "03:15" : "01:00";
        const defaultCloseNextDay = true;

        const openTime = todayConfig?.openTime || defaultOpen;
        const closeTime = todayConfig?.closeTime || defaultClose;
        const closeNextDay = todayConfig?.closeNextDay ?? defaultCloseNextDay;

        const [openH, openM] = openTime.split(":").map(Number);
        const [closeH, closeM] = closeTime.split(":").map(Number);

        const open = new Date(baseDay);
        open.setHours(openH, openM, 0, 0);

        const close = new Date(baseDay);
        if (closeNextDay) {
            close.setDate(close.getDate() + 1);
        }
        close.setHours(closeH, closeM, 0, 0);

        return { open, close };
    }

    // Fallback legacy
    const legacy = settingsMap.businessHours || {};
    const openingHour = legacy.openingHour ?? 12;
    const openingMinute = legacy.openingMinute ?? 0;
    const closeMinutes = legacy.closeMinutesByWeekday?.[String(dayOfWeek)] ?? 90;

    const open = new Date(baseDay);
    open.setHours(openingHour, openingMinute, 0, 0);

    const close = new Date(baseDay);
    close.setDate(close.getDate() + 1); // Siempre al día siguiente en legacy
    close.setHours(Math.floor(closeMinutes / 60), closeMinutes % 60, 0, 0);

    return { open, close };
}