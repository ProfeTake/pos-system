import React, { createContext, useContext, useRef } from "react";
import { useMandatoryCashSession } from "./useMandatoryCashSession";

// Tipo completo que expone todas las funciones del hook
type MandatoryCashSessionReturn = ReturnType<typeof useMandatoryCashSession>;

interface CashStatusContextValue {
  cashOpen: boolean;
  mustOpen: boolean;
  loading: boolean;
  session: MandatoryCashSessionReturn["session"];
  closeAt: MandatoryCashSessionReturn["closeAt"];
  refresh: MandatoryCashSessionReturn["refresh"];
  openSession: MandatoryCashSessionReturn["openSession"];
  closeSession: MandatoryCashSessionReturn["closeSession"];
  extendSession: MandatoryCashSessionReturn["extendSession"];
  addMovement: MandatoryCashSessionReturn["addMovement"];
  getCurrentBalance: MandatoryCashSessionReturn["getCurrentBalance"];
  getCurrentMovements: MandatoryCashSessionReturn["getCurrentMovements"];
  checkShiftChange: MandatoryCashSessionReturn["checkShiftChange"];
  withinOperationalHours: MandatoryCashSessionReturn["withinOperationalHours"];
  window: MandatoryCashSessionReturn["window"];
  nextOpen: MandatoryCashSessionReturn["nextOpen"];
}

const CashStatusContext = createContext<CashStatusContextValue | undefined>(
  undefined
);

export function CashStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const cashSession = useMandatoryCashSession();

  // Usar ref para mantener el valor estable y evitar re-renders en cascada
  // Solo actualizar cuando los valores primitivos clave cambien
  const valueRef = useRef<CashStatusContextValue | null>(null);

  // Determinar si necesitamos actualizar basándonos en valores primitivos clave
  const currentMustOpen = cashSession.mustOpen;
  const currentLoading = cashSession.loading;
  const currentSessionOpenedAt = cashSession.session?.openedAt;

  if (
    !valueRef.current ||
    valueRef.current.mustOpen !== currentMustOpen ||
    valueRef.current.loading !== currentLoading ||
    valueRef.current.session?.openedAt !== currentSessionOpenedAt
  ) {
    valueRef.current = {
      cashOpen: !cashSession.mustOpen,
      mustOpen: cashSession.mustOpen,
      loading: cashSession.loading,
      session: cashSession.session,
      closeAt: cashSession.closeAt,
      refresh: cashSession.refresh,
      openSession: cashSession.openSession,
      closeSession: cashSession.closeSession,
      extendSession: cashSession.extendSession,
      addMovement: cashSession.addMovement,
      getCurrentBalance: cashSession.getCurrentBalance,
      getCurrentMovements: cashSession.getCurrentMovements,
      checkShiftChange: cashSession.checkShiftChange,
      withinOperationalHours: cashSession.withinOperationalHours,
      window: cashSession.window,
      nextOpen: cashSession.nextOpen,
    };
  }

  return (
    <CashStatusContext.Provider value={valueRef.current}>
      {children}
    </CashStatusContext.Provider>
  );
}

export function useCashStatus() {
  const ctx = useContext(CashStatusContext);
  if (!ctx)
    throw new Error("useCashStatus debe usarse dentro de CashStatusProvider");
  return ctx;
}
