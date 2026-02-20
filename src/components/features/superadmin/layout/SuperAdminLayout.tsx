/**
 * SuperAdmin Layout
 * Layout para el panel de administración SaaS - mismo estilo que MainLayout del POS
 */

import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "../../../ui/sidebar";
import { SuperAdminSidebar } from "./SuperAdminSidebar";
import type { SAViewType } from "../SuperAdminApp";
import type { User } from "../../../../types";
import ThemeToggle from "../../../common/ThemeToggle";
import { BackendStatus } from "../../../common/BackendStatus";

interface SuperAdminLayoutProps {
  children: ReactNode;
  currentView: SAViewType;
  onNavigate: (view: SAViewType) => void;
  user: User;
  title: string;
}

export function SuperAdminLayout({
  children,
  currentView,
  onNavigate,
  user,
  title,
}: SuperAdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BackendStatus />
      <div className="flex-1 flex overflow-hidden">
        <SidebarProvider>
          <SuperAdminSidebar
            currentView={currentView}
            onNavigate={onNavigate}
            user={user}
          />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="border-b bg-background shrink-0">
              <div className="flex items-center gap-3 px-4 py-3 w-full">
                <div className="md:hidden">
                  <SidebarTrigger className="size-9" aria-label="Abrir menú" />
                </div>
                <h1 className="font-semibold text-lg truncate">{title}</h1>
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-sm text-muted-foreground hidden sm:block">
                    {new Date().toLocaleDateString("es-CL", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                  <ThemeToggle />
                </div>
              </div>
            </header>
            <main className="flex-1 overflow-auto px-4">
              <div className="py-4 space-y-6">{children}</div>
            </main>
          </div>
        </SidebarProvider>
      </div>
    </div>
  );
}
