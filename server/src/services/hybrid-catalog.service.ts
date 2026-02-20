import Anthropic from "@anthropic-ai/sdk";

// ============================================
// TYPES & INTERFACES
// ============================================

export interface ProductData {
  codigo_barra: string;
  nombre: string | null;
  marca: string | null;
  categoria: string;
  subcategoria: string | null;
  precio_sugerido: number | null;
  precio_compra_estimado: number | null;
  unidad_medida: "ml" | "g" | "kg" | "unidad" | "none";
  cantidad_unitaria: number;
  descripcion: string | null;
  imagen_url: string | null;
  encontrado: boolean;
  confianza: "alta" | "media" | "baja";
  fuente: string | null;
  verificado: boolean;
}

interface ChileanStoreResult {
  nombre: string | null;
  marca: string | null;
  categoria: string | null;
  precio: number | null;
  imagen_url: string | null;
  fuente: string;
}

interface ProcessResult {
  success: boolean;
  productos: ProductData[];
  stats: {
    total: number;
    encontradosOpenFood: number;
    encontradosChile: number;
    noEncontrados: number;
    fuentes: Record<string, number>;
  };
  errors: string[];
}

// ============================================
// HYBRID CATALOG SERVICE
// ============================================

/**
 * Servicio híbrido de catalogación con workflow en cascada:
 * 1. Open Food Facts (datos verificados internacionales)
 * 2. Tiendas Chilenas (Jumbo, Lider, CCU, Coca-Cola)
 * 3. Claude AI Haiku (SOLO para estructurar datos encontrados, NO para inventar)
 */
export class HybridCatalogService {
  private client: Anthropic | null = null;

  // APIs
  private readonly OPEN_FOOD_FACTS_API =
    "https://world.openfoodfacts.org/api/v2/product";

  // Sitios chilenos para búsqueda
  private readonly CHILEAN_SITES = [
    "jumbo.cl",
    "lider.cl",
    "unimarc.cl",
    "santaisabel.cl",
    "ccuenlinea.cl",
    "coca-cola.cl",
  ];

  // Caché
  private cache: Map<string, ProductData> = new Map();
  private readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;
  private cacheTimestamps: Map<string, number> = new Map();

  // Rate limiting
  private lastApiCall: number = 0;
  private readonly MIN_DELAY_MS = 300;

