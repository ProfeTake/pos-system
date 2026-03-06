# Reporte de Auditoría UX/UI y Arquitectura Frontend: Sistema de Caja y Horarios

## Introducción
Como experto en UX/UI y arquitecto frontend en ecosistemas React, he evaluado el flujo completo de tu aplicación POS, centrándome específicamente en los componentes ubicados en `src/components/features/cash/`, el hook global `useMandatoryCashSession.ts`, los algoritmos de heurística en `businessHours.ts`, y sus interacciones con los endpoints de la API (Drizzle ORM).

A continuación presento las oportunidades de mejora profunda detectadas. **Estas mejoras están pensadas para potenciar la confiabilidad e higiene visual del sistema sin requerir alteraciones estructurales inmediatas en las tablas de la base de datos.**

---

## 1. Sistema de Caja (Cash Register)

### A. Mejoras en Interfaz y Experiencia de Usuario (UX/UI)
1. **Flujo de Arqueo Ciego ("Blind Close") en el Cierre**
   - **Problema actual:** El sistema muestra inmediatamente al usuario cuánto dinero *debería* tener al intentar cerrar. Esto facilita el "cuadre artificial" o fraude (el cajero iguala lo que extrae al monto reportado).
   - **Mejora sugerida:** Implementar un mago de cierre (wizard) compuesto por 2 o 3 pasos integrados. El cajero primero ingresa el "Monto Declarado" (incluso mejor si se incorpora una calculadora que permita ingresar N unidades por tipo de billete) y luego, recién al enviar, el sistema calcula la diferencia e informa un descuadre.
2. **Sobrecarga Cognitiva en `CashRegister.tsx`**
   - **Problema actual:** Es un modal "todo en uno" que lidia a la vez con la apertura, lista de movimientos, inputs financieros y extensiones de tiempo de sesión. Supera las 1.000 líneas de código y contiene múltiples campos paralelos creando confusión visual.
   - **Mejora sugerida:** Separar conceptualmente las acciones. Incorporar "Tabs" o vistas diferenciadas para: (1) Apertura, (2) Listado/Ajustes de Movimientos durante el turno y (3) Cierre de Turno.
3. **Indicadores de Estado Globales**
   - **Problema actual:** Notificaciones intrusivas vía sistema `toast` para avisar cierres o errores (ej. *"Quedan 5 minutos para el cierre de caja"* usando el package `sonner`). Las alertas invasivas inducen a la fatiga del operador.
   - **Mejora sugerida:** Incorporar un sútil *widget* en la barra de navegación superior (Navbar) que cambie de verde (operativo) a amarillo (cierre inminente) y rojo (vencido/exigencia de cierre). Al hacer click o "hover", despliega un popover informativo antes de usar una interrupción modal. Solo interrumpir brutalmente cuando la caja esté 100% bloqueada.

### B. Mejoras Técnicas del Frontend (React & Código)
1. **Desacoplamiento Estructural (Single Responsibility Principle)**
   - **Problema:** `CashRegister.tsx` administra peticiones SSE, lógica de reconexión, parseos del caché (LocalStorage `pos.cash.movementDraft`), lógica de auto-cierre y el renderizado UI pesado.
   - **Solución:** Refactorizar extrayendo componentes hijos:
     - `CashOpeningSequence.tsx`: Componente de interfaz de apertura (monto).
     - `CashMovementsPanel.tsx`: Tabla y lógica de egresos/ingresos, usando paginación/virtualización si crece en el turno.
     - `CashClosingSummary.tsx`: Flujo de arqueo.
     - Centralizar toda la lógica del borrador (`pos.cash.movementDraft`) en un custom hook (p.ej. `useCashDraft()`) en vez de estados directos en el componente modal.
2. **Estabilidad del Contexto `CashStatusContext.tsx`**
   - **Problema:** El contexto usa un `useRef` comparando rústicamente primitivos para evitar renders (`!valueRef.current || valueRef.current.mustOpen !== currentMustOpen...`). Esta es una optimización manual insegura que en React 18+ y concurrent mode puede generar bloqueos fantasma de la UI (tearing).
   - **Solución:** Consumir un almacén atómico u optimizar con `useMemo` y contexto divido en dos: `CashStateContext` (los datos crudos) y `CashActionsContext` (las mutaciones). Esto asegura renders automáticos solo donde el dato es usado y borra la necesidad de ref-tracking.
