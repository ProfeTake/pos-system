import { Router } from "express";
import {
  getMetrics,
  getSalesTrend,
  getSalesByHour,
  getPeriodComparison,
  getRestockPredictions,
} from "../controllers/analytics.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticateToken);

// Métricas principales (KPIs, top productos, categorías, etc.)
router.get("/metrics", getMetrics);

// Tendencia de ventas por día (últimos N días)
router.get("/sales-trend", getSalesTrend);

// Distribución de ventas por hora
router.get("/sales-by-hour", getSalesByHour);

// Comparación con período anterior
router.get("/period-comparison", getPeriodComparison);

// Predicciones de reabastecimiento
router.get("/restock-predictions", getRestockPredictions);

export default router;
