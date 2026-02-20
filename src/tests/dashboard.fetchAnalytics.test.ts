import { describe, test, expect, vi, beforeEach } from "vitest";
import { apiFetchJSON } from "../lib/api";

// Simular implementación de fetchAnalytics similar a Dashboard
async function fetchAnalytics(period: string) {
  const [metrics, trend, hourly, comparison, restock] = await Promise.all([
    apiFetchJSON(`/api/analytics/metrics?period=${period}`),
    apiFetchJSON(`/api/analytics/sales-trend?days=30`),
    apiFetchJSON(`/api/analytics/sales-by-hour?period=${period}`),
    apiFetchJSON(`/api/analytics/period-comparison?period=${period}`),
    apiFetchJSON(`/api/analytics/restock-predictions?days=30`),
  ]);
  return { metrics, trend, hourly, comparison, restock };
}

describe("fetchAnalytics (Dashboard logic)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("maneja caso exitoso", async () => {
    // 5 respuestas OK
    for (let i = 0; i < 5; i++) {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, data: i }),
      });
    }
    const result = await fetchAnalytics("week");
    expect(result.metrics.ok).toBe(true);
    expect(result.trend.ok).toBe(true);
  });

  test("si una ruta retorna 404 se marca notFound sin lanzar", async () => {
    // metrics 404, resto OK
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "missing" }),
    });
    for (let i = 0; i < 4; i++) {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, data: i }),
      });
    }
    const result: any = await fetchAnalytics("week");
    expect(result.metrics.notFound).toBe(true);
    expect(result.trend.ok).toBe(true);
  });

  test("errores 500 propagan excepción", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "fail" }),
    });
    for (let i = 0; i < 4; i++) {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      });
    }
    await expect(fetchAnalytics("week")).rejects.toThrow("HTTP 500");
  });
});
