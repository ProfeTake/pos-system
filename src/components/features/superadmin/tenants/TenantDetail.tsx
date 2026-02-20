/**
 * Tenant Detail
 * Vista detallada de un negocio con usuarios, métricas y acciones
 */

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  Package,
  DollarSign,
  Activity,
  CreditCard,
  Clock,
  Play,
  Pause,
  Key,
  Trash2,
  Edit,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
} from "lucide-react";
import {
  superadminService,
  type Tenant,
  type SubscriptionPlan,
} from "../../../../services/superadmin.service";
import { toast } from "sonner";

interface TenantDetailProps {
  tenantId: number;
  onBack: () => void;
}

// Formateo de moneda CLP
const formatCLP = (amount: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (date: string | Date | null) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

// Mock users for tenant (in production: fetch from API)
const mockTenantUsers = [
  {
    id: 1,
    username: "admin",
    fullName: "Administrador",
    role: "admin",
    lastLogin: new Date(),
  },
  {
    id: 2,
    username: "vendedor1",
    fullName: "Juan Pérez",
    role: "vendedor",
    lastLogin: new Date(Date.now() - 86400000),
  },
  {
    id: 3,
    username: "vendedor2",
    fullName: "María García",
    role: "vendedor",
    lastLogin: new Date(Date.now() - 172800000),
  },
];

export function TenantDetail({ tenantId, onBack }: TenantDetailProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tenantData, plansData] = await Promise.all([
        superadminService.getTenantById(tenantId),
        superadminService.getPlans(),
      ]);
      setTenant(tenantData);
      setNotes(tenantData.internalNotes || "");
      setPlans(plansData);
    } catch (error) {
      console.error("Error loading tenant:", error);
      toast.error("Error al cargar datos del negocio");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!tenant) return;
    setSavingNotes(true);
    try {
      await superadminService.updateTenantNotes(tenant.id, notes);
      toast.success("Notas guardadas");
    } catch (error) {
      toast.error("Error al guardar notas");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSuspend = async () => {
    if (!tenant) return;
    try {
      await superadminService.suspendTenant(tenant.id, suspendReason);
      toast.success("Negocio suspendido");
      setShowSuspendDialog(false);
      loadData();
    } catch (error) {
      toast.error("Error al suspender");
    }
  };

  const handleReactivate = async () => {
    if (!tenant) return;
    try {
      await superadminService.reactivateTenant(tenant.id);
      toast.success("Negocio reactivado");
      loadData();
    } catch (error) {
      toast.error("Error al reactivar");
    }
  };

  const handleChangePlan = async () => {
    if (!tenant || !selectedPlanId) return;
    try {
      await superadminService.changeTenantPlan(tenant.id, selectedPlanId);
      toast.success("Plan actualizado");
      setShowPlanDialog(false);
      loadData();
    } catch (error) {
      toast.error("Error al cambiar plan");
    }
  };

  const handleResetPassword = async () => {
    // En producción: llamar al API para reset de password
    toast.success("Se ha enviado un email con la nueva contraseña temporal");
    setShowResetPasswordDialog(false);
    setSelectedUserId(null);
  };

  if (loading || !tenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="size-8 animate-spin text-slate-500" />
      </div>
    );
  }

  const statusConfig: Record<
    string,
    { label: string; color: string; bgColor: string }
  > = {
    active: {
      label: "Activo",
      color: "text-green-400",
      bgColor: "bg-green-500/20",
    },
    suspended: {
      label: "Suspendido",
      color: "text-red-400",
      bgColor: "bg-red-500/20",
    },
    trial: {
      label: "Prueba",
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
    },
    cancelled: {
      label: "Cancelado",
      color: "text-slate-400",
      bgColor: "bg-slate-500/20",
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                statusConfig[tenant.status]?.bgColor
              } ${statusConfig[tenant.status]?.color}`}
            >
              {statusConfig[tenant.status]?.label}
            </span>
          </div>
          <p className="text-slate-400 mt-1">/{tenant.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          {tenant.status === "suspended" ? (
            <button
              onClick={handleReactivate}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Play className="size-4" />
              Reactivar
            </button>
          ) : (
            <button
              onClick={() => setShowSuspendDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Pause className="size-4" />
              Suspender
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Información de Contacto
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-slate-800 flex items-center justify-center">
                  <Mail className="size-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-white">{tenant.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-slate-800 flex items-center justify-center">
                  <Phone className="size-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Teléfono</p>
                  <p className="text-white">{tenant.phone || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-slate-800 flex items-center justify-center">
                  <MapPin className="size-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Ubicación</p>
                  <p className="text-white">
                    {tenant.city}, {tenant.region}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-slate-800 flex items-center justify-center">
                  <Calendar className="size-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Registro</p>
                  <p className="text-white">{formatDate(tenant.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Users */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Usuarios</h2>
              <span className="text-sm text-slate-400">
                {mockTenantUsers.length} usuarios
              </span>
            </div>
            <div className="space-y-3">
              {mockTenantUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-slate-700 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {user.fullName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.fullName}</p>
                      <p className="text-xs text-slate-500">
                        @{user.username} ·{" "}
                        {user.role === "admin" ? "Administrador" : "Vendedor"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      Último acceso: {formatDate(user.lastLogin)}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setShowResetPasswordDialog(true);
                      }}
                      className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Resetear contraseña"
                    >
                      <Key className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Notas Internas
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agregar notas internas sobre este cliente..."
              className="w-full h-32 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {savingNotes ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <CheckCircle className="size-4" />
                )}
                Guardar notas
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Subscription */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Suscripción
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Plan actual</p>
                <p className="text-xl font-bold text-white">
                  {tenant.subscription?.planName || "Sin plan"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Estado</p>
                  <p className="text-white capitalize">
                    {tenant.subscription?.status || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Próx. cobro</p>
                  <p className="text-white">
                    {formatDate(tenant.subscription?.nextBillingDate || null)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPlanDialog(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <CreditCard className="size-4" />
                Cambiar plan
              </button>
            </div>
          </div>

          {/* Metrics */}
          {tenant.metrics && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Métricas
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <DollarSign className="size-4" />
                    <span>Ventas</span>
                  </div>
                  <span className="text-white font-medium">
                    {tenant.metrics.totalSales.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Activity className="size-4" />
                    <span>Ingresos</span>
                  </div>
                  <span className="text-white font-medium">
                    {formatCLP(tenant.metrics.totalRevenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Package className="size-4" />
                    <span>Productos</span>
                  </div>
                  <span className="text-white font-medium">
                    {tenant.metrics.totalProducts}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Users className="size-4" />
                    <span>Usuarios activos</span>
                  </div>
                  <span className="text-white font-medium">
                    {tenant.metrics.activeUsers}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Suspension Info */}
          {tenant.status === "suspended" && (
            <div className="bg-red-950/50 border border-red-900/50 rounded-xl p-6">
              <div className="flex items-center gap-2 text-red-400 mb-3">
                <AlertTriangle className="size-5" />
                <h2 className="font-semibold">Negocio Suspendido</h2>
              </div>
              <p className="text-sm text-red-300 mb-2">
                Suspendido el {formatDate(tenant.suspendedAt)}
              </p>
              <p className="text-sm text-red-400/80">
                Razón: {tenant.suspendedReason}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Suspend Dialog */}
      {showSuspendDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <Pause className="size-6" />
              <h2 className="text-lg font-semibold">Suspender {tenant.name}</h2>
            </div>
            <p className="text-slate-400 mb-4">
              El negocio no podrá acceder al sistema hasta que sea reactivado.
            </p>
            <div className="mb-4">
              <label className="text-sm text-slate-400 block mb-2">
                Razón de la suspensión
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Ej: Pago pendiente, uso indebido..."
                className="w-full h-24 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSuspendDialog(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSuspend}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Suspender
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Plan Dialog */}
      {showPlanDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 text-blue-400 mb-4">
              <CreditCard className="size-6" />
              <h2 className="text-lg font-semibold">Cambiar Plan</h2>
            </div>
            <div className="space-y-3 mb-6">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    selectedPlanId === plan.id
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{plan.name}</span>
                    <span className="text-white font-bold">
                      {formatCLP(plan.priceMonthly)}/mes
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {plan.maxProducts
                      ? `${plan.maxProducts} productos`
                      : "Ilimitado"}{" "}
                    ·
                    {plan.maxUsers
                      ? ` ${plan.maxUsers} usuarios`
                      : " Usuarios ilimitados"}
                  </p>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPlanDialog(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePlan}
                disabled={!selectedPlanId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Cambiar plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Dialog */}
      {showResetPasswordDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 text-amber-400 mb-4">
              <Key className="size-6" />
              <h2 className="text-lg font-semibold">Resetear Contraseña</h2>
            </div>
            <p className="text-slate-400 mb-6">
              Se generará una nueva contraseña temporal y se enviará por email
              al usuario.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowResetPasswordDialog(false);
                  setSelectedUserId(null);
                }}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetPassword}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <Send className="size-4" />
                Enviar nueva contraseña
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TenantDetail;
