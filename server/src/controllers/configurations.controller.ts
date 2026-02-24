import { Response } from "express";
import { db } from "../db";
import { settings } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { TenantRequest } from "../middlewares/tenant.middleware";

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
  taxRate: number; // IVA (default 19 para Chile)
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

// ============================================================
// VALORES POR DEFECTO
// ============================================================

const DEFAULT_CONFIG: FullConfig = {
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
    taxRate: 19, // IVA Chile
    currency: "CLP",
    timezone: "America/Santiago",
    businessHours: {
      open: "09:00",
      close: "21:00",
      days: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
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
// CONTROLADORES
// ============================================================

/**
 * Obtiene todas las configuraciones del tenant
 * GET /api/configurations
 */
export const getAllConfigurations = async (req: TenantRequest, res: Response) => {
  const tenantId = req.tenantId;

  if (!tenantId) {
    return res.status(400).json({
      error: "Tenant ID requerido",
      code: "TENANT_REQUIRED",
    });
  }

  try {
    // Obtener todas las configuraciones del tenant
    const allSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.tenantId, tenantId));

    // Construir objeto de configuración
    const config: Partial<FullConfig> = {};

    for (const setting of allSettings) {
      const key = setting.key as keyof FullConfig;
      config[key] = setting.value as any;
    }

    // Merge con valores por defecto
    const fullConfig: FullConfig = {
      company: { ...DEFAULT_CONFIG.company, ...config.company },
      operations: { ...DEFAULT_CONFIG.operations, ...config.operations },
      features: { ...DEFAULT_CONFIG.features, ...config.features },
      integrations: { ...DEFAULT_CONFIG.integrations, ...config.integrations },
      notifications: { ...DEFAULT_CONFIG.notifications, ...config.notifications },
    };

    res.json(fullConfig);
  } catch (error: any) {
    console.error("[getAllConfigurations]", error);
    res.status(500).json({
      error: "Error al obtener configuraciones",
      message: error.message,
    });
  }
};

/**
 * Obtiene una configuración específica
 * GET /api/configurations/:key
 */
export const getConfiguration = async (req: TenantRequest, res: Response) => {
  const tenantId = req.tenantId;
  const key = String(req.params.key);

  if (!tenantId) {
    return res.status(400).json({
      error: "Tenant ID requerido",
      code: "TENANT_REQUIRED",
    });
  }

  const validKeys = ["company", "operations", "features", "integrations", "notifications"];
  if (!validKeys.includes(key)) {
    return res.status(400).json({
      error: "Clave de configuración inválida",
      validKeys,
    });
  }

  try {
    const setting = await db
      .select()
      .from(settings)
      .where(and(eq(settings.tenantId, tenantId), eq(settings.key, key)))
      .limit(1);

    if (setting.length === 0) {
      // Retornar valor por defecto
      return res.json(DEFAULT_CONFIG[key as keyof FullConfig]);
    }

    res.json(setting[0].value);
  } catch (error: any) {
    console.error("[getConfiguration]", error);
    res.status(500).json({
      error: "Error al obtener configuración",
      message: error.message,
    });
  }
};

/**
 * Actualiza una configuración específica
 * PUT /api/configurations/:key
 */
export const updateConfiguration = async (req: TenantRequest, res: Response) => {
  const tenantId = req.tenantId;
  const key = String(req.params.key);
  const value = req.body;

  if (!tenantId) {
    return res.status(400).json({
      error: "Tenant ID requerido",
      code: "TENANT_REQUIRED",
    });
  }

  const validKeys = ["company", "operations", "features", "integrations", "notifications"];
  if (!validKeys.includes(key)) {
    return res.status(400).json({
      error: "Clave de configuración inválida",
      validKeys,
    });
  }

  // Validar datos según la clave
  const validation = validateConfiguration(key, value);
  if (!validation.valid) {
    return res.status(400).json({
      error: "Datos de configuración inválidos",
      details: validation.errors,
    });
  }

  try {
    // Verificar si existe
    const existing = await db
      .select()
      .from(settings)
      .where(and(eq(settings.tenantId, tenantId), eq(settings.key, key)))
      .limit(1);

    const now = new Date();

    if (existing.length > 0) {
      // Actualizar
      await db
        .update(settings)
        .set({
          value: JSON.stringify(value),
          updatedAt: now,
        })
        .where(and(eq(settings.tenantId, tenantId), eq(settings.key, key)));
    } else {
      // Insertar
      await db.insert(settings).values({
        tenantId,
        key,
        value: JSON.stringify(value),
        updatedAt: now,
      });
    }

    res.json({
      success: true,
      message: "Configuración actualizada",
      key,
      value,
    });
  } catch (error: any) {
    console.error("[updateConfiguration]", error);
    res.status(500).json({
      error: "Error al actualizar configuración",
      message: error.message,
    });
  }
};

