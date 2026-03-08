/**
 * useBarcodeDetection.ts — Hook para detección de códigos de barras
 *
 * Encapsula toda la lógica de detección:
 *   - Motor dual: BarcodeDetector nativo (Chrome/Edge) + QuaggaJS (bundled)
 *   - Algoritmo de consenso anti-rebote (2 lecturas/500ms o 3 lecturas/800ms)
 *   - Normalización automática (UPC-A → EAN-13, checksum validation)
 *   - Modo escaneo continuo con cooldown por código
 *   - Feedback háptico y sonoro
 *   - Historial de escaneos en sesión
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  normalizeBarcode,
  type BarcodeFormat,
} from "../utils/barcode";
import type { CameraStatus } from "./useCameraStream";

// ============================================================
// Tipos públicos
// ============================================================

export interface ScanHistoryEntry {
  code: string;
  format: BarcodeFormat;
  timestamp: number;
  /** true si el código fue procesado exitosamente */
  success: boolean;
}

export interface UseBarcodeDetectionOptions {
  /** Motor de detección preferido */
  scanEngine: "native" | "quagga";
  /** Callback invocado cuando un código es aceptado por consenso */
  onCodeAccepted: (code: string) => Promise<void>;
  /** Si true, sigue escaneando después de aceptar un código */
  continuousMode: boolean;
  /** Habilitar feedback háptico (vibración) */
  hapticFeedback?: boolean;
  /** Habilitar feedback sonoro (beep) */
  soundFeedback?: boolean;
}

export interface UseBarcodeDetectionReturn {
  /** Código detectado en tiempo real (antes de consenso) */
  detectedCode: string | null;
  /** Formato del código detectado */
  detectedFormat: BarcodeFormat | null;
  /** Historial de escaneos */
  scanHistory: ScanHistoryEntry[];
  /** true si la detección está activa */
  isDetecting: boolean;
  /** Referencia al contenedor para QuaggaJS */
  quaggaContainerRef: React.RefObject<HTMLDivElement | null>;
  /** true si usa QuaggaJS como motor */
  isUsingQuagga: boolean;

  // Acciones
  /** Inicia la detección sobre un stream/video activo */
  startDetection: (
    videoEl: HTMLVideoElement | null,
    stream: MediaStream | null
  ) => Promise<void>;
  /** Detiene la detección */
  stopDetection: () => void;
  /** Resetea el lock de detección (para reiniciar escaneo) */
  resetDetection: () => void;
  /** Limpia el historial */
  clearHistory: () => void;
  /** Marca una entrada del historial como exitosa/fallida */
  updateHistoryEntry: (code: string, success: boolean) => void;
}

// ============================================================
// Tipos internos
// ============================================================

interface DetectionBufferEntry {
  code: string;
  format: BarcodeFormat;
  timestamp: number;
}

// ============================================================
// Constantes
// ============================================================

/** Formatos soportados por BarcodeDetector nativo */
const NATIVE_FORMATS = [
  "ean_13",
  "ean_8",
  "code_128",
  "code_39",
  "upc_a",
  "upc_e",
] as const;

/** Lectores configurados para QuaggaJS */
const QUAGGA_READERS: string[] = [
  "ean_reader",
  "ean_8_reader",
  "code_128_reader",
  "code_39_reader",
  "upc_reader",
  "upc_e_reader",
];

/** Cooldown entre aceptar el mismo código (modo continuo), en ms */
const CONTINUOUS_COOLDOWN_MS = 2000;

/** Máximo de entradas en el historial */
const MAX_HISTORY = 50;

// ============================================================
// Utilidades de feedback
// ============================================================

let audioCtx: AudioContext | null = null;

/** Reproduce un beep corto usando AudioContext */
function playBeep() {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(1800, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.12);
  } catch {
    /* AudioContext no disponible */
  }
}

/** Vibración háptica: doble pulso corto */
function triggerHaptic() {
  try {
    if (navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }
  } catch {
    /* vibrate no soportado */
  }
}

// ============================================================
// Hook
// ============================================================

