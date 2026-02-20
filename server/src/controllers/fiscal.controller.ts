import { Request, Response } from "express";
import type { TenantRequest } from "../middlewares/tenant.middleware";
import { issueBoletaForSale, getFiscalDocumentsForSale } from "../services/fiscal/fiscal.service";

/**
 * POST /api/fiscal/boleta/:saleId/issue
 * Inicia emisión fiscal de boleta para una venta existente.
 */
export async function issueBoleta(req: Request, res: Response) {
  const tenantReq = req as TenantRequest;
  const tenantId = tenantReq.tenantId || "default";
  const saleId = Number(req.params.saleId);

  if (!Number.isFinite(saleId) || saleId <= 0) {
    return res.status(400).json({ error: "saleId inválido" });
  }

  const result = await issueBoletaForSale({ tenantId, saleId });

  // not_configured / not_implemented: 501 para dejar claro que no es “legal” todavía.
  if (result.status === "not_configured" || result.status === "not_implemented") {
    return res.status(501).json(result);
  }

  return res.json(result);
}

/**
 * GET /api/fiscal/boleta/:saleId
 * Devuelve historial/estado de documentos fiscales asociados a una venta.
 */
export async function getBoletaStatus(req: Request, res: Response) {
  const tenantReq = req as TenantRequest;
  const tenantId = tenantReq.tenantId || "default";
  const saleId = Number(req.params.saleId);

  if (!Number.isFinite(saleId) || saleId <= 0) {
    return res.status(400).json({ error: "saleId inválido" });
  }

  const docs = await getFiscalDocumentsForSale({ tenantId, saleId });
  return res.json({ documents: docs });
}
