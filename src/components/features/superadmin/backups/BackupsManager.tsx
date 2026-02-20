/**
 * Backups Manager
 * Gestión de backups de la base de datos
 */

import { useState } from "react";
import {
  Database,
  Download,
  Upload,
  HardDrive,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Archive,
  Trash2,
  Play,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

interface Backup {
  id: number;
  name: string;
  size: string;
  type: "full" | "incremental";
  status: "completed" | "in-progress" | "failed";
  createdAt: Date;
  tenant?: string;
}

const mockBackups: Backup[] = [
  {
    id: 1,
    name: "backup_full_2024-01-15.sql",
    size: "125 MB",
    type: "full",
    status: "completed",
    createdAt: new Date(),
  },
  {
    id: 2,
    name: "backup_full_2024-01-14.sql",
    size: "124 MB",
    type: "full",
    status: "completed",
    createdAt: new Date(Date.now() - 86400000),
  },
  {
    id: 3,
    name: "backup_punto3_2024-01-15.sql",
    size: "25 MB",
    type: "incremental",
    status: "completed",
    createdAt: new Date(Date.now() - 3600000),
    tenant: "Botillería Punto 3",
  },
  {
    id: 4,
    name: "backup_full_2024-01-13.sql",
    size: "122 MB",
    type: "full",
    status: "failed",
    createdAt: new Date(Date.now() - 172800000),
  },
  {
    id: 5,
    name: "backup_incremental_2024-01-15.sql",
    size: "5 MB",
    type: "incremental",
    status: "in-progress",
    createdAt: new Date(Date.now() - 1800000),
  },
];

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function BackupsManager() {
  const [backups, setBackups] = useState(mockBackups);
  const [isCreating, setIsCreating] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);

  const handleCreateBackup = async (type: "full" | "incremental") => {
    setIsCreating(true);

    // Simulación
    setTimeout(() => {
      const newBackup: Backup = {
        id: backups.length + 1,
        name: `backup_${type}_${new Date().toISOString().split("T")[0]}.sql`,
        size: type === "full" ? "126 MB" : "3 MB",
        type,
        status: "completed",
        createdAt: new Date(),
      };
      setBackups([newBackup, ...backups]);
      setIsCreating(false);
      toast.success(
        `Backup ${
          type === "full" ? "completo" : "incremental"
        } creado correctamente`
      );
    }, 2000);
  };

  const handleRestore = () => {
    toast.success(`Restaurando backup: ${selectedBackup?.name}`);
    setShowRestoreDialog(false);
    setSelectedBackup(null);
  };

  const handleDelete = (backup: Backup) => {
    setBackups(backups.filter((b) => b.id !== backup.id));
    toast.success("Backup eliminado");
  };

  const completedBackups = backups.filter(
    (b) => b.status === "completed"
  ).length;
  const lastBackup = backups.find((b) => b.status === "completed");
  const totalSize = backups
    .filter((b) => b.status === "completed")
    .reduce((acc, b) => acc + parseInt(b.size), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión de Backups</h1>
          <p className="text-slate-400 mt-1">
            Crea y restaura copias de seguridad de la base de datos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleCreateBackup("incremental")}
            disabled={isCreating}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <Archive className="size-4" />
            Incremental
          </button>
          <button
            onClick={() => handleCreateBackup("full")}
            disabled={isCreating}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isCreating ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <Database className="size-4" />
            )}
            {isCreating ? "Creando..." : "Backup Completo"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="size-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {completedBackups}
              </p>
              <p className="text-sm text-slate-400">Backups completados</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Clock className="size-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {lastBackup
                  ? formatDate(lastBackup.createdAt).split(",")[0]
                  : "-"}
              </p>
              <p className="text-sm text-slate-400">Último backup</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <HardDrive className="size-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalSize} MB</p>
              <p className="text-sm text-slate-400">Espacio utilizado</p>
            </div>
          </div>
        </div>
      </div>

      {/* Backups List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Historial de Backups</h2>
        </div>
        <div className="divide-y divide-slate-800">
          {backups.map((backup) => (
            <div
              key={backup.id}
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/50"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`p-2 rounded-lg ${
                    backup.status === "completed"
                      ? "bg-green-500/20"
                      : backup.status === "in-progress"
                      ? "bg-blue-500/20"
                      : "bg-red-500/20"
                  }`}
                >
                  {backup.status === "completed" ? (
                    <CheckCircle className="size-5 text-green-400" />
                  ) : backup.status === "in-progress" ? (
                    <RefreshCw className="size-5 text-blue-400 animate-spin" />
                  ) : (
                    <AlertCircle className="size-5 text-red-400" />
                  )}
                </div>
                <div>
                  <p className="text-white font-medium">{backup.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500">
                      {backup.size}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        backup.type === "full"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-purple-500/20 text-purple-400"
                      }`}
                    >
                      {backup.type === "full" ? "Completo" : "Incremental"}
                    </span>
                    {backup.tenant && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Building2 className="size-3" />
                        {backup.tenant}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-400">
                  {formatDate(backup.createdAt)}
                </span>
                <div className="flex items-center gap-2">
                  {backup.status === "completed" && (
                    <>
                      <button
                        onClick={() => toast.success("Descargando backup...")}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Descargar"
                      >
                        <Download className="size-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedBackup(backup);
                          setShowRestoreDialog(true);
                        }}
                        className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Restaurar"
                      >
                        <Upload className="size-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(backup)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Restore Dialog */}
      {showRestoreDialog && selectedBackup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 text-amber-400 mb-4">
              <AlertCircle className="size-6" />
              <h2 className="text-lg font-semibold">Confirmar Restauración</h2>
            </div>
            <p className="text-slate-400 mb-2">
              ¿Estás seguro de restaurar el backup?
            </p>
            <p className="text-white font-medium mb-4">{selectedBackup.name}</p>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-6">
              <p className="text-amber-400 text-sm">
                ⚠️ Esta acción sobrescribirá los datos actuales. Se recomienda
                crear un backup antes de continuar.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRestoreDialog(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRestore}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <Play className="size-4" />
                Restaurar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BackupsManager;
