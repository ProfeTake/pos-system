/**
 * SuperAdmin Dashboard
 * Dashboard global con métricas de la plataforma SaaS
 */

import { useState, useEffect } from "react";
import {
  Building2,
  Users,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import {
  superadminService,
  type DashboardResponse,
} from "../../../../services/superadmin.service";
import { Button } from "../../../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../ui/card";
import { Badge } from "../../../ui/badge";

interface SADashboardProps {
  onViewTenant: (tenantId: number) => void;
}

// Formateo de moneda CLP
const formatCLP = (amount: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);

export function SADashboard({ onViewTenant }: SADashboardProps) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const dashboard = await superadminService.getDashboard();
      setData(dashboard);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { summary, planDistribution, needsAttention, recentActivity } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Resumen general de la plataforma SaaS
          </p>
        </div>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="size-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Negocios */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Building2 className="size-5 text-blue-500" />
              </div>
              <span className="flex items-center gap-1 text-xs text-green-500">
                <ArrowUpRight className="size-3" />
                +12%
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold">{summary.totalTenants}</p>
              <p className="text-sm text-muted-foreground">Negocios totales</p>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs">
              <span className="text-green-500">
                {summary.activeTenants} activos
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-blue-500">
                {summary.trialTenants} trial
              </span>
            </div>
          </CardContent>
        </Card>

        {/* MRR */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="size-5 text-green-500" />
              </div>
              <span className="flex items-center gap-1 text-xs text-green-500">
                <ArrowUpRight className="size-3" />
                +8%
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold">{formatCLP(summary.mrr)}</p>
              <p className="text-sm text-muted-foreground">
                MRR (Ingresos mensuales)
              </p>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              {formatCLP(summary.mrr * 12)} proyectado anual
            </div>
          </CardContent>
        </Card>

        {/* Ventas Totales */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <DollarSign className="size-5 text-purple-500" />
              </div>
              <span className="flex items-center gap-1 text-xs text-green-500">
                <ArrowUpRight className="size-3" />
                +23%
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold">
                {summary.totalSales.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Ventas procesadas</p>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              {formatCLP(summary.totalRevenue)} en volumen
            </div>
          </CardContent>
        </Card>

        {/* Requieren Atención */}
        <Card
          className={
            summary.suspendedTenants > 0
              ? "border-red-500/50 bg-red-950/20"
              : ""
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div
                className={`size-10 rounded-lg flex items-center justify-center ${
                  summary.suspendedTenants > 0 ? "bg-red-500/20" : "bg-muted"
                }`}
              >
                <AlertTriangle
                  className={`size-5 ${
                    summary.suspendedTenants > 0
                      ? "text-red-500"
                      : "text-muted-foreground"
                  }`}
                />
              </div>
              {summary.suspendedTenants > 0 && (
                <span className="flex items-center gap-1 text-xs text-red-500">
                  <ArrowDownRight className="size-3" />
                  Atención
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold">{needsAttention.length}</p>
              <p className="text-sm text-muted-foreground">
                Requieren atención
              </p>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              {summary.suspendedTenants} suspendidos
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Plan Distribution */}
        <div className="bg-card border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Distribución por Plan
          </h2>
          <div className="space-y-4">
            {planDistribution.map((plan) => (
              <div
                key={plan.plan}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`size-3 rounded-full ${
                      plan.plan === "Básico"
                        ? "bg-slate-500"
                        : plan.plan === "Profesional"
                        ? "bg-purple-500"
                        : "bg-amber-500"
                    }`}
                  />
                  <span className="">{plan.plan}</span>
                </div>
                <div className="text-right">
                  <span className="text-foreground font-medium">
                    {plan.count}
                  </span>
                  <span className="text-muted-foreground text-sm ml-2">
                    {formatCLP(plan.revenue)}/mes
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Needs Attention */}
        <div className="bg-card border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Requieren Atención
          </h2>
          {needsAttention.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="size-8 mx-auto mb-2 text-green-500" />
              <p>Todo en orden</p>
            </div>
          ) : (
            <div className="space-y-3">
              {needsAttention.slice(0, 4).map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => onViewTenant(tenant.id)}
                  className="w-full flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <div
                    className={`size-2 rounded-full ${
                      tenant.status === "suspended"
                        ? "bg-red-500"
                        : "bg-amber-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {tenant.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tenant.status === "suspended"
                        ? "Suspendido"
                        : "Trial por vencer"}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-card border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Actividad Reciente
          </h2>
          <div className="space-y-4">
            {recentActivity.map((activity, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                    activity.action.includes("Nuevo")
                      ? "bg-green-500/20"
                      : activity.action.includes("Pago")
                      ? "bg-blue-500/20"
                      : activity.action.includes("Suspendido")
                      ? "bg-red-500/20"
                      : "bg-muted"
                  }`}
                >
                  {activity.action.includes("Nuevo") && (
                    <Users className="size-4 text-green-500" />
                  )}
                  {activity.action.includes("Pago") && (
                    <DollarSign className="size-4 text-blue-500" />
                  )}
                  {activity.action.includes("Suspendido") && (
                    <XCircle className="size-4 text-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.tenant}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(activity.date).toLocaleDateString("es-CL", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Estado del Sistema
          </h2>
          <span className="flex items-center gap-2 text-sm text-green-400">
            <Activity className="size-4" />
            Todos los servicios operativos
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { name: "API Backend", status: "online", latency: "12ms" },
            { name: "Base de Datos", status: "online", latency: "3ms" },
            { name: "SSE Events", status: "online", latency: "8ms" },
            { name: "Email Service", status: "online", latency: "45ms" },
          ].map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-green-500" />
                <span className="text-sm ">{service.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {service.latency}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SADashboard;
