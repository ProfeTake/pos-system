import { useEffect, useState } from "react";

/**
 * useModalExit
 * Gestiona renderizado y animación de salida para modales controladas.
 * - shouldRender: montar/desmontar con retraso para ver la animación
 * - isExiting: estado para aplicar clases/estilos de salida
 * - requestClose(): inicia la salida y llama onClose después de durationMs
 */
export function useModalExit(
  isOpen: boolean,
  onClose: () => void,
  durationMs = 220
) {
  const [isExiting, setIsExiting] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsExiting(false);
      setShouldRender(true);
    } else if (!isOpen && shouldRender) {
      setIsExiting(true);
      const t = setTimeout(() => setShouldRender(false), durationMs);
      return () => clearTimeout(t);
    }
  }, [isOpen, shouldRender, durationMs]);

  const requestClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(), durationMs);
  };

  return { shouldRender, isExiting, requestClose } as const;
}

export default useModalExit;
