import { useEffect, useState } from "react";
import { ShoppingCart, CheckCircle2 } from "lucide-react";

interface CartAddEventDetail {
  id: number;
  name: string;
  quantity: number;
  totalItems: number;
  price: number;
}

interface AlertItem extends CartAddEventDetail {
  uid: string; // unique for list
  createdAt: number;
}

/**
 * Visual overlay de confirmación cuando se agrega un producto al carrito.
 * Similar a la señalización de stock crítico en dashboard (usa borde destacado y badge).
 */
export function CartAddAlerts() {
  const [items, setItems] = useState<AlertItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CartAddEventDetail>).detail;
      if (!detail) return;
      setItems((prev) => {
        const next: AlertItem[] = [
          {
            ...detail,
            uid: `${Date.now()}-${detail.id}-${Math.random()}`,
            createdAt: Date.now(),
          },
          ...prev,
        ].slice(0, 5); // mantener máximo 5 visibles
        return next;
      });
    };
    window.addEventListener("cart:item-added", handler as EventListener);
    return () =>
      window.removeEventListener("cart:item-added", handler as EventListener);
  }, []);

  // Auto remover después de 3.5s
  useEffect(() => {
    if (!items.length) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setItems((prev) => prev.filter((i) => now - i.createdAt < 3500));
    }, 500);
    return () => clearInterval(interval);
  }, [items.length]);

  if (!items.length) return null;

  return (
    <div className="fixed z-40 bottom-4 right-4 flex flex-col gap-2 w-72 pointer-events-none">
      {items.map((item) => (
        <div
          key={item.uid}
          className="group relative overflow-hidden rounded-md border border-green-500/50 bg-background/90 backdrop-blur shadow-sm p-3 animate-in fade-in slide-in-from-right pointer-events-auto"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-green-600">
              <CheckCircle2 className="size-5" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium flex items-center gap-1">
                <ShoppingCart className="size-4 text-muted-foreground" />
                {item.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Agregado x{item.quantity} • Total items: {item.totalItems}
              </p>
              <p className="text-xs font-semibold">
                Subtotal añadido: $
                {(item.quantity * item.price).toLocaleString("es-CL")}
              </p>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-green-500/80 to-green-400 animate-[shrink_3.4s_linear_forwards]" />
        </div>
      ))}
      <style>{`
        @keyframes shrink { from { width:100%; } to { width:0%; } }
      `}</style>
    </div>
  );
}
