/**
 * SuperAdmin Controller
 * Gestiona operaciones exclusivas para superadministradores del SaaS
 */

import type { Request, Response } from "express";

// Tipos para las respuestas
interface Tenant {
  id: number;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  status: "active" | "suspended" | "cancelled" | "trial";
  city: string | null;
  region: string | null;
  createdAt: Date | null;
  trialEndsAt: Date | null;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  internalNotes: string | null;
  subscription?: {
    planName: string;
    status: string;
    nextBillingDate: Date | null;
  };
  metrics?: {
    totalSales: number;
    totalRevenue: number;
    totalProducts: number;
    activeUsers: number;
  };
}

interface SubscriptionPlan {
  id: number;
  name: string;
  code: string;
  priceMonthly: number;
  priceYearly: number | null;
  maxProducts: number | null;
  maxUsers: number | null;
  features: string[];
  active: boolean;
}

// Mock data para desarrollo (cuando no hay tablas SaaS aún)
const mockPlans: SubscriptionPlan[] = [
  {
    id: 1,
    name: "Básico",
    code: "basic",
    priceMonthly: 19990,
    priceYearly: 199900,
    maxProducts: 100,
    maxUsers: 2,
    features: ["pos", "inventory"],
    active: true,
  },
  {
    id: 2,
    name: "Profesional",
    code: "pro",
    priceMonthly: 39990,
    priceYearly: 399900,
    maxProducts: 500,
    maxUsers: 5,
    features: ["pos", "inventory", "reports", "promotions"],
    active: true,
  },
  {
    id: 3,
    name: "Empresarial",
    code: "enterprise",
    priceMonthly: 79990,
    priceYearly: 799900,
    maxProducts: null,
    maxUsers: null,
    features: [
      "pos",
      "inventory",
      "reports",
      "promotions",
      "ai_catalog",
      "api_access",
    ],
    active: true,
  },
];

const mockTenants: Tenant[] = [
  {
    id: 1,
    name: "Botillería Punto 3",
    slug: "punto3",
    email: "contacto@punto3.cl",
    phone: "+56912345678",
    status: "active",
    city: "Santiago",
    region: "Metropolitana",
    createdAt: new Date("2024-01-15"),
    trialEndsAt: null,
    suspendedAt: null,
    suspendedReason: null,
    internalNotes: "Cliente desde enero 2024, pago puntual",
    subscription: {
      planName: "Profesional",
      status: "active",
      nextBillingDate: new Date("2025-01-15"),
    },
    metrics: {
      totalSales: 1523,
      totalRevenue: 15234500,
      totalProducts: 342,
      activeUsers: 3,
    },
  },
  {
    id: 2,
    name: "Minimarket Don Luis",
    slug: "donluis",
    email: "donluis@gmail.com",
    phone: "+56987654321",
    status: "suspended",
    city: "Valparaíso",
    region: "Valparaíso",
    createdAt: new Date("2024-06-10"),
    trialEndsAt: null,
    suspendedAt: new Date("2024-11-15"),
    suspendedReason: "Pago pendiente - 2 meses",
    internalNotes: "Contactado múltiples veces sin respuesta",
    subscription: {
      planName: "Básico",
      status: "past_due",
      nextBillingDate: new Date("2024-09-10"),
    },
    metrics: {
      totalSales: 456,
      totalRevenue: 3421000,
      totalProducts: 89,
      activeUsers: 1,
    },
  },
  {
    id: 3,
    name: "Licorería El Sol",
    slug: "elsol",
    email: "licoreria.elsol@hotmail.com",
    phone: "+56955555555",
    status: "trial",
    city: "Concepción",
    region: "Biobío",
    createdAt: new Date("2024-11-20"),
    trialEndsAt: new Date("2024-12-20"),
    suspendedAt: null,
    suspendedReason: null,
    internalNotes: "Interesado en plan Empresarial",
    subscription: {
      planName: "Trial",
      status: "trial",
      nextBillingDate: null,
    },
    metrics: {
      totalSales: 23,
      totalRevenue: 234500,
      totalProducts: 156,
      activeUsers: 2,
    },
  },
  {
    id: 4,
    name: "Botillería La Esquina",
    slug: "laesquina",
    email: "laesquina@gmail.com",
    phone: "+56944444444",
    status: "active",
    city: "Temuco",
    region: "Araucanía",
    createdAt: new Date("2024-03-01"),
    trialEndsAt: null,
    suspendedAt: null,
    suspendedReason: null,
    internalNotes: null,
    subscription: {
      planName: "Empresarial",
      status: "active",
      nextBillingDate: new Date("2025-03-01"),
    },
    metrics: {
      totalSales: 3421,
      totalRevenue: 45678900,
      totalProducts: 890,
      activeUsers: 7,
    },
  },
];

