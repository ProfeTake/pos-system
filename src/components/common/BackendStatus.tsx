import { useEffect, useRef, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { API_BASE } from "../../lib/api";

export function BackendStatus() {
    const [isOnline, setIsOnline] = useState(true);
    const [checking, setChecking] = useState(false);
    // Ref para acceder al estado actual desde el interval/listener sin recrealos
    const isOnlineRef = useRef(true);

    const checkHealth = async () => {
        setChecking(true);
        try {
            const res = await fetch(`${API_BASE}/api/health`, {
                method: "GET",
                headers: { "Cache-Control": "no-cache" },
            });
            const online = res.ok;
            isOnlineRef.current = online;
            setIsOnline(online);
        } catch {
            isOnlineRef.current = false;
            setIsOnline(false);
        } finally {
            setChecking(false);
        }
    };

    useEffect(() => {
        // Escuchar eventos desde api.ts
        const handleStatusChange = (e: CustomEvent) => {
            const online: boolean = e.detail.online;
            isOnlineRef.current = online;
            setIsOnline(online);
        };

        // Recuperación inmediata cuando el browser detecta red (Wi-Fi/datos)
        const handleNetworkOnline = () => {
            checkHealth();
        };

        window.addEventListener("backend:status" as any, handleStatusChange);
        window.addEventListener("online", handleNetworkOnline);

        // Health check inicial
        checkHealth();

        // Polling cada 5s solo cuando está caído — usa ref para evitar stale closure
        const interval = setInterval(() => {
            if (!isOnlineRef.current) {
                checkHealth();
            }
        }, 5000);

        return () => {
            window.removeEventListener("backend:status" as any, handleStatusChange);
            window.removeEventListener("online", handleNetworkOnline);
            clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // efecto estable — usa isOnlineRef para leer estado actual

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
