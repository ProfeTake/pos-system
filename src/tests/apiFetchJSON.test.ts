import { describe, test, expect, vi } from "vitest";
import { apiFetchJSON } from "../lib/api";

describe("apiFetchJSON", () => {
  test("retorna data cuando respuesta OK", async () => {
    const payload = { ok: true, value: 123 };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(payload),
    });
    const data = await apiFetchJSON("/api/test");
    expect(data).toEqual(payload);
  });

  test("retorna {notFound:true} cuando 404", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "Not found" }),
    });
    const data: any = await apiFetchJSON("/api/missing");
    expect(data.notFound).toBe(true);
  });

  test("lanza error para 500", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server" }),
    });
    await expect(apiFetchJSON("/api/error")).rejects.toThrow("HTTP 500");
  });
});
