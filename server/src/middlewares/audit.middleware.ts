import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { auditLog } from "../db/schema";

export interface AuditAction {
  action: string;
  entity?: string;
  entityId?: string | number;
  details?: Record<string, any>;
}

/**
 * Registra una acción en el audit log (versión básica)
 */
export function logAudit(
  userId: number | null,
  username: string | null,
  action: AuditAction,
  ipAddress?: string
) {
  try {
    db.insert(auditLog).values({
      userId,
      username,
      action: action.action,
      entity: action.entity,
      entityId:
        typeof action.entityId === "string"
          ? parseInt(action.entityId)
          : action.entityId,
      details: action.details,
      ipAddress,
    }).run();
  } catch (error) {
    // Silenciosamente fallar para no interrumpir la operación principal
    console.error("Error logging audit action:", error);
  }
}

/**
 * Registra una acción en el audit log (desde Request)
 */
export function logAuditAction(req: Request, action: AuditAction) {
  const user = (req as any).user;
  const ipAddress =
    req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";

  logAudit(user?.id || null, user?.username || null, action, ipAddress);
}

/**
 * Middleware para registrar automáticamente acciones en ciertas rutas
 */
export function auditMiddleware(actionType: string, entityType?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Guardar respuesta original
    const originalJson = res.json.bind(res);

    // Override res.json para capturar la respuesta
    res.json = function (data: any) {
      // Solo registrar si la respuesta fue exitosa
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = req.params.id || data?.id || req.body?.id;

        logAuditAction(req, {
          action: actionType,
          entity: entityType,
          entityId: entityId ? parseInt(entityId) : undefined,
          details: {
            method: req.method,
            path: req.path,
            body: sanitizeBody(req.body),
          },
        });
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Sanitiza el body para no guardar datos sensibles
 */
function sanitizeBody(body: any): any {
  if (!body) return body;

  const sanitized = { ...body };

  // Remover campos sensibles
  const sensitiveFields = [
    "password",
    "passwordHash",
    "token",
    "secret",
    "apiKey",
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  }

  return sanitized;
}

/**
 * Acciones comunes para auditoría
 */
export const AuditActions = {
  // Auth
  LOGIN: "auth.login",
  LOGOUT: "auth.logout",
  LOGIN_FAILED: "auth.login_failed",

  // Products
  PRODUCT_CREATE: "product.create",
  PRODUCT_UPDATE: "product.update",
  PRODUCT_DELETE: "product.delete",
  PRODUCT_IMPORT: "product.import",

  // Sales
  SALE_CREATE: "sale.create",
  SALE_VOID: "sale.void",
  SALE_REFUND: "sale.refund",

  // Cash Sessions
  CASH_SESSION_OPEN: "cash_session.open",
  CASH_SESSION_CLOSE: "cash_session.close",
  CASH_MOVEMENT: "cash_movement.create",

  // Promotions
  PROMOTION_CREATE: "promotion.create",
  PROMOTION_UPDATE: "promotion.update",
  PROMOTION_DELETE: "promotion.delete",
  PROMOTION_TOGGLE: "promotion.toggle",

  // Settings
  SETTINGS_UPDATE: "settings.update",

  // Users
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",
  USER_DELETE: "user.delete",
};
