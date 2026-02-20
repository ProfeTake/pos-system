/**
 * Feature Flags
 * Gestión de feature flags para control de funcionalidades
 */

import { useState } from "react";
import {
  Flag,
  Search,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Users,
  Building2,
  Globe,
  AlertCircle,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  key: string;
  isEnabled: boolean;
  scope: "global" | "tenant" | "user";
  enabledFor: string[];
  createdAt: Date;
  updatedAt: Date;
}

const mockFlags: FeatureFlag[] = [
  {
    id: "1",
    name: "Nueva UI de Ventas",
    description: "Activa la nueva interfaz de ventas con diseño moderno",
    key: "new_sales_ui",
    isEnabled: true,
    scope: "tenant",
    enabledFor: ["Botillería Punto 3", "Licorería El Sol"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    name: "Integración WhatsApp",
    description: "Permite enviar recibos por WhatsApp",
    key: "whatsapp_integration",
    isEnabled: false,
    scope: "global",
    enabledFor: [],
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86400000),
  },
  {
    id: "3",
    name: "AI Product Search",
    description: "Búsqueda de productos con inteligencia artificial",
    key: "ai_product_search",
    isEnabled: true,
    scope: "global",
    enabledFor: [],
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(),
  },
  {
    id: "4",
    name: "Beta Reports",
    description: "Nuevos reportes en versión beta",
    key: "beta_reports",
    isEnabled: true,
    scope: "user",
    enabledFor: ["admin@punto3.cl"],
    createdAt: new Date(Date.now() - 259200000),
    updatedAt: new Date(Date.now() - 86400000),
  },
  {
    id: "5",
    name: "Multi-currency",
    description: "Soporte para múltiples monedas",
    key: "multi_currency",
    isEnabled: false,
    scope: "global",
    enabledFor: [],
    createdAt: new Date(Date.now() - 345600000),
    updatedAt: new Date(Date.now() - 345600000),
  },
  {
    id: "6",
    name: "Dark Mode POS",
    description: "Modo oscuro para el punto de venta",
    key: "dark_mode_pos",
    isEnabled: true,
    scope: "tenant",
    enabledFor: ["Minimarket Don Luis"],
    createdAt: new Date(Date.now() - 432000000),
    updatedAt: new Date(),
  },
];

const scopeConfig: Record<
  string,
  { icon: typeof Globe; label: string; color: string }
> = {
  global: {
    icon: Globe,
    label: "Global",
    color: "bg-blue-500/20 text-blue-400",
  },
  tenant: {
    icon: Building2,
    label: "Por Negocio",
    color: "bg-purple-500/20 text-purple-400",
  },
  user: {
    icon: Users,
    label: "Por Usuario",
    color: "bg-green-500/20 text-green-400",
  },
};

export function FeatureFlags() {
  const [flags, setFlags] = useState(mockFlags);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const filteredFlags = flags.filter(
    (f) =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = (flagId: string) => {
    setFlags(
      flags.map((f) =>
        f.id === flagId
          ? { ...f, isEnabled: !f.isEnabled, updatedAt: new Date() }
          : f
      )
    );
    const flag = flags.find((f) => f.id === flagId);
    toast.success(
      `Feature "${flag?.name}" ${flag?.isEnabled ? "desactivada" : "activada"}`
    );
  };

  const handleDelete = (flagId: string) => {
    const flag = flags.find((f) => f.id === flagId);
    setFlags(flags.filter((f) => f.id !== flagId));
    toast.success(`Feature "${flag?.name}" eliminada`);
  };

  const enabledCount = flags.filter((f) => f.isEnabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Feature Flags</h1>
          <p className="text-slate-400 mt-1">
            Controla el lanzamiento de nuevas funcionalidades
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="size-4" />
          Nueva Flag
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-sm text-slate-400">Total Flags</p>
          <p className="text-2xl font-bold text-white">{flags.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-sm text-slate-400">Habilitadas</p>
          <p className="text-2xl font-bold text-green-400">{enabledCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-sm text-slate-400">Deshabilitadas</p>
          <p className="text-2xl font-bold text-slate-400">
            {flags.length - enabledCount}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre o key..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Flags List */}
      <div className="space-y-3">
        {filteredFlags.map((flag) => {
          const scope = scopeConfig[flag.scope];
          const ScopeIcon = scope.icon;

          return (
            <div
              key={flag.id}
              className={`bg-slate-900 border border-slate-800 rounded-xl p-4 ${
                !flag.isEnabled ? "opacity-70" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggle(flag.id)}
                    className="focus:outline-none"
                  >
                    {flag.isEnabled ? (
                      <ToggleRight className="size-8 text-green-400" />
                    ) : (
                      <ToggleLeft className="size-8 text-slate-600" />
                    )}
                  </button>

                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-white">{flag.name}</h3>
                      <code className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-400 font-mono">
                        {flag.key}
                      </code>
                      <span
                        className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${scope.color}`}
                      >
                        <ScopeIcon className="size-3" />
                        {scope.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {flag.description}
                    </p>
                    {flag.scope !== "global" && flag.enabledFor.length > 0 && (
                      <p className="text-xs text-slate-600 mt-1">
                        Habilitado para: {flag.enabledFor.join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedFlag(flag)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="size-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(flag.id)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      {(showCreateDialog || selectedFlag) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">
              {selectedFlag ? "Editar Feature Flag" : "Nueva Feature Flag"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  defaultValue={selectedFlag?.name || ""}
                  placeholder="Nueva Funcionalidad"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Key (identificador único)
                </label>
                <input
                  type="text"
                  defaultValue={selectedFlag?.key || ""}
                  placeholder="nueva_funcionalidad"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Descripción
                </label>
                <textarea
                  defaultValue={selectedFlag?.description || ""}
                  placeholder="Describe qué hace esta funcionalidad..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Alcance
                </label>
                <select
                  defaultValue={selectedFlag?.scope || "global"}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="global">Global (todos los usuarios)</option>
                  <option value="tenant">Por Negocio</option>
                  <option value="user">Por Usuario</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setSelectedFlag(null);
                }}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  toast.success(
                    selectedFlag ? "Flag actualizada" : "Flag creada"
                  );
                  setShowCreateDialog(false);
                  setSelectedFlag(null);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="size-4" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeatureFlags;
