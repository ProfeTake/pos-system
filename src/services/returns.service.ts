import { apiFetchJSON } from '@/lib/api';
import type { Return, ReturnWithItems, ReturnCreate, ReturnStats } from '@/types';

const BASE_URL = '/api/returns';

export const returnsService = {
  // Get all returns
  async getAll(filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    method?: string;
  }): Promise<ReturnWithItems[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.method) params.append('method', filters.method);

    const url = params.toString() ? `${BASE_URL}?${params}` : BASE_URL;
    return apiFetchJSON<ReturnWithItems[]>(url);
  },

  // Get return by ID
  async getById(id: string): Promise<ReturnWithItems> {
    return apiFetchJSON<ReturnWithItems>(`${BASE_URL}/${id}`);
  },

  // Get returns for a specific sale
  async getBySale(saleId: number): Promise<ReturnWithItems[]> {
    return apiFetchJSON<ReturnWithItems[]>(`${BASE_URL}/sale/${saleId}`);
  },

  // Create a return
  async create(data: ReturnCreate): Promise<ReturnWithItems> {
    return apiFetchJSON<ReturnWithItems>(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update return
  async update(
    id: string,
    data: { status?: string; notes?: string }
  ): Promise<Return> {
    return apiFetchJSON<Return>(`${BASE_URL}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Get return statistics
  async getStats(period: string = '30d'): Promise<ReturnStats> {
    return apiFetchJSON<ReturnStats>(`${BASE_URL}/stats?period=${period}`);
  },
};
