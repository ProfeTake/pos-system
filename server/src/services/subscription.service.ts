/**
 * Servicio para validar límites del plan de suscripción.
 * NOTA: Las tablas SaaS no existen aún en MySQL. Todas las funciones
 * devuelven "ilimitado" / "permitido" por defecto.
 */

export interface PlanLimits {
  maxProducts: number | null;
  maxUsers: number | null;
  maxSalesPerMonth: number | null;
  maxStorageGB: number | null;
  features: string[];
}

export interface CurrentUsage {
  totalProducts: number;
  totalUsers: number;
  salesThisMonth: number;
  storageUsedMB: number;
}

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  current?: number;
  limit?: number | null;
}

/**
 * Sin tablas SaaS → retorna null (sin límites).
 */
export async function getTenantPlanLimits(
  _tenantSlug: string
): Promise<PlanLimits | null> {
  return null;
}

/**
 * Sin tablas SaaS → retorna ceros.
 */
export async function getTenantCurrentUsage(
  _tenantSlug: string
): Promise<CurrentUsage> {
  return {
    totalProducts: 0,
    totalUsers: 0,
    salesThisMonth: 0,
    storageUsedMB: 0,
  };
}

/** Siempre permitido (sin restricciones). */
export async function canCreateProduct(
  _tenantSlug: string
): Promise<LimitCheckResult> {
  return { allowed: true };
}

/** Siempre permitido (sin restricciones). */
export async function canCreateUser(
  _tenantSlug: string
): Promise<LimitCheckResult> {
  return { allowed: true };
}

/** Siempre permitido (sin restricciones). */
export async function canCreateSale(
  _tenantSlug: string
): Promise<LimitCheckResult> {
  return { allowed: true };
}

/** Sin tablas SaaS → todas las features están habilitadas. */
export async function hasFeature(
  _tenantSlug: string,
  _featureName: string
): Promise<boolean> {
  return true;
}

/** Retorna null (sin plan activo). */
export async function getPlanInfo(_tenantSlug: string) {
  return null;
}