  // Mapeo de categorías
  private readonly CATEGORY_MAP: Record<string, string> = {
    // Bebidas alcohólicas
    wines: "Vino",
    wine: "Vino",
    vino: "Vino",
    beers: "Cerveza",
    beer: "Cerveza",
    cerveza: "Cerveza",
    spirits: "Destilados",
    vodka: "Vodka",
    whisky: "Whisky",
    whiskey: "Whisky",
    pisco: "Pisco",
    ron: "Ron",
    rum: "Ron",
    gin: "Ginebra",
    tequila: "Tequila",
    // Bebidas sin alcohol
    sodas: "Gaseosa",
    "soft-drinks": "Gaseosa",
    gaseosa: "Gaseosa",
    waters: "Agua",
    agua: "Agua",
    juices: "Jugo",
    jugo: "Jugo",
    "energy-drinks": "Energética",
    energetica: "Energética",
    // Otros
    snacks: "Snacks",
    chocolates: "Chocolates",
    beverages: "Bebidas",
  };

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.warn("[HybridCatalog] ANTHROPIC_API_KEY no configurada");
      return;
    }

    try {
      this.client = new Anthropic({ apiKey, timeout: 60000 });
      console.log("[HybridCatalog] ✅ Servicio inicializado");
    } catch (error) {
      console.error("[HybridCatalog] Error al inicializar:", error);
    }
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastApiCall;
    if (elapsed < this.MIN_DELAY_MS) {
      await new Promise((r) => setTimeout(r, this.MIN_DELAY_MS - elapsed));
    }
    this.lastApiCall = Date.now();
  }

  public isAvailable(): boolean {
    return this.client !== null;
  }

  // ============================================
  // PASO 1: OPEN FOOD FACTS
  // ============================================

  private async searchOpenFoodFacts(
    barcode: string
  ): Promise<ProductData | null> {
    try {
      await this.rateLimit();
      console.log(`[HybridCatalog] 🔍 Buscando en OpenFoodFacts: ${barcode}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(
        `${this.OPEN_FOOD_FACTS_API}/${barcode}.json`,
        {
          signal: controller.signal,
          headers: { "User-Agent": "POS-Chile/1.0" },
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) return null;

      const data = await response.json();
      if (data.status !== 1 || !data.product) return null;

      const product = data.product;
      const nombre = product.product_name_es || product.product_name;

      if (!nombre) return null;

      const { cantidad, unidad } = this.parseQuantity(product.quantity || "");
      const categoria = this.mapCategory(product.categories_tags || []);

      console.log(`[HybridCatalog] ✅ OpenFoodFacts: ${nombre}`);

      return {
        codigo_barra: barcode,
        nombre,
        marca: product.brands?.split(",")[0]?.trim() || null,
        categoria,
        subcategoria: null,
        precio_sugerido: null,
        precio_compra_estimado: null,
        unidad_medida: unidad,
        cantidad_unitaria: cantidad,
        descripcion: null,
        imagen_url: product.image_front_url || product.image_url || null,
        encontrado: true,
        confianza: "alta",
        fuente: "OpenFoodFacts",
        verificado: true,
      };
    } catch (error: any) {
      console.log(`[HybridCatalog] OpenFoodFacts falló: ${error.message}`);
      return null;
    }
  }

  // ============================================
  // PASO 2: BÚSQUEDA EN TIENDAS CHILENAS CON CLAUDE
  // ============================================

  /**
   * Usa Claude Haiku para buscar información en sitios chilenos.
   * El prompt está diseñado para que Claude SOLO devuelva datos que encuentra,
   * NO para que invente.
   */
  private async searchChileanStoresWithClaude(
    barcodes: string[]
  ): Promise<Map<string, ChileanStoreResult>> {
    if (!this.client) {
      return new Map();
    }

    const results = new Map<string, ChileanStoreResult>();

    try {
      console.log(
        `[HybridCatalog] 🇨🇱 Buscando en tiendas chilenas con Claude...`
      );

      const prompt = `Eres un asistente de búsqueda de productos chilenos. Tu tarea es buscar información REAL de productos en tiendas chilenas.

## INSTRUCCIONES CRÍTICAS:
1. SOLO devuelve información si estás SEGURO de que es correcta
2. Si NO encuentras el producto o tienes dudas, devuelve encontrado: false
3. NUNCA inventes nombres, marcas o precios
4. Los códigos que empiezan con 780 son chilenos (CCU, Concha y Toro, etc.)
5. Los códigos que empiezan con 779 también son chilenos

## CÓDIGOS A BUSCAR:
${barcodes.map((b, i) => `${i + 1}. ${b}`).join("\n")}

## TIENDAS CHILENAS DE REFERENCIA:
- Jumbo (jumbo.cl)
- Lider (lider.cl)
- CCU (cervezas, bebidas)
- Coca-Cola Chile
- Concha y Toro (vinos)
- Santa Rita (vinos)

## FORMATO DE RESPUESTA (JSON):
Responde SOLO con un array JSON válido. Sin explicaciones.

\`\`\`json
[
  {
    "codigo": "7802800000000",
    "encontrado": true,
    "nombre": "Nombre exacto del producto",
    "marca": "Marca",
    "categoria": "Vino|Cerveza|Gaseosa|Agua|Jugo|Snacks|Otros",
    "precio_referencia": 2990,
    "fuente": "jumbo.cl"
  },
  {
    "codigo": "1234567890123",
    "encontrado": false,
    "nombre": null,
    "marca": null,
    "categoria": null,
    "precio_referencia": null,
    "fuente": null
  }
]
\`\`\`

IMPORTANTE: Si no reconoces un código, SIEMPRE devuelve encontrado: false.`;

      const message = await this.client.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

      const textContent = message.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        return results;
      }

      // Parsear respuesta JSON
      const jsonMatch =
        textContent.text.match(/```json\s*([\s\S]*?)\s*```/) ||
        textContent.text.match(/\[\s*\{[\s\S]*\}\s*\]/);

      if (!jsonMatch) {
        console.log("[HybridCatalog] No se pudo parsear respuesta de Claude");
        return results;
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const productos = JSON.parse(jsonStr);

      for (const p of productos) {
        if (p.encontrado && p.nombre) {
          results.set(p.codigo, {
            nombre: p.nombre,
            marca: p.marca || null,
            categoria: p.categoria || null,
            precio: p.precio_referencia || null,
            imagen_url: null,
            fuente: p.fuente || "Claude (tiendas chilenas)",
          });
          console.log(`[HybridCatalog] ✅ Chile: ${p.nombre}`);
        }
      }

      return results;
    } catch (error: any) {
      console.error(
        "[HybridCatalog] Error en búsqueda chilena:",
        error.message
      );
      return results;
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  private parseQuantity(quantityStr: string): {
    cantidad: number;
    unidad: "ml" | "g" | "kg" | "unidad" | "none";
  } {
    if (!quantityStr) return { cantidad: 0, unidad: "none" };

    const normalized = quantityStr.toLowerCase().trim();
    const patterns = [
      { regex: /(\d+(?:[.,]\d+)?)\s*ml/i, unit: "ml" as const, mult: 1 },
      {
        regex: /(\d+(?:[.,]\d+)?)\s*l(?:itro)?s?/i,
        unit: "ml" as const,
        mult: 1000,
      },
      { regex: /(\d+(?:[.,]\d+)?)\s*cl/i, unit: "ml" as const, mult: 10 },
      {
        regex: /(\d+(?:[.,]\d+)?)\s*g(?:ramo)?s?(?!\s*l)/i,
        unit: "g" as const,
        mult: 1,
      },
      { regex: /(\d+(?:[.,]\d+)?)\s*kg/i, unit: "kg" as const, mult: 1 },
    ];

    for (const p of patterns) {
      const match = normalized.match(p.regex);
      if (match) {
        return {
          cantidad: Math.round(parseFloat(match[1].replace(",", ".")) * p.mult),
          unidad: p.unit,
        };
      }
    }
    return { cantidad: 0, unidad: "none" };
  }

  private mapCategory(categoryTags: string[]): string {
    for (const tag of categoryTags) {
      const normalized = tag
        .replace("en:", "")
        .replace("es:", "")
        .toLowerCase();
      for (const [key, value] of Object.entries(this.CATEGORY_MAP)) {
        if (normalized.includes(key)) return value;
      }
    }
    return "Otros";
  }

  private getFromCache(barcode: string): ProductData | null {
    const ts = this.cacheTimestamps.get(barcode);
    if (!ts || Date.now() - ts > this.CACHE_EXPIRY_MS) {
      this.cache.delete(barcode);
      this.cacheTimestamps.delete(barcode);
      return null;
    }
    return this.cache.get(barcode) || null;
  }

  private saveToCache(product: ProductData): void {
    this.cache.set(product.codigo_barra, product);
    this.cacheTimestamps.set(product.codigo_barra, Date.now());
  }

  // ============================================
  // PROCESO PRINCIPAL EN CASCADA
  // ============================================

  /**
   * Procesa un lote de códigos de barras usando el workflow en cascada:
   * 1. OpenFoodFacts (verificado)
   * 2. Tiendas chilenas via Claude (solo datos encontrados)
   * 3. Marcar como no encontrado si falla todo
   */
  public async processBatch(barcodes: string[]): Promise<ProcessResult> {
    const productos: ProductData[] = [];
    const stats = {
      total: barcodes.length,
      encontradosOpenFood: 0,
      encontradosChile: 0,
      noEncontrados: 0,
      fuentes: {} as Record<string, number>,
    };
    const errors: string[] = [];

    console.log(`[HybridCatalog] 🚀 Procesando ${barcodes.length} códigos...`);

    // Paso 1: Verificar caché y OpenFoodFacts
    const pendingBarcodes: string[] = [];

    for (const barcode of barcodes) {
      // Verificar caché primero
      const cached = this.getFromCache(barcode);
      if (cached) {
        productos.push(cached);
        if (cached.encontrado) {
          stats.encontradosOpenFood++;
          stats.fuentes[cached.fuente || "Cache"] =
            (stats.fuentes[cached.fuente || "Cache"] || 0) + 1;
        }
        continue;
      }

      // Intentar OpenFoodFacts
      const offResult = await this.searchOpenFoodFacts(barcode);
      if (offResult && offResult.encontrado) {
        productos.push(offResult);
        this.saveToCache(offResult);
        stats.encontradosOpenFood++;
        stats.fuentes["OpenFoodFacts"] =
          (stats.fuentes["OpenFoodFacts"] || 0) + 1;
      } else {
        pendingBarcodes.push(barcode);
      }
    }

    console.log(
      `[HybridCatalog] 📊 OpenFoodFacts: ${stats.encontradosOpenFood}/${barcodes.length}`
    );

    // Paso 2: Buscar pendientes en tiendas chilenas con Claude
    if (pendingBarcodes.length > 0 && this.client) {
      console.log(
        `[HybridCatalog] 🇨🇱 Buscando ${pendingBarcodes.length} en tiendas chilenas...`
      );

      const chileanResults = await this.searchChileanStoresWithClaude(
        pendingBarcodes
      );

      for (const barcode of pendingBarcodes) {
        const chileanData = chileanResults.get(barcode);

        if (chileanData && chileanData.nombre) {
          const product: ProductData = {
            codigo_barra: barcode,
            nombre: chileanData.nombre,
            marca: chileanData.marca,
            categoria: chileanData.categoria || "Otros",
            subcategoria: null,
            precio_sugerido: chileanData.precio,
            precio_compra_estimado: chileanData.precio
              ? Math.round(chileanData.precio * 0.7)
              : null,
            unidad_medida: "none",
            cantidad_unitaria: 0,
            descripcion: null,
            imagen_url: chileanData.imagen_url,
            encontrado: true,
            confianza: "media", // Media porque viene de Claude
            fuente: chileanData.fuente,
            verificado: false, // No verificado porque es de IA
          };
          productos.push(product);
          this.saveToCache(product);
          stats.encontradosChile++;
          stats.fuentes[chileanData.fuente] =
            (stats.fuentes[chileanData.fuente] || 0) + 1;
        } else {
          // No encontrado en ningún lado
          const notFound: ProductData = {
            codigo_barra: barcode,
            nombre: null,
            marca: null,
            categoria: "Otros",
            subcategoria: null,
            precio_sugerido: null,
            precio_compra_estimado: null,
            unidad_medida: "none",
            cantidad_unitaria: 0,
            descripcion: null,
            imagen_url: null,
            encontrado: false,
            confianza: "baja",
            fuente: null,
            verificado: false,
          };
          productos.push(notFound);
          this.saveToCache(notFound);
          stats.noEncontrados++;
        }
      }
    } else if (pendingBarcodes.length > 0) {
      // Si no hay Claude, marcar todos como no encontrados
      for (const barcode of pendingBarcodes) {
        productos.push({
          codigo_barra: barcode,
          nombre: null,
          marca: null,
          categoria: "Otros",
          subcategoria: null,
          precio_sugerido: null,
          precio_compra_estimado: null,
          unidad_medida: "none",
          cantidad_unitaria: 0,
          descripcion: null,
          imagen_url: null,
          encontrado: false,
          confianza: "baja",
          fuente: null,
          verificado: false,
        });
        stats.noEncontrados++;
      }
    }

    console.log(`[HybridCatalog] ✅ Completado:`);
    console.log(`   - OpenFoodFacts: ${stats.encontradosOpenFood}`);
    console.log(`   - Tiendas Chile: ${stats.encontradosChile}`);
    console.log(`   - No encontrados: ${stats.noEncontrados}`);

    return {
      success: true,
      productos,
      stats,
      errors,
    };
  }

  /**
   * Busca un solo producto (para búsqueda individual al escanear)
   */
  public async lookupSingle(barcode: string): Promise<ProductData> {
    const result = await this.processBatch([barcode]);
    return (
      result.productos[0] || {
        codigo_barra: barcode,
        nombre: null,
        marca: null,
        categoria: "Otros",
        subcategoria: null,
        precio_sugerido: null,
        precio_compra_estimado: null,
        unidad_medida: "none",
        cantidad_unitaria: 0,
        descripcion: null,
        imagen_url: null,
        encontrado: false,
        confianza: "baja",
        fuente: null,
        verificado: false,
      }
    );
  }

  public clearCache(): number {
    const size = this.cache.size;
    this.cache.clear();
    this.cacheTimestamps.clear();
    console.log(`[HybridCatalog] Caché limpiado (${size} entradas)`);
    return size;
  }

  public getStatus() {
    return {
      available: this.isAvailable(),
      cacheSize: this.cache.size,
      claudeEnabled: this.client !== null,
    };
  }
}

// Singleton
export const hybridCatalogService = new HybridCatalogService();
