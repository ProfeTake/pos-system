import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
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
} from "../../ui/dialog";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import {
  Plus,
  FileText,
  DollarSign,
  AlertCircle,
  Calendar,
  TrendingUp,
  TrendingDown,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { supplierInvoicesService } from "../../../services/supplier-invoices.service";
import type {
  SupplierInvoice,
  SupplierInvoiceWithDetails,
  InvoicePaymentStatus,
  ExpenseCategory,
  InvoiceStats,
} from "../../../types";

const EXPENSE_CATEGORIES: Record<ExpenseCategory, string> = {
  inventory: "Compra de Mercadería",
  services: "Servicios Profesionales",
  utilities: "Servicios Básicos",
  rent: "Arriendo",
  equipment: "Equipamiento",
  maintenance: "Mantención",
  marketing: "Marketing",
  transportation: "Transporte",
  supplies: "Insumos",
  other: "Otros",
};

const CURRENCIES = ["CLP", "USD", "EUR"];

const PAYMENT_METHODS = ["cash", "transfer", "check", "credit"];

export default function SupplierInvoices() {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoiceWithDetails | null>(null);
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<InvoicePaymentStatus | "all">("all");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");

  // Formulario nueva factura
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    supplierName: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    subtotal: 0,
    taxAmount: 0,
    total: 0,
    currency: "CLP" as const,
    expenseCategory: "inventory" as ExpenseCategory,
    accountingCode: "",
    description: "",
    notes: "",
  });

  // Formulario pago
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "transfer",
    reference: "",
    notes: "",
  });

  // Cargar datos
  useEffect(() => {
    loadInvoices();
    loadStats();
  }, [statusFilter, supplierFilter, categoryFilter, dateFromFilter, dateToFilter]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await supplierInvoicesService.getAll({
        status: statusFilter,
        supplier: supplierFilter || undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        dateFrom: dateFromFilter || undefined,
        dateTo: dateToFilter || undefined,
        sortBy: "invoiceDate",
        sortOrder: "desc",
      });
      setInvoices(data);
    } catch (error: any) {
      toast.error("Error al cargar facturas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await supplierInvoicesService.getStats(
        dateFromFilter || undefined,
        dateToFilter || undefined
      );
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.invoiceNumber || !formData.supplierName || !formData.expenseCategory) {
        toast.error("Completa los campos requeridos");
        return;
      }

      await supplierInvoicesService.create({
        ...formData,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate || undefined,
      });

      toast.success("Factura creada correctamente");
      setShowNewDialog(false);
      resetForm();
      loadInvoices();
      loadStats();
    } catch (error: any) {
      toast.error("Error al crear factura: " + error.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta factura?")) return;

    try {
      await supplierInvoicesService.delete(id);
      toast.success("Factura eliminada");
      loadInvoices();
      loadStats();
    } catch (error: any) {
      toast.error("Error al eliminar: " + error.message);
    }
  };

  const handleViewDetails = async (id: number) => {
    try {
      const details = await supplierInvoicesService.getById(id);
      setSelectedInvoice(details);
      setShowDetailsDialog(true);
    } catch (error: any) {
      toast.error("Error al cargar detalles: " + error.message);
    }
  };

  const handleOpenPayment = (invoice: SupplierInvoice) => {
    setSelectedInvoice(invoice as SupplierInvoiceWithDetails);
    setPaymentData({
      amount: invoice.amountPending,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "transfer",
      reference: "",
      notes: "",
    });
    setShowPaymentDialog(true);
  };

  const handleRegisterPayment = async () => {
    if (!selectedInvoice) return;

    try {
      if (paymentData.amount <= 0) {
        toast.error("El monto debe ser mayor a 0");
        return;
      }

      if (paymentData.amount > selectedInvoice.amountPending) {
        toast.error("El monto excede lo pendiente");
        return;
      }

      await supplierInvoicesService.registerPayment(selectedInvoice.id, {
        ...paymentData,
        paymentDate: paymentData.paymentDate,
      });

      toast.success("Pago registrado correctamente");
      setShowPaymentDialog(false);
      loadInvoices();
      loadStats();
    } catch (error: any) {
      toast.error("Error al registrar pago: " + error.message);
    }
  };

  const handleExport = () => {
    supplierInvoicesService.exportToCSV(invoices);
    toast.success("Archivo CSV descargado");
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: "",
      supplierName: "",
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      subtotal: 0,
      taxAmount: 0,
      total: 0,
      currency: "CLP",
      expenseCategory: "inventory",
      accountingCode: "",
      description: "",
      notes: "",
    });
  };

  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);
  };

  const getStatusBadge = (status: InvoicePaymentStatus) => {
    const variants: Record<InvoicePaymentStatus, any> = {
      pending: <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>,
      partial: <Badge variant="outline" className="bg-blue-100 text-blue-800"><TrendingUp className="w-3 h-3 mr-1" />Parcial</Badge>,
      paid: <Badge variant="outline" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Pagada</Badge>,
      overdue: <Badge variant="outline" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Vencida</Badge>,
    };
    return variants[status];
  };

  const calculateTax = (subtotal: number) => {
    return Math.round(subtotal * 0.19);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Dashboard de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Pagar</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCLP(stats?.totalPending || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.countPending || 0} facturas pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCLP(stats?.totalOverdue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.countOverdue || 0} facturas vencidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas (7 días)</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCLP(stats?.upcomingDueAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.upcomingDue7Days || 0} por vencer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagado</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCLP(stats?.totalPaid || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.countPaid || 0} facturas pagadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y Acciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Facturas de Proveedores
            </span>
            <div className="flex gap-2">
              <Button onClick={handleExport} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
              <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Factura
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Registrar Nueva Factura</DialogTitle>
                    <DialogDescription>
                      Ingresa los datos de la factura del proveedor
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="invoiceNumber">Número de Factura *</Label>
                        <Input
                          id="invoiceNumber"
                          value={formData.invoiceNumber}
                          onChange={(e) =>
                            setFormData({ ...formData, invoiceNumber: e.target.value })
                          }
                          placeholder="Ej: 12345"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="supplierName">Proveedor *</Label>
                        <Input
                          id="supplierName"
                          value={formData.supplierName}
                          onChange={(e) =>
                            setFormData({ ...formData, supplierName: e.target.value })
                          }
                          placeholder="Nombre del proveedor"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="invoiceDate">Fecha Emisión *</Label>
                        <Input
                          id="invoiceDate"
                          type="date"
                          value={formData.invoiceDate}
                          onChange={(e) =>
                            setFormData({ ...formData, invoiceDate: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dueDate">Fecha Vencimiento</Label>
                        <Input
                          id="dueDate"
                          type="date"
                          value={formData.dueDate}
                          onChange={(e) =>
                            setFormData({ ...formData, dueDate: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="subtotal">Subtotal (Neto)</Label>
                        <Input
                          id="subtotal"
                          type="number"
                          value={formData.subtotal}
                          onChange={(e) => {
                            const subtotal = Number(e.target.value);
                            const taxAmount = calculateTax(subtotal);
                            setFormData({
                              ...formData,
                              subtotal,
                              taxAmount,
                              total: subtotal + taxAmount,
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taxAmount">IVA (19%)</Label>
                        <Input
                          id="taxAmount"
                          type="number"
                          value={formData.taxAmount}
                          onChange={(e) => {
                            const taxAmount = Number(e.target.value);
                            setFormData({
                              ...formData,
                              taxAmount,
                              total: formData.subtotal + taxAmount,
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="total">Total</Label>
                        <Input
                          id="total"
                          type="number"
                          value={formData.total}
                          onChange={(e) =>
                            setFormData({ ...formData, total: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expenseCategory">Categoría de Gasto *</Label>
                        <Select
                          value={formData.expenseCategory}
                          onValueChange={(value: ExpenseCategory) =>
                            setFormData({ ...formData, expenseCategory: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Moneda</Label>
                        <Select
                          value={formData.currency}
                          onValueChange={(value: any) =>
                            setFormData({ ...formData, currency: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map((curr) => (
                              <SelectItem key={curr} value={curr}>
                                {curr}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountingCode">Código Contable</Label>
                      <Input
                        id="accountingCode"
                        value={formData.accountingCode}
                        onChange={(e) =>
                          setFormData({ ...formData, accountingCode: e.target.value })
                        }
                        placeholder="Opcional"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="Detalles de la compra..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notas</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        placeholder="Notas adicionales..."
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreate}>Crear Factura</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div>
              <Label className="text-xs">Estado</Label>
              <Select
                value={statusFilter}
                onValueChange={(value: any) => setStatusFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="partial">Parciales</SelectItem>
                  <SelectItem value="paid">Pagadas</SelectItem>
                  <SelectItem value="overdue">Vencidas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Proveedor</Label>
              <Input
                placeholder="Buscar..."
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs">Categoría</Label>
              <Select
                value={categoryFilter}
                onValueChange={(value: any) => setCategoryFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Desde</Label>
              <Input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs">Hasta</Label>
              <Input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Tabla */}
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay facturas registradas
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Factura</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>{invoice.supplierName}</TableCell>
                      <TableCell>
                        {new Date(invoice.invoiceDate).toLocaleDateString("es-CL")}
                      </TableCell>
                      <TableCell>
                        {invoice.dueDate
                          ? new Date(invoice.dueDate).toLocaleDateString("es-CL")
                          : "-"}
                      </TableCell>
                      <TableCell>{formatCLP(invoice.total)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.paymentStatus)}</TableCell>
                      <TableCell className="text-xs">
                        {EXPENSE_CATEGORIES[invoice.expenseCategory]}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewDetails(invoice.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {invoice.paymentStatus !== "paid" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenPayment(invoice)}
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                          )}
                          {invoice.paymentStatus === "pending" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(invoice.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Detalles */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalles de Factura</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">N° Factura</Label>
                  <p className="font-medium">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Proveedor</Label>
                  <p className="font-medium">{selectedInvoice.supplierName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha Emisión</Label>
                  <p>{new Date(selectedInvoice.invoiceDate).toLocaleDateString("es-CL")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Vencimiento</Label>
                  <p>
                    {selectedInvoice.dueDate
                      ? new Date(selectedInvoice.dueDate).toLocaleDateString("es-CL")
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Subtotal</Label>
                  <p className="text-lg font-semibold">{formatCLP(selectedInvoice.subtotal)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">IVA</Label>
                  <p className="text-lg font-semibold">{formatCLP(selectedInvoice.taxAmount)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Total</Label>
                  <p className="text-xl font-bold">{formatCLP(selectedInvoice.total)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Pagado</Label>
                  <p className="text-green-600 font-semibold">
                    {formatCLP(selectedInvoice.amountPaid)}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Pendiente</Label>
                  <p className="text-orange-600 font-semibold">
                    {formatCLP(selectedInvoice.amountPending)}
                  </p>
                </div>
              </div>

              {selectedInvoice.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Descripción</Label>
                  <p className="text-sm">{selectedInvoice.description}</p>
                </div>
              )}

              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold mb-2">Historial de Pagos</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Referencia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {new Date(payment.paymentDate).toLocaleDateString("es-CL")}
                          </TableCell>
                          <TableCell>{formatCLP(payment.amount)}</TableCell>
                          <TableCell>{payment.paymentMethod}</TableCell>
                          <TableCell>{payment.reference || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Registrar Pago */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Factura #{selectedInvoice?.invoiceNumber} - Pendiente:{" "}
              {formatCLP(selectedInvoice?.amountPending || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Monto a Pagar *</Label>
              <Input
                id="paymentAmount"
                type="number"
                value={paymentData.amount}
                onChange={(e) =>
                  setPaymentData({ ...paymentData, amount: Number(e.target.value) })
                }
                max={selectedInvoice?.amountPending || 0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate">Fecha de Pago *</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentData.paymentDate}
                onChange={(e) =>
                  setPaymentData({ ...paymentData, paymentDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Método de Pago *</Label>
              <Select
                value={paymentData.paymentMethod}
                onValueChange={(value) =>
                  setPaymentData({ ...paymentData, paymentMethod: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="check">Cheque</SelectItem>
                  <SelectItem value="credit">Tarjeta Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentReference">Referencia</Label>
              <Input
                id="paymentReference"
                value={paymentData.reference}
                onChange={(e) =>
                  setPaymentData({ ...paymentData, reference: e.target.value })
                }
                placeholder="N° transferencia, cheque, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentNotes">Notas</Label>
              <Textarea
                id="paymentNotes"
                value={paymentData.notes}
                onChange={(e) =>
                  setPaymentData({ ...paymentData, notes: e.target.value })
                }
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegisterPayment}>Registrar Pago</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
