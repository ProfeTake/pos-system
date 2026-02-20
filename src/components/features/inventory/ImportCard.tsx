import { useState, useEffect } from "react";
import {
  Copy,
  XCircle,
  Save,
  Search,
  Bot,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { CategoryCombobox } from "./CategoryCombobox";
import { productService } from "../../../services/product.service";
import type { EstadoProducto, ConfidenceLevel } from "../../../types";

export interface ImportDraft {
  localId: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  cost: number;
  marginPct: number;
  BarCode: string;
  ml: number;
  measureUnit: "ml" | "g" | "none";
  estado: EstadoProducto;
  supplier?: string; // Proveedor del producto
  loading?: boolean;
  error?: string | null;
  fetchedFromWeb?: boolean;
  // Claude AI specific fields
  aiGenerated?: boolean;
  confidence?: ConfidenceLevel;
  aiSource?: string;
  marca?: string;
  descripcion?: string;
}

interface ImportCardProps {
  draft: ImportDraft;
  onUpdate: (localId: string, patch: Partial<ImportDraft>) => void;
  onDuplicate: (localId: string) => void;
  onRemove: (localId: string) => void;
  onSave: (draft: ImportDraft) => Promise<boolean>;
  canDuplicate: boolean;
  isDuplicate?: boolean;
}

/**
 * Obtiene el color del badge de confianza según el nivel.
 */
function getConfidenceBadgeVariant(
  confidence?: ConfidenceLevel
): "default" | "secondary" | "destructive" {
  switch (confidence) {
    case "alta":
      return "default"; // Verde
    case "media":
      return "secondary"; // Amarillo
    case "baja":
      return "destructive"; // Rojo
    default:
      return "secondary";
  }
}

/**
 * Obtiene el ícono de confianza según el nivel.
 */
function getConfidenceIcon(confidence?: ConfidenceLevel) {
  switch (confidence) {
    case "alta":
      return <CheckCircle className="size-3 mr-1" />;
    case "media":
      return <AlertCircle className="size-3 mr-1" />;
    case "baja":
      return <AlertCircle className="size-3 mr-1" />;
    default:
      return null;
  }
}

export function ImportCard({
  draft: d,
  onUpdate,
  onDuplicate,
  onRemove,
  onSave,
  canDuplicate,
  isDuplicate,
}: ImportCardProps) {
  const unitProfit = d.price - d.cost;
  const totalProfit = unitProfit * d.stock;
  const [isFetchingOpenFood, setIsFetchingOpenFood] = useState(false);
  const [isValidatingBarcode, setIsValidatingBarcode] = useState(false);
  const [barcodeExists, setBarcodeExists] = useState(false);

  // Función para validar si el código de barras ya existe
  const validateBarcode = async (barcode: string) => {
    if (!barcode || barcode.trim().length === 0) {
      setBarcodeExists(false);
      return false;
    }

    setIsValidatingBarcode(true);
    try {
      const existingProduct = await productService.getByBarcode(barcode.trim());

      // Filtrar respuestas con notFound=true y validar que tenga datos válidos
      if (
        existingProduct &&
        !(existingProduct as any).notFound &&
        existingProduct.id &&
        existingProduct.name
      ) {
        setBarcodeExists(true);
        onUpdate(d.localId, {
          error: `El código de barras ya existe: ${existingProduct.name}`,
        });
        toast.error(`Producto ya registrado: ${existingProduct.name}`);
        return true;
      }
      // Si llegamos aquí, el producto no existe
      setBarcodeExists(false);
      onUpdate(d.localId, { error: null });
      return false;
    } catch (error: any) {
      // En caso de error, asumir que no existe
      setBarcodeExists(false);
      onUpdate(d.localId, { error: null });
      return false;
    } finally {
      setIsValidatingBarcode(false);
    }
  };

  // Función para buscar en Open Food Facts
  const fetchOpenFoodFacts = async (barcode: string) => {
    if (!barcode || barcode.length < 8) return;

    setIsFetchingOpenFood(true);
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
      );

      // Manejar 404 específicamente como "producto no encontrado"
      if (response.status === 404) {
        toast.info("Producto no encontrado en Open Food Facts");
        return;
      }

      if (!response.ok) {
        // Otros errores HTTP
        toast.warning("No se pudo consultar Open Food Facts");
        return;
      }

      const data = await response.json();

      if (data.status === 1 && data.product) {
        const product = data.product;

        // Extraer información relevante
        const updates: Partial<ImportDraft> = {};

        // Nombre del producto
        if (product.product_name) {
          updates.name = product.product_name;
        } else if (product.product_name_es) {
          updates.name = product.product_name_es;
        }

        // Categoría (intentar mapear a nuestras categorías)
        if (product.categories_tags && product.categories_tags.length > 0) {
          const category = product.categories_tags[0]
            .replace("en:", "")
            .replace(/-/g, " ")
            .split(" ")
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
          updates.category = category;
        }

        // Cantidad/volumen
        if (product.quantity) {
          const quantityMatch = product.quantity.match(/(\d+)\s*(ml|g|kg|l)/i);
          if (quantityMatch) {
            const value = parseInt(quantityMatch[1]);
            const unit = quantityMatch[2].toLowerCase();

            if (unit === "ml" || unit === "l") {
              updates.ml = unit === "l" ? value * 1000 : value;
              updates.measureUnit = "ml";
            } else if (unit === "g" || unit === "kg") {
              updates.ml = unit === "kg" ? value * 1000 : value;
              updates.measureUnit = "g";
            }
          }
        }

        // Aplicar actualizaciones
        if (Object.keys(updates).length > 0) {
          onUpdate(d.localId, { ...updates, fetchedFromWeb: true });
          toast.success("Datos cargados desde Open Food Facts");
        } else {
          toast.info("Producto encontrado pero sin datos útiles");
        }
      } else {
        toast.info("Producto no encontrado en Open Food Facts");
      }
    } catch (error) {
      // Solo loguear en consola, no mostrar error al usuario
      console.warn("Open Food Facts fetch failed:", error);
      // No mostrar toast de error - simplemente el producto no se encontró
    } finally {
      setIsFetchingOpenFood(false);
    }
  };

  // Auto-buscar cuando cambia el código de barras (solo si tiene longitud válida)
  // OPTIMIZACIÓN: Respetar d.loading para no duplicar búsquedas si el padre está trabajando
  useEffect(() => {
    // Si la tarjeta se está cargando desde el padre (Inventory), esperar.
    if (d.loading) return;

    const barcode = d.BarCode.trim();
    if (
      barcode &&
      barcode.length >= 8 &&
      barcode.length <= 13 &&
      !d.name &&
      !d.fetchedFromWeb
    ) {
      // Primero validar si ya existe
      validateBarcode(barcode).then((exists) => {
        if (!exists) {
          // Solo buscar en Open Food Facts si no existe
          const timer = setTimeout(() => {
            fetchOpenFoodFacts(barcode);
          }, 800);
          return () => clearTimeout(timer);
        }
      });
    } else if (barcode && barcode.length >= 8) {
      // Validar código de barras cuando cambia manualmente
      const timer = setTimeout(() => {
        validateBarcode(barcode);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [d.BarCode, d.loading, d.fetchedFromWeb, d.name]);

  return (
    <div
      className={`border rounded-md p-4 flex flex-col gap-3 bg-background shadow-sm relative w-full min-w-0 ${
        isDuplicate
          ? "border-orange-500 ring-1 ring-orange-500"
          : d.aiGenerated
          ? "border-blue-500/50"
          : ""
      }`}
    >
      {(d.loading || isFetchingOpenFood || isValidatingBarcode) && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur flex items-center justify-center text-xs">
          {isValidatingBarcode
            ? "Validando código de barras..."
            : isFetchingOpenFood
            ? "Buscando en Open Food Facts..."
            : "Buscando datos..."}
        </div>
      )}
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {isDuplicate ? (
              <span className="flex items-center gap-1 text-orange-600">
                <AlertCircle className="size-4" />
                Duplicado
              </span>
            ) : d.aiGenerated ? (
              <span className="flex items-center gap-1">
                <Bot className="size-4 text-blue-500" />
                Catalogado con IA
              </span>
            ) : d.fetchedFromWeb ? (
              "Autorrelleno web"
            ) : (
              "Nuevo producto"
            )}
          </span>
          {d.aiGenerated && d.confidence && (
            <Badge
              variant={getConfidenceBadgeVariant(d.confidence)}
              className="text-xs"
            >
              {getConfidenceIcon(d.confidence)}
              {d.confidence === "alta"
                ? "Alta confianza"
                : d.confidence === "media"
                ? "Confianza media"
                : "Baja confianza"}
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="Duplicar"
            onClick={() => onDuplicate(d.localId)}
            disabled={!canDuplicate}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Eliminar tarjeta"
            onClick={() => onRemove(d.localId)}
          >
            <XCircle className="size-4" />
          </Button>
        </div>
      </div>

      {/* Información adicional de IA */}
      {d.aiGenerated && (d.marca || d.aiSource) && (
        <div
          className={`text-xs text-muted-foreground border-l-2 pl-2 py-1 ${
            d.aiSource?.includes("OpenFoodFacts")
              ? "border-green-500/50 bg-green-500/5"
              : d.aiSource?.includes("Chile") ||
                d.aiSource?.includes("Jumbo") ||
                d.aiSource?.includes("Lider")
              ? "border-orange-500/50 bg-orange-500/5"
              : "border-blue-500/50 bg-blue-500/5"
          }`}
        >
          {d.marca && <div>Marca: {d.marca}</div>}
          {d.aiSource && (
            <div className="flex items-center gap-1">
              Fuente: <span className="font-medium">{d.aiSource}</span>
              {d.aiSource.includes("OpenFoodFacts") && (
                <CheckCircle className="size-3 text-green-600" />
              )}
            </div>
          )}
          {d.descripcion && (
            <div className="mt-1 text-xs opacity-75">{d.descripcion}</div>
          )}
        </div>
      )}

      <div className="space-y-3 text-sm">
        <div>
          <label className="text-xs font-medium block mb-1">
            Nombre{" "}
            {!d.name && d.aiGenerated && (
              <span className="text-red-500">*</span>
            )}
          </label>
          <Input
            value={d.name}
            onChange={(e) =>
              onUpdate(d.localId, {
                name: e.target.value,
              })
            }
            placeholder="Nombre del producto"
            className={`text-sm h-9 ${
              !d.name && d.aiGenerated ? "border-yellow-500" : ""
            }`}
          />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">
            Categoría{" "}
            {!d.category && d.aiGenerated && (
              <span className="text-red-500">*</span>
            )}
          </label>
          <CategoryCombobox
            value={d.category}
            onChange={(val) => onUpdate(d.localId, { category: val })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1">Stock</label>
            <Input
              type="number"
              min={0}
              value={String(d.stock)}
              onChange={(e) =>
                onUpdate(d.localId, {
                  stock: parseInt(e.target.value || "0") || 0,
                })
              }
              className="text-sm h-9"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Stock Mín.</label>
            <Input
              type="number"
              min={0}
              value={String(d.minStock)}
              onChange={(e) =>
                onUpdate(d.localId, {
                  minStock: parseInt(e.target.value || "0") || 0,
                })
              }
              className="text-sm h-9"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1">Costo</label>
            <Input
              type="number"
              min={0}
              value={String(d.cost)}
              onChange={(e) => {
                const cost = parseInt(e.target.value || "0") || 0;
                const price = Math.round(cost * (1 + d.marginPct / 100));
                onUpdate(d.localId, { cost, price });
              }}
              className="text-sm h-9"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Margen %</label>
            <Input
              type="number"
              min={0}
              value={String(d.marginPct)}
              onChange={(e) => {
                const margin = parseInt(e.target.value || "0") || 0;
                const price = Math.round(d.cost * (1 + margin / 100));
                onUpdate(d.localId, { marginPct: margin, price });
              }}
              className="text-sm h-9"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1">Precio</label>
            <Input
              type="number"
              min={0}
              value={String(d.price)}
              onChange={(e) => {
                const price = parseInt(e.target.value || "0") || 0;
                const cost = Math.round(price / (1 + d.marginPct / 100));
                onUpdate(d.localId, { price, cost });
              }}
              className="text-sm h-9"
            />
          </div>
          <div className="flex flex-col justify-end">
            <div className="text-xs text-muted-foreground space-y-0.5 pb-1">
              <div>
                Ganancia:{" "}
                <span className="text-emerald-400 font-medium">
                  ${unitProfit.toLocaleString("es-CL")}
                </span>{" "}
                / un
              </div>
              <div>
                Total:{" "}
                <span className="font-medium">
                  ${totalProfit.toLocaleString("es-CL")}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1">Unidad</label>
            <Select
              value={d.measureUnit}
              onValueChange={(val: any) =>
                onUpdate(d.localId, { measureUnit: val })
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ml">ml</SelectItem>
                <SelectItem value="g">g</SelectItem>
                <SelectItem value="none">Ninguna</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">
              Cantidad ({d.measureUnit})
            </label>
            <Input
              type="number"
              min={0}
              disabled={d.measureUnit === "none"}
              value={String(d.ml)}
              onChange={(e) =>
                onUpdate(d.localId, {
                  ml: parseInt(e.target.value || "0") || 0,
                })
              }
              className="text-sm h-9"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">
            Código de Barra
          </label>
          <Input
            value={d.BarCode}
            onChange={(e) =>
              onUpdate(d.localId, {
                BarCode: e.target.value,
                fetchedFromWeb: false,
              })
            }
            className={`text-sm h-9 ${
              d.error ? "border-red-500 focus-visible:ring-red-500" : ""
            }`}
            placeholder="Escanear..."
          />
          {d.error && <p className="text-xs text-red-500 mt-1">{d.error}</p>}
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Proveedor</label>
          <Input
            value={d.supplier || ""}
            onChange={(e) =>
              onUpdate(d.localId, {
                supplier: e.target.value,
              })
            }
            className="text-sm h-9"
            placeholder="Nombre del proveedor"
          />
        </div>
        <div className="pt-2 flex justify-end">
          <Button size="sm" onClick={() => onSave(d)} disabled={d.loading}>
            <Save className="size-4 mr-1" /> Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
