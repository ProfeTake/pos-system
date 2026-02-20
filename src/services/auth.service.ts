import { apiFetchJSON, postJSON } from "../lib/api";
import { AuthUser } from "../hooks/auth-context";

export const authService = {
    async login(credentials: { username: string; password: string; remember?: boolean }) {
        return postJSON<{ token: string; user: AuthUser }>("/api/auth/login", credentials);
    },

    async logout() {
        return postJSON("/api/auth/logout", {});
    },

    async getMe() {
        return apiFetchJSON<{ user: AuthUser; token?: string }>("/api/auth/me");
    },

    async refreshToken() {
        // Si existiera un endpoint específico de refresh token, iría aquí.
        // Por ahora, re-validamos la sesión con getMe.
        return this.getMe();
    }
};
