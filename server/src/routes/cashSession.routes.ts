import { Router } from "express";
import {
  getCurrent,
  openSession,
  closeSession,
  closeCurrentSession,
  getSummary,
  getBalance,
  extendSession,
} from "../controllers/cashSession.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { auditMiddleware, AuditActions } from "../middlewares/audit.middleware";

const router = Router();

// Endpoints públicos
router.get("/summary", getSummary);

// Endpoints protegidos
router.use(authenticateToken);

router.get("/current", getCurrent);
router.get("/balance", getBalance);
router.post("/open", auditMiddleware(AuditActions.CASH_SESSION_OPEN, "cash_session"), openSession);
router.post("/close", closeCurrentSession); // audit is inside controller (needs balance calc first)
router.post("/extend", extendSession); // audit is inside controller
router.post("/:id/close", closeSession); // Cerrar sesión específica por ID

export default router;
