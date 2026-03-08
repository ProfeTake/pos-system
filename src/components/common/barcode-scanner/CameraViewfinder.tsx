/**
 * CameraViewfinder.tsx — Vista de cámara con guía de enfoque
 *
 * Componente mobile-first que muestra el stream de video de la cámara
 * con overlays de ayuda visual:
 *   - Rectángulo de enfoque (viewfinder box) con zona exterior oscurecida
 *   - Línea de escaneo animada dentro del rectángulo
 *   - Código detectado en tiempo real con badge de formato
 *   - Indicadores de estado (loading, error, inactive)
 *   - Flash verde de confirmación al aceptar código
 */

import { useState, useEffect, forwardRef } from "react";
import { CameraOff, Loader2 } from "lucide-react";
import { Badge } from "../../ui/badge";
import type { CameraStatus } from "../../../hooks/useCameraStream";
import type { BarcodeFormat } from "../../../utils/barcode";

// ============================================================
// Tipos
// ============================================================

interface CameraViewfinderProps {
  /** Estado de la cámara */
  cameraStatus: CameraStatus;
  /** Mensaje de error */
  cameraError: string | null;
  /** Código detectado en tiempo real (pre-consenso) */
  detectedCode: string | null;
  /** Formato del código detectado */
  detectedFormat: BarcodeFormat | null;
  /** true si usa QuaggaJS (muestra su contenedor en lugar del <video>) */
  isUsingQuagga: boolean;
  /** Referencia al contenedor de QuaggaJS */
  quaggaContainerRef: React.RefObject<HTMLDivElement | null>;
  /** Si la vista es fullscreen (mobile) */
  isFullscreen: boolean;
  /** Señal para mostrar flash de confirmación */
  confirmFlash: boolean;
}

// ============================================================
// Estilos CSS
// ============================================================

export const VIEWFINDER_STYLES = `
  /* Línea de escaneo animada dentro del viewfinder */
  @keyframes scanLineMove {
    0%, 100% { top: 5%; }
    50% { top: 95%; }
  }

  /* Flash verde de confirmación */
  @keyframes confirmFlash {
    0% { border-color: rgba(34, 197, 94, 0.9); box-shadow: inset 0 0 30px rgba(34, 197, 94, 0.3); }
    100% { border-color: transparent; box-shadow: none; }
  }

  /* Fade in del código detectado */
  @keyframes codeFadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Pulse suave del borde del viewfinder cuando detecta */
  @keyframes viewfinderPulse {
    0%, 100% { border-color: rgba(255, 255, 255, 0.6); }
    50% { border-color: rgba(59, 130, 246, 0.8); }
  }

  /* QuaggaJS viewport overrides */
  .quagga-viewport video,
  .quagga-viewport canvas {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
  }
`;

// ============================================================
// Componente
// ============================================================

export const CameraViewfinder = forwardRef<
  HTMLVideoElement,
  CameraViewfinderProps
