/**
 * ScanResultBanner.tsx — Banner de resultado de escaneo
 *
 * Muestra un banner animado con la información del último producto
 * escaneado/agregado. Se auto-desvanece después de 3 segundos.
 *
 * Variantes:
 *   - Toast flotante (fullscreen mode): mini-banner en la parte superior
 *   - Banner inline (modal mode): alerta verde dentro del card
 */

import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "../../ui/alert";
import { CheckCircle, Package, AlertTriangle } from "lucide-react";
import { Product } from "../../../types";

// ============================================================
// Estilos
// ============================================================

export const RESULT_BANNER_STYLES = `
  @keyframes slideDownFade {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideUpFadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-4px); }
  }
  @keyframes toastSlideIn {
    from { opacity: 0; transform: translateY(-100%); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes toastSlideOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-100%); }
  }
`;

// ============================================================
// Tipos
// ============================================================

interface ScanResultBannerProps {
  /** Producto escaneado */
  product: Product | null;
  /** Si es vista fullscreen (muestra como toast flotante) */
  isFullscreen: boolean;
  /** Callback cuando el banner se oculta automáticamente */
  onDismiss?: () => void;
}

// ============================================================
// Componente
// ============================================================

export function ScanResultBanner({
  product,
  isFullscreen,
  onDismiss,
}: ScanResultBannerProps) {
  const [isFading, setIsFading] = useState(false);
  const [visibleProduct, setVisibleProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (product) {
      setVisibleProduct(product);
      setIsFading(false);

      const fadeTimer = setTimeout(() => setIsFading(true), 2600);
      const clearTimer = setTimeout(() => {
        setVisibleProduct(null);
        setIsFading(false);
        onDismiss?.();
      }, 3000);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [product, onDismiss]);

  if (!visibleProduct) return null;

  // === Modo fullscreen: toast flotante en la parte superior ===
  if (isFullscreen) {
    return (
      <div
        className="absolute top-0 left-0 right-0 z-20 px-4"
        style={{ paddingTop: "env(safe-area-inset-top, 12px)" }}
      >
        <div
          className="bg-green-600/90 backdrop-blur-md rounded-b-xl px-4 py-3 flex items-center gap-3 shadow-xl"
          style={{
            animation: isFading
              ? "toastSlideOut 400ms ease-in forwards"
              : "toastSlideIn 300ms ease-out",
          }}
        >
          <CheckCircle className="size-5 text-white shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">
              {visibleProduct.name}
            </div>
            <div className="text-white/70 text-xs">
              ${visibleProduct.price.toLocaleString("es-CL")} · Stock:{" "}
              {visibleProduct.stock}
            </div>
          </div>
          <Package className="size-4 text-white/60 shrink-0" />
        </div>
      </div>
    );
  }

  // === Modo modal: banner inline ===
  return (
    <Alert
      className="border-green-200 bg-green-50 py-2"
      style={{
        animation: isFading
          ? "slideUpFadeOut 400ms ease-in forwards"
          : "slideDownFade 220ms ease-out",
      }}
    >
      <CheckCircle className="size-3 text-green-600" />
      <AlertDescription className="text-green-800 text-xs">
        <strong>Agregado:</strong> {visibleProduct.name} - $
        {visibleProduct.price.toLocaleString("es-CL")}
      </AlertDescription>
    </Alert>
  );
}
