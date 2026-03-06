import { useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Separator } from "../../ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import type { CashMovement } from "../../../types";
import type { CashDraft, FrontendMovementType } from "../../../hooks/useCashDraft";

interface CashMovementsPanelProps {
  movements: CashMovement[];
  loadingMovements: boolean;
  openingAmount: number;
  draft: CashDraft;
  onDraftChange: (partial: Partial<CashDraft>) => void;
  onRegister: () => Promise<void>;
  onPrint: () => Promise<void>;
  registerLoading: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  sale: "Venta",
  deposit: "Ingreso",
  withdrawal: "Retiro",
  adjustment: "Ajuste",
  INGRESO: "Ingreso",
  EGRESO: "Egreso",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  debit: "Débito",
  credit: "Crédito",
  transfer: "Transferencia",
};

export function CashMovementsPanel({
  movements,
  loadingMovements,
  openingAmount,
  draft,
  onDraftChange,
  onRegister,
  onPrint,
  registerLoading,
}: CashMovementsPanelProps) {
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const amountSelectOnceRef = useRef(false);

  return (
    <Tabs defaultValue="register" className="w-full">
      <TabsList className="w-full grid grid-cols-2 h-8">
        <TabsTrigger value="register" className="text-xs">
          Registrar
        </TabsTrigger>
        <TabsTrigger value="history" className="text-xs">
          Historial ({movements.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="register" className="mt-2 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Tipo</label>
            <Select
              value={draft.type}
              onValueChange={(v) =>
                onDraftChange({ type: v as FrontendMovementType })
              }
            >
              <SelectTrigger className="w-full h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit">Ingreso</SelectItem>
                <SelectItem value="withdrawal">Retiro</SelectItem>
                <SelectItem value="adjustment">Ajuste</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Método</label>
            <Select
              value={draft.method || "cash"}
              onValueChange={(v) =>
                onDraftChange({ method: v as CashDraft["method"] })
              }
            >
              <SelectTrigger className="w-full h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="debit">Débito</SelectItem>
                <SelectItem value="credit">Crédito</SelectItem>
                <SelectItem value="transfer">Transf.</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Monto ($)</label>
          <Input
            type="number"
            className="h-8 text-sm"
            ref={amountInputRef}
            autoComplete="off"
            aria-label="Monto del movimiento"
            onMouseDown={(e) => {
              if (!amountSelectOnceRef.current) {
                e.preventDefault();
                const el = amountInputRef.current;
                el?.focus();
                setTimeout(() => {
                  try {
                    el?.select();
                  } catch {}
                }, 0);
                amountSelectOnceRef.current = true;
              }
            }}
            onFocus={() => {
              if (!amountSelectOnceRef.current) {
                const el = amountInputRef.current;
                setTimeout(() => {
                  try {
                    el?.select();
                  } catch {}
                }, 0);
                amountSelectOnceRef.current = true;
              }
            }}
            onBlur={() => {
              amountSelectOnceRef.current = false;
            }}
            value={draft.amount}
            onChange={(e) => onDraftChange({ amount: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Descripción</label>
          <Input
            className="h-8 text-sm"
            autoComplete="off"
            value={draft.description}
            onChange={(e) => onDraftChange({ description: e.target.value })}
          />
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={onPrint}
          >
            Imprimir
          </Button>
          <Button
            size="sm"
            className="flex-1"
            disabled={registerLoading}
            onClick={onRegister}
          >
            {registerLoading ? "..." : "Registrar"}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="history" className="mt-2">
        <div className="max-h-48 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs py-1">Fecha</TableHead>
                <TableHead className="text-xs py-1">Tipo</TableHead>
                <TableHead className="text-xs py-1 text-right">
                  Monto
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingMovements ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-xs py-1"
                  >
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs py-1">
                      {new Date(
                        m.date || (m as any).createdAt
                      ).toLocaleTimeString("es-CL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-xs py-1">
                      {TYPE_LABELS[m.type] || m.type}
                    </TableCell>
                    <TableCell
                      className={`text-xs py-1 text-right ${
                        m.amount < 0
                          ? "text-destructive"
                          : "text-emerald-600"
                      }`}
                    >
                      {m.amount < 0 ? "-" : "+"}$
                      {Math.abs(m.amount).toLocaleString("es-CL")}
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!loadingMovements && movements.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground text-xs py-1"
                  >
                    Sin movimientos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}
