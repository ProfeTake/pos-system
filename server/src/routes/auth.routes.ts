import { Router } from "express";
import { login, me, logout } from "../controllers/auth.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.post("/login", login);
router.get("/me", authenticateToken, me);
router.post("/logout", logout);

export default router;
