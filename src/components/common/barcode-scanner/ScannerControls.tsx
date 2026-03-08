/**
 * ScannerControls.tsx — Controles de cámara del escáner
 *
 * Botones de control para la experiencia de escaneo móvil:
 *   - Iniciar/detener cámara
 *   - Toggle linterna (torch)
 *   - Control de zoom (slider)
 *   - Cambiar cámara (flip front/back)
 *   - Toggle escaneo continuo
 */

import { Button } from "../../ui/button";
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  ZoomIn,
  ZoomOut,
  RefreshCcw,
} from "lucide-react";
import type { CameraStatus, CameraCapabilities } from "../../../hooks/useCameraStream";

// ============================================================
// Tipos
// ============================================================

interface ScannerControlsProps {
  /** Estado de la cámara */
  cameraStatus: CameraStatus;
  /** Capacidades detectadas del dispositivo */
  capabilities: CameraCapabilities;
  /** Estado de la linterna */
  torchOn: boolean;
  /** Nivel de zoom actual */
  zoomLevel: number;
  /** Si el escaneo continuo está activo */
  continuousMode: boolean;
  /** Si es vista fullscreen (mobile) */
  isFullscreen: boolean;

  // Acciones
  onStartCamera: () => void;
  onStopCamera: () => void;
  onToggleTorch: () => void;
  onZoomChange: (level: number) => void;
  onFlipCamera: () => void;
  onToggleContinuous: () => void;
}

// ============================================================
// Componente
// ============================================================

