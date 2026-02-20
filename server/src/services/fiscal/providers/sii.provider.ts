import type { FiscalIssueRequest, FiscalIssueResult, FiscalProvider } from "../types";

// Nota: Integración real SII requiere:
// - Certificado digital (PFX) del emisor
// - CAF/Folios para Boleta Electrónica
// - Construcción de XML DTE + firma XMLDSig
// - Envío a SII y consulta de estado
// Este provider deja el esqueleto y valida configuración.

export class SiiFiscalProvider implements FiscalProvider {
  readonly name = "sii" as const;

  async issueBoleta(req: FiscalIssueRequest): Promise<FiscalIssueResult> {
    const siiEnv = process.env.SII_ENV || "cert";
    const rutEmisor = process.env.SII_RUT_EMISOR;
    const certBase64 = process.env.SII_CERT_PFX_BASE64;
    const certPassword = process.env.SII_CERT_PASSWORD;
    const cafBase64 = process.env.SII_CAF_BASE64;

    const missing: string[] = [];
    if (!rutEmisor) missing.push("SII_RUT_EMISOR");
    if (!certBase64) missing.push("SII_CERT_PFX_BASE64");
    if (!certPassword) missing.push("SII_CERT_PASSWORD");
    if (!cafBase64) missing.push("SII_CAF_BASE64");

    if (missing.length) {
      return {
        ok: false,
        status: "not_configured",
        message: `Faltan variables de entorno para SII: ${missing.join(", ")}`,
        provider: this.name,
        siiEnv,
      };
    }

    // Placeholder: aquí iría generación de DTE XML, firma y envío.
    // Por ahora devolvemos un error explícito para evitar falsa “legalidad”.
    return {
      ok: false,
      status: "not_implemented",
      message:
        "Provider SII aún no implementa generación/firma/envío de DTE. Ya está lista la base (endpoint + persistencia).",
      provider: this.name,
      siiEnv,
      saleId: req.saleId,
    };
  }
}
