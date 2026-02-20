import { Router } from "express";
import {
  getCategoryThresholds,
  upsertCategoryThreshold,
  deleteCategoryThreshold,
  applyCategoryThreshold,
  getAvailableCategories,
} from "../controllers/categoryThresholds.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener categorías disponibles (cualquier usuario autenticado)
router.get("/categories", getAvailableCategories);

// Rutas que requieren rol admin o superadmin
router.get("/", requireRole(["superadmin", "admin"]), getCategoryThresholds);
router.post("/", requireRole(["superadmin", "admin"]), upsertCategoryThreshold);
router.delete(
  "/:id",
  requireRole(["superadmin", "admin"]),
  deleteCategoryThreshold
);
router.post(
  "/apply",
  requireRole(["superadmin", "admin"]),
  applyCategoryThreshold
);

export default router;
