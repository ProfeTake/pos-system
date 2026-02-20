import { useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { API_BASE } from "../../lib/api";

export function BackendStatus() {
    const [isOnline, setIsOnline] = useState(true);
    const [checking, setChecking] = useState(false);

    const checkHealth = async () => {
        setChecking(true);
        try {
            const res = await fetch(`${API_BASE}/api/health`, {
                method: "GET",
                headers: { "Cache-Control": "no-cache" },
            });
            if (res.ok) {
                setIsOnline(true);
            } else {
                setIsOnline(false);
            }
        } catch {
            setIsOnline(false);
        } finally {
            setChecking(false);
        }
    };

    useEffect(() => {
        // Escuchar eventos desde api.ts
        const handleStatusChange = (e: CustomEvent) => {
            setIsOnline(e.detail.online);
        };

        window.addEventListener("backend:status" as any, handleStatusChange);

        // Polling inicial y periódico si está caído
        checkHealth();
        const interval = setInterval(() => {
            if (!isOnline) {
                checkHealth();
            }
        }, 5000);

        return () => {
            window.removeEventListener("backend:status" as any, handleStatusChange);
            clearInterval(interval);
        };
    }, [isOnline]);

    if (isOnline) return null;

    return (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between shadow-md animate-in slide-in-from-top">
            <div className="flex items-center gap-2">
                <AlertCircle className="size-5" />
                <span className="font-medium">
                    Sin conexión con el servidor. Verifica que el backend esté corriendo.
                </span>
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={checkHealth}
                disabled={checking}
                className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
            >
                <RefreshCw className={`size-4 mr-2 ${checking ? "animate-spin" : ""}`} />
                Reintentar
            </Button>
        </div>
    );
}
