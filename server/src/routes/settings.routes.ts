import { Router } from "express";
import {
    getSettings,
    updateSetting,
    getCashSession,
    recalculateWindow,
    checkShiftChange,
} from "../controllers/settings.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

// Endpoints públicos
router.get("/", getSettings);

// Endpoints protegidos
router.use(authenticateToken);

router.put("/:key", updateSetting);
router.get("/cash-session", getCashSession);
router.post("/cash-session/recalculate-window", recalculateWindow);
router.get("/cash-session/check-shift", checkShiftChange);

export default router;
