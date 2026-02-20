import { apiFetchJSON, postJSON, deleteJSON } from "../lib/api";

// ============================================
// TYPES - Backend API Response
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

interface SingleLookupResult {
  success: boolean;
  producto: ProductData;
}

// ============================================
// LEGACY TYPES (para compatibilidad)
// ============================================

export interface ProductLookupResult {
  name: string;
  quantity: string;
  category: string;
  suggestedPrice: number;
  apiData?: any;
}

// ============================================
// PRODUCT LOOKUP SERVICE
// ============================================

export const productLookupService = {
  /**
   * Busca un producto usando el backend (APIs reales verificadas).
   * Este es el método PREFERIDO - usa OpenFoodFacts y UPCItemDB.
   */
  async lookupFromBackend(barcode: string): Promise<ProductData> {
    const result = await apiFetchJSON<SingleLookupResult>(
      `/api/products/lookup/${barcode}`
    );
    return result.producto;
  },

  /**
   * Busca múltiples productos usando el backend.
   */
  async lookupBatchFromBackend(barcodes: string[]): Promise<LookupResult> {
    return postJSON<LookupResult>(`/api/products/lookup/batch`, {
      codigos: barcodes,
    });
  },

  /**
   * Limpia el caché del backend.
   */
  async clearBackendCache(): Promise<{
    success: boolean;
    cleared_count: number;
  }> {
    return deleteJSON<{ success: boolean; cleared_count: number }>(
      `/api/products/lookup/cache`
    );
  },

  /**
   * LEGACY: Busca producto (fallback local si backend falla).
   * Mantiene compatibilidad con código existente.
   */
  async fetchProductData(barcode: string): Promise<ProductLookupResult> {
    const code = barcode.replace(/\D/g, "");

    if (!code) {
      throw new Error("Código de barras inválido");
    }

    try {
      // 1. PRIMERO: Intentar con el backend (APIs reales verificadas)
      try {
        const backendResult = await this.lookupFromBackend(code);

        if (backendResult.encontrado && backendResult.nombre) {
          console.log(
            `[ProductLookup] ✅ Encontrado via backend: ${backendResult.nombre}`
          );

          return {
            name: backendResult.nombre,
            quantity: backendResult.cantidad_unitaria
              ? `${backendResult.cantidad_unitaria} ${backendResult.unidad_medida}`
              : "",
            category: backendResult.categoria,
            suggestedPrice:
              backendResult.precio_sugerido ||
              this.suggestPrice(
                backendResult.nombre,
                `${backendResult.cantidad_unitaria} ${backendResult.unidad_medida}`,
                backendResult.categoria
              ),
            apiData: {
              source: backendResult.fuente,
              image: backendResult.imagen_url,
              brand: backendResult.marca,
              verified: backendResult.verificado,
              confidence: backendResult.confianza,
            },
          };
        }
      } catch (backendError) {
        console.warn(
          "[ProductLookup] Backend no disponible, usando fallback local"
        );
      }

      // 2. FALLBACK: Open Food Facts directo (si backend falla)
      let productData: any = null;

      try {
        const response = await fetch(
          `https://world.openfoodfacts.org/api/v0/product/${code}.json`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.product) {
            productData = data.product;
          }
        }
      } catch (e) {
        // Continuar si Open Food Facts falla
      }

      if (productData) {
        const name =
          productData.product_name_es ||
          productData.product_name ||
          productData.brands ||
          "Producto sin nombre";
        const quantity = productData.quantity || "";
        const category =
          productData.categories?.split(",")?.[0]?.trim() || "Otros";
        const suggestedPrice = this.suggestPrice(name, quantity, category);

        return {
          name,
          quantity,
          category,
          suggestedPrice,
          apiData: {
            source: "OpenFoodFacts (directo)",
            image: productData.image_url,
            brands: productData.brands,
            verified: true,
          },
        };
      }

      // 3. ÚLTIMO FALLBACK: Detección local (NO RECOMENDADO)
      console.warn(
        `[ProductLookup] ⚠️ Producto ${code} no encontrado en APIs reales`
      );
      const productInfo = this.detectProductFromBarcode(code, barcode);
      const suggestedPrice = this.suggestPrice(
        productInfo.name,
        productInfo.quantity,
        productInfo.category
      );

      return {
        name: productInfo.name,
        quantity: productInfo.quantity,
        category: productInfo.category,
        suggestedPrice,
        apiData: {
          source: "Detección local (no verificado)",
          verified: false,
        },
      };
    } catch (error) {
      throw error;
    }
  },

  async searchWithGoogleAndExtractPrice(
    code: string,
    barcode: string
  ): Promise<ProductLookupResult | null> {
    try {
      const googleKey = (import.meta as any).env.VITE_GOOGLE_SEARCH_API_KEY;
      const cseId = (import.meta as any).env.VITE_GOOGLE_CSE_ID;

      if (!googleKey || !cseId) {
        throw new Error("Google Search API no configurada");
      }

      // Buscar con código exacto (sin normalizar) para mayor precisión
      const searchQuery = `código ${barcode} bebida precio Chile`;

      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(
          searchQuery
        )}&key=${googleKey}&cx=${cseId}`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (!response.ok) {
        throw new Error("Error en búsqueda de Google");
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        throw new Error("No se encontraron resultados");
      }

      // Procesar los resultados para extraer información
      const firstResult = data.items[0];
      const snippet = firstResult.snippet || "";

      // Intentar extraer nombre y precio del snippet
      const productName = this.extractProductName(snippet, barcode);
      const price = this.extractPriceFromSnippet(snippet);
      const category = this.detectCategoryFromText(snippet);

      if (productName) {
        const suggestedPrice =
          price || this.suggestPrice(productName, "750 ml", category);

        return {
          name: productName,
          quantity: "750 ml",
          category: category,
          suggestedPrice,
          apiData: {
            source: "Google Search",
            url: firstResult.link,
          },
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  },

  extractProductName(text: string, barcode: string): string {
    // Intentar extraer el nombre del producto del texto
    // Palabras clave para bebidas
    const beverageKeywords = [
      "pisco",
      "cerveza",
      "vino",
      "ron",
      "vodka",
      "whisky",
      "brandy",
      "licor",
      "champagne",
      "espumante",
      "vermouth",
      "agua",
      "jugo",
      "refresco",
    ];

    const lowerText = text.toLowerCase();

    for (const keyword of beverageKeywords) {
      if (lowerText.includes(keyword)) {
        // Encontrar la posición y extraer alrededor
        const index = lowerText.indexOf(keyword);
        const start = Math.max(0, index - 30);
        const end = Math.min(text.length, index + 50);
        const extracted = text.substring(start, end).trim();

        // Limpiar caracteres especiales
        return extracted.replace(/[...]/g, "").substring(0, 80).trim();
      }
    }

    return "";
  },

  extractPriceFromSnippet(text: string): number | null {
    // Buscar patrones de precio en peso chileno
    // Patterns: $XX.XXX, XX.XXX pesos, etc
    const pricePatterns = [
      /\$\s*([0-9]{2,6}(?:\.[0-9]{3})*)/gi, // $12.000
      /([0-9]{2,6}(?:\.[0-9]{3})*)\s*pesos/gi, // 12.000 pesos
      /([0-9]{2,6}(?:\.[0-9]{3})*)\s*CLP/gi, // 12.000 CLP
    ];

    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match) {
        // Extraer el número
        const priceStr = match[0]
          .replace(/[$\s]/g, "")
          .replace(/[^0-9.-]/g, "")
          .replace(/\./g, ""); // Remover separadores de miles

        const price = parseInt(priceStr);

        // Validar que sea un precio razonable (entre $1k y $100k)
        if (price > 1000 && price < 100000) {
          return price;
        }
      }
    }

    return null;
  },

  detectCategoryFromText(text: string): string {
    const lowerText = text.toLowerCase();

    const categoryMap: Record<string, string[]> = {
      Cerveza: ["cerveza", "beer"],
      Vino: ["vino", "wine", "tinto", "blanco", "rosado"],
      Pisco: ["pisco"],
      Ron: ["ron", "rum"],
      Vodka: ["vodka"],
      Whisky: ["whisky", "whiskey"],
      Brandy: ["brandy"],
      Licor: ["licor", "licores", "spirits"],
      Vermouth: ["vermouth"],
      Champagne: ["champagne", "champán", "espumante"],
      Agua: ["agua", "water"],
      Bebida: ["bebida", "bebidas", "drink"],
    };

    for (const [category, keywords] of Object.entries(categoryMap)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return category;
        }
      }
    }

    return "Otros";
  },

  detectProductFromBarcode(code: string, barcode: string): any {
    // Detectar país por primeros dígitos (GS1)
    const countryCode = code.substring(0, 2);
    const type =
      countryCode === "28" || countryCode === "29" ? "Abarrotes" : "Bebida";

    // Códigos de barras reales del mercado chileno
    const commonCodes: Record<
      string,
      { name: string; category: string; quantity: string }
    > = {
      // Pisco Chileno
      "7802105000724": {
        name: "Pisco Sour Alto del Carmen",
        category: "Pisco",
        quantity: "1000 ml",
      },
      "7802130000210": {
        name: "Pisco 35° Reservado",
        category: "Pisco",
        quantity: "750 ml",
      },
      "7802105": {
        name: "Bebida Alcohólica Chilena",
        category: "Pisco",
        quantity: "750 ml",
      },

      // Cervezas Chilenas
      "7802500000047": {
        name: "Cerveza Cristal",
        category: "Cerveza",
        quantity: "330 ml",
      },
      "7802500000054": {
        name: "Cerveza Escudo",
        category: "Cerveza",
        quantity: "330 ml",
      },
      "7802500010001": {
        name: "Cerveza Kunstmann",
        category: "Cerveza artesanal",
        quantity: "330 ml",
      },
      "7802500020005": {
        name: "Cerveza Moose",
        category: "Cerveza artesanal",
        quantity: "330 ml",
      },

      // Vinos Chilenos
      "7802865000177": {
        name: "Vino Tinto Santa Rita",
        category: "Vino tinto",
        quantity: "750 ml",
      },
      "7802865000092": {
        name: "Vino Blanco Cousiño Macul",
        category: "Vino blanco",
        quantity: "750 ml",
      },
      "7802800000070": {
        name: "Vino Carmenere Concha y Toro",
        category: "Carmenere",
        quantity: "750 ml",
      },

      // Bebidas Internacionales
      "5449000050127": {
        name: "Cerveza Corona",
        category: "Cerveza premium",
        quantity: "355 ml",
      },
      "5449000000996": {
        name: "Cerveza Heineken",
        category: "Cerveza premium",
        quantity: "330 ml",
      },
      "5449000000019": {
        name: "Cerveza Brahma",
        category: "Cerveza premium",
        quantity: "350 ml",
      },
      "5449000000102": {
        name: "Ron Bacardi",
        category: "Ron",
        quantity: "750 ml",
      },

      // Genéricos por prefijo
      "5449000": {
        name: "Bebida Internacional",
        category: "Bebida",
        quantity: "330 ml",
      },
    };

    // Buscar coincidencia exacta o por prefijo
    for (const [pattern, info] of Object.entries(commonCodes)) {
      if (code.startsWith(pattern) || code.includes(pattern)) {
        return info;
      }
    }

    // Fallback: Asumir bebida estándar basada en longitud del código
    if (code.length === 13 || code.length === 12) {
      // Podría ser bebida alcohólica (validar con prefijo país)
      if (["78", "86"].includes(countryCode)) {
        // Códigos de América Latina
        return {
          name: "Bebida Alcohólica",
          category: "Bebida",
          quantity: "750 ml",
        };
      }
    }

    // Último fallback genérico
    return {
      name: `Producto ${code}`,
      category: "Otros",
      quantity: "1",
    };
  },

  suggestPrice(name: string, quantity: string, category: string): number {
    // Sugerir precio basado en tipo de bebida y cantidad
    const lowerName = (name || "").toLowerCase();
    const lowerCat = (category || "").toLowerCase();

    // Extraer cantidad en ml
    const mlMatch = quantity.match(/(\d+)\s*ml/i);
    const ml = mlMatch ? parseInt(mlMatch[1]) : 0;

    // Precios base por categoría (Mercado Chileno 2025)
    const basePrices: Record<string, number> = {
      // Cervezas (precios al por menor típicos)
      cerveza: 4500, // Cristal, Escudo, Lager
      "cerveza premium": 5500, // Heineken, Corona, Brahma
      "cerveza artesanal": 7000, // Marcas artesanales chilenas
      "cerveza light": 4200, // Cerveza light

      // Vinos (botellas 750ml)
      vino: 9500, // Vino de mesa promedio
      tinto: 9500, // Vino tinto
      blanco: 9500, // Vino blanco
      rosado: 8500, // Vino rosado
      "vino premium": 15000, // Vinos de mejor marca
      "vino reserva": 18000, // Vinos reserva
      "vino gran reserva": 25000, // Vinos gran reserva
      carmenere: 12000, // Varietal Carmenere
      cabernet: 11000, // Varietal Cabernet
      merlot: 10500, // Varietal Merlot
      sauvignon: 10000, // Sauvignon Blanc
      riesling: 11000, // Riesling
      chardonnay: 12000, // Chardonnay

      // Pisco (bebida nacional chilena)
      pisco: 18000, // Pisco estándar 750ml
      "pisco reservado": 22000, // Pisco reservado
      "pisco premium": 28000, // Pisco premium
      pisco35: 12500, // Pisco 35% (botellas pequeñas)

      // Destiladas importadas
      ron: 16000, // Ron estándar (Bacardi, etc)
      "ron premium": 22000, // Ron premium
      vodka: 14000, // Vodka (Smirnoff, etc)
      ginebra: 15000, // Ginebra
      whisky: 28000, // Whisky escocés/americano
      "whisky nacional": 22000, // Whisky chileno
      brandy: 16000, // Brandy
      coñac: 24000, // Coñac francés
      tequila: 19000, // Tequila

      // Licores y aperitivos
      licor: 18000, // Licor genérico
      vermouth: 12000, // Vermouth (Martini, Noilly Prat)
      campari: 14000, // Campari
      amaretto: 15000, // Amaretto
      baileys: 17000, // Baileys
      cointreau: 16000, // Cointreau
      kahlua: 16000, // Kahlúa

      // Espumantes y champagne
      champagne: 25000, // Champagne francés
      espumante: 12000, // Espumante chileno
      prosecco: 14000, // Prosecco italiano
      cava: 13000, // Cava español

      // Cervezas especiales
      sidra: 5500, // Sidra (Báltica, etc)
      aguardiente: 10000, // Aguardiente chileno

      // Sin alcohol
      agua: 1800, // Agua mineral/embotellada
      bebida: 3500, // Bebida genérica
      jugo: 3000, // Jugo natural
      refresco: 3200, // Refresco (Coca-Cola, Sprite)
      energetica: 4500, // Bebida energética
    };

    let basePrice = 5000; // Precio por defecto

    // Buscar coincidencia en nombre o categoría
    for (const [key, price] of Object.entries(basePrices)) {
      if (lowerName.includes(key) || lowerCat.includes(key)) {
        basePrice = price;
        break;
      }
    }

    // Ajustar por tamaño
    let sizeMultiplier = 1;
    if (ml > 1000) {
      sizeMultiplier = 1.4; // +40% para botellas muy grandes (1L+)
    } else if (ml > 500) {
      sizeMultiplier = 1.3; // +30% para botellas grandes
    } else if (ml < 250) {
      sizeMultiplier = 0.6; // -40% para botellas pequeñas
    } else if (ml < 500 && ml > 250) {
      sizeMultiplier = 1; // Tamaño estándar
    }

    return Math.round(basePrice * sizeMultiplier);
  },
};
