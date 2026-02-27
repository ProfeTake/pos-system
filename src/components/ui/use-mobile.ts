import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // Inicializar con el valor real de la ventana para evitar flash de layout en móvil.
  // En SSR donde window no existe, se usa false como fallback seguro.
  const [isMobile, setIsMobile] = React.useState<boolean>(
    () => typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    // Re-sincronizar por si cambió entre el render inicial y el efecto
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
