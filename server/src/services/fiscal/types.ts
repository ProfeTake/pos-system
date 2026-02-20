export type FiscalProviderName = "none" | "sii";

export interface FiscalIssueRequest {
  tenantId: string;
  saleId: number;
  total: number;
  createdAtUnix: number;
  paymentMethod: string;
  customerName?: string | null;
  items: Array<{
    productId: number;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export type FiscalIssueStatus =
  | "issued"
  | "failed"
  | "not_configured"
  | "not_implemented";

export interface FiscalIssueResult {
  ok: boolean;
  status: FiscalIssueStatus;
  message?: string;
  provider?: FiscalProviderName;
  siiEnv?: string;
  saleId?: number;
  folio?: number;
  trackId?: string;
  xml?: string;
  response?: unknown;
}

export interface FiscalProvider {
  readonly name: FiscalProviderName;
  issueBoleta(req: FiscalIssueRequest): Promise<FiscalIssueResult>;
}
