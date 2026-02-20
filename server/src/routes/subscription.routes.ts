/**
 * Rutas de suscripciones y planes SaaS
 */
import { Router } from "express";
import {
  getPlans,
  getCurrentSubscription,
  changePlan,
  getPayments,
  getUsageStats,
  cancelSubscription,
} from "../controllers/subscription.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

// Obtener todos los planes disponibles (público)
router.get("/plans", getPlans);

// Rutas protegidas
router.use(authenticateToken);

// Obtener suscripción actual del tenant
router.get("/current", getCurrentSubscription);

// Obtener estadísticas de uso
router.get("/usage", getUsageStats);

// Cambiar plan de suscripción
router.post("/change-plan", changePlan);

// Obtener historial de pagos
router.get("/payments", getPayments);

// Cancelar suscripción
router.post("/cancel", cancelSubscription);

export default router;
