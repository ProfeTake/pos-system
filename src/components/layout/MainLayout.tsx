import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "../ui/sidebar";
import { Sidebar } from "./Sidebar";
import { ViewType } from "../../types";
import ThemeToggle from "../common/ThemeToggle";
import { BackendStatus } from "../common/BackendStatus";
import { HotkeysHelp } from "../common/HotkeysHelp";

interface MainLayoutProps {
  children: ReactNode;
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  blocked: boolean;
  unseenCount: number;
  title: string;
  headerActions?: ReactNode;
  cartItemCount?: number;
  lastAddedProduct?: string | null;
  isCartRecentlyUpdated?: boolean;
}

export function MainLayout({
  children,
  currentView,
  onNavigate,
  blocked,
  unseenCount,
  title,
  headerActions,
  cartItemCount = 0,
  lastAddedProduct = null,
  isCartRecentlyUpdated = false,
}: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BackendStatus />
      <div className="flex-1 flex overflow-hidden">
        <SidebarProvider>
          <Sidebar
            currentView={currentView}
            onNavigate={onNavigate}
            blocked={blocked}
            unseenCount={unseenCount}
            cartItemCount={cartItemCount}
            lastAddedProduct={lastAddedProduct}
            isCartRecentlyUpdated={isCartRecentlyUpdated}
          />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="border-b bg-background shrink-0">
              <div className="flex items-center gap-3 px-4 py-3 w-full">
                <div className="md:hidden">
                  <SidebarTrigger className="size-9" aria-label="Abrir menú" />
                </div>
                <h1 className="font-semibold text-lg truncate">{title}</h1>
                <div className="ml-auto flex items-center gap-3">
                  <ThemeToggle />
                  {headerActions}
                </div>
              </div>
            </header>
            <main className="flex-1 overflow-auto px-4">
              <div className="py-4 space-y-6">{children}</div>
            </main>
            {/* Botón flotante de ayuda de atajos */}
            <HotkeysHelp />
          </div>
        </SidebarProvider>
      </div>
    </div>
  );
}