>(function CameraViewfinder(
  {
    cameraStatus,
    cameraError,
    detectedCode,
    detectedFormat,
    isUsingQuagga,
    quaggaContainerRef,
    isFullscreen,
    confirmFlash,
  },
  videoRef
) {
  const isActive = cameraStatus === "active";
  const isLoading =
    cameraStatus === "starting" || cameraStatus === "requesting-permission";

  // Altura del viewfinder: fullscreen = toda la pantalla, modal = 208px (h-52)
  const containerClass = isFullscreen
    ? "w-full h-full"
    : "rounded-md overflow-hidden bg-black relative h-52";

  return (
    <div className={`${containerClass} relative bg-black overflow-hidden`}>
      {/* Video stream (nativo) */}
      <video
        ref={videoRef}
        className={`w-full h-full object-cover ${isUsingQuagga ? "hidden" : ""}`}
        muted
        playsInline
      />

      {/* Contenedor QuaggaJS */}
      <div
        ref={quaggaContainerRef}
        className={`quagga-viewport absolute inset-0 ${isUsingQuagga ? "block" : "hidden"}`}
      />

      {/* === Overlay: viewfinder box con zona oscurecida === */}
      {isActive && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Zona oscurecida superior */}
          <div className="absolute top-0 left-0 right-0 h-[25%] bg-black/50" />
          {/* Zona oscurecida inferior */}
          <div className="absolute bottom-0 left-0 right-0 h-[25%] bg-black/50" />
          {/* Zona oscurecida izquierda (entre top y bottom) */}
          <div className="absolute top-[25%] left-0 w-[10%] h-[50%] bg-black/50" />
          {/* Zona oscurecida derecha */}
          <div className="absolute top-[25%] right-0 w-[10%] h-[50%] bg-black/50" />

          {/* Rectángulo de enfoque */}
          <div
            className="absolute top-[25%] left-[10%] right-[10%] h-[50%] border-2 rounded-lg"
            style={{
              borderColor: detectedCode
                ? "rgba(59, 130, 246, 0.8)"
                : "rgba(255, 255, 255, 0.6)",
              transition: "border-color 200ms ease",
              animation: detectedCode
                ? "viewfinderPulse 1s ease-in-out infinite"
                : "none",
            }}
          >
            {/* Esquinas decorativas del viewfinder */}
            <ViewfinderCorners detected={!!detectedCode} />

            {/* Línea de escaneo animada (dentro del viewfinder box) */}
            <div
              className="absolute left-2 right-2 h-0.5 bg-red-500/80 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)]"
              style={{ animation: "scanLineMove 2s ease-in-out infinite" }}
            />
          </div>
        </div>
      )}

      {/* === Flash verde de confirmación === */}
      {confirmFlash && (
        <div
          className="absolute inset-0 border-4 rounded-lg pointer-events-none"
          style={{
            animation: "confirmFlash 400ms ease-out forwards",
          }}
        />
      )}

      {/* === Estado: cámara inactiva === */}
      {cameraStatus === "idle" && (
        <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground bg-black/80">
          <div className="flex flex-col items-center gap-2">
            <CameraOff className="size-8 opacity-50" />
            <span className="text-white/60">Toca para iniciar cámara</span>
          </div>
        </div>
      )}

      {/* === Estado: cargando === */}
      {isLoading && (
        <div className="absolute inset-0 grid place-items-center bg-black/80">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 text-white/70 animate-spin" />
            <span className="text-white/60 text-xs">
              {cameraStatus === "requesting-permission"
                ? "Solicitando permiso de cámara..."
                : "Iniciando cámara..."}
            </span>
          </div>
        </div>
      )}

      {/* === Estado: error === */}
      {(cameraStatus === "error" || cameraStatus === "permission-denied") && (
        <div className="absolute inset-0 grid place-items-center bg-black/90 px-4">
          <div className="flex flex-col items-center gap-2 text-center max-w-xs">
            <CameraOff className="size-8 text-red-400" />
            <span className="text-red-300 text-xs leading-relaxed">
              {cameraError || "Error al acceder a la cámara"}
            </span>
            {cameraStatus === "permission-denied" && (
              <span className="text-white/40 text-[10px] mt-1">
                Ve a Configuración del navegador → Permisos → Cámara
              </span>
            )}
          </div>
        </div>
      )}

      {/* === Código detectado en tiempo real (overlay inferior) === */}
      {isActive && detectedCode && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-black/70 px-3 py-2 flex items-center justify-between gap-2 backdrop-blur-sm"
          style={{ animation: "codeFadeIn 200ms ease-out" }}
        >
          <span className="text-white text-sm font-mono truncate">
            {detectedCode}
          </span>
          {detectedFormat && detectedFormat !== "UNKNOWN" && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 shrink-0 bg-white/20 text-white border-0"
            >
              {detectedFormat}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
});

// ============================================================
// Sub-componente: esquinas del viewfinder
// ============================================================

function ViewfinderCorners({ detected }: { detected: boolean }) {
  const color = detected ? "border-blue-400" : "border-white/70";
  const cornerSize = "w-5 h-5";

  return (
    <>
      {/* Top-left */}
      <div
        className={`absolute -top-px -left-px ${cornerSize} border-t-2 border-l-2 ${color} rounded-tl-md transition-colors duration-200`}
      />
      {/* Top-right */}
      <div
        className={`absolute -top-px -right-px ${cornerSize} border-t-2 border-r-2 ${color} rounded-tr-md transition-colors duration-200`}
      />
      {/* Bottom-left */}
      <div
        className={`absolute -bottom-px -left-px ${cornerSize} border-b-2 border-l-2 ${color} rounded-bl-md transition-colors duration-200`}
      />
      {/* Bottom-right */}
      <div
        className={`absolute -bottom-px -right-px ${cornerSize} border-b-2 border-r-2 ${color} rounded-br-md transition-colors duration-200`}
      />
    </>
  );
}
