import { Request, Response } from "express";
import { db } from "../db";
import { products } from "../db/schema";
import { eq, like, or, sql, ne, and, isNull } from "drizzle-orm";
import { claudeCatalogService } from "../services/claude-catalog.service";
import { productLookupService } from "../services/product-lookup.service";
import { hybridCatalogService } from "../services/hybrid-catalog.service";
import { TenantRequest } from "../middlewares/tenant.middleware";

// Cache para sugerencias
const suggestionsCache = new Map<string, { data: any; expiresAt: number }>();
const SUGGESTIONS_CACHE_TTL = 60 * 60 * 1000; // 1 hora

// Campos permitidos para crear / actualizar
const PRODUCT_FIELDS = [
  "name",
  "category",
  "stock",
  "minStock",
  "price",
  "cost",
  "marginPct",
  "barCode",
  "ml",
  "measureUnit",
  "estado",
] as const;
type InsertProduct = typeof products.$inferInsert;

function sanitizePayload(raw: any) {
  const clean: Record<string, any> = {};
  if (!raw || typeof raw !== "object") return clean;
  // Mapear variantes incorrectas (BarCode -> barCode)
  if (raw.BarCode && !raw.barCode) raw.barCode = raw.BarCode;
  // Also map legacy "barcode" key to "barCode"
  if (raw.barcode && !raw.barCode) raw.barCode = raw.barcode;
  // Also map legacy "status" key to "estado"
  if (raw.status && !raw.estado) raw.estado = raw.status;
  PRODUCT_FIELDS.forEach((k) => {
    if (raw[k] !== undefined && raw[k] !== null) {
      clean[k] = raw[k];
    }
  });
  // Normalizaciones básicas de tipos numéricos
  ["stock", "minStock", "price", "cost", "marginPct", "ml"].forEach((n) => {
    if (clean[n] !== undefined && clean[n] !== null && clean[n] !== "") {
      const num = Number(clean[n]);
      clean[n] = isNaN(num) ? 0 : num;
    }
  });
  // Normalizar estado si llega inválido
  if (
    clean.estado &&
    !["NORMAL", "BAJO", "AGOTADO", "DESHABILITADO"].includes(clean.estado)
  ) {
    delete clean.estado;
  }
  // barCode: string o null
  if (clean.barCode !== undefined) {
    clean.barCode = String(clean.barCode || "").trim() || null;
  }
  return clean;
}

import { cacheService, cacheKey, CACHE_TTL } from "../services/cache.service";

export const getAll = async (req: TenantRequest, res: Response) => {
  const tenantId = req.tenantId || "default";
  const cacheKeyStr = cacheKey("products", tenantId, "all");

  try {
    // Intentar obtener de cache
    const cached = await cacheService.get<any[]>(cacheKeyStr);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    const allProducts = await db.select().from(products);
    
    // Guardar en cache por 5 minutos
    await cacheService.set(cacheKeyStr, allProducts, CACHE_TTL.MEDIUM);
    
    res.setHeader("X-Cache", "MISS");
    res.json(allProducts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products" });
  }
};

export const getByBarcode = async (req: Request, res: Response) => {
  const code = String(req.params.code);
  try {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.barCode, code))
      .limit(1);
    if (!product) {
      return res.json({ notFound: true });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Error fetching product" });
  }
};

export const create = async (req: TenantRequest, res: Response) => {
  const tenantId = req.tenantId;
  
  try {
    const payloadRaw = sanitizePayload(req.body) as Partial<InsertProduct>;
    if (!payloadRaw.name || !payloadRaw.category) {
      return res
        .status(400)
        .json({ message: "Nombre y categoría son requeridos" });
    }
    
    // Agregar tenantId si está disponible
    if (tenantId) {
      (payloadRaw as any).tenantId = tenantId;
    }
    
    const [insertResult] = await db
      .insert(products)
      .values(payloadRaw as InsertProduct);
    const [newProduct] = await db.select().from(products).where(eq(products.id, insertResult.insertId)).limit(1);
    
    // Invalidar cache de productos
    await cacheService.delPattern(`products:${tenantId || "default"}:*`);
    
    res.status(201).json(newProduct);
  } catch (error: any) {
    console.error("[products.create]", error);
    if ((error as any).code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ message: "Product already exists" });
    }
    res.status(500).json({ message: "Error creating product" });
  }
};

