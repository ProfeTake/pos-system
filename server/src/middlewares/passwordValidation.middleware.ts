import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';

/**
 * Validaciones de seguridad para contraseñas
 */
export class PasswordValidator {
  private static readonly MIN_LENGTH = 8;
  private static readonly MIN_UPPERCASE = 1;
  private static readonly MIN_LOWERCASE = 1;
  private static readonly MIN_NUMBERS = 1;
  private static readonly MIN_SPECIAL = 1;
  
  // Patrones comunes débiles
  private static readonly WEAK_PATTERNS = [
    /^123+/,           // 123456...
    /^abc+/i,          // abcdef...
    /^qwerty/i,        // qwerty...
    /^password/i,      // password...
    /^admin/i,         // admin...
    /^punto/i,         // punto...
    /(.)\1{3,}/,       // 4+ caracteres repetidos
    /^(\d{4})\1/,      // años repetidos (20242024)
  ];

  /**
   * Valida la fortaleza de una contraseña
   */
  static validate(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Longitud mínima
    if (password.length < this.MIN_LENGTH) {
      errors.push(`La contraseña debe tener al menos ${this.MIN_LENGTH} caracteres`);
    }

    // Mayúsculas
    const uppercaseCount = (password.match(/[A-Z]/g) || []).length;
    if (uppercaseCount < this.MIN_UPPERCASE) {
      errors.push('La contraseña debe contener al menos una letra mayúscula');
    }

    // Minúsculas
    const lowercaseCount = (password.match(/[a-z]/g) || []).length;
    if (lowercaseCount < this.MIN_LOWERCASE) {
      errors.push('La contraseña debe contener al menos una letra minúscula');
    }

    // Números
    const numberCount = (password.match(/[0-9]/g) || []).length;
    if (numberCount < this.MIN_NUMBERS) {
      errors.push('La contraseña debe contener al menos un número');
    }

    // Caracteres especiales
    const specialCount = (password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;
    if (specialCount < this.MIN_SPECIAL) {
      errors.push('La contraseña debe contener al menos un carácter especial (!@#$%^&*...)');
    }

    // Patrones débiles
    for (const pattern of this.WEAK_PATTERNS) {
      if (pattern.test(password)) {
        errors.push('La contraseña contiene un patrón común muy débil');
        break;
      }
    }

    // Verificar que no sea solo números (tipo PIN)
    if (/^\d+$/.test(password)) {
      errors.push('La contraseña no puede ser solo números');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Genera una contraseña segura aleatoria
   */
  static generate(length: number = 12): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    // Garantizar al menos uno de cada tipo
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Completar el resto
    const allChars = uppercase + lowercase + numbers + special;
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Mezclar caracteres
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Valida que la nueva contraseña sea diferente a la anterior
   */
  static async isDifferentFromCurrent(newPassword: string, currentHash: string): Promise<boolean> {
    if (!currentHash) return true;
    return !(await bcrypt.compare(newPassword, currentHash));
  }
}

/**
 * Middleware para validar contraseñas en requests de cambio/creación
 */
export const validatePasswordStrength = (passwordField: string = 'password') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const password = req.body[passwordField];
    
    if (!password) {
      return res.status(400).json({
        error: 'Contraseña requerida',
        field: passwordField
      });
    }

    const validation = PasswordValidator.validate(password);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Contraseña no cumple con los requisitos de seguridad',
        details: validation.errors,
        field: passwordField
      });
    }

    next();
  };
};

/**
 * Middleware para verificar que la nueva contraseña sea diferente a la actual
 */
export const validatePasswordChange = (passwordField: string = 'password') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const newPassword = req.body[passwordField];
      const user = (req as any).user; // Viene del middleware de auth
      
      if (user?.passwordHash) {
        const isDifferent = await PasswordValidator.isDifferentFromCurrent(
          newPassword, 
          user.passwordHash
        );
        
        if (!isDifferent) {
          return res.status(400).json({
            error: 'La nueva contraseña debe ser diferente a la actual',
            field: passwordField
          });
        }
      }
      
      next();
    } catch (error) {
      console.error('Error validating password change:', error);
      res.status(500).json({
        error: 'Error interno validando contraseña'
      });
    }
  };
};

/**
 * Función para hashear contraseña con salt fuerte
 */
export const hashPasswordSecure = async (password: string): Promise<string> => {
  const saltRounds = process.env.NODE_ENV === 'production' ? 12 : 10;
  return bcrypt.hash(password, saltRounds);
};

/**
 * Función para comparar contraseñas de forma timing-safe
 */
export const comparePasswordSecure = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};