import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authService } from "../services/auth.service";
import { enableDemoMode, disableDemoMode, isDemoMode } from "../lib/demo";

// ── Usuario demo ficticio (100% frontend, NO existe en BD) ────────────────
const DEMO_USER: NonNullable<AuthUser> = {
  id: 99,
  username: "demo",
  email: "demo@botilleria-eltonel.cl",
  role: "vendedor",
  fullName: "Usuario Demo",
};
const DEMO_TOKEN = "demo-fake-jwt-token";

/**
 * Represents the authenticated user's profile information.
 */
export type AuthUser = {
  id: number;
  username: string;
  email: string;
  role: "superadmin" | "admin" | "vendedor";
  fullName: string;
} | null;

/**
 * Interface defining the shape of the authentication context.
 */
type AuthContextValue = {
  /** The current authenticated user or null */
  user: AuthUser;
  /** Whether the authentication state is currently loading */
  loading: boolean;
  /** Function to refresh the current user's session from the server */
  refresh: () => Promise<void>;
  /**
   * Function to log in a user.
   * @param username - User's username
   * @param password - User's password
   * @param remember - Whether to persist the session (localStorage vs sessionStorage)
   */
  login: (
    username: string,
    password: string,
    remember?: boolean
  ) => Promise<NonNullable<AuthUser>>;
  /** Function to log out the current user */
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Provider component that wraps the application and manages authentication state.
 * Handles token storage, session persistence, and API communication via authService.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  const setToken = (token: string, remember?: boolean) => {
    try {
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_token");
      if (remember) {
        localStorage.setItem("auth_token", token);
      } else {
        sessionStorage.setItem("auth_token", token);
      }
    } catch {}
  };

  const clearToken = () => {
    try {
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_token");
    } catch {}
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    const token =
      sessionStorage.getItem("auth_token") ||
      localStorage.getItem("auth_token");

    if (!token) {
      setUser(null);
      disableDemoMode();
      setLoading(false);
      return;
    }

    // Demo mode activo → devolver usuario ficticio sin llamar al backend
    if (isDemoMode()) {
      setUser(DEMO_USER);
      setLoading(false);
      return;
    }

    try {
      const data = await authService.getMe();
      const maybeUser = (data as any)?.user ?? data;
      if (maybeUser && typeof maybeUser === "object" && maybeUser.id) {
        setUser(maybeUser as NonNullable<AuthUser>);
      } else {
        clearToken();
        setUser(null);
      }
    } catch (err) {
      console.error("Error validating session", err);
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    async (username: string, password: string, remember?: boolean) => {
      // ★ Demo: 100% frontend, cero llamadas al backend
      if (username === "demo" && password === "demo") {
        enableDemoMode();
        setToken(DEMO_TOKEN, false);
        setUser(DEMO_USER);
        return DEMO_USER;
      }

      // Usuarios reales
      disableDemoMode();
      const { token, user: userData } = await authService.login({
        username,
        password,
        remember,
      });
      setToken(token, remember);
      setUser(userData);
      return userData as NonNullable<AuthUser>;
    },
    []
  );

  const logout = useCallback(async () => {
    const wasDemo = isDemoMode();
    clearToken();
    disableDemoMode();
    setUser(null);
    // Solo llamar al backend si NO era demo
    if (!wasDemo) {
      try {
        await authService.logout();
      } catch (e) {
        console.error("Error during logout", e);
      }
    }
  }, []);

  // Initial session check
  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ user, loading, refresh, login, logout }),
    [user, loading, refresh, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access the authentication context.
 * Provides user state, loading status, and auth methods (login, logout, refresh).
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
