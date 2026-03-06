import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";
import { ShoppingCart, Scan } from "lucide-react";
import { postJSON } from "./lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
// Lazy load heavy route components
const Dashboard = lazy(() =>
  import("./components/features/dashboard/Dashboard").then((m) => ({
    default: m.Dashboard,
  }))
);
const AdminPanel = lazy(() => import("./components/features/admin/AdminPanel"));
const Inventory = lazy(() =>
  import("./components/features/inventory/Inventory").then((m) => ({
    default: m.Inventory,
  }))
);
const SalesHistory = lazy(() =>
  import("./components/features/sales/SalesHistory").then((m) => ({
    default: m.SalesHistory,
  }))
);

// Lazy load heavy dialogs
const PriceCalculatorDialog = lazy(
  () => import("./components/features/tools/PriceCalculator")
);
const CashRegisterDialog = lazy(
  () => import("./components/features/cash/CashRegister")
);

// Keep lightweight components as regular imports
import { ProductCatalog } from "./components/features/catalog/ProductCatalog";
import { ShoppingCart as Cart } from "./components/features/cart/ShoppingCart";
import { BarcodeScanner } from "./components/common/BarcodeScanner";
import Login from "./components/features/auth/Login";
import { CashStatusProvider, useCashStatus } from "./hooks/CashStatusContext";
import { useAuth } from "./hooks/useAuth";
import { useCart } from "./hooks/useCart";
import { ViewType, Product, Sale } from "./types";
import { toast } from "sonner";
import Notifications from "./components/features/notifications/Notifications";
import { useInitialData } from "./hooks/useInitialData";
import { MainLayout } from "./components/layout/MainLayout";
import { CashStatusBadge } from "./components/features/cash/CashStatusBadge";
// Normalización de códigos eliminada: usar el código tal cual

/**
 * Main Application Component (Internal).
 *
 * Orchestrates the entire application flow, including:
 * - Routing (via conditional rendering of `currentView`)
 * - Global State Management (Auth, Cart, Data Fetching)
 * - Global Event Listeners (Keyboard shortcuts, SSE events)
 * - Layout and Navigation
 */
