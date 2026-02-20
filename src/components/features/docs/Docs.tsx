import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "../../ui/utils";
import {
    Book,
    FileText,
    Menu,
    X,
    ChevronRight,
    Search,
    Home,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { ScrollArea } from "../../ui/scroll-area";
import ThemeToggle from "../../common/ThemeToggle";

const DOC_LINKS = [
    {
        title: "Empezando",
        items: [
            { title: "Introducción", href: "/docs" },
            { title: "Instalación", href: "/docs/installation" },
        ],
    },
    {
        title: "Módulos",
        items: [
            { title: "Inventario", href: "/docs/inventory" },
            { title: "Ventas", href: "/docs/sales" },
            { title: "Reportes", href: "/docs/reports" },
        ],
    },
    {
        title: "Gestión Financiera",
        items: [
            { title: "Facturas de Proveedores", href: "/docs/supplier-invoices" },
        ],
    },
    {
        title: "Configuración",
        items: [
            { title: "Usuarios", href: "/docs/users" },
            { title: "Preferencias", href: "/docs/settings" },
        ],
    },
];

export default function DocsLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center">
                    <div className="mr-4 hidden md:flex">
                        <Link to="/" className="mr-6 flex items-center space-x-2">
                            <Book className="h-6 w-6" />
                            <span className="hidden font-bold sm:inline-block">
                                Documentación
                            </span>
                        </Link>
                        <nav className="flex items-center space-x-6 text-sm font-medium">
                            <Link
                                to="/dashboard"
                                className="transition-colors hover:text-foreground/80 text-foreground/60"
                            >
                                Ir a la App
                            </Link>
                        </nav>
                    </div>
                    <Button
                        variant="ghost"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-9 py-2 w-9 px-0 md:hidden mr-2"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle Menu</span>
                    </Button>
                    <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                        <div className="w-full flex-1 md:w-auto md:flex-none">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar documentación..."
                                    className="pl-8 md:w-[300px] lg:w-[300px]"
                                />
                            </div>
                        </div>
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <div className="flex-1 container flex-col md:flex-row flex gap-6 md:gap-10 py-6">
                {/* Sidebar */}
                <aside
                    className={cn(
                        "fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block",
                        sidebarOpen ? "block" : "hidden",
                        "md:w-[240px]"
                    )}
                >
                    <ScrollArea className="h-full py-6 pr-6 lg:py-8">
                        <div className="w-full">
                            {DOC_LINKS.map((group, index) => (
                                <div key={index} className="pb-4">
                                    <h4 className="mb-1 rounded-md px-2 py-1 text-sm font-semibold">
                                        {group.title}
                                    </h4>
                                    <div className="grid grid-flow-row auto-rows-max text-sm">
                                        {group.items.map((item, i) => (
                                            <Link
                                                key={i}
                                                to={item.href}
                                                className={cn(
                                                    "group flex w-full items-center rounded-md border border-transparent px-2 py-1 hover:underline",
                                                    location.pathname === item.href
                                                        ? "font-medium text-foreground"
                                                        : "text-muted-foreground"
                                                )}
                                            >
                                                {item.title}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </aside>

                {/* Content */}
                <main className="relative py-6 lg:gap-10 lg:py-8 xl:grid xl:grid-cols-[1fr_300px] w-full">
                    <div className="mx-auto w-full min-w-0">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
