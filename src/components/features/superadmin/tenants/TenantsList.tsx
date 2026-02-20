/**
 * Tenants List
 * Lista de todos los negocios con búsqueda, filtros y acciones
 */

import { useState, useEffect } from "react";
import {
  Building2,
  Search,
  Filter,
  MoreHorizontal,
  Play,
  Pause,
  Eye,
  Mail,
  MapPin,
  Users,
  Package,
  DollarSign,
  RefreshCw,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  superadminService,
  type Tenant,
} from "../../../../services/superadmin.service";
import { toast } from "sonner";

interface TenantsListProps {
  onViewTenant: (tenantId: number) => void;
}

// Formateo de moneda CLP
const formatCLP = (amount: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  active: {
    label: "Activo",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: <CheckCircle className="size-3" />,
  },
  suspended: {
    label: "Suspendido",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: <XCircle className="size-3" />,
  },
  trial: {
    label: "Prueba",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: <Clock className="size-3" />,
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    icon: <XCircle className="size-3" />,
  },
};

export function TenantsList({ onViewTenant }: TenantsListProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);

  useEffect(() => {
    loadTenants();
  }, [statusFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadTenants();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const response = await superadminService.getTenants({
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchTerm || undefined,
        page,
        limit: 10,
      });
      setTenants(response.tenants);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error("Error loading tenants:", error);
      toast.error("Error al cargar negocios");
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (tenant: Tenant) => {
    try {
      await superadminService.suspendTenant(
        tenant.id,
        "Suspendido desde panel admin"
      );
      toast.success(`${tenant.name} suspendido`);
      loadTenants();
    } catch (error) {
      toast.error("Error al suspender");
    }
    setActionMenuOpen(null);
  };

  const handleReactivate = async (tenant: Tenant) => {
    try {
      await superadminService.reactivateTenant(tenant.id);
      toast.success(`${tenant.name} reactivado`);
      loadTenants();
    } catch (error) {
      toast.error("Error al reactivar");
    }
    setActionMenuOpen(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Negocios</h1>
          <p className="text-slate-400 mt-1">
            Gestiona todos los negocios registrados en la plataforma
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="size-4" />
          Nuevo Negocio
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, email o slug..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="suspended">Suspendidos</option>
            <option value="trial">En prueba</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>

        {/* Refresh */}
        <button
          onClick={loadTenants}
          className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Negocio
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Plan
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Métricas
                </th>
                <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <RefreshCw className="size-6 animate-spin mx-auto text-slate-500" />
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No se encontraron negocios
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="hover:bg-slate-800/50 transition-colors"
                  >
                    {/* Negocio */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-lg bg-slate-800 flex items-center justify-center">
                          <Building2 className="size-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {tenant.name}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Mail className="size-3" />
                              {tenant.email}
                            </span>
                            {tenant.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="size-3" />
                                {tenant.city}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          statusConfig[tenant.status]?.color
                        }`}
                      >
                        {statusConfig[tenant.status]?.icon}
                        {statusConfig[tenant.status]?.label}
                      </span>
                    </td>

                    {/* Plan */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white">
                          {tenant.subscription?.planName || "-"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {tenant.subscription?.nextBillingDate
                            ? `Próx. cobro: ${new Date(
                                tenant.subscription.nextBillingDate
                              ).toLocaleDateString("es-CL")}`
                            : "-"}
                        </p>
                      </div>
                    </td>

                    {/* Métricas */}
                    <td className="px-6 py-4">
                      {tenant.metrics ? (
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span
                            className="flex items-center gap-1"
                            title="Ventas"
                          >
                            <DollarSign className="size-3" />
                            {tenant.metrics.totalSales}
                          </span>
                          <span
                            className="flex items-center gap-1"
                            title="Productos"
                          >
                            <Package className="size-3" />
                            {tenant.metrics.totalProducts}
                          </span>
                          <span
                            className="flex items-center gap-1"
                            title="Usuarios"
                          >
                            <Users className="size-3" />
                            {tenant.metrics.activeUsers}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4 text-right">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActionMenuOpen(
                              actionMenuOpen === tenant.id ? null : tenant.id
                            )
                          }
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>

                        {actionMenuOpen === tenant.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActionMenuOpen(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 py-1">
                              <button
                                onClick={() => {
                                  onViewTenant(tenant.id);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                              >
                                <Eye className="size-4" />
                                Ver detalles
                              </button>
                              {tenant.status === "suspended" ? (
                                <button
                                  onClick={() => handleReactivate(tenant)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-400 hover:bg-slate-700"
                                >
                                  <Play className="size-4" />
                                  Reactivar
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSuspend(tenant)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-slate-700"
                                >
                                  <Pause className="size-4" />
                                  Suspender
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
            <p className="text-sm text-slate-400">
              Página {page} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TenantsList;
