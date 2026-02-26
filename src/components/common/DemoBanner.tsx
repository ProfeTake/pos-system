import { useEffect, useState } from "react";
import { isDemoMode } from "../../lib/demo";

/**
 * Badge fijo que indica al visitante que está en Modo Demo.
 * Revisa sessionStorage periódicamente para reaccionar a cambios.
 */
export function DemoBanner() {
  const [visible, setVisible] = useState(isDemoMode);

  useEffect(() => {
    // Revisar cada 500ms si cambió el flag en sessionStorage
    const id = setInterval(() => setVisible(isDemoMode()), 500);
    return () => clearInterval(id);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{ zIndex: 9999 }}
      className="fixed bottom-4 right-4 flex items-center gap-2 rounded-full bg-amber-500 px-3 py-1.5 shadow-lg select-none"
      title="Los datos mostrados son ficticios. Los cambios no se guardan."
    >
      <span className="size-2 rounded-full bg-white animate-pulse" />
      <span className="text-xs font-semibold uppercase tracking-wide text-white">
        Modo Demo
      </span>
    </div>
  );
}
