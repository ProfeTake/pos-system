/**
 * Servicio de Cache Universal
 * 
 * Implementación que soporta:
 * - Cache en memoria (por defecto)
 * - Redis (cuando REDIS_URL está configurado)
 * 
 * Uso:
 * ```typescript
 * import { cacheService } from "./cache.service";
 * 
 * // Guardar
 * await cacheService.set("key", value, 3600); // TTL en segundos
 * 
 * // Obtener
 * const value = await cacheService.get<MyType>("key");
 * 
 * // Invalidar
 * await cacheService.del("key");
 * await cacheService.delPattern("products:*");
 * ```
 */

// Interface para diferentes implementaciones de cache
interface ICacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<number>;
  clear(): Promise<void>;
  keys(pattern: string): Promise<string[]>;
}

// ============================================================
// IN-MEMORY CACHE STORE
// ============================================================

class MemoryCacheStore implements ICacheStore {
  private cache = new Map<string, { value: string; expiresAt: number | null }>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Limpiar entradas expiradas cada 5 minutos
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const expiresAt = ttl ? Date.now() + ttl * 1000 : null;
    this.cache.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async delPattern(pattern: string): Promise<number> {
    // Convertir patrón glob a regex
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
    );
    
    let count = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
    );
    
    const result: string[] = [];
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        result.push(key);
      }
    }
    return result;
  }

  getSize(): number {
    return this.cache.size;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// ============================================================
// REDIS CACHE STORE (cuando esté disponible)
// ============================================================

class RedisCacheStore implements ICacheStore {
  private client: any; // ioredis client
  private connected: boolean = false;

  constructor(redisUrl: string) {
    this.initRedis(redisUrl);
  }

  private async initRedis(redisUrl: string): Promise<void> {
    try {
      // Importación dinámica de ioredis
      const Redis = (await import("ioredis")).default;
      this.client = new Redis(redisUrl);

      this.client.on("connect", () => {
        console.log("✅ Redis connected");
        this.connected = true;
      });

      this.client.on("error", (err: Error) => {
        console.error("Redis error:", err);
        this.connected = false;
      });
    } catch (error) {
      console.warn("Redis not available, using memory cache");
      this.connected = false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.connected || !this.client) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.connected || !this.client) return;
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error("Redis set error:", error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.connected || !this.client) return;
    try {
      await this.client.del(key);
    } catch (error) {
      console.error("Redis del error:", error);
    }
  }

  async delPattern(pattern: string): Promise<number> {
    if (!this.connected || !this.client) return 0;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        return await this.client.del(...keys);
      }
      return 0;
    } catch (error) {
      console.error("Redis delPattern error:", error);
      return 0;
    }
  }

  async clear(): Promise<void> {
    if (!this.connected || !this.client) return;
    try {
      await this.client.flushdb();
    } catch (error) {
      console.error("Redis clear error:", error);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.connected || !this.client) return [];
    try {
      return await this.client.keys(pattern);
    } catch {
      return [];
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// ============================================================
// CACHE SERVICE
// ============================================================

class CacheService {
  private memoryStore: MemoryCacheStore;
  private redisStore: RedisCacheStore | null = null;
  private prefix: string;
  
  // Estadísticas
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  constructor() {
    this.memoryStore = new MemoryCacheStore();
    this.prefix = process.env.CACHE_PREFIX || "pos:";
    
    // Inicializar Redis si está configurado
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redisStore = new RedisCacheStore(redisUrl);
    }
  }

  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Obtiene un valor del cache
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getFullKey(key);
    
    try {
      // Primero intentar Redis
      if (this.redisStore) {
        const value = await this.redisStore.get(fullKey);
        if (value) {
          this.stats.hits++;
          return JSON.parse(value) as T;
        }
      }
      
      // Fallback a memoria
      const memValue = await this.memoryStore.get(fullKey);
      if (memValue) {
        this.stats.hits++;
        return JSON.parse(memValue) as T;
      }
      
      this.stats.misses++;
      return null;
    } catch (error) {
      console.error("Cache get error:", error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Guarda un valor en el cache
   * @param key - Clave
   * @param value - Valor a guardar
   * @param ttl - Tiempo de vida en segundos (default: 1 hora)
   */
  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    const fullKey = this.getFullKey(key);
    const serialized = JSON.stringify(value);
    
    try {
      // Guardar en ambos stores
      await this.memoryStore.set(fullKey, serialized, ttl);
      
      if (this.redisStore) {
        await this.redisStore.set(fullKey, serialized, ttl);
      }
      
      this.stats.sets++;
    } catch (error) {
      console.error("Cache set error:", error);
    }
  }

  /**
   * Elimina un valor del cache
   */
  async del(key: string): Promise<void> {
    const fullKey = this.getFullKey(key);
    
    try {
      await this.memoryStore.del(fullKey);
      if (this.redisStore) {
        await this.redisStore.del(fullKey);
      }
      this.stats.deletes++;
    } catch (error) {
      console.error("Cache del error:", error);
    }
  }

  /**
   * Elimina múltiples valores por patrón
   * Ejemplo: delPattern("products:*") elimina todas las claves que empiezan con products:
   */
  async delPattern(pattern: string): Promise<number> {
    const fullPattern = this.getFullKey(pattern);
    
    let count = 0;
    try {
      count += await this.memoryStore.delPattern(fullPattern);
      if (this.redisStore) {
        count += await this.redisStore.delPattern(fullPattern);
      }
      this.stats.deletes += count;
    } catch (error) {
      console.error("Cache delPattern error:", error);
    }
    return count;
  }

  /**
   * Obtiene un valor del cache o lo calcula y guarda
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Limpia todo el cache
   */
  async clear(): Promise<void> {
    await this.memoryStore.clear();
    if (this.redisStore) {
      await this.redisStore.clear();
    }
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  /**
   * Obtiene estadísticas del cache
   */
  getStats(): {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    hitRate: number;
    memorySize: number;
    redisConnected: boolean;
  } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
      memorySize: this.memoryStore.getSize(),
      redisConnected: this.redisStore?.isConnected() || false,
    };
  }

  /**
   * Genera una clave de cache basada en parámetros
   */
  static key(...parts: (string | number | undefined | null)[]): string {
    return parts
      .filter((p) => p !== undefined && p !== null)
      .map(String)
      .join(":");
  }
}

// Exportar instancia singleton
export const cacheService = new CacheService();
export default cacheService;

// Exportar generador de claves
export const cacheKey = CacheService.key;

// Constantes de TTL comunes
export const CACHE_TTL = {
  SHORT: 60, // 1 minuto
  MEDIUM: 300, // 5 minutos
  DEFAULT: 3600, // 1 hora
  LONG: 86400, // 24 horas
  WEEK: 604800, // 1 semana
};