export const update = async (req: TenantRequest, res: Response) => {
  const { id } = req.params;
  const tenantId = req.tenantId;
  
  try {
    const payload = sanitizePayload(req.body) as Partial<InsertProduct>;
    if (Object.keys(payload).length === 0) {
      return res
        .status(400)
        .json({ message: "No hay campos válidos para actualizar" });
    }
    await db
      .update(products)
      .set(payload)
      .where(eq(products.id, Number(id)));
    const [updated] = await db.select().from(products).where(eq(products.id, Number(id))).limit(1);
    if (!updated)
      return res.status(404).json({ message: "Producto no encontrado" });
    
    // Invalidar cache
    await cacheService.delPattern(`products:${tenantId || "default"}:*`);
    
    res.json(updated);
  } catch (error: any) {
    console.error("[products.update]", error);
    res.status(500).json({ message: "Error updating product" });
  }
};

export const remove = async (req: TenantRequest, res: Response) => {
  const { id } = req.params;
  const tenantId = req.tenantId;
  
  try {
    await db.delete(products).where(eq(products.id, Number(id)));
    
    // Invalidar cache
    await cacheService.delPattern(`products:${tenantId || "default"}:*`);
    
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product" });
  }
};

export const updateStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { estado } = req.body;
  try {
    if (
      !estado ||
      !["NORMAL", "BAJO", "AGOTADO", "DESHABILITADO"].includes(estado)
    ) {
      return res.status(400).json({ message: "Estado inválido" });
    }
    await db
      .update(products)
      .set({ estado: estado })
      .where(eq(products.id, Number(id)));
    const [updated] = await db.select().from(products).where(eq(products.id, Number(id))).limit(1);
    if (!updated)
      return res.status(404).json({ message: "Producto no encontrado" });
    res.json(updated);
  } catch (error) {
    console.error("[products.updateStatus]", error);
    res.status(500).json({ message: "Error updating status" });
  }
};

export const searchExternal = async (req: Request, res: Response) => {
  const { barcode } = req.query;
  if (!barcode) return res.status(400).json({ message: "Barcode required" });

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching from external API" });
  }
};

// ============================================
// CLAUDE AI CATALOG ENDPOINTS
// ============================================

/**
 * Agrega un código de barras al buffer de procesamiento IA.
 * POST /api/products/catalog/add-barcode
 */
export const addBarcodeToBuffer = async (req: Request, res: Response) => {
  try {
    const { barcode } = req.body;

    if (!barcode || typeof barcode !== "string") {
      return res.status(400).json({ message: "Código de barras requerido" });
    }

    // Verificar si el servicio está disponible
    if (!claudeCatalogService.isAvailable()) {
      return res.status(503).json({
        message:
          "Servicio Claude AI no disponible. Configura ANTHROPIC_API_KEY.",
      });
    }

    const status = claudeCatalogService.addBarcodeToBuffer(barcode);
    res.json(status);
  } catch (error: any) {
    console.error("[addBarcodeToBuffer]", error);
    res
      .status(400)
      .json({ message: error.message || "Error al agregar código" });
  }
};

/**
 * Procesa el batch de códigos con Claude AI.
 * POST /api/products/catalog/process-batch
 */
