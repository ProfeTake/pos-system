import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../../ui/table";
import { Input } from "../../ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../ui/select";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../ui/dialog";
import {
  Search,
  Package,
  Edit,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Trash,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  PlusCircle,
  Save,
} from "lucide-react";
import { Product, EstadoProducto } from "../../../types";
import { CategoryCombobox } from "./CategoryCombobox";
import { CategoryFilterSelect } from "./CategoryFilterSelect";
import { ImportCard, type ImportDraft } from "./ImportCard";
import { AddProductDialog } from "./AddProductDialog";
import {
  FERMENTADAS,
  DESTILADAS,
  FANTASIA,
  OTROS_BASE,
  loadDynamicCategories,
  saveDynamicCategories,
} from "../../../data/categories";
import { BarcodeScanner } from "../../common/BarcodeScanner";
import { toast } from "sonner";
// Normalización eliminada: usar el código tal como se escanea
import { productService } from "../../../services/product.service";
import { productUpdateSchema, safeParse } from "../../../lib/schemas";

interface InventoryProps {
  products: Product[];
  onUpdateStock: (productId: string, newStock: number) => void;
  onAddProduct?: (product: Product) => void;
  onDeleteProduct?: (productId: string) => void;
  scannedBarcode?: string;
  scanAction?: "edit" | "add" | null;
  onScanHandled?: () => void;
  active?: boolean;
  onRefresh?: () => Promise<any> | void;
}

/**
 * Inventory Management Component.
 *
 * Provides two main modes:
 * 1. **Inventory View**: List, filter, sort, and edit existing products.
 * 2. **Import View**: Rapidly add new products using "Import Cards" (drafts).
 *
 * Handles barcode scanning integration for both looking up products and initiating quick adds.
 */
