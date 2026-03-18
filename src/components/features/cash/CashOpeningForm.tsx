import { useEffect, useRef, useState } from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";

interface CashOpeningFormProps {
  onOpen: (amount: number) => Promise<void>;
  loading: boolean;
}

export function CashOpeningForm({ onOpen, loading }: CashOpeningFormProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [amountInput, setAmountInput] = useState("");

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSubmit = async () => {
    if (loading) return;
    if (!amountInput || amountInput.trim() === "") return;
    const amount = Number(amountInput);
    if (Number.isNaN(amount) || amount <= 0) return;
    await onOpen(amount);
    setAmountInput("");
  };

  return (
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
  );
}