export const processBatch = async (req: Request, res: Response) => {
  try {
    // Verificar si el servicio está disponible
    if (!claudeCatalogService.isAvailable()) {
      return res.status(503).json({
        message:
          "Servicio Claude AI no disponible. Configura ANTHROPIC_API_KEY.",
      });
    }

    // Obtener categorías del sistema
    const allProducts = await db
      .select({ category: products.category })
      .from(products);
    const uniqueCategories = [...new Set(allProducts.map((p) => p.category))];

    // Agregar categorías base si no existen
    const baseCategories = [
      "Vino",
      "Cerveza",
      "Vodka",
      "Ron",
      "Ginebra",
      "Tequila",
      "Whisky",
      "Pisco",
      "Licuado",
      "Gaseosa",
      "Jugo",
      "Agua Mineral",
      "Energética",
      "Snacks",
      "Otros",
    ];

    const allCategories = [
      ...new Set([...baseCategories, ...uniqueCategories]),
    ].sort();

    // Contexto del negocio (puede venir del body)
    const context = {
      tipo_negocio: req.body.tipo_negocio || "retail de bebidas y alimentos",
      ubicacion: req.body.ubicacion || "Chile",
      moneda: req.body.moneda || "CLP",
    };

    // Procesar batch
    const result = await claudeCatalogService.processBatch(
      allCategories,
      context
    );

    res.json(result);
  } catch (error: any) {
    console.error("[processBatch]", error);
    res.status(500).json({
      message: error.message || "Error al procesar batch",
    });
  }
};

/**
 * Obtiene el estado del buffer y servicio.
 * GET /api/products/catalog/status
 */
export const getCatalogStatus = async (req: Request, res: Response) => {
  try {
    const status = claudeCatalogService.getStatus();
    res.json(status);
  } catch (error: any) {
    console.error("[getCatalogStatus]", error);
    res.status(500).json({ message: "Error al obtener estado" });
  }
};

/**
 * Limpia el buffer sin procesar.
 * DELETE /api/products/catalog/buffer
 */
export const clearBuffer = async (req: Request, res: Response) => {
  try {
    claudeCatalogService.clearBuffer();
    res.json({ message: "Buffer limpiado", buffer_count: 0 });
  } catch (error: any) {
    console.error("[clearBuffer]", error);
    res.status(500).json({ message: "Error al limpiar buffer" });
  }
};

/**
 * Confirma y crea productos en batch desde datos de IA.
 * POST /api/products/catalog/confirm-batch
 */
export const confirmBatch = async (req: Request, res: Response) => {
  try {
    const { productos } = req.body;

    if (!Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ message: "Array de productos requerido" });
    }

    const created: any[] = [];
    const errors: any[] = [];

    // Procesar cada producto secuencialmente para control de errores
    for (const prod of productos) {
      try {
        // Validar datos mínimos
        if (!prod.name || !prod.category) {
          errors.push({
            barcode: prod.barcode || prod.codigo_barra,
            error: "Nombre y categoría requeridos",
          });
          continue;
        }

        // Verificar código de barras duplicado
        if (prod.barcode) {
          const [existing] = await db
            .select()
            .from(products)
            .where(eq(products.barCode, prod.barcode))
            .limit(1);

          if (existing) {
            errors.push({
              barcode: prod.barcode,
              error: "Código de barras ya existe",
            });
            continue;
          }
        }

        // Sanitizar payload
        const payload = sanitizePayload({
          name: prod.name,
          category: prod.category,
          stock: prod.stock ?? 0,
          minStock: prod.minStock ?? 0,
          price: prod.price ?? 0,
          cost: prod.cost ?? 0,
          marginPct: prod.marginPct ?? 30,
          barCode: prod.barcode || null,
          ml: prod.ml ?? 0,
          measureUnit: prod.measureUnit || "ml",
          estado: prod.status || "NORMAL",
        });

        // Crear producto
        const [batchInsertResult] = await db
          .insert(products)
          .values(payload as InsertProduct);
        const [newProduct] = await db.select().from(products).where(eq(products.id, batchInsertResult.insertId)).limit(1);

        created.push(newProduct);
      } catch (error: any) {
        console.error("[confirmBatch] Error creando producto:", error);
        errors.push({
          barcode: prod.barcode || prod.codigo_barra,
          error: error.message || "Error desconocido",
        });
      }
    }

    res.json({
      success: true,
      created_count: created.length,
      error_count: errors.length,
      created,
      errors,
    });
  } catch (error: any) {
    console.error("[confirmBatch]", error);
    res.status(500).json({
      message: error.message || "Error al confirmar batch",
    });
  }
};

