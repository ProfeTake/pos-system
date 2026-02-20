import { Request, Response, NextFunction } from "express";

export interface TenantRequest extends Request {
  tenantId?: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    settings: any;
  };
}

/**
 * Middleware para extraer y validar el tenant del request
 * El tenant se puede especificar de las siguientes formas:
 * 1. Header X-Tenant-ID
 * 2. Header X-Tenant-Slug
 * 3. Desde el usuario autenticado (req.user.tenantId)
 * 4. Subdominio (para implementación futura)
 */
export const tenantMiddleware = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const isSingleTenant =
      process.env.SINGLE_TENANT === "true" ||
      process.env.TENANT_MODE === "single";

    // Modo single-tenant: no exige headers/subdominio y no depende de la tabla tenants.
    if (isSingleTenant) {
      const defaultTenantId = process.env.DEFAULT_TENANT_ID || "default";
      req.tenantId = defaultTenantId;
      req.tenant = {
        id: defaultTenantId,
        name: process.env.TENANT_NAME || "Mi Botillería",
        slug: process.env.TENANT_SLUG || defaultTenantId,
        settings: null,
      };
      return next();
    }

    // Intentar obtener tenant ID de diferentes fuentes
    let tenantId = 
      req.headers["x-tenant-id"] as string ||
      (req as any).user?.tenantId;

    const tenantSlug = req.headers["x-tenant-slug"] as string;

    // Multi-tenant mode: validar tenant desde headers
    // Nota: la tabla "tenants" aún no está implementada.
    // Por ahora, en modo multi-tenant solo se asigna el tenantId del header.
    if (!tenantId && tenantSlug) {
      // Cuando se implemente multi-tenant, buscar por slug en la tabla tenants
      return res.status(400).json({
        error: "Multi-tenant mode no implementado aún. Use SINGLE_TENANT=true",
        code: "MULTI_TENANT_NOT_IMPLEMENTED",
      });
    }

    if (tenantId) {
      req.tenant = {
        id: tenantId,
        name: tenantId,
        slug: tenantId,
        settings: null,
      };
      req.tenantId = tenantId;
    }

    // Para rutas que requieren tenant obligatorio, verificar más adelante
    // con requireTenant middleware

    next();
  } catch (error) {
    console.error("Error en tenant middleware:", error);
    return res.status(500).json({
      error: "Error al procesar tenant",
      code: "TENANT_ERROR",
    });
  }
};

/**
 * Middleware que requiere tenant obligatorio
 * Usar después de tenantMiddleware en rutas que necesitan tenant
 */
export const requireTenant = (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  const isSingleTenant =
    process.env.SINGLE_TENANT === "true" ||
    process.env.TENANT_MODE === "single";

  if (isSingleTenant) {
    // tenantMiddleware ya setea tenantId en modo single.
    return next();
  }

  if (!req.tenantId) {
    return res.status(400).json({
      error: "Tenant ID requerido",
      code: "TENANT_REQUIRED",
      message: "Debe especificar un tenant mediante header X-Tenant-ID o autenticarse con un usuario vinculado a un tenant",
    });
  }

  next();
};

/**
 * Helper para agregar filtro de tenant a queries
 */
export function withTenant<T extends { tenantId?: string | null }>(
  tenantId: string
): { tenantId: string } {
  return { tenantId };
}

/**
 * Helper para verificar que un recurso pertenece al tenant
 */
export function belongsToTenant(
  resource: { tenantId?: string | null },
  tenantId: string
): boolean {
  return resource.tenantId === tenantId;
}

/**
 * Middleware para superadmin - puede acceder a cualquier tenant
 */
export const superadminBypassTenant = (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  const user = (req as any).user;
  
  // Superadmin puede especificar cualquier tenant
  if (user?.role === "superadmin") {
    // Si especifica un tenant, usarlo
    if (req.headers["x-tenant-id"]) {
      req.tenantId = req.headers["x-tenant-id"] as string;
    }
    // Si no, permitir acceso sin tenant (para operaciones globales)
    return next();
  }

  // Para usuarios normales, continuar con validación normal
  next();
};
