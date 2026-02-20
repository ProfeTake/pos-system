import { Request, Response } from "express";
import { db } from "../db";
import { promotions } from "../db/schema";
import { eq, desc, and, or, gte, lte, isNull, sql } from "drizzle-orm";

// Helper para verificar si una promoción está activa
function isPromotionActive(promo: any): boolean {
  if (!promo.active) return false;

  const now = Date.now();
  const startTime = promo.startDate ? new Date(promo.startDate).getTime() : 0;
  const endTime = promo.endDate ? new Date(promo.endDate).getTime() : Infinity;

  if (now < startTime || now > endTime) return false;

  if (promo.maxUses && promo.usedCount >= promo.maxUses) return false;

  return true;
}

// Calcular estado de la promoción
function getPromotionStatus(promo: any): string {
  if (!promo.active) return "paused";

  const now = Date.now();
  const endTime = promo.endDate ? new Date(promo.endDate).getTime() : Infinity;

  if (now > endTime) return "expired";

  if (promo.maxUses && promo.usedCount >= promo.maxUses) return "soldout";

  return "active";
}

/**
 * GET /api/promotions
 * Lista todas las promociones
 */
export const getAll = async (req: Request, res: Response) => {
  try {
    const { status, activeOnly } = req.query;

    let allPromos = db
      .select()
      .from(promotions)
      .orderBy(desc(promotions.createdAt))
      .all();

    // Agregar status calculado
    const promosWithStatus = allPromos.map((p) => ({
      ...p,
      status: getPromotionStatus(p),
      isActive: isPromotionActive(p),
    }));

    // Filtrar por status si se especifica
    let filtered = promosWithStatus;
    if (status && status !== "all") {
      filtered = promosWithStatus.filter((p) => p.status === status);
    }
    if (activeOnly === "true") {
      filtered = promosWithStatus.filter((p) => p.isActive);
    }

    res.json(filtered);
  } catch (error) {
    console.error("Error fetching promotions:", error);
    res.status(500).json({ message: "Error fetching promotions" });
  }
};

/**
 * GET /api/promotions/active
 * Solo promociones activas (para aplicar en ventas)
 */
export const getActive = async (req: Request, res: Response) => {
  try {
    const now = Math.floor(Date.now() / 1000);

    const activePromos = db
      .select()
      .from(promotions)
      .where(
        and(
          eq(promotions.active, true),
          or(
            isNull(promotions.startDate),
            lte(promotions.startDate, sql`${now}`)
          ),
          or(isNull(promotions.endDate), gte(promotions.endDate, sql`${now}`)),
          or(
            isNull(promotions.maxUses),
            sql`${promotions.usedCount} < ${promotions.maxUses}`
          )
        )
      )
      .all();

    res.json(activePromos);
  } catch (error) {
    console.error("Error fetching active promotions:", error);
    res.status(500).json({ message: "Error fetching active promotions" });
  }
};

/**
 * GET /api/promotions/:id
 * Obtener una promoción por ID
 */
export const getById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const promo = db
      .select()
      .from(promotions)
      .where(eq(promotions.id, parseInt(id)))
      .get();

    if (!promo) {
      return res.status(404).json({ message: "Promoción no encontrada" });
    }

    res.json({
      ...promo,
      status: getPromotionStatus(promo),
      isActive: isPromotionActive(promo),
    });
  } catch (error) {
    console.error("Error fetching promotion:", error);
    res.status(500).json({ message: "Error fetching promotion" });
  }
};

/**
 * GET /api/promotions/barcode/:code
 * Buscar promoción por código de barras
 */
export const getByBarcode = async (req: Request, res: Response) => {
  try {
    const code = String(req.params.code);

    const promo = db
      .select()
      .from(promotions)
      .where(eq(promotions.barcode, code))
      .get();

    if (!promo) {
      return res.status(404).json({ message: "Promoción no encontrada" });
    }

    if (!isPromotionActive(promo)) {
      return res.status(400).json({
        message: "Promoción no disponible",
        status: getPromotionStatus(promo),
      });
    }

    res.json({
      ...promo,
      status: getPromotionStatus(promo),
      isActive: true,
    });
  } catch (error) {
    console.error("Error fetching promotion by barcode:", error);
    res.status(500).json({ message: "Error fetching promotion" });
  }
};

/**
 * POST /api/promotions
 * Crear nueva promoción
 */
