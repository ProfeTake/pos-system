import { Router } from "express";
import {
  getAll,
  getById,
  create,
  voidSale,
  refundSale,
  getMetrics,
  getSalesTrend,
  getSalesByHour,
  getPeriodComparison,
  getRestockPredictions,
} from "../controllers/sales.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { checkSaleLimit } from "../middlewares/subscription.middleware";

const router = Router();

// Endpoints públicos
router.get("/full", getAll);

// Endpoints protegidos
router.use(authenticateToken);

router.get("/:id", getById);
router.post("/", checkSaleLimit, create);

// Anular venta (sin devolver stock)
router.post("/:id/void", voidSale);

// Devolver venta (anula y devuelve stock)
router.post("/:id/refund", refundSale);

// Analytics (legacy - usar /api/analytics en su lugar)
router.get("/analytics/metrics", getMetrics);
router.get("/analytics/sales-trend", getSalesTrend);
router.get("/analytics/sales-by-hour", getSalesByHour);
router.get("/analytics/period-comparison", getPeriodComparison);
router.get("/analytics/restock-predictions", getRestockPredictions);

export default router;
