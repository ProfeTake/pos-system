import { Router } from "express";
import {
  getAuditLog,
  getUniqueActions,
  getUniqueEntities,
  getAuditStats,
} from "../controllers/audit.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticateToken);

// Listar audit log con filtros y paginación
router.get("/", getAuditLog);

// Obtener acciones únicas (para filtros)
router.get("/actions", getUniqueActions);

// Obtener entidades únicas (para filtros)
router.get("/entities", getUniqueEntities);

// Estadísticas del audit log
router.get("/stats", getAuditStats);

export default router;