3. **Manejo de SSE Clandestino**
   - El uso de un Singleton mutable `globalEventSource` en `useMandatoryCashSession.ts` expuesto en module scope puede provocar fugas de memoria cuando el HMR (Hot Module Replacement) reconstruye componentes durante desarrollo y genera carrera de concurrencias limitando sesiones múltiples si existieran (ej: dos pestañas simulando en un monitor ultra grande). 

---

## 2. Sistema de Horarios y Turnos (Business Hours / Shift System)

### A. Diagnóstico de la Arquitectura de Fechas actual
Actualmente, el mecanismo depende del archivo `src/utils/businessHours.ts`, el cual determina dinámicamente si la tienda está dentro de su ventana operacional haciendo saltos en días de base (calculando mediasnoches estáticas y asignando +X minutos desde el día siguiente).
Adicionalmente, el frontend le añade "2 horas mágicas" al cierre al reabrirse de emergencia (`new Date(Date.now() + 2 * 60 * 60 * 1000)` en *CashRegister.tsx*). Este enfoque es extremadamente vulnerable.

### B. Peligros Actuales sin Modificar el Motor (Backend vs BD)
- **Cierre cruzado por Fechas:** La query en `cashSession.controller.ts` para sacar el "Balance" suma campos de `sales` desde la fecha de inicio (`gte(sessionStart) and lte(now)`). Dado que el esquema `sales` no posee una clave foránea (FK) estricta `session_id`, **si un horario de cierre de caja se superpone con la apertura de otra caja (otro operador del mismo tenant), las ventas se mezclarán matemáticamente en los montos**.

### C. Estrategias de Mejora Inmediatas
1. **Día Operacional (Business Date) vs Día Calendario (Real Date)**
   - Abandonar la detección con algoritmos de "Ayer vs Hoy" basados estáticamente en la hora de apertura a las `10:00`.
   - Implementar globalmente el concepto offset: **Un turno o Día comercial inicia a un `StartOfDayOffset` determinado** (ej: 06:00 AM). Todo registro transaccional ocurrido entre el `15/Ago a las 06:00` y `16/Ago a las 05:59` pertenece intrínsecamente al "Día Comercial del 15". Esto elimina al completo la complejidad de si un Viernes y un Sábado en la madrugada pertenecen a qué cajero.
2. **Retirar la "Extensión Ciega" de 2 horas desde el FrontEnd**
   - *Problema:* El frontend está dictaminando al backend cuánto dura una extensión arbitraria (`windowClose = +2 hours`). Si el cliente desincroniza su reloj localmente o inspecciona el código, puede abrir la ventana de tiempos para alterar montos.
   - *Solución:* Añadir un endpoint en backend `/api/cash-session/extend` que tome el `sessionId`. El servidor debe encargarse de fijar el límite según reglas comerciales (las cuales lee desde cache DB o Redis). Registrar la acción explícitamente en el subsistema `auditLog` con el motivo ("Se extendió el turno de 3AM a 5AM").
3. **Mapeo de Prevención de Overlap (Crossover Lock)**
   - Puesto que no podemos alterar el esquema añadiendo el `session_id` a la tabla `sales` por ahora, es vital garantizar que **nunca existan dos sesiones de apertura que se solapen** en el backend.
   - Si la API va a sumar cronológicamente asumiendo "la única" caja, el servidor en la función API `/open` debe lanzar un Conflicto (409) si detecta otra sesión de negocio no cerrada para evitar inconsistencias de cierre (las ventas irían al aire o sumadas doblemente en arqueos de fecha).
4. **Aligerar el cálculo del TTL y Caché de Horas**
   - Refactorizar las mutaciones tipo `_cachedSettings` almacenadas volátiles en módulo dentro de `businessHours.ts`. Mover la carga de esa configuración a un estado global inicial inicializado durante el `App.tsx` en el proveedor `React Query`/estado principal y guardado en Contexto, para que la persistencia frente al ciclo de vida React sea predecible y debuggeable sin "re-scrapes" fantasmas.