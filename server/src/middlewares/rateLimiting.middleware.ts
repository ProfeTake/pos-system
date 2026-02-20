import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Rate limiter general para API - simplificado para evitar IPv6 issues
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP
  message: {
    error: 'Demasiadas peticiones. Intenta de nuevo más tarde.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip en desarrollo
    return process.env.NODE_ENV === 'development';
  }
});

// Rate limiter para autenticación
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Solo 5 intentos de login
  message: {
    error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    return process.env.NODE_ENV === 'development';
  }
});

// Rate limiter para operaciones críticas
export const criticalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 requests por minuto
  message: {
    error: 'Demasiadas operaciones críticas. Reduce la velocidad.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    return process.env.NODE_ENV === 'development';
  }
});