import type { FiscalIssueRequest, FiscalIssueResult, FiscalProvider } from "../types";

export class NoopFiscalProvider implements FiscalProvider {
  readonly name = "none" as const;

  async issueBoleta(_req: FiscalIssueRequest): Promise<FiscalIssueResult> {
    return {
      ok: false,
      status: "not_configured",
      message:
        "Emisión fiscal no configurada. Configure FISCAL_PROVIDER y credenciales SII (o un proveedor certificado).",
    };
  }
}
