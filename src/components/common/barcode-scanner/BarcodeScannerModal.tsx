/**
 * BarcodeScannerModal.tsx — Escáner de códigos de barra (v2)
 *
 * Componente principal completamente rediseñado para uso móvil:
 *
 * Mejoras sobre v1:
 *   - Vista fullscreen en smartphones/tablets (100dvh), modal en desktop
 *   - Viewfinder con guía de encuadre y zona oscurecida
 *   - Control de linterna (torch) para ambientes oscuros
 *   - Control de zoom digital/óptico
 *   - Selector de cámara (flip front/back)
 *   - Modo escaneo continuo (sin cerrar entre escaneos)
 *   - Feedback háptico (vibración) + sonoro (beep)
 *   - Historial de escaneos en sesión
 *   - QuaggaJS bundleado localmente (no CDN, funciona offline)
 *   - Loading states granulares por etapa
 *   - Soporte safe areas (notch, Dynamic Island, barras de navegación)
 *   - Arquitectura modular (hooks + sub-componentes)
 *
 * Props 100% compatibles con BarcodeScanner v1.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { X, Scan, ChevronDown } from "lucide-react";
import { Product } from "../../../types";
import { toast } from "sonner";

// Hooks
import { useCameraStream } from "../../../hooks/useCameraStream";
import { useBarcodeDetection } from "../../../hooks/useBarcodeDetection";

// Sub-componentes
import { CameraViewfinder, VIEWFINDER_STYLES } from "./CameraViewfinder";
import { ScannerControls } from "./ScannerControls";
import { ManualInput } from "./ManualInput";
import { ScanResultBanner, RESULT_BANNER_STYLES } from "./ScanResultBanner";
import { ScanHistory } from "./ScanHistory";

// ============================================================
// Tipos
// ============================================================

interface BarcodeScannerProps {
  /** Lista de productos en memoria para búsqueda local */
  products: Product[];
  /** Callback para agregar producto al carrito (contexto "cart") */
  onAddToCart: (product: Product, quantity: number) => void;
  /** Controla la visibilidad del modal */
  isVisible: boolean;
  /** Callback para cerrar el modal */
  onClose: () => void;
  /** Contexto de uso: "cart" agrega al carrito, "inventory" pasa código al inventario */
  context: "cart" | "inventory";
  /** Callback cuando se escanea un código en contexto inventario */
  onBarcodeForInventory?: (barcode: string) => void;
  /**
   * Motor de escaneo a utilizar:
   * - "native": API nativa BarcodeDetector (Chrome/Edge). Si no está disponible, usa QuaggaJS.
   * - "quagga": Fuerza el uso de QuaggaJS (más consistente cross-browser).
   * Por defecto: "quagga"
   */
  scanEngine?: "native" | "quagga";
}

// ============================================================
// Constantes
// ============================================================

/** Detecta si es dispositivo móvil o tablet */
const isMobileDevice = (): boolean =>
  typeof navigator !== "undefined" &&
  (/Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent) ||
    (typeof window !== "undefined" && window.innerWidth < 768));

// ============================================================
// Estilos CSS globales del escáner
// ============================================================

const MODAL_STYLES = `
  @keyframes modalFadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes modalFadeOut { from { opacity: 1 } to { opacity: 0 } }
  @keyframes modalScaleIn { from { opacity:0; transform: scale(.96) } to { opacity:1; transform: scale(1) } }
  @keyframes modalScaleOut { from { opacity:1; transform: scale(1) } to { opacity:0; transform: scale(.96) } }
  @keyframes fadeInUp { from { opacity:0; transform: translateY(6px) } to { opacity:1; transform: translateY(0) } }

  /* Fullscreen scanner: ocupa toda la pantalla con safe areas */
  .scanner-fullscreen {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: black;
    display: flex;
    flex-direction: column;
  }

  /* Handle para drag-down */
  .scanner-drag-handle {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: rgba(255,255,255,0.3);
    margin: 8px auto;
  }
`;

const ALL_STYLES = [MODAL_STYLES, VIEWFINDER_STYLES, RESULT_BANNER_STYLES].join("\n");

// ============================================================
// Componente principal
// ============================================================

