import { Router } from "express";
import {
  getCurrent,
  openSession,
  closeSession,
  closeCurrentSession,
  getSummary,
  getBalance,
  addMovement,
} from "../controllers/cashSession.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

// Endpoints públicos
router.get("/summary", getSummary);

// Endpoints protegidos
router.use(authenticateToken);

router.get("/current", getCurrent);
router.get("/balance", getBalance);
router.post("/open", openSession);
router.post("/close", closeCurrentSession); // Cerrar sesión actual sin ID
router.post("/:id/close", closeSession); // Cerrar sesión específica por ID
router.post("/movement", addMovement);

export default router;
