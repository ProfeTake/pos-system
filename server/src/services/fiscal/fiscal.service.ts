import { db } from "../../db";
import { fiscalDocuments, saleItems, sales } from "../../db/schema";
import { eq } from "drizzle-orm";
import type { FiscalIssueResult, FiscalProvider, FiscalProviderName } from "./types";
import { NoopFiscalProvider } from "./providers/noop.provider";
import { SiiFiscalProvider } from "./providers/sii.provider";

function getProvider(): FiscalProvider {
  const providerName = (process.env.FISCAL_PROVIDER || "none") as FiscalProviderName;
  switch (providerName) {
    case "sii":
      return new SiiFiscalProvider();
    case "none":
    default:
      return new NoopFiscalProvider();
  }
}

export async function issueBoletaForSale(params: {
  tenantId: string;
  saleId: number;
}): Promise<FiscalIssueResult> {
  const provider = getProvider();

  const sale = db.select().from(sales).where(eq(sales.id, params.saleId)).get();
  if (!sale) {
    return { ok: false, status: "failed", message: "Venta no encontrada" };
  }

  const items = db
    .select()
    .from(saleItems)
    .where(eq(saleItems.saleId, params.saleId))
    .all();

  const createdAtUnix = Number((sale as any).createdAt ?? 0);

  // Crear registro pending
  const { id: fiscalDocId } = db
    .insert(fiscalDocuments)
    .values({
      tenantId: params.tenantId,
      saleId: params.saleId,
      provider: provider.name,
      status: "pending",
      siiEnv: process.env.SII_ENV || null,
    } as any)
    .returning()
    .get();

  try {
    const result = await provider.issueBoleta({
      tenantId: params.tenantId,
      saleId: params.saleId,
      total: Number((sale as any).total || 0),
      createdAtUnix: createdAtUnix || Math.floor(Date.now() / 1000),
      paymentMethod: String((sale as any).paymentMethod || ""),
      customerName: (sale as any).customerName ?? null,
      items: items.map((it) => ({
        productId: Number((it as any).productId),
        name: String((it as any).productName),
        quantity: Number((it as any).quantity),
        unitPrice: Number((it as any).price),
      })),
    });

    db
      .update(fiscalDocuments)
      .set({
        status: result.ok ? "issued" : "failed",
        folio: result.folio ?? null,
        trackId: result.trackId ?? null,
        xml: result.xml ?? null,
        response: (result.response as any) ?? null,
        lastError: result.ok ? null : (result.message || "Error"),
        updatedAt: new Date(),
      } as any)
      .where(eq(fiscalDocuments.id, fiscalDocId))
      .run();

    return result;
  } catch (e: any) {
    db
      .update(fiscalDocuments)
      .set({
        status: "failed",
        lastError: e?.message || "Error emitiendo boleta",
        updatedAt: new Date(),
      } as any)
      .where(eq(fiscalDocuments.id, fiscalDocId))
      .run();

    return {
      ok: false,
      status: "failed",
      message: e?.message || "Error emitiendo boleta",
      provider: provider.name,
    };
  }
}

export async function getFiscalDocumentsForSale(params: {
  tenantId: string;
  saleId: number;
}) {
  return db
    .select()
    .from(fiscalDocuments)
    .where(eq(fiscalDocuments.saleId, params.saleId))
    .all();
}
