import { apiFetchJSON } from "../lib/api";

// ============================================================
// TIPOS DE CONFIGURACIÓN
// ============================================================

export interface CompanyData {
  rut: string;
  razonSocial: string;
  giro: string;
  direccion: string;
  comuna: string;
  ciudad: string;
  telefono: string;
  email: string;
  logo?: string;
}

export interface OperationsConfig {
  taxRate: number;
  currency: string;
  timezone: string;
  businessHours: {
    open: string;
    close: string;
    days: number[];
  };
}

export interface FeaturesConfig {
  promotionsEnabled: boolean;
  lowStockAlerts: boolean;
  multiplePaymentMethods: boolean;
  customerManagement: boolean;
  inventoryTracking: boolean;
  autoExportEnabled: boolean;
}

export interface IntegrationsConfig {
  emailService: {
    provider: "smtp" | "sendgrid" | "ses" | null;
    enabled: boolean;
    accountantEmail?: string;
  };
  siiIntegration: boolean;
  paymentGateways: {
    transbank: { enabled: boolean; commerceCode?: string };
    mercadopago: { enabled: boolean; publicKey?: string };
  };
}

export interface NotificationsConfig {
  emailNotifications: boolean;
  lowStockEmail: boolean;
  dailyReportEmail: boolean;
  salesAlertThreshold?: number;
}

export interface FullConfig {
  company: CompanyData;
  operations: OperationsConfig;
  features: FeaturesConfig;
  integrations: IntegrationsConfig;
  notifications: NotificationsConfig;
}

// Valores por defecto
export const DEFAULT_CONFIG: FullConfig = {
  company: {
    rut: "",
    razonSocial: "",
    giro: "",
    direccion: "",
    comuna: "",
    ciudad: "",
    telefono: "",
    email: "",
  },
  operations: {
    taxRate: 19,
    currency: "CLP",
    timezone: "America/Santiago",
    businessHours: {
      open: "09:00",
      close: "21:00",
      days: [1, 2, 3, 4, 5, 6],
    },
  },
  features: {
    promotionsEnabled: true,
    lowStockAlerts: true,
    multiplePaymentMethods: true,
    customerManagement: false,
    inventoryTracking: true,
    autoExportEnabled: false,
  },
  integrations: {
    emailService: {
      provider: null,
      enabled: false,
    },
    siiIntegration: false,
    paymentGateways: {
      transbank: { enabled: false },
      mercadopago: { enabled: false },
    },
  },
  notifications: {
    emailNotifications: false,
    lowStockEmail: false,
    dailyReportEmail: false,
  },
};

// ============================================================
// API SERVICE
// ============================================================

const LOCAL_STORAGE_KEY = "store_configurations";

class ConfigurationsService {
  private cache: FullConfig | null = null;
  private cacheTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Obtiene todas las configuraciones
   * Intenta primero del servidor, fallback a localStorage
   */
  async getAll(): Promise<FullConfig> {
    // Verificar cache
    if (this.cache && Date.now() - this.cacheTime < this.CACHE_TTL) {
      return this.cache;
    }

    try {
      const config = await apiFetchJSON<FullConfig>("/api/configurations");
      this.cache = config;
      this.cacheTime = Date.now();
      
      // Guardar en localStorage como backup
      this.saveToLocalStorage(config);
      
      return config;
    } catch (error) {
      console.warn("Error fetching configurations from server, using local:", error);
      return this.getFromLocalStorage();
    }
  }

  /**
   * Obtiene una configuración específica
   */
  async get<K extends keyof FullConfig>(key: K): Promise<FullConfig[K]> {
    try {
      const value = await apiFetchJSON<FullConfig[K]>(`/api/configurations/${key}`);
      return value;
    } catch (error) {
      console.warn(`Error fetching ${key} configuration:`, error);
      const local = this.getFromLocalStorage();
      return local[key];
    }
  }

  /**
   * Actualiza una configuración específica
   */
  async update<K extends keyof FullConfig>(key: K, value: FullConfig[K]): Promise<void> {
    try {
      await apiFetchJSON(`/api/configurations/${key}`, {
        method: "PUT",
        body: JSON.stringify(value),
      });
      
      // Actualizar cache
      if (this.cache) {
        this.cache[key] = value;
        this.saveToLocalStorage(this.cache);
      }
    } catch (error) {
      console.error(`Error updating ${key} configuration:`, error);
      
      // Guardar localmente como fallback
      const local = this.getFromLocalStorage();
      local[key] = value;
      this.saveToLocalStorage(local);
      
      throw error;
    }
  }

  /**
   * Actualiza múltiples configuraciones
   */
  async updateAll(config: Partial<FullConfig>): Promise<void> {
    try {
      await apiFetchJSON("/api/configurations", {
        method: "PUT",
        body: JSON.stringify(config),
      });
      
      // Actualizar cache
      if (this.cache) {
        this.cache = { ...this.cache, ...config };
        this.saveToLocalStorage(this.cache);
      }
    } catch (error) {
      console.error("Error updating configurations:", error);
      
      // Guardar localmente como fallback
      const local = this.getFromLocalStorage();
      const updated = { ...local, ...config };
      this.saveToLocalStorage(updated);
      
      throw error;
    }
  }

  /**
   * Obtiene datos de la empresa
   */
  async getCompanyData(): Promise<CompanyData> {
    return this.get("company");
  }

  /**
   * Actualiza datos de la empresa
   */
  async updateCompanyData(data: CompanyData): Promise<void> {
    return this.update("company", data);
  }

  /**
   * Limpia el cache
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTime = 0;
  }

  /**
   * Migra datos de localStorage legacy al nuevo sistema
   * Útil para migración inicial
   */
  async migrateFromLegacy(): Promise<boolean> {
    const legacyCompanyData = localStorage.getItem("companyData");
    if (legacyCompanyData) {
      try {
        const company = JSON.parse(legacyCompanyData);
        await this.update("company", company);
        localStorage.removeItem("companyData"); // Limpiar legacy
        return true;
      } catch (error) {
        console.error("Error migrating legacy company data:", error);
      }
    }
    return false;
  }

  // ============================================================
  // LOCAL STORAGE HELPERS
  // ============================================================

  private saveToLocalStorage(config: FullConfig): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }

  private getFromLocalStorage(): FullConfig {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          company: { ...DEFAULT_CONFIG.company, ...parsed.company },
          operations: { ...DEFAULT_CONFIG.operations, ...parsed.operations },
          features: { ...DEFAULT_CONFIG.features, ...parsed.features },
          integrations: { ...DEFAULT_CONFIG.integrations, ...parsed.integrations },
          notifications: { ...DEFAULT_CONFIG.notifications, ...parsed.notifications },
        };
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
    }
    return DEFAULT_CONFIG;
  }
}

// Exportar instancia singleton
export const configurationsService = new ConfigurationsService();
export default configurationsService;
