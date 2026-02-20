import { useMemo } from "react";
import { UniversalChart } from "./UniversalChart";

interface CategoryStat {
  category: string;
  totalQuantity?: number;
  quantity?: number;
  totalRevenue?: number;
  revenue?: number;
  totalProfit?: number;
}

interface CategoryChartProps {
  data: CategoryStat[];
  height?: number;
  className?: string;
}

export function CategoryChart({ data, height = 280, className }: CategoryChartProps) {
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    return data
      .map((item) => {
        const revenue = item.totalRevenue ?? item.revenue ?? 0;
        const quantity = item.totalQuantity ?? item.quantity ?? 0;
        return {
          Categoría: item.category || "Sin categoría",
          Ingresos: Math.round(revenue),
          Cantidad: quantity,
        };
      })
      .filter((item) => item.Ingresos > 0)
      .sort((a, b) => b.Ingresos - a.Ingresos)
      .slice(0, 8);
  }, [data]);

  return (
    <UniversalChart
      title="Distribución por Categoría"
      data={chartData}
      dataKey="Ingresos"
      nameKey="Categoría"
      height={height}
      className={className}
      defaultType="pie"
      allowedTypes={["pie", "bar"]}
      valueFormatter={(v) => `$${v.toLocaleString("es-CL")}`}
      emptyMessage="Sin datos de categorías"
      showLegend={true}
    />
  );
}
