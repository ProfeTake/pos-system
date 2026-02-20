import { Button } from "../../../ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function Introduction() {
    return (
        <div className="space-y-6 max-w-3xl">
            <div className="space-y-2">
                <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
                    Introducción
                </h1>
                <p className="text-lg text-muted-foreground">
                    Bienvenido a la documentación oficial del sistema POS Botillería.
                </p>
            </div>

            <div className="prose dark:prose-invert max-w-none">
                <p>
                    Este sistema está diseñado para facilitar la gestión integral de tu botillería,
                    desde el control de inventario hasta el punto de venta y reportes financieros.
                </p>

                <h3>Características Principales</h3>
                <ul>
                    <li>
                        <strong>Punto de Venta (POS):</strong> Interfaz rápida y eficiente para procesar ventas.
                    </li>
                    <li>
                        <strong>Gestión de Inventario:</strong> Control detallado de stock, categorías y precios.
                    </li>
                    <li>
                        <strong>Reportes:</strong> Análisis de ventas, productos más vendidos y flujo de caja.
                    </li>
                    <li>
                        <strong>Usuarios:</strong> Gestión de roles y permisos para administradores y vendedores.
                    </li>
                </ul>

                <h3>Primeros Pasos</h3>
                <p>
                    Si es tu primera vez utilizando el sistema, te recomendamos comenzar por la sección de
                    <Link to="/docs/inventory" className="text-primary hover:underline mx-1">
                        Inventario
                    </Link>
                    para configurar tus productos iniciales.
                </p>
            </div>

            <div className="flex gap-4 pt-4">
                <Button asChild>
                    <Link to="/docs/inventory">
                        Ver Inventario <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link to="/dashboard">Ir al Dashboard</Link>
                </Button>
            </div>
        </div>
    );
}
