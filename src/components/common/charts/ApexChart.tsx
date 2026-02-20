// @ts-nocheck
import { useEffect, useState } from "react";
import type { ApexOptions } from "apexcharts";

// Wrapper seguro para react-apexcharts con import dinámico (evita errores de default export)
// Uso:
// <ApexChart type="bar" height={320} options={opts} series={series} />

type ApexChartProps = {
  options: ApexOptions;
  series: any[];
  type:
    | "line"
    | "area"
    | "bar"
    | "histogram"
    | "pie"
    | "donut"
    | "radialBar"
    | "scatter"
    | "bubble"
    | "heatmap"
    | "candlestick"
    | "radar"
    | "polarArea"
    | string;
  height?: number | string;
  width?: number | string;
  [key: string]: any;
};

export default function ApexChart(props: ApexChartProps) {
  const [Comp, setComp] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    // Import dinámico para tomar default o el módulo entero (según packaging)
    import("react-apexcharts")
      .then((mod) => {
        const C = (mod as any).default ?? (mod as any);
        if (mounted) setComp(() => C);
      })
      .catch((err) => {
        console.error("Error cargando react-apexcharts:", err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!Comp) {
    return (
      <div className="text-xs text-muted-foreground">Cargando gráfico…</div>
    );
  }

  // Pasamos todas las props directamente al componente cargado
  return <Comp {...props} />;
}
