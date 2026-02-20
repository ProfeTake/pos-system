import { useRef, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { CategoryCombobox } from "./CategoryCombobox";
import type { Product, EstadoProducto } from "../../../types";
import { productService } from "../../../services/product.service";
import { productLookupService } from "../../../services/productLookup.service";
import { productCreateSchema, safeParse } from "../../../lib/schemas";
import { Loader, Search } from "lucide-react";
import { Label } from "../../ui/label";

interface NewProductData {
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
  supplier: string;
}

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialBarcode?: string;
  onProductAdded?: (product: Product) => void;
  onRefresh?: () => Promise<any> | void;
}

export function AddProductDialog({
  open,
  onOpenChange,
  initialBarcode = "",
  onProductAdded,
  onRefresh,
}: AddProductDialogProps) {
  const [newProduct, setNewProduct] = useState<NewProductData>({
    name: "",
    category: "",
    stock: 0,
    minStock: 0,
    price: 0,
    cost: 0,
    marginPct: 30,
    BarCode: initialBarcode,
    ml: 0,
    measureUnit: "ml",
    estado: "NORMAL",
    supplier: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);
  const [isValidatingBarcode, setIsValidatingBarcode] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const newProductNameRef = useRef<HTMLInputElement>(null);

  // Función para buscar en Open Food Facts
  const fetchOpenFoodFacts = async (barcode: string) => {
    if (!barcode || barcode.length < 8) return;

    setIsLoadingLookup(true);
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
      );

      if (!response.ok) {
        throw new Error("Producto no encontrado");
      }

      const data = await response.json();

      if (data.status === 1 && data.product) {
        const product = data.product;
        const updates: Partial<NewProductData> = {};

        // Nombre del producto
        if (product.product_name) {
          updates.name = product.product_name;
        } else if (product.product_name_es) {
          updates.name = product.product_name_es;
        }

        // Categoría
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

        if (Object.keys(updates).length > 0) {
          setNewProduct((prev) => ({ ...prev, ...updates }));
          toast.success("Datos cargados desde Open Food Facts");
        } else {
          toast.info("Producto encontrado pero sin datos útiles");
        }
      } else {
        toast.warning("Producto no encontrado en Open Food Facts");
      }
    } catch (error) {
      console.error("Error fetching from Open Food Facts:", error);
      // No mostrar error, intentar con el servicio local
    } finally {
      setIsLoadingLookup(false);
    }
  };

  // Función para validar si el código de barras ya existe
  const validateBarcode = async (barcode: string): Promise<boolean> => {
    if (!barcode || barcode.trim().length === 0) {
      setBarcodeError(null);
      return false;
    }

    setIsValidatingBarcode(true);
    try {
      const existingProduct = await productService.getByBarcode(barcode.trim());

      if (
        existingProduct &&
        !(existingProduct as any).notFound &&
        existingProduct.id &&
        existingProduct.name
      ) {
        setBarcodeError(`Código ya registrado: ${existingProduct.name}`);
        toast.error(`Producto ya registrado: ${existingProduct.name}`);
        return true;
      }
      setBarcodeError(null);
      return false;
    } catch (error: any) {
      setBarcodeError(null);
      return false;
    } finally {
      setIsValidatingBarcode(false);
    }
  };

  // Auto-buscar cuando cambia el código de barras
  useEffect(() => {
    if (!open) return;

    const barcode = newProduct.BarCode.trim();
    if (barcode && barcode.length >= 8 && barcode.length <= 13) {
      const timer = setTimeout(async () => {
        const exists = await validateBarcode(barcode);
        if (!exists && !newProduct.name) {
          // Solo buscar en Open Food Facts si no existe y no tiene nombre
          fetchOpenFoodFacts(barcode);
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [newProduct.BarCode, open]);

  // Reset form when opening with new barcode
  useEffect(() => {
    if (open) {
      setNewProduct({
        name: "",
        category: "",
        stock: 0,
        minStock: 0,
        price: 0,
        cost: 0,
        marginPct: 30,
        BarCode: initialBarcode,
        ml: 0,
        measureUnit: "ml",
        estado: "NORMAL",
        supplier: "",
      });
      setTimeout(() => newProductNameRef.current?.focus(), 0);
    }
  }, [open, initialBarcode]);

  const handleLookupBarcode = async () => {
    if (!newProduct.BarCode) {
      toast.error("Ingresa un código de barras primero");
      return;
    }

    const barcode = newProduct.BarCode.trim();

    // Primero validar si ya existe
    const exists = await validateBarcode(barcode);
    if (exists) return;

    // Buscar en Open Food Facts
    await fetchOpenFoodFacts(barcode);

    // Si no encontró datos, intentar con el servicio local
    if (!newProduct.name) {
      setIsLoadingLookup(true);
      try {
        const result = await productLookupService.fetchProductData(barcode);

        setNewProduct((prev) => ({
          ...prev,
          // Solo autorellenar: nombre, categoría, unidad y cantidad
          name: result.name || prev.name,
          category: result.category || prev.category,
          measureUnit:
            result.quantity?.includes("ml") || result.quantity?.includes("L")
              ? "ml"
              : result.quantity?.includes("g")
              ? "g"
              : prev.measureUnit,
          ml: parseInt(result.quantity?.replace(/\D/g, "") || "0") || prev.ml,
        }));

        toast.success("Producto encontrado y datos completados");
      } catch (error) {
        // Ya se intentó con Open Food Facts, no mostrar error adicional
      } finally {
        setIsLoadingLookup(false);
      }
    }
  };

  const handleSave = async () => {
    if (!newProduct.name || !newProduct.category) {
      toast.error("Completa campos obligatorios");
      return;
    }

    // Validar si el código de barras ya existe
    if (newProduct.BarCode && newProduct.BarCode.trim()) {
      try {
        const existingProduct = await productService.getByBarcode(
          newProduct.BarCode.trim()
        );

        // Filtrar respuestas con notFound=true y validar que tenga datos válidos
        if (
          existingProduct &&
          !(existingProduct as any).notFound &&
          existingProduct.id &&
          existingProduct.name
        ) {
          toast.error(
            `El código de barras ya está registrado para: ${existingProduct.name}`
          );
          return;
        }
      } catch (e: any) {
        // Si error, continuar (el backend validará duplicados de todas formas)
        // Error verificando código, continuar
      }
    }

    const payload = {
      ...newProduct,
      BarCode: newProduct.BarCode.trim() || null,
      supplier: newProduct.supplier.trim() || null,
    } as any;
    const validation = safeParse(productCreateSchema, payload);
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }

    try {
      setIsLoading(true);
      const created = await productService.create(payload);
      onProductAdded?.(created);
      toast.success("Producto creado");
      onOpenChange(false);
    } catch (err: any) {
      if (err?.status === 409) {
        toast.error("Código de barras duplicado");
      } else {
        toast.error("Error al crear");
      }
    } finally {
      setIsLoading(false);
      onRefresh?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar nuevo producto</DialogTitle>
          <DialogDescription>
            Completa los datos para agregar un producto.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Código de barras primero - ancho completo */}
            <div className="col-span-2">
              <Label htmlFor="barcode">Código de Barras</Label>
              <div className="relative mt-1.5">
                <Input
                  id="barcode"
                  value={newProduct.BarCode}
                  onChange={(e) =>
                    setNewProduct((p) => ({ ...p, BarCode: e.target.value }))
                  }
                  placeholder="Escanear código..."
                  className={`font-mono pr-10 ${
                    barcodeError
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleLookupBarcode();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleLookupBarcode}
                  disabled={
                    isLoadingLookup ||
                    isValidatingBarcode ||
                    !newProduct.BarCode
                  }
                  title="Buscar información del producto"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                >
                  {isLoadingLookup || isValidatingBarcode ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {barcodeError && (
                <p className="text-xs text-red-500 mt-1">{barcodeError}</p>
              )}
            </div>

            <div>
              <Label>Nombre</Label>
              <Input
                ref={newProductNameRef}
                value={newProduct.name}
                onChange={(e) =>
                  setNewProduct((p) => ({ ...p, name: e.target.value }))
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Categoría</Label>
              <div className="mt-1.5">
                <CategoryCombobox
                  value={newProduct.category}
                  onChange={(val) =>
                    setNewProduct((p) => ({ ...p, category: val }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>Stock</Label>
              <Input
                type="number"
                min={0}
                value={String(newProduct.stock)}
                onChange={(e) =>
                  setNewProduct((p) => ({
                    ...p,
                    stock: parseInt(e.target.value || "0") || 0,
                  }))
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Stock mínimo</Label>
              <Input
                type="number"
                min={0}
                value={String(newProduct.minStock)}
                onChange={(e) =>
                  setNewProduct((p) => ({
                    ...p,
                    minStock: parseInt(e.target.value || "0") || 0,
                  }))
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Costo</Label>
              <Input
                type="number"
                min={0}
                value={String(newProduct.cost)}
                onChange={(e) => {
                  const cost = parseInt(e.target.value || "0") || 0;
                  setNewProduct((p) => {
                    const price = Math.round(
                      cost * (1 + (p.marginPct || 0) / 100)
                    );
                    return { ...p, cost, price };
                  });
                }}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Margen (%)</Label>
              <Input
                type="number"
                min={0}
                value={String(newProduct.marginPct)}
                onChange={(e) => {
                  const marginPct = parseInt(e.target.value || "0") || 0;
                  setNewProduct((p) => {
                    const price = Math.round(
                      (p.cost || 0) * (1 + marginPct / 100)
                    );
                    return { ...p, marginPct, price };
                  });
                }}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Precio</Label>
              <Input
                type="number"
                min={0}
                value={String(newProduct.price)}
                onChange={(e) => {
                  const price = parseInt(e.target.value || "0") || 0;
                  setNewProduct((p) => {
                    const cost = Math.round(
                      price / (1 + (p.marginPct || 30) / 100)
                    );
                    return { ...p, price, cost };
                  });
                }}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Unidad</Label>
              <div className="mt-1.5">
                <Select
                  value={newProduct.measureUnit}
                  onValueChange={(val) =>
                    setNewProduct((p) => ({ ...p, measureUnit: val as any }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="none">Ninguna</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Cantidad</Label>
              <Input
                type="number"
                min={0}
                disabled={newProduct.measureUnit === "none"}
                value={String(newProduct.ml)}
                onChange={(e) =>
                  setNewProduct((p) => ({
                    ...p,
                    ml: parseInt(e.target.value || "0") || 0,
                  }))
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Proveedor</Label>
              <Input
                value={newProduct.supplier}
                onChange={(e) =>
                  setNewProduct((p) => ({ ...p, supplier: e.target.value }))
                }
                placeholder="Nombre del proveedor"
                className="mt-1.5"
              />
            </div>
            <div className="flex items-end pb-2">
              <div className="text-xs text-muted-foreground">
                <div>
                  Ganancia:{" "}
                  <span className="text-emerald-400 font-medium">
                    $
                    {(newProduct.price - newProduct.cost).toLocaleString(
                      "es-CL"
                    )}
                  </span>{" "}
                  / un
                </div>
                <div>
                  Total:{" "}
                  <span className="font-medium">
                    $
                    {(newProduct.stock * newProduct.price).toLocaleString(
                      "es-CL"
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