function PosAppContent() {
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const { user, loading: authLoading, logout: handleLogout, login } = useAuth();
  const {
    products,
    setProducts,
    sales,
    setSales,
    refreshAll: refreshData,
    fetchProducts,
    fetchSales,
  } = useInitialData(!authLoading && !!user);

  // Determinar qué opciones se pueden usar según el estado de la caja
  // IMPORTANTE: Debe estar antes del useEffect que usa refreshCashSession
  const {
    session: cashSession,
    mustOpen,
    closeAt,
    refresh: refreshCashSession,
  } = useCashStatus();

  // NOTA: SSE y eventos cash:session-changed ya se manejan en useMandatoryCashSession
  // Solo refrescamos datos de productos/ventas cuando hay cambios de sesión de caja
  // para evitar loops infinitos de re-render
  useEffect(() => {
    // Solo refrescar datos cuando la sesión cambia (no en cada evento)
    const onCashChange = () => {
      refreshData();
    };
    window.addEventListener("cash:session-changed", onCashChange);

    return () => {
      window.removeEventListener("cash:session-changed", onCashChange);
    };
  }, [refreshData]);

  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showPriceCalc, setShowPriceCalc] = useState(false);
  const [showCash, setShowCash] = useState(false);
  
  // Estado para detectar si hubo cierre automático reciente
  const [wasAutoClosedRecently, setWasAutoClosedRecently] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [reopenLoading, setReopenLoading] = useState(false);

  // Escuchar evento de cierre automático
  useEffect(() => {
    const onAutoClosed = () => {
      setWasAutoClosedRecently(true);
    };
    window.addEventListener("cash:auto-closed", onAutoClosed);
    return () => {
      window.removeEventListener("cash:auto-closed", onAutoClosed);
    };
  }, []);

  // Reset del flag cuando se abre una nueva sesión
  useEffect(() => {
    if (cashSession) {
      setWasAutoClosedRecently(false);
    }
  }, [cashSession]);

  // Función para reabrir caja con extensión de 2 horas
  const handleReopenCash = async () => {
    setShowReopenConfirm(false);
    setReopenLoading(true);
    try {
      // Abrir con windowClose extendido (+2 horas)
      const extendedClose = new Date(Date.now() + 2 * 60 * 60 * 1000);
      await postJSON("/api/cash-session/open", {
        openingAmount: 0, // Sin monto inicial para reapertura rápida
        windowClose: extendedClose.toISOString(),
      });
      toast.success("Caja reabierta (sesión extendida 2 horas)");
      setWasAutoClosedRecently(false);
      refreshCashSession();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo reabrir la caja");
    } finally {
      setReopenLoading(false);
    }
  };

  // Hook para navegar a SuperAdmin (app separada)
  const navigate = useNavigate();

  const {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalItems,
    getLastAdded,
    isRecentlyAdded,
  } = useCart();

  // Productos en stock crítico (activos con stock <= minStock). Permitimos 0 para que aparezcan también agotados bajo mínimo.
  const safeProducts = Array.isArray(products) ? products : [];
  const lowStockProducts = safeProducts.filter(
    (p: Product) => p.estado !== "DESHABILITADO" && p.stock <= p.minStock
  );

  // Seguimiento de notificaciones vistas
  const LS_KEY = "pos.lowstock.lastSeenSigs"; // firmas id:stock
  const lowSigs = lowStockProducts.map((p) => `${p.id}:${p.stock}`).sort();
  const [seenSigs, setSeenSigs] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    // Si cambia la lista (p.ej. nuevos productos críticos), no hacemos nada especial; el cálculo de unseenCount se ajusta solo.
  }, [lowSigs.join(",")]);
  const unseenCount = lowSigs.filter((sig) => !seenSigs.includes(sig)).length;
  const markLowAsSeen = () => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(lowSigs));
      setSeenSigs(lowSigs);
    } catch {}
  };

  const handleAddToCart = (product: Product, quantity: number) => {
    if (product.estado === "DESHABILITADO") {
      toast.error(`Producto deshabilitado: ${product.name}`);
      return;
    }

    const result = addToCart(product, quantity);

    if (result.success) {
      toast.success(`${product.name} agregado al carrito`, {
        duration: 1500,
        position: "bottom-right",
      });
    } else if (result.error) {
      toast.error(result.error);
    }
  };

  const handleCompleteSale = (sale: Sale) => {
    // Actualizar stock de productos
    setProducts((prevProducts: Product[]) =>
      prevProducts.map((product: Product) => {
        const soldItem = sale.items.find(
          (item) => item.productId === product.id
        );
        if (soldItem) {
          return {
            ...product,
            stock: product.stock - soldItem.quantity,
          };
        }
        return product;
      })
    );

    // Agregar venta al historial
    setSales((prevSales: Sale[]) => [sale, ...prevSales]);

    // Refrescar productos desde el backend para reflejar stock/estado derivado reales
    fetchProducts();
    // Refrescar ventas con detalle desde el backend
    fetchSales();

    toast.success(
      `Venta completada por $${sale.total.toLocaleString("es-CL")}`
    );
  };

  const handleUpdateStock = (productId: string, newStock: number) => {
    setProducts((prevProducts: Product[]) =>
      prevProducts.map((product: Product) =>
        product.id === Number(productId)
          ? { ...product, stock: newStock }
          : product
      )
    );

    const product = products.find((p: Product) => p.id === Number(productId));
    if (product) {
      toast.success(
        `Stock de ${product.name} actualizado a ${newStock} unidades`
      );
    }
  };

  // Usar hora de cierre de la sesión real si existe para sincronizar notificaciones
  const effectiveCloseAt = cashSession?.windowClose
    ? new Date(cashSession.windowClose)
    : closeAt;

  // Mantener una referencia local del windowClose actual (para toasts SSE)
  useEffect(() => {
    try {
      const iso = cashSession?.windowClose ?? null;
      if (iso) sessionStorage.setItem("pos.lastWindowClose", iso);
    } catch {}
  }, [cashSession?.windowClose]);

  const allBlocked = mustOpen; // cuando la caja está cerrada, bloquear todas las secciones operativas

  // Mapear atajos por vista
  const getShortcutFor = (id: string): string | null => {
    switch (id) {
      case "dashboard":
        return "Ctrl+1";
      case "catalog":
        return "Ctrl+2";
      case "cart":
        return "Ctrl+3";
      case "inventory":
        return "Ctrl+4";
      case "sales":
        return "Ctrl+5";
      case "admin":
        return "Ctrl+6";
      case "superadmin":
        return "Ctrl+0";
      default:
        return null;
    }
  };

  // Estado para controlar el escaneo en inventario
  const [inventoryBarcode, setInventoryBarcode] = useState<string>("");
  const [inventoryScanAction, setInventoryScanAction] = useState<
    "edit" | "add" | null
  >(null);

  const navigateTo = (view: ViewType) => {
    setCurrentView(view);
  };

  /**
   * Renders the main content based on the current view.
   * Uses Suspense for lazy-loaded components (Dashboard, Inventory, Sales, Admin).
   */
  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <Suspense fallback={<div className="p-4">Cargando dashboard...</div>}>
            <Dashboard
              products={products}
              onReviewCritical={() => {
                // Guardamos una bandera para que Inventory se ponga en filtro de críticos/casi críticos
                try {
                  sessionStorage.setItem(
                    "pos.inventory.filterCritical",
                    JSON.stringify({ low: true, out: true, near: true })
                  );
                } catch {}
                setCurrentView("inventory");
              }}
            />
          </Suspense>
        );
      case "catalog":
        return (
          <ProductCatalog products={products} onAddToCart={handleAddToCart} />
        );
      case "cart":
        return (
          <Cart
            cartItems={cartItems}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeFromCart}
            onClearCart={clearCart}
            onCompleteSale={handleCompleteSale}
          />
        );
      case "inventory":
        return (
          <Suspense
            fallback={<div className="p-4">Cargando inventario...</div>}
          >
            <Inventory
              products={products}
              onUpdateStock={handleUpdateStock}
              // Pasamos el término de búsqueda inicial cuando venimos desde notificaciones
              // y lo limpiamos al manejarlo dentro de Inventory
              scannedBarcode={inventoryBarcode}
              scanAction={inventoryScanAction}
              onScanHandled={() => {
                setInventoryBarcode("");
                setInventoryScanAction(null);
              }}
              active={currentView === "inventory"}
              onRefresh={fetchProducts}
            />
          </Suspense>
        );
      case "sales":
        return (
          <Suspense
            fallback={
              <div className="p-4">Cargando historial de ventas...</div>
            }
          >
            <SalesHistory sales={sales} />
          </Suspense>
        );
      case "admin":
        return (
          <Suspense
            fallback={<div className="p-4">Cargando panel de admin...</div>}
          >
            <AdminPanel products={products} sales={sales} />
          </Suspense>
        );
      // SuperAdmin se maneja en ruta separada /superadmin
      default:
        return (
          <Suspense fallback={<div className="p-4">Cargando dashboard...</div>}>
            <Dashboard products={products} />
          </Suspense>
        );
    }
  };

  // STRATEGIC COMMENT: Global Keyboard Shortcuts
  // We handle keyboard shortcuts at the top level to ensure they work regardless of the active view.
  // Special care is taken to:
  // 1. Ignore shortcuts when user is typing in an input/textarea
  // 2. Handle barcode scanner input (rapid numeric input ending in Enter)
  // 3. Route specific shortcuts (F1-F3) to global dialogs
  useEffect(() => {
    let barcode = "";
    let lastTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // No interferir con escritura en campos de texto (inputs, textareas, selects, contenteditable)
      const t = e.target as HTMLElement | null;
      const tag = (t?.tagName || "").toLowerCase();
      const isEditable =
        (t && (t as any).isContentEditable) ||
        tag === "input" ||
        tag === "textarea" ||
        tag === "select";
      // Permitir teclas de función/a-atajos, pero ignorar el resto si se está escribiendo
      const isFunctionKey = /^F\d{1,2}$/.test(e.key);
      if (
        isEditable &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !isFunctionKey
      ) {
        return;
      }
      // Atajos de navegación: Ctrl+1..6
      if (e.ctrlKey) {
        const key = e.key;
        const go = (view: ViewType) => {
          // SuperAdmin navega a app separada
          if (view === "superadmin") {
            if (user?.role !== "superadmin") {
              e.preventDefault();
              toast.error(
                "Solo superadministradores pueden acceder a esta sección"
              );
              return;
            }
            e.preventDefault();
            navigate("/superadmin");
            return;
          }
          if (
            view === "admin" &&
            user?.role !== "admin" &&
            user?.role !== "superadmin"
          ) {
            e.preventDefault();
            toast.error("Solo administradores pueden acceder a esta sección");
            return;
          }
          if (["catalog", "cart", "sales"].includes(view) && mustOpen) {
            e.preventDefault();
            toast.error("Debes abrir la caja para acceder a esta sección");
            return;
          }
          e.preventDefault();
          setCurrentView(view);
        };
        switch (key) {
          case "1":
            go("dashboard");
            return;
          case "2":
            go("catalog");
            return;
          case "3":
            go("cart");
            return;
          case "4":
            go("inventory");
            return;
          case "5":
            go("sales");
            return;
          case "6":
            go("admin");
            return;
          case "0":
            go("superadmin");
            return;
        }
      }
      // Abrir Caja (F1)
      if (e.key === "F1") {
        e.preventDefault();
        setShowBarcodeScanner(false);
        setShowPriceCalc(false);
        setShowCash(true);
        return;
      }

      // Abrir calculadora de precios (F2)
      if (e.key === "F2") {
        e.preventDefault();
        setShowBarcodeScanner(false);
        setShowCash(false);
        setShowPriceCalc(true);
        return;
      } else if (e.key === "Escape") {
        if (showBarcodeScanner) {
          setShowBarcodeScanner(false);
          return;
        }
        if (showPriceCalc) {
          setShowPriceCalc(false);
          return;
        }
        if (showCash) {
          setShowCash(false);
          return;
        }
      }

      // Escaneo automático en inventario
      if (currentView === "inventory") {
        const now = Date.now();
        if (now - lastTime > 200) {
          barcode = "";
        }
        lastTime = now;

        if (/^[0-9]$/.test(e.key)) {
          barcode += e.key;
        } else if (e.key === "Enter" && barcode.length >= 6) {
          const rawCode = barcode; // sin normalizar
          console.log("[Global Scanner - Inventory] Enter detectado, código:", rawCode, "len:", rawCode.length);
          
          // Buscar tanto con código original como normalizado
          const found = safeProducts.find(
            (p) => p.barCode === rawCode || p.barCode === barcode
          );
          if (found) {
            if (found.estado === "DESHABILITADO") {
              toast.error(`Producto deshabilitado (${barcode})`);
            } else {
              // Pasar el código tal cual
              setInventoryBarcode(rawCode);
              setInventoryScanAction("edit");
            }
          } else {
            // Pasar el código tal cual para alta
            console.log("[Global Scanner - Inventory] Código no encontrado, enviando a Inventory (add):", rawCode);
            setInventoryBarcode(rawCode);
            setInventoryScanAction("add");
            // No abrir overlay del escáner en Inventario; la vista abrirá la modal de alta
            setShowBarcodeScanner(false);
          }
          barcode = "";
        } else {
          barcode = "";
        }
        return;
      }

      // En cualquier vista excepto inventario, escanear agrega al carrito
      // Bloquear escaneo si caja cerrada
      if (mustOpen) {
        // Silencioso: ya hay banner y estado bloqueado; evitar spam de toasts por cada tecla
        return;
      }

      // Detectar entrada rápida de números (escáner)
      const now = Date.now();
      if (now - lastTime > 200) {
        barcode = "";
      }
      lastTime = now;

      // Solo números y Enter
      if (/^[0-9]$/.test(e.key)) {
        barcode += e.key;
      } else if (e.key === "Enter" && barcode.length >= 6) {
        const rawCode = barcode; // sin normalización
        console.log("[Global Scanner - Non-Inventory] Enter detectado, código:", rawCode, "len:", rawCode.length);
        
        // Buscar producto tanto con código original como normalizado
        const found = safeProducts.find(
          (p) => p.barCode === barcode || p.barCode === rawCode
        );
        if (found) {
          if (found.estado === "DESHABILITADO") {
            toast.error(`Producto deshabilitado (${barcode})`);
          } else {
            handleAddToCart(found, 1);
            // Feedback visual extra si no estamos en carrito
            if (currentView !== "cart") {
              toast.success(`${found.name} agregado al carrito`);
            }
          }
        } else {
          toast.error(`Producto con código ${barcode} no encontrado`);
        }
        barcode = "";
      } else {
        barcode = "";
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showBarcodeScanner, showPriceCalc, showCash, products, currentView]);

  // Mostrar pantalla de login si no está autenticado
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="size-16 mx-auto text-primary animate-pulse rounded-full bg-primary/20" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Login loginFn={login} onSuccess={() => setCurrentView("dashboard")} />
    );
  }

  const getTitle = () => {
    switch (currentView) {
      case "dashboard":
        return "Dashboard";
      case "catalog":
        return "Catálogo";
      case "cart":
        return "Carrito";
      case "inventory":
        return "Inventario";
      case "sales":
        return "Ventas";
      case "admin":
        return "Administración";
      case "superadmin":
        return "SuperAdmin - Gestión SaaS";
      default:
        return "Sistema de Ventas";
    }
  };

  const headerActions = (
    <>
      <Notifications
        products={products}
        onViewed={markLowAsSeen}
        onSelectProduct={(p) => {
          setCurrentView("inventory");
          const query = p.barCode?.trim() || p.name;
          try {
            sessionStorage.setItem("pos.inventory.prefillSearch", query);
          } catch {}
        }}
        onOpenCash={() => setShowCash(true)}
        cashOpen={Boolean(cashSession)}
        closeAt={effectiveCloseAt}
        onAutoCloseDetected={() => {
          try {
            window.dispatchEvent(new CustomEvent("cash:session-changed"));
          } catch {}
        }}
      />
      <CashStatusBadge
        onClick={() => {
          setShowBarcodeScanner(false);
          setShowPriceCalc(false);
          setShowCash(true);
        }}
      />
      <Button
        onClick={() => {
          setShowBarcodeScanner(false);
          setShowCash(false);
          setShowPriceCalc(true);
        }}
        variant="outline"
        className="flex items-center gap-2"
      >
        $ Precio
        <span className="hidden sm:inline text-xs text-muted-foreground">
          (F2)
        </span>
      </Button>
      {getTotalItems() > 0 && (
        <Button
          onClick={() => navigateTo("cart")}
          variant="default"
          className="flex items-center gap-2"
        >
          <ShoppingCart className="size-4" />
          Carrito ({getTotalItems()})
        </Button>
      )}
    </>
  );

  const AppShell = (
    <MainLayout
      currentView={currentView}
      onNavigate={navigateTo}
      blocked={allBlocked}
      unseenCount={unseenCount}
      title={getTitle()}
      headerActions={headerActions}
      cartItemCount={getTotalItems()}
      lastAddedProduct={getLastAdded()}
      isCartRecentlyUpdated={isRecentlyAdded()}
    >
      {mustOpen ? (
        <div className="max-w-xl mx-auto p-6 border rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100">
          <h2 className="text-lg font-semibold mb-2">
            {wasAutoClosedRecently ? "La caja se cerró automáticamente" : "Debes abrir la caja"}
          </h2>
          <p className="mb-4">
            {wasAutoClosedRecently 
              ? "El turno terminó y la caja se cerró automáticamente. Puedes reabrir para extender la sesión 2 horas más."
              : "Para operar el sistema primero abre la caja. El cierre automático ocurrirá a la hora establecida."
            }
          </p>
          <div className="flex gap-2">
            {wasAutoClosedRecently ? (
              <>
                <Button 
                  onClick={() => setShowReopenConfirm(true)}
                  disabled={reopenLoading}
                >
                  {reopenLoading ? "Reabriendo..." : "Reabrir caja (+2 hrs)"}
                </Button>
                <Button variant="outline" onClick={() => setShowCash(true)}>
                  Abrir nueva sesión
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowCash(true)}>Abrir caja ahora</Button>
            )}
          </div>
        </div>
      ) : (
        renderContent()
      )}
      {/* Componente del escáner de código de barras */}
      <BarcodeScanner
        products={products}
        onAddToCart={handleAddToCart}
        isVisible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        context={currentView === "inventory" ? "inventory" : "cart"}
        onBarcodeForInventory={
          currentView === "inventory"
            ? (barcode) => {
                const rawCode = (barcode || "").trim();
                if (!rawCode) return;
                // Siempre enrutar el código al flujo de inventario;
                // Inventory decidirá si abre modal o crea tarjeta según su modo de vista
                setCurrentView("inventory");
                setInventoryBarcode(rawCode);
                setInventoryScanAction("add");
              }
            : undefined
        }
      />
      <Suspense fallback={null}>
        <PriceCalculatorDialog
          isOpen={showPriceCalc}
          onClose={() => setShowPriceCalc(false)}
        />
      </Suspense>
      <Suspense fallback={null}>
        <CashRegisterDialog
          isOpen={showCash}
          onClose={() => setShowCash(false)}
          onCashClosed={() => {
            // Al cerrar la caja, navegar al Dashboard
            setCurrentView("dashboard");
            setShowCash(false);
            // Forzar refresh inmediato del estado de caja
            refreshCashSession();
          }}
        />
      </Suspense>
      
      {/* Diálogo de confirmación para reabrir */}
      <Dialog open={showReopenConfirm} onOpenChange={setShowReopenConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Reabrir la caja?</DialogTitle>
            <DialogDescription>
              La caja se cerró automáticamente al terminar el turno. 
              Al reabrir, la sesión se extenderá 2 horas más.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowReopenConfirm(false)}
              disabled={reopenLoading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleReopenCash}
              disabled={reopenLoading}
            >
              {reopenLoading ? "Reabriendo..." : "Sí, reabrir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <Toaster />
    </MainLayout>
  );

  return AppShell;
}

// Componente wrapper que provee el contexto de caja
export default function PosApp() {
  return (
    <CashStatusProvider>
      <PosAppContent />
    </CashStatusProvider>
  );
}