/**
 * Actualiza múltiples configuraciones a la vez
 * PUT /api/configurations
 */
export const updateAllConfigurations = async (req: TenantRequest, res: Response) => {
  const tenantId = req.tenantId;
  const configs = req.body as Partial<FullConfig>;

  if (!tenantId) {
    return res.status(400).json({
      error: "Tenant ID requerido",
      code: "TENANT_REQUIRED",
    });
  }

  try {
    const now = new Date();
    const updates: string[] = [];

    for (const [key, value] of Object.entries(configs)) {
      if (!value) continue;

      // Validar
      const validation = validateConfiguration(key, value);
      if (!validation.valid) {
        return res.status(400).json({
          error: `Configuración inválida: ${key}`,
          details: validation.errors,
        });
      }

      // Verificar si existe
      const existing = await db
        .select()
        .from(settings)
        .where(and(eq(settings.tenantId, tenantId), eq(settings.key, key)))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(settings)
          .set({
            value: JSON.stringify(value),
            updatedAt: now,
          })
          .where(and(eq(settings.tenantId, tenantId), eq(settings.key, key)));
      } else {
        await db.insert(settings).values({
          tenantId,
          key,
          value: JSON.stringify(value),
          updatedAt: now,
        });
      }

      updates.push(key);
    }

    res.json({
      success: true,
      message: "Configuraciones actualizadas",
      updated: updates,
    });
  } catch (error: any) {
    console.error("[updateAllConfigurations]", error);
    res.status(500).json({
      error: "Error al actualizar configuraciones",
      message: error.message,
    });
  }
};

/**
 * Obtiene los datos de la empresa (shortcut para company)
 * GET /api/configurations/company
 */
export const getCompanyData = async (req: TenantRequest, res: Response) => {
  req.params = { key: "company" };
  return getConfiguration(req, res);
};

/**
 * Actualiza los datos de la empresa
 * PUT /api/configurations/company
 */
export const updateCompanyData = async (req: TenantRequest, res: Response) => {
  req.params = { key: "company" };
  return updateConfiguration(req, res);
};

// ============================================================
// VALIDACIÓN
// ============================================================

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateConfiguration(key: string, value: any): ValidationResult {
  const errors: string[] = [];

  switch (key) {
    case "company":
      if (typeof value !== "object") {
        errors.push("Los datos de empresa deben ser un objeto");
        break;
      }
      // RUT puede estar vacío pero si tiene valor, validar formato básico
      if (value.rut && typeof value.rut !== "string") {
        errors.push("RUT debe ser un string");
      }
      if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
        errors.push("Email inválido");
      }
      break;

    case "operations":
      if (typeof value !== "object") {
        errors.push("Las operaciones deben ser un objeto");
        break;
      }
      if (value.taxRate !== undefined) {
        const tax = Number(value.taxRate);
        if (isNaN(tax) || tax < 0 || tax > 100) {
          errors.push("Tasa de impuesto debe ser entre 0 y 100");
        }
      }
      if (value.businessHours) {
        if (value.businessHours.open && !/^\d{2}:\d{2}$/.test(value.businessHours.open)) {
          errors.push("Hora de apertura inválida (formato HH:MM)");
        }
        if (value.businessHours.close && !/^\d{2}:\d{2}$/.test(value.businessHours.close)) {
          errors.push("Hora de cierre inválida (formato HH:MM)");
        }
      }
      break;

    case "features":
      if (typeof value !== "object") {
        errors.push("Las características deben ser un objeto");
        break;
      }
      // Todas las propiedades deben ser booleanas
      for (const [prop, val] of Object.entries(value)) {
        if (typeof val !== "boolean") {
          errors.push(`${prop} debe ser un booleano`);
        }
      }
      break;

    case "integrations":
      if (typeof value !== "object") {
        errors.push("Las integraciones deben ser un objeto");
        break;
      }
      if (value.emailService?.provider) {
        const validProviders = ["smtp", "sendgrid", "ses", null];
        if (!validProviders.includes(value.emailService.provider)) {
          errors.push("Proveedor de email inválido");
        }
      }
      break;

    case "notifications":
      if (typeof value !== "object") {
        errors.push("Las notificaciones deben ser un objeto");
        break;
      }
      if (value.salesAlertThreshold !== undefined) {
        const threshold = Number(value.salesAlertThreshold);
        if (isNaN(threshold) || threshold < 0) {
          errors.push("Umbral de alerta de ventas debe ser un número positivo");
        }
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
