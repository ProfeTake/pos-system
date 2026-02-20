import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Switch } from "../../ui/switch";
import { Receipt, Calendar, FilterX, Trophy, BarChart3 } from "lucide-react";
import type { Product, Sale } from "../../../types";
import {
  getOperationalWindow,
  windowForBaseDay,
} from "../../../utils/businessHours";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export default function ExecutiveDashboard({
  products,
  sales,
}: {
  products: Product[];
  sales: Sale[];
}) {
  const fmtCLP = (n: number) => Math.round(n).toLocaleString("es-CL");
  const [paymentFilter, setPaymentFilter] = useState<
    "all" | "cash" | "debit" | "credit" | "transfer"
  >("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  // Vista seleccionable por menú: Ingreso | Ganancia (sin toggle)
  const [revenueView, setRevenueView] = useState<"revenue" | "profit">(
    "revenue"
  );
  // Periodo global del panel (controlado desde la card "Total Ventas")
  const [periodPreset, setPeriodPreset] = useState<
    "today" | "yesterday" | "7d" | "month" | "year"
  >("7d");
  // Toggle para alternar entre vista de números y gráficos
  const [showCharts, setShowCharts] = useState(false);

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
      return true;
    });
  }, [sales, fromDate, toDate, paymentFilter]);

  const totalSales = filteredSales.length;
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
  const averageTicketRounded = Math.round(averageTicket);

  const now = new Date();
  // Ventana operacional (turno) vigente y adyacentes
  const currentWindow = getOperationalWindow(now);
  const basePrev = new Date(currentWindow.open);
  basePrev.setDate(basePrev.getDate() - 1);
  const prevWindow = windowForBaseDay(basePrev);
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

  // Inicio de mes/año ajustados al primer turno de ese periodo
  const startOfMonthCalendar = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfMonth = windowForBaseDay(startOfMonthCalendar).open;
  const startOfYearCalendar = new Date(now.getFullYear(), 0, 1);
  const startOfYear = windowForBaseDay(startOfYearCalendar).open;

  // Rango activo según el combobox global
  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    switch (periodPreset) {
      case "today":
        return {
          periodStart: currentWindow.open,
          periodEnd: currentWindow.close,
          periodLabel: "Turno actual",
        } as const;
      case "yesterday":
        return {
          periodStart: prevWindow.open,
          periodEnd: prevWindow.close,
          periodLabel: "Turno anterior",
        } as const;
      case "7d":
        return {
          periodStart: start7Windows,
          periodEnd: currentWindow.close,
          periodLabel: "Últimos 7 turnos",
        } as const;
      case "month":
        return {
          periodStart: startOfMonth,
          periodEnd: currentWindow.close,
          periodLabel: "Mes actual",
        } as const;
      case "year":
        return {
          periodStart: startOfYear,
          periodEnd: currentWindow.close,
          periodLabel: "Año actual",
        } as const;
      default:
        return {
          periodStart: start7Windows,
          periodEnd: currentWindow.close,
          periodLabel: "Últimos 7 turnos",
        } as const;
    }
  }, [
    periodPreset,
    currentWindow.open,
    currentWindow.close,
    prevWindow.open,
    prevWindow.close,
    start7Windows,
    startOfMonth,
    startOfYear,
  ]);

  const periodSales = useMemo(
    () =>
      filteredSales.filter((s) => s.date >= periodStart && s.date <= periodEnd),
    [filteredSales, periodStart, periodEnd]
  );
  const periodRevenue = periodSales.reduce((sum, s) => sum + s.total, 0);
  const periodAvgTicketRounded = Math.round(
    periodSales.length > 0 ? periodRevenue / periodSales.length : 0
  );

  // Mapa de costos por producto para cálculos de ganancias
  const costById = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) m.set(String(p.id), Number(p.cost ?? 0));
    return m;
  }, [products]);

  // Ganancias por conjunto de ventas (precio - costo) * cantidad
  // Si no hay costo, se calcula con marginPct: costo = precio * (1 - margen)
  const computeProfit = (subset: Sale[]) => {
    let profit = 0;
    for (const s of subset) {
      for (const it of s.items || []) {
        const qty = Number(it.quantity || 0);
        const unitPrice = Number(it.product?.price || 0);
        const p = (it.product || ({} as Product)) as Product;
        let unitCost: number;
        if (p && p.cost != null && !Number.isNaN(Number(p.cost))) {
          unitCost = Number(p.cost);
        } else if (
          p &&
          p.marginPct != null &&
          !Number.isNaN(Number(p.marginPct))
        ) {
          const m = Math.max(0, Math.min(100, Number(p.marginPct)));
          unitCost = unitPrice * (1 - m / 100);
        } else {
          unitCost = costById.get(String(p?.id)) || 0;
        }
        profit += (unitPrice - unitCost) * qty;
      }
    }
    return profit;
  };

  const profitToday = computeProfit(salesToday);
  const profit7d = computeProfit(sales7d);
  const salesThisMonth = filteredSales.filter(
    (s) => s.date >= startOfMonth && s.date <= currentWindow.close
  );
  const profitMonth = computeProfit(salesThisMonth);
  // Métricas de ganancia para el periodo seleccionado
  const periodProfit = computeProfit(periodSales);
  const globalMarginPct =
    periodRevenue > 0 ? (periodProfit / periodRevenue) * 100 : 0;

  // Nota: KPI de impuestos removido del panel ejecutivo a solicitud
  // Márgenes por periodo
  const marginTodayPct =
    revenueToday > 0 ? (profitToday / revenueToday) * 100 : 0;
  const margin7dPct = revenue7d > 0 ? (profit7d / revenue7d) * 100 : 0;
  const marginPeriodPct =
    periodRevenue > 0 ? (periodProfit / periodRevenue) * 100 : 0;

  // Agregación por producto a partir de las ventas filtradas
  const salesByProduct = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; qty: number; revenue: number }
    >();
    for (const s of periodSales) {
      for (const it of s.items || []) {
        const id = String(it.product?.id ?? "");
        const name = it.product?.name || "(Sin nombre)";
        const qty = Number(it.quantity || 0);
        const revenue = Number(it.product?.price || 0) * qty;
        if (!map.has(id)) map.set(id, { id, name, qty: 0, revenue: 0 });
        const agg = map.get(id)!;
        agg.qty += qty;
        agg.revenue += revenue;
      }
    }
    const arr = Array.from(map.values());
    const desc = [...arr].sort(
      (a, b) => b.qty - a.qty || a.name.localeCompare(b.name, "es")
    );
    const asc = [...arr].sort(
      (a, b) => a.qty - b.qty || a.name.localeCompare(b.name, "es")
    );
    return {
      arr,
      top1: desc[0],
      top5: desc.slice(0, 5),
      bottom5: asc.slice(0, 5),
    };
  }, [periodSales]);

  // Datos para gráficos
  const CHART_COLORS = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7300",
    "#0088fe",
    "#00C49F",
  ];

  // Datos para gráfico de dona: Comparación ingresos por periodo
  const revenueComparisonData = useMemo(() => {
    return [
      { name: periodLabel, value: periodRevenue, color: "#8884d8" },
      { name: "Turno actual", value: revenueToday, color: "#82ca9d" },
    ].filter((d) => d.value > 0);
  }, [periodRevenue, revenueToday, periodLabel]);

  // Datos para gráfico de barras: Ganancias por periodo
  const profitComparisonData = useMemo(() => {
    return [
      {
        name: periodLabel,
        ganancias: periodProfit,
        margen: Math.round(marginPeriodPct),
      },
      {
        name: "7 turnos",
        ganancias: profit7d,
        margen: Math.round(margin7dPct),
      },
      {
        name: "Mes",
        ganancias: profitMonth,
        margen: Math.round(globalMarginPct),
      },
    ];
  }, [
    periodProfit,
    profit7d,
    profitMonth,
    marginPeriodPct,
    margin7dPct,
    globalMarginPct,
    periodLabel,
  ]);

  // Datos para gráfico de barras de productos top
  const topProductsChartData = useMemo(() => {
    return salesByProduct.top5.map((p) => ({
      name: p.name.length > 20 ? p.name.substring(0, 20) + "..." : p.name,
      fullName: p.name,
      unidades: p.qty,
      ingresos: p.revenue,
    }));
  }, [salesByProduct.top5]);

  // Datos para gráfico de KPIs principales
  const kpiData = useMemo(() => {
    return [
      { name: "Ventas", value: periodSales.length },
      { name: "Ticket Prom.", value: periodAvgTicketRounded },
    ];
  }, [periodSales.length, periodAvgTicketRounded]);

  return (
    <div className="space-y-6">
      {/* Toggle para vista de gráficos */}
      <div className="flex items-center justify-end gap-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Ver gráficos</span>
          <Switch checked={showCharts} onCheckedChange={setShowCharts} />
        </label>
      </div>

      {/* Filtros (compacto) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <div>
              <label className="text-xs text-muted-foreground">Desde</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Hasta</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Método de pago
              </label>
              <Select
                value={paymentFilter}
                onValueChange={(v: any) => setPaymentFilter(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="debit">Débito</SelectItem>
                  <SelectItem value="credit">Crédito</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setPaymentFilter("all");
                }}
              >
                <FilterX className="h-4 w-4 mr-2" /> Limpiar
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Mostrando {filteredSales.length} de {sales.length} ventas
          </p>
        </CardContent>
      </Card>

      {/* KPIs compactos (3 tarjetas) o Gráficos según toggle */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {!showCharts ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-xs font-medium">
                  Total Ventas
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select
                    value={periodPreset}
                    onValueChange={(v: any) => setPeriodPreset(v)}
                  >
                    <SelectTrigger className="h-7 w-[140px]">
                      <SelectValue placeholder="Periodo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Turno actual</SelectItem>
                      <SelectItem value="yesterday">Turno anterior</SelectItem>
                      <SelectItem value="7d">Últimos 7 turnos</SelectItem>
                      <SelectItem value="month">Mes actual</SelectItem>
                      <SelectItem value="year">Año actual</SelectItem>
                    </SelectContent>
                  </Select>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{periodSales.length}</div>
                <p className="text-[11px] text-muted-foreground">
                  {periodLabel} • Transacciones registradas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xs font-medium">
                    Ingresos Totales
                  </CardTitle>
                  <Badge variant="outline" className="hidden sm:inline">
                    {Math.round(globalMarginPct)}% margen
                  </Badge>
                </div>
                <div className="ml-auto">
                  <Select
                    value={revenueView}
                    onValueChange={(v: any) =>
                      setRevenueView((v as "revenue" | "profit") || "revenue")
                    }
                  >
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue placeholder="Vista" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Ingreso</SelectItem>
                      <SelectItem value="profit">Ganancia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  $
                  {fmtCLP(
                    revenueView === "revenue" ? periodRevenue : periodProfit
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {revenueView === "revenue"
                    ? `${periodLabel} • Ingresos`
                    : `${periodLabel} • Ganancia real`}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Margen global: {Math.round(globalMarginPct)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-xs font-medium">
                  Ticket Promedio
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  ${fmtCLP(periodAvgTicketRounded)}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {periodLabel} • Valor promedio por venta
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Gráfico: Ventas y Ticket (dona) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-xs font-medium">
                  Ventas vs Ticket
                </CardTitle>
                <Select
                  value={periodPreset}
                  onValueChange={(v: any) => setPeriodPreset(v)}
                >
                  <SelectTrigger className="h-7 w-[140px]">
                    <SelectValue placeholder="Periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Turno actual</SelectItem>
                    <SelectItem value="yesterday">Turno anterior</SelectItem>
                    <SelectItem value="7d">Últimos 7 turnos</SelectItem>
                    <SelectItem value="month">Mes actual</SelectItem>
                    <SelectItem value="year">Año actual</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="pt-2">
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={kpiData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={80}
                      fontSize={11}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip formatter={(value: number) => [value, ""]} />
                    <Bar
                      dataKey="value"
                      fill="#8884d8"
                      fillOpacity={1}
                      radius={[0, 4, 4, 0]}
                      barSize={20}
                      isAnimationActive={false}
                      minPointSize={2}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[11px] text-muted-foreground text-center mt-1">
                  {periodLabel}
                </p>
              </CardContent>
            </Card>

            {/* Gráfico: Ingresos (dona) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-xs font-medium">Ingresos</CardTitle>
                <Badge variant="outline">
                  {Math.round(globalMarginPct)}% margen
                </Badge>
              </CardHeader>
              <CardContent className="pt-0">
                {revenueComparisonData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={revenueComparisonData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="transparent"
                        isAnimationActive={false}
                      >
                        {revenueComparisonData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                            fillOpacity={1}
                            stroke="transparent"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [
                          `$${fmtCLP(value)}`,
                          "Ingresos",
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted-foreground py-6 text-xs">
                    Sin datos
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico: Ticket promedio (gauge-like) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-xs font-medium">
                  Ticket Promedio
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center pt-2">
                <div className="text-3xl font-bold text-primary">
                  ${fmtCLP(periodAvgTicketRounded)}
                </div>
                <div className="w-full mt-3">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (periodAvgTicketRounded / 50000) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {periodLabel}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Fila principal: Periodos, Más vendido, Ganancias */}
      <div className="grid gap-3 lg:grid-cols-3 items-stretch">
        {!showCharts ? (
          <>
            {/* Periodos compactos */}
            <Card className="h-full min-h-[240px]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Ingresos por periodo
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground">
                    {periodLabel}
                  </div>
                  <div className="text-[13px]">{periodSales.length} ventas</div>
                  <div className="text-xl font-bold">
                    ${fmtCLP(periodRevenue)}
                  </div>
                  <Badge variant="outline" className="mt-1">
                    {Math.round(marginPeriodPct)}% margen
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Turno actual
                  </div>
                  <div className="text-[13px]">{salesToday.length} ventas</div>
                  <div className="text-xl font-bold">
                    ${fmtCLP(revenueToday)}
                  </div>
                  <Badge variant="outline" className="mt-1">
                    {Math.round(marginTodayPct)}% margen
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta: Producto más vendido */}
            <Card className="h-full min-h-[240px]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Más vendido
                </CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {salesByProduct.top1 ? (
                  <div className="mb-4">
                    <div className="text-xs text-muted-foreground">
                      Producto más vendido
                    </div>
                    <div className="mt-1 flex flex-wrap items-baseline gap-3">
                      <div className="text-base font-semibold truncate max-w-[60ch]">
                        {salesByProduct.top1.name}
                      </div>
                      <div className="text-muted-foreground">•</div>
                      <div className="text-base">
                        {salesByProduct.top1.qty} unid
                      </div>
                      <div className="text-muted-foreground">•</div>
                      <div className="text-base font-medium">
                        ${fmtCLP(salesByProduct.top1.revenue)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Sin ventas en el periodo seleccionado
                  </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium mb-2">
                      Top 5 productos más vendidos
                    </div>
                    {salesByProduct.top5 && salesByProduct.top5.length > 0 ? (
                      <ol className="space-y-1 text-xs list-decimal list-inside">
                        {salesByProduct.top5.slice(0, 3).map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="truncate max-w-[42ch]">
                              {p.name}
                            </span>
                            <span className="text-muted-foreground">
                              {p.qty} unid
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <div className="text-xs text-muted-foreground">—</div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">
                      5 productos menos vendidos
                    </div>
                    {salesByProduct.bottom5 &&
                    salesByProduct.bottom5.length > 0 ? (
                      <ol className="space-y-1 text-xs list-decimal list-inside">
                        {salesByProduct.bottom5.slice(0, 3).map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="truncate max-w-[42ch]">
                              {p.name}
                            </span>
                            <span className="text-muted-foreground">
                              {p.qty} unid
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <div className="text-xs text-muted-foreground">—</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta: Ganancias Totales */}
            <Card className="h-full min-h-[240px]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">
                    Ganancias Totales
                  </CardTitle>
                  <Badge variant="outline">
                    {Math.round(globalMarginPct)}% margen
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="text-sm text-muted-foreground">
                    {periodLabel}
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    ${fmtCLP(periodProfit)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Últimos 7 turnos
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    ${fmtCLP(profit7d)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Mes actual
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    ${fmtCLP(profitMonth)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Gráfico: Ingresos por periodo (barras comparativas) */}
            <Card className="h-full min-h-[240px]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Ingresos por periodo
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={[
                      {
                        name: periodLabel,
                        ingresos: periodRevenue,
                        ventas: periodSales.length,
                      },
                      {
                        name: "Turno actual",
                        ingresos: revenueToday,
                        ventas: salesToday.length,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis
                      fontSize={10}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === "ingresos" ? `$${fmtCLP(value)}` : value,
                        name === "ingresos" ? "Ingresos" : "Ventas",
                      ]}
                    />
                    <Bar
                      dataKey="ingresos"
                      fill="#8884d8"
                      fillOpacity={1}
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                      minPointSize={2}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico: Top productos (barras horizontales) */}
            <Card className="h-full min-h-[240px]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Top Productos
                </CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {topProductsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart
                      data={topProductsChartData.slice(0, 5)}
                      layout="vertical"
                    >
                      <XAxis type="number" fontSize={10} hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={90}
                        fontSize={10}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          name === "ingresos"
                            ? `$${fmtCLP(value)}`
                            : `${value} unid`,
                          name === "unidades" ? "Unidades" : "Ingresos",
                        ]}
                        labelFormatter={(label) =>
                          topProductsChartData.find((d) => d.name === label)
                            ?.fullName || label
                        }
                      />
                      <Bar
                        dataKey="unidades"
                        fill="#82ca9d"
                        fillOpacity={1}
                        radius={[0, 4, 4, 0]}
                        barSize={14}
                        isAnimationActive={false}
                        minPointSize={2}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted-foreground py-8 text-xs">
                    Sin productos vendidos
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico: Ganancias por periodo (barras) */}
            <Card className="h-full min-h-[240px]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">
                    Ganancias
                  </CardTitle>
                  <Badge variant="outline">
                    {Math.round(globalMarginPct)}% margen
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={profitComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis
                      fontSize={10}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        `$${fmtCLP(value)}`,
                        "Ganancia",
                      ]}
                    />
                    <Bar
                      dataKey="ganancias"
                      fill="#82ca9d"
                      fillOpacity={1}
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                      minPointSize={2}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
