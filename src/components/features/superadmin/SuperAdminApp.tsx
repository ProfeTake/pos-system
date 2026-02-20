/**
 * SuperAdmin Application
 * Aplicación para gestión SaaS - mismo estilo visual que el POS
 */

import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { SuperAdminLayout } from "./layout/SuperAdminLayout";
import { RefreshCw } from "lucide-react";
import { Button } from "../../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";

// Lazy load de módulos
const SADashboard = lazy(() => import("./dashboard/SADashboard"));
const TenantsList = lazy(() => import("./tenants/TenantsList"));
const TenantDetail = lazy(() => import("./tenants/TenantDetail"));
const UserManagement = lazy(() => import("./users/UserManagement"));
const BackupsManager = lazy(() => import("./backups/BackupsManager"));
const SystemHealth = lazy(() => import("./system/SystemHealth"));
const SystemLogs = lazy(() => import("./system/SystemLogs"));
const GlobalAudit = lazy(() => import("./audit/GlobalAudit"));
const Subscriptions = lazy(() => import("./billing/Subscriptions"));
const PaymentsHistory = lazy(() => import("./billing/PaymentsHistory"));
const PlansConfig = lazy(() => import("./settings/PlansConfig"));
const EmailTemplates = lazy(() => import("./settings/EmailTemplates"));
const FeatureFlags = lazy(() => import("./settings/FeatureFlags"));

// Tipos de vistas del SuperAdmin
export type SAViewType =
  | "dashboard"
  | "tenants"
  | "tenant-detail"
  | "users"
  | "backups"
  | "health"
  | "logs"
  | "audit"
  | "subscriptions"
  | "payments"
  | "plans"
  | "emails"
  | "features";

// Loading fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <RefreshCw className="size-8 animate-spin text-muted-foreground" />
  </div>
);

// Títulos para cada vista
const viewTitles: Record<SAViewType, string> = {
  dashboard: "Dashboard",
  tenants: "Gestión de Negocios",
  "tenant-detail": "Detalle del Negocio",
  users: "Gestión de Usuarios",
  backups: "Respaldos del Sistema",
  health: "Estado del Sistema",
  logs: "Logs del Sistema",
  audit: "Auditoría Global",
  subscriptions: "Suscripciones",
  payments: "Historial de Pagos",
  plans: "Configuración de Planes",
  emails: "Plantillas de Email",
  features: "Feature Flags",
};

export function SuperAdminApp() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<SAViewType>("dashboard");
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);

  // Handler para ver detalle de tenant
  const handleViewTenant = (tenantId: number) => {
    setSelectedTenantId(tenantId);
    setCurrentView("tenant-detail");
  };

  // Handler para volver a lista de tenants
  const handleBackToTenants = () => {
    setSelectedTenantId(null);
    setCurrentView("tenants");
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <RefreshCw className="size-12 mx-auto text-primary animate-spin" />
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Verificar rol superadmin
  if (!user || user.role !== "superadmin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="size-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">🚫</span>
            </div>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>
              No tienes permisos para acceder al panel de SuperAdmin. Esta área
              está reservada exclusivamente para administradores del sistema
              SaaS.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/")} className="w-full">
              Volver al sistema
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Renderizar vista actual
  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <SADashboard onViewTenant={handleViewTenant} />
          </Suspense>
        );

      case "tenants":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <TenantsList onViewTenant={handleViewTenant} />
          </Suspense>
        );

      case "tenant-detail":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <TenantDetail
              tenantId={selectedTenantId!}
              onBack={handleBackToTenants}
            />
          </Suspense>
        );

      case "users":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <UserManagement />
          </Suspense>
        );

      case "backups":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <BackupsManager />
          </Suspense>
        );

      case "health":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <SystemHealth />
          </Suspense>
        );

      case "logs":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <SystemLogs />
          </Suspense>
        );

      case "audit":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <GlobalAudit />
          </Suspense>
        );

      case "subscriptions":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <Subscriptions />
          </Suspense>
        );

      case "payments":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <PaymentsHistory />
          </Suspense>
        );

      case "plans":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <PlansConfig />
          </Suspense>
        );

      case "emails":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <EmailTemplates />
          </Suspense>
        );

      case "features":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <FeatureFlags />
          </Suspense>
        );

      default:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <SADashboard onViewTenant={handleViewTenant} />
          </Suspense>
        );
    }
  };

  return (
    <SuperAdminLayout
      currentView={currentView}
      onNavigate={setCurrentView}
      user={user}
      title={viewTitles[currentView]}
    >
      {renderContent()}
    </SuperAdminLayout>
  );
}

export default SuperAdminApp;
