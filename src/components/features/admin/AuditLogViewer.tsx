import { useState, useEffect, ChangeEvent } from "react";
import {
  getAuditLog,
  getUniqueActions,
  getUniqueEntities,
  getAuditStats,
  type AuditLogEntry,
  type AuditLogFilters,
  type AuditStats,
} from "../../../services/audit.service";
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
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Activity,
  Users,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

// Mapeo de acciones a colores
const actionColors: Record<string, string> = {
  "auth.login":
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "auth.logout":
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  "auth.login_failed":
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "sale.create":
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "sale.void":
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "sale.refund":
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "product.create":
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  "product.update":
    "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  "product.delete": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "cash_session.open":
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "cash_session.close":
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "promotion.create":
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "promotion.toggle":
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
};

// Mapeo de acciones a texto legible
const actionLabels: Record<string, string> = {
  "auth.login": "Inicio de sesión",
  "auth.logout": "Cierre de sesión",
  "auth.login_failed": "Intento fallido",
  "sale.create": "Nueva venta",
  "sale.void": "Venta anulada",
  "sale.refund": "Devolución",
  "product.create": "Producto creado",
  "product.update": "Producto actualizado",
  "product.delete": "Producto eliminado",
  "product.import": "Importación masiva",
  "cash_session.open": "Apertura de caja",
  "cash_session.close": "Cierre de caja",
  "cash_movement.create": "Movimiento de caja",
  "promotion.create": "Promoción creada",
  "promotion.update": "Promoción actualizada",
  "promotion.delete": "Promoción eliminada",
  "promotion.toggle": "Promoción activada/desactivada",
  "settings.update": "Configuración actualizada",
  "user.create": "Usuario creado",
  "user.update": "Usuario actualizado",
  "user.delete": "Usuario eliminado",
};

export function AuditLogViewer() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(
    null
  );

  // Filtros
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 20,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
  }, []);

  // Cargar registros cuando cambian los filtros
  useEffect(() => {
    loadEntries();
  }, [filters]);

  const loadInitialData = async () => {
    try {
      const [actionsData, entitiesData, statsData] = await Promise.all([
        getUniqueActions(),
        getUniqueEntities(),
        getAuditStats(),
      ]);
      setActions(actionsData);
      setEntities(entitiesData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading audit data:", error);
    }
  };

  const loadEntries = async () => {
    setLoading(true);
    try {
      const response = await getAuditLog(filters);
      setEntries(response.data);
      setPagination({
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
      });
    } catch (error) {
      console.error("Error loading audit entries:", error);
      toast.error("Error al cargar registros de auditoría");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (
    key: keyof AuditLogFilters,
    value: string | undefined
  ) => {
    setFilters((prev: AuditLogFilters) => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
      page: 1, // Reset page on filter change
    }));
  };

  const clearFilters = () => {
    setFilters({ page: 1, limit: 20 });
  };

  const getActionBadge = (action: string) => {
    const colorClass = actionColors[action] || "bg-gray-100 text-gray-800";
    const label = actionLabels[action] || action;
    return (
      <Badge variant="secondary" className={colorClass}>
        {label}
      </Badge>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Registros
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalEntries.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoy</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.todayEntries.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Usuarios Activos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Acción Más Común
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {stats.topActions[0]
                  ? actionLabels[stats.topActions[0].action] ||
                    stats.topActions[0].action
                  : "N/A"}
              </div>
              {stats.topActions[0] && (
                <p className="text-xs text-muted-foreground">
                  {stats.topActions[0].count} veces
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select
              value={filters.action || "all"}
              onValueChange={(value: string) =>
                handleFilterChange("action", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                {actions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {actionLabels[action] || action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.entity || "all"}
              onValueChange={(value: string) =>
                handleFilterChange("entity", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Entidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las entidades</SelectItem>
                {entities.map((entity) => (
                  <SelectItem key={entity} value={entity}>
                    {entity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="Desde"
              value={filters.dateFrom || ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleFilterChange("dateFrom", e.target.value || undefined)
              }
            />

            <Input
              type="date"
              placeholder="Hasta"
              value={filters.dateTo || ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleFilterChange("dateTo", e.target.value || undefined)
              }
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex-1"
              >
                Limpiar
              </Button>
              <Button variant="outline" onClick={loadEntries} size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de registros */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>IP</TableHead>
                <TableHead className="w-[80px]">Detalles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No se encontraron registros
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(entry.createdAt)}
                    </TableCell>
                    <TableCell>
                      {entry.username || (
                        <span className="text-muted-foreground">Sistema</span>
                      )}
                    </TableCell>
                    <TableCell>{getActionBadge(entry.action)}</TableCell>
                    <TableCell>
                      {entry.entity || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.entityId || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {entry.ipAddress || "-"}
                    </TableCell>
                    <TableCell>
                      {entry.details && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paginación */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {entries.length} de {pagination.total} registros
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setFilters((prev: AuditLogFilters) => ({
                ...prev,
                page: (prev.page || 1) - 1,
              }))
            }
            disabled={!filters.page || filters.page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm">
            Página {filters.page || 1} de {pagination.totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setFilters((prev: AuditLogFilters) => ({
                ...prev,
                page: (prev.page || 1) + 1,
              }))
            }
            disabled={(filters.page || 1) >= pagination.totalPages}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Modal de detalles */}
      <Dialog
        open={!!selectedEntry}
        onOpenChange={() => setSelectedEntry(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles del Registro</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Fecha
                  </label>
                  <p>{formatDate(selectedEntry.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Usuario
                  </label>
                  <p>{selectedEntry.username || "Sistema"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Acción
                  </label>
                  <p>{getActionBadge(selectedEntry.action)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Entidad
                  </label>
                  <p>{selectedEntry.entity || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    ID Entidad
                  </label>
                  <p>{selectedEntry.entityId || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    IP
                  </label>
                  <p>{selectedEntry.ipAddress || "-"}</p>
                </div>
              </div>
              {selectedEntry.details && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Datos Adicionales
                  </label>
                  <pre className="mt-2 p-4 bg-muted rounded-lg text-sm overflow-auto max-h-[300px]">
                    {JSON.stringify(selectedEntry.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
