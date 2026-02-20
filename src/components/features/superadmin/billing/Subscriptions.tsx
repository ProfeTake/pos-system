/**
 * Subscriptions Management
 * Gestión de suscripciones de todos los tenants
 */

import { useState } from "react";
import {
  CreditCard,
  Search,
  Filter,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Mail,
  Ban,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";

interface Subscription {
  id: number;
  tenant: string;
  plan: "basic" | "professional" | "enterprise";
  status: "active" | "past_due" | "cancelled" | "trial";
  amount: number;
  billingCycle: "monthly" | "yearly";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt?: Date;
  paymentMethod?: string;
}

const mockSubscriptions: Subscription[] = [
  {
    id: 1,
    tenant: "Botillería Punto 3",
    plan: "professional",
    status: "active",
    amount: 29990,
    billingCycle: "monthly",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    paymentMethod: "•••• 4242",
  },
  {
    id: 2,
    tenant: "Minimarket Don Luis",
    plan: "basic",
    status: "past_due",
    amount: 14990,
    billingCycle: "monthly",
    currentPeriodStart: new Date(Date.now() - 15 * 86400000),
    currentPeriodEnd: new Date(Date.now() - 5 * 86400000),
    paymentMethod: "•••• 1234",
  },
  {
    id: 3,
    tenant: "Licorería El Sol",
    plan: "enterprise",
    status: "active",
    amount: 49990,
    billingCycle: "monthly",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    paymentMethod: "•••• 5678",
  },
  {
    id: 4,
    tenant: "Botillería El Norte",
    plan: "professional",
    status: "trial",
    amount: 29990,
    billingCycle: "monthly",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 14 * 86400000),
    trialEndsAt: new Date(Date.now() + 7 * 86400000),
  },
  {
    id: 5,
    tenant: "Mini Store Central",
    plan: "basic",
    status: "cancelled",
    amount: 14990,
    billingCycle: "monthly",
    currentPeriodStart: new Date(Date.now() - 30 * 86400000),
    currentPeriodEnd: new Date(),
  },
];

const planColors: Record<string, { bg: string; text: string }> = {
  basic: { bg: "bg-slate-500/20", text: "text-slate-400" },
  professional: { bg: "bg-blue-500/20", text: "text-blue-400" },
  enterprise: { bg: "bg-purple-500/20", text: "text-purple-400" },
};

const statusConfig: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  active: { bg: "bg-green-500/20", text: "text-green-400", label: "Activa" },
  past_due: {
    bg: "bg-red-500/20",
    text: "text-red-400",
    label: "Pago pendiente",
  },
  cancelled: {
    bg: "bg-slate-500/20",
    text: "text-slate-400",
    label: "Cancelada",
  },
  trial: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Prueba" },
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
  });

export function Subscriptions() {
  const [subscriptions] = useState(mockSubscriptions);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  const filteredSubs = subscriptions.filter((sub) => {
    const matchesSearch = sub.tenant
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    const matchesPlan = planFilter === "all" || sub.plan === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const stats = {
    mrr: subscriptions
      .filter((s) => s.status === "active")
      .reduce((acc, s) => acc + s.amount, 0),
    active: subscriptions.filter((s) => s.status === "active").length,
    pastDue: subscriptions.filter((s) => s.status === "past_due").length,
    trial: subscriptions.filter((s) => s.status === "trial").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Suscripciones</h1>
        <p className="text-slate-400 mt-1">
          Gestiona las suscripciones de todos los negocios
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <DollarSign className="size-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">MRR</p>
              <p className="text-xl font-bold text-white">
                {formatCurrency(stats.mrr)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <CheckCircle className="size-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Activas</p>
              <p className="text-xl font-bold text-white">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertCircle className="size-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Pago Pendiente</p>
              <p className="text-xl font-bold text-white">{stats.pastDue}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Clock className="size-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">En Prueba</p>
              <p className="text-xl font-bold text-white">{stats.trial}</p>
            </div>
          </div>
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
            placeholder="Buscar por negocio..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="past_due">Pago pendiente</option>
          <option value="trial">En prueba</option>
          <option value="cancelled">Canceladas</option>
        </select>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">Todos los planes</option>
          <option value="basic">Básico</option>
          <option value="professional">Profesional</option>
          <option value="enterprise">Empresarial</option>
        </select>
      </div>

      {/* Subscriptions List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="divide-y divide-slate-800">
          {filteredSubs.map((sub) => {
            const planColor = planColors[sub.plan];
            const statusConf = statusConfig[sub.status];
            const daysRemaining = Math.ceil(
              (sub.currentPeriodEnd.getTime() - Date.now()) / 86400000
            );

            return (
              <div key={sub.id} className="px-6 py-4 hover:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-slate-800 flex items-center justify-center">
                      <Building2 className="size-6 text-slate-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="text-white font-medium">{sub.tenant}</p>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${planColor.bg} ${planColor.text}`}
                        >
                          {sub.plan}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${statusConf.bg} ${statusConf.text}`}
                        >
                          {statusConf.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <CreditCard className="size-3" />
                          {sub.paymentMethod || "Sin método"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          Vence: {formatDate(sub.currentPeriodEnd)}
                          {daysRemaining > 0 && daysRemaining <= 7 && (
                            <span className="text-amber-400 ml-1">
                              ({daysRemaining} días)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">
                        {formatCurrency(sub.amount)}
                      </p>
                      <p className="text-xs text-slate-500">
                        /{sub.billingCycle === "monthly" ? "mes" : "año"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {sub.status === "past_due" && (
                        <button
                          onClick={() =>
                            toast.success("Recordatorio de pago enviado")
                          }
                          className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Enviar recordatorio"
                        >
                          <Mail className="size-4" />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          toast.success("Abriendo editor de suscripción...")
                        }
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Editar suscripción"
                      >
                        <Edit2 className="size-4" />
                      </button>
                      {sub.status !== "cancelled" && (
                        <button
                          onClick={() => toast.success("Suscripción cancelada")}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Cancelar suscripción"
                        >
                          <Ban className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Subscriptions;
