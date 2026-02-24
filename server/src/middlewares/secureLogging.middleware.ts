import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

/**
 * Logger seguro que no loggea información sensible
 */
export class SecureLogger {
  private static logDir = path.join(__dirname, '../../../logs');
  private static readonly SENSITIVE_FIELDS = [
    'password', 'passwordHash', 'token', 'jwt', 'secret', 'key',
    'authorization', 'cookie', 'session', 'csrf'
  ];

  static {
    // Crear directorio de logs si no existe
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Sanitiza objetos removiendo campos sensibles
   */
  private static sanitizeObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      
      // Ocultar campos sensibles
      if (this.SENSITIVE_FIELDS.some(field => keyLower.includes(field))) {
        sanitized[key] = '[HIDDEN]';
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Log de eventos de seguridad
   */
  static logSecurity(event: string, details: any, req?: Request) {
    const timestamp = new Date().toISOString();
    const ip = req?.ip || 'unknown';
    const userAgent = req?.get('User-Agent') || 'unknown';
    const userId = (req as any)?.user?.id || 'anonymous';
    
    const logEntry = {
      timestamp,
      type: 'SECURITY',
      event,
      ip,
      userId,
      userAgent: userAgent.substring(0, 200), // Truncar UA muy largos
      details: this.sanitizeObject(details)
    };

    this.writeLog('security.log', logEntry);
    
    // También log en consola en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.warn(`🔒 SECURITY: ${event} from ${ip}`, this.sanitizeObject(details));
    }
  }

  /**
   * Log de errores
   */
  static logError(error: Error, req?: Request, context?: string) {
    const timestamp = new Date().toISOString();
    const ip = req?.ip || 'unknown';
    const userId = (req as any)?.user?.id || 'anonymous';
    const url = req ? `${req.method} ${req.path}` : 'unknown';
    
    const logEntry = {
      timestamp,
      type: 'ERROR',
      context,
      error: {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : '[HIDDEN]',
        name: error.name
      },
      request: {
        ip,
        userId,
        url,
        body: req?.body ? this.sanitizeObject(req.body) : undefined
      }
    };

    this.writeLog('error.log', logEntry);
  }

  /**
   * Log de acceso (requests)
   */
  static logAccess(req: Request, res: Response, duration: number) {
    // Solo loggear en producción para no ser verboso
    if (process.env.NODE_ENV !== 'production') return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      type: 'ACCESS',
      method: req.method,
      url: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 100),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: (req as any)?.user?.id || null
    };

    this.writeLog('access.log', logEntry);
  }

  /**
   * Escribe log al archivo
   */
  private static writeLog(filename: string, logEntry: any) {
    try {
      const logPath = path.join(this.logDir, filename);
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(logPath, logLine);
    } catch (error) {
      console.error('Error writing log:', error);
    }
  }

  /**
   * Rotar logs (llamar diariamente via cron)
   */
  static rotateLogs() {
    // Usar fecha local Chile (no UTC) para rotación de logs
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const files = ['security.log', 'error.log', 'access.log'];
    
    files.forEach(file => {
      const currentPath = path.join(this.logDir, file);
      const rotatedPath = path.join(this.logDir, `${date}-${file}`);
      
      if (fs.existsSync(currentPath)) {
        fs.renameSync(currentPath, rotatedPath);
      }
    });
  }
}

/**
 * Middleware para logging seguro de requests
 */
export const secureLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Capturar cuando termina la response
  const originalSend = res.send;
  res.send = function(body: any) {
    const duration = Date.now() - startTime;
    SecureLogger.logAccess(req, res, duration);
    return originalSend.call(this, body);
  };

  next();
};

/**
 * Handler de errores que loggea de forma segura
 */
export const secureErrorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  SecureLogger.logError(error, req, 'Express Error Handler');
  
  // En producción, no exponer detalles del error
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substring(7)
    });
  } else {
    res.status(500).json({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};