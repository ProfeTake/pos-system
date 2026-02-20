# Sistema de Punto de Venta (POS) Moderno

Un sistema de punto de venta moderno, rápido y eficiente construido con React, Vite y Tailwind CSS. Diseñado para gestionar inventarios grandes, ventas rápidas y múltiples cajas en tiempo real.

![Dashboard Preview](./docs/dashboard-preview.png)

## 🚀 Características Clave

-   **Rendimiento Optimizado**:
    -   **Virtualización**: Manejo eficiente de listas grandes de inventario y ventas usando `react-window`.
    -   **Code Splitting**: Carga diferida de rutas y componentes pesados para un inicio rápido.
    -   **Optimización de Assets**: Separación de librerías en chunks para mejor caché.

-   **Gestión de Inventario**:
    -   Filtrado y búsqueda instantánea.
    -   Edición rápida de stock y precios.
    -   **Importación Rápida**: Interfaz dedicada para cargar nuevos productos masivamente.
    -   Escaneo de códigos de barra integrado.

-   **Punto de Venta (POS)**:
    -   Interfaz optimizada para teclado y pantalla táctil.
    -   Múltiples métodos de pago.
    -   Cálculo automático de vueltos.
    -   Generación de tickets (simulado).

-   **Tiempo Real & Sincronización**:
    -   Actualizaciones en vivo de stock y ventas mediante Server-Sent Events (SSE).
    -   Sincronización de estado de caja entre pestañas.

-   **UX/UI Premium**:
    -   Diseño limpio y moderno con Tailwind CSS y Radix UI.
    -   Feedback visual inmediato (Toasts con Sonner).
    -   Modo oscuro/claro.

## 🛠️ Tech Stack

-   **Frontend**: React 18, TypeScript, Vite
-   **Estilos**: Tailwind CSS, Class Variance Authority (CVA), clsx
-   **Componentes**: Radix UI (primitivos), Lucide React (iconos)
-   **Estado**: React Context API + Hooks personalizados
-   **Rendimiento**: `react-window` (virtualización), `React.lazy` (lazy loading)
-   **Utilidades**: `date-fns`, `zod` (validación)

## 🏁 Comenzando

### Prerrequisitos

-   Node.js 18+
-   npm o yarn

### Instalación

1.  Clonar el repositorio:
    ```bash
    git clone https://github.com/tu-usuario/pos-system.git
    cd pos-system
    ```

2.  Instalar dependencias:
    ```bash
    npm install
    ```

3.  Iniciar el servidor de desarrollo:
    ```bash
    npm run dev
    ```

4.  Abrir `http://localhost:5173` en tu navegador.

### Build para Producción

```bash
npm run build
```
Esto generará los archivos optimizados en la carpeta `dist/`.

## 📂 Estructura del Proyecto

```
src/
├── components/
│   ├── common/         # Componentes reutilizables (BarcodeScanner, etc.)
│   ├── features/       # Componentes por funcionalidad de negocio
│   │   ├── auth/       # Login
│   │   ├── cart/       # Carrito de compras
│   │   ├── inventory/  # Gestión de inventario (Tabla virtualizada)
│   │   ├── sales/      # Historial de ventas
│   │   └── ...
│   ├── layout/         # Layout principal, Sidebar
│   └── ui/             # Componentes base de UI (Button, Input, etc.)
├── hooks/              # Custom hooks (useAuth, useCart, useInitialData)
├── lib/                # Utilidades, API client, schemas
├── types/              # Definiciones de tipos TypeScript
└── utils/              # Funciones auxiliares
```

## 🏗️ Decisiones de Arquitectura

### 1. Virtualización de Listas
Para garantizar un rendimiento fluido con miles de productos, utilizamos `react-window`.
-   **Inventario**: Usa `FixedSizeList` ya que las filas tienen altura uniforme.
-   **Ventas**: Usa `VariableSizeList` para permitir expandir detalles de venta sin comprometer el rendimiento.

### 2. Code Splitting & Lazy Loading
La aplicación está dividida en rutas principales (`Dashboard`, `Inventory`, `Sales`, `Admin`). Cada una se carga bajo demanda usando `React.lazy` y `Suspense`, reduciendo el tamaño del bundle inicial.
Además, diálogos pesados como la "Calculadora de Precios" también se cargan de forma diferida.

### 3. Estado Global
Utilizamos React Context para estados globales esenciales:
-   `AuthContext`: Sesión de usuario.
-   `CashStatusContext`: Estado de apertura/cierre de caja (crítico para bloquear operaciones).
Para lógica de negocio específica (como el carrito), usamos custom hooks (`useCart`) que encapsulan la lógica y el estado local.

### 4. Optimización de Assets
Configuración manual de chunks en Vite para separar dependencias grandes (`react-dom`, `radix-ui`, `recharts`) del código de la aplicación, mejorando el cacheo del navegador.

## 🤝 Contribuyendo

1.  Haz un Fork del proyecto.
2.  Crea tu rama de funcionalidad (`git checkout -b feature/AmazingFeature`).
3.  Haz Commit de tus cambios (`git commit -m 'Add some AmazingFeature'`).
4.  Push a la rama (`git push origin feature/AmazingFeature`).
5.  Abre un Pull Request.

## 📄 Licencia

Distribuido bajo la licencia MIT. Ver `LICENSE` para más información.