export const create = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      type,
      value,
      active,
      scope,
      productIds,
      categoryName,
      startDate,
      endDate,
      maxUses,
      minPurchase,
      bundleQty,
      bundlePrice,
      barcode,
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: "Nombre y tipo son requeridos" });
    }

    // Auto-generar código de barras si no se proporciona
    let promoBarcode = barcode;
    if (!promoBarcode) {
      // Obtener el último ID para generar el código
      const lastPromo = db
        .select()
        .from(promotions)
        .orderBy(desc(promotions.id))
        .limit(1)
        .get();

      const nextId = (lastPromo?.id || 0) + 1;
      promoBarcode = `PROMO-${String(nextId).padStart(5, '0')}`;
    }

    const newPromo = db
      .insert(promotions)
      .values({
        name,
        description,
        type,
        value: value || null,
        active: active !== false,
        scope: scope || "product",
        productIds: productIds || null,
        categoryName: categoryName || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        maxUses: maxUses || null,
        usedCount: 0,
        minPurchase: minPurchase || null,
        bundleQty: bundleQty || null,
        bundlePrice: bundlePrice || null,
        barcode: promoBarcode,
      })
      .returning().get();

    res.status(201).json({
      ...newPromo,
      status: getPromotionStatus(newPromo),
      isActive: isPromotionActive(newPromo),
    });
  } catch (error) {
    console.error("Error creating promotion:", error);
    res.status(500).json({ message: "Error creating promotion" });
  }
};

/**
 * PUT /api/promotions/:id
 * Actualizar promoción
 */
export const update = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const updates = req.body;

    // Preparar campos de actualización
    const updateData: any = {
      updatedAt: new Date(),
    };

    const allowedFields = [
      "name",
      "description",
      "type",
      "value",
      "active",
      "scope",
      "productIds",
      "categoryName",
      "startDate",
      "endDate",
      "maxUses",
      "minPurchase",
      "bundleQty",
      "bundlePrice",
      "barcode",
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === "startDate" || field === "endDate") {
          updateData[field] = updates[field] ? new Date(updates[field]) : null;
        } else {
          updateData[field] = updates[field];
        }
      }
    }

    db.update(promotions)
      .set(updateData)
      .where(eq(promotions.id, parseInt(id)))
      .run();
    const updated = db.select().from(promotions).where(eq(promotions.id, parseInt(id))).get();

    if (!updated) {
      return res.status(404).json({ message: "Promoción no encontrada" });
    }

    res.json({
      ...updated,
      status: getPromotionStatus(updated),
      isActive: isPromotionActive(updated),
    });
  } catch (error) {
    console.error("Error updating promotion:", error);
    res.status(500).json({ message: "Error updating promotion" });
  }
};

/**
 * DELETE /api/promotions/:id
 * Eliminar promoción
 */
export const remove = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const deleted = db.select().from(promotions).where(eq(promotions.id, parseInt(id))).get();

    if (!deleted) {
      return res.status(404).json({ message: "Promoción no encontrada" });
    }

    db.delete(promotions).where(eq(promotions.id, parseInt(id))).run();

    res.json({ message: "Promoción eliminada", id: deleted.id });
  } catch (error) {
    console.error("Error deleting promotion:", error);
    res.status(500).json({ message: "Error deleting promotion" });
  }
};

/**
 * POST /api/promotions/:id/toggle
 * Activar/desactivar promoción
 */
export const toggle = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const promo = db
      .select()
      .from(promotions)
      .where(eq(promotions.id, parseInt(id)))
      .get();

    if (!promo) {
      return res.status(404).json({ message: "Promoción no encontrada" });
    }

    db.update(promotions)
      .set({
        active: !promo.active,
        updatedAt: new Date(),
      })
      .where(eq(promotions.id, parseInt(id)))
      .run();
    const updated = db.select().from(promotions).where(eq(promotions.id, parseInt(id))).get();

    res.json({
      ...updated,
      status: getPromotionStatus(updated),
      isActive: isPromotionActive(updated),
    });
  } catch (error) {
    console.error("Error toggling promotion:", error);
    res.status(500).json({ message: "Error toggling promotion" });
  }
};

/**
 * POST /api/promotions/:id/use
 * Registrar uso de promoción (llamado al completar venta)
 */
export const registerUse = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    db.update(promotions)
      .set({
        usedCount: sql`${promotions.usedCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(promotions.id, parseInt(id)))
      .run();
    const updated = db.select().from(promotions).where(eq(promotions.id, parseInt(id))).get();

    if (!updated) {
      return res.status(404).json({ message: "Promoción no encontrada" });
    }

    res.json({ message: "Uso registrado", usedCount: updated.usedCount });
  } catch (error) {
    console.error("Error registering promotion use:", error);
    res.status(500).json({ message: "Error registering promotion use" });
  }
};
