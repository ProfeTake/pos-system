/**
 * SuperAdmin Panel
 * Panel exclusivo para gestión de tenants y suscripciones SaaS
 */

import { useState, useEffect } from "react";
import {
  Building2,
  Users,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  Search,
  Filter,
  MoreHorizontal,
  Play,
  Pause,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  Activity,
  ChevronRight,
  Shield,
  Zap,
  Star,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { toast } from "sonner";
import {
  superadminService,
  type Tenant,
  type DashboardResponse,
  type SubscriptionPlan,
} from "../../../services/superadmin.service";

// Formateo de moneda CLP
const formatCLP = (amount: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);

// Formateo de fecha
const formatDate = (date: string | Date | null) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Colores por estado
const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  active: {
    label: "Activo",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: <CheckCircle className="size-3" />,
  },
  suspended: {
    label: "Suspendido",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: <XCircle className="size-3" />,
  },
  trial: {
    label: "Prueba",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: <Clock className="size-3" />,
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: <XCircle className="size-3" />,
  },
};

// Plan badges
const planConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  Básico: {
    color: "bg-slate-100 text-slate-700",
    icon: <Package className="size-3" />,
  },
  Profesional: {
    color: "bg-purple-100 text-purple-700",
    icon: <Zap className="size-3" />,
  },
  Empresarial: {
    color: "bg-amber-100 text-amber-700",
    icon: <Star className="size-3" />,
  },
  Trial: {
    color: "bg-blue-100 text-blue-700",
    icon: <Clock className="size-3" />,
  },
};

