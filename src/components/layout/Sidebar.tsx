import {
  BarChart3,
  History,
  Lock,
  LogOut,
  Package,
  Settings,
  Shield,
  ShoppingCart,
  Store,
  User as UserIcon,
  Wine,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "../ui/sidebar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useAuth } from "../../hooks/useAuth";
import { ViewType } from "../../types";
import { toast } from "sonner";

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  blocked: boolean;
  unseenCount: number;
  cartItemCount?: number;
  lastAddedProduct?: string | null;
  isCartRecentlyUpdated?: boolean;
}

function GobletToggleButton() {
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
          <Wine className="size-6" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({
  currentView,
  onNavigate,
  blocked,
  unseenCount,
  cartItemCount = 0,
  lastAddedProduct = null,
  isCartRecentlyUpdated = false,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();

  // Cierra el sidebar móvil y ejecuta la acción después de un frame
  // para que Radix tenga tiempo de iniciar la animación de cierre
  // antes de que cambie el contenido (evita overlay negro pegado).
  const closeMobileThen = (action: () => void) => {
    if (isMobile) {
      setOpenMobile(false);
      requestAnimationFrame(() => action());
    } else {
      action();
    }
  };

  const menuItemsBase = [
    {
      id: "dashboard" as ViewType,
      icon: BarChart3,
      label: "Dashboard",
      description: "Métricas y resumen",
      badge: unseenCount > 0 ? unseenCount : null,
      badgeVariant: "destructive" as const,
      disabled: false,
    },
    {
      id: "catalog" as ViewType,
      icon: Store,
      label: "Catálogo",
      description: "Productos disponibles",
      disabled: blocked,
    },
    {
      id: "cart" as ViewType,
      icon: ShoppingCart,
      label: "Carrito",
      description: "Carrito de compras",
      badge: cartItemCount > 0 ? cartItemCount : null,
      badgeVariant: isCartRecentlyUpdated
        ? ("destructive" as const)
        : ("secondary" as const),
      disabled: blocked,
    },
    {
      id: "inventory" as ViewType,
      icon: Package,
      label: "Inventario",
      description: "Gestión de stock",
      disabled: blocked,
    },
    {
      id: "sales" as ViewType,
      icon: History,
      label: "Ventas",
      description: "Historial de transacciones",
      disabled: blocked,
    },
    ...(user?.role === "admin" || user?.role === "superadmin"
      ? [
          {
            id: "admin" as ViewType,
            icon: Settings,
            label: "Administración",
            description: "Panel administrativo",
            disabled: blocked,
          },
        ]
      : []),
    ...(user?.role === "superadmin"
      ? [
          {
            id: "superadmin" as ViewType,
            icon: Shield,
            label: "SuperAdmin",
            description: "Gestión de tenants SaaS",
            disabled: false,
          },
        ]
      : []),
    {
      id: "logout" as any,
      icon: LogOut,
      label: "Cerrar sesión",
      description: "Salir de la sesión actual",
      disabled: false,
      onClick: logout,
      collapsedOnly: true,
    },
  ];

  const menuItems = [
    ...menuItemsBase.filter((item) => !item.disabled),
    ...menuItemsBase.filter((item) => item.disabled),
  ];

  const getShortcutFor = (id: string): string | null => {
    switch (id) {
      case "dashboard":
        return "Ctrl+1";
      case "catalog":
        return "Ctrl+2";
      case "cart":
        return "Ctrl+3";
      case "inventory":
        return "Ctrl+4";
      case "sales":
        return "Ctrl+5";
      case "admin":
        return "Ctrl+6";
      case "superadmin":
        return "Ctrl+0";
      default:
        return null;
    }
  };

  return (
    <ShadcnSidebar collapsible="icon">
      <SidebarHeader className="border-b p-4 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-[72px]">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:gap-0">
          <GobletToggleButton />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <h2 className="font-semibold text-base truncate">Botillería</h2>
            <p className="text-xs text-muted-foreground truncate">
              Sistema de Ventas
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex-1 overflow-y-auto overflow-x-hidden p-3 group-data-[collapsible=icon]:px-0">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => {
                      if (item.onClick) {
                        closeMobileThen(() => item.onClick!());
                        return;
                      }
                      // SuperAdmin navega a app separada
                      if (item.id === "superadmin") {
                        closeMobileThen(() => navigate("/superadmin"));
                        return;
                      }
                      if (item.disabled) {
                        // En móvil: cerrar el Sheet Y mostrar feedback (no hay cursor para señalizar)
                        closeMobileThen(() => {
                          toast.warning("Abre la caja registradora para acceder a esta sección", {
                            duration: 3000,
                          });
                        });
                        return;
                      }
                      closeMobileThen(() => onNavigate(item.id as ViewType));
                    }}
                    isActive={
                      currentView === (item.id as any) &&
                      !item.disabled &&
                      !item.onClick
                    }
                    tooltip={(() => {
                      const sc = getShortcutFor(String(item.id));
                      if (item.disabled) return "Requiere caja abierta";
                      return sc ? `${item.label} • ${sc}` : item.label;
                    })()}
                    className={`w-full justify-start py-2 px-3 h-auto rounded-lg transition-all ${
                      item.disabled
                        ? "opacity-40 cursor-not-allowed hover:opacity-40 pointer-events-auto"
                        : ""
                    } ${
                      (item as any).collapsedOnly
                        ? "hidden group-data-[collapsible=icon]:flex"
                        : ""
                    }`}
                    disabled={item.disabled}
                  >
                    <item.icon
                      className={`size-4 shrink-0 ${
                        item.disabled ? "text-muted-foreground/50" : ""
                      }`}
                    />
                    <div className="flex-1 min-w-0 ml-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`truncate text-sm font-medium ${
                            item.disabled ? "text-muted-foreground" : ""
                          }`}
                        >
                          {item.label}
                        </span>
                        {(() => {
                          const sc = getShortcutFor(String(item.id));
                          return sc ? (
                            <span className="text-[10px] text-muted-foreground hidden sm:inline">
                              {sc}
                            </span>
                          ) : null;
                        })()}
                        {item.disabled && (
                          <Lock className="size-3 text-muted-foreground/50 shrink-0" />
                        )}
                        {item.badge && !item.disabled && (
                          <Badge
                            variant={item.badgeVariant}
                            className="text-xs shrink-0 px-1.5 py-0.5"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p
                          className={`text-xs truncate mt-0.5 ${
                            item.disabled
                              ? "text-muted-foreground/50"
                              : "text-muted-foreground"
                          }`}
                        >
                          {item.description}
                        </p>
                      )}
                    </div>
                  </SidebarMenuButton>
                  {item.id === "cart" && isCartRecentlyUpdated && lastAddedProduct && (
                    <div className="ml-11 mt-1 mr-2 text-xs bg-primary/10 border border-primary/30 rounded-md px-2 py-1 animate-in fade-in">
                      <span className="font-medium">
                        {lastAddedProduct} agregado
                      </span>
                    </div>
                  )}
                </SidebarMenuItem>
              ))}
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
              <p className="text-xs text-muted-foreground truncate capitalize">
                {user?.role === "superadmin"
                  ? "Super Administrador"
                  : user?.role === "admin"
                  ? "Administrador"
                  : "Vendedor"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 size-8"
              onClick={logout}
              title="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
          <Separator className="my-3" />
          <div className="text-xs text-muted-foreground text-center">
            <p className="font-medium">Sistema POS v1.0</p>
            <p className="mt-0.5">© 2025 Botillería</p>
          </div>
        </div>
        <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center p-2 h-14">
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={logout}
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
