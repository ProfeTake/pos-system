/**
 * useBarcodeDetection.ts — Hook para detección de códigos de barras
 *
 * Encapsula toda la lógica de detección:
 *   - Motor dual: BarcodeDetector nativo (Chrome/Edge) + QuaggaJS (bundled)
 *   - Algoritmo de consenso estricto (3 lecturas/800ms o 4 lecturas/1200ms)
 *   - Validación de checksum EAN-13/EAN-8/UPC-A antes de consenso
 *   - Normalización automática (UPC-A → EAN-13)
 *   - Modo escaneo continuo con cooldown por código
 *   - Feedback háptico y sonoro
 *   - Historial de escaneos en sesión
 *
 * Nota: La gran mayoría de productos usan EAN-13 (13 dígitos).
 * Los lectores y validaciones priorizan este formato.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  normalizeBarcode,
  isValidEan13,
  isValidEan8,
  isValidUpcA,
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

/** Formatos soportados por BarcodeDetector nativo (EAN-13 primero) */
const NATIVE_FORMATS = [
  "ean_13",
  "upc_a",
  "ean_8",
] as const;

/**
 * Lectores configurados para QuaggaJS.
 * Solo EAN-13, UPC-A y EAN-8 — eliminar Code-128/39 y UPC-E
 * que generan falsos positivos sobre códigos EAN-13.
 */
const QUAGGA_READERS: string[] = [
  "ean_reader",
  "upc_reader",
  "ean_8_reader",
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
   * Procesa cada detección individual.
   * Valida checksum ANTES de alimentar el buffer de consenso.
   * Rechaza cualquier código numérico que no pase validación de checksum.
   */
  const processDetection = useCallback(
    (raw: string) => {
      if (scanningLockedRef.current) return;

      const digits = (raw || "").replace(/\D/g, "");
      if (!digits) return;

      // === Validación estricta por checksum ===
      // La gran mayoría de productos son EAN-13 (13 dígitos).
      // Rechazar cualquier código numérico que no pase checksum.

      // 13 dígitos: debe ser EAN-13 válido
      if (digits.length === 13 && !isValidEan13(digits)) return;
      // 12 dígitos: debe ser UPC-A válido
      if (digits.length === 12 && !isValidUpcA(digits)) return;
      // 8 dígitos: debe ser EAN-8 válido
      if (digits.length === 8 && !isValidEan8(digits)) return;
      // Otros largos numéricos sin formato conocido → falso positivo
      if (/^\d+$/.test(digits) && ![8, 12, 13, 14].includes(digits.length)) return;

      const { format, gtin13 } = normalizeBarcode(raw);

      let normalizedCode: string;
      if (gtin13) {
        normalizedCode = gtin13;
      } else if (format === "EAN-8") {
        normalizedCode = digits;
      } else if (format === "UNKNOWN") {
        // Solo aceptar códigos no-numéricos (alfanuméricos como Code-128)
        // Los numéricos ya fueron filtrados arriba por checksum
        if (/^\d+$/.test(digits)) return;
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

      // Limpiar entradas fuera de ventana de 1200ms
      while (buf.length && now - buf[0].timestamp > 1200) buf.shift();

      // Criterio 1: 3 lecturas consecutivas iguales en ≤800ms
      if (buf.length >= 3) {
        const last = buf[buf.length - 1];
        const prev1 = buf[buf.length - 2];
        const prev2 = buf[buf.length - 3];
        if (
          last.code === prev1.code &&
          last.code === prev2.code &&
          last.timestamp - prev2.timestamp <= 800
        ) {
          acceptCode(last.code);
          return;
        }
      }

      // Criterio 2: 4+ apariciones en ventana de 1200ms
      const counts = new Map<string, number>();
      for (const item of buf) {
        counts.set(item.code, (counts.get(item.code) || 0) + 1);
      }
      for (const [code, count] of counts) {
        if (count >= 4) {
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
              // ROI: solo analizar la zona central (reduce falsos positivos)
              area: {
                top: "20%",
                right: "10%",
                left: "10%",
                bottom: "20%",
              },
            },
            locator: { patchSize: "large", halfSample: true },
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

      // Registrar callback CON filtro de confianza de QuaggaJS
      Quagga.onDetected((result: any) => {
        const code = String(result?.codeResult?.code || "").trim();
        if (!code) return;

        // Filtrar por confianza: rechazar detecciones con alto error promedio
        const decodedCodes = result?.codeResult?.decodedCodes;
        if (Array.isArray(decodedCodes)) {
          const errors = decodedCodes
            .filter((d: any) => typeof d.error === "number" && d.error !== 0)
            .map((d: any) => d.error as number);
          if (errors.length > 0) {
            const avgError =
              errors.reduce((a: number, b: number) => a + b, 0) / errors.length;
            // Rechazar si error promedio > 15% (menor = más confiable)
            if (avgError > 0.15) return;
          }
        }

        processDetection(code);
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
