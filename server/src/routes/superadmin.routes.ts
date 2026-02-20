/**
 * SuperAdmin Routes
 * Rutas protegidas exclusivas para superadministradores
 */

import { Router } from "express";
import {
  getTenants,
  getTenantById,
  suspendTenant,
  reactivateTenant,
  updateTenantNotes,
  getPlans,
  changeTenantPlan,
  getDashboard,
  extendTrial,
} from "../controllers/superadmin.controller";

const router = Router();

// Middleware de autenticación SuperAdmin
// TODO: Implementar verificación real de token superadmin
router.use((req, res, next) => {
  // Por ahora permitimos acceso para desarrollo
  // En producción: verificar token JWT de superadmin
  const authHeader = req.headers.authorization;

  // Simulación básica - en producción verificar token real
  // if (!authHeader || !authHeader.startsWith("Bearer ")) {
  //   return res.status(401).json({ error: "No autorizado" });
  // }

  next();
});

// Dashboard
router.get("/dashboard", getDashboard);

// Tenants
router.get("/tenants", getTenants);
router.get("/tenants/:id", getTenantById);
router.post("/tenants/:id/suspend", suspendTenant);
router.post("/tenants/:id/reactivate", reactivateTenant);
router.patch("/tenants/:id/notes", updateTenantNotes);
router.post("/tenants/:id/extend-trial", extendTrial);
router.post("/tenants/:id/change-plan", changeTenantPlan);

// Planes
router.get("/plans", getPlans);

export default router;
