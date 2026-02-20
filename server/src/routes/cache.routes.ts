import { Router } from "express";
import { Request, Response } from "express";
import { cacheService } from "../services/cache.service";
import { authenticateToken } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/permissions.middleware";

const router = Router();

/**
 * GET /api/cache/stats
 * Obtiene estadísticas del cache
 */
router.get("/stats", authenticateToken, requireRole(["superadmin", "admin"]), (req: Request, res: Response) => {
  const stats = cacheService.getStats();
  res.json({
    success: true,
    stats: {
      ...stats,
      hitRate: `${stats.hitRate.toFixed(2)}%`,
    },
  });
});

/**
 * DELETE /api/cache
 * Limpia todo el cache
 */
router.delete("/", authenticateToken, requireRole(["superadmin"]), async (req: Request, res: Response) => {
  await cacheService.clear();
  res.json({
    success: true,
    message: "Cache limpiado completamente",
  });
});

/**
 * DELETE /api/cache/pattern/:pattern
 * Limpia cache por patrón
 */
router.delete("/pattern/:pattern", authenticateToken, requireRole(["superadmin", "admin"]), async (req: Request, res: Response) => {
  const pattern = String(req.params.pattern);
  const count = await cacheService.delPattern(pattern);
  res.json({
    success: true,
    message: `${count} entradas eliminadas`,
    pattern,
    deletedCount: count,
  });
});

export default router;
