import { useState, useEffect, useCallback } from "react";

const LS_MOVEMENT_DRAFT = "pos.cash.movementDraft";

export type FrontendMovementType = "sale" | "deposit" | "withdrawal" | "adjustment";

export interface CashDraft {
  type: FrontendMovementType;
  method: "cash" | "debit" | "credit" | "transfer";
  amount: number;
  description: string;
}

const DEFAULT_DRAFT: CashDraft = {
  type: "deposit",
  method: "cash",
  amount: 0,
  description: "",
};

/**
 * Custom hook para manejar el borrador de movimientos de caja.
 * Persiste automáticamente en localStorage.
 */
export function useCashDraft() {
  const [draft, setDraft] = useState<CashDraft>(() => {
    try {
      const raw = localStorage.getItem(LS_MOVEMENT_DRAFT);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_DRAFT, ...parsed };
      }
    } catch {}
    return { ...DEFAULT_DRAFT };
  });

  // Persistir cambios en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_MOVEMENT_DRAFT, JSON.stringify(draft));
    } catch {}
  }, [draft]);

  const resetDraft = useCallback(
    (keepMethod = true) => {
      setDraft({
        ...DEFAULT_DRAFT,
        method: keepMethod ? draft.method : DEFAULT_DRAFT.method,
      });
    },
    [draft.method]
  );

  const updateDraft = useCallback(
    (partial: Partial<CashDraft>) => {
      setDraft((prev) => ({ ...prev, ...partial }));
    },
    []
  );

  return { draft, setDraft, updateDraft, resetDraft } as const;
}
