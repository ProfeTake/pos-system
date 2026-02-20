import Anthropic from "@anthropic-ai/sdk";

// ============================================
// TYPES & INTERFACES
// ============================================

interface ClaudeProductData {
  codigo_barra: string;
  nombre: string;
  marca?: string;
  categoria: string;
  subcategoria?: string;
  precio_sugerido?: number;
  precio_compra_estimado?: number;
  unidad_medida: "ml" | "g" | "none";
  cantidad_unitaria: number;
  descripcion?: string;
  imagen_url?: string;
  encontrado: boolean;
  confianza: "alta" | "media" | "baja";
  fuente?: string;
}

interface BufferStatus {
  buffer_count: number;
  should_process: boolean;
  buffer_limit: number;
  codes: string[];
}

interface ProcessResult {
  success: boolean;
  productos: ClaudeProductData[];
  errors: string[];
  processedCount: number;
  notFoundCount: number;
  fromCache?: number;
  metrics?: ApiMetrics;
}

interface BusinessContext {
  tipo_negocio: string;
  ubicacion: string;
  moneda: string;
}

interface ApiMetrics {
  totalCalls: number;
  totalTokensUsed: number;
  estimatedCostUSD: number;
  averageResponseTime: number;
  lastCallTimestamp: string;
}

// ============================================
// CLAUDE CATALOG SERVICE
// ============================================

/**
 * Servicio de catalogación masiva con Claude AI.
 *
 * Gestiona un buffer de códigos de barras, genera prompts contextualizados
 * con las categorías del sistema, llama a la API de Anthropic con búsqueda web,
 * y parsea las respuestas JSON validando los datos obtenidos.
 *
 * @class ClaudeCatalogService
 */
export class ClaudeCatalogService {
  private client: Anthropic | null = null;
  private buffer: string[] = [];
  private processing = false;
  private lastProcessed: Date | null = null;

  // 💾 Caché de productos ya procesados (ahorro de costos)
  private cache: Map<string, ClaudeProductData> = new Map();
  private readonly CACHE_MAX_SIZE = 1000; // Máximo de productos en caché
  private readonly CACHE_EXPIRY_HOURS = 24; // Expiración de caché
  private cacheTimestamps: Map<string, number> = new Map();

  // 📊 Métricas de uso de API
  private metrics: ApiMetrics = {
    totalCalls: 0,
    totalTokensUsed: 0,
    estimatedCostUSD: 0,
    averageResponseTime: 0,
    lastCallTimestamp: new Date().toISOString(),
  };
  private responseTimes: number[] = [];

  // Configuración
  private readonly BUFFER_LIMIT = 10; // Mínimo de códigos para procesar
  private readonly MAX_BUFFER_SIZE = 50; // Máximo de códigos en buffer
  private readonly API_TIMEOUT = 120000; // 2 minutos
  private readonly MAX_TOKENS = 4096;
  private readonly RATE_LIMIT_DELAY = 1000; // 1 segundo entre llamadas
  private readonly MAX_RETRIES = 3; // Reintentos máximos

  constructor() {
    this.initializeClient();
  }

  /**
   * Inicializa el cliente de Anthropic con la API key del entorno.
   */
  private initializeClient(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.warn(
        "[ClaudeCatalogService] ANTHROPIC_API_KEY no configurada. El servicio no estará disponible."
      );
      return;
    }

