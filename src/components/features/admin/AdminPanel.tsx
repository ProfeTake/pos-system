import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Separator } from "../../ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import type { Product, Sale } from "../../../types";
import ExecutiveDashboard from "./ExecutiveDashboard";
import Settings from "../settings/Settings";
import PromotionsManager from "./PromotionsManager";
import ScheduleControl from "./ScheduleControl";
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
import {
  TrendingUp,
  Tag,
  Clock,
  FileText,
  Settings as SettingsIcon,
  Mail,
  Send,
  Calculator,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  Receipt,
  DollarSign,
  Percent,
  Building2,
  User,
  Save,
  Briefcase,
  MapPin,
  Phone,
  Hash,
} from "lucide-react";
import { promotionsService } from "../../../services/promotions.service";
import { getOperationalWindow } from "../../../utils/businessHours";
import { settingsService } from "../../../services/settings.service";
import { toast } from "sonner";

// Colores para mini-gráficos
const MINI_CHART_COLORS = {
  primary: "#8884d8",
  success: "#82ca9d",
  warning: "#ffc658",
  danger: "#ff7c7c",
};

// Componente para sparkline de ventas (área)
function SalesSparkline({ data }: { data: { value: number }[] }) {
  return (
    <ResponsiveContainer width={50} height={20}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Area
          type="monotone"
          dataKey="value"
          stroke={MINI_CHART_COLORS.primary}
          fill={MINI_CHART_COLORS.primary}
          fillOpacity={0.3}
          strokeWidth={1.5}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Componente para mini donut de promociones
function PromosDonut({ active, paused, expired }: { active: number; paused: number; expired: number }) {
  const data = [
    { name: "Activas", value: active, color: MINI_CHART_COLORS.success },
    { name: "Pausadas", value: paused, color: MINI_CHART_COLORS.warning },
    { name: "Expiradas", value: expired, color: MINI_CHART_COLORS.danger },
  ].filter(d => d.value > 0);
  
  if (data.length === 0) {
    return <div className="w-[20px] h-[20px] rounded-full bg-muted" />;
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

// Componente para mini barras de horario
function ScheduleBars({ isOpen }: { isOpen: boolean }) {
  const data = [
    { h: isOpen ? 80 : 20 },
    { h: isOpen ? 60 : 30 },
    { h: isOpen ? 90 : 15 },
    { h: isOpen ? 70 : 25 },
  ];
  return (
    <ResponsiveContainer width={28} height={20}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Bar
          dataKey="h"
          fill={isOpen ? MINI_CHART_COLORS.success : MINI_CHART_COLORS.warning}
          radius={[1, 1, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function AdminPanel({
  products,
  sales,
}: {
  products: Product[];
  sales: Sale[];
}) {
  const totalVentas = sales.length;
  const ingresosTotales = sales.reduce((s, v) => s + v.total, 0);

  // Estado para promociones (mini-gráfico)
  const [promoStats, setPromoStats] = useState({ active: 0, paused: 0, expired: 0 });
  
  // Estado para horario (mini-gráfico)
  const [isStoreOpen, setIsStoreOpen] = useState(false);

  // Cargar stats de promociones para mini-gráfico
  useEffect(() => {
    (async () => {
      try {
        const promos = await promotionsService.getAll("all");
        const active = promos.filter((p: any) => p.status === "active").length;
        const paused = promos.filter((p: any) => p.status === "paused").length;
        const expired = promos.filter((p: any) => p.status === "expired" || p.status === "soldout").length;
        setPromoStats({ active, paused, expired });
      } catch {
        // Silently fail
      }
    })();
  }, []);

  // Verificar si está en horario
  useEffect(() => {
    try {
      const { open, close } = getOperationalWindow(new Date());
      const now = new Date();
      setIsStoreOpen(now >= open && now <= close);
    } catch {
      setIsStoreOpen(false);
    }
  }, []);

  // Datos para sparkline de ventas (últimos 7 puntos)
  const salesSparkData = useMemo(() => {
    const now = new Date();
    const dayInMs = 24 * 60 * 60 * 1000;
    const points: { value: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * dayInMs);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      
      const daySales = sales.filter(s => {
        const d = new Date(s.date);
        return d >= dayStart && d <= dayEnd;
      });
      points.push({ value: daySales.reduce((sum, s) => sum + s.total, 0) });
    }
    return points;
  }, [sales]);

  // Estado para filtros de exportación (Documentación)
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [previewFormat, setPreviewFormat] = useState<"csv" | "xls" | "pdf">(
    "pdf"
  );
  // Estado para envío a contador
  const [accountantEmail, setAccountantEmail] = useState<string>("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // IVA Chile = 19%
  const IVA_RATE = 0.19;

  // Estado para datos de empresa (declaración IVA)
  const [companyData, setCompanyData] = useState(() => {
    const saved = localStorage.getItem("companyData");
    return saved ? JSON.parse(saved) : {
      rut: "",
      razonSocial: "",
      giro: "",
      direccion: "",
      comuna: "",
      ciudad: "",
      telefono: "",
      email: "",
      representanteLegal: "",
      rutRepresentante: "",
    };
  });
  const [companySaved, setCompanySaved] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companyErrors, setCompanyErrors] = useState<Record<string, string>>({});

  // Validación básica de RUT chileno (módulo 11)
  function validarRut(rut: string) {
    if (!rut) return false;
    const clean = rut.replace(/\.|\s/g, "").toUpperCase();
    const match = clean.match(/^([0-9]+)-([0-9K])$/);
    if (!match) return false;
    const num = match[1];
    const dv = match[2];
    let sum = 0;
    let mul = 2;
    for (let i = num.length - 1; i >= 0; i--) {
      sum += parseInt(num[i], 10) * mul;
      mul = mul === 7 ? 2 : mul + 1;
    }
    const mod = 11 - (sum % 11);
    const calc = mod === 11 ? "0" : mod === 10 ? "K" : String(mod);
    return calc === dv;
  }

  // Formateo de RUT: XX.XXX.XXX-X
  function formatRut(value: string) {
    if (!value) return "";
    let clean = value.replace(/\.|\s/g, "").toUpperCase();
    // Permitir que el usuario escriba parcialmente
    clean = clean.replace(/[^0-9K\-]/g, "");
    // Agregar guion si no existe y hay al menos 2 caracteres
    if (!clean.includes("-") && clean.length >= 2) {
      clean = `${clean.slice(0, -1)}-${clean.slice(-1)}`;
    }
    const parts = clean.split("-");
    if (parts.length !== 2) return clean; // incompleto
    const num = parts[0].replace(/[^0-9]/g, "");
    const dv = parts[1].replace(/[^0-9K]/g, "");
    if (!num) return dv ? `-${dv}` : "";
    // Insertar puntos en el número
    const rev = num.split("").reverse();
    const withDots: string[] = [];
    for (let i = 0; i < rev.length; i++) {
      withDots.push(rev[i]);
      if ((i + 1) % 3 === 0 && i + 1 < rev.length) withDots.push(".");
    }
    const formattedNum = withDots.reverse().join("");
    return dv ? `${formattedNum}-${dv}` : formattedNum;
  }

  useEffect(() => {
    (async () => {
      try {
        const s = await settingsService.getSettings();
        const srv = (s as any)?.companyData;
        if (srv && typeof srv === "object") {
          setCompanyData(srv);
          try { localStorage.setItem("companyData", JSON.stringify(srv)); } catch {}
        }
      } catch {
        // Fallback: ya tenemos localStorage cargado en el estado inicial
      }
    })();
  }, []);

  const handleSaveCompanyData = async () => {
    setCompanyError(null);
    // Validaciones requeridas
    const errs: Record<string, string> = {};
    const required: Array<keyof typeof companyData> = [
      "rut",
      "razonSocial",
      "giro",
      "direccion",
      "comuna",
      "ciudad",
    ];
    required.forEach((f) => {
      if (!String((companyData as any)[f] || "").trim()) {
        errs[f as string] = "Campo requerido";
      }
    });
    if (companyData.rut && !validarRut(companyData.rut)) {
      errs["rut"] = "RUT inválido (formato XX.XXX.XXX-X)";
    }
    if (companyData.email) {
      const ok = /.+@.+\..+/.test(companyData.email);
      if (!ok) errs["email"] = "Email inválido";
    }
    setCompanyErrors(errs);
    if (Object.keys(errs).length) {
      toast.error("Corrige los campos requeridos");
      return;
    }

    try {
      await settingsService.updateSetting("companyData", companyData);
      try { localStorage.setItem("companyData", JSON.stringify(companyData)); } catch {}
      setCompanySaved(true);
      toast.success("Datos de empresa guardados");
      setTimeout(() => setCompanySaved(false), 2000);
    } catch {
      setCompanyError("No se pudo guardar en el servidor");
      toast.error("No se pudo guardar en el servidor");
    }
  };

  const updateCompanyField = (field: string, value: string) => {
    setCompanyData((prev: any) => ({ ...prev, [field]: value }));
    setCompanyErrors((e) => {
      const next = { ...e };
      delete next[field];
      return next;
    });
  };

  // Helpers de exportación (cliente) usando datos locales 'sales'
  const filteredByDate = (arr: Sale[]) => {
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    return arr.filter((s) => {
      const d = new Date(s.date);
      if (from && d < from) return false;
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  };

  const buildCsv = (rows: Array<Array<string | number>>) =>
    rows
      .map((r) =>
        r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");

  // Mapeo legible de métodos de pago (UI/exports)
  const paymentMethodLabel = (code?: string) => {
    const c = (code || "").toLowerCase();
    switch (c) {
      case "cash":
        return "Efectivo";
      case "card":
        return "Tarjeta";
      case "debit":
        return "Débito";
      case "credit":
        return "Crédito";
      case "transfer":
        return "Transferencia";
      case "voucher":
        return "Vale/Documento";
      default:
        return code || "-";
    }
  };

  // Resumen y desglose por método de pago
  const computeSummary = (arr: Sale[]) => {
    const list = filteredByDate(arr);
    const count = list.length;
    const total = list.reduce((acc, s) => acc + (s.total || 0), 0);
    const byPayment = new Map<string, { count: number; total: number }>();
    for (const s of list) {
      const k = s.paymentMethod || "-";
      const curr = byPayment.get(k) || { count: 0, total: 0 };
      curr.count += 1;
      curr.total += s.total || 0;
      byPayment.set(k, curr);
    }
    return { list, count, total, byPayment };
  };

  const handleExportCSV = () => {
    const { list, count, total, byPayment } = computeSummary(sales);
    const rows: Array<Array<string | number>> = [];
    
    // Datos de la empresa
    rows.push(["DATOS DE LA EMPRESA"]);
    rows.push(["RUT", companyData.rut || "-"]);
    rows.push(["Razón Social", companyData.razonSocial || "-"]);
    rows.push(["Giro", companyData.giro || "-"]);
    rows.push(["Dirección", `${companyData.direccion || "-"}, ${companyData.comuna || ""}, ${companyData.ciudad || ""}`]);
    rows.push(["Teléfono", companyData.telefono || "-"]);
    rows.push(["Email", companyData.email || "-"]);
    rows.push(["Representante Legal", companyData.representanteLegal || "-"]);
    rows.push(["RUT Representante", companyData.rutRepresentante || "-"]);
    rows.push([""]);
    
    // Calcular IVA y ganancias
    const ivaDebito = Math.round(total * IVA_RATE / (1 + IVA_RATE));
    const ventasNetas = total - ivaDebito;
    let costoTotal = 0;
    for (const sale of list) {
      for (const item of sale.items || []) {
        costoTotal += (item.product?.cost ?? 0) * item.quantity;
      }
    }
    const ivaCredito = Math.round(costoTotal * IVA_RATE / (1 + IVA_RATE));
    const ivaPorPagar = Math.max(0, ivaDebito - ivaCredito);
    const gananciaBruta = ventasNetas - (costoTotal - ivaCredito);
    
    // Resumen contable
    rows.push(["RESUMEN CONTABLE"]);
    rows.push(["Periodo", `${dateFrom || "inicio"} a ${dateTo || "hoy"}`]);
    rows.push(["Total Ventas (Bruto)", total]);
    rows.push(["IVA Débito Fiscal (19%)", ivaDebito]);
    rows.push(["Ventas Netas", ventasNetas]);
    rows.push(["Costo Mercadería", costoTotal]);
    rows.push(["IVA Crédito Fiscal", ivaCredito]);
    rows.push(["IVA Por Pagar", ivaPorPagar]);
    rows.push(["Ganancia Bruta", gananciaBruta]);
    rows.push(["Número de Transacciones", count]);
    rows.push([""]);
    
    // Desglose por método de pago
    rows.push(["DESGLOSE POR MÉTODO DE PAGO"]);
    rows.push(["Método", "Ventas", "Total"]);
    for (const [method, agg] of byPayment.entries()) {
      rows.push([paymentMethodLabel(method), agg.count, agg.total]);
    }
    rows.push([""]);
    
    // Detalle
    rows.push(["DETALLE DE TRANSACCIONES"]);
    rows.push(["ID", "Fecha", "Total", "Cliente", "Pago", "Items"]);
    for (const s of list) {
      const items = (s.items || [])
        .map((it) => {
          const p = it.product;
          const name = p?.name ?? "(?)";
          const price = p?.price ?? 0;
          return `${name} x${it.quantity} $${price}`;
        })
        .join(" | ");
      rows.push([
        String(s.id),
        new Date(s.date).toLocaleString(),
        String(s.total),
        s.customerName || "-",
        paymentMethodLabel(s.paymentMethod),
        items || "-",
      ]);
    }
    const csv = buildCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const from = dateFrom || "todos";
    const to = dateTo || "todos";
    a.download = `documentacion_ventas_${from}_a_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportXLS = () => {
    // XLS simple (HTML table con mime Excel)
    const { list, count, total, byPayment } = computeSummary(sales);
    
    // Calcular IVA y ganancias
    const ivaDebito = Math.round(total * IVA_RATE / (1 + IVA_RATE));
    const ventasNetas = total - ivaDebito;
    let costoTotal = 0;
    for (const sale of list) {
      for (const item of sale.items || []) {
        costoTotal += (item.product?.cost ?? 0) * item.quantity;
      }
    }
    const ivaCredito = Math.round(costoTotal * IVA_RATE / (1 + IVA_RATE));
    const ivaPorPagar = Math.max(0, ivaDebito - ivaCredito);
    const gananciaBruta = ventasNetas - (costoTotal - ivaCredito);
    
    const breakdownRows = Array.from(byPayment.entries())
      .map(
        ([method, agg]) =>
          `<tr><td>${paymentMethodLabel(method)}</td><td>${agg.count}</td><td>$${agg.total.toLocaleString("es-CL")}</td></tr>`
      )
      .join("");
    const rows = list.map((s) => {
      const items = (s.items || [])
        .map((it) => {
          const p = it.product;
          const name = p?.name ?? "(?)";
          const price = p?.price ?? 0;
          return `${name} x${it.quantity} $${price}`;
        })
        .join(" | ");
      return `<tr>
        <td>${s.id}</td>
        <td>${new Date(s.date).toLocaleString()}</td>
        <td>${s.total}</td>
        <td>${s.customerName || "-"}</td>
        <td>${paymentMethodLabel(s.paymentMethod)}</td>
        <td>${items || "-"}</td>
      </tr>`;
    });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>
      <h1>${companyData.razonSocial || "Empresa"}</h1>
      <table border="1">
        <tbody>
          <tr><td><strong>RUT</strong></td><td>${companyData.rut || "-"}</td></tr>
          <tr><td><strong>Giro</strong></td><td>${companyData.giro || "-"}</td></tr>
          <tr><td><strong>Dirección</strong></td><td>${companyData.direccion || "-"}, ${companyData.comuna || ""}, ${companyData.ciudad || ""}</td></tr>
          <tr><td><strong>Teléfono</strong></td><td>${companyData.telefono || "-"}</td></tr>
          <tr><td><strong>Email</strong></td><td>${companyData.email || "-"}</td></tr>
          <tr><td><strong>Rep. Legal</strong></td><td>${companyData.representanteLegal || "-"} (${companyData.rutRepresentante || "-"})</td></tr>
        </tbody>
      </table>
      <br />
      <h2>Resumen Contable - Periodo ${dateFrom || "inicio"} a ${dateTo || "hoy"}</h2>
      <table border="1">
        <tbody>
          <tr><td>Total Ventas (Bruto)</td><td>$${total.toLocaleString("es-CL")}</td></tr>
          <tr><td>IVA Débito Fiscal (19%)</td><td>$${ivaDebito.toLocaleString("es-CL")}</td></tr>
          <tr><td>Ventas Netas</td><td>$${ventasNetas.toLocaleString("es-CL")}</td></tr>
          <tr><td>Costo Mercadería</td><td>$${costoTotal.toLocaleString("es-CL")}</td></tr>
          <tr><td>IVA Crédito Fiscal</td><td>$${ivaCredito.toLocaleString("es-CL")}</td></tr>
          <tr style="background:#ffeeee;"><td><strong>IVA Por Pagar</strong></td><td><strong>$${ivaPorPagar.toLocaleString("es-CL")}</strong></td></tr>
          <tr style="background:#eeffee;"><td><strong>Ganancia Bruta</strong></td><td><strong>$${gananciaBruta.toLocaleString("es-CL")}</strong></td></tr>
          <tr><td>Transacciones</td><td>${count}</td></tr>
        </tbody>
      </table>
      <br />
      <h3>Desglose por Método de Pago</h3>
      <table border="1">
        <thead><tr><th>Método</th><th>Ventas</th><th>Total</th></tr></thead>
        <tbody>${breakdownRows || "<tr><td colspan=3>-</td></tr>"}</tbody>
      </table>
      <br />
      <h3>Detalle de Transacciones</h3>
      <table border="1">
        <thead><tr><th>ID</th><th>Fecha</th><th>Total</th><th>Cliente</th><th>Pago</th><th>Items</th></tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const from = dateFrom || "todos";
    const to = dateTo || "todos";
    a.download = `documentacion_ventas_${from}_a_${to}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    // Abre una ventana imprimible con resumen básico (el usuario puede "Guardar como PDF")
    const win = window.open("", "_blank");
    if (!win) return;
    const { list, count, total, byPayment } = computeSummary(sales);
    
    // Calcular IVA y ganancias
    const ivaDebito = Math.round(total * IVA_RATE / (1 + IVA_RATE));
    const ventasNetas = total - ivaDebito;
    let costoTotal = 0;
    for (const sale of list) {
      for (const item of sale.items || []) {
        costoTotal += (item.product?.cost ?? 0) * item.quantity;
      }
    }
    const ivaCredito = Math.round(costoTotal * IVA_RATE / (1 + IVA_RATE));
    const ivaPorPagar = Math.max(0, ivaDebito - ivaCredito);
    const gananciaBruta = ventasNetas - (costoTotal - ivaCredito);
    
    const breakdown = Array.from(byPayment.entries())
      .map(
        ([method, agg]) =>
          `<tr><td>${paymentMethodLabel(method)}</td><td>${
            agg.count
          }</td><td>$${agg.total.toLocaleString("es-CL")}</td></tr>`
      )
      .join("");
    const rows = list
      .map(
        (s) => `<tr>
        <td>${s.id}</td>
        <td>${new Date(s.date).toLocaleString()}</td>
        <td>${s.total.toLocaleString("es-CL")}</td>
        <td>${s.customerName || "-"}</td>
        <td>${paymentMethodLabel(s.paymentMethod)}</td>
      </tr>`
      )
      .join("");
    const from = dateFrom || "todos";
    const to = dateTo || "todos";
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8" />
      <title>Documentación de Ventas ${from} a ${to}</title>
      <style>
        body{font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;padding:20px;max-width:800px;margin:0 auto}
        h1{font-size:20px;margin:0 0 4px;color:#333}
        h2{font-size:16px;margin:16px 0 8px;color:#555;border-bottom:1px solid #ddd;padding-bottom:4px}
        h3{font-size:14px;margin:12px 0 6px}
        table{width:100%;border-collapse:collapse;margin-bottom:16px}
        th,td{border:1px solid #ddd;padding:8px;text-align:left}
        th{background:#f5f5f5}
        .company-info{background:#f9f9f9;padding:12px;border-radius:8px;margin-bottom:20px}
        .company-info p{margin:2px 0;font-size:13px}
        .company-name{font-size:18px;font-weight:bold;margin-bottom:8px}
        .highlight-red{background:#fff0f0;font-weight:bold}
        .highlight-green{background:#f0fff0;font-weight:bold}
        .muted{color:#666;font-size:12px}
        .period{background:#e8f4fd;padding:8px 12px;border-radius:4px;margin-bottom:16px}
        @media print{body{padding:10px}.company-info{background:#fff;border:1px solid #ddd}}
      </style>
    </head><body>
      <div class="company-info">
        <div class="company-name">${companyData.razonSocial || "Empresa sin configurar"}</div>
        <p><strong>RUT:</strong> ${companyData.rut || "-"}</p>
        <p><strong>Giro:</strong> ${companyData.giro || "-"}</p>
        <p><strong>Dirección:</strong> ${companyData.direccion || "-"}, ${companyData.comuna || ""}, ${companyData.ciudad || ""}</p>
        <p><strong>Teléfono:</strong> ${companyData.telefono || "-"} | <strong>Email:</strong> ${companyData.email || "-"}</p>
        <p class="muted">Rep. Legal: ${companyData.representanteLegal || "-"} (${companyData.rutRepresentante || "-"})</p>
      </div>
      
      <h1>Informe de Ventas para Declaración</h1>
      <div class="period">Período: ${from} a ${to}</div>
      
      <h2>Resumen Contable</h2>
      <table>
        <tbody>
          <tr><td>Total Ventas (Bruto)</td><td>$${total.toLocaleString("es-CL")}</td></tr>
          <tr><td>IVA Débito Fiscal (19%)</td><td>$${ivaDebito.toLocaleString("es-CL")}</td></tr>
          <tr><td>Ventas Netas</td><td>$${ventasNetas.toLocaleString("es-CL")}</td></tr>
          <tr><td>Costo Mercadería</td><td>$${costoTotal.toLocaleString("es-CL")}</td></tr>
          <tr><td>IVA Crédito Fiscal</td><td>$${ivaCredito.toLocaleString("es-CL")}</td></tr>
          <tr class="highlight-red"><td>IVA Por Pagar</td><td>$${ivaPorPagar.toLocaleString("es-CL")}</td></tr>
          <tr class="highlight-green"><td>Ganancia Bruta</td><td>$${gananciaBruta.toLocaleString("es-CL")}</td></tr>
          <tr><td>Número de Transacciones</td><td>${count}</td></tr>
        </tbody>
      </table>
      
      <h2>Desglose por Método de Pago</h2>
      <table>
        <thead><tr><th>Método</th><th>Ventas</th><th>Total</th></tr></thead>
        <tbody>${breakdown || '<tr><td colspan="3">-</td></tr>'}</tbody>
      </table>
      
      <h2>Detalle de Ventas</h2>
      <table>
        <thead><tr><th>ID</th><th>Fecha</th><th>Total</th><th>Cliente</th><th>Pago</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      
      <p class="muted" style="margin-top:20px;text-align:center">Documento generado el ${new Date().toLocaleString("es-CL")} | Sistema POS</p>
      <script>window.onload = () => window.print();<\/script>
    </body></html>`);
    win.document.close();
  };

  // Datos para vista previa
  const summary = useMemo(
    () => computeSummary(sales),
    [sales, dateFrom, dateTo]
  );
  const csvPreview = useMemo(() => {
    const { list, count, total, byPayment } = summary;
    const rows: Array<Array<string | number>> = [];
    rows.push(["Resumen"]);
    rows.push(["Ventas", count]);
    rows.push(["Monto total", total]);
    rows.push([""]);
    rows.push(["Por método de pago"]);
    rows.push(["Método", "Ventas", "Total"]);
    for (const [method, agg] of byPayment.entries())
      rows.push([paymentMethodLabel(method), agg.count, agg.total]);
    rows.push([""]);
    rows.push(["ID", "Fecha", "Total", "Cliente", "Pago", "Items"]);
    for (const s of list.slice(0, 20)) {
      const items = (s.items || [])
        .map((it) => {
          const p = it.product;
          const name = p?.name ?? "(?)";
          const price = p?.price ?? 0;
          return `${name} x${it.quantity} $${price}`;
        })
        .join(" | ");
      rows.push([
        String(s.id),
        new Date(s.date).toLocaleString(),
        String(s.total),
        s.customerName || "-",
        paymentMethodLabel(s.paymentMethod),
        items || "-",
      ]);
    }
    return buildCsv(rows);
  }, [summary]);

  // Eliminado super admin. Ahora hay pestaña de Configuración.

  // Formato compacto para números
  const fmtCompact = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
    return n.toString();
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="executive" className="w-full">
        {/* Tabs con mini-gráficos — carrusel horizontal en móvil */}
        <TabsList className="inline-flex h-auto gap-1 p-1 w-full overflow-x-auto overflow-y-hidden scrollbar-hide snap-x snap-mandatory md:flex-wrap">
          {/* Ejecutivo - Sparkline de ventas */}
          <TabsTrigger value="executive" className="flex-none md:flex-1 flex items-center justify-center gap-2 px-3 py-2 min-h-[52px] min-w-[120px] snap-start">
            <div className="flex items-center gap-2">
              <SalesSparkline data={salesSparkData} />
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">Ejecutivo</span>
                <span className="text-[10px] text-muted-foreground">${fmtCompact(ingresosTotales)}</span>
              </div>
            </div>
          </TabsTrigger>

          {/* Promociones - Mini donut */}
          <TabsTrigger value="promotions" className="flex-none md:flex-1 flex items-center justify-center gap-2 px-3 py-2 min-h-[52px] min-w-[120px] snap-start">
            <div className="flex items-center gap-2">
              <PromosDonut 
                active={promoStats.active} 
                paused={promoStats.paused} 
                expired={promoStats.expired} 
              />
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">Promociones</span>
                <span className="text-[10px] text-muted-foreground">
                  {promoStats.active} activas
                </span>
              </div>
            </div>
          </TabsTrigger>

          {/* Control de Horario - Mini barras */}
          <TabsTrigger value="schedule" className="flex-none md:flex-1 flex items-center justify-center gap-2 px-3 py-2 min-h-[52px] min-w-[120px] snap-start">
            <div className="flex items-center gap-2">
              <ScheduleBars isOpen={isStoreOpen} />
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">Horario</span>
                <span className={`text-[10px] ${isStoreOpen ? 'text-green-500' : 'text-yellow-500'}`}>
                  {isStoreOpen ? 'Abierto' : 'Cerrado'}
                </span>
              </div>
            </div>
          </TabsTrigger>

          {/* Documentación - Icono con contador */}
          <TabsTrigger value="docs" className="flex-none md:flex-1 flex items-center justify-center gap-2 px-3 py-2 min-h-[52px] min-w-[120px] snap-start">
            <div className="flex items-center gap-2">
              <div className="w-6 h-5 flex items-center justify-center">
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">Docs</span>
                <span className="text-[10px] text-muted-foreground">{summary.count} reg.</span>
              </div>
            </div>
          </TabsTrigger>

          {/* Datos Empresa - Para declaraciones */}
          <TabsTrigger value="company" className="flex-none md:flex-1 flex items-center justify-center gap-2 px-3 py-2 min-h-[52px] min-w-[120px] snap-start">
            <div className="flex items-center gap-2">
              <div className="w-6 h-5 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">Empresa</span>
                <span className="text-[10px] text-muted-foreground">SII / IVA</span>
              </div>
            </div>
          </TabsTrigger>

          {/* Configuración - Icono simple */}
          <TabsTrigger value="settings" className="flex-none md:flex-1 flex items-center justify-center gap-2 px-3 py-2 min-h-[52px] min-w-[120px] snap-start">
            <div className="flex items-center gap-2">
              <div className="w-6 h-5 flex items-center justify-center">
                <SettingsIcon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">Config</span>
                <span className="text-[10px] text-muted-foreground">General</span>
              </div>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executive">
          <ExecutiveDashboard products={products} sales={sales} />
        </TabsContent>
        <TabsContent value="promotions">
          <PromotionsManager products={products} />
        </TabsContent>
        <TabsContent value="schedule">
          <ScheduleControl />
        </TabsContent>
        <TabsContent value="docs">
          <div className="space-y-6">
            {/* Filtros y Acciones - Layout compacto */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="w-5 h-5" />
                  Auditoría Contable y Documentación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  {/* Periodo */}
                  <div className="flex items-end gap-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Desde</label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-36 h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Hasta</label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-36 h-9"
                      />
                    </div>
                  </div>
                  
                  {/* Separador visual */}
                  <div className="hidden md:block h-9 w-px bg-border" />
                  
                  {/* Botones de descarga */}
                  <div className="flex items-end gap-2">
                    <Button variant="default" size="sm" onClick={handleExportPDF}>
                      PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportXLS}>
                      Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportCSV}>
                      CSV
                    </Button>
                  </div>
                  
                  {/* Separador visual */}
                  <div className="hidden md:block h-9 w-px bg-border" />
                  
                  {/* Enviar a contador */}
                  <div className="flex items-end gap-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        Enviar a Contador
                      </label>
                      <div className="flex gap-1">
                        <Input
                          type="email"
                          placeholder="contador@empresa.cl"
                          value={accountantEmail}
                          onChange={(e) => setAccountantEmail(e.target.value)}
                          className="w-48 h-9"
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-9 w-9"
                          disabled={!accountantEmail || emailSending}
                          onClick={() => {
                            setEmailSending(true);
                            setTimeout(() => {
                              setEmailSending(false);
                              setEmailSent(true);
                              setTimeout(() => setEmailSent(false), 3000);
                            }, 1500);
                          }}
                          title="Enviar documentación por correo"
                        >
                          {emailSent ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Send className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Panel de Resumen Contable */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calculator className="w-5 h-5" />
                  Resumen Contable del Periodo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Calcular métricas contables
                  const ventasBrutas = summary.total;
                  const ivaDebito = Math.round(ventasBrutas * IVA_RATE / (1 + IVA_RATE)); // IVA incluido en ventas
                  const ventasNetas = ventasBrutas - ivaDebito;
                  
                  // Calcular costos y ganancia
                  let costoTotal = 0;
                  for (const sale of summary.list) {
                    for (const item of sale.items || []) {
                      const cost = item.product?.cost ?? 0;
                      costoTotal += cost * item.quantity;
                    }
                  }
                  const ivaCredito = Math.round(costoTotal * IVA_RATE / (1 + IVA_RATE));
                  const costosNetos = costoTotal - ivaCredito;
                  const gananciaBruta = ventasNetas - costosNetos;
                  const margenPorcentaje = ventasNetas > 0 ? ((gananciaBruta / ventasNetas) * 100) : 0;
                  const ivaPorPagar = Math.max(0, ivaDebito - ivaCredito);
                  
                  return (
                    <div className="grid lg:grid-cols-3 gap-4">
                      {/* Primera columna: 2 cards */}
                      <div className="grid grid-rows-2 gap-4">
                        {/* Ventas Brutas */}
                        <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/30">
                          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                            <Receipt className="w-4 h-4" />
                            <span className="text-xs font-medium">Ventas Brutas</span>
                          </div>
                          <div className="text-xl font-bold">${ventasBrutas.toLocaleString("es-CL")}</div>
                          <div className="text-[10px] text-muted-foreground">{summary.count} transacciones</div>
                        </div>
                        
                        {/* IVA Débito Fiscal */}
                        <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/30">
                          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                            <Percent className="w-4 h-4" />
                            <span className="text-xs font-medium">IVA Débito Fiscal</span>
                          </div>
                          <div className="text-xl font-bold">${ivaDebito.toLocaleString("es-CL")}</div>
                          <div className="text-[10px] text-muted-foreground">19% sobre ventas netas</div>
                        </div>
                      </div>
                      
                      {/* Segunda columna: 2 cards */}
                      <div className="grid grid-rows-2 gap-4">
                        {/* IVA por Pagar */}
                        <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/30">
                          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                            <DollarSign className="w-4 h-4" />
                            <span className="text-xs font-medium">IVA por Pagar</span>
                          </div>
                          <div className="text-xl font-bold">${ivaPorPagar.toLocaleString("es-CL")}</div>
                          <div className="text-[10px] text-muted-foreground">Débito - Crédito (${ivaCredito.toLocaleString("es-CL")})</div>
                        </div>
                        
                        {/* Ganancia Bruta */}
                        <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/40 border-green-200 dark:border-green-700">
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-300 mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-xs font-medium">Ganancia Bruta</span>
                          </div>
                          <div className="text-xl font-bold text-green-800 dark:text-green-100">${gananciaBruta.toLocaleString("es-CL")}</div>
                          <div className="text-[10px] text-green-600 dark:text-green-300">Margen: {margenPorcentaje.toFixed(1)}%</div>
                        </div>
                      </div>
                      
                      {/* Tercera columna: Tabla de desglose */}
                      <div>
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="border px-3 py-2 text-left">Concepto</th>
                              <th className="border px-3 py-2 text-right">Monto Bruto</th>
                              <th className="border px-3 py-2 text-right">IVA (19%)</th>
                              <th className="border px-3 py-2 text-right">Monto Neto</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border px-3 py-2">Ingresos por Ventas</td>
                              <td className="border px-3 py-2 text-right">${ventasBrutas.toLocaleString("es-CL")}</td>
                              <td className="border px-3 py-2 text-right">${ivaDebito.toLocaleString("es-CL")}</td>
                              <td className="border px-3 py-2 text-right">${ventasNetas.toLocaleString("es-CL")}</td>
                            </tr>
                            <tr>
                              <td className="border px-3 py-2">Costos de Mercadería</td>
                              <td className="border px-3 py-2 text-right">${costoTotal.toLocaleString("es-CL")}</td>
                              <td className="border px-3 py-2 text-right">${ivaCredito.toLocaleString("es-CL")}</td>
                              <td className="border px-3 py-2 text-right">${costosNetos.toLocaleString("es-CL")}</td>
                            </tr>
                            <tr className="font-semibold bg-muted/30">
                              <td className="border px-3 py-2">Utilidad Bruta</td>
                              <td className="border px-3 py-2 text-right">-</td>
                              <td className="border px-3 py-2 text-right text-red-600">${ivaPorPagar.toLocaleString("es-CL")}</td>
                              <td className="border px-3 py-2 text-right text-green-600">${gananciaBruta.toLocaleString("es-CL")}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Sugerencias para el Contador */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  Sugerencias para Auditoría
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex gap-3 p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                    <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Declaración mensual F29</div>
                      <p className="text-xs text-muted-foreground">
                        El IVA por pagar debe declararse mensualmente ante el SII. 
                        Asegúrese de tener todas las facturas de compra para el crédito fiscal.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 p-3 border rounded-lg bg-green-50/50 dark:bg-green-950/20">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Respaldo de transacciones</div>
                      <p className="text-xs text-muted-foreground">
                        Descargue regularmente los informes en Excel para mantener 
                        un respaldo digital de todas las operaciones del negocio.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 p-3 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
                    <Receipt className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Conciliación de métodos de pago</div>
                      <p className="text-xs text-muted-foreground">
                        Verifique que los totales por tarjeta coincidan con los depósitos 
                        bancarios del proveedor de pagos (Transbank, etc.).
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 p-3 border rounded-lg bg-purple-50/50 dark:bg-purple-950/20">
                    <DollarSign className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Control de efectivo</div>
                      <p className="text-xs text-muted-foreground">
                        Compare el total de ventas en efectivo con el cuadre de caja 
                        diario para detectar diferencias a tiempo.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Desglose por Método de Pago */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Tag className="w-5 h-5" />
                  Desglose por Método de Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border px-3 py-2 text-left">Método</th>
                      <th className="border px-3 py-2 text-right">Transacciones</th>
                      <th className="border px-3 py-2 text-right">Total</th>
                      <th className="border px-3 py-2 text-right">% del Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(summary.byPayment.entries()).map(([method, agg]) => (
                      <tr key={method}>
                        <td className="border px-3 py-2">{paymentMethodLabel(method)}</td>
                        <td className="border px-3 py-2 text-right">{agg.count}</td>
                        <td className="border px-3 py-2 text-right">${agg.total.toLocaleString("es-CL")}</td>
                        <td className="border px-3 py-2 text-right">
                          {summary.total > 0 ? ((agg.total / summary.total) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                    {summary.byPayment.size === 0 && (
                      <tr>
                        <td className="border px-3 py-2" colSpan={4}>Sin registros en el rango</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Vista Previa / Detalle de Ventas */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5" />
                  Detalle de Transacciones
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Formato:</span>
                  <Select
                    value={previewFormat}
                    onValueChange={(v) => setPreviewFormat(v as any)}
                  >
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="xls">Excel</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md p-3 bg-muted/30 overflow-auto max-h-96">
                  {previewFormat === "csv" ? (
                    <pre className="text-xs whitespace-pre-wrap">{csvPreview}</pre>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="border px-2 py-1 text-left">ID</th>
                            <th className="border px-2 py-1 text-left">Fecha</th>
                            <th className="border px-2 py-1 text-right">Total</th>
                            <th className="border px-2 py-1 text-left">Cliente</th>
                            <th className="border px-2 py-1 text-left">Pago</th>
                            <th className="border px-2 py-1 text-left">Items</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.list.slice(0, 50).map((s) => {
                            const items = (s.items || [])
                              .map((it) => `${it.product?.name ?? "(?)"} x${it.quantity} $${it.product?.price ?? 0}`)
                              .join(" | ");
                            return (
                              <tr key={s.id}>
                                <td className="border px-2 py-1">{String(s.id)}</td>
                                <td className="border px-2 py-1">{new Date(s.date).toLocaleString()}</td>
                                <td className="border px-2 py-1 text-right">${s.total.toLocaleString("es-CL")}</td>
                                <td className="border px-2 py-1">{s.customerName || "-"}</td>
                                <td className="border px-2 py-1">{paymentMethodLabel(s.paymentMethod)}</td>
                                <td className="border px-2 py-1">{items || "-"}</td>
                              </tr>
                            );
                          })}
                          {summary.list.length === 0 && (
                            <tr>
                              <td className="border px-2 py-1" colSpan={6}>Sin registros en el rango</td>
                            </tr>
                          )}
                          {summary.list.length > 50 && (
                            <tr>
                              <td className="border px-2 py-1 text-center text-muted-foreground" colSpan={6}>
                                ... y {summary.list.length - 50} registros más. Descargue el archivo para ver todos.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Tab de Datos de Empresa para declaraciones */}
        <TabsContent value="company">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Datos de la Empresa
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Información requerida para declaraciones de IVA y documentos tributarios ante el SII.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Datos principales */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Identificación Tributaria
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">RUT Empresa *</label>
                      <Input
                        placeholder="12.345.678-9"
                        value={companyData.rut}
                        onChange={(e) => updateCompanyField("rut", formatRut(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Formato: XX.XXX.XXX-X</p>
                      {companyErrors.rut && (
                        <p className="text-xs text-destructive mt-1">{companyErrors.rut}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">Razón Social *</label>
                      <Input
                        placeholder="Mi Empresa SpA"
                        value={companyData.razonSocial}
                        onChange={(e) => updateCompanyField("razonSocial", e.target.value)}
                      />
                      {companyErrors.razonSocial && (
                        <p className="text-xs text-destructive mt-1">{companyErrors.razonSocial}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Giro Comercial *</label>
                    <Input
                      placeholder="Venta al por menor de alimentos y bebidas"
                      value={companyData.giro}
                      onChange={(e) => updateCompanyField("giro", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Actividad económica principal según SII</p>
                    {companyErrors.giro && (
                      <p className="text-xs text-destructive mt-1">{companyErrors.giro}</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Dirección */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Dirección Comercial
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium">Dirección *</label>
                      <Input
                        placeholder="Av. Principal 1234, Local 5"
                        value={companyData.direccion}
                        onChange={(e) => updateCompanyField("direccion", e.target.value)}
                      />
                      {companyErrors.direccion && (
                        <p className="text-xs text-destructive mt-1">{companyErrors.direccion}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">Comuna *</label>
                      <Input
                        placeholder="Providencia"
                        value={companyData.comuna}
                        onChange={(e) => updateCompanyField("comuna", e.target.value)}
                      />
                      {companyErrors.comuna && (
                        <p className="text-xs text-destructive mt-1">{companyErrors.comuna}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Ciudad *</label>
                      <Input
                        placeholder="Santiago"
                        value={companyData.ciudad}
                        onChange={(e) => updateCompanyField("ciudad", e.target.value)}
                      />
                      {companyErrors.ciudad && (
                        <p className="text-xs text-destructive mt-1">{companyErrors.ciudad}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">Teléfono</label>
                      <Input
                        placeholder="+56 9 1234 5678"
                        value={companyData.telefono}
                        onChange={(e) => updateCompanyField("telefono", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Contacto y Representante */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Representante Legal
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Nombre Completo</label>
                      <Input
                        placeholder="Juan Pérez González"
                        value={companyData.representanteLegal}
                        onChange={(e) => updateCompanyField("representanteLegal", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">RUT Representante</label>
                      <Input
                        placeholder="11.222.333-4"
                        value={companyData.rutRepresentante}
                        onChange={(e) => updateCompanyField("rutRepresentante", formatRut(e.target.value))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email de Contacto</label>
                    <Input
                      type="email"
                      placeholder="contacto@miempresa.cl"
                      value={companyData.email}
                      onChange={(e) => updateCompanyField("email", e.target.value)}
                    />
                    {companyErrors.email && (
                      <p className="text-xs text-destructive mt-1">{companyErrors.email}</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Botón guardar */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    * Campos requeridos para documentos tributarios
                  </p>
                  <Button onClick={handleSaveCompanyData} className="gap-2">
                    {companySaved ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Guardado
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Guardar Datos
                      </>
                    )}
                  </Button>
                </div>
                {companyError && (
                  <p className="text-xs text-destructive mt-2">{companyError}</p>
                )}
              </CardContent>
            </Card>

            {/* Información adicional para el contador */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  Información para Declaraciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex gap-3 p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                    <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Formulario 29 (F29)</div>
                      <p className="text-xs text-muted-foreground">
                        Declaración mensual de IVA. Se presenta hasta el día 12 de cada mes 
                        con los movimientos del mes anterior.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 p-3 border rounded-lg bg-green-50/50 dark:bg-green-950/20">
                    <Receipt className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Libro de Ventas</div>
                      <p className="text-xs text-muted-foreground">
                        Registro de todas las ventas con boletas y facturas emitidas.
                        Se genera automáticamente desde la sección de Documentación.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 p-3 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
                    <DollarSign className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">IVA Débito vs Crédito</div>
                      <p className="text-xs text-muted-foreground">
                        El IVA a pagar es la diferencia entre el IVA de ventas (débito) 
                        y el IVA de compras (crédito fiscal).
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 p-3 border rounded-lg bg-purple-50/50 dark:bg-purple-950/20">
                    <Phone className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Mesa de Ayuda SII</div>
                      <p className="text-xs text-muted-foreground">
                        Teléfono: 600 390 0000. Horario: Lunes a Viernes 8:30 a 18:00.
                        Web: www.sii.cl
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Settings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