/**
 * Obtiene las métricas de uso de la API de Claude.
 * GET /api/products/catalog/metrics
 */
export const getClaudeMetrics = async (req: Request, res: Response) => {
  try {
    const metrics = claudeCatalogService.getMetrics();
    res.json({
      success: true,
      metrics,
    });
  } catch (error: any) {
    console.error("[getClaudeMetrics]", error);
    res.status(500).json({ message: "Error al obtener métricas" });
  }
};

/**
 * Limpia el caché de productos procesados.
 * DELETE /api/products/catalog/cache
 */
export const clearCache = async (req: Request, res: Response) => {
  try {
    const clearedCount = claudeCatalogService.clearCache();
    res.json({
      success: true,
      message: `Caché limpiado: ${clearedCount} entradas eliminadas`,
      cleared_count: clearedCount,
    });
  } catch (error: any) {
    console.error("[clearCache]", error);
    res.status(500).json({ message: "Error al limpiar caché" });
  }
};

/**
 * Reinicia las métricas de la API.
 * POST /api/products/catalog/metrics/reset
 */
export const resetMetrics = async (req: Request, res: Response) => {
  try {
    claudeCatalogService.resetMetrics();
    res.json({
      success: true,
      message: "Métricas reiniciadas correctamente",
    });
  } catch (error: any) {
    console.error("[resetMetrics]", error);
    res.status(500).json({ message: "Error al reiniciar métricas" });
  }
};

// ============================================
// PRODUCT LOOKUP (APIs Reales - Sin IA)
// ============================================

/**
 * Busca un producto por código de barras en APIs reales.
 * GET /api/products/lookup/:barcode
 */
export const lookupProduct = async (req: Request, res: Response) => {
  try {
    const barcode = String(req.params.barcode);

    if (!barcode || barcode.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Código de barras inválido (mínimo 8 dígitos)",
      });
    }

    const product = await productLookupService.lookupProduct(barcode);

    res.json({
      success: true,
      producto: product,
    });
  } catch (error: any) {
    console.error("[lookupProduct]", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al buscar producto",
    });
  }
};

/**
 * Busca múltiples productos por códigos de barras en APIs reales.
 * POST /api/products/lookup/batch
 */
export const lookupBatch = async (req: Request, res: Response) => {
  try {
    const { codigos } = req.body;

    if (!codigos || !Array.isArray(codigos) || codigos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Se requiere un array de códigos de barras",
      });
    }

    // Filtrar códigos válidos
    const validCodes = codigos.filter(
      (c: string) => typeof c === "string" && c.trim().length >= 8
    );

    if (validCodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No hay códigos válidos (mínimo 8 dígitos cada uno)",
      });
    }

    const result = await productLookupService.lookupBatch(validCodes);

    res.json(result);
  } catch (error: any) {
    console.error("[lookupBatch]", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al buscar productos",
    });
  }
};

/**
 * Obtiene estadísticas del servicio de lookup.
 * GET /api/products/lookup/stats
 */
export const getLookupStats = async (req: Request, res: Response) => {
  try {
    const stats = productLookupService.getStats();
    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error("[getLookupStats]", error);
    res.status(500).json({ message: "Error al obtener estadísticas" });
  }
};

/**
 * Limpia el caché del servicio de lookup.
 * DELETE /api/products/lookup/cache
 */
export const clearLookupCache = async (req: Request, res: Response) => {
  try {
    const clearedCount = productLookupService.clearCache();
    res.json({
      success: true,
      message: `Caché limpiado: ${clearedCount} entradas eliminadas`,
      cleared_count: clearedCount,
    });
  } catch (error: any) {
    console.error("[clearLookupCache]", error);
    res.status(500).json({ message: "Error al limpiar caché" });
  }
};

// ============================================
// HYBRID CATALOG (OpenFoodFacts + Tiendas Chilenas + Claude)
// ============================================

