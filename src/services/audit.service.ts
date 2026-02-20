import { apiFetchJSON } from "../lib/api";

export interface AuditLogEntry {
  id: number;
  userId: number | null;
  username: string | null;
  action: string;
  entity: string | null;
  entityId: number | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditLogFilters {
  userId?: number;
  action?: string;
  entity?: string;
  entityId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface AuditStats {
  totalEntries: number;
  todayEntries: number;
  uniqueUsers: number;
  topActions: { action: string; count: number }[];
}

/**
 * Obtener registros de auditoría con filtros y paginación
 */
export async function getAuditLog(
  filters?: AuditLogFilters
): Promise<AuditLogResponse> {
  const params = new URLSearchParams();

  if (filters?.userId) params.append("userId", filters.userId.toString());
  if (filters?.action) params.append("action", filters.action);
  if (filters?.entity) params.append("entity", filters.entity);
  if (filters?.entityId) params.append("entityId", filters.entityId.toString());
  if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.append("dateTo", filters.dateTo);
  if (filters?.page) params.append("page", filters.page.toString());
  if (filters?.limit) params.append("limit", filters.limit.toString());

  const queryString = params.toString();
  return apiFetchJSON<AuditLogResponse>(
    `/api/audit${queryString ? `?${queryString}` : ""}`
  );
}

/**
 * Obtener lista de acciones únicas
 */
export async function getUniqueActions(): Promise<string[]> {
  return apiFetchJSON<string[]>("/api/audit/actions");
}

/**
 * Obtener lista de entidades únicas
 */
export async function getUniqueEntities(): Promise<string[]> {
  return apiFetchJSON<string[]>("/api/audit/entities");
}

/**
 * Obtener estadísticas de auditoría
 */
export async function getAuditStats(): Promise<AuditStats> {
  return apiFetchJSON<AuditStats>("/api/audit/stats");
}
