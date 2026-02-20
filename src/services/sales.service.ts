import { apiFetchJSON, postJSON } from "../lib/api";
import { Sale } from "../types";

export const salesService = {
  async getAll() {
    // Usamos el endpoint que devuelve la información completa (items, etc.)
    return apiFetchJSON<Sale[]>("/api/sales/full");
  },

  async getById(id: number) {
    return apiFetchJSON<Sale>(`/api/sales/${id}`);
  },

  async create(sale: Partial<Sale>) {
    return postJSON<Sale>("/api/sales", sale);
  },

  /**
   * Anular venta (sin devolver stock)
   */
  async voidSale(id: number, reason?: string) {
    return postJSON<{ message: string; sale: Sale }>(`/api/sales/${id}/void`, {
      reason,
    });
  },

  /**
   * Devolver venta (anula y devuelve stock)
   * @param items - Items específicos a devolver (opcional, si no se pasa devuelve todo)
   */
  async refundSale(
    id: number,
    reason?: string,
    items?: { productId: number; quantity: number }[]
  ) {
    return postJSON<{
      message: string;
      sale: Sale;
      refundedItems: number;
      refundTotal: number;
    }>(`/api/sales/${id}/refund`, { reason, items });
  },

  async getMetrics(period: string = "today", init: RequestInit = {}) {
    return apiFetchJSON(`/api/analytics/metrics?period=${period}`, init);
  },

  async getSalesTrend(days: number = 30, init: RequestInit = {}) {
    return apiFetchJSON(`/api/analytics/sales-trend?days=${days}`, init);
  },

  async getSalesByHour(period: string = "today", init: RequestInit = {}) {
    return apiFetchJSON(`/api/analytics/sales-by-hour?period=${period}`, init);
  },

  async getPeriodComparison(period: string = "today", init: RequestInit = {}) {
    return apiFetchJSON(`/api/analytics/period-comparison?period=${period}`, init);
  },

  async getRestockPredictions(days: number = 30, init: RequestInit = {}) {
    return apiFetchJSON(`/api/analytics/restock-predictions?days=${days}`, init);
  },
};