/**
 * Procesa un lote de códigos usando el workflow híbrido.
 * POST /api/products/hybrid/batch
 */
export const hybridProcessBatch = async (req: Request, res: Response) => {
  try {
    const { codigos } = req.body;

    if (!codigos || !Array.isArray(codigos) || codigos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Se requiere un array de códigos de barras",
      });
    }

    // Filtrar códigos válidos
    const validCodes = codigos.filter(
      (c: string) => typeof c === "string" && c.trim().length >= 8
    );

    if (validCodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No hay códigos válidos (mínimo 8 dígitos)",
      });
    }

    const result = await hybridCatalogService.processBatch(validCodes);

    res.json(result);
  } catch (error: any) {
    console.error("[hybridProcessBatch]", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al procesar lote",
    });
  }
};

/**
 * Busca un solo producto con el workflow híbrido.
 * GET /api/products/hybrid/:barcode
 */
export const hybridLookupSingle = async (req: Request, res: Response) => {
  try {
    const barcode = String(req.params.barcode);

    if (!barcode || barcode.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Código de barras inválido (mínimo 8 dígitos)",
      });
    }

    const producto = await hybridCatalogService.lookupSingle(barcode);

    res.json({
      success: true,
      producto,
    });
  } catch (error: any) {
    console.error("[hybridLookupSingle]", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al buscar producto",
    });
  }
};

/**
 * Obtiene el estado del servicio híbrido.
 * GET /api/products/hybrid/status
 */
export const getHybridStatus = async (req: Request, res: Response) => {
  try {
    const status = hybridCatalogService.getStatus();
    res.json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    console.error("[getHybridStatus]", error);
    res.status(500).json({ message: "Error al obtener estado" });
  }
};

/**
 * Limpia el caché del servicio híbrido.
 * DELETE /api/products/hybrid/cache
 */
export const clearHybridCache = async (req: Request, res: Response) => {
  try {
    const clearedCount = hybridCatalogService.clearCache();
    res.json({
      success: true,
      message: `Caché limpiado: ${clearedCount} entradas`,
      cleared_count: clearedCount,
    });
  } catch (error: any) {
    console.error("[clearHybridCache]", error);
    res.status(500).json({ message: "Error al limpiar caché" });
  }
};

// ============================================================
// AUTO-COMPLETADO DE PRODUCTOS
// ============================================================

interface ProductSuggestion {
  name: string;
  quantity: string;
  unit: string;
  category: string;
  source: "own" | "global";
  price?: number;
  barcode?: string;
}

/**
 * Obtiene sugerencias de productos para auto-completado
 * GET /api/products/suggestions?q={query}&limit={limit}
 * 
 * Busca primero en productos propios del tenant, luego en catálogo global
 */
