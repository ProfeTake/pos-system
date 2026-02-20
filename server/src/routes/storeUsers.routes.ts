import { Router } from "express";
import {
  getStoreUsers,
  getStoreUser,
  createStoreUser,
  updateStoreUser,
  deleteStoreUser,
  toggleUserStatus,
} from "../controllers/storeUsers.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";
import { checkUserLimit } from "../middlewares/subscription.middleware";

const router = Router();

// Todas las rutas requieren autenticación y rol admin o superadmin
router.use(authenticateToken);
router.use(requireRole(["superadmin", "admin"]));

router.get("/", getStoreUsers);
router.get("/:id", getStoreUser);
router.post("/", checkUserLimit, createStoreUser);
router.put("/:id", updateStoreUser);
router.delete("/:id", deleteStoreUser);
router.patch("/:id/toggle-status", toggleUserStatus);

export default router;
