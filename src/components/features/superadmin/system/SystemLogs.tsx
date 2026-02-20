/**
 * System Logs
 * Visor de logs del sistema en tiempo real
 */

import { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  Clock,
  Building2,
  Server,
  Trash2,
  Pause,
  Play,
} from "lucide-react";

type LogLevel = "error" | "warning" | "info" | "debug";

interface LogEntry {
  id: number;
  timestamp: Date;
  level: LogLevel;
  message: string;
  service: string;
  tenant?: string;
  details?: string;
}

const mockLogs: LogEntry[] = [
  {
    id: 1,
    timestamp: new Date(),
    level: "info",
    message: "Usuario admin inició sesión",
    service: "auth",
    tenant: "Botillería Punto 3",
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 30000),
    level: "info",
    message: "Venta #1234 completada exitosamente",
    service: "sales",
    tenant: "Minimarket Don Luis",
  },
  {
    id: 3,
    timestamp: new Date(Date.now() - 60000),
    level: "warning",
    message: "Producto SKU-0023 con stock bajo (2 unidades)",
    service: "inventory",
    tenant: "Licorería El Sol",
  },
  {
    id: 4,
    timestamp: new Date(Date.now() - 90000),
    level: "error",
    message: "Error de conexión con servicio de email",
    service: "email",
    details: "Connection timeout after 30000ms",
  },
  {
    id: 5,
    timestamp: new Date(Date.now() - 120000),
    level: "info",
    message: "Backup automático completado",
    service: "backup",
  },
  {
    id: 6,
    timestamp: new Date(Date.now() - 180000),
    level: "debug",
    message: "Cache invalidado para productos",
    service: "cache",
  },
  {
    id: 7,
    timestamp: new Date(Date.now() - 240000),
    level: "info",
    message: "Nueva suscripción creada",
    service: "billing",
    tenant: "Botillería El Norte",
  },
  {
    id: 8,
    timestamp: new Date(Date.now() - 300000),
    level: "warning",
    message: "Tasa de requests elevada detectada",
    service: "api",
  },
  {
    id: 9,
    timestamp: new Date(Date.now() - 360000),
    level: "error",
    message: "Fallo en procesamiento de pago",
    service: "payments",
    tenant: "Minimarket Don Luis",
    details: "Card declined",
  },
  {
    id: 10,
    timestamp: new Date(Date.now() - 420000),
    level: "info",
    message: "Sistema de auditoría activado",
    service: "audit",
  },
];

const levelConfig: Record<
  LogLevel,
  { icon: typeof AlertCircle; color: string; bg: string }
> = {
  error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/20" },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/20",
  },
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/20" },
  debug: { icon: Bug, color: "text-slate-400", bg: "bg-slate-500/20" },
};

const formatTime = (date: Date) =>
  date.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export function SystemLogs() {
  const [logs, setLogs] = useState(mockLogs);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [isPaused, setIsPaused] = useState(false);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  // Simular logs en tiempo real
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const newLog: LogEntry = {
        id: Date.now(),
        timestamp: new Date(),
        level: ["info", "info", "info", "warning", "debug"][
          Math.floor(Math.random() * 5)
        ] as LogLevel,
        message: [
          "Petición procesada correctamente",
          "Usuario realizó acción",
          "Cache actualizado",
          "Operación completada",
        ][Math.floor(Math.random() * 4)],
        service: ["api", "auth", "sales", "inventory"][
          Math.floor(Math.random() * 4)
        ],
      };
      setLogs((prev) => [newLog, ...prev].slice(0, 100));
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const services = [...new Set(logs.map((l) => l.service))];

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.service.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === "all" || log.level === levelFilter;
    const matchesService =
      serviceFilter === "all" || log.service === serviceFilter;
    return matchesSearch && matchesLevel && matchesService;
  });

  const errorCount = logs.filter((l) => l.level === "error").length;
  const warningCount = logs.filter((l) => l.level === "warning").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Logs del Sistema</h1>
          <p className="text-slate-400 mt-1">
            Monitoreo en tiempo real de eventos del sistema
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
              isPaused
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-slate-800 text-white hover:bg-slate-700"
            }`}
          >
            {isPaused ? (
              <Play className="size-4" />
            ) : (
              <Pause className="size-4" />
            )}
            {isPaused ? "Reanudar" : "Pausar"}
          </button>
          <button
            onClick={() => {
              /* Export logs */
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Download className="size-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-lg">
          <AlertCircle className="size-4 text-red-400" />
          <span className="text-sm text-red-400 font-medium">
            {errorCount} errores
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-lg">
          <AlertTriangle className="size-4 text-amber-400" />
          <span className="text-sm text-amber-400 font-medium">
            {warningCount} advertencias
          </span>
        </div>
        <div className="flex-1" />
        <div
          className={`flex items-center gap-2 ${
            isPaused ? "text-amber-400" : "text-green-400"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              isPaused ? "bg-amber-400" : "bg-green-400 animate-pulse"
            }`}
          />
          <span className="text-sm">{isPaused ? "Pausado" : "En vivo"}</span>
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
            placeholder="Buscar en logs..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as LogLevel | "all")}
          className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">Todos los niveles</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">Todos los servicios</option>
          {services.map((service) => (
            <option key={service} value={service}>
              {service}
            </option>
          ))}
        </select>
        <button
          onClick={() => setLogs([])}
          className="flex items-center gap-2 px-4 py-2.5 text-slate-400 hover:text-red-400 bg-slate-900 border border-slate-800 rounded-lg transition-colors"
        >
          <Trash2 className="size-4" />
          Limpiar
        </button>
      </div>

      {/* Logs List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden font-mono text-sm">
        <div className="max-h-[600px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <FileText className="size-12 mb-3 opacity-50" />
              <p>No hay logs que mostrar</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const config = levelConfig[log.level];
              const Icon = config.icon;
              const isExpanded = expandedLog === log.id;

              return (
                <div
                  key={log.id}
                  className={`border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer ${
                    isExpanded ? "bg-slate-800/50" : ""
                  }`}
                  onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                >
                  <div className="flex items-start gap-3 px-4 py-3">
                    <div className={`p-1 rounded ${config.bg} mt-0.5`}>
                      <Icon className={`size-3 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-slate-500">
                          {formatTime(log.timestamp)}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs uppercase ${config.bg} ${config.color}`}
                        >
                          {log.level}
                        </span>
                        <span className="text-slate-400">[{log.service}]</span>
                        {log.tenant && (
                          <span className="text-slate-500 flex items-center gap-1 text-xs">
                            <Building2 className="size-3" />
                            {log.tenant}
                          </span>
                        )}
                      </div>
                      <p className="text-white mt-1">{log.message}</p>
                      {isExpanded && log.details && (
                        <div className="mt-2 p-2 bg-slate-800 rounded text-slate-400 text-xs">
                          {log.details}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default SystemLogs;
