import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Separator } from "../../ui/separator";
import { Switch } from "../../ui/switch";
import { Badge } from "../../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { toast } from "sonner";
import {
  settingsService,
  type StoreUser,
  type CategoryThreshold,
} from "../../../services/settings.service";
import {
  Users,
  Plus,
  Trash2,
  Shield,
  AlertTriangle,
  Crown,
  Edit,
  Package,
  Save,
  X,
} from "lucide-react";
import SubscriptionModal from "./SubscriptionModal";
import {
  FERMENTADAS,
  DESTILADAS,
  FANTASIA,
  loadDynamicCategories,
} from "../../../data/categories";

type SubscriptionInfo = {
  plan: "basic" | "pro" | "enterprise";
  maxUsers: number;
  maxCashRegisters: number;
  features: string[];
};

// Simulación de suscripción - en producción vendría del backend
const mockSubscription: SubscriptionInfo = {
  plan: "pro",
  maxUsers: 5,
  maxCashRegisters: 3,
  features: ["multi-user", "reports", "promotions"],
};

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  manager: "Gerente",
  vendedor: "Cajero",
};

// Ajuste: colores explícitos con soporte modo oscuro y contraste adecuado.
const planLabels: Record<string, { name: string; className: string }> = {
  basic: {
    name: "Básico",
    className: "bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white",
  },
  pro: {
    name: "Profesional",
    className: "bg-blue-100 text-blue-900 dark:bg-blue-600 dark:text-white",
  },
  enterprise: {
    name: "Empresarial",
    className:
      "bg-purple-100 text-purple-900 dark:bg-purple-600 dark:text-white",
  },
};

