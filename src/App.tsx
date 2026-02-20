import { Suspense, lazy, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import PosApp from "./PosApp";
import DocsLayout from "./components/features/docs/Docs";
import Introduction from "./components/features/docs/content/Introduction";
import SupplierInvoices from "./components/features/docs/SupplierInvoices";
import { useAuth } from "./hooks/useAuth";

// Lazy load SuperAdmin app
const SuperAdminApp = lazy(
  () => import("./components/features/superadmin/SuperAdminApp")
);

// Loading fallback for SuperAdmin
function SuperAdminLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground">Cargando SuperAdmin...</p>
      </div>
    </div>
  );
}

// Componente para redireccionar superadmin automáticamente
function SuperAdminRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Si el usuario es superadmin y está en la raíz
    if (!loading && user?.role === "superadmin" && location.pathname === "/") {
      // Verificar si el superadmin quiere usar el POS (viene del panel SA)
      const goToPOS = sessionStorage.getItem("sa.goToPOS");
      if (goToPOS === "true") {
        // Limpiar la bandera y quedarse en el POS
        sessionStorage.removeItem("sa.goToPOS");
        return;
      }
      // Si no, redirigir al panel de SuperAdmin
      navigate("/superadmin", { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  return <PosApp />;
}

export default function App() {
  return (
    <Routes>
      {/* SuperAdmin Route */}
      <Route
        path="/superadmin/*"
        element={
          <Suspense fallback={<SuperAdminLoading />}>
            <SuperAdminApp />
          </Suspense>
        }
      />

      {/* Docs Routes */}
      <Route path="/docs" element={<DocsLayout />}>
        <Route index element={<Introduction />} />
        <Route
          path="inventory"
          element={
            <div className="p-6">
              <h2>Documentación de Inventario (En construcción)</h2>
            </div>
          }
        />
        <Route
          path="sales"
          element={
            <div className="p-6">
              <h2>Documentación de Ventas (En construcción)</h2>
            </div>
          }
        />
        <Route
          path="reports"
          element={
            <div className="p-6">
              <h2>Documentación de Reportes (En construcción)</h2>
            </div>
          }
        />
        <Route
          path="users"
          element={
            <div className="p-6">
              <h2>Documentación de Usuarios (En construcción)</h2>
            </div>
          }
        />
        <Route
          path="settings"
          element={
            <div className="p-6">
              <h2>Documentación de Configuración (En construcción)</h2>
            </div>
          }
        />
        <Route
          path="supplier-invoices"
          element={<SupplierInvoices />}
        />
        <Route path="*" element={<Navigate to="/docs" replace />} />
      </Route>

      {/* Main POS App - con redirección automática para superadmin */}
      <Route path="/*" element={<SuperAdminRedirect />} />
    </Routes>
  );
}
