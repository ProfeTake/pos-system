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
import { 
  Loader, 
  Search, 
  Package, 
  DollarSign, 
  Tag, 
  ScanBarcode, 
  Layers, 
  LineChart 
} from "lucide-react";
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
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Agregar nuevo producto
          </DialogTitle>
          <DialogDescription>
            Completa los datos detallados del nuevo artículo.
          </DialogDescription>
        </DialogHeader>
        
        {/* Scrollable form content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-thin">
          
          {/* SECCIÓN: Identificación */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <ScanBarcode className="w-4 h-4" />
              Identificación
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="barcode">Código de Barras</Label>
                <div className="relative">
                  <Input
                    id="barcode"
                    value={newProduct.BarCode}
                    onChange={(e) =>
                      setNewProduct((p) => ({ ...p, BarCode: e.target.value }))
                    }
                    placeholder="Escanear o ingresar código..."
                    className={`font-mono pr-10 h-10 ${
                      barcodeError ? "border-destructive focus-visible:ring-destructive" : ""
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
                    disabled={isLoadingLookup || isValidatingBarcode || !newProduct.BarCode}
                    title="Buscar información del producto"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {isLoadingLookup || isValidatingBarcode ? (
                      <Loader className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {barcodeError && <p className="text-xs text-destructive font-medium">{barcodeError}</p>}
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label>Nombre del Producto</Label>
                <Input
                  ref={newProductNameRef}
                  value={newProduct.name}
                  onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ej: Vino Casillero del Diablo 750ml"
                  className="h-10"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label>Categoría</Label>
                <CategoryCombobox
                  value={newProduct.category}
                  onChange={(val) => setNewProduct((p) => ({ ...p, category: val }))}
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN: Comercial / Precios */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <DollarSign className="w-4 h-4" />
              Precios y Margen
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Costo ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={String(newProduct.cost)}
                  onChange={(e) => {
                    const cost = parseInt(e.target.value || "0") || 0;
                    setNewProduct((p) => {
                      const price = Math.round(cost * (1 + (p.marginPct || 0) / 100));
                      return { ...p, cost, price };
                    });
                  }}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Margen (%)</Label>
                <Input
                  type="number"
                  min={0}
                  value={String(newProduct.marginPct)}
                  onChange={(e) => {
                    const marginPct = parseInt(e.target.value || "0") || 0;
                    setNewProduct((p) => {
                      const price = Math.round((p.cost || 0) * (1 + marginPct / 100));
                      return { ...p, marginPct, price };
                    });
                  }}
                  className="h-10 border-blue-200 focus-visible:ring-blue-500/30"
                />
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-1.5">
                <Label className="text-primary font-medium">Precio Venta ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={String(newProduct.price)}
                  onChange={(e) => {
                    const price = parseInt(e.target.value || "0") || 0;
                    setNewProduct((p) => {
                      const cost = Math.round(price / (1 + (p.marginPct || 30) / 100));
                      return { ...p, price, cost };
                    });
                  }}
                  className="h-10 border-primary font-bold text-primary focus-visible:ring-primary/30"
                />
              </div>
            </div>
            
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <LineChart className="w-4 h-4 text-emerald-500" />
                <span className="text-muted-foreground">Ganancia por unidad:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  ${(newProduct.price - newProduct.cost).toLocaleString("es-CL")}
                </span>
              </div>
              <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-primary/10 pt-2 sm:pt-0 sm:pl-3">
                <span className="text-muted-foreground">Potencial Total:</span>
                <span className="font-bold">
                  ${(newProduct.stock * newProduct.price).toLocaleString("es-CL")}
                </span>
              </div>
            </div>
          </div>

          {/* SECCIÓN: Inventario y Detalles */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <Layers className="w-4 h-4" />
              Inventario y Formato
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Stock Inicial</Label>
                <Input
                  type="number"
                  min={0}
                  value={String(newProduct.stock)}
                  onChange={(e) =>
                    setNewProduct((p) => ({ ...p, stock: parseInt(e.target.value || "0") || 0 }))
                  }
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Stock Mínimo</Label>
                <Input
                  type="number"
                  min={0}
                  value={String(newProduct.minStock)}
                  onChange={(e) =>
                    setNewProduct((p) => ({ ...p, minStock: parseInt(e.target.value || "0") || 0 }))
                  }
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Und. Medida</Label>
                <Select
                  value={newProduct.measureUnit}
                  onValueChange={(val) => setNewProduct((p) => ({ ...p, measureUnit: val as any }))}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ml">Mililitros (ml)</SelectItem>
                    <SelectItem value="g">Gramos (g)</SelectItem>
                    <SelectItem value="none">Por unidad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Contenido</Label>
                <Input
                  type="number"
                  min={0}
                  disabled={newProduct.measureUnit === "none"}
                  value={String(newProduct.ml)}
                  onChange={(e) =>
                    setNewProduct((p) => ({ ...p, ml: parseInt(e.target.value || "0") || 0 }))
                  }
                  className={`h-10 ${newProduct.measureUnit === 'none' ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Proveedor (Opcional)</Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={newProduct.supplier}
                    onChange={(e) => setNewProduct((p) => ({ ...p, supplier: e.target.value }))}
                    placeholder="Ej: Distribuidora CCU"
                    className="h-10 pl-9"
                  />
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Footer sticky */}
        <div className="bg-muted/30 border-t px-6 py-4 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto h-10">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="w-full sm:w-auto h-10 gap-2 font-medium">
            {isLoading ? (
              <><Loader className="w-4 h-4 animate-spin" /> Guardando...</>
            ) : (
              <><Package className="w-4 h-4" /> Guardar Producto</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