    try {
      this.client = new Anthropic({
        apiKey,
        timeout: this.API_TIMEOUT,
      });
      this.log("info", "Cliente Anthropic inicializado correctamente.");
    } catch (error) {
      this.log("error", "Error al inicializar cliente:", error);
    }
  }

  /**
   * Sistema de logging mejorado con niveles.
   */
  private log(
    level: "info" | "warn" | "error" | "debug",
    message: string,
    data?: any
  ): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [ClaudeCatalog] [${level.toUpperCase()}]`;

    if (data) {
      console[level](`${prefix} ${message}`, data);
    } else {
      console[level](`${prefix} ${message}`);
    }
  }

  /**
   * Limpia el caché eliminando entradas expiradas.
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    const expiryMs = this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
    let removed = 0;

    for (const [code, timestamp] of this.cacheTimestamps.entries()) {
      if (now - timestamp > expiryMs) {
        this.cache.delete(code);
        this.cacheTimestamps.delete(code);
        removed++;
      }
    }

    if (removed > 0) {
      this.log("debug", `Limpieza de caché: ${removed} entradas eliminadas`);
    }
  }

  /**
   * Obtiene un producto del caché si existe y no ha expirado.
   */
  private getFromCache(barcode: string): ClaudeProductData | null {
    const now = Date.now();
    const timestamp = this.cacheTimestamps.get(barcode);

    if (!timestamp) return null;

    const expiryMs = this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
    if (now - timestamp > expiryMs) {
      this.cache.delete(barcode);
      this.cacheTimestamps.delete(barcode);
      return null;
    }

    return this.cache.get(barcode) || null;
  }

  /**
   * Guarda un producto en el caché.
   */
  private saveToCache(product: ClaudeProductData): void {
    // Limitar tamaño del caché
    if (this.cache.size >= this.CACHE_MAX_SIZE) {
      // Eliminar la entrada más antigua
      const oldestKey = this.cacheTimestamps.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.cacheTimestamps.delete(oldestKey);
      }
    }

    this.cache.set(product.codigo_barra, product);
    this.cacheTimestamps.set(product.codigo_barra, Date.now());
  }

  /**
   * Actualiza las métricas de uso de la API.
   */
  private updateMetrics(tokensUsed: number, responseTime: number): void {
    this.metrics.totalCalls++;
    this.metrics.totalTokensUsed += tokensUsed;
    this.metrics.lastCallTimestamp = new Date().toISOString();

    // Calcular costo estimado (Claude 3.7 Sonnet: ~$3 per 1M input tokens, ~$15 per 1M output tokens)
    // Aproximación: 50% input, 50% output
    const avgCostPer1MTokens = 9; // USD
    this.metrics.estimatedCostUSD +=
      (tokensUsed / 1000000) * avgCostPer1MTokens;

    // Calcular tiempo de respuesta promedio
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift(); // Mantener solo últimas 100 llamadas
    }
    this.metrics.averageResponseTime =
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
  }

  /**
   * Implementa delay para rate limiting.
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Genera el JSON Schema para la respuesta estructurada.
   */
  private getProductSchema() {
    return {
      type: "object" as const,
      properties: {
        productos: {
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              codigo_barra: { type: "string" as const },
              nombre: { type: ["string", "null"] as const },
              marca: { type: ["string", "null"] as const },
              categoria: { type: ["string", "null"] as const },
              subcategoria: { type: ["string", "null"] as const },
              precio_sugerido: { type: ["number", "null"] as const },
              precio_compra_estimado: { type: ["number", "null"] as const },
              unidad_medida: {
                type: "string" as const,
                enum: ["ml", "g", "none"],
              },
              cantidad_unitaria: { type: "number" as const },
              descripcion: { type: ["string", "null"] as const },
              imagen_url: { type: ["string", "null"] as const },
              encontrado: { type: "boolean" as const },
              confianza: {
                type: "string" as const,
                enum: ["alta", "media", "baja"],
              },
              fuente: { type: ["string", "null"] as const },
            },
            required: ["codigo_barra", "encontrado", "confianza"],
          },
        },
      },
      required: ["productos"],
    };
  }

  /**
   * Realiza una llamada a la API con reintentos automáticos.
   * Usa el modo de respuesta estructurada (tool_use) para garantizar JSON válido.
   */
  private async callClaudeWithRetry(
    prompt: string,
    attempt: number = 1
  ): Promise<Anthropic.Messages.Message> {
    try {
      // Rate limiting
      if (attempt > 1) {
        const backoffMs = this.RATE_LIMIT_DELAY * Math.pow(2, attempt - 1);
        this.log(
          "info",
          `Reintentando en ${backoffMs}ms (intento ${attempt}/${this.MAX_RETRIES})...`
        );
        await this.sleep(backoffMs);
      } else {
        await this.sleep(this.RATE_LIMIT_DELAY);
      }

      const startTime = Date.now();

      // Usar tool_use para forzar respuesta JSON estructurada
      const message = await this.client!.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: this.MAX_TOKENS,
        tools: [
          {
            name: "registrar_productos",
            description:
              "Registra los productos encontrados en el catálogo. Debes usar esta herramienta para devolver los resultados.",
            input_schema: this.getProductSchema(),
          },
        ],
        tool_choice: { type: "tool", name: "registrar_productos" },
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const responseTime = Date.now() - startTime;

      // Actualizar métricas
      const tokensUsed =
        message.usage.input_tokens + message.usage.output_tokens;
      this.updateMetrics(tokensUsed, responseTime);

      this.log(
        "info",
        `Respuesta recibida en ${responseTime}ms (${tokensUsed} tokens)`
      );

      return message;
    } catch (error: any) {
      this.log(
        "error",
        `Error en llamada a Claude (intento ${attempt}):`,
        error.message
      );

      // Reintentar si no hemos alcanzado el máximo
      if (attempt < this.MAX_RETRIES) {
        // Errores que vale la pena reintentar
        const retryableErrors = [
          "ECONNRESET",
          "ETIMEDOUT",
          "ENOTFOUND",
          "rate_limit",
          "overloaded",
          "timeout",
        ];

        const shouldRetry = retryableErrors.some((err) =>
          error.message?.toLowerCase().includes(err.toLowerCase())
        );

        if (shouldRetry) {
          this.log("warn", `Error recuperable, reintentando...`);
          return this.callClaudeWithRetry(prompt, attempt + 1);
        }
      }

      throw error;
    }
  }

  /**
   * Verifica si el servicio está disponible (API key configurada).
   */
  public isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Agrega un código de barras al buffer.
   *
   * @param barcode - Código de barras a agregar
   * @returns Estado actual del buffer
   */
  public addBarcodeToBuffer(barcode: string): BufferStatus {
    const normalizedCode = barcode.trim();

    if (!normalizedCode) {
      throw new Error("Código de barras vacío");
    }

    // Evitar duplicados en el buffer
    if (this.buffer.includes(normalizedCode)) {
      this.log("debug", `Código duplicado ignorado: ${normalizedCode}`);
      return this.getBufferStatus();
    }

    // Validar límite máximo
    if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
      throw new Error(`Buffer lleno. Máximo ${this.MAX_BUFFER_SIZE} códigos.`);
    }

    this.buffer.push(normalizedCode);
    this.log(
      "debug",
      `Código agregado al buffer: ${normalizedCode} (${this.buffer.length}/${this.BUFFER_LIMIT})`
    );

    return this.getBufferStatus();
  }

  /**
   * Obtiene el estado actual del buffer.
   */
  public getBufferStatus(): BufferStatus {
    return {
      buffer_count: this.buffer.length,
      should_process: this.buffer.length >= this.BUFFER_LIMIT,
      buffer_limit: this.BUFFER_LIMIT,
      codes: [...this.buffer],
    };
  }

  /**
   * Limpia el buffer de códigos.
   */
  public clearBuffer(): void {
    const count = this.buffer.length;
    this.buffer = [];
    this.log("info", `Buffer limpiado (${count} códigos eliminados)`);
  }

  /**
   * Genera un prompt optimizado para Claude AI.
   *
   * @param barcodes - Lista de códigos de barras
   * @param categories - Categorías disponibles en el sistema
   * @param context - Contexto del negocio
   * @returns Prompt formateado
   */
  private generatePrompt(
    barcodes: string[],
    categories: string[],
    context: BusinessContext
  ): string {
    return `# CONTEXTO DEL SISTEMA
