// ============== PERMISOS Y ROLES PREDEFINIDOS ==============

// Lista de permisos disponibles
export const PERMISSIONS = {
  // Ventas
  SALES_CREATE: "sales.create",
  SALES_VIEW: "sales.view",
  SALES_REFUND: "sales.refund",
  SALES_VOID: "sales.void",
  SALES_CANCEL: "sales.cancel",
  SALES_DISCOUNT: "sales.discount",
  
  // Productos
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_VIEW: "products.view",
  PRODUCTS_EDIT: "products.edit",
  PRODUCTS_DELETE: "products.delete",
  PRODUCTS_VIEW_COST: "products.viewCost",
  
  // Inventario
  INVENTORY_ADJUST: "inventory.adjust",
  INVENTORY_VIEW: "inventory.view",
  
  // Reportes
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
  REPORTS_SALES: "reports.sales",
  REPORTS_INVENTORY: "reports.inventory",
  REPORTS_FINANCIAL: "reports.financial",
  
  // Configuración
  CONFIG_VIEW: "config.view",
  CONFIG_EDIT: "config.edit",
  
  // Usuarios
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",
  
  // Caja
  CASH_OPEN: "cash.open",
  CASH_CLOSE: "cash.close",
  CASH_VIEW_HISTORY: "cash.viewHistory",
  CASH_MOVEMENTS: "cash.movements",
  
  // Promociones
  PROMOTIONS_VIEW: "promotions.view",
  PROMOTIONS_CREATE: "promotions.create",
  PROMOTIONS_EDIT: "promotions.edit",
  PROMOTIONS_DELETE: "promotions.delete",
  
  // Clientes/CRM
  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_MANAGE: "customers.manage",
  CUSTOMERS_CREDIT: "customers.credit",
  
  // Auditoría
  AUDIT_VIEW: "audit.view",
  
  // Admin
  ADMIN_FULL: "admin.full",
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Roles predefinidos con sus permisos
export const PREDEFINED_ROLES = {
  owner: {
    name: "Propietario",
    description: "Acceso total al sistema",
    permissions: Object.values(PERMISSIONS),
  },
  admin: {
    name: "Administrador",
    description: "Gestión operativa completa",
    permissions: [
      PERMISSIONS.SALES_CREATE,
      PERMISSIONS.SALES_VIEW,
      PERMISSIONS.SALES_REFUND,
      PERMISSIONS.SALES_VOID,
      PERMISSIONS.SALES_CANCEL,
      PERMISSIONS.SALES_DISCOUNT,
      PERMISSIONS.PRODUCTS_CREATE,
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.PRODUCTS_EDIT,
      PERMISSIONS.PRODUCTS_DELETE,
      PERMISSIONS.PRODUCTS_VIEW_COST,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.REPORTS_SALES,
      PERMISSIONS.REPORTS_INVENTORY,
      PERMISSIONS.REPORTS_FINANCIAL,
      PERMISSIONS.CONFIG_VIEW,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_EDIT,
      PERMISSIONS.CASH_OPEN,
      PERMISSIONS.CASH_CLOSE,
      PERMISSIONS.CASH_VIEW_HISTORY,
      PERMISSIONS.CASH_MOVEMENTS,
      PERMISSIONS.PROMOTIONS_VIEW,
      PERMISSIONS.PROMOTIONS_CREATE,
      PERMISSIONS.PROMOTIONS_EDIT,
      PERMISSIONS.PROMOTIONS_DELETE,
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.CUSTOMERS_MANAGE,
      PERMISSIONS.CUSTOMERS_CREDIT,
      PERMISSIONS.AUDIT_VIEW,
    ],
  },
  manager: {
    name: "Gerente",
    description: "Gestión de ventas e inventario",
    permissions: [
      PERMISSIONS.SALES_CREATE,
      PERMISSIONS.SALES_VIEW,
      PERMISSIONS.SALES_REFUND,
      PERMISSIONS.SALES_CANCEL,
      PERMISSIONS.SALES_DISCOUNT,
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.PRODUCTS_EDIT,
      PERMISSIONS.PRODUCTS_VIEW_COST,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_SALES,
      PERMISSIONS.REPORTS_INVENTORY,
      PERMISSIONS.CASH_OPEN,
      PERMISSIONS.CASH_CLOSE,
      PERMISSIONS.CASH_VIEW_HISTORY,
      PERMISSIONS.CASH_MOVEMENTS,
      PERMISSIONS.PROMOTIONS_VIEW,
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.CUSTOMERS_MANAGE,
      PERMISSIONS.CUSTOMERS_CREDIT,
    ],
  },
  cashier: {
    name: "Cajero",
    description: "Solo operaciones de caja",
    permissions: [
      PERMISSIONS.SALES_CREATE,
      PERMISSIONS.SALES_VIEW,
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.CASH_OPEN,
      PERMISSIONS.CASH_CLOSE,
      PERMISSIONS.CASH_MOVEMENTS,
      PERMISSIONS.PROMOTIONS_VIEW,
      PERMISSIONS.CUSTOMERS_VIEW,
    ],
  },
  inventory: {
    name: "Inventarista",
    description: "Solo gestión de inventario",
    permissions: [
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.PRODUCTS_EDIT,
      PERMISSIONS.PRODUCTS_CREATE,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.INVENTORY_VIEW,
    ],
  },
  accountant: {
    name: "Contador",
    description: "Solo reportes y documentación",
    permissions: [
      PERMISSIONS.SALES_VIEW,
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.PRODUCTS_VIEW_COST,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.AUDIT_VIEW,
    ],
  },
  viewer: {
    name: "Solo Lectura",
    description: "Visualización sin modificaciones",
    permissions: [
      PERMISSIONS.SALES_VIEW,
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.REPORTS_VIEW,
    ],
  },
};
