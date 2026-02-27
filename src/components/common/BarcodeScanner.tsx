/**
 * BarcodeScanner.tsx — Escáner de códigos de barra
 *
 * Componente modal que permite escanear códigos de barra usando la cámara del
 * dispositivo o ingresándolos manualmente. Soporta dos motores de detección:
 *
 *   1. BarcodeDetector (API nativa del navegador, disponible en Chrome/Edge)
 *   2. QuaggaJS (librería externa cargada desde CDN, fallback universal)
 *
 * Funcionalidades principales:
 *   - Vista de cámara en tiempo real con línea de escaneo animada
 *   - Feedback visual del código detectado antes de aceptarlo
 *   - Normalización automática de códigos: UPC-A (12 dígitos) → EAN-13 (13 dígitos)
 *   - Validación de checksum para evitar falsos positivos
 *   - Algoritmo de consenso anti-rebote (requiere 2+ lecturas consistentes)
 *   - Búsqueda local y remota de productos
 *   - Soporte para contexto "carrito" e "inventario"
 *   - Detección de promociones con prefijo "PROMO-"
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import {
  Search,
  Scan,
  Plus,
  CheckCircle,
  X,
  Copy,
  Camera,
  CameraOff,
} from "lucide-react";
import { Product } from "../../types";
import { toast } from "sonner";
import { apiFetchJSON } from "../../lib/api";
import {
  normalizeBarcode as normalizarCodigo,
  type BarcodeFormat,
} from "../../utils/barcode";

// ============================================================
// Tipos y constantes
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

/** Entrada del buffer de detecciones para el algoritmo de consenso */
interface DeteccionBuffer {
  codigo: string;
  formato: BarcodeFormat;
  timestamp: number;
}

/**
 * Verifica si el dispositivo es móvil o tablet basado en user-agent y ancho de pantalla.
 */
const esDispositivoMovil = (): boolean =>
  typeof navigator !== "undefined" &&
  (/Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent) ||
    (typeof window !== "undefined" && window.innerWidth < 768));

/** URL del CDN de QuaggaJS */
const QUAGGA_CDN_URL =
  "https://unpkg.com/@ericblade/quagga2@1.2.6/dist/quagga.min.js";

/** Formatos soportados por BarcodeDetector nativo */
const FORMATOS_NATIVOS = [
  "ean_13",
  "ean_8",
  "code_128",
  "code_39",
  "upc_a",
  "upc_e",
] as const;

/** Lectores configurados para QuaggaJS */
const QUAGGA_READERS = [
  "ean_reader",
  "ean_8_reader",
  "code_128_reader",
  "code_39_reader",
  "upc_reader",
  "upc_e_reader",
];

// ============================================================
// Estilos CSS del escáner (animaciones y overlays)
// ============================================================

