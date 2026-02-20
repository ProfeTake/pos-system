import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "../ui/sidebar";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import {
  BarChart3,
  ShoppingCart,
  Package,
  History,
  Store,
  Wine,
} from "lucide-react";
import { ViewType } from "../../types";

interface NavigationProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  cartItemsCount: number;
  lowStockCount: number;
}

export function Navigation({
  currentView,
  onViewChange,
  cartItemsCount,
  lowStockCount,
}: NavigationProps) {
  const menuItems = [
    {
      id: "dashboard" as ViewType,
      icon: BarChart3,
      label: "Dashboard",
      description: "Métricas y resumen",
      badge: lowStockCount > 0 ? lowStockCount : null,
      badgeVariant: "destructive" as const,
    },
    {
      id: "catalog" as ViewType,
      icon: Store,
      label: "Catálogo",
      description: "Productos disponibles",
    },
    {
      id: "cart" as ViewType,
      icon: ShoppingCart,
      label: "Carrito",
      description: "Carrito de compras",
      badge: cartItemsCount > 0 ? cartItemsCount : null,
      badgeVariant: "secondary" as const,
    },
    {
      id: "inventory" as ViewType,
      icon: Package,
      label: "Inventario",
      description: "Gestión de stock",
    },
    {
      id: "sales" as ViewType,
      icon: History,
      label: "Ventas",
      description: "Historial de transacciones",
    },
  ];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b p-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
              <Wine className="size-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold">Botillería</h2>
              <p className="text-xs text-muted-foreground">Sistema de Ventas</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onViewChange(item.id)}
                      isActive={currentView === item.id}
                      className="w-full"
                    >
                      <item.icon className="size-4" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span>{item.label}</span>
                          {item.badge && (
                            <Badge
                              variant={item.badgeVariant}
                              className="text-xs"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t p-4">
          <div className="text-xs text-muted-foreground text-center">
            <p>Sistema POS v1.0</p>
            <p>© 2024 Botillería</p>
          </div>
        </SidebarFooter>
      </Sidebar>

      <main className="flex-1 overflow-auto">
        <div className="flex items-center gap-4 border-b px-6 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <h1 className="font-semibold">
            {menuItems.find((item) => item.id === currentView)?.label ||
              "Sistema de Ventas"}
          </h1>
        </div>

        <div className="p-6">{/* El contenido se renderizará aquí */}</div>
      </main>
    </SidebarProvider>
  );
}
