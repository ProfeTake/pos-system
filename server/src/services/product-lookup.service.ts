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

interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  product_name_es?: string;
  brands?: string;
  categories?: string;
  categories_tags?: string[];
  quantity?: string;
  image_url?: string;
  image_front_url?: string;
  nutriments?: any;
}

interface UPCItemDBProduct {
  ean: string;
  title: string;
  brand?: string;
  category?: string;
  description?: string;
  images?: string[];
}

interface LookupResult {
  success: boolean;
  productos: ProductData[];
  stats: {
    total: number;
    encontrados: number;
    noEncontrados: number;
    fuentes: Record<string, number>;
  };
}

// ============================================
// PRODUCT LOOKUP SERVICE
// ============================================

/**
 * Servicio de búsqueda de productos usando APIs públicas reales.
 * NO usa IA para inventar datos - solo datos verificados.
 */
export class ProductLookupService {
  // APIs públicas de productos
  private readonly OPEN_FOOD_FACTS_API =
    "https://world.openfoodfacts.org/api/v2/product";
  private readonly UPC_ITEM_DB_API =
    "https://api.upcitemdb.com/prod/trial/lookup";

  // Caché de productos
  private cache: Map<string, ProductData> = new Map();
  private readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 horas
  private cacheTimestamps: Map<string, number> = new Map();

  // Rate limiting
  private lastApiCall: number = 0;
  private readonly MIN_DELAY_MS = 500; // 500ms entre llamadas

  // Mapeo de categorías Open Food Facts a categorías del sistema
  private readonly CATEGORY_MAP: Record<string, string> = {
    beverages: "Bebidas",
    "alcoholic-beverages": "Bebidas Alcohólicas",
    wines: "Vinos",
    beers: "Cervezas",
    sodas: "Bebidas",
    waters: "Aguas",
    juices: "Jugos",
    dairy: "Lácteos",
    snacks: "Snacks",
    chocolates: "Chocolates",
    candies: "Dulces",
    cereals: "Cereales",
    breads: "Panadería",
    meats: "Carnes",
    frozen: "Congelados",
    cleaning: "Limpieza",
    "personal-care": "Cuidado Personal",
  };

  constructor() {
    console.log("[ProductLookupService] Servicio inicializado");
  }

