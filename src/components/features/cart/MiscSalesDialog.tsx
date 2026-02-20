import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Separator } from "../../ui/separator";
import { Trash2 } from "lucide-react";

interface MiscSalesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (items: number[]) => void; // items finales que se agregarán al carrito
  existingItems?: number[]; // items ya existentes en el carrito
  onRemoveExisting?: (index: number) => void; // remover item existente
}

export function MiscSalesDialog({
  open,
  onOpenChange,
  onConfirm,
  existingItems = [],
  onRemoveExisting,
}: MiscSalesDialogProps) {
  // Estado replicando la modal inline del `components/ShoppingCart.tsx`
  const [miscDraft, setMiscDraft] = useState<string>("");
  const [miscDraftList, setMiscDraftList] = useState<number[]>([]);
  const [miscAddSeparate, setMiscAddSeparate] = useState(false);
  const miscInputRef = useRef<HTMLInputElement | null>(null);

  // Evaluador de expresiones (copiado de la versión inline)
  function evalExpression(expr: string): number | null {
    try {
      if (!expr) return null;
      let s = String(expr)
        .replace(/\s+/g, "")
        .replace(/x/gi, "*")
        .replace(/,/g, "");
      if (!/^[-+*/().0-9]*$/.test(s)) return null;
      const output: (number | string)[] = [];
      const ops: string[] = [];
      const prec: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };
      const rightAssoc: Record<string, boolean> = { "-": false };
      let i = 0;
      while (i < s.length) {
        const ch = s[i];
        if (/[0-9.]/.test(ch)) {
          let j = i + 1;
          while (j < s.length && /[0-9.]/.test(s[j])) j++;
          const num = parseFloat(s.slice(i, j));
          if (Number.isNaN(num)) return null;
          output.push(num);
          i = j;
          continue;
        }
        if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
          if (
            (ch === "-" || ch === "+") &&
            (i === 0 || s[i - 1] === "(" || "+-*/".includes(s[i - 1]))
          ) {
            let j = i + 1;
            while (j < s.length && /[0-9.]/.test(s[j])) j++;
            const num = parseFloat(s.slice(i, j));
            if (Number.isNaN(num)) return null;
            output.push(num);
            i = j;
            continue;
          }
          while (
            ops.length &&
            ops[ops.length - 1] !== "(" &&
            (prec[ops[ops.length - 1]] > prec[ch] ||
              (prec[ops[ops.length - 1]] === prec[ch] && !rightAssoc[ch]))
          ) {
            output.push(ops.pop()!);
          }
          ops.push(ch);
          i++;
          continue;
        }
        if (ch === "(") {
          ops.push(ch);
          i++;
          continue;
        }
        if (ch === ")") {
          while (ops.length && ops[ops.length - 1] !== "(") {
            output.push(ops.pop()!);
          }
          if (ops.pop() !== "(") return null;
          i++;
          continue;
        }
        return null;
      }
      while (ops.length) {
        const op = ops.pop()!;
        if (op === "(" || op === ")") return null;
        output.push(op);
      }
      const st: number[] = [];
      for (const token of output) {
        if (typeof token === "number") st.push(token);
        else {
          const b = st.pop();
          const a = st.pop();
          if (a == null || b == null) return null;
          let r = 0;
          switch (token) {
            case "+":
              r = a + b;
              break;
            case "-":
              r = a - b;
              break;
            case "*":
              r = a * b;
              break;
            case "/":
              if (b === 0) return null;
              r = a / b;
              break;
            default:
              return null;
          }
          st.push(r);
        }
      }
      if (st.length !== 1) return null;
      return st[0];
    } catch {
      return null;
    }
  }

  function addCurrentDraft() {
    const evald = evalExpression(miscDraft);
    const v = Math.max(0, Number(evald ?? miscDraft) || 0);
    if (v > 0) setMiscDraftList((lst) => [...lst, v]);
    requestAnimationFrame(() => {
      try {
        miscInputRef.current?.focus();
        miscInputRef.current?.select();
      } catch {}
    });
  }

  const subtotal = miscDraftList.reduce((s, n) => s + (Number(n) || 0), 0);
  const calculated = (() => {
    const v = evalExpression(miscDraft);
    return v != null && v > 0 ? Math.round(v) : null;
  })();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) {
          setMiscDraft("");
          setMiscDraftList([]);
          setMiscAddSeparate(false);
          setTimeout(() => {
            try {
              miscInputRef.current?.focus();
              miscInputRef.current?.select();
            } catch {}
          }, 50);
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Venta variada</DialogTitle>
          <DialogDescription>
            Ingresa un monto manual (o expresión: 3x500+200) para sumarlo a la
            venta.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Monto ($)</label>
            <div className="flex gap-2">
              <Input
                type="text"
                min={0}
                value={miscDraft}
                onChange={(e) => setMiscDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addCurrentDraft();
                  }
                }}
                placeholder="0"
                className="no-spin"
                ref={miscInputRef}
              />
              <Button type="button" onClick={addCurrentDraft}>
                Añadir
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setMiscDraftList((lst) => [...lst, 1000])}
            >
              +1.000
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => setMiscDraftList((lst) => [...lst, 2000])}
            >
              +2.000
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => setMiscDraftList((lst) => [...lst, 500])}
            >
              +500
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => setMiscDraftList((lst) => [...lst, 5000])}
            >
              +5.000
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setMiscDraft("");
                setMiscDraftList([]);
              }}
            >
              Limpiar
            </Button>
          </div>
          {miscDraftList.length > 0 && (
            <div className="mt-2">
              <div className="text-sm font-medium mb-1">Detalle agregado</div>
              <div className="space-y-1 max-h-40 overflow-auto pr-1">
                {miscDraftList.map((amt, idx) => (
                  <div
                    key={`miscdraft-${idx}`}
                    className="flex items-center justify-between text-sm bg-muted/40 rounded px-2 py-1"
                  >
                    <span>#{idx + 1}</span>
                    <span className="font-medium">
                      ${amt.toLocaleString("es-CL")}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() =>
                        setMiscDraftList((arr) =>
                          arr.filter((_, i) => i !== idx)
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  ${subtotal.toLocaleString("es-CL")}
                </span>
              </div>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={miscAddSeparate}
                  onChange={(e) => setMiscAddSeparate(e.target.checked)}
                />
                Agregar como líneas separadas
              </label>
            </div>
          )}
          {miscDraft && (
            <div className="text-xs text-muted-foreground">
              Calculado:{" "}
              {calculated != null
                ? `$${calculated.toLocaleString("es-CL")}`
                : "—"}
            </div>
          )}

          {existingItems.length > 0 && (
            <div className="mt-4 pt-3 border-t">
              <div className="text-sm font-medium mb-1">En el carrito</div>
              <div className="space-y-1 max-h-40 overflow-auto pr-1">
                {existingItems.map((amt, idx) => (
                  <div
                    key={`misc-existing-${idx}`}
                    className="flex items-center justify-between text-sm bg-muted/20 rounded px-2 py-1"
                  >
                    <span>Venta variada #{idx + 1}</span>
                    <span className="font-medium">
                      ${amt.toLocaleString("es-CL")}
                    </span>
                    {onRemoveExisting && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => onRemoveExisting(idx)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              let list = miscDraftList.slice();
              const singleExprVal = Math.max(
                0,
                Number(evalExpression(miscDraft) ?? miscDraft) || 0
              );
              if (list.length === 0 && singleExprVal > 0) {
                list = [singleExprVal];
              }
              const subtotalFinal = list.reduce(
                (s, n) => s + (Number(n) || 0),
                0
              );
              if (subtotalFinal <= 0) return;
              const finalItems = miscAddSeparate ? list : [subtotalFinal];
              onConfirm(finalItems);
              onOpenChange(false);
            }}
            disabled={
              miscDraftList.reduce((s, n) => s + (Number(n) || 0), 0) <= 0 &&
              (Number(evalExpression(miscDraft) ?? miscDraft) || 0) <= 0
            }
          >
            Agregar al carrito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