export function SuperAdminPanel() {
  // Estado
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Modales
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showTrialDialog, setShowTrialDialog] = useState(false);

  // Form state
  const [suspendReason, setSuspendReason] = useState("");
  const [trialDays, setTrialDays] = useState(7);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  // Recargar tenants cuando cambian filtros
  useEffect(() => {
    loadTenants();
  }, [statusFilter, searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashboardData, plansData] = await Promise.all([
        superadminService.getDashboard(),
        superadminService.getPlans(),
      ]);
      setDashboard(dashboardData);
      setPlans(plansData);
      await loadTenants();
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const loadTenants = async () => {
    try {
      const response = await superadminService.getTenants({
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchTerm || undefined,
      });
      setTenants(response.tenants);
    } catch (error) {
      console.error("Error loading tenants:", error);
    }
  };

  // Acciones
  const handleSuspend = async () => {
    if (!selectedTenant) return;
    try {
      await superadminService.suspendTenant(selectedTenant.id, suspendReason);
      toast.success(`${selectedTenant.name} suspendido`);
      setShowSuspendDialog(false);
      setSuspendReason("");
      loadTenants();
      loadData();
    } catch (error) {
      toast.error("Error al suspender tenant");
    }
  };

  const handleReactivate = async (tenant: Tenant) => {
    try {
      await superadminService.reactivateTenant(tenant.id);
      toast.success(`${tenant.name} reactivado`);
      loadTenants();
      loadData();
    } catch (error) {
      toast.error("Error al reactivar tenant");
    }
  };

  const handleExtendTrial = async () => {
    if (!selectedTenant) return;
    try {
      await superadminService.extendTrial(selectedTenant.id, trialDays);
      toast.success(`Trial extendido ${trialDays} días`);
      setShowTrialDialog(false);
      loadTenants();
    } catch (error) {
      toast.error("Error al extender trial");
    }
  };

  const handleChangePlan = async () => {
    if (!selectedTenant || !selectedPlanId) return;
    try {
      await superadminService.changeTenantPlan(
        selectedTenant.id,
        selectedPlanId
      );
      toast.success("Plan actualizado");
      setShowPlanDialog(false);
      loadTenants();
    } catch (error) {
      toast.error("Error al cambiar plan");
    }
  };

  const handleUpdateNotes = async () => {
    if (!selectedTenant) return;
    try {
      await superadminService.updateTenantNotes(selectedTenant.id, notes);
      toast.success("Notas actualizadas");
      setShowDetailsDialog(false);
      loadTenants();
    } catch (error) {
      toast.error("Error al actualizar notas");
    }
  };

  const openDetails = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setNotes(tenant.internalNotes || "");
    setShowDetailsDialog(true);
  };

  const openSuspend = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setSuspendReason("");
    setShowSuspendDialog(true);
  };

  const openTrial = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setTrialDays(7);
    setShowTrialDialog(true);
  };

  const openPlanChange = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setSelectedPlanId(null);
    setShowPlanDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="size-7 text-primary" />
            Panel SuperAdmin
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de tenants y suscripciones SaaS
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="size-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Dashboard Cards */}
      {dashboard && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Negocios
              </CardTitle>
              <Building2 className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboard.summary.totalTenants}
              </div>
              <div className="flex gap-2 mt-1 text-xs">
                <span className="text-green-600">
                  {dashboard.summary.activeTenants} activos
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-blue-600">
                  {dashboard.summary.trialTenants} trial
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
              <TrendingUp className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCLP(dashboard.summary.mrr)}
              </div>
              <p className="text-xs text-muted-foreground">
                Ingresos mensuales recurrentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Ventas Totales
              </CardTitle>
              <CreditCard className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboard.summary.totalSales.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCLP(dashboard.summary.totalRevenue)} en ventas
              </p>
            </CardContent>
          </Card>

          <Card
            className={
              dashboard.summary.suspendedTenants > 0
                ? "border-red-200 bg-red-50/50"
                : ""
            }
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Requieren Atención
              </CardTitle>
              <AlertTriangle
                className={`size-4 ${
                  dashboard.summary.suspendedTenants > 0
                    ? "text-red-500"
                    : "text-muted-foreground"
                }`}
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboard.needsAttention.length}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboard.summary.suspendedTenants} suspendidos
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Negocios Registrados
          </CardTitle>
          <CardDescription>
            Gestiona las suscripciones y accesos de cada negocio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="size-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="suspended">Suspendidos</SelectItem>
                <SelectItem value="trial">En prueba</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista de tenants */}
          <div className="space-y-2">
            {tenants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron negocios con los filtros aplicados
              </div>
            ) : (
              tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="size-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tenant.name}</span>
                        <Badge
                          variant="outline"
                          className={statusConfig[tenant.status]?.color}
                        >
                          {statusConfig[tenant.status]?.icon}
                          <span className="ml-1">
                            {statusConfig[tenant.status]?.label}
                          </span>
                        </Badge>
                        {tenant.subscription && (
                          <Badge
                            variant="secondary"
                            className={
                              planConfig[tenant.subscription.planName]?.color
                            }
                          >
                            {planConfig[tenant.subscription.planName]?.icon}
                            <span className="ml-1">
                              {tenant.subscription.planName}
                            </span>
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
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

                  <div className="flex items-center gap-4">
                    {/* Métricas rápidas */}
                    {tenant.metrics && (
                      <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                        <span title="Ventas">
                          <Activity className="size-3.5 inline mr-1" />
                          {tenant.metrics.totalSales}
                        </span>
                        <span title="Productos">
                          <Package className="size-3.5 inline mr-1" />
                          {tenant.metrics.totalProducts}
                        </span>
                        <span title="Ingresos">
                          <DollarSign className="size-3.5 inline mr-1" />
                          {formatCLP(tenant.metrics.totalRevenue)}
                        </span>
                      </div>
                    )}

                    {/* Acciones */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDetails(tenant)}>
                          <ExternalLink className="size-4 mr-2" />
                          Ver detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openPlanChange(tenant)}
                        >
                          <CreditCard className="size-4 mr-2" />
                          Cambiar plan
                        </DropdownMenuItem>
                        {tenant.status === "trial" && (
                          <DropdownMenuItem onClick={() => openTrial(tenant)}>
                            <Clock className="size-4 mr-2" />
                            Extender trial
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {tenant.status === "suspended" ? (
                          <DropdownMenuItem
                            onClick={() => handleReactivate(tenant)}
                            className="text-green-600"
                          >
                            <Play className="size-4 mr-2" />
                            Reactivar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => openSuspend(tenant)}
                            className="text-red-600"
                          >
                            <Pause className="size-4 mr-2" />
                            Suspender
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Detalles del tenant */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5" />
              {selectedTenant?.name}
            </DialogTitle>
            <DialogDescription>
              Información detallada y notas internas
            </DialogDescription>
          </DialogHeader>

          {selectedTenant && (
            <div className="space-y-4">
              {/* Info básica */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-muted-foreground">Email</label>
                  <p className="font-medium">{selectedTenant.email}</p>
                </div>
                <div>
                  <label className="text-muted-foreground">Teléfono</label>
                  <p className="font-medium">{selectedTenant.phone || "-"}</p>
                </div>
                <div>
                  <label className="text-muted-foreground">Ubicación</label>
                  <p className="font-medium">
                    {selectedTenant.city}, {selectedTenant.region}
                  </p>
                </div>
                <div>
                  <label className="text-muted-foreground">Registro</label>
                  <p className="font-medium">
                    {formatDate(selectedTenant.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="text-muted-foreground">Plan actual</label>
                  <p className="font-medium">
                    {selectedTenant.subscription?.planName}
                  </p>
                </div>
                <div>
                  <label className="text-muted-foreground">Próximo cobro</label>
                  <p className="font-medium">
                    {formatDate(
                      selectedTenant.subscription?.nextBillingDate || null
                    )}
                  </p>
                </div>
              </div>

              {/* Métricas */}
              {selectedTenant.metrics && (
                <div className="grid grid-cols-4 gap-3 p-3 bg-muted rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {selectedTenant.metrics.totalSales}
                    </div>
                    <div className="text-xs text-muted-foreground">Ventas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {selectedTenant.metrics.totalProducts}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Productos
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {selectedTenant.metrics.activeUsers}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Usuarios
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {formatCLP(selectedTenant.metrics.totalRevenue)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Ingresos
                    </div>
                  </div>
                </div>
              )}

              {/* Suspensión info */}
              {selectedTenant.status === "suspended" && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800 font-medium">
                    <XCircle className="size-4" />
                    Suspendido el {formatDate(selectedTenant.suspendedAt)}
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    Razón: {selectedTenant.suspendedReason}
                  </p>
                </div>
              )}

              {/* Notas internas */}
              <div>
                <label className="text-sm font-medium">
                  Notas internas (solo visibles para superadmin)
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agregar notas sobre este cliente..."
                  className="mt-1.5"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailsDialog(false)}
            >
              Cerrar
            </Button>
            <Button onClick={handleUpdateNotes}>Guardar notas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Suspender */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Pause className="size-5" />
              Suspender {selectedTenant?.name}
            </DialogTitle>
            <DialogDescription>
              El negocio no podrá acceder al sistema hasta que sea reactivado.
            </DialogDescription>
          </DialogHeader>

          <div>
            <label className="text-sm font-medium">
              Razón de la suspensión
            </label>
            <Textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Ej: Pago pendiente, uso indebido, etc."
              className="mt-1.5"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSuspendDialog(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleSuspend}>
              Suspender
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Extender Trial */}
      <Dialog open={showTrialDialog} onOpenChange={setShowTrialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              Extender período de prueba
            </DialogTitle>
            <DialogDescription>
              Agregar días adicionales al trial de {selectedTenant?.name}
            </DialogDescription>
          </DialogHeader>

          <div>
            <label className="text-sm font-medium">Días a agregar</label>
            <Select
              value={trialDays.toString()}
              onValueChange={(v) => setTrialDays(parseInt(v))}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 días</SelectItem>
                <SelectItem value="14">14 días</SelectItem>
                <SelectItem value="30">30 días</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTrialDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExtendTrial}>Extender trial</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Cambiar Plan */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="size-5" />
              Cambiar plan de suscripción
            </DialogTitle>
            <DialogDescription>
              Selecciona el nuevo plan para {selectedTenant?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedPlanId === plan.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "hover:border-muted-foreground/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {planConfig[plan.name]?.icon}
                      {plan.name}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {plan.maxProducts
                        ? `${plan.maxProducts} productos`
                        : "Productos ilimitados"}{" "}
                      •{" "}
                      {plan.maxUsers
                        ? `${plan.maxUsers} usuarios`
                        : "Usuarios ilimitados"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {formatCLP(plan.priceMonthly)}
                    </div>
                    <div className="text-xs text-muted-foreground">/mes</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangePlan} disabled={!selectedPlanId}>
              Cambiar plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
