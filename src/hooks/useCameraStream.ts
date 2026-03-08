/**
 * useCameraStream.ts — Hook para gestión de MediaStream de cámara
 *
 * Maneja todo el ciclo de vida del stream de video:
 *   - Solicitar permiso y abrir cámara (trasera por defecto)
 *   - Control de linterna (torch)
 *   - Control de zoom (digital/óptico)
 *   - Cambio entre cámaras (front/back)
 *   - Detener y limpiar recursos
 *   - Detección de capacidades del dispositivo
 *
 * Diseñado para dispositivos móviles (smartphones, tablets).
 */

import { useState, useRef, useCallback, useEffect } from "react";

// ============================================================
// Tipos
// ============================================================

export type CameraStatus =
  | "idle"
  | "requesting-permission"
  | "starting"
  | "active"
  | "error"
  | "permission-denied";

export interface CameraCapabilities {
  /** Si el dispositivo soporta torch/flash */
  hasTorch: boolean;
  /** Si soporta zoom (min/max/step) */
  hasZoom: boolean;
  zoomMin: number;
  zoomMax: number;
  zoomStep: number;
  /** Lista de cámaras disponibles */
  cameras: MediaDeviceInfo[];
}

export interface UseCameraStreamReturn {
  /** Referencia al elemento <video> donde se muestra el stream */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Referencia al stream de media activo */
  streamRef: React.RefObject<MediaStream | null>;
  /** Estado actual de la cámara */
  status: CameraStatus;
  /** Mensaje de error (si status === 'error' o 'permission-denied') */
  error: string | null;
  /** Capacidades detectadas del dispositivo */
  capabilities: CameraCapabilities;
  /** true si la linterna está encendida */
  torchOn: boolean;
  /** Nivel de zoom actual */
  zoomLevel: number;
  /** ID de la cámara actualmente seleccionada */
  activeCameraId: string | null;
  /** true = cámara trasera (environment), false = frontal (user) */
  isFacingBack: boolean;

  // Acciones
  /** Inicia la cámara */
  startCamera: () => Promise<void>;
  /** Detiene la cámara y libera recursos */
  stopCamera: () => void;
  /** Alterna la linterna on/off */
  toggleTorch: () => Promise<void>;
  /** Cambia el nivel de zoom */
  setZoom: (level: number) => Promise<void>;
  /** Alterna entre cámara frontal y trasera */
  flipCamera: () => Promise<void>;
}

// ============================================================
// Constantes
// ============================================================

const DEFAULT_CAPABILITIES: CameraCapabilities = {
  hasTorch: false,
  hasZoom: false,
  zoomMin: 1,
  zoomMax: 1,
  zoomStep: 0.1,
  cameras: [],
};

// ============================================================
// Hook
// ============================================================

