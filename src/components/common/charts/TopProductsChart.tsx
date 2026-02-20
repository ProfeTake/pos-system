import { useMemo } from "react";
import { UniversalChart } from "./UniversalChart";

interface ProductData {
  name: string;
  totalQuantity?: number;
  quantity?: number;
  totalRevenue?: number;
  revenue?: number;
  totalProfit?: number;
}

interface TopProductsChartProps {
  data: ProductData[];
  title?: string;
  limit?: number;
  height?: number;
  className?: string;
}

export function TopProductsChart({
  data,
  title = "Productos Más Vendidos",
  limit = 8,
  height = 280,
  className,
}: TopProductsChartProps) {
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    const sorted = [...data]
      .map((item) => {
        const revenue = item.totalRevenue ?? item.revenue ?? 0;
        const quantity = item.totalQuantity ?? item.quantity ?? 0;
        return {
          ...item,
          _revenue: revenue,
          _quantity: quantity,
        };
      })
      .sort((a, b) => b._revenue - a._revenue)
      .slice(0, limit);

    return sorted.map((item) => ({
      Producto: item.name.length > 15 ? item.name.substring(0, 15) + "..." : item.name,
      Ingresos: Math.round(item._revenue),
      Cantidad: item._quantity,
    }));
  }, [data, limit]);

  return (
    <UniversalChart
      title={title}
      data={chartData}
      dataKey="Ingresos"
      secondaryDataKey="Cantidad"
      nameKey="Producto"
      height={height}
      className={className}
      defaultType="bar"
      allowedTypes={["bar", "pie"]}
      valueFormatter={(v) => `$${v.toLocaleString("es-CL")}`}
      emptyMessage="Sin datos de productos"
      showLegend={true}
    />
  );
}