const SCANNER_STYLES = `
  /* Animaciones del modal */
  @keyframes modalFadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes modalFadeOut { from { opacity: 1 } to { opacity: 0 } }
  @keyframes modalScaleIn { from { opacity:0; transform: scale(.96) } to { opacity:1; transform: scale(1) } }
  @keyframes modalScaleOut { from { opacity:1; transform: scale(1) } to { opacity:0; transform: scale(.96) } }

  /* Animaciones de contenido */
  @keyframes slideDownFade { from { opacity:0; transform: translateY(-6px) } to { opacity:1; transform: translateY(0) } }
  @keyframes fadeInUp { from { opacity:0; transform: translateY(6px) } to { opacity:1; transform: translateY(0) } }
  @keyframes slideUpFadeOut { from { opacity:1; transform: translateY(0) } to { opacity:0; transform: translateY(-4px) } }

  /* Línea de escaneo animada (roja, se mueve verticalmente) */
  @keyframes scanLine {
    0%, 100% { top: 10%; }
    50% { top: 85%; }
  }

  /* Fade in para el código detectado */
  @keyframes codeFadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Forzar que el video/canvas inyectado por QuaggaJS llene el contenedor */
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
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [lastScanned, setLastScanned] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isExiting, setIsExiting] = useState(false);
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [lastScannedFade, setLastScannedFade] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // === Estado de cámara ===
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const quaggaContainerRef = useRef<HTMLDivElement | null>(null);
  const [usingCamera, setUsingCamera] = useState(false);
  const [usingQuagga, setUsingQuagga] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Detectar soporte nativo de BarcodeDetector
  const supportsBarcodeDetector =
    typeof window !== "undefined" && !!(window as any).BarcodeDetector;

  // === Feedback visual en tiempo real ===
  /** Código que se está detectando en este momento (antes de aceptar por consenso) */
  const [codigoDetectado, setCodigoDetectado] = useState<string | null>(null);
  /** Formato del código detectado (EAN-13, UPC-A, etc.) */
  const [formatoDetectado, setFormatoDetectado] =
    useState<BarcodeFormat | null>(null);

  // === Consenso de detección y control anti-rebote ===
  const detectionBufferRef = useRef<DeteccionBuffer[]>([]);
  const scanningLockedRef = useRef(false);
  const lastAcceptedCodeRef = useRef<string | null>(null);

  // ============================================================
  // Efectos del ciclo de vida
  // ============================================================

  /** Controla montaje/desmontaje con animación al cambiar isVisible */
  useEffect(() => {
    if (isVisible) {
      setIsExiting(false);
      setShouldRender(true);
      // Auto-iniciar cámara en móvil para inventario
      if (context === "inventory" && esDispositivoMovil()) {
        iniciarCamara().catch((e) =>
          setCameraError(e?.message || "No se pudo iniciar la cámara")
        );
      }
    } else if (!isVisible && shouldRender) {
      setIsExiting(true);
      const timeout = setTimeout(() => setShouldRender(false), 220);
      detenerCamara();
      return () => clearTimeout(timeout);
    }
  }, [isVisible, shouldRender]);

  /** Auto-focus en el input al abrir */
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  /** Controla la animación de fadeout del banner "Último agregado" (~3s total) */
  useEffect(() => {
    if (!lastScanned) return;
    setLastScannedFade(false);
    const fadeTimer = setTimeout(() => setLastScannedFade(true), 2600);
    const clearTimer = setTimeout(() => {
      setLastScanned(null);
      setLastScannedFade(false);
    }, 3000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(clearTimer);
    };
  }, [lastScanned]);

  // ============================================================
  // Búsqueda y manejo de productos
  // ============================================================

  /**
   * Filtra productos locales por nombre, categoría o código de barra.
   * Excluye productos deshabilitados.
   */
  const filtrarProductosLocales = useCallback(
    (query: string) => {
      const term = query.trim().toLowerCase();
      if (!term) {
        setSearchResults([]);
        return;
      }
      const results = products.filter((p) => {
        if (p.estado === "DESHABILITADO") return false;
        const name = p.name?.toLowerCase() || "";
        const cat = p.category?.toLowerCase() || "";
        const code = p.barCode?.toLowerCase() || "";
        return (
          name.includes(term) || cat.includes(term) || code.includes(term)
        );
      });
      setSearchResults(results);
    },
    [products]
  );

  /**
   * Maneja cambios en el input de búsqueda.
   * Si el texto tiene ≥6 caracteres, intenta buscar coincidencia exacta local
   * y si no la encuentra, hace lookup remoto al backend.
   */
  const handleInputChange = (value: string) => {
    setBarcodeInput(value);
    filtrarProductosLocales(value);

    // Umbral mínimo para considerar un código de barras completo
    if (value.length >= 6) {
      const val = value.trim();

      // Buscar coincidencia exacta local
      const exactMatch = products.find(
        (p) => p.barCode === val && p.estado !== "DESHABILITADO"
      );
      if (exactMatch) {
        if (context === "cart") {
          manejarProductoEncontrado(exactMatch);
        } else {
          setLastScanned(exactMatch);
        }
        setBarcodeInput("");
        setSearchResults([]);
        return;
      }

      // Si no hay coincidencia local, buscar en el backend
      buscarEnBackend(val);
    }
  };

  /**
   * Busca un producto por código de barras en el backend.
   * Maneja los distintos escenarios: encontrado, no encontrado (404), error.
   */
  const buscarEnBackend = async (codigo: string) => {
    try {
      const producto = await apiFetchJSON<Product>(
        `/api/products/by-barcode/${encodeURIComponent(codigo)}`
      );
      if (producto) {
        if (context === "cart") {
          manejarProductoEncontrado(producto);
        } else {
          setLastScanned(producto);
          toast.info("Producto encontrado en backend (no estaba en memoria)");
        }
        setBarcodeInput("");
        setSearchResults([]);
      }
    } catch (err: any) {
      // 404 = producto no existe → pasar al flujo de inventario o mostrar error
      if (err?.status === 404 || err?.message?.includes("404")) {
        if (context === "inventory" && onBarcodeForInventory) {
          onBarcodeForInventory(codigo);
          setBarcodeInput("");
          setSearchResults([]);
        } else {
          toast.error("Producto no encontrado");
        }
      } else {
        // Error de red u otro → intentar pasar al inventario como fallback
        if (context === "inventory" && onBarcodeForInventory) {
          onBarcodeForInventory(codigo);
          setBarcodeInput("");
          setSearchResults([]);
        } else {
          toast.error("No fue posible consultar el backend");
        }
      }
    }
  };

  /**
   * Procesa un producto encontrado: valida stock y lo agrega al carrito.
   */
  const manejarProductoEncontrado = (product: Product) => {
    setLastScanned(product);

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

    onAddToCart(product, quantity);
    setQuantity(1);
  };

  // ============================================================
  // Procesamiento de código detectado por cámara
  // ============================================================

  /**
   * Flujo final cuando un código es aceptado (por consenso o entrada manual).
   * Maneja promociones (PROMO-*), inventario y carrito.
   */
  const procesarCodigoFinal = async (codigo: string) => {
    const val = codigo.trim();
    await copiarCodigoAlPortapapeles(val);

    // Verificar si es un código de promoción (prefijo PROMO-)
    if (val.toUpperCase().startsWith("PROMO-")) {
      try {
        const { promotionsService } = await import(
          "../../services/promotions.service"
        );
        const promotion = await promotionsService.getByBarcode(val);
        if (promotion) {
          detenerCamara();
          toast.success(`Promoción detectada: ${promotion.name}`);
          toast.info(
            `Aplica: ${promotion.description || "Descuento especial"}`
          );
          onClose();
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

    // Contexto inventario: pasar código al componente padre
    if (context === "inventory" && onBarcodeForInventory) {
      detenerCamara();
      onBarcodeForInventory(val);
      onClose();
      return;
    }

    // Contexto carrito: buscar producto y agregar
    const found = products.find((p) => p.barCode === val);
    if (found) {
      detenerCamara();
      manejarProductoEncontrado(found);
      onClose();
    } else {
      toast.error("Producto no encontrado");
    }
  };

  // ============================================================
  // Algoritmo de consenso anti-rebote
  // ============================================================

  /**
   * Procesa cada detección individual de los motores de escaneo.
   *
   * 1. Normaliza el código usando las utilidades de barcode.ts
   *    (valida checksum, convierte UPC-A → EAN-13)
   * 2. Descarta códigos numéricos largos con checksum inválido (falsos positivos)
   * 3. Actualiza el feedback visual en tiempo real
   * 4. Agrega al buffer de consenso y evalúa si hay acuerdo:
   *    - 2 lecturas consecutivas iguales en <500ms → acepta
   *    - 3+ lecturas del mismo código en ventana de 800ms → acepta
   */
  const procesarDeteccion = (raw: string) => {
    if (scanningLockedRef.current) return;

    // Normalizar: valida checksum, detecta formato, convierte UPC-A → EAN-13
    const { format, gtin13 } = normalizarCodigo(raw);

    // Determinar el código normalizado a usar según el formato detectado
    let codigoNormalizado: string;
    if (gtin13) {
      // EAN-13 válido o UPC-A convertido a EAN-13 (13 dígitos)
      codigoNormalizado = gtin13;
    } else if (format === "EAN-8") {
      // EAN-8 válido: usar solo los dígitos limpios
      codigoNormalizado = raw.replace(/\D/g, "");
    } else if (format === "UNKNOWN") {
      // Formato desconocido: puede ser CODE-128/CODE-39 alfanumérico o basura
      const soloDigitos = raw.replace(/\D/g, "");
      if (/^\d+$/.test(soloDigitos) && soloDigitos.length >= 8) {
        // Es numérico largo pero con checksum inválido → falso positivo, descartar
        return;
      }
      // Códigos alfanuméricos (CODE-128, CODE-39, PROMO-*) se aceptan tal cual
      codigoNormalizado = raw.trim();
    } else {
      codigoNormalizado = raw.trim();
    }

    if (!codigoNormalizado) return;

    // Actualizar feedback visual en tiempo real
    setCodigoDetectado(codigoNormalizado);
    setFormatoDetectado(format);

    // Agregar al buffer de consenso
    const now = Date.now();
    const buf = detectionBufferRef.current;
    buf.push({ codigo: codigoNormalizado, formato: format, timestamp: now });

    // Limpiar entradas fuera de la ventana de 800ms
    while (buf.length && now - buf[0].timestamp > 800) buf.shift();

    // Criterio 1: Dos lecturas consecutivas iguales dentro de 500ms
    if (buf.length >= 2) {
      const ultima = buf[buf.length - 1];
      const penultima = buf[buf.length - 2];
      if (
        ultima.codigo === penultima.codigo &&
        ultima.timestamp - penultima.timestamp <= 500
      ) {
        aceptarCodigoConsenso(ultima.codigo);
        return;
      }
    }

    // Criterio 2: 3+ apariciones del mismo código en ventana de 800ms
    const conteo = new Map<string, number>();
    for (const item of buf) {
      conteo.set(item.codigo, (conteo.get(item.codigo) || 0) + 1);
    }
    for (const [code, cnt] of conteo) {
      if (cnt >= 3) {
        aceptarCodigoConsenso(code);
        return;
      }
    }
  };

  /**
   * Acepta un código una vez que el algoritmo de consenso lo confirma.
   * Bloquea el escaneo, detiene la cámara y procesa el código.
   */
  const aceptarCodigoConsenso = async (codigo: string) => {
    if (scanningLockedRef.current) return;
    if (lastAcceptedCodeRef.current === codigo) return;

    scanningLockedRef.current = true;
    lastAcceptedCodeRef.current = codigo;
    detenerCamara();
    await procesarCodigoFinal(codigo);
  };

  // ============================================================
  // Control de cámara
  // ============================================================

  /**
   * Inicia la cámara y el motor de detección seleccionado.
   * Si scanEngine === "native" y BarcodeDetector está disponible, lo usa.
   * En cualquier otro caso, usa QuaggaJS como motor principal.
   */
  const iniciarCamara = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "La cámara no está disponible en este dispositivo/navegador"
      );
      return;
    }

    setCameraError(null);
    detenerCamara();

    // Resetear estado de detección para nueva sesión de escaneo
    setCodigoDetectado(null);
    setFormatoDetectado(null);
    detectionBufferRef.current = [];
    scanningLockedRef.current = false;
    lastAcceptedCodeRef.current = null;

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };

    const usarNativo = scanEngine === "native" && supportsBarcodeDetector;

    if (usarNativo) {
      // --- Ruta 1: API nativa BarcodeDetector (Chrome/Edge) ---
      await iniciarConDetectorNativo(constraints);
    } else {
      // --- Ruta 2: QuaggaJS (predeterminado, más compatible cross-browser) ---
      await iniciarConQuagga();
    }
  };

  /**
   * Inicia cámara con la API nativa BarcodeDetector.
   * Si falla, hace fallback automático a QuaggaJS.
   */
  const iniciarConDetectorNativo = async (
    constraints: MediaStreamConstraints
  ) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          /* ignorar error autoplay */
        }
      }
      setUsingCamera(true);
      iniciarBucleDeteccionNativa();
    } catch (e: any) {
      // Si falla el detector nativo, intentar con QuaggaJS como fallback
      console.warn(
        "BarcodeDetector no disponible, usando QuaggaJS como fallback:",
        e
      );
      await iniciarConQuagga();
    }
  };

  /**
   * Bucle de detección usando BarcodeDetector nativo (requestAnimationFrame).
   * Lee cada frame del video y busca códigos de barras.
   */
  const iniciarBucleDeteccionNativa = async () => {
    try {
      const Detector = (window as any).BarcodeDetector;
      const detector = new Detector({ formats: [...FORMATOS_NATIVOS] });

      const loop = async () => {
        if (!videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes?.length > 0) {
            const code = String(codes[0].rawValue || "").trim();
            if (code) procesarDeteccion(code);
          }
        } catch {
          /* Ignorar error de frame individual */
        }
        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    } catch (e: any) {
      setCameraError(e?.message || "No se pudo iniciar el detector de códigos");
    }
  };

  /**
   * Inicia cámara usando QuaggaJS como motor de detección.
   * Carga la librería desde CDN si no está cargada y configura el stream de video.
   */
  const iniciarConQuagga = async () => {
    try {
      await cargarScriptQuagga();
      const Q = (window as any).Quagga;
      if (!Q) throw new Error("QuaggaJS no disponible");

      setUsingQuagga(true);
      setUsingCamera(true);

      await new Promise<void>((resolve, reject) => {
        Q.init(
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
            numOfWorkers: 2,
            frequency: 10,
            decoder: { readers: QUAGGA_READERS },
          },
          (err: any) => {
            if (err) return reject(err);
            Q.start();
            resolve();
          }
        );
      });

      // Registrar callback de detección de QuaggaJS
      Q.onDetected((res: any) => {
        const code = String(res?.codeResult?.code || "").trim();
        if (code) procesarDeteccion(code);
      });
    } catch (e: any) {
      setCameraError(
        e?.message ||
          "No fue posible iniciar el escáner. Usa lector USB o entrada manual."
      );
    }
  };

  /**
   * Detiene todos los motores de cámara activos (nativo y QuaggaJS).
   * Limpia streams, animation frames y estado visual.
   */
  const detenerCamara = () => {
    // Detener bucle de requestAnimationFrame (detector nativo)
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    // Detener stream de media (tracks de video)
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setUsingCamera(false);

    // Detener QuaggaJS si estaba activo
    try {
      const Q = (window as any).Quagga;
      if (Q && usingQuagga) {
        Q.stop();
        Q.offDetected?.(() => {});
      }
    } catch {
      /* ignorar error al detener QuaggaJS */
    }
    setUsingQuagga(false);

    // Limpiar feedback visual de detección
    setCodigoDetectado(null);
    setFormatoDetectado(null);
  };

  // ============================================================
  // Carga dinámica de scripts desde CDN
  // ============================================================

  /** Carga QuaggaJS desde CDN (solo una vez, se reutiliza en llamadas posteriores) */
  const cargarScriptQuagga = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const id = "quagga2-cdn-script";
      if (document.getElementById(id)) return resolve();
      const script = document.createElement("script");
      script.id = id;
      script.src = QUAGGA_CDN_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("No se pudo cargar QuaggaJS"));
      document.head.appendChild(script);
    });
  };

  // ============================================================
  // Utilidades de portapapeles
  // ============================================================

  /**
   * Escribe el código en el input de búsqueda y lo copia al portapapeles.
   */
  const copiarCodigoAlPortapapeles = async (codigo: string) => {
    try {
      setBarcodeInput(codigo);
      setSearchResults([]);
      inputRef.current?.focus();

      try {
        await navigator.clipboard.writeText(codigo);
        toast.success(`Código copiado: ${codigo}`);
      } catch {
        toast.message(`Código: ${codigo}`, {
          description:
            "No se pudo copiar automáticamente. Puedes copiarlo manualmente.",
        });
      }
    } catch {
      /* ignorar */
    }
  };

  /** Copia el código actual del input al portapapeles */
  const handleCopyCurrent = async () => {
    const code = barcodeInput.trim();
    if (!code) {
      toast.error("No hay código para copiar");
      return;
    }
    await copiarCodigoAlPortapapeles(code);
  };

  // ============================================================
  // Manejo de teclado y limpieza
  // ============================================================

  /** Maneja Enter en el input: si hay un solo resultado lo selecciona */
  const handleEnterPress = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    if (searchResults.length === 1) {
      manejarProductoEncontrado(searchResults[0]);
      setBarcodeInput("");
      setSearchResults([]);
    } else if (searchResults.length > 1) {
      toast.error("Múltiples productos encontrados. Selecciona uno.");
    } else {
      toast.error("Producto no encontrado");
    }
  };

  /** Limpia la búsqueda y reinicia el estado visual */
  const limpiarBusqueda = () => {
    setBarcodeInput("");
    setSearchResults([]);
    setLastScanned(null);
    inputRef.current?.focus();
  };

  // ============================================================
  // Renderizado
  // ============================================================

  if (!shouldRender) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      style={{
        animation: `${isExiting ? "modalFadeOut" : "modalFadeIn"} 220ms ease-out`,
      }}
      onMouseDown={(e) => {
        // Cerrar al hacer click fuera del contenido (en el overlay)
        if (e.target === e.currentTarget) {
          e.preventDefault();
          detenerCamara();
          onClose();
        }
      }}
    >
      <Card
        className="w-full max-w-sm max-h-[80vh] overflow-auto shadow-lg border border-border/60"
        style={{
          animation: `${isExiting ? "modalScaleOut" : "modalScaleIn"} 220ms cubic-bezier(.16,.84,.44,1)`,
        }}
      >
        {/* --- Encabezado --- */}
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
              onClick={() => {
                detenerCamara();
                onClose();
              }}
              className="absolute top-3 right-3 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:ring-ring focus:outline-hidden"
              aria-label="Cerrar"
            >
              <X className="size-4" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {/* --- Vista de cámara con feedback visual en tiempo real --- */}
          <div className="space-y-2">
            <div className="rounded-md overflow-hidden bg-black relative h-52">
              {/* Video para BarcodeDetector nativo */}
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${usingQuagga ? "hidden" : ""}`}
                muted
                playsInline
              />
              {/* Contenedor donde QuaggaJS inyecta su propio video/canvas */}
              <div
                ref={quaggaContainerRef}
                className={`quagga-viewport absolute inset-0 ${usingQuagga ? "block" : "hidden"}`}
              />

              {/* Placeholder cuando la cámara está inactiva */}
              {!usingCamera && (
                <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground bg-black/80">
                  <div className="flex flex-col items-center gap-2">
                    <CameraOff className="size-6 opacity-50" />
                    <span>Cámara inactiva</span>
                  </div>
                </div>
              )}

              {/* Línea de escaneo animada (visible solo con cámara activa) */}
              {usingCamera && (
                <div
                  className="absolute left-2 right-2 h-0.5 bg-red-500/80 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                  style={{ animation: "scanLine 2s ease-in-out infinite" }}
                />
              )}

              {/* Código detectado en tiempo real (overlay inferior) */}
              {usingCamera && codigoDetectado && (
                <div
                  className="absolute bottom-0 left-0 right-0 bg-black/70 px-3 py-1.5 flex items-center justify-between gap-2"
                  style={{ animation: "codeFadeIn 200ms ease-out" }}
                >
                  <span className="text-white text-sm font-mono truncate">
                    {codigoDetectado}
                  </span>
                  {formatoDetectado && formatoDetectado !== "UNKNOWN" && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 shrink-0 bg-white/20 text-white border-0"
                    >
                      {formatoDetectado}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Botones de control de cámara */}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={iniciarCamara}
                disabled={usingCamera}
                className="gap-1.5"
              >
                <Camera className="size-3.5" />
                {usingCamera ? "Escaneando..." : "Usar cámara"}
              </Button>
              {usingCamera && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={detenerCamara}
                  className="gap-1.5"
                >
                  <CameraOff className="size-3.5" />
                  Detener
                </Button>
              )}
            </div>

            {/* Error de cámara */}
            {cameraError && (
              <div className="text-xs text-red-500 bg-red-50 rounded-md px-2 py-1.5">
                {cameraError}
              </div>
            )}
          </div>

          {/* --- Input de búsqueda/escaneo manual --- */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Código o Búsqueda
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Nombre o código..."
                  value={barcodeInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleEnterPress}
                  className="pl-7 h-8 text-sm"
                  autoComplete="off"
                />
                {barcodeInput && (
                  <button
                    type="button"
                    aria-label="Limpiar búsqueda"
                    onClick={limpiarBusqueda}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Cant:</label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-16 h-8 text-sm"
              />
              <Button size="sm" onClick={limpiarBusqueda} variant="outline">
                Limpiar
              </Button>
              <Button
                size="sm"
                onClick={handleCopyCurrent}
                variant="secondary"
                title="Copiar código al portapapeles"
              >
                <Copy className="size-3" />
              </Button>
            </div>
          </div>

          {/* --- Banner del último producto escaneado/agregado --- */}
          {lastScanned && (
            <Alert
              className="border-green-200 bg-green-50 py-2"
              style={{
                animation: lastScannedFade
                  ? "slideUpFadeOut 400ms ease-in forwards"
                  : "slideDownFade 220ms ease-out",
              }}
            >
              <CheckCircle className="size-3 text-green-600" />
              <AlertDescription className="text-green-800 text-xs">
                <strong>Agregado:</strong> {lastScanned.name} - $
                {lastScanned.price.toLocaleString("es-CL")}
              </AlertDescription>
            </Alert>
          )}

          {/* --- Lista de resultados de búsqueda --- */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">
                Resultados ({searchResults.length})
              </h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {searchResults.map((product, idx) => (
                  <div
                    key={product.id}
                    className="p-2 border rounded-md text-sm"
                    style={{
                      animation: `fadeInUp 250ms ease-out ${idx * 35}ms both`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="font-medium truncate text-xs">
                            {product.name}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1"
                          >
                            {product.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Stock: {product.stock}</span>
                          <span className="font-medium text-foreground">
                            ${product.price.toLocaleString("es-CL")}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => manejarProductoEncontrado(product)}
                        disabled={
                          product.stock <= 0 ||
                          product.estado === "DESHABILITADO"
                        }
                        className="h-7 text-xs"
                      >
                        <Plus className="size-3 mr-1" />
                        Agregar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estilos CSS del escáner */}
      <style>{SCANNER_STYLES}</style>
    </div>
  );
}