export function useBarcodeDetection({
  scanEngine,
  onCodeAccepted,
  continuousMode,
  hapticFeedback = true,
  soundFeedback = true,
}: UseBarcodeDetectionOptions): UseBarcodeDetectionReturn {
  // Estado público
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<BarcodeFormat | null>(
    null
  );
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isUsingQuagga, setIsUsingQuagga] = useState(false);

  // Refs internas
  const quaggaContainerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectionBufferRef = useRef<DetectionBufferEntry[]>([]);
  const scanningLockedRef = useRef(false);
  const lastAcceptedCodeRef = useRef<string | null>(null);
  const lastAcceptedTimeRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const onCodeAcceptedRef = useRef(onCodeAccepted);
  const continuousModeRef = useRef(continuousMode);

  // Mantener refs actualizadas
  useEffect(() => {
    onCodeAcceptedRef.current = onCodeAccepted;
  }, [onCodeAccepted]);
  useEffect(() => {
    continuousModeRef.current = continuousMode;
  }, [continuousMode]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Soporte nativo de BarcodeDetector
  const supportsBarcodeDetector =
    typeof window !== "undefined" && !!(window as any).BarcodeDetector;

  // ============================================================
  // Algoritmo de consenso
  // ============================================================

  /**
   * Acepta un código tras pasar el filtro de consenso.
   * Gestiona feedback háptico/sonoro, historial, y modo continuo.
   */
  const acceptCode = useCallback(
    async (code: string) => {
      if (scanningLockedRef.current) return;

      // En modo continuo: cooldown por código
      if (continuousModeRef.current) {
        const now = Date.now();
        if (
          lastAcceptedCodeRef.current === code &&
          now - lastAcceptedTimeRef.current < CONTINUOUS_COOLDOWN_MS
        ) {
          return; // Mismo código, dentro del cooldown
        }
      } else {
        // Modo single: bloquear si ya se aceptó el mismo código
        if (lastAcceptedCodeRef.current === code) return;
      }

      scanningLockedRef.current = true;
      lastAcceptedCodeRef.current = code;
      lastAcceptedTimeRef.current = Date.now();

      // Feedback
      if (hapticFeedback) triggerHaptic();
      if (soundFeedback) playBeep();

      // Agregar al historial
      const entry: ScanHistoryEntry = {
        code,
        format: detectedFormat || "UNKNOWN",
        timestamp: Date.now(),
        success: true,
      };
      setScanHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));

      // Invocar callback
      try {
        await onCodeAcceptedRef.current(code);
      } catch {
        // Marcar como fallido en historial
        setScanHistory((prev) =>
          prev.map((e) =>
            e.code === code && e.timestamp === entry.timestamp
              ? { ...e, success: false }
              : e
          )
        );
      }

      // En modo continuo: desbloquear después del cooldown
      if (continuousModeRef.current) {
        setTimeout(() => {
          scanningLockedRef.current = false;
          if (mountedRef.current) {
            setDetectedCode(null);
            setDetectedFormat(null);
            detectionBufferRef.current = [];
          }
        }, 500);
      }
    },
    [hapticFeedback, soundFeedback, detectedFormat]
  );

  /**
   * Procesa cada detección individual. Normaliza, valida, y alimenta el buffer de consenso.
   */
  const processDetection = useCallback(
    (raw: string) => {
      if (scanningLockedRef.current) return;

      const { format, gtin13 } = normalizeBarcode(raw);

      let normalizedCode: string;
      if (gtin13) {
        normalizedCode = gtin13;
      } else if (format === "EAN-8") {
        normalizedCode = raw.replace(/\D/g, "");
      } else if (format === "UNKNOWN") {
        const digits = raw.replace(/\D/g, "");
        if (/^\d+$/.test(digits) && digits.length >= 8) {
          return; // Numérico largo con checksum inválido → falso positivo
        }
        normalizedCode = raw.trim();
      } else {
        normalizedCode = raw.trim();
      }

      if (!normalizedCode) return;

      // Feedback visual en tiempo real
      setDetectedCode(normalizedCode);
      setDetectedFormat(format);

      // Buffer de consenso
      const now = Date.now();
      const buf = detectionBufferRef.current;
      buf.push({ code: normalizedCode, format, timestamp: now });

      // Limpiar entradas fuera de ventana de 800ms
      while (buf.length && now - buf[0].timestamp > 800) buf.shift();

      // Criterio 1: 2 lecturas consecutivas iguales en ≤500ms
      if (buf.length >= 2) {
        const last = buf[buf.length - 1];
        const prev = buf[buf.length - 2];
        if (last.code === prev.code && last.timestamp - prev.timestamp <= 500) {
          acceptCode(last.code);
          return;
        }
      }

      // Criterio 2: 3+ apariciones en ventana de 800ms
      const counts = new Map<string, number>();
      for (const item of buf) {
        counts.set(item.code, (counts.get(item.code) || 0) + 1);
      }
      for (const [code, count] of counts) {
        if (count >= 3) {
          acceptCode(code);
          return;
        }
      }
    },
    [acceptCode]
  );

  // ============================================================
  // Motor nativo: BarcodeDetector + requestAnimationFrame
  // ============================================================

  const startNativeDetection = useCallback(
    (videoEl: HTMLVideoElement) => {
      try {
        const Detector = (window as any).BarcodeDetector;
        const detector = new Detector({ formats: [...NATIVE_FORMATS] });

        const loop = async () => {
          if (!videoEl || !mountedRef.current) return;
          try {
            const codes = await detector.detect(videoEl);
            if (codes?.length > 0) {
              const code = String(codes[0].rawValue || "").trim();
              if (code) processDetection(code);
            }
          } catch {
            /* Ignorar error de frame individual */
          }
          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
        setIsDetecting(true);
      } catch (e: any) {
        throw new Error(
          e?.message || "No se pudo iniciar el detector nativo de códigos"
        );
      }
    },
    [processDetection]
  );

  // ============================================================
  // Motor QuaggaJS: bundled local
  // ============================================================

  const startQuaggaDetection = useCallback(async () => {
    try {
      // Import dinámico de QuaggaJS bundled (tree-shakable)
      const Quagga = (await import("@ericblade/quagga2")).default;

      setIsUsingQuagga(true);

      await new Promise<void>((resolve, reject) => {
        Quagga.init(
          {
            inputStream: {
              type: "LiveStream",
              target: quaggaContainerRef.current || undefined,
              constraints: {
                facingMode: "environment",
                width: 1280,
                height: 720,
              },
            },
            locator: { patchSize: "medium", halfSample: true },
            numOfWorkers: navigator.hardwareConcurrency
              ? Math.min(navigator.hardwareConcurrency, 4)
              : 2,
            frequency: 10,
            decoder: { readers: QUAGGA_READERS as any },
            locate: true,
          },
          (err: any) => {
            if (err) return reject(err);
            Quagga.start();
            resolve();
          }
        );
      });

      // Registrar callback de detección
      Quagga.onDetected((result: any) => {
        const code = String(result?.codeResult?.code || "").trim();
        if (code) processDetection(code);
      });

      setIsDetecting(true);
    } catch (e: any) {
      setIsUsingQuagga(false);
      throw new Error(
        e?.message ||
          "No fue posible iniciar el escáner. Usa lector USB o entrada manual."
      );
    }
  }, [processDetection]);

  // ============================================================
  // Acciones públicas
  // ============================================================

  const startDetection = useCallback(
    async (
      videoEl: HTMLVideoElement | null,
      stream: MediaStream | null
    ) => {
      // Resetear estado
      setDetectedCode(null);
      setDetectedFormat(null);
      detectionBufferRef.current = [];
      scanningLockedRef.current = false;
      lastAcceptedCodeRef.current = null;

      const useNative = scanEngine === "native" && supportsBarcodeDetector;

      if (useNative && videoEl) {
        try {
          startNativeDetection(videoEl);
        } catch {
          // Fallback a QuaggaJS
          await startQuaggaDetection();
        }
      } else {
        await startQuaggaDetection();
      }
    },
    [scanEngine, supportsBarcodeDetector, startNativeDetection, startQuaggaDetection]
  );

  const stopDetection = useCallback(() => {
    // Detener rAF
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    // Detener QuaggaJS
    if (isUsingQuagga) {
      try {
        import("@ericblade/quagga2").then((mod) => {
          try {
            mod.default.stop();
            mod.default.offDetected(() => {});
          } catch {
            /* ignorar */
          }
        });
      } catch {
        /* ignorar */
      }
    }

    setIsDetecting(false);
    setIsUsingQuagga(false);
    setDetectedCode(null);
    setDetectedFormat(null);
  }, [isUsingQuagga]);

  const resetDetection = useCallback(() => {
    detectionBufferRef.current = [];
    scanningLockedRef.current = false;
    lastAcceptedCodeRef.current = null;
    setDetectedCode(null);
    setDetectedFormat(null);
  }, []);

  const clearHistory = useCallback(() => {
    setScanHistory([]);
  }, []);

  const updateHistoryEntry = useCallback((code: string, success: boolean) => {
    setScanHistory((prev) =>
      prev.map((e) => (e.code === code ? { ...e, success } : e))
    );
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  return {
    detectedCode,
    detectedFormat,
    scanHistory,
    isDetecting,
    quaggaContainerRef,
    isUsingQuagga,
    startDetection,
    stopDetection,
    resetDetection,
    clearHistory,
    updateHistoryEntry,
  };
}
