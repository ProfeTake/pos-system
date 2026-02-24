import { Request, Response } from "express";
import { db } from "../db";
import { categoryStockThresholds, products } from "../db/schema";
import { eq } from "drizzle-orm";
import { AuthRequest } from "../middlewares/auth.middleware";

// Obtener todos los umbrales de categoría
export const getCategoryThresholds = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const thresholds = await db
      .select()
      .from(categoryStockThresholds)
      .orderBy(categoryStockThresholds.category);

    res.json(thresholds);
  } catch (error) {
    console.error("Error fetching category thresholds:", error);
    res.status(500).json({ message: "Error al obtener umbrales de categoría" });
  }
};

// Crear o actualizar umbral de categoría
export const upsertCategoryThreshold = async (
  req: AuthRequest,
  res: Response
) => {
  const { category, minStock } = req.body;

  if (!category || minStock === undefined) {
    return res
      .status(400)
      .json({ message: "Categoría y stock mínimo son requeridos" });
  }

  if (minStock < 0) {
    return res
      .status(400)
      .json({ message: "El stock mínimo debe ser mayor o igual a 0" });
  }

  try {
    // Usar upsert (insert o update si existe)
    await db
      .insert(categoryStockThresholds)
      .values({
        category,
        minStock,
      })
      .onDuplicateKeyUpdate({
        set: { minStock, updatedAt: new Date() },
      });

    const [result] = await db
      .select()
      .from(categoryStockThresholds)
      .where(eq(categoryStockThresholds.category, category))
      .limit(1);

    res.json(result);
  } catch (error) {
    console.error("Error upserting category threshold:", error);
    res.status(500).json({ message: "Error al guardar umbral de categoría" });
  }
};

// Eliminar umbral de categoría
export const deleteCategoryThreshold = async (
  req: AuthRequest,
  res: Response
) => {
  const id = String(req.params.id);

  try {
    const [existing] = await db
      .select()
      .from(categoryStockThresholds)
      .where(eq(categoryStockThresholds.id, parseInt(id)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Umbral no encontrado" });
    }

    await db
      .delete(categoryStockThresholds)
      .where(eq(categoryStockThresholds.id, parseInt(id)));

    res.json({ success: true, message: "Umbral eliminado" });
  } catch (error) {
    console.error("Error deleting category threshold:", error);
    res.status(500).json({ message: "Error al eliminar umbral de categoría" });
  }
};

// Aplicar umbral a todos los productos de una categoría
export const applyCategoryThreshold = async (
  req: AuthRequest,
  res: Response
) => {
  const { category, minStock } = req.body;

  if (!category || minStock === undefined) {
    return res
      .status(400)
      .json({ message: "Categoría y stock mínimo son requeridos" });
  }

  try {
    // Count products that will be updated
    const affectedProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.category, category));

    // Actualizar todos los productos de la categoría
    await db
      .update(products)
      .set({ minStock })
      .where(eq(products.category, category));

    // Guardar también el umbral para referencia futura
    await db
      .insert(categoryStockThresholds)
      .values({ category, minStock })
      .onDuplicateKeyUpdate({
        set: { minStock, updatedAt: new Date() },
      });

    res.json({
      success: true,
      message: `Se actualizaron ${affectedProducts.length} productos`,
      productsUpdated: affectedProducts.length,
    });
  } catch (error) {
    console.error("Error applying category threshold:", error);
    res.status(500).json({ message: "Error al aplicar umbral a productos" });
  }
};

// Obtener categorías disponibles (de los productos existentes)
export const getAvailableCategories = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const categories = await db
      .selectDistinct({ category: products.category })
      .from(products)
      .orderBy(products.category);

    res.json(categories.map((c) => c.category));
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Error al obtener categorías" });
  }
};
