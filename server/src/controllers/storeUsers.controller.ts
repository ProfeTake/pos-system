import { Request, Response } from "express";
import { db } from "../db";
import { users } from "../db/schema";
import { eq, and, ne } from "drizzle-orm";
import { hashPassword } from "../utils/password";
import { AuthRequest } from "../middlewares/auth.middleware";

// Obtener todos los usuarios de la tienda (excluyendo superadmin)
export const getStoreUsers = async (req: AuthRequest, res: Response) => {
  try {
    const storeUsers = db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        active: users.active,
        cashRegisterId: users.cashRegisterId,
        createdBy: users.createdBy,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(ne(users.role, "superadmin"))
      .all();

    res.json(storeUsers);
  } catch (error) {
    console.error("Error fetching store users:", error);
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
};

// Obtener un usuario específico
export const getStoreUser = async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  try {
    const user = db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        active: users.active,
        cashRegisterId: users.cashRegisterId,
        createdBy: users.createdBy,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .get();

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching store user:", error);
    res.status(500).json({ message: "Error al obtener usuario" });
  }
};

// Crear nuevo usuario de tienda
export const createStoreUser = async (req: AuthRequest, res: Response) => {
  const { username, email, password, fullName, role, cashRegisterId } =
    req.body;

  if (!username || !password || !fullName) {
    return res.status(400).json({ message: "Faltan campos requeridos" });
  }

  // Validar rol permitido
  const allowedRoles = ["admin", "manager", "vendedor"];
  if (role && !allowedRoles.includes(role)) {
    return res.status(400).json({ message: "Rol no permitido" });
  }

  try {
    // Verificar si el username ya existe
    const existing = db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (existing) {
      return res
        .status(409)
        .json({ message: "El nombre de usuario ya existe" });
    }

    const passwordHash = await hashPassword(password);

    const result = db
      .insert(users)
      .values({
        username,
        email: email || null,
        passwordHash,
        fullName,
        role: role || "vendedor",
        active: true,
        cashRegisterId: cashRegisterId || null,
        createdBy: req.user.id,
      })
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        active: users.active,
        cashRegisterId: users.cashRegisterId,
        createdAt: users.createdAt,
      })
      .get();

    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating store user:", error);
    res.status(500).json({ message: "Error al crear usuario" });
  }
};

// Actualizar usuario de tienda
export const updateStoreUser = async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const { username, email, password, fullName, role, active, cashRegisterId } =
    req.body;

  try {
    const existingUser = db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .get();

    if (!existingUser) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // No permitir editar superadmin
    if (existingUser.role === "superadmin") {
      return res
        .status(403)
        .json({ message: "No puedes editar un superadmin" });
    }

    // Validar rol permitido
    const allowedRoles = ["admin", "manager", "vendedor"];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Rol no permitido" });
    }

    // Verificar si el nuevo username ya existe (si se está cambiando)
    if (username && username !== existingUser.username) {
      const usernameExists = db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .get();

      if (usernameExists) {
        return res
          .status(409)
          .json({ message: "El nombre de usuario ya existe" });
      }
    }

    // Preparar campos a actualizar
    const updateData: any = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email || null;
    if (fullName !== undefined) updateData.fullName = fullName;
    if (role !== undefined) updateData.role = role;
    if (active !== undefined) updateData.active = active;
    if (cashRegisterId !== undefined)
      updateData.cashRegisterId = cashRegisterId || null;

    // Si se proporciona nueva contraseña, hashearla
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    db
      .update(users)
      .set(updateData)
      .where(eq(users.id, parseInt(id)))
      .run();

    const result = db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        active: users.active,
        cashRegisterId: users.cashRegisterId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .get();

    res.json(result);
  } catch (error) {
    console.error("Error updating store user:", error);
    res.status(500).json({ message: "Error al actualizar usuario" });
  }
};

// Eliminar usuario de tienda
export const deleteStoreUser = async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);

  try {
    const existingUser = db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .get();

    if (!existingUser) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // No permitir eliminar superadmin
    if (existingUser.role === "superadmin") {
      return res
        .status(403)
        .json({ message: "No puedes eliminar un superadmin" });
    }

    // Verificar que no sea el último admin
    if (existingUser.role === "admin") {
      const adminCount = db
        .select()
        .from(users)
        .where(eq(users.role, "admin"))
        .all();

      if (adminCount.length <= 1) {
        return res
          .status(400)
          .json({ message: "No puedes eliminar el único administrador" });
      }
    }

    db.delete(users).where(eq(users.id, parseInt(id))).run();

    res.json({ success: true, message: "Usuario eliminado" });
  } catch (error) {
    console.error("Error deleting store user:", error);
    res.status(500).json({ message: "Error al eliminar usuario" });
  }
};

// Toggle estado activo/inactivo
export const toggleUserStatus = async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);

  try {
    const existingUser = db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .get();

    if (!existingUser) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // No permitir desactivar superadmin
    if (existingUser.role === "superadmin") {
      return res
        .status(403)
        .json({ message: "No puedes desactivar un superadmin" });
    }

    // Verificar que no sea el último admin activo
    if (existingUser.role === "admin" && existingUser.active) {
      const activeAdmins = db
        .select()
        .from(users)
        .where(and(eq(users.role, "admin"), eq(users.active, true)))
        .all();

      if (activeAdmins.length <= 1) {
        return res
          .status(400)
          .json({
            message: "No puedes desactivar el único administrador activo",
          });
      }
    }

    db
      .update(users)
      .set({ active: !existingUser.active })
      .where(eq(users.id, parseInt(id)))
      .run();

    const result = db
      .select({
        id: users.id,
        active: users.active,
      })
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .get();

    res.json(result);
  } catch (error) {
    console.error("Error toggling user status:", error);
    res.status(500).json({ message: "Error al cambiar estado del usuario" });
  }
};