// Mapeo de etiquetas de features a español (si vienen en inglés del backend).
const featureLabels: Record<string, string> = {
  "multi-user": "multi-usuario",
  reports: "reportes",
  promotions: "promociones",
};

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<StoreUser[]>([]);
  const [subscription] = useState<SubscriptionInfo>(mockSubscription);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Estado para crear/editar usuario
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<StoreUser | null>(null);
  const [userForm, setUserForm] = useState({
    username: "",
    email: "",
    fullName: "",
    role: "vendedor" as "admin" | "manager" | "vendedor",
    password: "",
    cashRegisterId: "",
  });
  const [savingUser, setSavingUser] = useState(false);

  // Estado para umbrales de categoría
  const [categories, setCategories] = useState<string[]>([]);
  const [thresholds, setThresholds] = useState<CategoryThreshold[]>([]);
  const [newThreshold, setNewThreshold] = useState({
    category: "",
    minStock: 0,
  });
  const [applyingThreshold, setApplyingThreshold] = useState(false);

  // Categorías organizadas por grupo (desde inventory)
  const categoryGroups = useMemo(() => {
    const dynamic = loadDynamicCategories();
    return [
      { title: "Fermentadas", items: [...FERMENTADAS] },
      { title: "Destiladas", items: [...DESTILADAS] },
      { title: "Bebidas de Fantasía", items: [...FANTASIA] },
      ...(dynamic.length > 0 ? [{ title: "Otras", items: dynamic }] : []),
    ];
  }, []);

  // Carga inicial
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [usersData, categoriesData, thresholdsData] = await Promise.all([
        settingsService.getStoreUsers(),
        settingsService.getAvailableCategories(),
        settingsService.getCategoryThresholds(),
      ]);
      setUsers(usersData);
      setCategories(categoriesData);
      setThresholds(thresholdsData);
    } catch (e: any) {
      console.error(e);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  // ========== USUARIOS ==========
  function openCreateUserDialog() {
    setEditingUser(null);
    setUserForm({
      username: "",
      email: "",
      fullName: "",
      role: "vendedor",
      password: "",
      cashRegisterId: "",
    });
    setShowUserDialog(true);
  }

  function openEditUserDialog(user: StoreUser) {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      email: user.email || "",
      fullName: user.fullName,
      role: user.role,
      password: "", // No mostrar contraseña actual
      cashRegisterId: user.cashRegisterId || "",
    });
    setShowUserDialog(true);
  }

  async function handleSaveUser() {
    if (!userForm.username || !userForm.fullName) {
      toast.error("Usuario y nombre completo son requeridos");
      return;
    }

    if (!editingUser && !userForm.password) {
      toast.error("La contraseña es requerida para nuevos usuarios");
      return;
    }

    setSavingUser(true);
    try {
      if (editingUser) {
        // Actualizar usuario existente
        const updateData: any = {
          username: userForm.username,
          email: userForm.email || undefined,
          fullName: userForm.fullName,
          role: userForm.role,
          cashRegisterId: userForm.cashRegisterId || undefined,
        };
        if (userForm.password) {
          updateData.password = userForm.password;
        }
        await settingsService.updateStoreUser(editingUser.id, updateData);
        toast.success("Usuario actualizado");
      } else {
        // Crear nuevo usuario
        if (users.length >= subscription.maxUsers) {
          toast.error(
            `Tu plan permite máximo ${subscription.maxUsers} usuarios`
          );
          return;
        }
        await settingsService.createStoreUser({
          username: userForm.username,
          email: userForm.email || undefined,
          fullName: userForm.fullName,
          role: userForm.role,
          password: userForm.password,
          cashRegisterId: userForm.cashRegisterId || undefined,
        });
        toast.success("Usuario creado");
      }
      setShowUserDialog(false);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Error al guardar usuario");
    } finally {
      setSavingUser(false);
    }
  }

  async function handleToggleUserStatus(userId: number) {
    try {
      await settingsService.toggleUserStatus(userId);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, active: !u.active } : u))
      );
      toast.success("Estado actualizado");
    } catch (e: any) {
      toast.error(e.message || "Error al cambiar estado");
    }
  }

  async function handleDeleteUser(userId: number) {
    const user = users.find((u) => u.id === userId);
    if (
      user?.role === "admin" &&
      users.filter((u) => u.role === "admin").length <= 1
    ) {
      toast.error("No puedes eliminar el único administrador");
      return;
    }

    if (!confirm(`¿Eliminar usuario ${user?.fullName}?`)) return;

    try {
      await settingsService.deleteStoreUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("Usuario eliminado");
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar usuario");
    }
  }

  // ========== UMBRALES DE CATEGORÍA ==========
  async function handleApplyThreshold() {
    if (!newThreshold.category) {
      toast.error("Selecciona una categoría");
      return;
    }
    if (newThreshold.minStock < 0) {
      toast.error("El stock mínimo debe ser mayor o igual a 0");
      return;
    }

    setApplyingThreshold(true);
    try {
      const result = await settingsService.applyCategoryThreshold(
        newThreshold.category,
        newThreshold.minStock
      );
      toast.success(
        `Stock mínimo aplicado a ${result.productsUpdated} productos`
      );
      // Recargar umbrales
      const updated = await settingsService.getCategoryThresholds();
      setThresholds(updated);
      setNewThreshold({ category: "", minStock: 0 });
    } catch (e: any) {
      toast.error(e.message || "Error al aplicar umbral");
    } finally {
      setApplyingThreshold(false);
    }
  }

  async function handleDeleteThreshold(id: number) {
    try {
      await settingsService.deleteCategoryThreshold(id);
      setThresholds((prev) => prev.filter((t) => t.id !== id));
      toast.success("Umbral eliminado");
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar umbral");
    }
  }

  const canAddMoreUsers = users.length < subscription.maxUsers;
  const usersUsed = users.length;

  if (loading) return <div className="p-6">Cargando configuraciones...</div>;

  return (
    <div className="space-y-6">
      {/* Grid superior: izquierda Suscripción, derecha Usuarios */}
      <div className="grid gap-4 md:gap-6 md:grid-cols-2">
        {/* Card Izquierda: Plan de Suscripción */}
        <Card className="flex flex-col h-full min-w-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              <CardTitle className="text-sm font-medium">
                Plan de Suscripción
              </CardTitle>
            </div>
            <Badge
              className={`px-2 py-1 font-medium border-transparent ${
                planLabels[subscription.plan].className
              }`}
            >
              {planLabels[subscription.plan].name}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 grid-cols-2">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground">Usuarios</div>
                <div className="text-xl font-bold">
                  {usersUsed}/{subscription.maxUsers}
                </div>
                <div className="h-1.5 bg-muted rounded-full mt-1.5">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${(usersUsed / subscription.maxUsers) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground">Cajas</div>
                <div className="text-xl font-bold">
                  {users.filter((u) => u.cashRegisterId).length}/
                  {subscription.maxCashRegisters}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Disponibles
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {subscription.features.map((f) => (
                <Badge key={f} variant="outline" className="text-xs">
                  {featureLabels[f] || f}
                </Badge>
              ))}
            </div>
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowSubscriptionModal(true)}
              >
                Cambiar plan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card Derecha: Usuarios de la Tienda */}
        <Card className="flex flex-col h-full min-w-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5" />
              <div>
                <CardTitle className="text-base">
                  Usuarios de la Tienda
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Administrador y usuarios adicionales para manejar las cajas
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={openCreateUserDialog}
              disabled={!canAddMoreUsers}
            >
              <Plus className="h-4 w-4 mr-1" /> Agregar usuario
            </Button>
          </CardHeader>
          <CardContent>
            {!canAddMoreUsers && (
              <div className="mb-4 p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800 dark:text-yellow-200">
                  Has alcanzado el límite de usuarios de tu plan.
                </span>
              </div>
            )}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Caja asignada</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            @{user.username}
                            {user.email && ` · ${user.email}`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Shield className="h-3 w-3 text-muted-foreground" />
                          <span>{roleLabels[user.role] || user.role}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.active ? "default" : "secondary"}>
                          {user.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.cashRegisterId ? (
                          <Badge variant="outline">{user.cashRegisterId}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Sin asignar
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditUserDialog(user)}
                            title="Editar usuario"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Switch
                            checked={user.active}
                            onCheckedChange={() =>
                              handleToggleUserStatus(user.id)
                            }
                            disabled={
                              user.role === "admin" &&
                              users.filter(
                                (u) => u.role === "admin" && u.active
                              ).length <= 1
                            }
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={
                              user.role === "admin" &&
                              users.filter((u) => u.role === "admin").length <=
                                1
                            }
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        No hay usuarios registrados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card inferior: Stock Mínimo por Categoría (compacta) */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <CardTitle className="text-sm font-medium">
              Stock Mínimo por Categoría
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Define el stock mínimo global por categoría
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 items-center">
            <Select
              value={newThreshold.category}
              onValueChange={(v) =>
                setNewThreshold((p) => ({ ...p, category: v }))
              }
            >
              <SelectTrigger className="flex-1 h-8 text-sm">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {categoryGroups.map((group) => (
                  <SelectGroup key={group.title}>
                    <SelectLabel className="text-xs font-semibold">
                      {group.title}
                    </SelectLabel>
                    {group.items.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              placeholder="Mín."
              className="w-20 h-8 text-sm"
              value={newThreshold.minStock || ""}
              onChange={(e) =>
                setNewThreshold((p) => ({
                  ...p,
                  minStock: parseInt(e.target.value) || 0,
                }))
              }
            />
            <Button
              size="sm"
              className="h-8"
              onClick={handleApplyThreshold}
              disabled={applyingThreshold || !newThreshold.category}
            >
              <Save className="h-4 w-4 mr-1" /> Aplicar
            </Button>
          </div>

          {thresholds.length > 0 ? (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {thresholds.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                >
                  <div>
                    <span className="font-medium">{t.category}</span>
                    <span className="text-muted-foreground ml-2">
                      → mín. {t.minStock}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteThreshold(t.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              No hay umbrales definidos
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog para crear/editar usuario */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Modifica los datos del usuario"
                : "Crea un nuevo usuario para tu tienda"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre de usuario</label>
              <Input
                placeholder="usuario123"
                value={userForm.username}
                onChange={(e) =>
                  setUserForm((p) => ({ ...p, username: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre completo</label>
              <Input
                placeholder="Juan Pérez"
                value={userForm.fullName}
                onChange={(e) =>
                  setUserForm((p) => ({ ...p, fullName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email (opcional)</label>
              <Input
                type="email"
                placeholder="correo@ejemplo.cl"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {editingUser
                  ? "Nueva contraseña (dejar vacío para no cambiar)"
                  : "Contraseña"}
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={userForm.password}
                onChange={(e) =>
                  setUserForm((p) => ({ ...p, password: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Rol</label>
                <Select
                  value={userForm.role}
                  onValueChange={(v: any) =>
                    setUserForm((p) => ({ ...p, role: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendedor">Cajero</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Caja (opcional)</label>
                <Input
                  placeholder="caja-1"
                  value={userForm.cashRegisterId}
                  onChange={(e) =>
                    setUserForm((p) => ({
                      ...p,
                      cashRegisterId: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUser} disabled={savingUser}>
              {savingUser
                ? "Guardando..."
                : editingUser
                ? "Guardar cambios"
                : "Crear usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Suscripción */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onPlanChanged={() => {
          // Recargar datos después de cambiar plan
          loadData();
        }}
      />
    </div>
  );
}