export function ScannerControls({
  cameraStatus,
  capabilities,
  torchOn,
  zoomLevel,
  continuousMode,
  isFullscreen,
  onStartCamera,
  onStopCamera,
  onToggleTorch,
  onZoomChange,
  onFlipCamera,
  onToggleContinuous,
}: ScannerControlsProps) {
  const isActive = cameraStatus === "active";
  const isLoading =
    cameraStatus === "starting" || cameraStatus === "requesting-permission";
  const hasMultipleCameras = capabilities.cameras.length > 1;

  // === Layout fullscreen: controles flotantes sobre la cámara ===
  if (isFullscreen) {
    return (
      <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }}
      >
        {/* Fila principal de controles */}
        <div className="flex items-center justify-center gap-3 pb-4 pointer-events-auto px-4">
          {/* Torch */}
          {isActive && capabilities.hasTorch && (
            <button
              onClick={onToggleTorch}
              className={`rounded-full p-3 backdrop-blur-md transition-colors ${
                torchOn
                  ? "bg-yellow-500/90 text-black"
                  : "bg-black/50 text-white/80 active:bg-white/20"
              }`}
              aria-label={torchOn ? "Apagar linterna" : "Encender linterna"}
            >
              {torchOn ? (
                <Flashlight className="size-5" />
              ) : (
                <FlashlightOff className="size-5" />
              )}
            </button>
          )}

          {/* Botón principal: Iniciar/Detener cámara */}
          {!isActive && !isLoading ? (
            <button
              onClick={onStartCamera}
              className="rounded-full p-4 bg-white/90 text-black active:bg-white/70 shadow-lg transition-transform active:scale-95"
              aria-label="Iniciar cámara"
            >
              <Camera className="size-7" />
            </button>
          ) : isActive ? (
            <button
              onClick={onStopCamera}
              className="rounded-full p-4 bg-red-500/90 text-white active:bg-red-600 shadow-lg transition-transform active:scale-95"
              aria-label="Detener cámara"
            >
              <CameraOff className="size-7" />
            </button>
          ) : (
            <div className="rounded-full p-4 bg-white/30 text-white/50">
              <Camera className="size-7 animate-pulse" />
            </div>
          )}

          {/* Flip camera */}
          {isActive && hasMultipleCameras && (
            <button
              onClick={onFlipCamera}
              className="rounded-full p-3 bg-black/50 text-white/80 backdrop-blur-md active:bg-white/20 transition-colors"
              aria-label="Cambiar cámara"
            >
              <SwitchCamera className="size-5" />
            </button>
          )}
        </div>

        {/* Toggle escaneo continuo */}
        <div className="flex justify-center pb-2 pointer-events-auto">
          <button
            onClick={onToggleContinuous}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs backdrop-blur-md transition-colors ${
              continuousMode
                ? "bg-blue-500/80 text-white"
                : "bg-black/40 text-white/70 active:bg-white/10"
            }`}
          >
            <RefreshCcw className={`size-3 ${continuousMode ? "animate-spin" : ""}`} style={continuousMode ? { animationDuration: "3s" } : undefined} />
            {continuousMode ? "Escaneo continuo ON" : "Escaneo continuo"}
          </button>
        </div>

        {/* Slider de zoom (solo si activo y soportado) */}
        {isActive && capabilities.hasZoom && (
          <div className="flex items-center gap-2 px-6 pb-3 pointer-events-auto">
            <ZoomOut className="size-3.5 text-white/60" />
            <input
              type="range"
              min={capabilities.zoomMin}
              max={capabilities.zoomMax}
              step={capabilities.zoomStep}
              value={zoomLevel}
              onChange={(e) => onZoomChange(parseFloat(e.target.value))}
              className="flex-1 h-1 accent-white appearance-none bg-white/30 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
            />
            <ZoomIn className="size-3.5 text-white/60" />
            <span className="text-white/60 text-[10px] font-mono min-w-[2.5rem] text-right">
              {zoomLevel.toFixed(1)}x
            </span>
          </div>
        )}
      </div>
    );
  }

  // === Layout modal (desktop/tablet): botones compactos ===
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {/* Iniciar/detener cámara */}
        <Button
          size="sm"
          onClick={isActive ? onStopCamera : onStartCamera}
          disabled={isLoading}
          className="gap-1.5"
          variant={isActive ? "outline" : "default"}
        >
          {isActive ? (
            <CameraOff className="size-3.5" />
          ) : (
            <Camera className="size-3.5" />
          )}
          {isLoading
            ? "Iniciando..."
            : isActive
              ? "Detener"
              : "Usar cámara"}
        </Button>

        {/* Torch */}
        {isActive && capabilities.hasTorch && (
          <Button
            size="sm"
            variant={torchOn ? "default" : "outline"}
            onClick={onToggleTorch}
            className="gap-1.5"
          >
            {torchOn ? (
              <Flashlight className="size-3.5" />
            ) : (
              <FlashlightOff className="size-3.5" />
            )}
            {torchOn ? "Luz ON" : "Luz"}
          </Button>
        )}

        {/* Flip camera */}
        {isActive && hasMultipleCameras && (
          <Button
            size="sm"
            variant="outline"
            onClick={onFlipCamera}
            className="gap-1.5"
          >
            <SwitchCamera className="size-3.5" />
          </Button>
        )}

        {/* Modo continuo */}
        <Button
          size="sm"
          variant={continuousMode ? "default" : "outline"}
          onClick={onToggleContinuous}
          className="gap-1.5"
        >
          <RefreshCcw className={`size-3.5 ${continuousMode ? "animate-spin" : ""}`} style={continuousMode ? { animationDuration: "3s" } : undefined} />
          {continuousMode ? "Continuo ON" : "Continuo"}
        </Button>
      </div>

      {/* Zoom slider compacto */}
      {isActive && capabilities.hasZoom && (
        <div className="flex items-center gap-2">
          <ZoomOut className="size-3 text-muted-foreground" />
          <input
            type="range"
            min={capabilities.zoomMin}
            max={capabilities.zoomMax}
            step={capabilities.zoomStep}
            value={zoomLevel}
            onChange={(e) => onZoomChange(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-foreground"
          />
          <ZoomIn className="size-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-mono">
            {zoomLevel.toFixed(1)}x
          </span>
        </div>
      )}
    </div>
  );
}