/**
 * Obtener todos los tenants con filtros
 */
export async function getTenants(req: Request, res: Response) {
  try {
    const { status, search, page = "1", limit = "20" } = req.query;

    let filtered = [...mockTenants];

    // Filtrar por status
    if (status && status !== "all") {
      filtered = filtered.filter((t) => t.status === status);
    }

    // Buscar por nombre, email o slug
    if (search && typeof search === "string") {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(term) ||
          t.email.toLowerCase().includes(term) ||
          t.slug.toLowerCase().includes(term)
      );
    }

    // Paginación
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(offset, offset + limitNum);

    res.json({
      tenants: paginated,
      total: filtered.length,
      page: pageNum,
      totalPages: Math.ceil(filtered.length / limitNum),
    });
  } catch (error: any) {
    console.error("Error fetching tenants:", error);
    res.status(500).json({ error: "Error al obtener tenants" });
  }
}

/**
 * Obtener un tenant específico con todos sus detalles
 */
export async function getTenantById(req: Request, res: Response) {
  try {
    const id = parseInt(String(req.params.id));
    const tenant = mockTenants.find((t) => t.id === id);

    if (!tenant) {
      return res.status(404).json({ error: "Tenant no encontrado" });
    }

    res.json(tenant);
  } catch (error: any) {
    console.error("Error fetching tenant:", error);
    res.status(500).json({ error: "Error al obtener tenant" });
  }
}

/**
 * Suspender un tenant
 */
export async function suspendTenant(req: Request, res: Response) {
  try {
    const id = parseInt(String(req.params.id));
    const { reason } = req.body;

    const tenantIndex = mockTenants.findIndex((t) => t.id === id);
    if (tenantIndex === -1) {
      return res.status(404).json({ error: "Tenant no encontrado" });
    }

    // En producción: actualizar en base de datos
    mockTenants[tenantIndex] = {
      ...mockTenants[tenantIndex],
      status: "suspended",
      suspendedAt: new Date(),
      suspendedReason: reason || "Suspendido por administrador",
    };

    // TODO: Enviar email de notificación al tenant
    // TODO: Registrar en audit log

    res.json({
      success: true,
      message: `Tenant "${mockTenants[tenantIndex].name}" suspendido correctamente`,
      tenant: mockTenants[tenantIndex],
    });
  } catch (error: any) {
    console.error("Error suspending tenant:", error);
    res.status(500).json({ error: "Error al suspender tenant" });
  }
}

/**
 * Reactivar un tenant suspendido
 */
export async function reactivateTenant(req: Request, res: Response) {
  try {
    const id = parseInt(String(req.params.id));

    const tenantIndex = mockTenants.findIndex((t) => t.id === id);
    if (tenantIndex === -1) {
      return res.status(404).json({ error: "Tenant no encontrado" });
    }

    mockTenants[tenantIndex] = {
      ...mockTenants[tenantIndex],
      status: "active",
      suspendedAt: null,
      suspendedReason: null,
    };

    res.json({
      success: true,
      message: `Tenant "${mockTenants[tenantIndex].name}" reactivado correctamente`,
      tenant: mockTenants[tenantIndex],
    });
  } catch (error: any) {
    console.error("Error reactivating tenant:", error);
    res.status(500).json({ error: "Error al reactivar tenant" });
  }
}

/**
 * Actualizar notas internas de un tenant
 */
export async function updateTenantNotes(req: Request, res: Response) {
  try {
    const id = parseInt(String(req.params.id));
    const { notes } = req.body;

    const tenantIndex = mockTenants.findIndex((t) => t.id === id);
    if (tenantIndex === -1) {
      return res.status(404).json({ error: "Tenant no encontrado" });
    }

    mockTenants[tenantIndex].internalNotes = notes;

    res.json({
      success: true,
      tenant: mockTenants[tenantIndex],
    });
  } catch (error: any) {
    console.error("Error updating tenant notes:", error);
    res.status(500).json({ error: "Error al actualizar notas" });
  }
}

