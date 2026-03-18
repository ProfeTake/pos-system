import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
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
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Separator } from "../../ui/separator";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import {
  Receipt,
  Eye,
  Calendar,
  DollarSign,
  CreditCard,
  FilterX,
  Package2,
  Printer,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Sale, SaleStatus } from "../../../types";
import {
  getOperationalWindow,
  windowForBaseDay,
} from "../../../utils/businessHours";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";
import {
  printSaleReceipt,
  getReceiptHtml,
  getShiftSummaryHtml,
  printShiftSummary,
} from "../../common/ReceiptPrinter";
import { printReceiptViaElectron } from "../pos/electronPrint";
import { getPreferredPrinter } from "../pos/preferences";
import { salesService } from "../../../services/sales.service";
import { toast } from "sonner";

interface SalesHistoryProps {
  sales: Sale[];
  onRefresh?: () => void;
}

export function SalesHistory({ sales, onRefresh }: SalesHistoryProps) {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<
    "all" | "cash" | "debit" | "credit" | "transfer"
  >("all");
  const [statusFilter, setStatusFilter] = useState<"all" | SaleStatus>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortKey, setSortKey] = useState<
    "id" | "date" | "customer" | "items" | "total"
  >("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Estados para diálogos de void/refund
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [actionSale, setActionSale] = useState<Sale | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fromDate = useMemo(
    () => (dateFrom ? new Date(`${dateFrom}T00:00:00`) : null),
    [dateFrom]
  );
  const toDate = useMemo(
    () => (dateTo ? new Date(`${dateTo}T23:59:59.999`) : null),
    [dateTo]
  );

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const d = s.date;
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      if (paymentFilter !== "all" && (s.paymentMethod || "") !== paymentFilter)
        return false;
      if (statusFilter !== "all" && (s.status || "completed") !== statusFilter)
        return false;
      return true;
    });
  }, [sales, fromDate, toDate, paymentFilter, statusFilter]);

  // Funciones para anular/devolver
  const handleVoid = async () => {
    if (!actionSale) return;
    setActionLoading(true);
    try {
      await salesService.voidSale(actionSale.id, actionReason || undefined);
      toast.success("Venta anulada exitosamente");
      setVoidDialogOpen(false);
      setActionSale(null);
      setActionReason("");
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.message || "Error al anular venta");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!actionSale) return;
    setActionLoading(true);
    try {
      const result = await salesService.refundSale(
        actionSale.id,
        actionReason || undefined
      );
      toast.success(
        `Devolución procesada: $${result.refundTotal.toLocaleString("es-CL")}`
      );
      setRefundDialogOpen(false);
      setActionSale(null);
      setActionReason("");
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.message || "Error al procesar devolución");
    } finally {
      setActionLoading(false);
    }
  };

  const openVoidDialog = (sale: Sale) => {
    setActionSale(sale);
    setActionReason("");
    setVoidDialogOpen(true);
  };

  const openRefundDialog = (sale: Sale) => {
    setActionSale(sale);
    setActionReason("");
    setRefundDialogOpen(true);
  };

  const getStatusBadge = (status?: SaleStatus) => {
    switch (status) {
      case "voided":
        return <Badge variant="destructive">Anulada</Badge>;
      case "refunded":
        return <Badge variant="secondary">Devuelta</Badge>;
      default:
        return <Badge variant="default">Completada</Badge>;
    }
  };

  const sortedSales = useMemo(() => {
    const factor = sortDir === "asc" ? 1 : -1;
    const getUnits = (s: Sale) =>
      s.items.reduce((sum, it) => sum + it.quantity, 0);
    const getCustomer = (s: Sale) =>
      s.customerName?.toLowerCase().trim() || "cliente anónimo";
    return [...filteredSales].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "id": {
          cmp = a.id - b.id;
          break;
        }
        case "date":
          cmp = a.date.getTime() - b.date.getTime();
          break;
        case "customer":
          cmp = getCustomer(a).localeCompare(getCustomer(b), "es");
          break;
        case "items": {
          const ua = getUnits(a);
          const ub = getUnits(b);
          cmp = ua - ub;
          if (cmp === 0) cmp = a.items.length - b.items.length; // desempate
          break;
        }
        case "total":
          cmp = a.total - b.total;
          break;
        default:
          cmp = 0;
      }
      return cmp * factor;
    });
  }, [filteredSales, sortKey, sortDir]);

  function toggleSort(key: "id" | "date" | "customer" | "items" | "total") {
    setSortDir((prev) =>
      sortKey === key ? (prev === "asc" ? "desc" : "asc") : "asc"
    );
    setSortKey(key);
  }

  const SortIcon = ({ keyName }: { keyName: typeof sortKey }) => {
    if (sortKey !== keyName)
      return <ArrowUpDown className="ml-2 size-4 text-muted-foreground" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-2 size-4" />
    ) : (
      <ArrowDown className="ml-2 size-4" />
    );
  };

  const totalSales = filteredSales.length;
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

  // KPIs: turno actual y últimos 7 turnos (rolling window de turnos)
  const now = new Date();
  const currentWindow = getOperationalWindow(now);
  const base7Ago = new Date(currentWindow.open);
  base7Ago.setDate(base7Ago.getDate() - 6);
  const start7Windows = windowForBaseDay(base7Ago).open;

  const salesToday = filteredSales.filter(
    (s) => s.date >= currentWindow.open && s.date <= currentWindow.close
  );
  const revenueToday = salesToday.reduce((sum, s) => sum + s.total, 0);
  const sales7d = filteredSales.filter(
    (s) => s.date >= start7Windows && s.date <= currentWindow.close
  );
  const revenue7d = sales7d.reduce((sum, s) => sum + s.total, 0);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("es-CL", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // sortedSales ahora se calcula en base a sortKey/sortDir más arriba

  const toPaymentLabel = (m?: string) => {
    switch (m) {
      case "cash":
        return "Efectivo";
      case "debit":
        return "Débito";
      case "credit":
        return "Crédito";
      case "transfer":
        return "Transferencia";
      default:
        return m || "N/D";
    }
  };

  async function handleReprint(sale: Sale) {
    const itemsForPrint = sale.items.map((it) => ({
      name: it.product?.name ?? it.productName,
      qty: it.quantity,
      unitPrice: it.product?.price ?? it.price,
    }));
    // Impresión nativa por Electron a impresora preferida
    const html = getReceiptHtml({
      storeName: "Punto tres",
      saleNumber: sale.id,
      date: sale.date,
      paymentMethod: toPaymentLabel(sale.paymentMethod as any),
      customerName: sale.customerName || "Cliente Anónimo",
      items: itemsForPrint,
      total: sale.total,
    });
    const preferred = getPreferredPrinter() || undefined;
    const printed = await printReceiptViaElectron(html, preferred);
    if (!printed) {
      alert("Impresora POS no disponible. Mostrando boleta para imprimir.");
      printSaleReceipt({
        storeName: "Punto tres",
        saleNumber: sale.id,
        date: sale.date,
        paymentMethod: toPaymentLabel(sale.paymentMethod as any),
        customerName: sale.customerName || "Cliente Anónimo",
        items: itemsForPrint,
        total: sale.total,
      });
    }
  }

  // Resumen del turno actual (ventas dentro de currentWindow)
  async function handlePrintShiftSummary() {
    const shiftSales = sales.filter(
      (s) => s.date >= currentWindow.open && s.date <= currentWindow.close
    );
    const byMethod = shiftSales.reduce(
      (acc, s) => {
        const m = (s.paymentMethod || "cash") as any;
        if (m === "cash") acc.cash += s.total;
        else if (m === "debit") acc.debit += s.total;
        else if (m === "credit") acc.credit += s.total;
        else if (m === "transfer") acc.transfer += s.total;
        return acc;
      },
      { cash: 0, debit: 0, credit: 0, transfer: 0 }
    );
    const windowLabel = `${currentWindow.open.toLocaleString(
      "es-CL"
    )} - ${currentWindow.close.toLocaleString("es-CL")}`;
    const data = {
      storeName: "Punto tres",
      generatedAt: new Date(),
      windowLabel,
      totalSales: shiftSales.length,
      grandTotal: Object.values(byMethod).reduce((a, b) => a + b, 0),
      byMethod,
    };

    const html = getShiftSummaryHtml(data);
    const preferred = getPreferredPrinter() || undefined;
    // Intento 1: impresión nativa (silenciosa si hay impresora preferida válida)
    const printed = await printReceiptViaElectron(html, preferred);
    if (!printed) {
      // Fallback: popup del navegador/Electron con window.print()
      printShiftSummary(data);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>Historial de Ventas</h1>
        <p className="text-muted-foreground">
          Registro completo de todas las transacciones
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <FilterX className="size-4 text-muted-foreground" />
            <span className="font-medium">Filtros</span>
          </div>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="dateFrom"
                className="text-xs text-muted-foreground"
              >
                Desde
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-10 h-9 text-sm"
                  placeholder="dd-mm-aaaa"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateTo" className="text-xs text-muted-foreground">
                Hasta
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-10 h-9 text-sm"
                  placeholder="dd-mm-aaaa"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Método de pago
              </Label>
              <Select
                value={paymentFilter}
                onValueChange={(
                  v: "all" | "cash" | "debit" | "credit" | "transfer"
                ) => setPaymentFilter(v)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los métodos</SelectItem>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="debit">Débito</SelectItem>
                  <SelectItem value="credit">Crédito</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Estado</Label>
              <Select
                value={statusFilter}
                onValueChange={(v: "all" | SaleStatus) => setStatusFilter(v)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="completed">Completadas</SelectItem>
                  <SelectItem value="voided">Anuladas</SelectItem>
                  <SelectItem value="refunded">Devueltas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground opacity-0">
                Acciones
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-full text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setPaymentFilter("all");
                  setStatusFilter("all");
                }}
              >
                <FilterX className="size-4 mr-2" /> Limpiar
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Mostrando {filteredSales.length} de {sales.length} ventas
          </p>
        </CardContent>
      </Card>

      {/* Panel resumen movido a Administración > Ejecutivo */}

      {/* KPIs Hoy y Últimos 7 días */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turno actual</CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 items-center">
              <div>
                <div className="text-lg font-semibold">
                  {salesToday.length} ventas
                </div>
                <div className="text-2xl font-bold">
                  ${revenueToday.toLocaleString("es-CL")}
                </div>
              </div>
              <div className="flex justify-end w-full">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrintShiftSummary}
                  className="ml-auto"
                >
                  <Printer className="size-4 mr-2" /> Resumen del turno
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Últimos 7 turnos
            </CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{sales7d.length} ventas</div>
            <div className="text-2xl font-bold">
              ${revenue7d.toLocaleString("es-CL")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de ventas */}
      <Card>
        <CardHeader>
          <CardTitle>Transacciones Recientes</CardTitle>
          <CardDescription>
            Historial detallado de todas las ventas realizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="size-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No hay ventas registradas aún.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="min-w-[120px] select-none"
                      aria-sort={
                        sortKey === "id"
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
                        onClick={() => toggleSort("id")}
                      >
                        ID Venta
                        <SortIcon keyName="id" />
                      </Button>
                    </TableHead>
                    <TableHead
                      className="min-w-[150px] select-none"
                      aria-sort={
                        sortKey === "date"
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
                        onClick={() => toggleSort("date")}
                      >
                        Fecha
                        <SortIcon keyName="date" />
                      </Button>
                    </TableHead>
                    <TableHead
                      className="min-w-[120px] select-none"
                      aria-sort={
                        sortKey === "customer"
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
                        onClick={() => toggleSort("customer")}
                      >
                        Cliente
                        <SortIcon keyName="customer" />
                      </Button>
                    </TableHead>
                    <TableHead
                      className="text-center min-w-[140px] select-none"
                      aria-sort={
                        sortKey === "items"
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
                        onClick={() => toggleSort("items")}
                      >
                        Productos
                        <SortIcon keyName="items" />
                      </Button>
                    </TableHead>
                    <TableHead
                      className="text-right min-w-[100px] select-none"
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
                        Total
                        <SortIcon keyName="total" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-center min-w-[100px]">
                      Estado
                    </TableHead>
                    <TableHead className="text-center min-w-[180px]">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSales.map((sale) => (
                    <TableRow
                      key={sale.id}
                      className={
                        sale.status !== "completed" && sale.status
                          ? "opacity-60"
                          : ""
                      }
                    >
                      <TableCell className="font-medium min-w-[120px]">
                        {sale.id}
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        {formatDate(sale.date)}
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        {sale.customerName || (
                          <Badge variant="outline">Cliente Anónimo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center min-w-[140px]">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex items-center gap-2">
                                <Package2 className="size-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {sale.items.reduce(
                                    (sum, it) => sum + it.quantity,
                                    0
                                  )}{" "}
                                  unid
                                </span>
                                <Badge variant="outline">
                                  {sale.items.length} prod
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm">
                                {sale.items.length === 0 ? (
                                  <span>Sin detalle de items</span>
                                ) : (
                                  <ul className="space-y-1">
                                    {sale.items.slice(0, 5).map((it) => (
                                      <li
                                        key={it.product?.id ?? it.productId}
                                        className="flex justify-between gap-4"
                                      >
                                        <span className="truncate max-w-[200px]">
                                          {it.product?.name ?? it.productName}
                                        </span>
                                        <span className="text-muted-foreground">
                                          x{it.quantity}
                                        </span>
                                      </li>
                                    ))}
                                    {sale.items.length > 5 && (
                                      <li className="text-muted-foreground">
                                        … y {sale.items.length - 5} más
                                      </li>
                                    )}
                                  </ul>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right font-medium min-w-[100px]">
                        ${sale.total.toLocaleString("es-CL")}
                      </TableCell>
                      <TableCell className="text-center min-w-[100px]">
                        {getStatusBadge(sale.status)}
                        {sale.voidReason && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-xs text-muted-foreground block">
                                  (ver motivo)
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{sale.voidReason}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                      <TableCell className="text-center min-w-[180px]">
                        <div className="flex justify-center gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedSale(sale)}
                              >
                                <Eye className="size-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>
                                  Detalle de Venta - {sale.id}
                                </DialogTitle>
                                <DialogDescription>
                                  Información completa de la transacción
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">
                                      Fecha:
                                    </span>
                                    <p className="font-medium">
                                      {formatDate(sale.date)}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Cliente:
                                    </span>
                                    <p className="font-medium">
                                      {sale.customerName || "Cliente Anónimo"}
                                    </p>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">
                                      Pago:
                                    </span>
                                    <p className="font-medium flex items-center gap-2">
                                      <CreditCard className="size-4 text-muted-foreground" />
                                      {toPaymentLabel(sale.paymentMethod)}
                                    </p>
                                  </div>
                                </div>

                                <Separator />

                                <div className="space-y-3">
                                  <h4 className="font-medium">
                                    Productos Vendidos
                                  </h4>
                                  {sale.items.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                      Sin detalle de items para esta venta.
                                    </p>
                                  ) : (
                                    <div className="max-h-[320px] overflow-y-auto border rounded-md">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Producto</TableHead>
                                            <TableHead className="hidden sm:table-cell">
                                              Código
                                            </TableHead>
                                            <TableHead className="text-center">
                                              Cantidad
                                            </TableHead>
                                            <TableHead className="text-right">
                                              Precio
                                            </TableHead>
                                            <TableHead className="text-right">
                                              Subtotal
                                            </TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {sale.items.map((item) => (
                                            <TableRow key={item.product?.id ?? item.productId}>
                                              <TableCell>
                                                <div className="font-medium truncate">
                                                  {item.product?.name ?? item.productName}
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                  {item.product?.category}
                                                  {typeof (item.product as any)
                                                    ?.volume === "number" &&
                                                  (item.product as any)?.volume >
                                                    0
                                                    ? ` • ${
                                                        (item.product as any)
                                                          ?.volume
                                                      }ml`
                                                    : (item.product?.ml ?? 0) > 0
                                                    ? ` • ${item.product?.ml}ml`
                                                    : ""}
                                                </div>
                                              </TableCell>
                                              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                                                {item.product?.barCode || "—"}
                                              </TableCell>
                                              <TableCell className="text-center">
                                                {item.quantity}
                                              </TableCell>
                                              <TableCell className="text-right">
                                                $
                                                {(item.product?.price ?? item.price).toLocaleString(
                                                  "es-CL"
                                                )}
                                              </TableCell>
                                              <TableCell className="text-right font-medium">
                                                $
                                                {(
                                                  (item.product?.price ?? item.price) *
                                                  item.quantity
                                                ).toLocaleString("es-CL")}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}
                                </div>

                                <Separator />

                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">
                                    Productos distintos:
                                  </span>
                                  <span className="font-medium">
                                    {sale.items.length}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">
                                    Unidades totales:
                                  </span>
                                  <span className="font-medium">
                                    {sale.items.reduce(
                                      (sum, it) => sum + it.quantity,
                                      0
                                    )}
                                  </span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center font-medium text-lg">
                                  <span>Total:</span>
                                  <span>
                                    ${sale.total.toLocaleString("es-CL")}
                                  </span>
                                </div>
                                <div className="flex justify-end pt-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleReprint(sale)}
                                  >
                                    <Printer className="size-4 mr-2" />
                                    Reimprimir boleta
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          {/* Botones de anulación/devolución */}
                          {(!sale.status || sale.status === "completed") && (
                            <>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openVoidDialog(sale)}
                                    >
                                      <XCircle className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Anular (sin devolver stock)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openRefundDialog(sale)}
                                    >
                                      <RotateCcw className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Devolver (anula y devuelve stock)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
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

      {/* Diálogo de Anulación */}
      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular Venta #{actionSale?.id}</DialogTitle>
            <DialogDescription>
              Esta acción anula la venta sin devolver el stock. Use "Devolver"
              si necesita reintegrar los productos al inventario.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo de anulación (opcional)</Label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Ej: Error en el registro, cliente no pagó..."
              />
            </div>
            <div className="rounded-md bg-muted p-3 text-sm">
              <p>
                <strong>Total:</strong> $
                {actionSale?.total.toLocaleString("es-CL")}
              </p>
              <p>
                <strong>Items:</strong> {actionSale?.items.length} productos
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoid}
              disabled={actionLoading}
            >
              {actionLoading ? "Procesando..." : "Anular Venta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Devolución */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devolver Venta #{actionSale?.id}</DialogTitle>
            <DialogDescription>
              Esta acción anula la venta y devuelve todos los productos al
              stock.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo de devolución (opcional)</Label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Ej: Producto defectuoso, cambio de opinión..."
              />
            </div>
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p>
                <strong>Total a devolver:</strong> $
                {actionSale?.total.toLocaleString("es-CL")}
              </p>
              <p>
                <strong>Productos a reintegrar:</strong>
              </p>
              <ul className="list-disc list-inside text-muted-foreground">
                {actionSale?.items.slice(0, 5).map((item) => (
                  <li key={item.product?.id ?? item.productId}>
                    {item.product?.name ?? item.productName} x{item.quantity}
                  </li>
                ))}
                {(actionSale?.items.length || 0) > 5 && (
                  <li>...y {(actionSale?.items.length || 0) - 5} más</li>
                )}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRefundDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRefund}
              disabled={actionLoading}
            >
              {actionLoading ? "Procesando..." : "Procesar Devolución"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
