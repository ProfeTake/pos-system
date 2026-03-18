import { useEffect, useMemo, useState } from "react";
import { Separator } from "../../ui/separator";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";

export interface PriceCalculatorDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

function roundTo(value: number, step = 10) {
  if (!step) return value;
  return Math.round(value / step) * step;
}

export function PriceCalculatorDialog({
  isOpen,
  onClose,
}: PriceCalculatorDialogProps) {
  const [cost, setCost] = useState<number>(0);
  const [desiredMarginPct, setDesiredMarginPct] = useState<number>(40);
  const [roundStep, setRoundStep] = useState<number>(10);

  const result = useMemo(() => {
    const net = cost * (1 + (desiredMarginPct || 0) / 100);
    const suggested = roundTo(net, roundStep || 0);
    const marginAmount = suggested - cost;
    const realMarginPct = cost > 0 ? (marginAmount / cost) * 100 : 0;
    return { net, suggested, marginAmount, realMarginPct };
  }, [cost, desiredMarginPct, roundStep]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Calculadora de Precios</DialogTitle>
          <DialogDescription>
            Ingresa costo y margen para obtener un precio sugerido.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Costo</label>
              <Input
                type="number"
                min={0}
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">Margen (%)</label>
                <Input
                  type="number"
                  min={0}
                  value={desiredMarginPct}
                  onChange={(e) => setDesiredMarginPct(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Redondear a</label>
                <Input
                  type="number"
                  min={0}
                  value={roundStep}
                  onChange={(e) => setRoundStep(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Precio</div>
              <div className="text-lg font-semibold">
                ${result.net.toLocaleString("es-CL")}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Sugerido</div>
              <div className="text-xl font-bold text-primary">
                ${result.suggested.toLocaleString("es-CL")}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Margen real</div>
              <div className="text-lg font-semibold">
                {result.realMarginPct.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PriceCalculatorDialog;
