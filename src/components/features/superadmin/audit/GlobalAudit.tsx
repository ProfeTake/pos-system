/**
 * Global Audit
 * Auditoría global de acciones en todos los tenants
 */

import { useState } from "react";
import {
  FileText,
  Search,
  Download,
  Filter,
  Calendar,
  Building2,
  User,
  Clock,
  Eye,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface AuditEntry {
  id: number;
  timestamp: Date;
  tenant: string;
  user: string;
  action: string;
  resource: string;
  details: Record<string, unknown>;
  ip: string;
}

const mockAuditLogs: AuditEntry[] = [
  {
    id: 1,
    timestamp: new Date(),
    tenant: "Botillería Punto 3",
    user: "admin",
    action: "CREATE",
    resource: "sale",
    details: { total: 15000, items: 3 },
    ip: "192.168.1.100",
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 60000),
    tenant: "Botillería Punto 3",
    user: "vendedor1",
    action: "UPDATE",
    resource: "product",
    details: { id: 123, field: "price", oldValue: 1000, newValue: 1200 },
    ip: "192.168.1.101",
  },
  {
    id: 3,
    timestamp: new Date(Date.now() - 120000),
    tenant: "Minimarket Don Luis",
    user: "admin",
    action: "LOGIN",
    resource: "session",
    details: { browser: "Chrome" },
    ip: "200.14.55.102",
  },
  {
    id: 4,
    timestamp: new Date(Date.now() - 180000),
    tenant: "Licorería El Sol",
    user: "admin",
    action: "DELETE",
    resource: "product",
    details: { id: 456, name: "Producto X" },
    ip: "190.22.33.44",
  },
  {
    id: 5,
    timestamp: new Date(Date.now() - 300000),
    tenant: "Botillería Punto 3",
    user: "admin",
    action: "CREATE",
    resource: "user",
    details: { username: "vendedor2" },
    ip: "192.168.1.100",
  },
  {
    id: 6,
    timestamp: new Date(Date.now() - 600000),
    tenant: "Minimarket Don Luis",
    user: "vendedor1",
    action: "CREATE",
    resource: "cash_movement",
    details: { type: "income", amount: 50000 },
    ip: "200.14.55.103",
  },
  {
    id: 7,
    timestamp: new Date(Date.now() - 900000),
    tenant: "Botillería El Norte",
    user: "admin",
    action: "UPDATE",
    resource: "settings",
    details: { field: "business_hours" },
    ip: "189.45.67.89",
  },
  {
    id: 8,
    timestamp: new Date(Date.now() - 1200000),
    tenant: "Licorería El Sol",
    user: "admin",
    action: "LOGOUT",
    resource: "session",
    details: {},
    ip: "190.22.33.44",
  },
];

const actionColors: Record<string, { bg: string; text: string }> = {
  CREATE: { bg: "bg-green-500/20", text: "text-green-400" },
  UPDATE: { bg: "bg-blue-500/20", text: "text-blue-400" },
  DELETE: { bg: "bg-red-500/20", text: "text-red-400" },
  LOGIN: { bg: "bg-purple-500/20", text: "text-purple-400" },
  LOGOUT: { bg: "bg-slate-500/20", text: "text-slate-400" },
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function GlobalAudit() {
  const [logs] = useState(mockAuditLogs);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const tenants = [...new Set(logs.map((l) => l.tenant))];
  const actions = [...new Set(logs.map((l) => l.action))];

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.tenant.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesTenant = tenantFilter === "all" || log.tenant === tenantFilter;
    return matchesSearch && matchesAction && matchesTenant;
  });

  const stats = {
    total: logs.length,
    creates: logs.filter((l) => l.action === "CREATE").length,
    updates: logs.filter((l) => l.action === "UPDATE").length,
    deletes: logs.filter((l) => l.action === "DELETE").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Auditoría Global</h1>
          <p className="text-slate-400 mt-1">
            Registro de todas las acciones en el sistema
          </p>
        </div>
        <button
          onClick={() => {
            /* Export */
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          <Download className="size-4" />
          Exportar CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-sm text-slate-400">Total Registros</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-sm text-slate-400">Creaciones</p>
          <p className="text-2xl font-bold text-green-400">{stats.creates}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-sm text-slate-400">Modificaciones</p>
          <p className="text-2xl font-bold text-blue-400">{stats.updates}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-sm text-slate-400">Eliminaciones</p>
          <p className="text-2xl font-bold text-red-400">{stats.deletes}</p>
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
            placeholder="Buscar por usuario, recurso o negocio..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">Todos los negocios</option>
          {tenants.map((tenant) => (
            <option key={tenant} value={tenant}>
              {tenant}
            </option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">Todas las acciones</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
      </div>

      {/* Audit List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="divide-y divide-slate-800">
          {filteredLogs.map((log) => {
            const colors = actionColors[log.action] || actionColors.CREATE;
            const isExpanded = expandedId === log.id;

            return (
              <div
                key={log.id}
                className={`hover:bg-slate-800/50 ${
                  isExpanded ? "bg-slate-800/50" : ""
                }`}
              >
                <div
                  className="flex items-center gap-4 px-6 py-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                >
                  <button className="text-slate-500">
                    {isExpanded ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${colors.bg} ${colors.text}`}
                      >
                        {log.action}
                      </span>
                      <span className="text-white font-medium">
                        {log.resource}
                      </span>
                      <span className="text-slate-500">por</span>
                      <span className="text-slate-300 flex items-center gap-1">
                        <User className="size-3" />
                        {log.user}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3" />
                        {log.tenant}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs text-slate-600 font-mono">
                    {log.ip}
                  </span>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-4 pl-14">
                    <div className="bg-slate-800 rounded-lg p-4">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                        Detalles
                      </p>
                      <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default GlobalAudit;
