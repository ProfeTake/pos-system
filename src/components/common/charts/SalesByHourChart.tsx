import { useMemo } from "react";
import { UniversalChart } from "./UniversalChart";

interface HourlyStat {
  hour: number;
  salesCount?: number;
  count?: number;
  revenue?: number;
  total?: number;
}

interface SalesByHourChartProps {
  data: HourlyStat[];
  height?: number;
  className?: string;
}

export function SalesByHourChart({ data, height = 280, className }: SalesByHourChartProps) {
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    const hoursMap = new Map<number, HourlyStat>();
    data.forEach((d) => {
      if (typeof d.hour === "number") {
        hoursMap.set(d.hour, d);
      }
    });

    const fullData = [];
    for (let h = 0; h < 24; h++) {
      const hourData = hoursMap.get(h);
      const salesCount = hourData?.salesCount ?? hourData?.count ?? 0;
      const revenue = hourData?.revenue ?? hourData?.total ?? 0;

      fullData.push({
        Hora: `${h.toString().padStart(2, "0")}:00`,
        Ventas: salesCount,
        Ingresos: Math.round(revenue),
      });
    }

    return fullData;
  }, [data]);

  return (
    <UniversalChart
      title="Ventas por Hora"
      data={chartData}
      dataKey="Ingresos"
      secondaryDataKey="Ventas"
      nameKey="Hora"
      height={height}
      className={className}
      defaultType="bar"
      allowedTypes={["bar", "line", "area"]}
      valueFormatter={(v) => `$${v.toLocaleString("es-CL")}`}
      emptyMessage="Sin datos de ventas por hora"
      showLegend={true}
    />
  );
}
