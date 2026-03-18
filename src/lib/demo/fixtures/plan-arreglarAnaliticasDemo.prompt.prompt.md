Actualmente, los gráficos del dashboard para el usuario demo no muestran la información (categorías, ventas por hora, tendencia, etc.) por dos razones principales: 
1. El enrutador simulado (`router.ts`) no sabe manejar los parámetros de consulta (ej. `?period=week`), por lo que devuelve objetos vacíos.
2. La estructura de los fixtures (`demoAnalyticsMetrics`, `demoSalesTrend`, etc.) no está actualizada al nuevo formato (por ejemplo, el frontend espera `metrics.categoryStats`, y actualmente los fixtures devuelven `{ today: ... }`).

Actualizaremos estos archivos para generar la misma estructura de datos que la base de datos real utilizando el historial simulado de ventas (`demoSales`).

**Steps**
1. Modificar `resolveGet` en `src/lib/demo/router.ts` para remover los parámetros de consulta (haciendo `path = path.split("?")[0]`) antes de procesar las rutas. Esto evitará que las consultas de analíticas caigan en el caso por defecto.
2. Reestructurar la variable `demoAnalyticsMetrics` en `src/lib/demo/fixtures/index.ts` para que devuelva un objeto con: `sales`, `categoryStats`, `topProducts` y `paymentMethods`. Calcularemos estos datos dinámicamente mapeando el listado en `demoSales` y `demoProducts`.
3. Actualizar `demoSalesTrend`, `demoSalesByHour`, `demoPeriodComparison`, y `demoRestockPredictions` en `src/lib/demo/fixtures/index.ts` para exponer el formato correcto que esperan los gráficos (envolver los arreglos en `{ trend: [] }`, `{ hourlyStats: [] }`, etc., y usar campos como `salesCount` en vez de `count`).

**Verification**
1. Ejecutar el proyecto con `npm run dev`.
2. Iniciar sesión con el usuario *demo*.
3. Entrar a la sección del **Dashboard** (Panel de Control).
4. Validar visualmente que todos los gráficos (pie de categorías, barras por hora, tendencias de ventas y productos top) estén completamente renderizados.
