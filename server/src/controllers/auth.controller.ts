import { Request, Response } from "express";
import { db } from "../db";
import { users } from "../db/schema";
import { eq, or } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { comparePasswordSecure, hashPasswordSecure } from "../middlewares/passwordValidation.middleware";
import { SecureLogger } from "../middlewares/secureLogging.middleware";
import { AuthRequest } from "../middlewares/auth.middleware";

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    // Validar que se proporcionen credenciales
    if (!username || !password) {
      SecureLogger.logSecurity('LOGIN_ATTEMPT_MISSING_CREDENTIALS', {
        username: username || null,
        hasPassword: !!password
      }, req);
      
      return res.status(400).json({ 
        message: "Username y password son requeridos" 
      });
    }

    // Buscar por username O email
    const [user] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.username, username),
          eq(users.email, username)
        )
      )
      .limit(1);

    if (!user) {
      SecureLogger.logSecurity('LOGIN_ATTEMPT_USER_NOT_FOUND', {
        username,
        ip: req.ip
      }, req);
      
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    // Verificar si el usuario está activo
    if (user.active === false) {
      SecureLogger.logSecurity('LOGIN_ATTEMPT_INACTIVE_USER', {
        userId: user.id,
        username: user.username
      }, req);
      
      return res
        .status(401)
        .json({ message: "Usuario desactivado. Contacta al administrador." });
    }

    const validPassword = await comparePasswordSecure(password, user.passwordHash);
    if (!validPassword) {
      SecureLogger.logSecurity('LOGIN_ATTEMPT_INVALID_PASSWORD', {
        userId: user.id,
        username: user.username,
        ip: req.ip
      }, req);
      
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    // Login exitoso
    SecureLogger.logSecurity('LOGIN_SUCCESS', {
      userId: user.id,
      username: user.username,
      role: user.role
    }, req);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);
    if (!user) return res.sendStatus(404);

    // Unificar formato con /login: devolver { user: {...} }
    // (El frontend esperaba esta forma y limpiaba el token al no encontrarla)
    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    res.sendStatus(500);
  }
};

export const logout = (req: Request, res: Response) => {
  res.json({ message: "Logged out" });
};
