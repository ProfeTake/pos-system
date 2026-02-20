import { apiFetchJSON, postJSON, putJSON, deleteJSON } from "../lib/api";
import { Promotion, PromotionCreate } from "../types";

export const promotionsService = {
  /**
   * Obtener todas las promociones
   */
  async getAll(status?: string): Promise<Promotion[]> {
    const params = status && status !== "all" ? `?status=${status}` : "";
    return apiFetchJSON<Promotion[]>(`/api/promotions${params}`);
  },

  /**
   * Obtener solo promociones activas (para aplicar en ventas)
   */
  async getActive(): Promise<Promotion[]> {
    return apiFetchJSON<Promotion[]>("/api/promotions/active");
  },

  /**
   * Obtener promoción por ID
   */
  async getById(id: number): Promise<Promotion> {
    return apiFetchJSON<Promotion>(`/api/promotions/${id}`);
  },

  /**
   * Buscar promoción por código de barras
   */
  async getByBarcode(code: string): Promise<Promotion> {
    return apiFetchJSON<Promotion>(`/api/promotions/barcode/${code}`);
  },

  /**
   * Crear nueva promoción
   */
  async create(promo: PromotionCreate): Promise<Promotion> {
    return postJSON<Promotion>("/api/promotions", promo);
  },

  /**
   * Actualizar promoción
   */
  async update(
    id: number,
    updates: Partial<PromotionCreate>
  ): Promise<Promotion> {
    return putJSON<Promotion>(`/api/promotions/${id}`, updates);
  },

  /**
   * Eliminar promoción
   */
  async delete(id: number): Promise<{ message: string; id: number }> {
    return deleteJSON(`/api/promotions/${id}`);
  },

  /**
   * Activar/desactivar promoción
   */
  async toggle(id: number): Promise<Promotion> {
    return postJSON<Promotion>(`/api/promotions/${id}/toggle`, {});
  },

  /**
   * Registrar uso de promoción (al completar venta)
   */
  async registerUse(
    id: number
  ): Promise<{ message: string; usedCount: number }> {
    return postJSON(`/api/promotions/${id}/use`, {});
  },

  /**
   * Calcular descuento de una promoción para un item del carrito
   */
  calculateDiscount(
    promo: Promotion,
    itemPrice: number,
    itemQuantity: number,
    productId?: number,
    productCategory?: string
  ): { discount: number; applies: boolean } {
    // Verificar si la promoción aplica al producto
    let applies = false;

    switch (promo.scope) {
      case "all":
        applies = true;
        break;
      case "product":
        applies = promo.productIds?.includes(productId!) ?? false;
        break;
      case "category":
        applies = promo.categoryName === productCategory;
        break;
    }

    if (!applies) return { discount: 0, applies: false };

    // Calcular descuento según tipo
    let discount = 0;
    const subtotal = itemPrice * itemQuantity;

    switch (promo.type) {
      case "percentage":
        discount = subtotal * ((promo.value || 0) / 100);
        break;
      case "fixed":
        discount = Math.min(promo.value || 0, subtotal);
        break;
      case "2x1":
        if (itemQuantity >= 2) {
          const freeItems = Math.floor(itemQuantity / 2);
          discount = freeItems * itemPrice;
        }
        break;
      case "3x2":
        if (itemQuantity >= 3) {
          const freeItems = Math.floor(itemQuantity / 3);
          discount = freeItems * itemPrice;
        }
        break;
      case "bundle":
        if (
          promo.bundleQty &&
          promo.bundlePrice &&
          itemQuantity >= promo.bundleQty
        ) {
          const bundles = Math.floor(itemQuantity / promo.bundleQty);
          const remainder = itemQuantity % promo.bundleQty;
          const bundleCost =
            bundles * promo.bundlePrice + remainder * itemPrice;
          discount = subtotal - bundleCost;
        }
        break;
    }

    return { discount: Math.max(0, discount), applies: true };
  },
};
