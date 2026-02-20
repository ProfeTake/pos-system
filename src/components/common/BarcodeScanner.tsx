import { useState, useEffect, useRef } from "react";
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
  AlertCircle,
  X,
  Copy,
} from "lucide-react";
import { Product } from "../../types";
import { toast } from "sonner";
import { apiFetchJSON } from "../../lib/api";

interface BarcodeScannerProps {
  products: Product[];
  onAddToCart: (product: Product, quantity: number) => void;
  isVisible: boolean;
  onClose: () => void;
  context: "cart" | "inventory";
  onBarcodeForInventory?: (barcode: string) => void;
}

export function BarcodeScanner({
  products,
  onAddToCart,
  isVisible,
  onClose,
  context,
  onBarcodeForInventory,
}: BarcodeScannerProps) {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [lastScanned, setLastScanned] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [lastScannedFade, setLastScannedFade] = useState(false); // controla animación de salida del banner "Último agregado"
  // Cámara (móvil)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [usingCamera, setUsingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const supportsBarcodeDetector =
    typeof window !== "undefined" && (window as any).BarcodeDetector;
  const quaggaContainerRef = useRef<HTMLDivElement | null>(null);
  const [usingQuagga, setUsingQuagga] = useState(false);
  const zxingReaderRef = useRef<any>(null);
  const zxingActiveRef = useRef<boolean>(false);
  // Consenso de detección y control antirrebote
  const detectionBufferRef = useRef<Array<{ code: string; ts: number }>>([]);
  const scanningLockedRef = useRef<boolean>(false);
  const lastAcceptedCodeRef = useRef<string | null>(null);
  const isMobileDevice = () =>
    typeof navigator !== "undefined" &&
    (/Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent) ||
      (typeof window !== "undefined" && window.innerWidth < 768));

  // Cuando la prop isVisible pasa a false desde fuera, dejamos que la animación de salida controle desmontaje
  const [shouldRender, setShouldRender] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setIsExiting(false);
      setShouldRender(true);
      // Autoiniciar cámara en móvil para inventario (si soportado)
      if (context === "inventory" && isMobileDevice()) {
        startCamera().catch((e) =>
          setCameraError(e?.message || "No se pudo iniciar la cámara")
        );
      }
    } else if (!isVisible && shouldRender) {
      // dispara animación de salida
      setIsExiting(true);
      const timeout = setTimeout(() => {
        setShouldRender(false);
      }, 220); // duración > a la animación de salida
      // Detener cámara al cerrar
      stopCamera();
      return () => clearTimeout(timeout);
    }
  }, [isVisible, shouldRender]);
  // Ya no necesitamos ref para detectar click fuera; usaremos currentTarget === target

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  // Controlar duración y fadeout del mensaje de último agregado (~3s total)
  useEffect(() => {
    if (!lastScanned) return;
    setLastScannedFade(false); // reiniciar fade
    // Iniciar fade a los 2600ms, limpiar a los 3000ms
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

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  // Filtro local multi-campo (nombre, categoría, código de barra)
  const filterLocalProducts = (query: string) => {
    const term = query.trim().toLowerCase();
    if (!term) {
      setSearchResults([]);
      return;
    }
    const results = products.filter((p) => {
      if (p.estado === "DESHABILITADO") return false; // excluir deshabilitados
      const name = p.name?.toLowerCase() || "";
      const cat = p.category?.toLowerCase() || "";
      const code = p.barCode?.toLowerCase() || "";
      return name.includes(term) || cat.includes(term) || code.includes(term);
    });
    setSearchResults(results);
  };

  const handleInputChange = (value: string) => {
    setBarcodeInput(value);
    filterLocalProducts(value);

    // Detectar escaneo completo (threshold mínimo de longitud para considerar código exacto)
    if (value.length >= 6) {
      const val = String(value || "").trim();
      const exactMatch = products.find(
        (product) => product.barCode === val && product.estado !== "DESHABILITADO"
      );
      if (exactMatch) {
        if (context === "cart") {
          handleProductFound(exactMatch);
          setBarcodeInput("");
          setSearchResults([]);
        } else if (context === "inventory") {
          setLastScanned(exactMatch);
          setBarcodeInput("");
          setSearchResults([]);
        }
        return;
      }

      // Lookup remoto en backend si no hay coincidencia local
      (async () => {
        try {
          const foundProduct = await apiFetchJSON<Product>(
            `/api/products/by-barcode/${encodeURIComponent(val)}`
          );
          if (foundProduct) {
            if (context === "cart") {
              handleProductFound(foundProduct);
              setBarcodeInput("");
              setSearchResults([]);
            } else {
              setLastScanned(foundProduct);
              setBarcodeInput("");
              setSearchResults([]);
              toast.info(
                "Producto encontrado en backend (no estaba en memoria)"
              );
            }
            return;
          }
        } catch (err: any) {
          // 404 -> no encontrado
          if (err?.status === 404) {
            if (context === "inventory" && onBarcodeForInventory) {
              onBarcodeForInventory(val);
              setBarcodeInput("");
              setSearchResults([]);
            } else {
              toast.error("Producto no encontrado");
            }
          } else {
            if (context === "inventory" && onBarcodeForInventory) {
              onBarcodeForInventory(val);
              setBarcodeInput("");
              setSearchResults([]);
            } else {
              toast.error("No fue posible consultar el backend");
            }
          }
        }
      })();
    }
  };

  const handleProductFound = (product: Product) => {
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
    // Notificación reemplazada por indicador en Sidebar.
  };

  // Flujo común cuando se detecta un código desde cualquier motor
  const onCodeDetected = async (code: string) => {
    const val = String(code || "").trim();
    await writeCodeToInputAndClipboard(val);

    // Check if it's a promotion code (starts with PROMO-)
    if (code.toUpperCase().startsWith("PROMO-")) {
      try {
        const { promotionsService } = await import("../../services/promotions.service");
        const promotion = await promotionsService.getByBarcode(code);

        if (promotion) {
          stopCamera();
          toast.success(`Promoción detectada: ${promotion.name}`);

          // TODO: Apply promotion to cart
          // For now, just show a message
          toast.info(`Aplica: ${promotion.description || "Descuento especial"}`);

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

    // Inventario: pasar a alta/edición
    if (context === "inventory" && onBarcodeForInventory) {
      stopCamera();
      onBarcodeForInventory(val);
      onClose();
      return;
    }
    // Carrito: buscar producto y agregar
    const found = products.find((p) => p.barCode === val) || products.find((p) => p.barCode === code);
    if (found) {
      stopCamera();
      handleProductFound(found);
      onClose();
    } else {
      toast.error("Producto no encontrado");
    }
  };

  // ==========================
  // Utilidades de normalización/validación
  // ==========================
  const isNumeric = (s: string) => /^[0-9]+$/.test(s);
  const ean13Check = (digits: string) => {
    if (digits.length !== 13 || !isNumeric(digits)) return false;
    const arr = digits.split("").map((d) => parseInt(d));
    const sum = arr
      .slice(0, 12)
      .reduce((acc, d, idx) => acc + d * (idx % 2 === 0 ? 1 : 3), 0);
    const check = (10 - (sum % 10)) % 10;
    return check === arr[12];
  };
  const upcACheck = (digits: string) => {
    if (digits.length !== 12 || !isNumeric(digits)) return false;
    const arr = digits.split("").map((d) => parseInt(d));
    // Índices 0..10 (11 dígitos), impares/pares según estándar UPC-A
    const sumOdd = arr
      .slice(0, 11)
      .reduce((acc, d, idx) => acc + (idx % 2 === 0 ? d : 0), 0);
    const sumEven = arr
      .slice(0, 11)
      .reduce((acc, d, idx) => acc + (idx % 2 === 1 ? d : 0), 0);
    const total = sumOdd * 3 + sumEven;
    const check = (10 - (total % 10)) % 10;
    return check === arr[11];
  };
  const ean8Check = (digits: string) => {
    if (digits.length !== 8 || !isNumeric(digits)) return false;
    const arr = digits.split("").map((d) => parseInt(d));
    const sum = arr
      .slice(0, 7)
      .reduce((acc, d, idx) => acc + d * (idx % 2 === 0 ? 3 : 1), 0);
    const check = (10 - (sum % 10)) % 10;
    return check === arr[7];
  };
  const normalizeBarcode = (raw: string) => {
    // Normalización eliminada: devolver el código tal cual (trim)
    return String(raw || "").trim();
  };

  // Escribir el código en el input de búsqueda y copiarlo al portapapeles
  const writeCodeToInputAndClipboard = async (code: string) => {
    try {
      setBarcodeInput(code);
      setSearchResults([]);
      inputRef.current?.focus();
      let copied = false;
      try {
        await navigator.clipboard.writeText(code);
        copied = true;
      } catch {
        try {
          const ta = document.createElement("textarea");
          ta.value = code;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          copied = true;
        } catch { }
      }
      if (copied) toast.success(`Código copiado: ${code}`);
      else
        toast.message(`Código: ${code}`, {
          description:
            "No se pudo copiar automáticamente. Puedes copiarlo manualmente.",
        });
    } catch { }
  };

  const handleCopyCurrent = async () => {
    const code = barcodeInput.trim();
    if (!code) {
      toast.error("No hay código para copiar");
      return;
    }
    await writeCodeToInputAndClipboard(code);
  };

  const startCamera = async () => {
    // Solo usar cámara si existe getUserMedia
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "La cámara no está disponible en este dispositivo/navegador"
      );
      return;
    }
    setCameraError(null);
    stopCamera();
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };

    // Ruta 1: API nativa BarcodeDetector
    if (supportsBarcodeDetector) {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch { }
      }
      setUsingCamera(true);
      // Iniciar detector nativo y ZXing en paralelo para máxima compatibilidad
      detectWithBarcodeDetector();
      try {
        const track = stream.getVideoTracks()[0];
        const devId =
          (track.getSettings && track.getSettings().deviceId) || undefined;
        await startZxing(devId as any);
        zxingOnResult = async (code: string) => {
          handleDetectionCandidate(code);
        };
      } catch { }
      return;
    }

    // Ruta 2: Quagga2 (fallback para desktop navegadores sin BarcodeDetector, ej. Firefox)
    try {
      await loadQuaggaScript();
      const Q = (window as any).Quagga;
      if (!Q) throw new Error("Quagga no disponible");
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
            decoder: {
              readers: [
                "ean_reader",
                "ean_8_reader",
                "code_128_reader",
                "code_39_reader",
                "upc_reader",
                "upc_e_reader",
              ],
            },
          },
          (err: any) => {
            if (err) return reject(err);
            Q.start();
            resolve();
          }
        );
      });

      const handleDecoded = async (code: string) => {
        try {
          handleDetectionCandidate(code);
        } catch { }
      };

      const onDetected = (res: any) => {
        try {
          const code = String(res?.codeResult?.code || "").trim();
          if (!code) return;
          handleDecoded(code);
        } catch { }
      };
      Q.onDetected(onDetected);

      // Iniciar ZXing como lector paralelo para otros formatos si está disponible
      try {
        await startZxing();
        // ZXing entrega resultados vía callback en startZxing; reusar handleDecoded
        zxingOnResult = (code: string) => handleDecoded(code);
      } catch { }
    } catch (e: any) {
      setCameraError(
        e?.message ||
        "No fue posible iniciar el escáner. Usa lector USB o entrada manual."
      );
    }
  };

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setUsingCamera(false);
    // Detener Quagga si estaba activo
    try {
      const Q = (window as any).Quagga;
      if (Q && usingQuagga) {
        Q.stop();
        Q.offDetected?.(() => { });
      }
    } catch { }
    setUsingQuagga(false);
    stopZxing();
  };

  const detectWithBarcodeDetector = async () => {
    try {
      const Detector = (window as any).BarcodeDetector;
      const detector = new Detector({
        // Restringir a 1D comunes para productos y reducir falsos positivos
        formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e"],
      });
      const loop = async () => {
        if (!videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length > 0) {
            const value = codes[0].rawValue || codes[0].rawValue;
            const code = String(value || "").trim();
            if (code) handleDetectionCandidate(code);
          }
        } catch (e) {
          // Ignorar error de frame
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e: any) {
      setCameraError(e?.message || "No se pudo iniciar el detector de códigos");
    }
  };

  // Carga dinámica de Quagga2 desde CDN (sin dependencia de build)
  const loadQuaggaScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const id = "quagga2-cdn-script";
      if (document.getElementById(id)) return resolve();
      const s = document.createElement("script");
      s.id = id;
      s.src = "https://unpkg.com/@ericblade/quagga2@1.2.6/dist/quagga.min.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("No se pudo cargar Quagga2"));
      document.head.appendChild(s);
    });
  };

  // ZXing: soporte QR y multi-formato (fallback)
  let zxingOnResult: ((code: string) => void) | null = null;
  const loadZxingScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const id = "zxing-umd-script";
      if (document.getElementById(id)) return resolve();
      const s = document.createElement("script");
      s.id = id;
      s.src = "https://unpkg.com/@zxing/library@0.20.0/umd/index.min.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("No se pudo cargar ZXing"));
      document.head.appendChild(s);
    });
  };

  const startZxing = async (deviceId?: string) => {
    try {
      await loadZxingScript();
      const ZX = (window as any).ZXing;
      if (!ZX || !ZX.BrowserMultiFormatReader) return;
      // Limitar formatos a códigos 1D típicos de retail para reducir falsos positivos
      let reader: any;
      try {
        const hints = new ZX.Map();
        hints.set(ZX.DecodeHintType.POSSIBLE_FORMATS, [
          ZX.BarcodeFormat.EAN_13,
          ZX.BarcodeFormat.EAN_8,
          ZX.BarcodeFormat.UPC_A,
          ZX.BarcodeFormat.UPC_E,
          ZX.BarcodeFormat.CODE_128,
          ZX.BarcodeFormat.CODE_39,
        ]);
        reader = new ZX.BrowserMultiFormatReader(hints, 500);
      } catch {
        reader = new ZX.BrowserMultiFormatReader();
      }
      zxingReaderRef.current = reader;
      zxingActiveRef.current = true;
      await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current as HTMLVideoElement,
        (result: any, err: any) => {
          if (!zxingActiveRef.current) return;
          try {
            if (result) {
              const text =
                (typeof result.getText === "function" && result.getText()) ||
                result?.text ||
                String(result || "");
              const code = String(text || "").trim();
              if (code) {
                zxingOnResult?.(code);
              }
            }
          } catch { }
        }
      );
    } catch { }
  };

  const stopZxing = () => {
    try {
      zxingActiveRef.current = false;
      const r = zxingReaderRef.current;
      if (r && typeof r.reset === "function") r.reset();
    } catch { }
    zxingReaderRef.current = null;
    zxingOnResult = null;
  };

  // ==========================
  // Consenso de detecciones (evita lecturas erráticas)
  // ==========================
  const handleDetectionCandidate = (raw: string) => {
    if (scanningLockedRef.current) return;
    const normalized = normalizeBarcode(raw);
    const now = Date.now();
    const buf = detectionBufferRef.current;
    buf.push({ code: normalized, ts: now });
    // limpiar fuera de ventana móvil (800ms)
    while (buf.length && now - buf[0].ts > 800) buf.shift();

    // 1) Dos lecturas consecutivas iguales dentro de 500ms
    if (buf.length >= 2) {
      const a = buf[buf.length - 1];
      const b = buf[buf.length - 2];
      if (a.code === b.code && a.ts - b.ts <= 500) {
        acceptConsensusCode(a.code);
        return;
      }
    }
    // 2) Mayoría en ventana: 3+ apariciones dentro de 800ms
    const counts = new Map<string, number>();
    for (const item of buf)
      counts.set(item.code, (counts.get(item.code) || 0) + 1);
    for (const [code, cnt] of counts) {
      if (cnt >= 3) {
        acceptConsensusCode(code);
        return;
      }
    }
  };

  const acceptConsensusCode = async (code: string) => {
    if (scanningLockedRef.current) return;
    if (lastAcceptedCodeRef.current === code) return;
    scanningLockedRef.current = true;
    lastAcceptedCodeRef.current = code;
    stopCamera();
    await onCodeDetected(code);
  };

  const handleEnterPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (searchResults.length === 1) {
        handleProductFound(searchResults[0]);
        setBarcodeInput("");
        setSearchResults([]);
      } else if (searchResults.length > 1) {
        toast.error(
          "Múltiples productos encontrados. Selecciona uno específico."
        );
      } else {
        toast.error("Producto no encontrado");
      }
    }
  };

  const clearSearch = () => {
    setBarcodeInput("");
    setSearchResults([]);
    setLastScanned(null);
    inputRef.current?.focus();
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm`}
      style={{
        animation: `${isExiting ? "modalFadeOut" : "modalFadeIn"
          } 220ms ease-out`,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          // Cerrar al hacer click fuera del contenido
          e.preventDefault();
          stopCamera();
          onClose();
        }
      }}
    >
      <Card
        className="w-full max-w-sm max-h-[70vh] overflow-auto shadow-lg border border-border/60"
        style={{
          animation: `${isExiting ? "modalScaleOut" : "modalScaleIn"
            } 220ms cubic-bezier(.16,.84,.44,1)`,
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Scan className="size-4" />
                Escáner
              </CardTitle>
              <CardDescription className="text-xs">
                Escanea o busca productos
              </CardDescription>
            </div>
            <button
              onClick={() => {
                stopCamera();
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
          {/* Vista de cámara compacta */}
          <div className="space-y-2">
            <div className="rounded-md overflow-hidden bg-black relative h-32">
              {/* Video para BarcodeDetector; Quagga renderiza su propio canvas/video en quaggaContainer */}
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${usingQuagga ? "hidden" : ""
                  }`}
                muted
                playsInline
              />
              <div
                ref={quaggaContainerRef}
                className={`absolute inset-0 ${usingQuagga ? "block" : "hidden"
                  }`}
              />
              {!usingCamera && (
                <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
                  Cámara inactiva
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={startCamera}>Usar cámara</Button>
              {usingCamera && (
                <Button size="sm" variant="outline" onClick={stopCamera}>
                  Detener
                </Button>
              )}
            </div>
            {cameraError && (
              <div className="text-xs text-red-500">{cameraError}</div>
            )}
          </div>

          {/* Input de búsqueda/escaneo */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Código o Búsqueda</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 size-3 text-muted-foreground" />
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
                    onClick={clearSearch}
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
              <Button size="sm" onClick={clearSearch} variant="outline">
                Limpiar
              </Button>
              <Button
                size="sm"
                onClick={handleCopyCurrent}
                variant="secondary"
                title="Copiar código"
              >
                <Copy className="size-3" />
              </Button>
            </div>
          </div>

          {/* Último producto escaneado */}
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

          {/* Resultados de búsqueda */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">
                Resultados ({searchResults.length})
              </h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {searchResults.map((product, idx) => (
                  <div
                    key={product.id}
                    className="p-2 border rounded-md text-sm animate-fade-in-up"
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
                          <Badge variant="secondary" className="text-[10px] px-1">
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
                        onClick={() => handleProductFound(product)}
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
      {/* Animaciones CSS inline (podrían moverse a un CSS global si prefieres) */}
      <style>{`
        @keyframes modalFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalFadeOut { from { opacity: 1 } to { opacity: 0 } }
        @keyframes modalScaleIn { from { opacity:0; transform: scale(.96) } to { opacity:1; transform: scale(1) } }
        @keyframes modalScaleOut { from { opacity:1; transform: scale(1) } to { opacity:0; transform: scale(.96) } }
        @keyframes slideDownFade { from { opacity:0; transform: translateY(-6px) } to { opacity:1; transform: translateY(0) } }
        @keyframes fadeInUp { from { opacity:0; transform: translateY(6px) } to { opacity:1; transform: translateY(0) } }
        @keyframes slideUpFadeOut { from { opacity:1; transform: translateY(0) } to { opacity:0; transform: translateY(-4px) } }
      `}</style>
    </div>
  );
}