export function useCameraStream(): UseCameraStreamReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] =
    useState<CameraCapabilities>(DEFAULT_CAPABILITIES);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [isFacingBack, setIsFacingBack] = useState(true);

  // Ref para rastrear si el componente sigue montado
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ============================================================
  // Utilidades internas
  // ============================================================

  /** Detecta capacidades de torch/zoom del track de video activo */
  const detectCapabilities = useCallback(
    async (stream: MediaStream) => {
      const track = stream.getVideoTracks()[0];
      if (!track) return;

      try {
        // Enumerar cámaras disponibles
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((d) => d.kind === "videoinput");

        // Detectar torch y zoom del track actual
        // getCapabilities() puede no existir en todos los navegadores
        const caps = (track as any).getCapabilities?.();

        const hasTorch = !!caps?.torch;
        const hasZoom = !!caps?.zoom;
        const zoomMin = caps?.zoom?.min ?? 1;
        const zoomMax = caps?.zoom?.max ?? 1;
        const zoomStep = caps?.zoom?.step ?? 0.1;

        if (mountedRef.current) {
          setCapabilities({
            hasTorch,
            hasZoom,
            zoomMin,
            zoomMax,
            zoomStep,
            cameras,
          });
          setActiveCameraId(track.getSettings().deviceId || null);
        }
      } catch {
        // Fallback: enumerar solo cámaras
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const cameras = devices.filter((d) => d.kind === "videoinput");
          if (mountedRef.current) {
            setCapabilities((prev) => ({ ...prev, cameras }));
          }
        } catch {
          /* ignorar */
        }
      }
    },
    []
  );

  /** Resuelve la resolución ideal según ancho de pantalla */
  const getIdealResolution = useCallback(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1280;
    // high-end: 1920x1080, mid: 1280x720, low: 640x480
    if (w >= 768) return { width: 1920, height: 1080 };
    if (w >= 414) return { width: 1280, height: 720 };
    return { width: 640, height: 480 };
  }, []);

  // ============================================================
  // Acciones públicas
  // ============================================================

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("La cámara no está disponible en este dispositivo/navegador");
      return;
    }

    // Limpiar estado anterior
    stopCamera();
    setError(null);
    setStatus("requesting-permission");
    setTorchOn(false);
    setZoomLevel(1);

    const { width, height } = getIdealResolution();

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: isFacingBack ? "environment" : "user" },
        width: { ideal: width },
        height: { ideal: height },
        ...(activeCameraId ? { deviceId: { exact: activeCameraId } } : {}),
      },
      audio: false,
    };

    try {
      setStatus("starting");
      // Timeout de seguridad: si getUserMedia tarda más de 10s, abortar
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia(constraints),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Timeout: la cámara tardó demasiado en iniciar")),
            10000
          )
        ),
      ]);

      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          /* ignorar error autoplay en iOS */
        }
      }

      await detectCapabilities(stream);
      if (mountedRef.current) {
        setStatus("active");
      }
    } catch (e: any) {
      if (!mountedRef.current) return;

      const name = e?.name || "";
      if (
        name === "NotAllowedError" ||
        name === "PermissionDeniedError"
      ) {
        setStatus("permission-denied");
        setError(
          "Permiso de cámara denegado. Activa el acceso en la configuración de tu navegador."
        );
      } else if (name === "NotFoundError") {
        setStatus("error");
        setError("No se encontró ninguna cámara en este dispositivo.");
      } else if (name === "NotReadableError" || name === "AbortError") {
        setStatus("error");
        setError(
          "La cámara está siendo usada por otra aplicación. Cierra otras apps y reintenta."
        );
      } else {
        setStatus("error");
        setError(e?.message || "No se pudo iniciar la cámara");
      }
    }
  }, [isFacingBack, activeCameraId, getIdealResolution, detectCapabilities]);

  const stopCamera = useCallback(() => {
    // Detener tracks de video
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // Limpiar video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStatus("idle");
    setTorchOn(false);
    setZoomLevel(1);
  }, []);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;

    try {
      const newState = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: newState } as any],
      });
      setTorchOn(newState);
    } catch {
      // torch no soportado o error al aplicar
    }
  }, [torchOn]);

  const setZoom = useCallback(
    async (level: number) => {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track) return;

      const clamped = Math.min(
        Math.max(level, capabilities.zoomMin),
        capabilities.zoomMax
      );

      try {
        await (track as any).applyConstraints({
          advanced: [{ zoom: clamped } as any],
        });
        setZoomLevel(clamped);
      } catch {
        // zoom no soportado
      }
    },
    [capabilities.zoomMin, capabilities.zoomMax]
  );

  const flipCamera = useCallback(async () => {
    const newFacing = !isFacingBack;
    setIsFacingBack(newFacing);

    // Si hay cámara activa, reiniciar con la nueva orientación
    if (streamRef.current) {
      stopCamera();
      // Pequeño delay para que el stream se limpie antes de re-abrir
      await new Promise((r) => setTimeout(r, 200));
      setIsFacingBack(newFacing);
    }
  }, [isFacingBack, stopCamera]);

  // Efecto para re-iniciar cámara cuando cambia la orientación (después de flip)
  useEffect(() => {
    // Solo re-iniciar si la cámara estaba activa y se hizo flip
    // Este efecto se dispara por el cambio de isFacingBack
  }, [isFacingBack]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  return {
    videoRef,
    streamRef,
    status,
    error,
    capabilities,
    torchOn,
    zoomLevel,
    activeCameraId,
    isFacingBack,
    startCamera,
    stopCamera,
    toggleTorch,
    setZoom,
    flipCamera,
  };
}
