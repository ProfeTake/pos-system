import { apiFetchJSON, postJSON } from "../lib/api";

export interface Plan {
  id: number;
  name: string;
  code: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  maxProducts: number | null;
  maxUsers: number | null;
  maxSalesPerMonth: number | null;
  maxStorageGB: number | null;
  features: string[];
  sortOrder: number;
  isUnlimited: {
    products: boolean;
    users: boolean;
    sales: boolean;
  };
}

export interface Subscription {
  id: number;
  status: string;
  startDate: number;
  endDate: number | null;
  nextBillingDate: number | null;
  billingCycle: string;
  lastPaymentDate: number | null;
  lastPaymentAmount: number | null;
}

export interface CurrentSubscription {
  subscription: Subscription;
  plan: {
    id: number;
    name: string;
    code: string;
    priceMonthly: number;
    priceYearly: number;
    features: string[];
  };
  limits: {
    maxProducts: number | null;
    maxUsers: number | null;
    maxSalesPerMonth: number | null;
    maxStorageGB: number | null;
  };
  usage: {
    totalProducts: number;
    totalUsers: number;
    salesThisMonth: number;
    storageUsedMB: number;
  };
  percentage: {
    products: number;
    users: number;
    sales: number;
  };
  warnings: {
    products: boolean;
    users: boolean;
    sales: boolean;
  };
}

export interface Payment {
  id: number;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  transactionId: string;
  invoiceNumber: string;
  invoiceUrl: string;
  paidAt: number;
  createdAt: number;
}

/**
 * Obtiene todos los planes disponibles
 */
export async function getPlans(): Promise<Plan[]> {
  const response = await apiFetchJSON<Plan[]>("/api/subscription/plans");
  return response;
}

/**
 * Obtiene la suscripción actual del tenant
 */
export async function getCurrentSubscription(): Promise<CurrentSubscription> {
  const response = await apiFetchJSON<CurrentSubscription>("/api/subscription/current");
  return response;
}

/**
 * Cambia el plan de suscripción
 */
export async function changePlan(
  planCode: string,
  billingCycle: "monthly" | "yearly"
): Promise<{ success: boolean; message: string }> {
  const response = await postJSON<{ success: boolean; message: string }>(
    "/api/subscription/change-plan",
    { planCode, billingCycle }
  );
  return response;
}

/**
 * Obtiene el historial de pagos
 */
export async function getPayments(): Promise<Payment[]> {
  const response = await apiFetchJSON<Payment[]>("/api/subscription/payments");
  return response;
}

/**
 * Cancela la suscripción actual
 */
export async function cancelSubscription(
  reason: string
): Promise<{ success: boolean; message: string }> {
  const response = await postJSON<{ success: boolean; message: string }>(
    "/api/subscription/cancel",
    { reason }
  );
  return response;
}
