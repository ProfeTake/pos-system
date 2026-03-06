import { useEffect, useRef, useState } from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";

interface CashOpeningFormProps {
  onOpen: (amount: number) => Promise<void>;
  loading: boolean;
  /** True when the previous session was auto-closed and user wants to reopen */
  wasAutoClosed?: boolean;
}

export function CashOpeningForm({
  onOpen,
  loading,
  wasAutoClosed = false,
}: CashOpeningFormProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSubmit = async () => {
    if (loading) return;
    if (!amountInput || amountInput.trim() === "") return;
    const amount = Number(amountInput);
    if (Number.isNaN(amount) || amount <= 0) return;

    if (wasAutoClosed) {
      setPendingAmount(amount);
      setShowReopenConfirm(true);
      return;
    }

    await onOpen(amount);
    setAmountInput("");
  };

  const confirmReopen = async () => {
    setShowReopenConfirm(false);
    if (pendingAmount !== null) {
      await onOpen(pendingAmount);
      setAmountInput("");
      setPendingAmount(null);
    }
  };

  return (
    <>
      <div className="space-y-3">
        <div>
          <label className="text-sm text-muted-foreground">
            Monto de apertura
          </label>
          <Input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            min={0}
            value={amountInput}
            onChange={(e) =>
              setAmountInput(e.target.value.replace(/[^0-9]/g, ""))
            }
            placeholder="0"
            autoComplete="off"
            aria-label="Monto de apertura en pesos"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
        </div>
        <Button className="w-full" disabled={loading} onClick={handleSubmit}>
          {loading ? "Abriendo..." : "Abrir caja"}
        </Button>
      </div>

      {/* Confirmación de reapertura post cierre automático */}
      <Dialog
        open={showReopenConfirm}
        onOpenChange={(open) => {
          if (!open) {
            setShowReopenConfirm(false);
            setPendingAmount(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>¿Reabrir caja?</DialogTitle>
            <DialogDescription>
              La caja se cerró automáticamente al fin del turno. Si reabres, la
              sesión continuará con extensión controlada por el sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowReopenConfirm(false);
                setPendingAmount(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={confirmReopen} disabled={loading}>
              {loading ? "Abriendo..." : "Sí, reabrir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
