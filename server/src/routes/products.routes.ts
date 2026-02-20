import { Router } from "express";
import {
  getAll,
  getByBarcode,
  create,
  update,
  remove,
  updateStatus,
  searchExternal,
  addBarcodeToBuffer,
  processBatch,
  getCatalogStatus,
  clearBuffer,
  confirmBatch,
  getClaudeMetrics,
  clearCache,
  resetMetrics,
  // Product Lookup (APIs reales)
  lookupProduct,
  lookupBatch,
  getLookupStats,
  clearLookupCache,
  // Hybrid Catalog (OpenFoodFacts + Tiendas Chilenas + Claude)
  hybridProcessBatch,
  hybridLookupSingle,
  getHybridStatus,
  clearHybridCache,
  // Auto-completado y búsqueda
  getSuggestions,
  clearSuggestionsCache,
  searchProducts,
} from "../controllers/products.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { requirePermission, PERMISSIONS } from "../middlewares/permissions.middleware";
import { generalRateLimit } from "../middlewares/rateLimiting.middleware";
import { checkProductLimit } from "../middlewares/subscription.middleware";

const router = Router();

// ============== Endpoints Públicos (sin auth) ==============
// Búsqueda y sugerencias accesibles sin autenticación
router.get("/suggestions", generalRateLimit, getSuggestions);
router.get("/search", generalRateLimit, searchProducts);

// ============== Endpoints Protegidos ==============
router.use(authenticateToken);

router.delete("/suggestions/cache", requirePermission(PERMISSIONS.CONFIG_EDIT), clearSuggestionsCache);

// ============== CRUD Básico ==============
router.get("/", requirePermission(PERMISSIONS.PRODUCTS_VIEW), getAll);
router.get("/by-barcode/:code", requirePermission(PERMISSIONS.PRODUCTS_VIEW), getByBarcode);
router.post("/", checkProductLimit, requirePermission(PERMISSIONS.PRODUCTS_CREATE), create);
router.put("/:id", requirePermission(PERMISSIONS.PRODUCTS_EDIT), update);
router.delete("/:id", requirePermission(PERMISSIONS.PRODUCTS_DELETE), remove);
router.patch("/:id/estado", requirePermission(PERMISSIONS.PRODUCTS_EDIT), updateStatus);
router.get("/google-search", requirePermission(PERMISSIONS.PRODUCTS_VIEW), searchExternal);

// ⭐ HYBRID CATALOG (RECOMENDADO - OpenFoodFacts + Tiendas Chile + Claude validador)
router.get("/hybrid/status", requirePermission(PERMISSIONS.PRODUCTS_VIEW), getHybridStatus);
router.get("/hybrid/:barcode", requirePermission(PERMISSIONS.PRODUCTS_VIEW), hybridLookupSingle);
router.post("/hybrid/batch", requirePermission(PERMISSIONS.PRODUCTS_CREATE), hybridProcessBatch);
router.delete("/hybrid/cache", requirePermission(PERMISSIONS.CONFIG_EDIT), clearHybridCache);

// Product Lookup (APIs reales - sin IA)
router.get("/lookup/stats", requirePermission(PERMISSIONS.PRODUCTS_VIEW), getLookupStats);
router.get("/lookup/:barcode", requirePermission(PERMISSIONS.PRODUCTS_VIEW), lookupProduct);
router.post("/lookup/batch", requirePermission(PERMISSIONS.PRODUCTS_CREATE), lookupBatch);
router.delete("/lookup/cache", requirePermission(PERMISSIONS.CONFIG_EDIT), clearLookupCache);

// Claude AI Catalog routes (legacy - con IA directa)
router.post("/catalog/add-barcode", requirePermission(PERMISSIONS.PRODUCTS_CREATE), addBarcodeToBuffer);
router.post("/catalog/process-batch", requirePermission(PERMISSIONS.PRODUCTS_CREATE), processBatch);
router.get("/catalog/status", requirePermission(PERMISSIONS.PRODUCTS_VIEW), getCatalogStatus);
router.delete("/catalog/buffer", requirePermission(PERMISSIONS.CONFIG_EDIT), clearBuffer);
router.post("/catalog/confirm-batch", requirePermission(PERMISSIONS.PRODUCTS_CREATE), confirmBatch);

// Claude AI Metrics & Cache routes
router.get("/catalog/metrics", requirePermission(PERMISSIONS.CONFIG_VIEW), getClaudeMetrics);
router.delete("/catalog/cache", requirePermission(PERMISSIONS.CONFIG_EDIT), clearCache);
router.post("/catalog/metrics/reset", requirePermission(PERMISSIONS.CONFIG_EDIT), resetMetrics);

export default router;
