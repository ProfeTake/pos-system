// @ts-nocheck
import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../../ui/table";
import {
  AlertCircle,
  Download,
  Loader,
  X,
  CheckCircle2,
  Upload,
  Package,
  Zap,
  DollarSign,
  BarChart3,
  Copy,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { CategoryCombobox } from "../inventory/CategoryCombobox";
import type { Product } from "../../../types";
import { apiFetchJSON } from "../../../lib/api";
import { productLookupService } from "../../../services/productLookup.service";

interface BulkProductImporterTabProps {
  products: Product[];
  onProductsImported?: () => void;
}

interface ProductRow {
  barcode: string;
  name: string;
  quantity: string;
  unit: string;
  category: string;
  price: number;
  cost: number;
  marginPct: number;
  stock: number;
  minStock: number;
  status: "pending" | "loading" | "success" | "error";
  error?: string;
  apiData?: any;
}

export default function BulkProductImporterTab({
  products: incomingProducts,
  onProductsImported,
}: BulkProductImporterTabProps) {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");

  const fetchProductData = async (barcode: string): Promise<any> => {
    return productLookupService.fetchProductData(barcode);
  };

  const handleAddBarcode = async () => {
    const code = barcodeInput.trim();
    if (!code) {
      toast.error("Ingresa un código de barras");
      return;
    }

    // Verificar límite de 10 productos
    if (rows.length >= 10) {
      toast.error(
        "Máximo 10 productos por importación. Importa estos primero."
      );
      return;
    }

    const newRow: ProductRow = {
      barcode: code, // Código exacto sin transformar
      name: "",
      quantity: "",
      unit: "ml",
      category: "",
      price: 0,
      cost: 0,
      marginPct: 30,
      stock: 0,
      minStock: 0,
      status: "loading",
    };

    setRows((prev) => [...prev, newRow]);
    setBarcodeInput("");
    barcodeInputRef.current?.focus();

    try {
      const data = await fetchProductData(code);
      setRows((prev) =>
        prev.map((r) =>
          r.barcode === code
            ? {
                ...r,
                name: data.name,
                quantity: data.quantity,
                category: data.category,
                price: data.suggestedPrice || 5000,
                status: "success",
                apiData: data.apiData,
              }
            : r
        )
      );
      toast.success("Producto encontrado y precargado");
    } catch (error) {
      setRows((prev) =>
        prev.map((r) =>
          r.barcode === code
            ? {
                ...r,
                status: "error",
                error:
                  error instanceof Error ? error.message : "Error desconocido",
              }
            : r
        )
      );
      toast.error(
        `Error: ${error instanceof Error ? error.message : "Desconocido"}`
      );
    }
  };

  const handleRemoveRow = (barcode: string) => {
    setRows((prev) => prev.filter((r) => r.barcode !== barcode));
  };

  const handleDuplicateRow = (barcode: string) => {
    const original = rows.find((r) => r.barcode === barcode);
    if (!original) return;

    // Verificar límite de 10 productos
    if (rows.length >= 10) {
      toast.error(
        "Máximo 10 productos por importación. Importa estos primero."
      );
      return;
    }

    // Crear copia con nuevo código temporal y status pending
    const duplicate: ProductRow = {
      ...original,
      barcode: `TEMP-${Date.now()}`,
      status: "pending",
      error: undefined,
      apiData: undefined,
    };

    setRows((prev) => [...prev, duplicate]);
    toast.success(
      "Producto duplicado. Edita el código de barras y otros campos."
    );
  };

  const handleUpdateRow = (
    barcode: string,
    field: keyof ProductRow,
    value: any
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.barcode === barcode ? { ...r, [field]: value } : r))
    );
  };

  const handleImport = async () => {
    const incomplete = rows.filter(
      (r) => !r.name || !r.category || r.price <= 0
    );
    if (incomplete.length > 0) {
      toast.error(
        `Completa nombre, categoría y precio en ${incomplete.length} producto${
          incomplete.length > 1 ? "s" : ""
        }`
      );
      return;
    }

    setImporting(true);
    try {
      const productsToImport = rows.map((r, idx) => ({
        id: `import-${Date.now()}-${idx}`,
        name: r.name,
        category: r.category,
        price: r.price,
        cost: r.cost || Math.round(r.price * 0.4), // Costo sugerido: 40% del precio
        stock: r.stock || 10, // Stock por defecto: 10
        minStock: r.minStock || 5, // Stock mínimo por defecto: 5
        ml: parseInt(r.quantity) || 0,
        measureUnit: (r.unit as any) || "ml",
        BarCode: r.barcode,
        estado: "NORMAL" as const,
        marginPct:
          r.cost > 0 ? Math.round(((r.price - r.cost) / r.cost) * 100) : 60,
        alcoholContent: 0,
      }));

      let data: any;
      try {
        data = await apiFetchJSON<any>("/api/products/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products: productsToImport }),
        });
      } catch (err: any) {
        if (err?.status === 409) {
          toast.error("Conflictos de código de barras detectados");
          data = err.payload || {};
        } else {
          throw err;
        }
      }
      const createdCount = data.createdCount || 0;
      const dupCount = data.duplicateCount || 0;
      if (createdCount > 0) {
        toast.success(
          `${createdCount} producto${createdCount === 1 ? "" : "s"} importado${
            createdCount === 1 ? "" : "s"
          }`
        );
      }
      if (dupCount > 0) {
        toast.warning(
          `${dupCount} código${dupCount === 1 ? "" : "s"} duplicado${
            dupCount === 1 ? "" : "s"
          } omitido${dupCount === 1 ? "" : "s"}`
        );
      }
      // Filtrar filas que fueron duplicados
      const duplicateBarcodes: string[] = data.duplicates || [];
      setRows((prev) =>
        prev.filter((r) => duplicateBarcodes.includes(r.barcode))
      );
      if (duplicateBarcodes.length === 0) setRows([]);
      onProductsImported?.();
    } catch (error) {
      toast.error("Error al importar productos");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = rows
      .map(
        (r) =>
          `${r.barcode}|${r.name}|${r.quantity}|${r.unit}|${r.category}|${r.price}|${r.cost}|${r.stock}|${r.minStock}`
      )
      .join("\n");

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(csv)
    );
    element.setAttribute("download", "productos-importacion.csv");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Estadísticas
  const stats = useMemo(() => {
    const totalProfit = rows.reduce(
      (sum, r) => sum + (r.price - r.cost) * r.stock,
      0
    );
    const totalValue = rows.reduce((sum, r) => sum + r.price * r.stock, 0);
    const totalCost = rows.reduce((sum, r) => sum + r.cost * r.stock, 0);
    return {
      total: rows.length,
      success: rows.filter((r) => r.status === "success").length,
      error: rows.filter((r) => r.status === "error").length,
      pending: rows.filter(
        (r) => r.status === "pending" || r.status === "loading"
      ).length,
      totalProfit,
      totalValue,
      totalCost,
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      {/* Header mejorado */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
            <Zap className="size-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Importación Rápida de Productos
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Escanea códigos de barras para obtener datos automáticamente
            </p>
          </div>
        </div>
      </div>

      {/* Input de código mejorado */}
      <Card className="border-2 border-blue-200 dark:border-blue-800 shadow-md">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-b">
          <div className="flex items-center gap-2">
            <Package className="size-5 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-lg font-semibold">
              Agregar Producto por Código
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Escanea con lector o ingresa manualmente
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                ref={barcodeInputRef}
                placeholder="Ejemplo: 7802105000724"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddBarcode()}
                autoFocus
                className="text-base h-12 border-2 focus:border-blue-500 dark:focus:border-blue-400 font-mono"
              />
            </div>
            <Button
              onClick={handleAddBarcode}
              disabled={!barcodeInput.trim()}
              size="lg"
              className="min-w-40 h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
            >
              <Zap className="size-5 mr-2" />
              Agregar
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <AlertCircle className="size-3" />
            <span>
              Presiona{" "}
              <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">
                Enter
              </kbd>{" "}
              para agregar rápidamente
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas mejoradas (desactivadas, ahora se muestran sobre la tabla) */}
      {false && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  Total
                </p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {stats.total}
                </p>
              </div>
              <Package className="size-8 text-blue-600 opacity-50" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-2 border-green-200 dark:border-green-800 rounded-lg p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-700 dark:text-green-300">
                  Completados
                </p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {stats.success}
                </p>
              </div>
              <CheckCircle2 className="size-8 text-green-600 opacity-50" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-2 border-red-200 dark:border-red-800 rounded-lg p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-700 dark:text-red-300">
                  Errores
                </p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {stats.error}
                </p>
              </div>
              <AlertCircle className="size-8 text-red-600 opacity-50" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-2 border-amber-200 dark:border-amber-800 rounded-lg p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  En Proceso
                </p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {stats.pending}
                </p>
              </div>
              <Loader className="size-8 text-amber-600 opacity-50" />
            </div>
          </div>
        </div>
      )}

      {/* Tabla/Tarjetas de productos */}
      {rows.length > 0 ? (
        <Card className="border-2">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-b-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <BarChart3 className="size-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Productos agregados</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Revisa y edita los datos antes de importar
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                      Total: {stats.total}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">
                      Completados: {stats.success}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">
                      Errores: {stats.error}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                      En proceso: {stats.pending}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 flex items-center gap-1">
                      <TrendingUp className="size-3" />
                      Ganancia estimada: $
                      {stats.totalProfit.toLocaleString("es-CL")}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">
                      Valor total: ${stats.totalValue.toLocaleString("es-CL")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-md p-0.5 bg-muted flex">
                  <Button
                    size="sm"
                    variant={viewMode === "cards" ? "default" : "ghost"}
                    className={viewMode === "cards" ? "h-8" : "h-8"}
                    onClick={() => setViewMode("cards")}
                    title="Ver como tarjetas"
                  >
                    Tarjetas
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "table" ? "default" : "ghost"}
                    className={viewMode === "table" ? "h-8" : "h-8"}
                    onClick={() => setViewMode("table")}
                    title="Ver como tabla"
                  >
                    Tabla
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  title="Descargar como CSV"
                  className="shadow-sm"
                >
                  <Download className="size-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {viewMode === "table" ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-2">
                      <TableHead className="w-28 font-bold">
                        <div className="flex items-center gap-1">
                          <Package className="size-3" />
                          Código
                        </div>
                      </TableHead>
                      <TableHead className="min-w-[250px] font-bold">
                        Nombre del Producto
                      </TableHead>
                      <TableHead className="w-32 font-bold">Cantidad</TableHead>
                      <TableHead className="w-28 font-bold">Unidad</TableHead>
                      <TableHead className="w-40 font-bold">
                        Categoría
                      </TableHead>
                      <TableHead className="w-28 text-right font-bold">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="size-3" />
                          Costo
                        </div>
                      </TableHead>
                      <TableHead className="w-24 text-center font-bold">
                        Margen %
                      </TableHead>
                      <TableHead className="w-32 text-right font-bold">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="size-3" />
                          Precio Venta
                        </div>
                      </TableHead>
                      <TableHead className="w-24 text-center font-bold">
                        Stock
                      </TableHead>
                      <TableHead className="w-24 text-center font-bold">
                        Stock Mín
                      </TableHead>
                      <TableHead className="w-20 text-center font-bold">
                        Estado
                      </TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => (
                      <TableRow
                        key={row.barcode}
                        className={`hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors ${
                          index % 2 === 0
                            ? "bg-white dark:bg-gray-950"
                            : "bg-gray-50/50 dark:bg-gray-900/50"
                        }`}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-foreground">
                              {row.barcode.slice(-8)}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] w-fit"
                            >
                              EAN-13
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.name}
                            onChange={(e) =>
                              handleUpdateRow(
                                row.barcode,
                                "name",
                                e.target.value
                              )
                            }
                            className="font-medium h-10 border-2 focus:border-blue-500"
                            placeholder="Ej: Pisco Alto del Carmen"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={row.quantity}
                            onChange={(e) =>
                              handleUpdateRow(
                                row.barcode,
                                "quantity",
                                e.target.value
                              )
                            }
                            className="h-10 border-2 focus:border-blue-500"
                            placeholder="750"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.unit}
                            onValueChange={(value) =>
                              handleUpdateRow(row.barcode, "unit", value)
                            }
                          >
                            <SelectTrigger className="h-10 border-2">
                              <SelectValue placeholder="Unidad" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ml">ml</SelectItem>
                              <SelectItem value="L">Litros</SelectItem>
                              <SelectItem value="cc">cc</SelectItem>
                              <SelectItem value="oz">oz</SelectItem>
                              <SelectItem value="unidad">Unidad</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <CategoryCombobox
                            value={row.category}
                            onChange={(value) =>
                              handleUpdateRow(row.barcode, "category", value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              $
                            </span>
                            <Input
                              type="number"
                              value={row.cost}
                              onChange={(e) => {
                                const cost = parseInt(e.target.value) || 0;
                                const price = Math.round(
                                  cost * (1 + row.marginPct / 100)
                                );
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.barcode === row.barcode
                                      ? { ...r, cost, price }
                                      : r
                                  )
                                );
                              }}
                              className="h-10 text-right pl-6 border-2 focus:border-orange-500"
                              placeholder="0"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <Input
                              type="number"
                              value={row.marginPct}
                              onChange={(e) => {
                                const marginPct = parseInt(e.target.value) || 0;
                                const price = Math.round(
                                  row.cost * (1 + marginPct / 100)
                                );
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.barcode === row.barcode
                                      ? { ...r, marginPct, price }
                                      : r
                                  )
                                );
                              }}
                              className="h-10 text-center border-2 focus:border-purple-500 font-medium"
                              placeholder="30"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                              %
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              $
                            </span>
                            <Input
                              type="number"
                              value={row.price}
                              onChange={(e) => {
                                const price = parseInt(e.target.value) || 0;
                                const marginPct =
                                  row.cost > 0
                                    ? Math.round(
                                        ((price - row.cost) / row.cost) * 100
                                      )
                                    : 30;
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.barcode === row.barcode
                                      ? { ...r, price, marginPct }
                                      : r
                                  )
                                );
                              }}
                              className="h-10 text-right pl-6 border-2 focus:border-green-500 font-semibold"
                              placeholder="0"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={row.stock}
                            onChange={(e) =>
                              handleUpdateRow(
                                row.barcode,
                                "stock",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="h-10 text-center border-2 focus:border-blue-500 font-medium"
                            placeholder="10"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={row.minStock}
                            onChange={(e) =>
                              handleUpdateRow(
                                row.barcode,
                                "minStock",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="h-10 text-center border-2 focus:border-amber-500"
                            placeholder="5"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {row.status === "loading" && (
                            <div className="flex justify-center">
                              <Loader className="size-5 animate-spin text-blue-500" />
                            </div>
                          )}
                          {row.status === "success" && (
                            <div className="flex justify-center">
                              <div className="p-1 bg-green-100 dark:bg-green-950 rounded-full">
                                <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
                              </div>
                            </div>
                          )}
                          {row.status === "error" && (
                            <div
                              title={row.error}
                              className="flex justify-center cursor-help"
                            >
                              <div className="p-1 bg-red-100 dark:bg-red-950 rounded-full">
                                <AlertCircle className="size-5 text-red-600 dark:text-red-400" />
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicateRow(row.barcode)}
                              className="h-10 w-10 p-0 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-950"
                              title="Duplicar producto"
                            >
                              <Copy className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveRow(row.barcode)}
                              className="h-10 w-10 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950"
                              title="Eliminar producto"
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-4 grid gap-3 grid-cols-3">
                {rows.slice(0, 12).map((row) => (
                  <Card
                    key={row.barcode}
                    className="border shadow-sm overflow-hidden"
                  >
                    <CardHeader className="py-2 px-3 bg-muted/30 flex flex-row items-center justify-between space-y-0 border-b">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] px-1.5 py-0 bg-background"
                        >
                          {row.barcode.slice(-6)}
                        </Badge>
                        {row.status === "loading" && (
                          <Loader className="size-3 animate-spin text-blue-500" />
                        )}
                        {row.status === "success" && (
                          <CheckCircle2 className="size-3 text-green-600" />
                        )}
                        {row.status === "error" && (
                          <div title={row.error}>
                            <AlertCircle className="size-3 text-red-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicateRow(row.barcode)}
                          className="h-6 w-6 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-950"
                          title="Duplicar"
                        >
                          <Copy className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveRow(row.barcode)}
                          className="h-6 w-6 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950"
                          title="Eliminar"
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 space-y-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-medium">
                          Nombre
                        </Label>
                        <Input
                          value={row.name}
                          onChange={(e) =>
                            handleUpdateRow(row.barcode, "name", e.target.value)
                          }
                          placeholder="Nombre del producto"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-medium">
                          Categoría
                        </Label>
                        <CategoryCombobox
                          value={row.category}
                          onChange={(value) =>
                            handleUpdateRow(row.barcode, "category", value)
                          }
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium">
                            Stock
                          </Label>
                          <Input
                            type="number"
                            value={row.stock}
                            onChange={(e) =>
                              handleUpdateRow(
                                row.barcode,
                                "stock",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium">
                            Mín.
                          </Label>
                          <Input
                            type="number"
                            value={row.minStock}
                            onChange={(e) =>
                              handleUpdateRow(
                                row.barcode,
                                "minStock",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium">
                            Costo
                          </Label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">
                              $
                            </span>
                            <Input
                              type="number"
                              value={row.cost}
                              onChange={(e) => {
                                const cost = parseInt(e.target.value) || 0;
                                const price = Math.round(
                                  cost * (1 + row.marginPct / 100)
                                );
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.barcode === row.barcode
                                      ? { ...r, cost, price }
                                      : r
                                  )
                                );
                              }}
                              className="h-8 pl-5 text-xs"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium">%</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={row.marginPct}
                              onChange={(e) => {
                                const marginPct = parseInt(e.target.value) || 0;
                                const price = Math.round(
                                  row.cost * (1 + marginPct / 100)
                                );
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.barcode === row.barcode
                                      ? { ...r, marginPct, price }
                                      : r
                                  )
                                );
                              }}
                              className="h-8 pr-6 text-xs text-center"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">
                              %
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium">
                            Precio
                          </Label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">
                              $
                            </span>
                            <Input
                              type="number"
                              value={row.price}
                              onChange={(e) => {
                                const price = parseInt(e.target.value) || 0;
                                const marginPct =
                                  row.cost > 0
                                    ? Math.round(
                                        ((price - row.cost) / row.cost) * 100
                                      )
                                    : 30;
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.barcode === row.barcode
                                      ? { ...r, price, marginPct }
                                      : r
                                  )
                                );
                              }}
                              className="h-8 pl-5 text-xs font-semibold"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium">
                            Unidad
                          </Label>
                          <Select
                            value={row.unit}
                            onValueChange={(value) =>
                              handleUpdateRow(row.barcode, "unit", value)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Unidad" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ml">ml</SelectItem>
                              <SelectItem value="g">g</SelectItem>
                              <SelectItem value="unidad">Unidad</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium">
                            Cantidad
                          </Label>
                          <Input
                            type="number"
                            value={row.quantity}
                            onChange={(e) =>
                              handleUpdateRow(
                                row.barcode,
                                "quantity",
                                e.target.value
                              )
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t flex justify-between items-center text-[10px]">
                        <div className="text-muted-foreground">
                          Ganancia:{" "}
                          <span className="text-emerald-600 font-medium">
                            ${(row.price - row.cost).toLocaleString("es-CL")}
                          </span>
                        </div>
                        <div className="text-muted-foreground">
                          Total:{" "}
                          <span className="font-medium">
                            ${(row.price * row.stock).toLocaleString("es-CL")}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {viewMode === "cards" && rows.length > 12 && (
              <div className="px-4 pb-4">
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <AlertCircle className="size-4" />
                    <span className="font-medium">
                      Mostrando 12 de {rows.length} productos en vista de
                      tarjetas.
                    </span>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 ml-6">
                    Cambia a vista de tabla para ver todos los productos, o
                    importa estos primero.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="size-20 text-muted-foreground mb-4 opacity-30" />
            <h3 className="text-lg font-semibold mb-2">
              Sin productos agregados
            </h3>
            <p className="text-muted-foreground text-center max-w-sm">
              Comienza a escanear códigos de barras en el campo superior para
              agregar productos
            </p>
          </CardContent>
        </Card>
      )}

      {/* Footer con acciones */}
      {rows.length > 0 && (
        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:border-blue-900 dark:from-blue-950 dark:to-indigo-950 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <AlertCircle className="size-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    {rows.length >= 12
                      ? "⚠️ Límite alcanzado"
                      : stats.error > 0
                      ? `⚠️ ${stats.error} producto${
                          stats.error > 1 ? "s" : ""
                        } con error`
                      : `✅ ${12 - rows.length} espacios disponibles`}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                    {rows.length >= 12
                      ? "Importa estos primero para agregar más"
                      : stats.error > 0
                      ? "Completa los datos faltantes para continuar"
                      : `Máximo ${rows.length}/12 productos por importación`}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleImport}
                disabled={
                  rows.length === 0 ||
                  importing ||
                  rows.some((r) => !r.name || !r.category || r.price <= 0)
                }
                size="lg"
                className="min-w-56 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {importing ? (
                  <>
                    <Loader className="size-5 mr-2 animate-spin" />
                    Importando productos...
                  </>
                ) : (
                  <>
                    <Upload className="size-5 mr-2" />
                    Importar {rows.length}{" "}
                    {rows.length === 1 ? "producto" : "productos"}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
