import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import {
  TrendingUp,
  Package,
  DollarSign,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Calendar,
  TrendingDown,
  AlertTriangle,
  Clock,
  CreditCard,
  Wallet,
  Banknote,
  Building,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from "lucide-react";
import { Button } from "../../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Product } from "../../../types";
import {
  SalesTrendChart,
  CategoryChart,
  SalesByHourChart,
  TopProductsChart,
} from "../../common/charts";
import { Badge } from "../../ui/badge";
import { toast } from "sonner";
import { API_BASE } from "../../../lib/api";
import { salesService } from "../../../services/sales.service";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

interface DashboardProps {
  products: Product[];
  onReviewCritical?: () => void;
}

type Period = "today" | "week" | "month" | "year";

// Colores para mini-gráficos
const MINI_CHART_COLORS = {
  primary: "#8884d8",
  success: "#82ca9d",
  warning: "#ffc658",
  danger: "#ff7c7c",
  info: "#00C49F",
};

// Componente para sparkline de ventas (área)
function SalesSparkline({ data }: { data: { value: number }[] }) {
  if (!data || data.length === 0) {
    return <div className="w-[50px] h-[20px] bg-muted/30 rounded" />;
  }
  return (
    <ResponsiveContainer width={50} height={20}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Area
          type="monotone"
          dataKey="value"
          stroke={MINI_CHART_COLORS.success}
          fill={MINI_CHART_COLORS.success}
          fillOpacity={0.3}
          strokeWidth={1.5}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Componente para mini donut de inventario
function InventoryDonut({ ok, warning, critical }: { ok: number; warning: number; critical: number }) {
  const data = [
    { name: "OK", value: ok, color: MINI_CHART_COLORS.success },
    { name: "Advertencia", value: warning, color: MINI_CHART_COLORS.warning },
    { name: "Crítico", value: critical, color: MINI_CHART_COLORS.danger },
  ].filter(d => d.value > 0);
  
  if (data.length === 0) {
    return <div className="w-[24px] h-[24px] rounded-full bg-muted" />;
  }
  
  return (
    <ResponsiveContainer width={24} height={24}>
      <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={6}
          outerRadius={10}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

// Componente para mini barras de categorías
function CategoryBars({ data }: { data: { value: number }[] }) {
  if (!data || data.length === 0) {
    return <div className="w-[32px] h-[20px] bg-muted/30 rounded" />;
  }
  return (
    <ResponsiveContainer width={32} height={20}>
      <BarChart data={data.slice(0, 4)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Bar
          dataKey="value"
          fill={MINI_CHART_COLORS.primary}
          radius={[1, 1, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Componente para mini línea de actividad
function ActivityLine({ data }: { data: { value: number }[] }) {
  if (!data || data.length === 0) {
    return <div className="w-[50px] h-[20px] bg-muted/30 rounded" />;
  }
  return (
    <ResponsiveContainer width={50} height={20}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Area
          type="monotone"
          dataKey="value"
          stroke={MINI_CHART_COLORS.info}
          fill={MINI_CHART_COLORS.info}
          fillOpacity={0.2}
          strokeWidth={1.5}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Iconos para métodos de pago
const paymentIcons: Record<string, React.ReactNode> = {
  cash: <Banknote className="size-5" />,
  debit: <CreditCard className="size-5" />,
  credit: <CreditCard className="size-5" />,
  transfer: <Building className="size-5" />,
};

export function Dashboard({ products, onReviewCritical }: DashboardProps) {
  const [period, setPeriod] = useState<Period>("week");
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("resumen");

  // Analytics data
  const [metrics, setMetrics] = useState<any>(null);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [salesByHour, setSalesByHour] = useState<any[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [restockPredictions, setRestockPredictions] = useState<any[]>([]);

  const activos = products.filter((p) => p.estado !== "DESHABILITADO");
  const lowStockProducts = activos.filter((p) => p.stock <= p.minStock);
  const NEAR_FACTOR = 1.2;
  const nearCriticalProducts = activos.filter(
    (p) =>
      p.stock > p.minStock && p.stock <= Math.ceil(p.minStock * NEAR_FACTOR)
  );
  const totalProducts = activos.length;
  const totalStockValue = activos.reduce(
    (sum, p) => sum + p.stock * p.price,
    0
  );
  const avgStockLevel =
    totalProducts > 0
      ? activos.reduce(
          (sum, p) => sum + (p.minStock > 0 ? p.stock / p.minStock : 1) * 100,
          0
        ) / totalProducts
      : 0;

  const categoryStats = activos.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = { count: 0, value: 0 };
    }
    acc[product.category].count += product.stock;
    acc[product.category].value += product.stock * product.price;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  // Refs para control de estado y prevenir llamadas duplicadas
  const fetchingRef = React.useRef(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const mountedRef = React.useRef(true);

  // Cleanup al desmontar
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchAnalytics = React.useCallback(async () => {
    // Evitar llamadas simultáneas
    if (fetchingRef.current || !mountedRef.current) return;

    // Cancelar petición anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    fetchingRef.current = true;

    setLoading(true);
    try {
      const trendDaysByPeriod: Record<Period, number> = {
        today: 1,
        week: 7,
        month: 30,
        year: 365,
      };
      const trendDays = trendDaysByPeriod[period] ?? 30;

      // Ejecutar en paralelo (más rápido) y con AbortSignal real
      const [
        metricsRes,
        trendRes,
        hourlyRes,
        comparisonRes,
        restockRes,
      ] = await Promise.allSettled([
        salesService.getMetrics(period, { signal: controller.signal }),
        salesService.getSalesTrend(trendDays, { signal: controller.signal }),
        salesService.getSalesByHour(period, { signal: controller.signal }),
        salesService.getPeriodComparison(period, { signal: controller.signal }),
        salesService.getRestockPredictions(30, { signal: controller.signal }),
      ]);

      if (controller.signal.aborted || !mountedRef.current) return;

      const anyFulfilled =
        metricsRes.status === "fulfilled" ||
        trendRes.status === "fulfilled" ||
        hourlyRes.status === "fulfilled" ||
        comparisonRes.status === "fulfilled" ||
        restockRes.status === "fulfilled";

      if (metricsRes.status === "fulfilled") {
        const metricsData = metricsRes.value as any;
        // Verificar si el endpoint retornó notFound (404)
        if (metricsData?.notFound) {
          setMetrics(null);
        } else {
          setMetrics(metricsData);
        }
      } else {
        console.error("Error fetching metrics:", metricsRes.reason);
        setMetrics(null);
      }

      if (trendRes.status === "fulfilled") {
        const trendData = trendRes.value as any;
        setSalesTrend(trendData?.trend || []);
      } else {
        console.error("Error fetching sales trend:", trendRes.reason);
        setSalesTrend([]);
      }

      if (hourlyRes.status === "fulfilled") {
        const hourlyData = hourlyRes.value as any;
        setSalesByHour(hourlyData?.hourlyStats || []);
      } else {
        console.error("Error fetching sales by hour:", hourlyRes.reason);
        setSalesByHour([]);
      }

      if (comparisonRes.status === "fulfilled") {
        const comparisonData = comparisonRes.value as any;
        setComparison(comparisonData?.comparison);
      } else {
        console.error("Error fetching period comparison:", comparisonRes.reason);
        setComparison(null);
      }

      if (restockRes.status === "fulfilled") {
        const restockData = restockRes.value as any;
        setRestockPredictions(restockData?.predictions || []);
      } else {
        console.error("Error fetching restock predictions:", restockRes.reason);
        setRestockPredictions([]);
      }

      if (!anyFulfilled) {
        toast.error("Error al cargar analíticas");
      }
      setLastUpdate(new Date());
    } catch (error: any) {
      // Ignorar errores de abort
      if (error?.name === "AbortError" || controller.signal.aborted) return;
      if (!mountedRef.current) return;
      console.error("Error fetching analytics:", error);
      toast.error(error.message || "Error al cargar analíticas");
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();

    // Auto-refresh cada 5 minutos
    const interval = setInterval(() => {
      if (mountedRef.current) {
        fetchAnalytics();
      }
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      // Cancelar petición pendiente al desmontar o cambiar period
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchAnalytics]);

  const periodLabels: Record<Period, string> = {
    today: "Hoy",
    week: "Esta semana",
    month: "Este mes",
    year: "Este año",
  };

  // Datos para mini-gráficos en tabs
  const salesSparkData = useMemo(() => {
    if (!salesTrend || salesTrend.length === 0) return [];
    return salesTrend.slice(-7).map(d => ({ value: d.revenue || d.total || 0 }));
  }, [salesTrend]);

  const inventoryStats = useMemo(() => {
    const ok = activos.filter(p => p.stock > Math.ceil(p.minStock * NEAR_FACTOR)).length;
    const warning = nearCriticalProducts.length;
    const critical = lowStockProducts.length;
    return { ok, warning, critical };
  }, [activos, nearCriticalProducts, lowStockProducts]);

  const categorySparkData = useMemo(() => {
    if (!metrics?.categoryStats) return [];
    // categoryStats del backend: { category, totalQuantity, totalRevenue }
    return metrics.categoryStats
      .slice(0, 5)
      .map((c: any) => ({ value: c.totalRevenue ?? c.revenue ?? c.totalQuantity ?? c.quantity ?? 0 }));
  }, [metrics?.categoryStats]);

  const hourlySparkData = useMemo(() => {
    if (!salesByHour || salesByHour.length === 0) return [];
    // hourlyStats del backend: { hour, salesCount, revenue }
    return salesByHour.map((h) => ({ value: h.revenue ?? h.total ?? h.totalRevenue ?? 0 }));
  }, [salesByHour]);

  // Formato compacto para números
  const fmtCompact = (n: number) => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
    return `$${n}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Vista general del inventario y métricas importantes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="year">Este año</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchAnalytics()}
            disabled={loading}
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
            <Clock className="size-3" />
            {lastUpdate.toLocaleTimeString("es-CL", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>

      {/* Tabs con mini-gráficos */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          {/* Resumen - Sparkline de ventas */}
          <TabsTrigger value="resumen" className="flex items-center gap-2 px-3 py-2">
            <div className="flex items-center gap-2">
              <SalesSparkline data={salesSparkData} />
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">Resumen</span>
                <span className="text-[10px] text-muted-foreground">
                  {fmtCompact(metrics?.sales?.totalRevenue || 0)}
                </span>
              </div>
            </div>
          </TabsTrigger>

          {/* Ventas - Mini gráfico de tendencia */}
          <TabsTrigger value="ventas" className="flex items-center gap-2 px-3 py-2">
            <div className="flex items-center gap-2">
              <ActivityLine data={salesSparkData} />
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">Ventas</span>
                <span className="text-[10px] text-muted-foreground">
                  {metrics?.sales?.totalSales || 0} trans.
                </span>
              </div>
            </div>
          </TabsTrigger>

          {/* Inventario - Mini donut */}
          <TabsTrigger value="inventario" className="flex items-center gap-2 px-3 py-2">
            <div className="flex items-center gap-2">
              <InventoryDonut 
                ok={inventoryStats.ok} 
                warning={inventoryStats.warning} 
                critical={inventoryStats.critical} 
              />
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium flex items-center gap-1">
                  <Package className="size-3 text-muted-foreground" />
                  Inventario
                </span>
                <span className={`text-[10px] ${inventoryStats.critical > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {inventoryStats.critical > 0 ? `${inventoryStats.critical} críticos` : `${totalProducts} prod.`}
                </span>
              </div>
            </div>
          </TabsTrigger>

          {/* Análisis - Mini barras de categorías */}
          <TabsTrigger value="analisis" className="flex items-center gap-2 px-3 py-2">
            <div className="flex items-center gap-2">
              <CategoryBars data={categorySparkData} />
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium flex items-center gap-1">
                  <BarChart3 className="size-3 text-muted-foreground" />
                  Análisis
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {Object.keys(categoryStats).length} categ.
                </span>
              </div>
            </div>
          </TabsTrigger>
        </TabsList>

        {/* TAB: Resumen */}
        <TabsContent value="resumen" className="space-y-4 mt-4">
          {/* Métricas Principales - Bento Grid 4 columnas (compacto) */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 h-[140px] flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Productos
                </CardTitle>
                <Package className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <div className="text-xl font-bold">{totalProducts}</div>
                <p className="text-xs text-muted-foreground mt-1">En inventario</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 h-[140px] flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Stock</CardTitle>
                <DollarSign className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <div className="text-xl font-bold">
                  ${totalStockValue.toLocaleString("es-CL")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Valor inventario
                </p>
              </CardContent>
            </Card>

            <Card
              className={`bg-gradient-to-br from-card to-card/80 h-[140px] flex flex-col ${
                lowStockProducts.length > 0
                  ? "border-destructive/50 dark:border-[#ff2d55]/50"
                  : nearCriticalProducts.length > 0
                  ? "border-amber-400/50"
                  : "border-border/50"
              }`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stock Crítico</CardTitle>
                <AlertTriangle
                  className={`size-4 ${
                    lowStockProducts.length > 0
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                />
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <div
                  className={`text-xl font-bold ${
                    lowStockProducts.length > 0 ? "text-destructive" : ""
                  }`}
                >
                  {lowStockProducts.length}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground mt-1">Bajo mínimo</p>
                  {(lowStockProducts.length > 0 ||
                    nearCriticalProducts.length > 0) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onReviewCritical}
                      className="h-6 text-xs px-2"
                    >
                      Ver
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 h-[140px] flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nivel Stock</CardTitle>
                <TrendingUp className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <div className="text-xl font-bold">{avgStockLevel.toFixed(0)}%</div>
                <p className="text-xs text-muted-foreground mt-1">Sobre mínimo</p>
              </CardContent>
            </Card>
          </div>

          {/* Métricas de Ventas - Bento Grid 3 columnas */}
          {metrics?.sales && (
            <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
              <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 relative overflow-hidden h-[160px] flex flex-col">
                <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--chart-1)]/10 rounded-full -mr-10 -mt-10" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Ventas {periodLabels[period]}
                  </CardTitle>
                  <Calendar className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                  <div className="text-xl font-bold">
                    {metrics.sales.totalSales}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">Transacciones</p>
                    {comparison && comparison.changes.salesCount !== 0 && (
                      <div
                        className={`flex items-center gap-1 text-xs ${
                          comparison.changes.salesCount > 0
                            ? "text-green-500"
                            : "text-destructive"
                        }`}
                      >
                        {comparison.changes.salesCount > 0 ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )}
                        {Math.abs(comparison.changes.salesCount).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 relative overflow-hidden h-[160px] flex flex-col">
                <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--chart-2)]/10 rounded-full -mr-10 -mt-10" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Ingresos {periodLabels[period]}
                  </CardTitle>
                  <DollarSign className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                  <div className="text-xl font-bold">
                    $
                    {Math.round(metrics.sales.totalRevenue).toLocaleString("es-CL")}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">Ingresos brutos</p>
                    {comparison && comparison.changes.revenue !== 0 && (
                      <div
                        className={`flex items-center gap-1 text-xs ${
                          comparison.changes.revenue > 0
                            ? "text-green-500"
                            : "text-destructive"
                        }`}
                      >
                        {comparison.changes.revenue > 0 ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )}
                        {Math.abs(comparison.changes.revenue).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 relative overflow-hidden h-[160px] flex flex-col">
                <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--chart-3)]/10 rounded-full -mr-10 -mt-10" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Ticket Promedio
                  </CardTitle>
                  <TrendingUp className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                  <div className="text-xl font-bold">
                    ${Math.round(metrics.sales.avgTicket).toLocaleString("es-CL")}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">Por transacción</p>
                    {comparison && comparison.changes.avgTicket !== 0 && (
                      <div
                        className={`flex items-center gap-1 text-xs ${
                          comparison.changes.avgTicket > 0
                            ? "text-green-500"
                            : "text-destructive"
                        }`}
                      >
                        {comparison.changes.avgTicket > 0 ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )}
                        {Math.abs(comparison.changes.avgTicket).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* TAB: Ventas */}
        <TabsContent value="ventas" className="space-y-4 mt-4">
          {/* Gráficos de Ventas */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <SalesTrendChart
              data={salesTrend.length > 0 ? salesTrend : []}
              height={300}
              className="h-[350px]"
            />
            <TopProductsChart
              data={metrics?.topProducts || []}
              title="Productos Más Vendidos"
              limit={8}
              height={300}
              className="h-[350px]"
            />
          </div>

          {/* Productos más rentables */}
          <TopProductsChart
            data={metrics?.topMargin || []}
            title="Productos Más Rentables"
            limit={8}
            height={300}
            className="h-[350px]"
          />
        </TabsContent>

        {/* TAB: Inventario */}
        <TabsContent value="inventario" className="space-y-4 mt-4">
          {/* Predicciones de Reabastecimiento */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Zap className="size-5 text-[var(--chart-3)]" />
                <CardTitle className="text-base">
                  Predicción de Reabastecimiento
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Productos que necesitarán stock pronto
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {restockPredictions.length > 0 ? (
                <div className="space-y-2 pr-1 max-h-[400px] overflow-y-auto">
                  {restockPredictions.slice(0, 12).map((pred) => (
                    <div
                      key={pred.id}
                      className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                    >
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {pred.name}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Stock: {pred.stock}</span>
                          <span>
                            Venta/día:{" "}
                            {Number(pred.avgDailySales || 0).toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-2 shrink-0">
                        {pred.daysUntilReorder != null &&
                        pred.daysUntilReorder <= 7 ? (
                          <Badge variant="destructive" className="text-xs">
                            {pred.daysUntilReorder <= 0
                              ? "¡Ahora!"
                              : `${pred.daysUntilReorder}d`}
                          </Badge>
                        ) : pred.daysUntilEmpty != null &&
                          pred.daysUntilEmpty <= 14 ? (
                          <Badge variant="secondary" className="text-xs">
                            {pred.daysUntilEmpty}d
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            OK
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">
                    Sin predicciones disponibles
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Productos Sin Movimiento */}
          {metrics?.stagnantProducts && metrics.stagnantProducts.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="size-5 text-muted-foreground" />
                  <CardTitle className="text-base">
                    Productos Sin Movimiento (30 días)
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Productos con stock pero sin ventas recientes
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {metrics.stagnantProducts.slice(0, 9).map((prod: any) => (
                    <div
                      key={prod.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{prod.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {prod.category}
                        </p>
                      </div>
                      <div className="text-right ml-2 shrink-0">
                        <p className="font-medium text-sm">
                          ${Math.round(prod.inventoryValue).toLocaleString("es-CL")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {prod.stock} uds
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: Análisis */}
        <TabsContent value="analisis" className="space-y-4 mt-4">
          {/* Categorías y Horarios */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <CategoryChart
              data={metrics?.categoryStats || []}
              height={300}
              className="h-[350px]"
            />
            <SalesByHourChart
              data={salesByHour.length > 0 ? salesByHour : []}
              height={300}
              className="h-[350px]"
            />
          </div>

          {/* Métodos de Pago */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="size-5 text-[var(--chart-1)]" />
                <CardTitle className="text-base">Métodos de Pago</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Distribución {periodLabels[period].toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {metrics?.paymentMethods && metrics.paymentMethods.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {metrics.paymentMethods.map((method: any, index: number) => {
                    const methodLabels: Record<string, string> = {
                      cash: "Efectivo",
                      debit: "Débito",
                      credit: "Crédito",
                      transfer: "Transferencia",
                    };
                    const colors = [
                      "var(--chart-1)",
                      "var(--chart-2)",
                      "var(--chart-4)",
                      "var(--chart-5)",
                    ];
                    return (
                      <div
                        key={method.paymentMethod}
                        className="p-3 rounded-lg bg-muted/30 border border-border/50 relative overflow-hidden"
                      >
                        <div
                          className="absolute top-0 right-0 w-12 h-12 rounded-full opacity-20 -mr-4 -mt-4"
                          style={{
                            backgroundColor: colors[index % colors.length],
                          }}
                        />
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            style={{ color: colors[index % colors.length] }}
                          >
                            {paymentIcons[method.paymentMethod] || (
                              <CreditCard className="size-5" />
                            )}
                          </span>
                          <span className="font-medium text-sm">
                            {methodLabels[method.paymentMethod] ||
                              method.paymentMethod}
                          </span>
                        </div>
                        <div className="text-lg font-bold">
                          ${Math.round(method.total).toLocaleString("es-CL")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {method.count} transacciones
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Sin datos de pagos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
