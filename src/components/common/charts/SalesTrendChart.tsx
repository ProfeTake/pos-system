import { useMemo } from "react";
import { UniversalChart } from "./UniversalChart";

interface SalesTrendData {
  date: string;
  salesCount?: number;
  count?: number;
  revenue?: number;
  total?: number;
  avgTicket?: number;
}

interface SalesTrendChartProps {
  data: SalesTrendData[];
  type?: "line" | "area";
  height?: number;
  className?: string;
}

export function SalesTrendChart({
  data,
  type = "area",
  height = 280,
  className,
}: SalesTrendChartProps) {
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    return data.map((item) => {
      const revenue = item.revenue ?? item.total ?? 0;
      const salesCount = item.salesCount ?? item.count ?? 0;
      const avgTicket = item.avgTicket ?? (salesCount > 0 ? revenue / salesCount : 0);

      return {
        fecha: new Date(item.date).toLocaleDateString("es-CL", {
          month: "short",
          day: "numeric",
        }),
        Ingresos: Math.round(revenue),
        "Ticket Promedio": Math.round(avgTicket),
      };
    });
  }, [data]);

  return (
    <UniversalChart
      title="Tendencia de Ventas"
      data={chartData}
      dataKey="Ingresos"
      secondaryDataKey="Ticket Promedio"
      nameKey="fecha"
      height={height}
      className={className}
      defaultType={type === "line" ? "line" : "area"}
      allowedTypes={["area", "line", "bar"]}
      valueFormatter={(v) => `$${v.toLocaleString("es-CL")}`}
      emptyMessage="Sin datos de ventas en el período"
      showLegend={true}
    />
  );
}
