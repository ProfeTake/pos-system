import { useState, useMemo, useEffect } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  AreaChart as AreaChartIcon,
  ChevronDown,
} from "lucide-react";

// Paleta de colores que funciona bien en ambos temas
const CHART_COLORS = [
  "#3b82f6", // Azul
  "#22c55e", // Verde
  "#f59e0b", // Amarillo/Naranja
  "#ef4444", // Rojo
  "#8b5cf6", // Púrpura
  "#06b6d4", // Cyan
  "#ec4899", // Rosa
  "#14b8a6", // Teal
];

type ChartType = "bar" | "line" | "area" | "pie";

interface DataPoint {
  [key: string]: string | number;
}

interface UniversalChartProps {
  title: string;
  data: DataPoint[];
  dataKey: string;
  nameKey: string;
  secondaryDataKey?: string;
  height?: number;
  className?: string;
  defaultType?: ChartType;
  allowedTypes?: ChartType[];
  valueFormatter?: (value: number) => string;
  emptyMessage?: string;
  showLegend?: boolean;
}

const chartTypeIcons: Record<ChartType, React.ReactNode> = {
  bar: <BarChart3 className="size-4" />,
  line: <LineChartIcon className="size-4" />,
  area: <AreaChartIcon className="size-4" />,
  pie: <PieChartIcon className="size-4" />,
};

const chartTypeLabels: Record<ChartType, string> = {
  bar: "Barras",
  line: "Líneas",
  area: "Área",
  pie: "Pastel",
};