export function Inventory({
  products: incomingProducts,
  onUpdateStock,
  onAddProduct,
  onDeleteProduct,
  scannedBarcode,
  scanAction,
  onScanHandled,
  active = false,
  onRefresh,
}: InventoryProps) {
  const [products, setProducts] = useState<Product[]>(incomingProducts || []);
  useEffect(() => setProducts(incomingProducts || []), [incomingProducts]);
  const lastHandledRef = useRef<{ code: string; ts: number } | null>(null);

  // STRATEGIC COMMENT: View Modes
  // We separate "Inventory" (management) from "Import" (creation) to optimize the UI for specific tasks.
  // The "Import" mode uses a card-based interface ("ImportDrafts") to allow batch creation of products,
  // which is faster than opening a modal for each item when receiving new stock.
  const [viewMode, setViewMode] = useState<"inventory" | "import">("inventory");

  // Drafts de importación rápida
  const emptyDraft = (barcode = ""): ImportDraft => ({
    localId: crypto.randomUUID(),
    name: "",
    category: "",
    stock: 0,
    minStock: 0,
    price: 0,
    cost: 0,
    marginPct: 30,
    BarCode: barcode,
    ml: 0,
    measureUnit: "ml",
    estado: "NORMAL",
    supplier: "",
    loading: false,
    error: null,
    fetchedFromWeb: false,
  });
  const [importDrafts, setImportDrafts] = useState<ImportDraft[]>([]);
  const maxImportCards = 10;

  // Buscar info externa (Google / backend). Se espera un endpoint en backend.
  const googleSearchProductInfo = async (barcode: string) => {
    if (!barcode) return null;
    try {
      const data = await productService.searchExternal(barcode);
      return data;
    } catch (e) {
      return null;
    }
  };

  const addImportCard = async (barcode = "") => {
    if (importDrafts.length >= maxImportCards) {
      toast.error("Máximo de 10 tarjetas de importación alcanzado");
      return;
    }
    
    // Usar código tal cual (sin normalizar)
    const code = (barcode || "").trim();

    // Crear draft y guardar el localId
    const draft = emptyDraft(code);
    const draftLocalId = draft.localId;
    
    // Marcamos loading true inicialmente si hay código, para que la tarjeta espere
    draft.loading = !!code;
    
    // Agregar la tarjeta al estado inmediatamente (Acción Optimista)
    // La insertamos al inicio para que siempre aparezca primero
    setImportDrafts((prev) => [draft, ...prev]);
    
    // Si hay código, iniciar la búsqueda externa en segundo plano
    if (code) {
      // Usamos una función autoejecutable o promesa suelta para no bloquear
      googleSearchProductInfo(code)
        .then((info) => {
          setImportDrafts((prev) =>
            prev.map((d) => {
              if (d.localId !== draftLocalId) return d;
              if (!info) {
                // Si no hay info externa, liberamos loading para que la tarjeta intente OpenFoodFacts
                return { ...d, loading: false, error: null };
              }
              return {
                ...d,
                loading: false, // Ya tenemos datos, la tarjeta renderizará sin buscar más
                fetchedFromWeb: true,
                name: info.name || d.name,
                category: info.category || d.category,
                ml: info.ml ?? d.ml,
                measureUnit: (info.measureUnit as any) || d.measureUnit,
                price: info.price ?? d.price,
                cost: info.cost ?? d.cost,
              };
            })
          );
        })
        .catch(() => {
          // Si falla, liberamos loading
          setImportDrafts((prev) =>
            prev.map((d) =>
              d.localId === draftLocalId
                ? { ...d, loading: false, error: null }
                : d
            )
          );
        });
    }
  };

  const duplicateImportCard = (localId: string) => {
    setImportDrafts((prev) => {
      if (prev.length >= maxImportCards) {
        toast.error("Límite de 10 tarjetas");
        return prev;
      }
      const original = prev.find((d) => d.localId === localId);
      if (!original) return prev;
      const copy: ImportDraft = {
        ...original,
        localId: crypto.randomUUID(),
        BarCode: "", // limpiar para evitar duplicidad
        fetchedFromWeb: false,
        loading: false,
        error: null,
      };
      return [...prev, copy];
    });
  };

  const removeImportCard = (localId: string) => {
    setImportDrafts((prev) => prev.filter((d) => d.localId !== localId));
  };

  const updateDraftField = (localId: string, patch: Partial<ImportDraft>) => {
    setImportDrafts((prev) =>
      prev.map((d) => (d.localId === localId ? { ...d, ...patch } : d))
    );
  };

  const saveDraftToBackend = async (draft: ImportDraft) => {
    if (!draft.name || !draft.category) {
      toast.error("Nombre y categoría son obligatorios");
      return false;
    }
    const payload = {
      name: draft.name,
      category: draft.category,
      stock: draft.stock,
      minStock: draft.minStock,
      price: draft.price,
      cost: draft.cost,
      marginPct: draft.marginPct,
      BarCode: draft.BarCode.trim() || null,
      ml: draft.ml,
      measureUnit: draft.measureUnit,
      supplier: draft.supplier?.trim() || null,
    } as any;
    try {
      const created = await productService.create(payload);
      setProducts((prev) => [...prev, created]);
      onAddProduct?.(created);
      toast.success("Producto importado");
      removeImportCard(draft.localId);
      return true;
    } catch (e) {
      toast.error("Error al guardar");
      return false;
    } finally {
      onRefresh?.();
    }
  };

  const saveAllDrafts = async () => {
    for (const d of [...importDrafts]) {
      // Guardar secuencialmente para simplicidad
      // eslint-disable-next-line no-await-in-loop
      await saveDraftToBackend(d);
    }
  };

  // Escaneo en modo IMPORTACIÓN RÁPIDA - crea tarjeta síncronamente
  useEffect(() => {
    if (!active || viewMode !== "import") return;
    
    const raw = (scannedBarcode || "").trim();
    // Quitamos la dependencia estricta de scanAction para ser más tolerantes
    // Si llega un código de barras y estamos en importación, intentamos procesarlo
    if (!raw) return;
    
    const code = raw; // sin normalización
    // Guardar/evitar doble manejo en ventana corta
    const now = Date.now();
    if (lastHandledRef.current && lastHandledRef.current.code === code && now - lastHandledRef.current.ts < 600) {
      onScanHandled?.();
      return;
    }
    lastHandledRef.current = { code, ts: now };
    
    if (!code) {
      onScanHandled?.();
      return;
    }

    // Doble chequeo de duplicados en drafts
    // Comparación directa de códigos tal cual
    const alreadyInDrafts = importDrafts.some((d) => {
      const draftCode = (d.BarCode || "").trim();
      return draftCode && draftCode === code;
    });
    if (alreadyInDrafts) {
      toast.warning("El producto ya está en la lista de importación");
      onScanHandled?.();
      return;
    }

    // Chequeo contra backend para evitar duplicados si la lista local no está sincronizada
    (async () => {
      try {
        const found = await productService.getByBarcode(code);
        if (found && !(found as any).notFound && found.id && found.name) {
          toast.info(`El producto "${found.name}" ya existe en inventario`);
        } else {
          addImportCard(code);
          toast.success("Tarjeta creada");
        }
      } catch (err: any) {
        // 404 o error de red: crear tarjeta igualmente
        addImportCard(code);
        toast.success("Tarjeta creada");
      } finally {
        onScanHandled?.();
      }
    })();
  }, [active, scannedBarcode, viewMode]); // Removido scanAction de dependencias críticas

  // Eliminado: captura local por teclado en importación rápida
  // Ahora el escaneo se centraliza en PosApp y llega vía props scannedBarcode.

  // Escaneo en modo INVENTARIO - abre modal
  useEffect(() => {
    if (!active) return;
    if (viewMode !== "inventory") return;
    const raw = (scannedBarcode || "").trim();
    if (!raw || !scanAction) return;
    
    (async () => {
      const code = raw; // sin normalización
      // Guardar/evitar doble manejo en ventana corta
      const now = Date.now();
      if (lastHandledRef.current && lastHandledRef.current.code === code && now - lastHandledRef.current.ts < 600) {
        onScanHandled?.();
        return;
      }
      lastHandledRef.current = { code, ts: now };
      if (!code) {
        onScanHandled?.();
        return;
      }
      
      const found = await lookupProductByBarcode(code);
      if (found) {
        toast.info(`Producto encontrado: "${found.name}"`);
        setSearchTerm(code);
      } else {
        setShowAddProduct(true);
        setNewProduct({ BarCode: code });
        toast.success("Completa los datos del nuevo producto");
      }
      onScanHandled?.();
    })();
  }, [active, scannedBarcode, scanAction, viewMode]);

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStockFilter("all");
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  // Dinámicas
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);
  useEffect(() => {
    const load = () => setDynamicCategories(loadDynamicCategories());
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);
  const baseCategorySet = useMemo(
    () =>
      new Set<string>([
        ...FERMENTADAS,
        ...DESTILADAS,
        ...FANTASIA,
        ...OTROS_BASE,
      ]),
    []
  );
  useEffect(() => {
    if (!products?.length) return;
    const discovered = Array.from(
      new Set(
        products
          .map((p) => p.category?.trim())
          .filter((cat): cat is string => !!cat && !baseCategorySet.has(cat))
      )
    ).sort((a, b) => a.localeCompare(b, "es"));
    if (discovered.length === 0) return;
    setDynamicCategories((prev) => {
      const merged = Array.from(new Set([...prev, ...discovered])).sort(
        (a, b) => a.localeCompare(b, "es")
      );
      const unchanged =
        merged.length === prev.length &&
        merged.every((cat, idx) => cat === prev[idx]);
      if (unchanged) return prev;
      saveDynamicCategories(merged);
      return merged;
    });
  }, [products, baseCategorySet]);

  // Sort
  const [sortKey, setSortKey] = useState<
    | "name"
    | "category"
    | "stock"
    | "minStock"
    | "estado"
    | "price"
    | "total"
    | "priority"
  >("priority");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const toggleSort = (key: typeof sortKey) => {
    setSortDir((prev) =>
      sortKey === key ? (prev === "asc" ? "desc" : "asc") : "asc"
    );
    setSortKey(key);
  };
  const SortIcon = ({ keyName }: { keyName: typeof sortKey }) => {
    if (sortKey !== keyName)
      return <ArrowUpDown className="ml-2 size-4 text-muted-foreground" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-2 size-4" />
    ) : (
      <ArrowDown className="ml-2 size-4" />
    );
  };

  // Dialogos
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Product> | null>(null);
  const [confirmDeleteProduct, setConfirmDeleteProduct] =
    useState<Product | null>(null);
  const editNameRef = useRef<HTMLInputElement>(null);

  // Scanner
  const [showScanner, setShowScanner] = useState(false);

  const lookupProductByBarcode = async (
    raw: string
  ): Promise<Product | null> => {
    const code = (raw || "").trim();
    if (!code) return null;
    try {
      const product = await productService.getByBarcode(code);
      // Filtrar respuestas con notFound=true (cuando apiFetchJSON recibe 404)
      if (!product || (product as any).notFound) return null;
      // Validar que tenga al menos id y name
      if (!product.id || !product.name) return null;
      return product;
    } catch (e: any) {
      if (e?.status === 404) return null;
      console.error("Error al consultar producto:", e);
      return null;
    }
  };

  // Calcular el rango de estado basado en stock real (no en el campo estado)
  const getProductStatusRank = (p: Product) => {
    if (p.estado === "DESHABILITADO") return 4; // Último
    if (p.stock <= 0) return 0; // Agotado - primero
    if (p.stock <= p.minStock) return 1; // Bajo - segundo
    return 2; // Normal
  };

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = products.filter((p) => {
      const matchesSearch =
        term === "" ||
        p.name.toLowerCase().includes(term) ||
        (p.barCode || "").toLowerCase().includes(term);
      const matchesCategory =
        categoryFilter === "all" || p.category === categoryFilter;
      
      // Calcular el estado real basado en stock y minStock (igual que la UI)
      const isDisabled = p.estado === "DESHABILITADO";
      const isOutOfStock = !isDisabled && p.stock <= 0;
      const isLowStock = !isDisabled && !isOutOfStock && p.stock <= p.minStock;
      const isNormalStock = !isDisabled && !isOutOfStock && !isLowStock;
      
      const matchesState =
        stockFilter === "all" ||
        (stockFilter === "low" && isLowStock) ||
        (stockFilter === "normal" && isNormalStock) ||
        (stockFilter === "out" && isOutOfStock) ||
        (stockFilter === "disabled" && isDisabled);
      return matchesSearch && matchesCategory && matchesState;
    });
    return filtered;
  }, [products, searchTerm, categoryFilter, stockFilter]);

  const sortedProducts = useMemo(() => {
    const factor = sortDir === "asc" ? 1 : -1;
    return [...filteredProducts].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "priority":
          cmp = getProductStatusRank(a) - getProductStatusRank(b);
          if (cmp === 0) cmp = (a.name || "").localeCompare(b.name || "", "es");
          break;
        case "name":
          cmp = (a.name || "").localeCompare(b.name || "", "es");
          break;
        case "category":
          cmp = (a.category || "").localeCompare(b.category || "", "es");
          break;
        case "stock":
          cmp = a.stock - b.stock;
          break;
        case "minStock":
          cmp = a.minStock - b.minStock;
          break;
        case "estado":
          cmp = getProductStatusRank(a) - getProductStatusRank(b);
          break;
        case "price":
          cmp = a.price - b.price;
          break;
        case "total":
          cmp = a.stock * a.price - b.stock * b.price;
          break;
      }
      return cmp * factor;
    });
  }, [filteredProducts, sortKey, sortDir]);

  // Límite de filas a mostrar (paginación simple)
  const [pageSize, setPageSize] = useState<number | "all">(25);
  const displayProducts = useMemo(() => {
    return pageSize === "all"
      ? sortedProducts
      : sortedProducts.slice(0, pageSize);
  }, [sortedProducts, pageSize]);

  // Añadir producto - estado mínimo para pasar código de barra
  const [newProduct, setNewProduct] = useState({ BarCode: "" });

  const getStockStatus = (product: Product) => {
    switch (product.estado) {
      case "AGOTADO":
        return { label: "Agotado", variant: "destructive" as const };
      case "BAJO":
        return { label: "Bajo", variant: "destructive" as const };
      case "NORMAL":
        return { label: "Normal", variant: "secondary" as const };
      case "DESHABILITADO":
        return { label: "Deshabilitado", variant: "secondary" as const };
      default:
        return { label: "Normal", variant: "secondary" as const };
    }
  };
  const deriveEstado = (stock: number, minStock: number): EstadoProducto =>
    stock <= 0 ? "AGOTADO" : stock <= minStock ? "BAJO" : "NORMAL";
  const handleEditProduct = (product: Product) => {
    if (product.estado === "DESHABILITADO") return;
    setEditingProduct(product);
    setEditDraft({ ...product });
  };
  const handleUpdateProduct = async () => {
    if (!editingProduct || !editDraft) return;
    if (!editDraft.name || !editDraft.category) {
      toast.error("Completa los campos requeridos");
      return;
    }
    const targetId = editingProduct.id;
    const previous = editingProduct;
    let nextEstado = previous.estado;
    if (previous.estado !== "DESHABILITADO") {
      const ns = editDraft.stock != null ? editDraft.stock : previous.stock;
      const nmin =
        editDraft.minStock != null ? editDraft.minStock : previous.minStock;
      nextEstado =
        ns != null && nmin != null
          ? ns <= 0
            ? "AGOTADO"
            : ns <= nmin
            ? "BAJO"
            : "NORMAL"
          : previous.estado;
    }
    const updatedDraft: Product = {
      ...previous,
      ...(editDraft as Product),
      estado: nextEstado,
    };
    const validation = safeParse(productUpdateSchema, {
      name: updatedDraft.name,
      category: updatedDraft.category,
      stock: updatedDraft.stock,
      minStock: updatedDraft.minStock,
      price: updatedDraft.price,
      cost: updatedDraft.cost,
      marginPct: updatedDraft.marginPct,
      barCode: updatedDraft.barCode,
      ml: updatedDraft.ml,
      measureUnit: updatedDraft.measureUnit,
      estado: updatedDraft.estado,
    });
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }
    const updated = updatedDraft;
    setProducts((prev) => prev.map((p) => (p.id === targetId ? updated : p)));
    try {
      await productService.update(targetId, updated);
      toast.success("Producto actualizado");
      setEditingProduct(null);
      setEditDraft(null);
      await onRefresh?.();
    } catch (err: any) {
      setProducts((prev) =>
        prev.map((p) => (p.id === targetId ? previous : p))
      );
      console.error("Error al actualizar producto:", err);
      toast.error(err?.message || "Error al actualizar producto");
    }
  };

  const performDeleteProduct = async (prod: Product) => {
    const backup = products;
    setProducts((prev) => prev.filter((p) => p.id !== prod.id));
    onDeleteProduct?.(String(prod.id));
    try {
      await productService.delete(prod.id);
      toast.success("Producto eliminado");
    } catch (err) {
      setProducts(backup);
      toast.error("Error al eliminar");
    } finally {
      setConfirmDeleteProduct(null);
      onRefresh?.();
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1>Sistema de Bodegaje</h1>
          <p className="text-muted-foreground">
            Gestiona el inventario y niveles de stock
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={viewMode === "inventory" ? "default" : "outline"}
            onClick={() => setViewMode("inventory")}
          >
            Inventario
          </Button>
          <Button
            variant={viewMode === "import" ? "default" : "outline"}
            onClick={() => setViewMode("import")}
          >
            Importación rápida
          </Button>
          {viewMode === "inventory" && (
            <>
              <Button variant="outline" onClick={() => setShowAddProduct(true)}>
                Agregar producto
              </Button>
            </>
          )}
          {viewMode === "import" && (
            <>
              <Button
                variant="outline"
                disabled={importDrafts.length >= maxImportCards}
                onClick={() => addImportCard()}
              >
                <PlusCircle className="size-4 mr-1" /> Nueva tarjeta
              </Button>

              {importDrafts.length > 0 && (
                <Button variant="default" onClick={saveAllDrafts}>
                  <Save className="size-4 mr-1" /> Guardar todas
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sección Importación Rápida */}
      {viewMode === "import" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="size-4" /> Importación rápida de productos
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  {importDrafts.length}/{maxImportCards} tarjetas
                </Badge>
                {importDrafts.length > 0 && (
                  <>
                    <Badge
                      variant={
                        importDrafts.filter((d) => d.BarCode.trim().length >= 8)
                          .length >= 10
                          ? "default"
                          : "secondary"
                      }
                      className="text-sm"
                      title={`Códigos con 8+ dígitos: ${
                        importDrafts.filter((d) => d.BarCode.trim().length >= 8)
                          .length
                      }`}
                    >
                      {
                        importDrafts.filter((d) => d.BarCode.trim().length >= 8)
                          .length
                      }{" "}
                      códigos válidos
                    </Badge>
                    {importDrafts.filter(
                      (d) =>
                        d.BarCode.trim().length < 8 &&
                        d.BarCode.trim().length > 0
                    ).length > 0 && (
                      <Badge variant="destructive" className="text-sm">
                        {
                          importDrafts.filter(
                            (d) =>
                              d.BarCode.trim().length < 8 &&
                              d.BarCode.trim().length > 0
                          ).length
                        }{" "}
                        códigos cortos
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              Escanea un código o crea tarjetas manualmente. Máximo 10 tarjetas
              simultáneas. Cada tarjeta puede duplicarse para acelerar la carga
              de productos similares.
            </p>
            {/* Grid responsiva: máximo 3 tarjetas por fila */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {importDrafts.map((d) => {
                const isDuplicate =
                  d.BarCode &&
                  d.BarCode.trim() !== "" &&
                  importDrafts.filter(
                    (x) => x.BarCode.trim() === d.BarCode.trim()
                  ).length > 1;

                return (
                  <ImportCard
                    key={d.localId}
                    draft={d}
                    onUpdate={updateDraftField}
                    onDuplicate={duplicateImportCard}
                    onRemove={removeImportCard}
                    onSave={saveDraftToBackend}
                    canDuplicate={importDrafts.length < maxImportCards}
                    isDuplicate={!!isDuplicate}
                  />
                );
              })}
              {importDrafts.length === 0 && (
                <div className="border rounded-md p-4 text-sm text-muted-foreground">
                  No hay tarjetas. Usa "Nueva tarjeta" para agregar productos.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === "inventory" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Package className="size-4" /> Filtros de Inventario
              {(searchTerm.trim() !== "" ||
                categoryFilter !== "all" ||
                stockFilter !== "all") && (
                <Badge variant="default" className="ml-2">
                  Filtros activos
                </Badge>
              )}
            </CardTitle>
            {(searchTerm.trim() !== "" ||
              categoryFilter !== "all" ||
              stockFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                title="Limpiar filtros"
                onClick={clearFilters}
              >
                Limpiar filtros
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label>Buscar Producto</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Nombre o código de barra..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      aria-label="Limpiar búsqueda"
                      onClick={() => {
                        setSearchTerm("");
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <CategoryFilterSelect
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  placeholder="Todas las categorías"
                  label="Categoría"
                  dynamicCategories={dynamicCategories}
                />
              </div>
              <div className="space-y-2">
                <label>Estado</label>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="low">Stock bajo</SelectItem>
                    <SelectItem value="normal">Stock normal</SelectItem>
                    <SelectItem value="out">Agotado</SelectItem>
                    <SelectItem value="disabled">Deshabilitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen de filtros activos */}
      {viewMode === "inventory" && (searchTerm.trim() !== "" || categoryFilter !== "all" || stockFilter !== "all") && (
        <div className="flex flex-wrap gap-2 items-center text-sm bg-slate-900 p-3 rounded-lg border border-slate-800">
          <span className="text-muted-foreground font-medium">Filtros activos:</span>
          {searchTerm.trim() !== "" && (
            <Badge variant="secondary">
              Búsqueda: "{searchTerm}"
            </Badge>
          )}
          {categoryFilter !== "all" && (
            <Badge variant="secondary">
              Categoría: {categoryFilter}
            </Badge>
          )}
          {stockFilter !== "all" && (
            <Badge variant="secondary">
              Estado: {stockFilter === "low" ? "Stock bajo" : stockFilter === "normal" ? "Stock normal" : stockFilter === "out" ? "Agotado" : "Deshabilitado"}
            </Badge>
          )}
        </div>
      )}

      {viewMode === "inventory" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>
              Inventario ({filteredProducts.length} productos)
            </CardTitle>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground hidden sm:block">
                Mostrar
              </label>
              <Select
                value={String(pageSize)}
                onValueChange={(v) =>
                  setPageSize(
                    v === "all" ? "all" : parseInt(v || "0", 10) || 10
                  )
                }
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Cantidad de productos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 productos</SelectItem>
                  <SelectItem value="25">25 productos</SelectItem>
                  <SelectItem value="50">50 productos</SelectItem>
                  <SelectItem value="100">100 productos</SelectItem>
                  <SelectItem value="all">Todos los productos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="select-none"
                    aria-sort={
                      sortKey === "name"
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : ("none" as any)
                    }
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 -ml-3 px-2"
                      onClick={() => toggleSort("name")}
                    >
                      Producto <SortIcon keyName="name" />
                    </Button>
                  </TableHead>
                  <TableHead
                    className="select-none"
                    aria-sort={
                      sortKey === "category"
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : ("none" as any)
                    }
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 -ml-3 px-2"
                      onClick={() => toggleSort("category")}
                    >
                      Categoría <SortIcon keyName="category" />
                    </Button>
                  </TableHead>
                  <TableHead
                    className="text-center select-none"
                    aria-sort={
                      sortKey === "stock"
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : ("none" as any)
                    }
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 -ml-3 px-2"
                      onClick={() => toggleSort("stock")}
                    >
                      Stock Actual <SortIcon keyName="stock" />
                    </Button>
                  </TableHead>
                  <TableHead
                    className="text-center select-none"
                    aria-sort={
                      sortKey === "minStock"
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : ("none" as any)
                    }
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 -ml-3 px-2"
                      onClick={() => toggleSort("minStock")}
                    >
                      Stock Mínimo <SortIcon keyName="minStock" />
                    </Button>
                  </TableHead>
                  <TableHead
                    className="text-center select-none"
                    aria-sort={
                      sortKey === "estado"
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : ("none" as any)
                    }
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 -ml-3 px-2"
                      onClick={() => toggleSort("estado")}
                    >
                      Estado <SortIcon keyName="estado" />
                    </Button>
                  </TableHead>
                  <TableHead
                    className="text-right select-none"
                    aria-sort={
                      sortKey === "price"
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : ("none" as any)
                    }
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 -ml-3 px-2"
                      onClick={() => toggleSort("price")}
                    >
                      Precio <SortIcon keyName="price" />
                    </Button>
                  </TableHead>
                  <TableHead
                    className="text-right select-none"
                    aria-sort={
                      sortKey === "total"
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : ("none" as any)
                    }
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 -ml-3 px-2"
                      onClick={() => toggleSort("total")}
                    >
                      Valor Total <SortIcon keyName="total" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayProducts.map((product) => {
                  const status = getStockStatus(product);
                  const totalValue = product.stock * product.price;
                  return (
                    <TableRow
                      key={product.id}
                      className={`${
                        product.estado === "BAJO" ||
                        product.estado === "AGOTADO"
                          ? "bg-destructive/5"
                          : ""
                      } ${
                        product.estado === "DESHABILITADO" ? "opacity-50" : ""
                      }`}
                    >
                      <TableCell>
                        <div>
                          <div
                            className={`font-medium ${
                              product.estado === "DESHABILITADO"
                                ? "line-through"
                                : ""
                            }`}
                          >
                            {product.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {product.ml}
                            {product.measureUnit &&
                            product.measureUnit !== "none"
                              ? product.measureUnit
                              : "ml"}
                            {product.barCode && ` • Código: ${product.barCode}`}
                            {product.alcoholContent &&
                              ` • ${product.alcoholContent}% vol.`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {product.stock}
                      </TableCell>
                      <TableCell className="text-center">
                        {product.minStock}
                      </TableCell>
                      <TableCell className="text-center">
                        {product.estado === "DESHABILITADO" ? (
                          <Badge variant="secondary">Deshabilitado</Badge>
                        ) : product.stock <= product.minStock ? (
                          <Badge variant="destructive">
                            <AlertTriangle className="size-3 mr-1" />
                            Stock Bajo
                          </Badge>
                        ) : (
                          <Badge variant={status.variant}>{status.label}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        ${product.price.toLocaleString("es-CL")}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${totalValue.toLocaleString("es-CL")}
                      </TableCell>
                      <TableCell className="text-center flex gap-2 justify-center whitespace-nowrap">
                        {product.estado !== "DESHABILITADO" && (
                          <Button
                            variant="outline"
                            size="sm"
                            title="Editar"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit className="size-4" />
                          </Button>
                        )}
                        <Button
                          variant={
                            product.estado === "DESHABILITADO"
                              ? "secondary"
                              : "outline"
                          }
                          size="sm"
                          title={
                            product.estado === "DESHABILITADO"
                              ? "Habilitar"
                              : "Deshabilitar"
                          }
                          onClick={async () => {
                            const targetId = product.id;
                            const previous = product;
                            const nuevoEstado: EstadoProducto =
                              product.estado === "DESHABILITADO"
                                ? deriveEstado(product.stock, product.minStock)
                                : "DESHABILITADO";
                            const updated: Product = {
                              ...product,
                              estado: nuevoEstado,
                            };
                            setProducts((prev) =>
                              prev.map((p) => (p.id === targetId ? updated : p))
                            );
                            try {
                              await productService.updateStatus(
                                targetId,
                                nuevoEstado
                              );
                            } catch (err) {
                              setProducts((prev) =>
                                prev.map((p) =>
                                  p.id === targetId ? previous : p
                                )
                              );
                              toast.error("No se pudo actualizar el estado");
                            } finally {
                              onRefresh?.();
                            }
                          }}
                        >
                          {product.estado === "DESHABILITADO" ? (
                            <CheckCircle2 className="size-4" />
                          ) : (
                            <Ban className="size-4" />
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          title="Eliminar"
                          onClick={() => setConfirmDeleteProduct(product)}
                        >
                          <Trash className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialogo agregar */}
      <AddProductDialog
        open={showAddProduct}
        onOpenChange={setShowAddProduct}
        initialBarcode={newProduct.BarCode}
        onProductAdded={(product) => {
          setProducts((prev) => [...prev, product]);
          onAddProduct?.(product);
        }}
        onRefresh={onRefresh}
      />

      {/* Dialogo editar */}
      <Dialog
        open={!!editingProduct}
        onOpenChange={() => {
          setEditingProduct(null);
          setEditDraft(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
            <DialogDescription>
              Ajusta los datos del producto.
            </DialogDescription>
          </DialogHeader>
          {editingProduct && editDraft && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label>Nombre</label>
                  <Input
                    ref={editNameRef}
                    value={editDraft.name as string}
                    onChange={(e) =>
                      setEditDraft((d) => ({ ...d!, name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label>Categoría</label>
                  <CategoryCombobox
                    value={editDraft.category as string}
                    onChange={(val) =>
                      setEditDraft((d) => ({ ...d!, category: val }))
                    }
                  />
                </div>
                <div>
                  <label>Stock</label>
                  <Input
                    type="number"
                    min={0}
                    value={
                      editDraft.stock !== undefined
                        ? String(editDraft.stock)
                        : ""
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      setEditDraft((d) => ({
                        ...(d as any),
                        stock: raw === "" ? undefined : parseInt(raw) || 0,
                      }));
                    }}
                  />
                </div>
                <div>
                  <label>Stock mínimo</label>
                  <Input
                    type="number"
                    min={0}
                    value={
                      editDraft.minStock !== undefined
                        ? String(editDraft.minStock)
                        : ""
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      setEditDraft((d) => ({
                        ...(d as any),
                        minStock: raw === "" ? undefined : parseInt(raw) || 0,
                      }));
                    }}
                  />
                </div>
                <div>
                  <label>Costo</label>
                  <Input
                    type="number"
                    min={0}
                    value={
                      editDraft.cost !== undefined ? String(editDraft.cost) : ""
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      const costNum =
                        raw === "" ? 0 : parseInt(raw || "0") || 0;
                      setEditDraft((d) => {
                        const margin = Number((d as any)?.marginPct ?? 0);
                        const price = Math.round(costNum * (1 + margin / 100));
                        return {
                          ...(d as any),
                          cost: raw === "" ? undefined : costNum,
                          price,
                        } as any;
                      });
                    }}
                  />
                </div>
                <div>
                  <label>Margen (%)</label>
                  <Input
                    type="number"
                    min={0}
                    value={
                      editDraft.marginPct !== undefined
                        ? String(editDraft.marginPct)
                        : ""
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      const margin = raw === "" ? 0 : parseInt(raw || "0") || 0;
                      setEditDraft((d) => {
                        const cost = Number((d as any)?.cost ?? 0);
                        const price = Math.round(cost * (1 + margin / 100));
                        return {
                          ...(d as any),
                          marginPct: raw === "" ? undefined : margin,
                          price,
                        } as any;
                      });
                    }}
                  />
                </div>
                <div>
                  <label>Precio</label>
                  <Input
                    type="number"
                    min={0}
                    value={
                      editDraft.price !== undefined
                        ? String(editDraft.price)
                        : ""
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      setEditDraft((d) => ({
                        ...(d as any),
                        price:
                          raw === "" ? undefined : parseInt(raw || "0") || 0,
                      }));
                    }}
                  />
                </div>
                <div>
                  <label>Código Barra</label>
                  <Input
                    value={editDraft.barCode as string}
                    disabled
                    onChange={() => {}}
                  />
                </div>
                <div>
                  <label>Unidad</label>
                  <Select
                    value={
                      editDraft.measureUnit ||
                      editingProduct.measureUnit ||
                      "ml"
                    }
                    onValueChange={(val) =>
                      setEditDraft((d) => ({ ...d!, measureUnit: val as any }))
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
                <div>
                  <label>Cantidad</label>
                  <Input
                    type="number"
                    min={0}
                    disabled={
                      (editDraft.measureUnit || editingProduct.measureUnit) ===
                      "none"
                    }
                    value={
                      editDraft.ml !== undefined ? String(editDraft.ml) : ""
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      setEditDraft((d) => ({
                        ...(d as any),
                        ml: raw === "" ? undefined : parseInt(raw || "0") || 0,
                      }));
                    }}
                  />
                </div>
                <div>
                  <label>Proveedor</label>
                  <Input
                    value={(editDraft.supplier as string) || ""}
                    onChange={(e) =>
                      setEditDraft((d) => ({ ...d!, supplier: e.target.value }))
                    }
                    placeholder="Nombre del proveedor"
                  />
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  Valor total:{" "}
                  <b>
                    $
                    {(
                      (editDraft.stock ?? 0) * (editDraft.price ?? 0)
                    ).toLocaleString("es-CL")}
                  </b>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingProduct(null);
                setEditDraft(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdateProduct}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación */}
      <Dialog
        open={!!confirmDeleteProduct}
        onOpenChange={() => setConfirmDeleteProduct(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar producto</DialogTitle>
            <DialogDescription>
              Esta acción eliminará el producto del inventario.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm">
            ¿Confirma eliminar <b>{confirmDeleteProduct?.name}</b>?
          </p>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteProduct(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                confirmDeleteProduct &&
                performDeleteProduct(confirmDeleteProduct)
              }
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        products={products}
        onAddToCart={() => {}}
        isVisible={showScanner}
        onClose={() => setShowScanner(false)}
        context="inventory"
        onBarcodeForInventory={async (barcode) => {
          const code = (barcode || "").trim();
          const found = await lookupProductByBarcode(code);
          if (viewMode === "import") {
            if (found) {
              toast.error("El producto ya existe");
            } else {
              await addImportCard(code);
              toast.success("Tarjeta creada");
            }
          } else {
            if (found) {
              toast.error(`El producto "${found.name}" ya está registrado`);
            } else {
              setShowAddProduct(true);
              setNewProduct((p) => ({ ...p, BarCode: code }));
            }
          }
          setShowScanner(false);
        }}
      />
    </div>
  );
}