  /**
   * Rate limiting - espera si es necesario.
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastApiCall;

    if (elapsed < this.MIN_DELAY_MS) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.MIN_DELAY_MS - elapsed)
      );
    }

    this.lastApiCall = Date.now();
  }

  /**
   * Busca un producto en Open Food Facts.
   */
  private async searchOpenFoodFacts(
    barcode: string
  ): Promise<ProductData | null> {
    try {
      await this.rateLimit();

      const url = `${this.OPEN_FOOD_FACTS_API}/${barcode}.json`;
      console.log(`[ProductLookup] Buscando en OpenFoodFacts: ${barcode}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "POS-System/1.0 (https://github.com/your-repo)",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(
          `[ProductLookup] No encontrado (${response.status}) en OpenFoodFacts: ${barcode}`
        );
        return null;
      }

      const data = await response.json();

      if (data.status !== 1 || !data.product) {
        console.log(
          `[ProductLookup] No encontrado en OpenFoodFacts: ${barcode}`
        );
        return null;
      }

      const product: OpenFoodFactsProduct = data.product;

      // Extraer nombre (priorizar español)
      const nombre = product.product_name_es || product.product_name || null;

      if (!nombre) {
        console.log(
          `[ProductLookup] Producto sin nombre en OpenFoodFacts: ${barcode}`
        );
        return null;
      }

      // Extraer cantidad y unidad de medida
      const { cantidad, unidad } = this.parseQuantity(product.quantity || "");

      // Mapear categoría
      const categoria = this.mapCategory(product.categories_tags || []);

      console.log(`[ProductLookup] ✅ Encontrado en OpenFoodFacts: ${nombre}`);

      return {
        codigo_barra: barcode,
        nombre,
        marca: product.brands?.split(",")[0]?.trim() || null,
        categoria,
        subcategoria: null,
        precio_sugerido: null, // OpenFoodFacts no tiene precios
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
      if (error.name === "AbortError") {
        console.log(`[ProductLookup] Timeout en OpenFoodFacts: ${barcode}`);
      } else {
        console.error(`[ProductLookup] Error en OpenFoodFacts:`, error.message);
      }
      return null;
    }
  }

  /**
   * Busca un producto en UPC Item DB (backup).
   */
  private async searchUPCItemDB(barcode: string): Promise<ProductData | null> {
    try {
      await this.rateLimit();

      console.log(`[ProductLookup] Buscando en UPCItemDB: ${barcode}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.UPC_ITEM_DB_API}?upc=${barcode}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(
          `[ProductLookup] No encontrado (${response.status}) en UPCItemDB: ${barcode}`
        );
        return null;
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        console.log(`[ProductLookup] No encontrado en UPCItemDB: ${barcode}`);
        return null;
      }

      const item: UPCItemDBProduct = data.items[0];

      console.log(`[ProductLookup] ✅ Encontrado en UPCItemDB: ${item.title}`);

      return {
        codigo_barra: barcode,
        nombre: item.title || null,
        marca: item.brand || null,
        categoria: item.category || "Otros",
        subcategoria: null,
        precio_sugerido: null,
        precio_compra_estimado: null,
        unidad_medida: "none",
        cantidad_unitaria: 0,
        descripcion: item.description || null,
        imagen_url: item.images?.[0] || null,
        encontrado: true,
        confianza: "media",
        fuente: "UPCItemDB",
        verificado: true,
      };
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log(`[ProductLookup] Timeout en UPCItemDB: ${barcode}`);
      } else {
        console.error(`[ProductLookup] Error en UPCItemDB:`, error.message);
      }
      return null;
    }
  }

  /**
   * Parsea la cantidad y unidad de un string como "500 ml" o "1.5 L".
   */
  private parseQuantity(quantityStr: string): {
    cantidad: number;
    unidad: "ml" | "g" | "kg" | "unidad" | "none";
  } {
    if (!quantityStr) {
      return { cantidad: 0, unidad: "none" };
    }

    const normalized = quantityStr.toLowerCase().trim();

    // Patrones comunes
    const patterns = [
      { regex: /(\d+(?:[.,]\d+)?)\s*ml/i, unit: "ml" as const, multiplier: 1 },
      {
        regex: /(\d+(?:[.,]\d+)?)\s*l(?:itro)?s?/i,
        unit: "ml" as const,
        multiplier: 1000,
      },
      { regex: /(\d+(?:[.,]\d+)?)\s*cl/i, unit: "ml" as const, multiplier: 10 },
      {
        regex: /(\d+(?:[.,]\d+)?)\s*g(?:ramo)?s?(?!\s*l)/i,
        unit: "g" as const,
        multiplier: 1,
      },
      { regex: /(\d+(?:[.,]\d+)?)\s*kg/i, unit: "kg" as const, multiplier: 1 },
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern.regex);
      if (match) {
        const value = parseFloat(match[1].replace(",", "."));
        return {
          cantidad: Math.round(value * pattern.multiplier),
          unidad: pattern.unit,
        };
      }
    }

    return { cantidad: 0, unidad: "none" };
  }

  /**
   * Mapea categorías de Open Food Facts a categorías del sistema.
   */
  private mapCategory(categoryTags: string[]): string {
    for (const tag of categoryTags) {
      const normalized = tag.replace("en:", "").replace("es:", "");

      for (const [key, value] of Object.entries(this.CATEGORY_MAP)) {
        if (normalized.includes(key)) {
          return value;
        }
      }
    }

    return "Otros";
  }

  /**
   * Busca un producto en caché.
   */
  private getFromCache(barcode: string): ProductData | null {
    const timestamp = this.cacheTimestamps.get(barcode);

    if (!timestamp || Date.now() - timestamp > this.CACHE_EXPIRY_MS) {
      this.cache.delete(barcode);
      this.cacheTimestamps.delete(barcode);
      return null;
    }

    return this.cache.get(barcode) || null;
  }

  /**
   * Guarda un producto en caché.
   */
  private saveToCache(product: ProductData): void {
    this.cache.set(product.codigo_barra, product);
    this.cacheTimestamps.set(product.codigo_barra, Date.now());
  }

  /**
   * Busca un producto por código de barras.
   * Primero busca en APIs reales, NO inventa datos.
   */
  public async lookupProduct(barcode: string): Promise<ProductData> {
    const normalizedBarcode = barcode.trim();

    // Verificar caché
    const cached = this.getFromCache(normalizedBarcode);
    if (cached) {
      console.log(`[ProductLookup] Desde caché: ${normalizedBarcode}`);
      return cached;
    }

    // Buscar en Open Food Facts primero
    let product = await this.searchOpenFoodFacts(normalizedBarcode);

    // Si no se encuentra, intentar UPC Item DB
    if (!product) {
      product = await this.searchUPCItemDB(normalizedBarcode);
    }

    // Si no se encuentra en ninguna API, retornar no encontrado
    if (!product) {
      const notFound: ProductData = {
        codigo_barra: normalizedBarcode,
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

      // Guardar en caché para evitar llamadas repetidas
      this.saveToCache(notFound);
      return notFound;
    }

    // Guardar en caché
    this.saveToCache(product);
    return product;
  }

  /**
   * Busca múltiples productos por códigos de barras.
   */
  public async lookupBatch(barcodes: string[]): Promise<LookupResult> {
    const productos: ProductData[] = [];
    const stats = {
      total: barcodes.length,
      encontrados: 0,
      noEncontrados: 0,
      fuentes: {} as Record<string, number>,
    };

    console.log(
      `[ProductLookup] 🚀 Procesando lote de ${barcodes.length} códigos...`
    );

    for (const barcode of barcodes) {
      try {
        const product = await this.lookupProduct(barcode);
        productos.push(product);

        if (product.encontrado) {
          stats.encontrados++;
          const fuente = product.fuente || "Desconocida";
          stats.fuentes[fuente] = (stats.fuentes[fuente] || 0) + 1;
        } else {
          stats.noEncontrados++;
        }
      } catch (error: any) {
        console.error(
          `[ProductLookup] Error procesando ${barcode}:`,
          error.message
        );

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

    console.log(
      `[ProductLookup] ✅ Completado: ${stats.encontrados}/${stats.total} encontrados`
    );
    console.log(`[ProductLookup] 📊 Fuentes:`, stats.fuentes);

    return {
      success: true,
      productos,
      stats,
    };
  }

  /**
   * Limpia el caché.
   */
  public clearCache(): number {
    const size = this.cache.size;
    this.cache.clear();
    this.cacheTimestamps.clear();
    console.log(`[ProductLookup] Caché limpiado (${size} entradas)`);
    return size;
  }

  /**
   * Obtiene estadísticas del servicio.
   */
  public getStats() {
    return {
      cacheSize: this.cache.size,
      cacheHits: Array.from(this.cache.values()).filter((p) => p.encontrado)
        .length,
    };
  }
}

// Singleton
export const productLookupService = new ProductLookupService();
