/**
 * System Health
 * Dashboard de estado del sistema
 */

import { useState, useEffect } from "react";
import {
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  MemoryStick,
  Wifi,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Clock,
  TrendingUp,
  Globe,
} from "lucide-react";

interface ServiceStatus {
  name: string;
  status: "online" | "degraded" | "offline";
  responseTime: number;
  uptime: number;
  lastCheck: Date;
}

const mockServices: ServiceStatus[] = [
  {
    name: "API Principal",
    status: "online",
    responseTime: 45,
    uptime: 99.99,
    lastCheck: new Date(),
  },
  {
    name: "Base de Datos",
    status: "online",
    responseTime: 12,
    uptime: 99.95,
    lastCheck: new Date(),
  },
  {
    name: "Servidor de Autenticación",
    status: "online",
    responseTime: 32,
    uptime: 100,
    lastCheck: new Date(),
  },
  {
    name: "CDN / Archivos",
    status: "online",
    responseTime: 89,
    uptime: 99.9,
    lastCheck: new Date(),
  },
  {
    name: "Servicio de Email",
    status: "degraded",
    responseTime: 520,
    uptime: 98.5,
    lastCheck: new Date(),
  },
  {
    name: "Procesador de Pagos",
    status: "online",
    responseTime: 156,
    uptime: 99.99,
    lastCheck: new Date(),
  },
];

const mockMetrics = {
  cpu: 34,
  memory: 62,
  disk: 45,
  network: 28,
  activeConnections: 156,
  requestsPerMinute: 2340,
};

export function SystemHealth() {
  const [services, setServices] = useState(mockServices);
  const [metrics] = useState(mockMetrics);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastUpdate(new Date());
      setIsRefreshing(false);
    }, 1500);
  };

  const onlineCount = services.filter((s) => s.status === "online").length;
  const overallHealth =
    onlineCount === services.length
      ? "healthy"
      : onlineCount >= services.length - 1
      ? "degraded"
      : "critical";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Estado del Sistema</h1>
          <p className="text-slate-400 mt-1">
            Monitoreo en tiempo real de servicios e infraestructura
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">
            Actualizado: {lastUpdate.toLocaleTimeString("es-CL")}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Actualizar
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div
        className={`p-6 rounded-xl border ${
          overallHealth === "healthy"
            ? "bg-green-500/10 border-green-500/20"
            : overallHealth === "degraded"
            ? "bg-amber-500/10 border-amber-500/20"
            : "bg-red-500/10 border-red-500/20"
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-xl ${
              overallHealth === "healthy"
                ? "bg-green-500/20"
                : overallHealth === "degraded"
                ? "bg-amber-500/20"
                : "bg-red-500/20"
            }`}
          >
            {overallHealth === "healthy" ? (
              <CheckCircle className="size-8 text-green-400" />
            ) : overallHealth === "degraded" ? (
              <AlertCircle className="size-8 text-amber-400" />
            ) : (
              <XCircle className="size-8 text-red-400" />
            )}
          </div>
          <div>
            <h2
              className={`text-xl font-bold ${
                overallHealth === "healthy"
                  ? "text-green-400"
                  : overallHealth === "degraded"
                  ? "text-amber-400"
                  : "text-red-400"
              }`}
            >
              {overallHealth === "healthy"
                ? "Todos los sistemas operativos"
                : overallHealth === "degraded"
                ? "Rendimiento degradado"
                : "Problemas críticos detectados"}
            </h2>
            <p className="text-slate-400 mt-1">
              {onlineCount} de {services.length} servicios funcionando
              correctamente
            </p>
          </div>
        </div>
      </div>

      {/* Resource Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<Cpu className="size-5 text-blue-400" />}
          label="CPU"
          value={`${metrics.cpu}%`}
          percentage={metrics.cpu}
          color="blue"
        />
        <MetricCard
          icon={<MemoryStick className="size-5 text-purple-400" />}
          label="Memoria"
          value={`${metrics.memory}%`}
          percentage={metrics.memory}
          color="purple"
        />
        <MetricCard
          icon={<HardDrive className="size-5 text-green-400" />}
          label="Disco"
          value={`${metrics.disk}%`}
          percentage={metrics.disk}
          color="green"
        />
        <MetricCard
          icon={<Wifi className="size-5 text-amber-400" />}
          label="Red"
          value={`${metrics.network}%`}
          percentage={metrics.network}
          color="amber"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Globe className="size-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Conexiones Activas</p>
                <p className="text-2xl font-bold text-white">
                  {metrics.activeConnections}
                </p>
              </div>
            </div>
            <TrendingUp className="size-5 text-green-400" />
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/20 rounded-lg">
                <Activity className="size-5 text-pink-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Requests/min</p>
                <p className="text-2xl font-bold text-white">
                  {metrics.requestsPerMinute.toLocaleString()}
                </p>
              </div>
            </div>
            <TrendingUp className="size-5 text-green-400" />
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Estado de Servicios</h2>
        </div>
        <div className="divide-y divide-slate-800">
          {services.map((service, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/50"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-3 h-3 rounded-full ${
                    service.status === "online"
                      ? "bg-green-400"
                      : service.status === "degraded"
                      ? "bg-amber-400 animate-pulse"
                      : "bg-red-400"
                  }`}
                />
                <div>
                  <p className="text-white font-medium">{service.name}</p>
                  <p className="text-xs text-slate-500">
                    Uptime: {service.uptime}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p
                    className={`text-sm font-medium ${
                      service.responseTime < 100
                        ? "text-green-400"
                        : service.responseTime < 300
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                  >
                    {service.responseTime}ms
                  </p>
                  <p className="text-xs text-slate-500">Respuesta</p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    service.status === "online"
                      ? "bg-green-500/20 text-green-400"
                      : service.status === "degraded"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {service.status === "online"
                    ? "En línea"
                    : service.status === "degraded"
                    ? "Degradado"
                    : "Fuera de línea"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  percentage,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  percentage: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "from-blue-500",
    purple: "from-purple-500",
    green: "from-green-500",
    amber: "from-amber-500",
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 bg-${color}-500/20 rounded-lg`}>{icon}</div>
        <span className="text-slate-400 text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white mb-2">{value}</p>
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${colorClasses[color]} to-transparent rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default SystemHealth;