export function BarcodeScanner({
  products,
  onAddToCart,
  isVisible,
  onClose,
  context,
  onBarcodeForInventory,
  scanEngine = "quagga",
}: BarcodeScannerProps) {
  // === Estado de UI ===
  const [quantity, setQuantity] = useState(1);
  const [isExiting, setIsExiting] = useState(false);
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  const [continuousMode, setContinuousMode] = useState(false);
  const [confirmFlash, setConfirmFlash] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  // Detectar tipo de dispositivo (se fija al montar)
  const [isMobile] = useState(() => isMobileDevice());
  const isFullscreen = isMobile;

  // === Camera hook ===
  const camera = useCameraStream();

  // === Detection hook ===
  const detection = useBarcodeDetection({
    scanEngine,
    continuousMode,
    onCodeAccepted: useCallback(
      async (code: string) => {
        await processAcceptedCode(code);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [context, products, onBarcodeForInventory, onAddToCart, quantity, continuousMode]
    ),
    hapticFeedback: true,
    soundFeedback: true,
  });

  // Ref para evitar stale closures en processAcceptedCode
  const stateRef = useRef({
    context,
    products,
    onBarcodeForInventory,
    onAddToCart,
    onClose,
    quantity,
    continuousMode,
  });
  useEffect(() => {
    stateRef.current = {
      context,
      products,
      onBarcodeForInventory,
      onAddToCart,
      onClose,
      quantity,
      continuousMode,
    };
  });

  // ============================================================
  // Ciclo de vida
  // ============================================================

  /** Montaje/desmontaje con animación */
  useEffect(() => {
    if (isVisible) {
      setIsExiting(false);
      setShouldRender(true);

      // Auto-iniciar cámara en móvil
      if (isMobile) {
        startFullFlow();
      }
    } else if (!isVisible && shouldRender) {
      setIsExiting(true);
      const timeout = setTimeout(() => setShouldRender(false), 220);
      stopAll();
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  // ============================================================
  // Flujos de cámara + detección
  // ============================================================

  const startFullFlow = useCallback(async () => {
    try {
      await camera.startCamera();
      // Esperar a que el video se inicie antes de conectar la detección
      setTimeout(async () => {
        try {
          await detection.startDetection(
            camera.videoRef.current,
            camera.streamRef.current
          );
        } catch (e: any) {
          // La detección puede fallar sin video; solo log
          console.warn("Detection start error:", e?.message);
        }
      }, 500);
    } catch {
      // Camera start ya setea su propio error state
    }
  }, [camera, detection]);

  const stopAll = useCallback(() => {
    detection.stopDetection();
    camera.stopCamera();
  }, [camera, detection]);

  // Cuando la cámara pasa a "active", iniciar detección
  useEffect(() => {
    if (camera.status === "active" && !detection.isDetecting) {
      detection
        .startDetection(camera.videoRef.current, camera.streamRef.current)
        .catch(() => {
          /* ignorar — se maneja en el hook */
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera.status]);

  // ============================================================
  // Procesamiento de código aceptado
  // ============================================================

  async function processAcceptedCode(code: string) {
    const {
      context: ctx,
      products: prods,
      onBarcodeForInventory: onInv,
      onAddToCart: addToCart,
      onClose: close,
      quantity: qty,
      continuousMode: contMode,
    } = stateRef.current;

    // Flash visual de confirmación
    setConfirmFlash(true);
    setTimeout(() => setConfirmFlash(false), 400);

    // Copiar al portapapeles (silencioso)
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* ok */
    }

    // Promociones (PROMO-*)
    if (code.toUpperCase().startsWith("PROMO-")) {
      try {
        const { promotionsService } = await import(
          "../../../services/promotions.service"
        );
        const promotion = await promotionsService.getByBarcode(code);
        if (promotion) {
          toast.success(`Promoción detectada: ${promotion.name}`);
          toast.info(
            `Aplica: ${promotion.description || "Descuento especial"}`
          );
          if (!contMode) {
            stopAll();
            close();
          }
          return;
        }
      } catch (err: any) {
        if (err?.status === 404) {
          toast.error("Promoción no encontrada o inactiva");
        } else {
          toast.error("Error al buscar la promoción");
        }
        return;
      }
    }

    // Contexto inventario
    if (ctx === "inventory" && onInv) {
      if (!contMode) {
        stopAll();
        close();
      }
      onInv(code);
      return;
    }

    // Contexto carrito
    const found = prods.find((p) => p.barCode === code);
    if (found) {
      setLastScannedProduct(found);

      if (found.stock <= 0) {
        toast.error(`${found.name} está agotado`);
        detection.updateHistoryEntry(code, false);
        return;
      }
      if (qty > found.stock) {
        toast.error(
          `Stock insuficiente. Solo quedan ${found.stock} unidades de ${found.name}`
        );
        detection.updateHistoryEntry(code, false);
        return;
      }

      addToCart(found, qty);
      setQuantity(1);

      if (!contMode) {
        stopAll();
        close();
      }
    } else {
      toast.error("Producto no encontrado");
      detection.updateHistoryEntry(code, false);
    }
  }

  // ============================================================
  // Handlers
  // ============================================================

  const handleClose = useCallback(() => {
    stopAll();
    onClose();
  }, [stopAll, onClose]);

  const handleProductFound = useCallback(
    (product: Product) => {
      setLastScannedProduct(product);

      if (product.stock <= 0) {
        toast.error(`${product.name} está agotado`);
        return;
      }
      if (quantity > product.stock) {
        toast.error(
          `Stock insuficiente. Solo quedan ${product.stock} unidades de ${product.name}`
        );
        return;
      }

      if (context === "cart") {
        onAddToCart(product, quantity);
        setQuantity(1);
      }
    },
    [context, onAddToCart, quantity]
  );

  const handleToggleContinuous = useCallback(() => {
    setContinuousMode((prev) => {
      const next = !prev;
      if (next) {
        toast.info("Escaneo continuo activado", {
          description: "El escáner seguirá activo entre escaneos",
        });
        // Resetear detección por si estaba bloqueada
        detection.resetDetection();
      } else {
        toast.info("Escaneo continuo desactivado");
      }
      return next;
    });
  }, [detection]);

  const handleStartCamera = useCallback(() => {
    startFullFlow();
  }, [startFullFlow]);

  const handleStopCamera = useCallback(() => {
    stopAll();
  }, [stopAll]);

  const handleReprocessCode = useCallback(
    async (code: string) => {
      await processAcceptedCode(code);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ============================================================
  // Render
  // ============================================================

  if (!shouldRender) return null;

  // ==========================================
  // FULLSCREEN (mobile/tablet)
  // ==========================================
  if (isFullscreen) {
    return (
      <div
        className="scanner-fullscreen"
        style={{
          animation: `${isExiting ? "modalFadeOut" : "modalFadeIn"} 220ms ease-out`,
        }}
      >
        {/* Cámara + viewfinder (fondo completo) */}
        <div className="flex-1 relative">
          <CameraViewfinder
            ref={camera.videoRef}
            cameraStatus={camera.status}
            cameraError={camera.error}
            detectedCode={detection.detectedCode}
            detectedFormat={detection.detectedFormat}
            isUsingQuagga={detection.isUsingQuagga}
            quaggaContainerRef={detection.quaggaContainerRef}
            isFullscreen
            confirmFlash={confirmFlash}
          />

          {/* Banner resultado (top, flotante) */}
          <ScanResultBanner
            product={lastScannedProduct}
            isFullscreen
            onDismiss={() => setLastScannedProduct(null)}
          />

          {/* Botón cerrar (top-right) */}
          <button
            onClick={handleClose}
            className="absolute top-0 right-0 z-20 rounded-full bg-black/50 backdrop-blur-md p-3 m-3 text-white/80 active:bg-white/20 transition-colors"
            style={{ marginTop: "env(safe-area-inset-top, 12px)" }}
            aria-label="Cerrar escáner"
          >
            <X className="size-5" />
          </button>

          {/* Controles de cámara (bottom, flotantes) */}
          <ScannerControls
            cameraStatus={camera.status}
            capabilities={camera.capabilities}
            torchOn={camera.torchOn}
            zoomLevel={camera.zoomLevel}
            continuousMode={continuousMode}
            isFullscreen
            onStartCamera={handleStartCamera}
            onStopCamera={handleStopCamera}
            onToggleTorch={camera.toggleTorch}
            onZoomChange={camera.setZoom}
            onFlipCamera={camera.flipCamera}
            onToggleContinuous={handleToggleContinuous}
          />
        </div>

        {/* Panel inferior expandible: input manual + historial */}
        <div
          className="bg-background/95 backdrop-blur-sm border-t border-border/40 rounded-t-2xl"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
        >
          {/* Drag handle */}
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="w-full flex flex-col items-center py-2"
          >
            <div className="scanner-drag-handle" />
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <span>Búsqueda manual</span>
              <ChevronDown
                className={`size-3 transition-transform ${showManualInput ? "rotate-180" : ""}`}
              />
            </div>
          </button>

          {showManualInput && (
            <div className="px-4 pb-3 space-y-3">
              <ManualInput
                products={products}
                context={context}
                onProductFound={handleProductFound}
                onBarcodeForInventory={onBarcodeForInventory}
                quantity={quantity}
                onQuantityChange={setQuantity}
                compact
                isVisible={isVisible}
              />
              <ScanHistory
                entries={detection.scanHistory}
                onReprocess={handleReprocessCode}
                onClear={detection.clearHistory}
                compact
              />
            </div>
          )}
        </div>

        <style>{ALL_STYLES}</style>
      </div>
    );
  }

  // ==========================================
  // MODAL (desktop / tablets grandes)
  // ==========================================
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      style={{
        animation: `${isExiting ? "modalFadeOut" : "modalFadeIn"} 220ms ease-out`,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          handleClose();
        }
      }}
    >
      <Card
        className="w-full max-w-sm max-h-[80vh] overflow-auto shadow-lg border border-border/60"
        style={{
          animation: `${isExiting ? "modalScaleOut" : "modalScaleIn"} 220ms cubic-bezier(.16,.84,.44,1)`,
        }}
      >
        {/* Encabezado */}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Scan className="size-4" />
                Escáner de Código
              </CardTitle>
              <CardDescription className="text-xs">
                Escanea o busca productos por código de barra
              </CardDescription>
            </div>
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:ring-ring focus:outline-hidden"
              aria-label="Cerrar"
            >
              <X className="size-4" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {/* Vista de cámara */}
          <div className="space-y-2">
            <CameraViewfinder
              ref={camera.videoRef}
              cameraStatus={camera.status}
              cameraError={camera.error}
              detectedCode={detection.detectedCode}
              detectedFormat={detection.detectedFormat}
              isUsingQuagga={detection.isUsingQuagga}
              quaggaContainerRef={detection.quaggaContainerRef}
              isFullscreen={false}
              confirmFlash={confirmFlash}
            />

            {/* Controles */}
            <ScannerControls
              cameraStatus={camera.status}
              capabilities={camera.capabilities}
              torchOn={camera.torchOn}
              zoomLevel={camera.zoomLevel}
              continuousMode={continuousMode}
              isFullscreen={false}
              onStartCamera={handleStartCamera}
              onStopCamera={handleStopCamera}
              onToggleTorch={camera.toggleTorch}
              onZoomChange={camera.setZoom}
              onFlipCamera={camera.flipCamera}
              onToggleContinuous={handleToggleContinuous}
            />
          </div>

          {/* Input manual */}
          <ManualInput
            products={products}
            context={context}
            onProductFound={handleProductFound}
            onBarcodeForInventory={onBarcodeForInventory}
            quantity={quantity}
            onQuantityChange={setQuantity}
            isVisible={isVisible}
          />

          {/* Banner resultado */}
          <ScanResultBanner
            product={lastScannedProduct}
            isFullscreen={false}
            onDismiss={() => setLastScannedProduct(null)}
          />

          {/* Historial */}
          <ScanHistory
            entries={detection.scanHistory}
            onReprocess={handleReprocessCode}
            onClear={detection.clearHistory}
          />
        </CardContent>
      </Card>

      <style>{ALL_STYLES}</style>
    </div>
  );
}
