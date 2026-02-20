/**
 * Controlador de suscripciones y planes SaaS
 * NOTA: Las tablas SaaS (subscription_plans, subscriptions, tenants_saas, payments)
 * aún no están creadas en la base de datos. Todos los endpoints retornan 501 hasta
 * que se implemente el módulo multi-tenant completo.
 */
import { Request, Response } from "express";
import { TenantRequest } from "../middlewares/tenant.middleware";

const NOT_IMPLEMENTED_MSG =
  "Módulo de suscripciones no implementado aún. Todas las funciones están disponibles sin restricciones.";

/**
 * Obtiene todos los planes disponibles
 * GET /api/subscription/plans
 */
export const getPlans = async (_req: Request, res: Response) => {
  // Devolver planes hardcodeados para la UI
  res.json([
    {
      id: 1,
      name: "Gratis",
      code: "free",
      description: "Plan gratuito para empezar",
      priceMonthly: 0,
      priceYearly: 0,
      maxProducts: 50,
      maxUsers: 2,
      maxSalesPerMonth: 100,
      features: ["basic_pos", "basic_reports"],
      sortOrder: 0,
      isUnlimited: { products: false, users: false, sales: false },
    },
    {
      id: 2,
      name: "Básico",
      code: "basic",
      description: "Para negocios en crecimiento",
      priceMonthly: 19990,
      priceYearly: 199900,
      maxProducts: 500,
      maxUsers: 5,
      maxSalesPerMonth: 1000,
      features: ["basic_pos", "basic_reports", "inventory_alerts"],
      sortOrder: 1,
      isUnlimited: { products: false, users: false, sales: false },
    },
    {
      id: 3,
      name: "Profesional",
      code: "pro",
      description: "Para negocios establecidos",
      priceMonthly: 49990,
      priceYearly: 499900,
      maxProducts: 5000,
      maxUsers: 15,
      maxSalesPerMonth: 10000,
      features: [
        "basic_pos",
        "advanced_reports",
        "inventory_alerts",
        "multi_register",
        "api_access",
      ],
      sortOrder: 2,
      isUnlimited: { products: false, users: false, sales: false },
    },
    {
      id: 4,
      name: "Empresarial",
      code: "enterprise",
      description: "Sin límites",
      priceMonthly: 99990,
      priceYearly: 999900,
      maxProducts: null,
      maxUsers: null,
      maxSalesPerMonth: null,
      features: [
        "basic_pos",
        "advanced_reports",
        "inventory_alerts",
        "multi_register",
        "api_access",
        "priority_support",
        "custom_branding",
      ],
      sortOrder: 3,
      isUnlimited: { products: true, users: true, sales: true },
    },
  ]);
};

/**
 * Obtiene la suscripción actual del tenant
 * GET /api/subscription/current
 */
export const getCurrentSubscription = async (
  _req: TenantRequest,
  res: Response
) => {
  // Retornar plan "ilimitado" por defecto mientras no haya SaaS
  res.json({
    subscription: {
      id: 0,
      status: "active",
      startDate: null,
      endDate: null,
      nextBillingDate: null,
      billingCycle: "monthly",
      lastPaymentDate: null,
      lastPaymentAmount: null,
    },
    plan: {
      id: 0,
      name: "Sin restricciones",
      code: "unlimited",
      priceMonthly: 0,
      priceYearly: 0,
      features: [],
    },
    limits: {
      maxProducts: null,
      maxUsers: null,
      maxSalesPerMonth: null,
      maxStorageGB: null,
    },
    usage: {
      totalProducts: 0,
      totalUsers: 0,
      salesThisMonth: 0,
      storageUsedMB: 0,
    },
    percentage: { products: 0, users: 0, sales: 0 },
    warnings: { products: false, users: false, sales: false },
  });
};

/**
 * Cambia el plan de suscripción del tenant
 * POST /api/subscription/change-plan
 */
export const changePlan = async (_req: TenantRequest, res: Response) => {
  res.status(501).json({ error: NOT_IMPLEMENTED_MSG });
};

/**
 * Obtiene el historial de pagos del tenant
 * GET /api/subscription/payments
 */
export const getPayments = async (_req: TenantRequest, res: Response) => {
  res.json([]); // No hay pagos aún
};

/**
 * Obtiene estadísticas de uso del tenant
 * GET /api/subscription/usage
 */
export const getUsageStats = async (_req: TenantRequest, res: Response) => {
  res.json({
    limits: {
      maxProducts: null,
      maxUsers: null,
      maxSalesPerMonth: null,
      maxStorageGB: null,
      features: [],
    },
    usage: {
      totalProducts: 0,
      totalUsers: 0,
      salesThisMonth: 0,
      storageUsedMB: 0,
    },
    percentage: { products: 0, users: 0, sales: 0 },
  });
};

/**
 * Cancela la suscripción del tenant
 * POST /api/subscription/cancel
 */
export const cancelSubscription = async (
  _req: TenantRequest,
  res: Response
) => {
  res.status(501).json({ error: NOT_IMPLEMENTED_MSG });
};
