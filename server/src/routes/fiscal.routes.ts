import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware";
import { issueBoleta, getBoletaStatus } from "../controllers/fiscal.controller";

const router = Router();

// Requiere auth (y tenant se setea por tenantMiddleware, especialmente en single-tenant)
router.post("/boleta/:saleId/issue", authenticateToken, issueBoleta);
router.get("/boleta/:saleId", authenticateToken, getBoletaStatus);

export default router;
