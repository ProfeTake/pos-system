// Declaraciones de tipos para módulos externos que no tienen tipos disponibles
// o para evitar errores de importación

declare module "better-sqlite3" {
  const Database: any;
  export default Database;
}

declare module 'ioredis' {
  interface RedisOptions {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    enableReadyCheck?: boolean;
    maxRetriesPerRequest?: number | null;
    retryStrategy?: (times: number) => number | void | null;
    lazyConnect?: boolean;
  }

  class Redis {
    constructor(options?: RedisOptions | string);
    constructor(port: number, host?: string, options?: RedisOptions);
    
    // Métodos básicos
    get(key: string): Promise<string | null>;
    set(key: string, value: string, exMode?: 'EX' | 'PX', time?: number): Promise<'OK' | null>;
    setex(key: string, seconds: number, value: string): Promise<'OK'>;
    del(...keys: string[]): Promise<number>;
    keys(pattern: string): Promise<string[]>;
    exists(...keys: string[]): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    ttl(key: string): Promise<number>;
    incr(key: string): Promise<number>;
    decr(key: string): Promise<number>;
    
    // Hash
    hget(key: string, field: string): Promise<string | null>;
    hset(key: string, field: string, value: string): Promise<number>;
    hgetall(key: string): Promise<Record<string, string>>;
    hdel(key: string, ...fields: string[]): Promise<number>;
    
    // List
    lpush(key: string, ...values: string[]): Promise<number>;
    rpush(key: string, ...values: string[]): Promise<number>;
    lpop(key: string): Promise<string | null>;
    rpop(key: string): Promise<string | null>;
    lrange(key: string, start: number, stop: number): Promise<string[]>;
    
    // Set
    sadd(key: string, ...members: string[]): Promise<number>;
    smembers(key: string): Promise<string[]>;
    srem(key: string, ...members: string[]): Promise<number>;
    
    // Conexión
    connect(): Promise<void>;
    disconnect(): void;
    quit(): Promise<'OK'>;
    ping(): Promise<'PONG'>;
    
    // Eventos
    on(event: 'ready', listener: () => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'close', listener: () => void): this;
    on(event: 'connect', listener: () => void): this;
    on(event: 'reconnecting', listener: () => void): this;
    
    // Estado
    status: 'wait' | 'reconnecting' | 'connecting' | 'connect' | 'ready' | 'close' | 'end';
  }

  export = Redis;
  export default Redis;
}
