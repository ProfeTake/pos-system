/**
 * Demo Store — estado mutable en memoria para la sesión demo.
 *
 * Se inicializa desde los fixtures y permite CRUD completo.
 * Todo vive en RAM; al cerrar la pestaña o hacer logout se pierde.
 */
import type { Product, Sale } from "@/types";
import { demoProducts } from "./fixtures/products";
import { demoSales } from "./fixtures/sales";
import {
  demoCashSession,
  demoCashBalance,
  demoCashMovements,
  demoCustomers,
  demoPromotions,
  demoSupplierInvoices,
} from "./fixtures/index";

// ─── Helpers ─────────────────────────────────────────────────────────────

let _nextId = 10000;
function nextId(): number {
  return _nextId++;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ─── Store singleton ─────────────────────────────────────────────────────

class DemoStore {
  products: Product[] = [];
  sales: Sale[] = [];
  cashSession: any = null;
  cashBalance: any = null;
  cashMovements: any[] = [];
  customers: any[] = [];
  promotions: any[] = [];
  supplierInvoices: any[] = [];
  private _initialized = false;

  /** Inicializa (o reinicializa) el store con los datos de los fixtures */
  init() {
    this.products = deepClone(demoProducts);
    this.sales = deepClone(demoSales);
    this.cashSession = deepClone(demoCashSession);
    this.cashBalance = deepClone(demoCashBalance);
    this.cashMovements = deepClone(demoCashMovements);
    this.customers = deepClone(demoCustomers);
    this.promotions = deepClone(demoPromotions);
    this.supplierInvoices = deepClone(demoSupplierInvoices);
    this._initialized = true;
  }

  /** Devuelve true si el store fue inicializado */
  get ready() {
    return this._initialized;
  }

  /** Limpia todo (para logout) */
  reset() {
    this.products = [];
    this.sales = [];
    this.cashSession = null;
    this.cashBalance = null;
    this.cashMovements = [];
    this.customers = [];
    this.promotions = [];
    this.supplierInvoices = [];
    this._initialized = false;
  }

  // ── Products CRUD ───────────────────────────────────────────────────

  getProduct(id: number): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  getProductByBarcode(code: string): Product | undefined {
    return this.products.find((p) => p.barCode === code);
  }

  addProduct(data: any): Product {
    const product: Product = {
      id: nextId(),
      name: data.name || "Nuevo producto",
      category: data.category || "Sin categoría",
      stock: data.stock ?? 0,
      minStock: data.minStock ?? 0,
      price: data.price ?? 0,
      cost: data.cost ?? 0,
      marginPct: data.marginPct ?? 0,
      barCode: data.barCode || data.BarCode || null,
      ml: data.ml ?? 0,
      measureUnit: data.measureUnit || "ml",
      estado: "NORMAL",
    };
    this.products.push(product);
    return product;
  }

  updateProduct(id: number, data: any): Product | null {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.products[idx] = { ...this.products[idx], ...data, id };
    return this.products[idx];
  }

  deleteProduct(id: number): boolean {
    const len = this.products.length;
    this.products = this.products.filter((p) => p.id !== id);
    return this.products.length < len;
  }

  // ── Sales CRUD ──────────────────────────────────────────────────────

  addSale(data: any): any {
    const sale = {
      id: nextId(),
      items: (data.items || []).map((item: any, idx: number) => ({
        id: nextId() + idx,
        saleId: 0, // se llena abajo
        productId: item.productId,
        productName: item.productName || this.getProduct(item.productId)?.name || "Producto",
        quantity: item.quantity || 1,
        price: item.price || 0,
        subtotal: (item.price || 0) * (item.quantity || 1),
        product: {
          id: item.productId,
          name: item.productName || this.getProduct(item.productId)?.name || "Producto",
          price: item.price || 0,
        },
      })),
      total: data.total || 0,
      date: new Date(),
      paymentMethod: data.paymentMethod || "efectivo",
      status: "completed",
      customerName: data.customerName,
    };
    sale.items.forEach((it: any) => { it.saleId = sale.id; });

    // Descontar stock
    for (const item of sale.items) {
      const prod = this.getProduct(item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        if (prod.stock <= 0) prod.estado = "AGOTADO" as any;
        else if (prod.stock <= prod.minStock) prod.estado = "BAJO" as any;
      }
    }

    this.sales.unshift(sale as any);
    return sale;
  }

  voidSale(id: number): any {
    const sale = this.sales.find((s) => s.id === id);
    if (sale) {
      (sale as any).status = "voided";
      (sale as any).voidedAt = new Date().toISOString();
    }
    return { success: true, sale };
  }

  // ── Customers CRUD ──────────────────────────────────────────────────

  addCustomer(data: any): any {
    const customer = {
      id: nextId(),
      name: data.name || "Nuevo cliente",
      email: data.email || "",
      phone: data.phone || "",
      rut: data.rut || "",
      address: data.address || "",
      creditLimit: data.creditLimit ?? 0,
      creditUsed: 0,
      loyaltyPoints: 0,
      totalPurchases: 0,
      totalSales: 0,
      lastPurchase: null,
      notes: data.notes || "",
      active: true,
      createdAt: new Date().toISOString(),
    };
    this.customers.push(customer);
    return customer;
  }

  updateCustomer(id: number, data: any): any {
    const idx = this.customers.findIndex((c: any) => c.id === id);
    if (idx === -1) return null;
    this.customers[idx] = { ...this.customers[idx], ...data, id };
    return this.customers[idx];
  }

  deleteCustomer(id: number): boolean {
    const len = this.customers.length;
    this.customers = this.customers.filter((c: any) => c.id !== id);
    return this.customers.length < len;
  }

  // ── Promotions CRUD ─────────────────────────────────────────────────

  addPromotion(data: any): any {
    const promo = {
      id: nextId(),
      ...data,
      usedCount: 0,
      status: "active",
      isActive: true,
      active: true,
      createdAt: new Date().toISOString(),
    };
    this.promotions.push(promo);
    return promo;
  }

  updatePromotion(id: number, data: any): any {
    const idx = this.promotions.findIndex((p: any) => p.id === id);
    if (idx === -1) return null;
    this.promotions[idx] = { ...this.promotions[idx], ...data, id };
    return this.promotions[idx];
  }

  deletePromotion(id: number): boolean {
    const len = this.promotions.length;
    this.promotions = this.promotions.filter((p: any) => p.id !== id);
    return this.promotions.length < len;
  }

  // ── Cash Session ────────────────────────────────────────────────────

  openCashSession(data: any): any {
    this.cashSession = {
      ...deepClone(demoCashSession),
      id: nextId(),
      openTime: new Date().toISOString(),
      initialCash: data.openingAmount ?? 50000,
      closeTime: null,
      isOpen: true,
      open: true,
      totalSales: 0,
      cashBalance: data.openingAmount ?? 50000,
      salesCount: 0,
      windowOpen: data.windowOpen,
      windowClose: data.windowClose,
    };
    this.cashBalance = {
      balance: data.openingAmount ?? 50000,
      initialCash: data.openingAmount ?? 50000,
      movements: [],
    };
    this.cashMovements = [];
    return this.cashSession;
  }

  closeCashSession(data: any): any {
    if (this.cashSession) {
      this.cashSession.closeTime = new Date().toISOString();
      this.cashSession.isOpen = false;
      this.cashSession.open = false;
      this.cashSession.declaredCash = data?.closingAmount ?? null;
    }
    return this.cashSession;
  }

  addCashMovement(data: any): any {
    const movement = {
      id: nextId(),
      sessionId: this.cashSession?.id ?? 42,
      type: data.type || "entrada",
      amount: data.amount || 0,
      reason: data.description || data.reason || "",
      description: data.description || "",
      createdAt: new Date().toISOString(),
      paymentMethod: data.paymentMethod || "efectivo",
    };
    this.cashMovements.push(movement);
    return movement;
  }
}

/** Singleton global del store demo */
export const demoStore = new DemoStore();