// Hook para detectar tema oscuro
function useThemeColors() {
  const [colors, setColors] = useState({
    text: "#666666",
    axis: "#cccccc",
    grid: "#e5e5e5",
  });

  useEffect(() => {
    const updateColors = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setColors({
        text: isDark ? "#a1a1aa" : "#52525b",
        axis: isDark ? "#3f3f46" : "#d4d4d8",
        grid: isDark ? "#27272a" : "#f4f4f5",
      });
    };

    updateColors();

    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return colors;
}

export function UniversalChart({
  title,
  data,
  dataKey,
  nameKey,
  secondaryDataKey,
  height = 280,
  className = "",
  defaultType = "bar",
  allowedTypes = ["bar", "line", "area", "pie"],
  valueFormatter = (v) => v.toLocaleString("es-CL"),
  emptyMessage = "Sin datos disponibles",
  showLegend = true,
}: UniversalChartProps) {
  const [chartType, setChartType] = useState<ChartType>(defaultType);
  const themeColors = useThemeColors();

  // Filtrar y validar datos
  const validData = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      if (import.meta.env.DEV) {
        console.debug(`[UniversalChart:${title}] No data array provided`);
      }
      return [];
    }
    
    const filtered = data.filter(
      (item) =>
        item[nameKey] !== undefined &&
        item[dataKey] !== undefined &&
        !isNaN(Number(item[dataKey]))
    );
    
    if (import.meta.env.DEV) {
      console.debug(`[UniversalChart:${title}] Data validation:`, {
        inputLength: data.length,
        validLength: filtered.length,
        dataKey,
        nameKey,
        sampleInput: data[0],
        sampleOutput: filtered[0],
      });
    }
    
    return filtered;
  }, [data, dataKey, nameKey, title]);

  const hasData = validData.length > 0;
  const hasSecondary = secondaryDataKey && validData.some((d) => d[secondaryDataKey] !== undefined);

  // Calcular el máximo para ajustar escala
  const maxValue = useMemo(() => {
    if (!hasData) return 100;
    const values = validData.map((d) => Number(d[dataKey]) || 0);
    if (hasSecondary) {
      values.push(...validData.map((d) => Number(d[secondaryDataKey!]) || 0));
    }
    const max = Math.max(...values);
    return max > 0 ? max : 100;
  }, [validData, dataKey, secondaryDataKey, hasData, hasSecondary]);

  // Estado vacío
  if (!hasData) {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent
          className="flex items-center justify-center flex-col gap-2"
          style={{ height }}
        >
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  // Datos para pie chart
  const pieData = useMemo(() => {
    return validData.map((item, index) => ({
      name: String(item[nameKey]),
      value: Number(item[dataKey]) || 0,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [validData, dataKey, nameKey]);

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="rounded-lg border bg-popover text-popover-foreground p-3 shadow-md" style={{ minWidth: 140 }}>
        <p className="font-medium text-sm mb-2">{label || payload[0]?.name}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span
              className="size-3 rounded-full shrink-0"
              style={{ backgroundColor: entry.color || entry.fill || entry.stroke }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">{valueFormatter(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  // Renderizar gráfico
  const renderChart = () => {
    const commonProps = {
      data: validData,
      margin: { top: 10, right: 20, left: 0, bottom: 5 },
    };

    const axisProps = {
      tick: { fill: themeColors.text, fontSize: 11 },
      axisLine: { stroke: themeColors.axis },
      tickLine: false,
    };

    const formatYAxis = (value: number) => {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
      return value.toString();
    };

    // ID único para gradientes
    const gradientId = title.replace(/\s/g, "-");

    switch (chartType) {
      case "pie":
        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              isAnimationActive={false}
              label={({ percent }) => {
                const pct = percent ?? 0;
                return pct > 0.05 ? `${(pct * 100).toFixed(0)}%` : "";
              }}
              labelLine={false}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {showLegend && (
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                formatter={(value) => <span style={{ color: themeColors.text }}>{value}</span>}
              />
            )}
          </PieChart>
        );

      case "area":
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id={`grad-1-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.6} />
                <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id={`grad-2-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS[1]} stopOpacity={0.6} />
                <stop offset="95%" stopColor={CHART_COLORS[1]} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
            <XAxis dataKey={nameKey} {...axisProps} />
            <YAxis {...axisProps} width={55} domain={[0, Math.ceil(maxValue * 1.15)]} tickFormatter={formatYAxis} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span style={{ color: themeColors.text }}>{value}</span>} />}
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={CHART_COLORS[0]}
              strokeOpacity={1}
              fill={`url(#grad-1-${gradientId})`}
              fillOpacity={1}
              strokeWidth={2}
              isAnimationActive={false}
              name={dataKey}
            />
            {hasSecondary && (
              <Area
                type="monotone"
                dataKey={secondaryDataKey}
                stroke={CHART_COLORS[1]}
                strokeOpacity={1}
                fill={`url(#grad-2-${gradientId})`}
                fillOpacity={1}
                strokeWidth={2}
                isAnimationActive={false}
                name={secondaryDataKey}
              />
            )}
          </AreaChart>
        );

      case "line":
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
            <XAxis dataKey={nameKey} {...axisProps} />
            <YAxis {...axisProps} width={55} domain={[0, Math.ceil(maxValue * 1.15)]} tickFormatter={formatYAxis} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span style={{ color: themeColors.text }}>{value}</span>} />}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={CHART_COLORS[0]}
              strokeOpacity={1}
              strokeWidth={2}
              isAnimationActive={false}
              dot={{ fill: CHART_COLORS[0], r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              name={dataKey}
            />
            {hasSecondary && (
              <Line
                type="monotone"
                dataKey={secondaryDataKey}
                stroke={CHART_COLORS[1]}
                strokeOpacity={1}
                strokeWidth={2}
                isAnimationActive={false}
                dot={{ fill: CHART_COLORS[1], r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
                name={secondaryDataKey}
              />
            )}
          </LineChart>
        );

      case "bar":
      default:
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} vertical={false} />
            <XAxis dataKey={nameKey} {...axisProps} />
            <YAxis {...axisProps} width={55} domain={[0, Math.ceil(maxValue * 1.15)]} tickFormatter={formatYAxis} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span style={{ color: themeColors.text }}>{value}</span>} />}
            <Bar
              dataKey={dataKey}
              fill={CHART_COLORS[0]}
              fillOpacity={1}
              isAnimationActive={false}
              radius={[4, 4, 0, 0]}
              name={dataKey}
            />
            {hasSecondary && (
              <Bar
                dataKey={secondaryDataKey}
                fill={CHART_COLORS[1]}
                fillOpacity={1}
                isAnimationActive={false}
                radius={[4, 4, 0, 0]}
                name={secondaryDataKey}
              />
            )}
          </BarChart>
        );
    }
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {allowedTypes.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  {chartTypeIcons[chartType]}
                  <span className="hidden sm:inline">{chartTypeLabels[chartType]}</span>
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {allowedTypes.map((type) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => setChartType(type)}
                    className={chartType === type ? "bg-accent" : ""}
                  >
                    <span className="mr-2">{chartTypeIcons[type]}</span>
                    {chartTypeLabels[type]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
