import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Separator } from "../../ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../../ui/dialog";
import { Label } from "../../ui/label";
import { Switch } from "../../ui/switch";
import {
  Plus,
  Pencil,
  Trash2,
  Tag,
  Percent,
  Gift,
  RefreshCw,
  Search,
  Barcode,
} from "lucide-react";
import { toast } from "sonner";
import { promotionsService } from "../../../services/promotions.service";
import { ProductMultiSelect } from "../../common/ProductMultiSelect";
import { PromotionBarcodePrinter } from "./PromotionBarcodePrinter";
import type {
  Promotion,
  PromotionCreate,
  PromotionType,
  PromotionScope,
  PromotionStatus,
  Product,
} from "../../../types";

interface PromotionsManagerProps {
  products: Product[];
}

const PROMO_TYPE_LABELS: Record<PromotionType, string> = {
  percentage: "% Descuento",
  fixed: "Monto Fijo",
  bundle: "Combo/Bundle",
  "2x1": "2x1",
  "3x2": "3x2",
};

const PROMO_SCOPE_LABELS: Record<PromotionScope, string> = {
  product: "Productos específicos",
  category: "Categoría",
  all: "Todos los productos",
};

const STATUS_VARIANTS: Record<
  PromotionStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  paused: "secondary",
  expired: "destructive",
  soldout: "outline",
};

const STATUS_LABELS: Record<PromotionStatus, string> = {
  active: "Activa",
  paused: "Pausada",
  expired: "Expirada",
  soldout: "Agotada",
};

