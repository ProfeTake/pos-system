import { Moon, Sun } from "lucide-react";
import { memo } from "react";
import { useTheme } from "next-themes";
import { Button } from "../ui/button";

/**
 * ThemeToggle component optimized with React.memo
 * Prevents unnecessary re-renders when parent components update
 */
export const ThemeToggle = memo(function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();

  const current = theme === "system" ? systemTheme : theme;
  const isDark = current === "dark";

  const handleToggle = () => {
    const next = isDark ? "light" : "dark";

    // Respeta preferencias de movimiento reducido
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Usa View Transitions API si está disponible (Chrome 111+, Edge 111+)
    const supportsViewTransitions =
      typeof document !== "undefined" &&
      "startViewTransition" in document &&
      typeof (document as any).startViewTransition === "function";

    if (!prefersReduced && supportsViewTransitions) {
      (document as any).startViewTransition(() => {
        setTheme(next);
      });
      return;
    }

    // Fallback: cambio instantáneo (sin clase temporal para evitar lag)
    setTheme(next);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Cambiar tema"
      title="Cambiar tema"
      onClick={handleToggle}
      className="shrink-0"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
});

ThemeToggle.displayName = "ThemeToggle";

export default ThemeToggle;
