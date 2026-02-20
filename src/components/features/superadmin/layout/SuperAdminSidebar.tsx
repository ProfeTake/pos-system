/**
 * SuperAdmin Sidebar
 * Navegación específica para el panel SaaS - mismo estilo que Sidebar del POS
 */

import {
  LayoutDashboard,
  Building2,
  Users,
  Database,
  Activity,
  ScrollText,
  FileSearch,
  CreditCard,
  Receipt,
  Settings,
  Mail,
  ToggleLeft,
  LogOut,
  Shield,
  User as UserIcon,
  Store,
} from "lucide-react";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "../../../ui/sidebar";
import { Button } from "../../../ui/button";
import { Separator } from "../../../ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../ui/tooltip";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../hooks/useAuth";
import type { SAViewType } from "../SuperAdminApp";
import type { User } from "../../../../types";

interface SuperAdminSidebarProps {
  currentView: SAViewType;
  onNavigate: (view: SAViewType) => void;
  user: User;
}

interface NavItem {
  id: SAViewType;
  label: string;
  icon: React.ElementType;
  description?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    title: "General",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        description: "Métricas generales",
      },
      {
        id: "tenants",
        label: "Negocios",
        icon: Building2,
        description: "Gestión de clientes",
      },
      {
        id: "users",
        label: "Usuarios",
        icon: Users,
        description: "Usuarios del sistema",
      },
    ],
  },
  {
    title: "Operaciones",
    items: [
      {
        id: "backups",
        label: "Backups",
        icon: Database,
        description: "Respaldos de datos",
      },
      {
        id: "health",
        label: "Estado del Sistema",
        icon: Activity,
        description: "Monitoreo de salud",
      },
      {
        id: "logs",
        label: "Logs",
        icon: ScrollText,
        description: "Registros del sistema",
      },
      {
        id: "audit",
        label: "Auditoría",
        icon: FileSearch,
        description: "Historial de acciones",
      },
    ],
  },
  {
    title: "Facturación",
    items: [
      {
        id: "subscriptions",
        label: "Suscripciones",
        icon: CreditCard,
        description: "Planes activos",
      },
      {
        id: "payments",
        label: "Pagos",
        icon: Receipt,
        description: "Historial de pagos",
      },
    ],
  },
  {
    title: "Configuración",
    items: [
      {
        id: "plans",
        label: "Planes",
        icon: Settings,
        description: "Configurar planes",
      },
      {
        id: "emails",
        label: "Emails",
        icon: Mail,
        description: "Plantillas de correo",
      },
      {
        id: "features",
        label: "Feature Flags",
        icon: ToggleLeft,
        description: "Funcionalidades",
      },
    ],
  },
];

function LogoToggleButton() {
  const { toggleSidebar, state } = useSidebar();
  const label =
    state === "collapsed" ? "Expandir (Ctrl+B)" : "Contraer (Ctrl+B)";
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={label}
          aria-pressed={state !== "collapsed"}
          className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer"
        >
          <Shield className="size-6" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function SuperAdminSidebar({
  currentView,
  onNavigate,
  user,
}: SuperAdminSidebarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Ir al POS sin cerrar sesión (para superadmin que quiere usar el POS)
  const handleGoToPOS = () => {
    // Guardamos en sessionStorage que queremos ir al POS
    sessionStorage.setItem("sa.goToPOS", "true");
    navigate("/");
  };

  // Cerrar sesión completamente
  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <ShadcnSidebar collapsible="icon">
      <SidebarHeader className="border-b p-4 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-[72px]">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:gap-0">
          <LogoToggleButton />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <h2 className="font-semibold text-base truncate">SuperAdmin</h2>
            <p className="text-xs text-muted-foreground truncate">
              Gestión SaaS
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto overflow-x-hidden p-3 group-data-[collapsible=icon]:px-0">
        {navigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider px-3 mb-1 group-data-[collapsible=icon]:hidden">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    currentView === item.id ||
                    (item.id === "tenants" && currentView === "tenant-detail");

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => onNavigate(item.id)}
                        isActive={isActive}
                        tooltip={item.label}
                        className="w-full justify-start py-2 px-3 h-auto rounded-lg transition-all"
                      >
                        <item.icon className="size-4 shrink-0" />
                        <div className="flex-1 min-w-0 ml-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium">
                              {item.label}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-xs truncate mt-0.5 text-muted-foreground">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {/* Ir al POS */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleGoToPOS}
                  tooltip="Ir al sistema POS"
                  className="w-full justify-start py-2 px-3 h-auto rounded-lg transition-all text-muted-foreground hover:text-foreground"
                >
                  <Store className="size-4 shrink-0" />
                  <div className="flex-1 min-w-0 ml-2">
                    <span className="truncate text-sm font-medium">
                      Ir al POS
                    </span>
                    <p className="text-xs truncate mt-0.5 text-muted-foreground">
                      Volver al sistema de ventas
                    </p>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4 shrink-0 group-data-[collapsible=icon]:p-0">
        <div className="group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <div className="flex-shrink-0">
              <div className="size-10 rounded-full bg-primary flex items-center justify-center">
                <UserIcon className="size-5 text-primary-foreground" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground truncate">
                Super Administrador
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
              title="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
          <Separator className="my-3" />
          <div className="text-xs text-muted-foreground text-center">
            <p className="font-medium">Sistema SaaS v1.0</p>
            <p className="mt-0.5">© 2025 Botillería</p>
          </div>
        </div>
        <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center p-2">
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              Cerrar sesión
            </TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
