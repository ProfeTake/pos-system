import { useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Separator } from "../../ui/separator";

interface CashClosingWizardProps {
  /** System-calculated balance (what the register should have) */
  systemBalance: number;
  /** Opening amount of the session */
  openingAmount: number;
  /** Callback to confirm close */
  onClose: (declaredCash: number, systemBalance: number, notes?: string) => Promise<void>;
  /** Callback to cancel (go back) */
  onCancel: () => void;
  loading: boolean;
}

type WizardStep = "declare" | "result";

export function CashClosingWizard({
  systemBalance,
  openingAmount,
  onClose,
  onCancel,
  loading,
}: CashClosingWizardProps) {
  const [step, setStep] = useState<WizardStep>("declare");
  const [declaredInput, setDeclaredInput] = useState("");
  const [notes, setNotes] = useState("");

  const declaredAmount = Number(declaredInput) || 0;
  const difference = declaredAmount - systemBalance;
  const absDifference = Math.abs(difference);

  // Threshold-based coloring
  const getDifferenceStatus = () => {
    if (absDifference <= 500)
      return { color: "text-emerald-600", badge: "default" as const, label: "Cuadrado" };
    if (absDifference <= 5000)
      return { color: "text-amber-600", badge: "secondary" as const, label: "Diferencia menor" };
    return {
      color: "text-destructive",
      badge: "destructive" as const,
      label: "Diferencia significativa",
    };
  };

  const handleDeclare = () => {
    if (!declaredInput || declaredAmount < 0) return;
    setStep("result");
  };

  const handleConfirmClose = async () => {
    await onClose(declaredAmount, systemBalance, notes || undefined);
  };

  if (step === "declare") {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-sm font-semibold">Cierre de caja — Paso 1</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Cuenta el dinero físico en la caja e ingresa el monto total.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium">
            Monto declarado (efectivo contado)
          </label>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            className="text-lg font-mono mt-1"
            placeholder="0"
            autoComplete="off"
            aria-label="Monto declarado en pesos"
            value={declaredInput}
            onChange={(e) =>
              setDeclaredInput(e.target.value.replace(/[^0-9]/g, ""))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleDeclare();
              }
            }}
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            className="flex-1"
            disabled={!declaredInput || declaredAmount < 0}
            onClick={handleDeclare}
          >
            Siguiente
          </Button>
        </div>
      </div>
    );
  }

  // step === "result"
  const status = getDifferenceStatus();

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-sm font-semibold">Cierre de caja — Resultado</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-xs text-muted-foreground">Apertura</span>
          <p className="font-semibold">
            ${openingAmount.toLocaleString("es-CL")}
          </p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">
            Balance esperado
          </span>
          <p className="font-semibold">
            ${systemBalance.toLocaleString("es-CL")}
          </p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Tu declaración</span>
          <p className="font-semibold">
            ${declaredAmount.toLocaleString("es-CL")}
          </p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Diferencia</span>
          <p className={`font-bold ${status.color}`}>
            {difference >= 0 ? "+" : "-"}${absDifference.toLocaleString("es-CL")}
          </p>
          <Badge variant={status.badge} className="mt-1 text-[10px]">
            {status.label}
          </Badge>
        </div>
      </div>

      <Separator />

      <div>
        <label className="text-xs text-muted-foreground">
          Notas (opcional)
        </label>
        <Input
          className="h-8 text-sm mt-1"
          placeholder="Ej: cambio de turno, feriado..."
          autoComplete="off"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setStep("declare")}
        >
          Revisar de nuevo
        </Button>
        <Button
          className="flex-1"
          disabled={loading}
          onClick={handleConfirmClose}
        >
          {loading ? "Cerrando..." : "Confirmar cierre"}
        </Button>
      </div>
    </div>
  );
}
