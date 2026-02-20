import { apiFetchJSON, putJSON, postJSON, deleteJSON } from "../lib/api";

// Tipos para usuarios de tienda
export type StoreUser = {
  id: number;
  username: string;
  email: string | null;
  fullName: string;
  role: "admin" | "manager" | "vendedor";
  active: boolean;
  cashRegisterId: string | null;
  createdBy?: number;
  createdAt: string;
};

export type CreateStoreUserInput = {
  username: string;
  email?: string;
  password: string;
  fullName: string;
  role?: "admin" | "manager" | "vendedor";
  cashRegisterId?: string;
};

export type UpdateStoreUserInput = Partial<CreateStoreUserInput> & {
  active?: boolean;
};

// Tipos para umbrales de categoría
export type CategoryThreshold = {
  id: number;
  category: string;
  minStock: number;
  createdAt: string;
  updatedAt?: string;
};

export const settingsService = {
  // ========== SETTINGS GENERALES ==========
  async getSettings() {
    return apiFetchJSON<Record<string, any>>("/api/settings");
  },

  async updateSetting(key: string, value: any) {
    return putJSON(`/api/settings/${encodeURIComponent(key)}`, { value });
  },

  async getCashSession() {
    return apiFetchJSON<any>("/api/settings/cash-session");
  },

  async getCashSessionSummary() {
    return apiFetchJSON<any>("/api/cash-session/summary");
  },

  async getCashBalance() {
    return apiFetchJSON<any>("/api/cash-session/balance");
  },

  async recalculateWindow(mode: "current" | "next" = "current") {
    return apiFetchJSON(`/api/settings/cash-session/recalculate-window?mode=${mode}`, {
      method: "POST",
    });
  },

  // ========== USUARIOS DE TIENDA ==========
  async getStoreUsers() {
    return apiFetchJSON<StoreUser[]>("/api/store-users");
  },

  async getStoreUser(id: number) {
    return apiFetchJSON<StoreUser>(`/api/store-users/${id}`);
  },

  async createStoreUser(data: CreateStoreUserInput) {
    return postJSON<StoreUser>("/api/store-users", data);
  },

  async updateStoreUser(id: number, data: UpdateStoreUserInput) {
    return putJSON<StoreUser>(`/api/store-users/${id}`, data);
  },

  async deleteStoreUser(id: number) {
    return deleteJSON(`/api/store-users/${id}`);
  },

  async toggleUserStatus(id: number) {
    return apiFetchJSON<{ id: number; active: boolean }>(
      `/api/store-users/${id}/toggle-status`,
      { method: "PATCH" }
    );
  },

  // ========== UMBRALES DE CATEGORÍA ==========
  async getCategoryThresholds() {
    return apiFetchJSON<CategoryThreshold[]>("/api/category-thresholds");
  },

  async getAvailableCategories() {
    return apiFetchJSON<string[]>("/api/category-thresholds/categories");
  },

  async upsertCategoryThreshold(category: string, minStock: number) {
    return postJSON<CategoryThreshold>("/api/category-thresholds", {
      category,
      minStock,
    });
  },

  async deleteCategoryThreshold(id: number) {
    return deleteJSON(`/api/category-thresholds/${id}`);
  },

  async applyCategoryThreshold(category: string, minStock: number) {
    return postJSON<{ success: boolean; productsUpdated: number }>(
      "/api/category-thresholds/apply",
      { category, minStock }
    );
  },

  // ========== DETECCIÓN DE CAMBIO DE TURNO ==========
  async checkShiftChange() {
    return apiFetchJSON<{
      isNewShift: boolean;
      hasActiveSession: boolean;
      sessionId?: number;
      sessionOpenTime?: string;
      sessionWindowClose?: string | null;
      currentWindow: {
        open: string;
        close: string;
      };
      previousWindow?: {
        open: string;
        close: string;
      };
      pastScheduledClose?: boolean;
      reason: string;
    }>("/api/settings/cash-session/check-shift");
  },
};