/**
 * Obtener planes de suscripción
 */
export async function getPlans(req: Request, res: Response) {
  try {
    res.json(mockPlans);
  } catch (error: any) {
    console.error("Error fetching plans:", error);
    res.status(500).json({ error: "Error al obtener planes" });
  }
}

/**
 * Cambiar plan de un tenant
 */
export async function changeTenantPlan(req: Request, res: Response) {
  try {
    const id = parseInt(String(req.params.id));
    const { planId, billingCycle } = req.body;

    const tenantIndex = mockTenants.findIndex((t) => t.id === id);
    if (tenantIndex === -1) {
      return res.status(404).json({ error: "Tenant no encontrado" });
    }

    const plan = mockPlans.find((p) => p.id === planId);
    if (!plan) {
      return res.status(404).json({ error: "Plan no encontrado" });
    }

    mockTenants[tenantIndex].subscription = {
      planName: plan.name,
      status: "active",
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 días
    };

    res.json({
      success: true,
      message: `Plan actualizado a "${plan.name}"`,
      tenant: mockTenants[tenantIndex],
    });
  } catch (error: any) {
    console.error("Error changing plan:", error);
    res.status(500).json({ error: "Error al cambiar plan" });
  }
}

/**
 * Obtener dashboard de métricas globales
 */
export async function getDashboard(req: Request, res: Response) {
  try {
    const totalTenants = mockTenants.length;
    const activeTenants = mockTenants.filter(
      (t) => t.status === "active"
    ).length;
    const suspendedTenants = mockTenants.filter(
      (t) => t.status === "suspended"
    ).length;
    const trialTenants = mockTenants.filter((t) => t.status === "trial").length;

    const totalRevenue = mockTenants.reduce(
      (sum, t) => sum + (t.metrics?.totalRevenue || 0),
      0
    );
    const totalSales = mockTenants.reduce(
      (sum, t) => sum + (t.metrics?.totalSales || 0),
      0
    );

    // MRR (Monthly Recurring Revenue) simulado
    const mrr = activeTenants * 39990; // Promedio

    // Distribución por plan
    const planDistribution = [
      { plan: "Básico", count: 1, revenue: 19990 },
      { plan: "Profesional", count: 2, revenue: 79980 },
      { plan: "Empresarial", count: 1, revenue: 79990 },
    ];

    // Tenants que necesitan atención
    const needsAttention = mockTenants.filter(
      (t) =>
        t.status === "suspended" ||
        (t.status === "trial" &&
          t.trialEndsAt &&
          new Date(t.trialEndsAt) <
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    );

    res.json({
      summary: {
        totalTenants,
        activeTenants,
        suspendedTenants,
        trialTenants,
        mrr,
        totalRevenue,
        totalSales,
      },
      planDistribution,
      needsAttention,
      recentActivity: [
        {
          date: new Date(),
          action: "Nuevo registro",
          tenant: "Licorería El Sol",
        },
        {
          date: new Date(Date.now() - 86400000),
          action: "Pago recibido",
          tenant: "Botillería Punto 3",
        },
        {
          date: new Date(Date.now() - 172800000),
          action: "Suspendido",
          tenant: "Minimarket Don Luis",
        },
      ],
    });
  } catch (error: any) {
    console.error("Error fetching dashboard:", error);
    res.status(500).json({ error: "Error al obtener dashboard" });
  }
}

/**
 * Extender trial de un tenant
 */
export async function extendTrial(req: Request, res: Response) {
  try {
    const id = parseInt(String(req.params.id));
    const { days } = req.body;

    const tenantIndex = mockTenants.findIndex((t) => t.id === id);
    if (tenantIndex === -1) {
      return res.status(404).json({ error: "Tenant no encontrado" });
    }

    const currentEnd = mockTenants[tenantIndex].trialEndsAt || new Date();
    const newEnd = new Date(
      currentEnd.getTime() + (days || 7) * 24 * 60 * 60 * 1000
    );

    mockTenants[tenantIndex].trialEndsAt = newEnd;
    mockTenants[tenantIndex].status = "trial";

    res.json({
      success: true,
      message: `Trial extendido hasta ${newEnd.toLocaleDateString()}`,
      tenant: mockTenants[tenantIndex],
    });
  } catch (error: any) {
    console.error("Error extending trial:", error);
    res.status(500).json({ error: "Error al extender trial" });
  }
}
