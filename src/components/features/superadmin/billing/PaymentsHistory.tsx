/**
 * Payments History
 * Historial de pagos de todos los tenants
 */

import { useState } from "react";
import {
  Receipt,
  Search,
  Download,
  Building2,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  ExternalLink,
  RefreshCw,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

interface Payment {
  id: string;
  tenant: string;
  amount: number;
  status: "succeeded" | "failed" | "pending" | "refunded";
  method: string;
  description: string;
  createdAt: Date;
  invoiceUrl?: string;
}

const mockPayments: Payment[] = [
  {
    id: "pay_1",
    tenant: "Botillería Punto 3",
    amount: 29990,
    status: "succeeded",
    method: "•••• 4242",
    description: "Suscripción Profesional - Enero 2024",
    createdAt: new Date(),
    invoiceUrl: "#",
  },
  {
    id: "pay_2",
    tenant: "Minimarket Don Luis",
    amount: 14990,
    status: "failed",
    method: "•••• 1234",
    description: "Suscripción Básica - Enero 2024",
    createdAt: new Date(Date.now() - 86400000),
  },
  {
    id: "pay_3",
    tenant: "Licorería El Sol",
    amount: 49990,
    status: "succeeded",
    method: "•••• 5678",
    description: "Suscripción Empresarial - Enero 2024",
    createdAt: new Date(Date.now() - 172800000),
    invoiceUrl: "#",
  },
  {
    id: "pay_4",
    tenant: "Botillería El Norte",
    amount: 29990,
    status: "pending",
    method: "Transferencia",
    description: "Suscripción Profesional - Enero 2024",
    createdAt: new Date(Date.now() - 259200000),
  },
  {
    id: "pay_5",
    tenant: "Botillería Punto 3",
    amount: 29990,
    status: "succeeded",
    method: "•••• 4242",
    description: "Suscripción Profesional - Diciembre 2023",
    createdAt: new Date(Date.now() - 2592000000),
    invoiceUrl: "#",
  },
  {
    id: "pay_6",
    tenant: "Mini Store Central",
    amount: 14990,
    status: "refunded",
    method: "•••• 9999",
    description: "Suscripción Básica - Diciembre 2023",
    createdAt: new Date(Date.now() - 2678400000),
  },
];

const statusConfig: Record<
  string,
  { bg: string; text: string; icon: typeof CheckCircle; label: string }
> = {
  succeeded: {
    bg: "bg-green-500/20",
    text: "text-green-400",
    icon: CheckCircle,
    label: "Completado",
  },
  failed: {
    bg: "bg-red-500/20",
    text: "text-red-400",
    icon: XCircle,
    label: "Fallido",
  },
  pending: {
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    icon: Clock,
    label: "Pendiente",
  },
  refunded: {
    bg: "bg-slate-500/20",
    text: "text-slate-400",
    icon: RefreshCw,
    label: "Reembolsado",
  },
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(
    amount
  );

const formatDate = (date: Date) =>
  date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function PaymentsHistory() {
  const [payments] = useState(mockPayments);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: payments
      .filter((p) => p.status === "succeeded")
      .reduce((acc, p) => acc + p.amount, 0),
    succeeded: payments.filter((p) => p.status === "succeeded").length,
    failed: payments.filter((p) => p.status === "failed").length,
    pending: payments.filter((p) => p.status === "pending").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Historial de Pagos</h1>
          <p className="text-slate-400 mt-1">
            Registro de todos los pagos procesados
          </p>
        </div>
        <button
          onClick={() => toast.success("Exportando historial...")}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          <Download className="size-4" />
          Exportar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-sm text-slate-400">Total Recaudado</p>
          <p className="text-xl font-bold text-white">
            {formatCurrency(stats.total)}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-sm text-slate-400">Pagos Exitosos</p>
          <p className="text-xl font-bold text-green-400">{stats.succeeded}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-sm text-slate-400">Pagos Fallidos</p>
          <p className="text-xl font-bold text-red-400">{stats.failed}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-sm text-slate-400">Pendientes</p>
          <p className="text-xl font-bold text-amber-400">{stats.pending}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por negocio o descripción..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">Todos los estados</option>
          <option value="succeeded">Completados</option>
          <option value="failed">Fallidos</option>
          <option value="pending">Pendientes</option>
          <option value="refunded">Reembolsados</option>
        </select>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">Todo el tiempo</option>
          <option value="today">Hoy</option>
          <option value="week">Esta semana</option>
          <option value="month">Este mes</option>
          <option value="year">Este año</option>
        </select>
      </div>

      {/* Payments List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">
                Transacción
              </th>
              <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">
                Negocio
              </th>
              <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">
                Método
              </th>
              <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">
                Estado
              </th>
              <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase">
                Monto
              </th>
              <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase">
                Fecha
              </th>
              <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredPayments.map((payment) => {
              const statusConf = statusConfig[payment.status];
              const StatusIcon = statusConf.icon;

              return (
                <tr key={payment.id} className="hover:bg-slate-800/50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-mono text-sm">
                        {payment.id}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {payment.description}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Building2 className="size-4 text-slate-500" />
                      {payment.tenant}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-400">
                      <CreditCard className="size-4" />
                      {payment.method}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConf.bg} ${statusConf.text}`}
                    >
                      <StatusIcon className="size-3" />
                      {statusConf.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`font-medium ${
                        payment.status === "refunded"
                          ? "text-slate-400 line-through"
                          : "text-white"
                      }`}
                    >
                      {formatCurrency(payment.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm text-slate-400">
                      {formatDate(payment.createdAt)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {payment.invoiceUrl && (
                      <button
                        onClick={() =>
                          window.open(payment.invoiceUrl, "_blank")
                        }
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Ver factura"
                      >
                        <ExternalLink className="size-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PaymentsHistory;
