import { Router } from "express";
import { getCurrentMovements, getBySession, create } from "../controllers/cashMovements.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticateToken);

router.get("/current", getCurrentMovements);
router.get("/session/:sessionId", getBySession);
router.post("/", create);

export default router;