export default function PromotionsManager({
  products,
}: PromotionsManagerProps) {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [selectedPromoForBarcode, setSelectedPromoForBarcode] = useState<Promotion | null>(null);

  // Form state
  const [formData, setFormData] = useState<PromotionCreate>({
    name: "",
    description: "",
    type: "percentage",
    value: 10,
    active: true,
    scope: "product",
    productIds: [],
    categoryName: "",
    startDate: "",
    endDate: "",
    maxUses: undefined,
    minPurchase: undefined,
    bundleQty: undefined,
    bundlePrice: undefined,
    barcode: "",
  });

  // Categorías únicas de productos
  const categories = [...new Set(products.map((p) => p.category))].sort();

  const fetchPromos = async () => {
    setLoading(true);
    try {
      const data = await promotionsService.getAll(statusFilter);
      setPromos(data);
    } catch (error: any) {
      toast.error(error.message || "Error al cargar promociones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, [statusFilter]);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "percentage",
      value: 10,
      active: true,
      scope: "product",
      productIds: [],
      categoryName: "",
      startDate: "",
      endDate: "",
      maxUses: undefined,
      minPurchase: undefined,
      bundleQty: undefined,
      bundlePrice: undefined,
      barcode: "",
    });
    setEditingPromo(null);
  };

  const openEditDialog = (promo: Promotion) => {
    setEditingPromo(promo);
    setFormData({
      name: promo.name,
      description: promo.description || "",
      type: promo.type,
      value: promo.value,
      active: promo.active,
      scope: promo.scope,
      productIds: promo.productIds || [],
      categoryName: promo.categoryName || "",
      startDate: promo.startDate
        ? new Date(promo.startDate).toISOString().split("T")[0]
        : "",
      endDate: promo.endDate
        ? new Date(promo.endDate).toISOString().split("T")[0]
        : "",
      maxUses: promo.maxUses,
      minPurchase: promo.minPurchase,
      bundleQty: promo.bundleQty,
      bundlePrice: promo.bundlePrice,
      barcode: promo.barcode || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    try {
      if (editingPromo) {
        await promotionsService.update(editingPromo.id, formData);
        toast.success("Promoción actualizada");
      } else {
        await promotionsService.create(formData);
        toast.success("Promoción creada");
      }
      setDialogOpen(false);
      resetForm();
      fetchPromos();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar promoción");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta promoción?")) return;
    try {
      await promotionsService.delete(id);
      toast.success("Promoción eliminada");
      fetchPromos();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar");
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await promotionsService.toggle(id);
      fetchPromos();
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar estado");
    }
  };

  // Filtrar por búsqueda
  const filtered = promos.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Tag className="size-5" />
            Promociones
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona descuentos y ofertas especiales
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Nueva Promoción
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPromo ? "Editar Promoción" : "Nueva Promoción"}
              </DialogTitle>
              <DialogDescription>
                {editingPromo
                  ? "Modifica los detalles de la promoción"
                  : "Crea una nueva promoción o descuento"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Nombre y descripción */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ej: Promo Verano 20%"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código de Barras</Label>
                  <Input
                    value={formData.barcode || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, barcode: e.target.value })
                    }
                    placeholder="EAN-13 opcional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descripción opcional"
                />
              </div>

              <Separator />

              {/* Tipo de promoción */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Promoción</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) =>
                      setFormData({ ...formData, type: v as PromotionType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROMO_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Valor según tipo */}
                {(formData.type === "percentage" ||
                  formData.type === "fixed") && (
                    <div className="space-y-2">
                      <Label>
                        {formData.type === "percentage"
                          ? "Porcentaje (%)"
                          : "Monto ($)"}
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.value || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            value: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  )}

                {formData.type === "bundle" && (
                  <>
                    <div className="space-y-2">
                      <Label>Cantidad para Bundle</Label>
                      <Input
                        type="number"
                        min={2}
                        value={formData.bundleQty || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bundleQty: parseInt(e.target.value) || undefined,
                          })
                        }
                        placeholder="Ej: 3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Precio del Bundle ($)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.bundlePrice || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bundlePrice: parseInt(e.target.value) || undefined,
                          })
                        }
                        placeholder="Precio total del bundle"
                      />
                    </div>
                  </>
                )}
              </div>

              <Separator />

              {/* Alcance */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Aplica a</Label>
                  <Select
                    value={formData.scope}
                    onValueChange={(v) =>
                      setFormData({ ...formData, scope: v as PromotionScope })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROMO_SCOPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.scope === "category" && (
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select
                      value={formData.categoryName || ""}
                      onValueChange={(v) =>
                        setFormData({ ...formData, categoryName: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {formData.scope === "product" && (
                <div className="space-y-2">
                  <Label>Productos</Label>
                  <ProductMultiSelect
                    products={products}
                    selectedIds={formData.productIds || []}
                    onChange={(ids) =>
                      setFormData({ ...formData, productIds: ids })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Selecciona los productos que aplican a esta promoción
                  </p>
                </div>
              )}

              <Separator />

              {/* Fechas y límites */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha Inicio</Label>
                  <Input
                    type="date"
                    value={formData.startDate || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Fin</Label>
                  <Input
                    type="date"
                    value={formData.endDate || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Máx. Usos (opcional)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.maxUses || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxUses: parseInt(e.target.value) || undefined,
                      })
                    }
                    placeholder="Sin límite"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Compra Mínima ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.minPurchase || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minPurchase: parseInt(e.target.value) || undefined,
                      })
                    }
                    placeholder="Sin mínimo"
                  />
                </div>
              </div>

              {/* Estado activo */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Promoción Activa</Label>
                  <p className="text-sm text-muted-foreground">
                    Desactiva para pausar sin eliminar
                  </p>
                </div>
                <Switch
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, active: checked })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {editingPromo ? "Guardar Cambios" : "Crear Promoción"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar promociones..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="paused">Pausadas</SelectItem>
              <SelectItem value="expired">Expiradas</SelectItem>
              <SelectItem value="soldout">Agotadas</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchPromos}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Tabla de promociones */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Alcance</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    {loading ? "Cargando..." : "No hay promociones"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{promo.name}</div>
                        {promo.description && (
                          <div className="text-xs text-muted-foreground">
                            {promo.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {PROMO_TYPE_LABELS[promo.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {promo.type === "percentage" && `${promo.value}%`}
                      {promo.type === "fixed" &&
                        `$${promo.value?.toLocaleString("es-CL")}`}
                      {promo.type === "bundle" &&
                        `${promo.bundleQty
                        } x $${promo.bundlePrice?.toLocaleString("es-CL")}`}
                      {promo.type === "2x1" && "2x1"}
                      {promo.type === "3x2" && "3x2"}
                    </TableCell>
                    <TableCell>
                      {promo.scope === "all" && "Todos"}
                      {promo.scope === "category" && promo.categoryName}
                      {promo.scope === "product" &&
                        `${promo.productIds?.length || 0} productos`}
                    </TableCell>
                    <TableCell>
                      {promo.maxUses
                        ? `${promo.usedCount}/${promo.maxUses}`
                        : promo.usedCount}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={STATUS_VARIANTS[promo.status || "active"]}
                      >
                        {STATUS_LABELS[promo.status || "active"]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggle(promo.id)}
                          title={promo.active ? "Pausar" : "Activar"}
                        >
                          <Switch checked={promo.active} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedPromoForBarcode(promo);
                            setBarcodeDialogOpen(true);
                          }}
                          title="Imprimir código de barras"
                        >
                          <Barcode className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(promo)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(promo.id)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Barcode Printer Dialog */}
      {selectedPromoForBarcode && (
        <PromotionBarcodePrinter
          promotion={selectedPromoForBarcode}
          open={barcodeDialogOpen}
          onClose={() => {
            setBarcodeDialogOpen(false);
            setSelectedPromoForBarcode(null);
          }}
        />
      )}
    </Card>
  );
}
