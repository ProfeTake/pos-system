/**
 * SuperAdmin Service
 * Cliente API para las operaciones del panel de superadministrador
 */

import { apiFetchJSON } from "../lib/api";

// Tipos
export interface Tenant {
  id: number;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  status: "active" | "suspended" | "cancelled" | "trial";
  city: string | null;
  region: string | null;
  createdAt: string | null;
  trialEndsAt: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  internalNotes: string | null;
  subscription?: {
    planName: string;
    status: string;
    nextBillingDate: string | null;
  };
  metrics?: {
    totalSales: number;
    totalRevenue: number;
    totalProducts: number;
    activeUsers: number;
  };
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  code: string;
  priceMonthly: number;
  priceYearly: number | null;
  maxProducts: number | null;
  maxUsers: number | null;
  features: string[];
  active: boolean;
}

export interface TenantsResponse {
  tenants: Tenant[];
  total: number;
  page: number;
  totalPages: number;
}

export interface DashboardResponse {
  summary: {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    trialTenants: number;
    mrr: number;
    totalRevenue: number;
    totalSales: number;
  };
  planDistribution: Array<{
    plan: string;
    count: number;
    revenue: number;
  }>;
  needsAttention: Tenant[];
  recentActivity: Array<{
    date: string;
    action: string;
    tenant: string;
  }>;
}

const BASE_URL = "/api/superadmin";

/**
 * Obtener dashboard con métricas globales
 */
export async function getDashboard(): Promise<DashboardResponse> {
  return apiFetchJSON(`${BASE_URL}/dashboard`);
}

/**
 * Obtener lista de tenants con filtros
 */
export async function getTenants(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<TenantsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const query = searchParams.toString();
  return apiFetchJSON(`${BASE_URL}/tenants${query ? `?${query}` : ""}`);
}

/**
 * Obtener un tenant por ID
 */
export async function getTenantById(id: number): Promise<Tenant> {
  return apiFetchJSON(`${BASE_URL}/tenants/${id}`);
}

/**
 * Suspender un tenant
 */
export async function suspendTenant(
  id: number,
  reason?: string
): Promise<{ success: boolean; message: string; tenant: Tenant }> {
  return apiFetchJSON(`${BASE_URL}/tenants/${id}/suspend`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

/**
 * Reactivar un tenant
 */
export async function reactivateTenant(
  id: number
): Promise<{ success: boolean; message: string; tenant: Tenant }> {
  return apiFetchJSON(`${BASE_URL}/tenants/${id}/reactivate`, {
    method: "POST",
  });
}

/**
 * Actualizar notas internas de un tenant
 */
export async function updateTenantNotes(
  id: number,
  notes: string
): Promise<{ success: boolean; tenant: Tenant }> {
  return apiFetchJSON(`${BASE_URL}/tenants/${id}/notes`, {
    method: "PATCH",
    body: JSON.stringify({ notes }),
  });
}

/**
 * Extender trial de un tenant
 */
export async function extendTrial(
  id: number,
  days: number
): Promise<{ success: boolean; message: string; tenant: Tenant }> {
  return apiFetchJSON(`${BASE_URL}/tenants/${id}/extend-trial`, {
    method: "POST",
    body: JSON.stringify({ days }),
  });
}

/**
 * Cambiar plan de un tenant
 */
export async function changeTenantPlan(
  id: number,
  planId: number,
  billingCycle?: "monthly" | "yearly"
): Promise<{ success: boolean; message: string; tenant: Tenant }> {
  return apiFetchJSON(`${BASE_URL}/tenants/${id}/change-plan`, {
    method: "POST",
    body: JSON.stringify({ planId, billingCycle }),
  });
}

/**
 * Obtener planes de suscripción
 */
export async function getPlans(): Promise<SubscriptionPlan[]> {
  return apiFetchJSON(`${BASE_URL}/plans`);
}

export const superadminService = {
  getDashboard,
  getTenants,
  getTenantById,
  suspendTenant,
  reactivateTenant,
  updateTenantNotes,
  extendTrial,
  changeTenantPlan,
  getPlans,
};
