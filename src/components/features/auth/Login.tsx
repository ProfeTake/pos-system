import { useState, useEffect } from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Alert, AlertDescription } from "../../ui/alert";
import { Card, CardContent } from "../../ui/card";
import { Checkbox } from "../../ui/checkbox";
import { Label } from "../../ui/label";
import {
  User,
  Lock,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "../../../hooks/useAuth";
import { loginSchema, safeParse } from "../../../lib/schemas";
import { Logo } from "../../common/Logo";
import ThemeToggle from "../../common/ThemeToggle";

type LoginProps = {
  onSuccess?: (user: any) => void;
  loginFn?: (
    username: string,
    password: string,
    remember?: boolean
  ) => Promise<any>;
};

export default function Login({ onSuccess, loginFn }: LoginProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Prefill de usuario y preferencia de "Recuérdame"
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("auth_username");
      const savedRemember = localStorage.getItem("auth_remember") === "1";
      if (savedUser) setUsername(savedUser);
      if (savedRemember) setRememberMe(true);
    } catch { }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const validation = safeParse(loginSchema, {
      username,
      password,
      remember: rememberMe,
    });
    if (!validation.ok) {
      setError(validation.error);
      return;
    }
    setLoading(true);
    try {
      const doLogin = loginFn ?? login;
      const user = await doLogin(username, password, rememberMe);
      try {
        if (rememberMe) {
          localStorage.setItem("auth_username", username);
          localStorage.setItem("auth_remember", "1");
        } else {
          localStorage.removeItem("auth_username");
          localStorage.removeItem("auth_remember");
        }
      } catch { }
      toast.success(`¡Bienvenido, ${user.fullName}!`);
      onSuccess?.(user);
    } catch (e: any) {
      setError(e.message || "Error de autenticación");
      toast.error(e.message || "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="auth-wrap">
      {/* Theme toggle fijo en esquina superior derecha */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="auth-container">
        <div className="auth-brand">
          <Logo className="me-1" />
          <h1 className="auth-title">Botilleria POS</h1>
        </div>
        <Card className="auth-card">
          <CardContent className="auth-card-content">
            <form className="space-y-3" onSubmit={handleSubmit}>
              {error && (
                <Alert variant="destructive" className="py-3">
                  <AlertCircle className="size-4" />
                  <AlertDescription className="text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              {/* Alert removed */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Usuario o correo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="nombre@ejemplo.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-11"
                    autoFocus
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Contraseña</label>
                  <a
                    className="text-xs text-muted-foreground hover:text-primary underline underline-offset-4"
                    href="#"
                    onClick={(e) => e.preventDefault()}
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(v) => setRememberMe(!!v)}
                />
                <Label htmlFor="remember" className="text-sm">
                  Recuérdame
                </Label>
              </div>
              <Button
                type="submit"
                className={`auth-submit ${loading ? "opacity-90" : ""}`}
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Ingresando...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <LogIn className="size-4" /> Iniciar Sesión
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="auth-footer">
          Al iniciar sesión, aceptas nuestros
          <a
            href="/terms"
            className="hover:text-primary underline underline-offset-4"
          >
            {" "}
            Términos de servicio{" "}
          </a>
          y
          <a
            href="/privacy"
            className="hover:text-primary underline underline-offset-4"
          >
            {" "}
            Política de privacidad{" "}
          </a>
          .
        </p>
        <div className="auth-copy">
          Sistema POS v1.0 2025 Botillería Soporte: soporte@botilleria.local
        </div>
      </div>
    </div>
  );
}
