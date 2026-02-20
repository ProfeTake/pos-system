import { Router } from "express";
import {
  getAllConfigurations,
  getConfiguration,
  updateConfiguration,
  updateAllConfigurations,
  getCompanyData,
  updateCompanyData,
} from "../controllers/configurations.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { requireTenant } from "../middlewares/tenant.middleware";
import { requirePermission, PERMISSIONS } from "../middlewares/permissions.middleware";

const router = Router();

// Todas las rutas requieren autenticación y tenant
router.use(authenticateToken);
router.use(requireTenant);

// Obtener todas las configuraciones
router.get("/", requirePermission(PERMISSIONS.CONFIG_VIEW), getAllConfigurations);

// Actualizar múltiples configuraciones
router.put("/", requirePermission(PERMISSIONS.CONFIG_EDIT), updateAllConfigurations);

// Rutas específicas para datos de empresa (shortcuts)
router.get("/company", requirePermission(PERMISSIONS.CONFIG_VIEW), getCompanyData);
router.put("/company", requirePermission(PERMISSIONS.CONFIG_EDIT), updateCompanyData);

// Obtener/actualizar configuración específica por clave
router.get("/:key", requirePermission(PERMISSIONS.CONFIG_VIEW), getConfiguration);
router.put("/:key", requirePermission(PERMISSIONS.CONFIG_EDIT), updateConfiguration);

export default router;
