/**
 * User Management
 * Gestión global de usuarios de todos los tenants
 */

import { useState } from "react";
import {
  Users,
  Search,
  Filter,
  Key,
  Ban,
  CheckCircle,
  RefreshCw,
  Mail,
  Building2,
  Clock,
  Shield,
  User,
} from "lucide-react";
import { toast } from "sonner";

// Mock users across all tenants
const mockAllUsers = [
  {
    id: 1,
    username: "admin",
    fullName: "Administrador Punto 3",
    email: "admin@punto3.cl",
    role: "admin",
    tenant: "Botillería Punto 3",
    tenantId: 1,
    status: "active",
    lastLogin: new Date(),
  },
  {
    id: 2,
    username: "vendedor1",
    fullName: "Juan Pérez",
    email: "juan@punto3.cl",
    role: "vendedor",
    tenant: "Botillería Punto 3",
    tenantId: 1,
    status: "active",
    lastLogin: new Date(Date.now() - 86400000),
  },
  {
    id: 3,
    username: "admin",
    fullName: "Luis Martínez",
    email: "luis@donluis.cl",
    role: "admin",
    tenant: "Minimarket Don Luis",
    tenantId: 2,
    status: "blocked",
    lastLogin: new Date(Date.now() - 604800000),
  },
  {
    id: 4,
    username: "admin",
    fullName: "Sol Admin",
    email: "admin@elsol.cl",
    role: "admin",
    tenant: "Licorería El Sol",
    tenantId: 3,
    status: "active",
    lastLogin: new Date(Date.now() - 3600000),
  },
  {
    id: 5,
    username: "vendedor1",
    fullName: "María García",
    email: "maria@punto3.cl",
    role: "vendedor",
    tenant: "Botillería Punto 3",
    tenantId: 1,
    status: "active",
    lastLogin: new Date(Date.now() - 172800000),
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

export function UserManagement() {
  const [users] = useState(mockAllUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<
    (typeof mockAllUsers)[0] | null
  >(null);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.tenant.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleResetPassword = () => {
    toast.success(
      `Contraseña reseteada para ${selectedUser?.fullName}. Se envió email.`
    );
    setShowResetDialog(false);
    setSelectedUser(null);
  };

  const handleToggleBlock = (user: (typeof mockAllUsers)[0]) => {
    if (user.status === "blocked") {
      toast.success(`${user.fullName} desbloqueado`);
    } else {
      toast.success(`${user.fullName} bloqueado`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Gestión de Usuarios</h1>
        <p className="text-slate-400 mt-1">
          Administra usuarios de todos los negocios
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, email o negocio..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">Todos los roles</option>
          <option value="admin">Administradores</option>
          <option value="vendedor">Vendedores</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="blocked">Bloqueados</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">
                Usuario
              </th>
              <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">
                Negocio
              </th>
              <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">
                Rol
              </th>
              <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">
                Último acceso
              </th>
              <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">
                Estado
              </th>
              <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredUsers.map((user) => (
              <tr
                key={`${user.tenantId}-${user.id}`}
                className="hover:bg-slate-800/50"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-slate-800 flex items-center justify-center">
                      <User className="size-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.fullName}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Building2 className="size-4 text-slate-500" />
                    {user.tenant}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.role === "admin"
                        ? "bg-purple-500/20 text-purple-400"
                        : "bg-slate-500/20 text-slate-400"
                    }`}
                  >
                    {user.role === "admin" ? (
                      <Shield className="size-3" />
                    ) : (
                      <User className="size-3" />
                    )}
                    {user.role === "admin" ? "Admin" : "Vendedor"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Clock className="size-4" />
                    {formatDate(user.lastLogin)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.status === "active"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {user.status === "active" ? (
                      <CheckCircle className="size-3" />
                    ) : (
                      <Ban className="size-3" />
                    )}
                    {user.status === "active" ? "Activo" : "Bloqueado"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowResetDialog(true);
                      }}
                      className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Resetear contraseña"
                    >
                      <Key className="size-4" />
                    </button>
                    <button
                      onClick={() => handleToggleBlock(user)}
                      className={`p-2 rounded-lg transition-colors ${
                        user.status === "blocked"
                          ? "text-slate-400 hover:text-green-400 hover:bg-slate-700"
                          : "text-slate-400 hover:text-red-400 hover:bg-slate-700"
                      }`}
                      title={
                        user.status === "blocked" ? "Desbloquear" : "Bloquear"
                      }
                    >
                      {user.status === "blocked" ? (
                        <CheckCircle className="size-4" />
                      ) : (
                        <Ban className="size-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reset Password Dialog */}
      {showResetDialog && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 text-amber-400 mb-4">
              <Key className="size-6" />
              <h2 className="text-lg font-semibold">Resetear Contraseña</h2>
            </div>
            <p className="text-slate-400 mb-2">
              Usuario:{" "}
              <span className="text-white">{selectedUser.fullName}</span>
            </p>
            <p className="text-slate-400 mb-6">
              Se generará una nueva contraseña temporal y se enviará a:{" "}
              <span className="text-white">{selectedUser.email}</span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetDialog(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetPassword}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <Mail className="size-4" />
                Enviar nueva contraseña
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