export const getSuggestions = async (req: TenantRequest, res: Response) => {
  const { q, limit = "10" } = req.query;
  const tenantId = req.tenantId;
  const limitNum = Math.min(parseInt(limit as string) || 10, 50);

  // Validar query
  if (!q || typeof q !== "string" || q.length < 2) {
    return res.json({ suggestions: [] });
  }

  const query = q.trim().toLowerCase();
  const cacheKey = `suggestions:${tenantId || "global"}:${query}:${limitNum}`;

  try {
    // Verificar cache
    const cached = suggestionsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached.data);
    }

    const suggestions: ProductSuggestion[] = [];
    const seenNames = new Set<string>();

    // 1. Buscar en productos propios del tenant (prioridad alta)
    if (tenantId) {
      const ownProducts = await db
        .select({
          name: products.name,
          category: products.category,
          ml: products.ml,
          measureUnit: products.measureUnit,
          price: products.price,
          barcode: products.barCode,
        })
        .from(products)
        .where(
          and(
            eq(products.tenantId, tenantId),
            or(
              like(products.name, `%${query}%`),
              like(products.barCode, `%${query}%`)
            ),
            isNull(products.deletedAt)
          )
        )
        .limit(Math.ceil(limitNum / 2));

      for (const p of ownProducts) {
        if (!seenNames.has(p.name.toLowerCase())) {
          seenNames.add(p.name.toLowerCase());
          suggestions.push({
            name: p.name,
            quantity: String(p.ml || ""),
            unit: p.measureUnit || "none",
            category: p.category,
            source: "own",
            price: p.price,
            barcode: p.barcode || undefined,
          });
        }
      }
    }

    // 2. Buscar en catálogo global (otros tenants, para sugerencias)
    const remaining = limitNum - suggestions.length;
    if (remaining > 0) {
      const globalQuery = tenantId
        ? and(
            ne(products.tenantId, tenantId),
            like(products.name, `%${query}%`),
            isNull(products.deletedAt)
          )
        : and(
            like(products.name, `%${query}%`),
            isNull(products.deletedAt)
          );

      const globalProducts = await db
        .select({
          name: products.name,
          category: products.category,
          ml: products.ml,
          measureUnit: products.measureUnit,
        })
        .from(products)
        .where(globalQuery)
        .limit(remaining * 2); // Obtener más por si hay duplicados

      for (const p of globalProducts) {
        if (suggestions.length >= limitNum) break;
        const nameLower = p.name.toLowerCase();
        if (!seenNames.has(nameLower)) {
          seenNames.add(nameLower);
          suggestions.push({
            name: p.name,
            quantity: String(p.ml || ""),
            unit: p.measureUnit || "none",
            category: p.category,
            source: "global",
          });
        }
      }
    }

    const result = { suggestions };

    // Guardar en cache
    suggestionsCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + SUGGESTIONS_CACHE_TTL,
    });

    // Headers de cache para el cliente
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("X-Cache", "MISS");
    
    res.json(result);
  } catch (error: any) {
    console.error("[getSuggestions]", error);
    res.status(500).json({ 
      error: "Error al buscar sugerencias",
      suggestions: [] 
    });
  }
};

/**
 * Limpia el cache de sugerencias
 * DELETE /api/products/suggestions/cache
 */
export const clearSuggestionsCache = async (req: Request, res: Response) => {
  try {
    const count = suggestionsCache.size;
    suggestionsCache.clear();
    res.json({
      success: true,
      message: `Cache de sugerencias limpiado: ${count} entradas`,
    });
  } catch (error: any) {
    console.error("[clearSuggestionsCache]", error);
    res.status(500).json({ message: "Error al limpiar cache" });
  }
};

/**
 * Busca productos por nombre o código de barras para el tenant actual
 * GET /api/products/search?q={query}&limit={limit}
 */
export const searchProducts = async (req: TenantRequest, res: Response) => {
  const { q, limit = "20", includeDisabled = "false" } = req.query;
  const tenantId = req.tenantId;
  const limitNum = Math.min(parseInt(limit as string) || 20, 100);

  if (!q || typeof q !== "string" || q.length < 1) {
    return res.json({ products: [], total: 0 });
  }

  const query = q.trim();

  try {
    let whereClause = or(
      like(products.name, `%${query}%`),
      like(products.barCode, `%${query}%`),
      like(products.category, `%${query}%`)
    );

    // Filtrar por tenant si está disponible
    if (tenantId) {
      whereClause = and(
        eq(products.tenantId, tenantId),
        whereClause
      );
    }

    // Excluir eliminados y opcionalmente deshabilitados
    if (includeDisabled !== "true") {
      whereClause = and(
        whereClause,
        isNull(products.deletedAt),
        ne(products.estado, "DESHABILITADO")
      );
    } else {
      whereClause = and(
        whereClause,
        isNull(products.deletedAt)
      );
    }

    const results = await db
      .select()
      .from(products)
      .where(whereClause)
      .limit(limitNum);

    res.json({
      products: results,
      total: results.length,
      query,
    });
  } catch (error: any) {
    console.error("[searchProducts]", error);
    res.status(500).json({ 
      error: "Error al buscar productos",
      products: [],
      total: 0 
    });
  }
};