Eres un asistente de catalogación de inventario para un ${
      context.tipo_negocio
    } en ${context.ubicacion}.
Tu misión es identificar productos basándote en tu conocimiento de productos chilenos.

# CATEGORÍAS VÁLIDAS (USAR SOLO ESTAS)
${categories.map((cat) => `- ${cat}`).join("\n")}

# CÓDIGOS A PROCESAR
${barcodes.map((code, i) => `${i + 1}. ${code}`).join("\n")}

# INSTRUCCIONES

Para cada código de barras:
1. Identifica el producto si lo conoces (marcas chilenas comunes: CCU, Coca-Cola, Lider, Jumbo, etc.)
2. Los códigos que empiezan con 780 son chilenos
3. Si NO conoces el producto con certeza, marca encontrado: false
4. Asigna la categoría más cercana de la lista

# IMPORTANTE
- Usa la herramienta "registrar_productos" para devolver los resultados
- Si no conoces un producto, devuelve encontrado: false con valores null
- Precios en CLP (pesos chilenos), solo números enteros
- Es mejor NO encontrar que inventar datos falsos`;
  }

  /**
   * Parsea y valida la respuesta de Claude AI usando tool_use.
   * Esto garantiza JSON válido ya que Claude lo valida contra el schema.
   *
   * @param message - Mensaje de respuesta de la API de Anthropic
   * @returns Productos encontrados
   */
  private parseClaudeResponse(
    message: Anthropic.Messages.Message
  ): ClaudeProductData[] {
    try {
      // Buscar el bloque tool_use en la respuesta
      const toolUseBlock = message.content.find(
        (block) =>
          block.type === "tool_use" && block.name === "registrar_productos"
      );

      if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
        this.log(
          "warn",
          "No se encontró tool_use, intentando parseo legacy..."
        );
        // Fallback al método legacy si no hay tool_use
        const textBlock = message.content.find((c) => c.type === "text");
        if (textBlock && textBlock.type === "text") {
          return this.parseLegacyResponse(textBlock.text);
        }
        throw new Error("Respuesta de Claude no contiene tool_use ni texto");
      }

      // El input ya viene como objeto JSON válido gracias a tool_use
      const input = toolUseBlock.input as { productos: any[] };

      if (!input.productos || !Array.isArray(input.productos)) {
        throw new Error("Respuesta tool_use no contiene array de productos");
      }

      this.log(
        "info",
        `✅ Parseados ${input.productos.length} productos desde tool_use (JSON garantizado)`
      );

      // Validar y limpiar cada producto
      return input.productos.map((p: any) => this.cleanProductData(p));
    } catch (error: any) {
      this.log("error", "Error al parsear respuesta:", error.message);
      throw new Error(`Error al parsear respuesta de Claude: ${error.message}`);
    }
  }

  /**
   * Limpia y valida los datos de un producto.
   */
  private cleanProductData(p: any): ClaudeProductData {
    const cleanString = (str: any): string | undefined => {
      if (str === null || str === undefined) return undefined;
      return (
        String(str)
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
          .trim() || undefined
      );
    };

    return {
      codigo_barra: String(p.codigo_barra || ""),
      nombre: cleanString(p.nombre) || "Producto sin nombre",
      marca: cleanString(p.marca),
      categoria: cleanString(p.categoria) || "Otros",
      subcategoria: cleanString(p.subcategoria),
      precio_sugerido:
        p.precio_sugerido != null ? Number(p.precio_sugerido) : undefined,
      precio_compra_estimado:
        p.precio_compra_estimado != null
          ? Number(p.precio_compra_estimado)
          : undefined,
      unidad_medida: ["ml", "g", "none"].includes(p.unidad_medida)
        ? p.unidad_medida
        : "none",
      cantidad_unitaria: p.cantidad_unitaria ? Number(p.cantidad_unitaria) : 0,
      descripcion: cleanString(p.descripcion),
      imagen_url: cleanString(p.imagen_url),
      encontrado: Boolean(p.encontrado),
      confianza: ["alta", "media", "baja"].includes(p.confianza)
        ? p.confianza
        : "baja",
      fuente: cleanString(p.fuente),
    };
  }

  /**
   * Método legacy para parsear respuestas de texto (fallback).
   */
  private parseLegacyResponse(response: string): ClaudeProductData[] {
    let jsonContent = response.trim();

    // Intentar extraer bloque de código JSON
    const jsonBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      jsonContent = jsonBlockMatch[1];
    } else {
      const arrayMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) {
        jsonContent = arrayMatch[0];
      }
    }

    // Limpiar JSON
    const cleanResponse = jsonContent
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, " ")
      .replace(/,\s*([}\]])/g, "$1");

    const productos = JSON.parse(cleanResponse);

    if (!Array.isArray(productos)) {
      throw new Error("Respuesta no es un array");
    }

    return productos.map((p: any) => this.cleanProductData(p));
  }

  /**
   * Procesa el batch de códigos con Claude AI.
   *
   * @param categories - Categorías disponibles en el sistema
   * @param context - Contexto del negocio (opcional)
   * @returns Resultado del procesamiento
   */
  public async processBatch(
    categories: string[],
    context?: Partial<BusinessContext>
  ): Promise<ProcessResult> {
    if (this.processing) {
      throw new Error("Ya hay un procesamiento en curso");
    }

    if (this.buffer.length < this.BUFFER_LIMIT) {
      throw new Error(
        `Buffer insuficiente. Mínimo ${this.BUFFER_LIMIT} códigos (actual: ${this.buffer.length})`
      );
    }

    // Contexto por defecto
    const businessContext: BusinessContext = {
      tipo_negocio: context?.tipo_negocio || "retail de bebidas y alimentos",
      ubicacion: context?.ubicacion || "Chile",
      moneda: context?.moneda || "CLP",
    };

    this.processing = true;
    const barcodes = [...this.buffer];
    const errors: string[] = [];
    let fromCacheCount = 0;

    try {
      this.log(
        "info",
        `🚀 Iniciando procesamiento de ${barcodes.length} códigos...`
      );

      // 💾 PASO 1: Verificar caché
      this.cleanExpiredCache();
      const cachedProducts: ClaudeProductData[] = [];
      const barcodesToProcess: string[] = [];

      for (const barcode of barcodes) {
        const cached = this.getFromCache(barcode);
        if (cached) {
          cachedProducts.push(cached);
          fromCacheCount++;
        } else {
          barcodesToProcess.push(barcode);
        }
      }

      this.log(
        "info",
        `📦 Caché: ${fromCacheCount} productos, ${barcodesToProcess.length} a procesar`
      );

      let newProducts: ClaudeProductData[] = [];

      // 🌐 PASO 2: Procesar códigos no cacheados
      if (barcodesToProcess.length > 0) {
        // Generar prompt
        const prompt = this.generatePrompt(
          barcodesToProcess,
          categories,
          businessContext
        );

        // Llamar a Claude AI con reintentos (ahora usa tool_use)
        const message = await this.callClaudeWithRetry(prompt);

        // Parsear respuesta (ahora acepta el mensaje completo para tool_use)
        newProducts = this.parseClaudeResponse(message);

        // 💾 Guardar en caché
        for (const product of newProducts) {
          if (product.encontrado) {
            this.saveToCache(product);
          }
        }

        this.log(
          "info",
          `💾 ${
            newProducts.filter((p) => p.encontrado).length
          } productos guardados en caché`
        );
      }

      // Combinar resultados
      const productos = [...cachedProducts, ...newProducts];

      // Estadísticas
      const foundCount = productos.filter((p) => p.encontrado).length;
      const notFoundCount = productos.length - foundCount;

      this.log(
        "info",
        `✅ Completado: ${foundCount} encontrados, ${notFoundCount} no encontrados, ${fromCacheCount} desde caché`
      );

      // Limpiar buffer después del procesamiento exitoso
      this.clearBuffer();
      this.lastProcessed = new Date();

      return {
        success: true,
        productos,
        errors,
        processedCount: foundCount,
        notFoundCount,
        fromCache: fromCacheCount,
        metrics: { ...this.metrics },
      };
    } catch (error: any) {
      this.log("error", "❌ Error en procesamiento:", error.message);

      errors.push(error.message || "Error desconocido");

      return {
        success: false,
        productos: [],
        errors,
        processedCount: 0,
        notFoundCount: 0,
        fromCache: fromCacheCount,
        metrics: { ...this.metrics },
      };
    } finally {
      this.processing = false;
    }
  }

  /**
   * Obtiene el estado del servicio.
   */
  public getStatus() {
    return {
      available: this.isAvailable(),
      processing: this.processing,
      buffer: this.getBufferStatus(),
      lastProcessed: this.lastProcessed?.toISOString() || null,
      cache: {
        size: this.cache.size,
        maxSize: this.CACHE_MAX_SIZE,
        expiryHours: this.CACHE_EXPIRY_HOURS,
      },
      metrics: { ...this.metrics },
    };
  }

  /**
   * Obtiene las métricas detalladas de uso de la API.
   */
  public getMetrics(): ApiMetrics {
    return { ...this.metrics };
  }

  /**
   * Limpia el caché manualmente.
   */
  public clearCache(): number {
    const size = this.cache.size;
    this.cache.clear();
    this.cacheTimestamps.clear();
    this.log("info", `Caché limpiado manualmente (${size} entradas)`);
    return size;
  }

  /**
   * Reinicia las métricas.
   */
  public resetMetrics(): void {
    this.metrics = {
      totalCalls: 0,
      totalTokensUsed: 0,
      estimatedCostUSD: 0,
      averageResponseTime: 0,
      lastCallTimestamp: new Date().toISOString(),
    };
    this.responseTimes = [];
    this.log("info", "Métricas reiniciadas");
  }
}

// Singleton instance
export const claudeCatalogService = new ClaudeCatalogService();
