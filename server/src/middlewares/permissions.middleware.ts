import { Request, Response, NextFunction } from "express";
import { PERMISSIONS, PREDEFINED_ROLES } from "../db/permissions";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email?: string;
    role: string;
    roleId?: number;
    tenantId?: string;
    permissions?: string[];
  };
}

/**
 * Cache de permisos por usuario para evitar consultas repetidas
 */
const permissionsCache = new Map<number, { permissions: string[]; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obtener permisos de un usuario
 */
async function getUserPermissions(userId: number, userRole: string, roleId?: number): Promise<string[]> {
  // Verificar cache
  const cached = permissionsCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.permissions;
  }

  let permissions: string[] = [];

  // Superadmin tiene todos los permisos
  if (userRole === "superadmin") {
    permissions = Object.values(PERMISSIONS);
  }
  // Usar permisos del rol predefinido
  else if (userRole && userRole in PREDEFINED_ROLES) {
    permissions = PREDEFINED_ROLES[userRole as keyof typeof PREDEFINED_ROLES].permissions;
  }
  // Rol legacy "vendedor" = cajero
  else if (userRole === "vendedor") {
    permissions = PREDEFINED_ROLES.cashier.permissions;
  }

  // Guardar en cache
  permissionsCache.set(userId, {
    permissions,
    expiresAt: Date.now() + CACHE_TTL,
  });

  return permissions;
}

/**
 * Middleware para cargar permisos del usuario autenticado
 */
export const loadPermissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next();
  }

  try {
    const permissions = await getUserPermissions(
      req.user.id,
      req.user.role,
      req.user.roleId
    );
    req.user.permissions = permissions;
    next();
  } catch (error) {
    console.error("Error cargando permisos:", error);
    next();
  }
};

/**
 * Middleware para requerir permisos específicos
 * @param requiredPermissions - Permisos requeridos (OR - al menos uno)
 */
export const requirePermission = (...requiredPermissions: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "No autenticado",
        code: "UNAUTHORIZED",
      });
    }

    try {
      // Cargar permisos si no están cargados
      if (!req.user.permissions) {
        req.user.permissions = await getUserPermissions(
          req.user.id,
          req.user.role,
          req.user.roleId
        );
      }

      // Superadmin siempre tiene acceso
      if (req.user.role === "superadmin") {
        return next();
      }

      // Admin full tiene todos los permisos
      if (req.user.permissions.includes(PERMISSIONS.ADMIN_FULL)) {
        return next();
      }

      // Verificar si tiene al menos uno de los permisos requeridos
      const hasPermission = requiredPermissions.some((p) =>
        req.user!.permissions!.includes(p)
      );

      if (!hasPermission) {
        return res.status(403).json({
          error: "No tienes permisos para realizar esta acción",
          code: "FORBIDDEN",
          required: requiredPermissions,
          userPermissions: req.user.permissions,
        });
      }

      next();
    } catch (error) {
      console.error("Error verificando permisos:", error);
      return res.status(500).json({
        error: "Error verificando permisos",
        code: "PERMISSION_ERROR",
      });
    }
  };
};

/**
 * Middleware para requerir TODOS los permisos especificados
 * @param requiredPermissions - Todos los permisos son requeridos (AND)
 */
export const requireAllPermissions = (...requiredPermissions: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "No autenticado",
        code: "UNAUTHORIZED",
      });
    }

    try {
      if (!req.user.permissions) {
        req.user.permissions = await getUserPermissions(
          req.user.id,
          req.user.role,
          req.user.roleId
        );
      }

      // Superadmin siempre tiene acceso
      if (req.user.role === "superadmin") {
        return next();
      }

      // Admin full tiene todos los permisos
      if (req.user.permissions.includes(PERMISSIONS.ADMIN_FULL)) {
        return next();
      }

      // Verificar que tiene TODOS los permisos requeridos
      const hasAllPermissions = requiredPermissions.every((p) =>
        req.user!.permissions!.includes(p)
      );

      if (!hasAllPermissions) {
        const missing = requiredPermissions.filter(
          (p) => !req.user!.permissions!.includes(p)
        );
        return res.status(403).json({
          error: "No tienes todos los permisos requeridos",
          code: "FORBIDDEN",
          required: requiredPermissions,
          missing,
        });
      }

      next();
    } catch (error) {
      console.error("Error verificando permisos:", error);
      return res.status(500).json({
        error: "Error verificando permisos",
        code: "PERMISSION_ERROR",
      });
    }
  };
};

/**
 * Helper para verificar permisos en código (no como middleware)
 */
export function hasPermission(
  userPermissions: string[] | undefined,
  ...requiredPermissions: string[]
): boolean {
  if (!userPermissions) return false;
  return requiredPermissions.some((p) => userPermissions.includes(p));
}

/**
 * Helper para verificar todos los permisos
 */
export function hasAllPermissions(
  userPermissions: string[] | undefined,
  ...requiredPermissions: string[]
): boolean {
  if (!userPermissions) return false;
  return requiredPermissions.every((p) => userPermissions.includes(p));
}

/**
 * Limpiar cache de permisos de un usuario (cuando se actualizan roles)
 */
export function clearPermissionsCache(userId?: number) {
  if (userId) {
    permissionsCache.delete(userId);
  } else {
    permissionsCache.clear();
  }
}

/**
 * Middleware legacy para compatibilidad con código existente
 * Usa el sistema de roles básico
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    // Superadmin siempre tiene acceso
    if (req.user.role === "superadmin") {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "No tienes permisos para esta acción" });
    }

    next();
  };
};

// Re-exportar permisos para uso conveniente
export { PERMISSIONS, PREDEFINED_ROLES };
