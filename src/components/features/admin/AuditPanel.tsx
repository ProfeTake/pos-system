import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Separator } from "../../ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import {
  AlertTriangle,
  CheckCircle,
  DollarSign,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetchJSON } from "../../../lib/api";

interface CashValidation {
  openingAmount: number;
  totalMovements: number;
  expectedBalance: number;
  salesTotal: number;
  depositsTotal: number;
  withdrawalsTotal: number;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  type: "sale" | "stock_update" | "cash_movement" | "session_change";
  description: string;
  user?: string;
  details?: any;
}

export default function AuditPanel({
  sessionId,
  onClose,
}: {
  sessionId: string | null;
  onClose: () => void;
}) {
  const [validation, setValidation] = useState<CashValidation | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const validateCashIntegrity = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const data = await apiFetchJSON<any>(
        `/api/cash-session/validate/${sessionId}`
      );
      setValidation(data.validation);
      setLastCheck(new Date());
      toast.success("Validación completada");
    } catch (error: any) {
      console.error("Error validating cash:", error);
      toast.error(error.message || "Error validando caja");
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLog = async () => {
    if (!sessionId) return;

    try {
      // Aquí implementarías el endpoint para obtener logs de auditoría
      // Por ahora, datos simulados
      setAuditLog([
        {
          id: "1",
          timestamp: new Date().toISOString(),
          type: "session_change",
          description: "Sesión de caja abierta",
          user: "Admin",
        },
        {
          id: "2",
          timestamp: new Date().toISOString(),
          type: "sale",
          description: "Venta procesada",
          details: { amount: 15000, items: 3 },
        },
      ]);
    } catch (error) {
      console.error("Error loading audit log:", error);
    }
  };

  useEffect(() => {
    if (sessionId) {
      validateCashIntegrity();
      loadAuditLog();
    }
  }, [sessionId]);

  const getStatusIcon = () => {
    if (!validation)
      return <RefreshCw className="h-5 w-5 text-muted-foreground" />;

    const isBalanced =
      Math.abs(
        validation.expectedBalance -
        (validation.openingAmount + validation.totalMovements)
      ) < 0.01;

    return isBalanced ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <AlertTriangle className="h-5 w-5 text-red-600" />
    );
  };

  const getStatusText = () => {
    if (!validation) return "Sin validar";

    const isBalanced =
      Math.abs(
        validation.expectedBalance -
        (validation.openingAmount + validation.totalMovements)
      ) < 0.01;

    return isBalanced ? "Caja balanceada" : "Discrepancia detectada";
  };

  const formatCurrency = (amount: number) =>
    `$${Math.round(amount).toLocaleString("es-CL")}`;

  const getTypeIcon = (type: AuditLogEntry["type"]) => {
    switch (type) {
      case "sale":
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case "cash_movement":
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case "session_change":
        return <CheckCircle className="h-4 w-4 text-purple-600" />;
      default:
        return <RefreshCw className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <Card className="w-full sm:max-w-xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon()}
                Panel de Auditoría
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Validación de integridad y registro de actividades
              </p>
            </div>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Estado de Validación */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Integridad de Caja</h3>
              <div className="flex items-center gap-2">
                <Badge variant={validation ? "default" : "secondary"}>
                  {getStatusText()}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={validateCashIntegrity}
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    "Validar"
                  )}
                </Button>
              </div>
            </div>

            {validation && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">
                      Apertura
                    </div>
                    <div className="text-xl font-bold">
                      {formatCurrency(validation.openingAmount)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Ventas</div>
                    <div className="text-xl font-bold text-green-600">
                      +{formatCurrency(validation.salesTotal)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Retiros</div>
                    <div className="text-xl font-bold text-red-600">
                      -{formatCurrency(validation.withdrawalsTotal)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">
                      Balance Esperado
                    </div>
                    <div className="text-xl font-bold">
                      {formatCurrency(validation.expectedBalance)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {lastCheck && (
              <p className="text-xs text-muted-foreground mt-2">
                Última validación: {lastCheck.toLocaleString()}
              </p>
            )}
          </div>

          <Separator />

          {/* Log de Auditoría */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Registro de Actividades
            </h3>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(entry.type)}
                          <span className="capitalize">
                            {entry.type.replace("_", " ")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{entry.description}</div>
                          {entry.details && (
                            <div className="text-xs text-muted-foreground">
                              {JSON.stringify(entry.details)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{entry.user || "Sistema"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {auditLog.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        No hay registros de auditoría
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
