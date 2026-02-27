/**
 * Middleware para verificar límites del plan de suscripción
 */
import { Response, NextFunction } from "express";
import { TenantRequest } from "./tenant.middleware";
import {
  canCreateProduct,
  canCreateUser,
  canCreateSale,
} from "../services/subscription.service";

/**
 * Verifica si el tenant puede crear un nuevo producto
 */
export const checkProductLimit = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const isSingleTenant =
      process.env.SINGLE_TENANT === "true" ||
      process.env.TENANT_MODE === "single";
    const subscriptionEnforcementDisabled =
      process.env.SUBSCRIPTION_ENFORCEMENT === "false";

    if (isSingleTenant || subscriptionEnforcementDisabled) {
      return next();
    }

    const tenantSlug = req.tenantId || "default";
    const result = await canCreateProduct(tenantSlug);

    if (!result.allowed) {
      return res.status(403).json({
        error: "Límite de plan alcanzado",
        message: result.reason,
        current: result.current,
        limit: result.limit,
        upgradeRequired: true,
      });
    }

    next();
  } catch (error) {
    console.error("Error checking product limit:", error);
    res.status(500).json({ error: "Error al verificar límite" });
  }
};

/**
 * Verifica si el tenant puede crear un nuevo usuario
 */
export const checkUserLimit = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const isSingleTenant =
      process.env.SINGLE_TENANT === "true" ||
      process.env.TENANT_MODE === "single";
    const subscriptionEnforcementDisabled =
      process.env.SUBSCRIPTION_ENFORCEMENT === "false";

    if (isSingleTenant || subscriptionEnforcementDisabled) {
      return next();
    }

    const tenantSlug = req.tenantId || "default";
    const result = await canCreateUser(tenantSlug);

    if (!result.allowed) {
      return res.status(403).json({
        error: "Límite de plan alcanzado",
        message: result.reason,
        current: result.current,
        limit: result.limit,
        upgradeRequired: true,
      });
    }

    next();
  } catch (error) {
    console.error("Error checking user limit:", error);
    res.status(500).json({ error: "Error al verificar límite" });
  }
};

/**
 * Verifica si el tenant puede registrar una nueva venta
 */
export const checkSaleLimit = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const isSingleTenant =
      process.env.SINGLE_TENANT === "true" ||
      process.env.TENANT_MODE === "single";
    const subscriptionEnforcementDisabled =
      process.env.SUBSCRIPTION_ENFORCEMENT === "false";

    if (isSingleTenant || subscriptionEnforcementDisabled) {
      return next();
    }

    const tenantSlug = req.tenantId || "default";
    const result = await canCreateSale(tenantSlug);

    if (!result.allowed) {
      return res.status(403).json({
        error: "Límite de plan alcanzado",
        message: result.reason,
        current: result.current,
        limit: result.limit,
        upgradeRequired: true,
      });
    }

    next();
  } catch (error) {
    console.error("Error checking sale limit:", error);
    res.status(500).json({ error: "Error al verificar límite" });
  }
};


