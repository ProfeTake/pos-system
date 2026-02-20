import { apiFetchJSON } from '@/lib/api';
import type { 
  Customer, 
  CustomerWithDetails, 
  CustomerCreate, 
  CustomerDebt,
  CustomerStats 
} from '@/types';

const BASE_URL = '/api/customers';

export const customersService = {
  // Get all customers
  async getAll(search?: string, active?: boolean): Promise<Customer[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (active !== undefined) params.append('active', active.toString());
    
    const url = params.toString() ? `${BASE_URL}?${params}` : BASE_URL;
    return apiFetchJSON<Customer[]>(url);
  },

  // Get customer by ID with details
  async getById(id: string): Promise<CustomerWithDetails> {
    return apiFetchJSON<CustomerWithDetails>(`${BASE_URL}/${id}`);
  },

  // Create new customer
  async create(data: CustomerCreate): Promise<Customer> {
    return apiFetchJSON<Customer>(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update customer
  async update(id: string, data: Partial<CustomerCreate>): Promise<Customer> {
    return apiFetchJSON<Customer>(`${BASE_URL}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Delete customer
  async delete(id: string): Promise<{ message: string }> {
    return apiFetchJSON<{ message: string }>(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    });
  },

  // Toggle customer active status
  async toggle(id: string): Promise<Customer> {
    return apiFetchJSON<Customer>(`${BASE_URL}/${id}/toggle`, {
      method: 'POST',
    });
  },

  // Record a purchase
  async recordPurchase(id: string, amount: number, points?: number): Promise<Customer> {
    return apiFetchJSON<Customer>(`${BASE_URL}/${id}/purchase`, {
      method: 'POST',
      body: JSON.stringify({ amount, points }),
    });
  },

  // Get customer debts
  async getDebts(id: string, status?: string): Promise<CustomerDebt[]> {
    const url = status 
      ? `${BASE_URL}/${id}/debts?status=${status}`
      : `${BASE_URL}/${id}/debts`;
    return apiFetchJSON<CustomerDebt[]>(url);
  },

  // Create debt
  async createDebt(
    customerId: string,
    data: {
      saleId?: number;
      amount: number;
      dueDate?: string;
      notes?: string;
    }
  ): Promise<CustomerDebt> {
    return apiFetchJSON<CustomerDebt>(`${BASE_URL}/${customerId}/debts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Record debt payment
  async recordDebtPayment(debtId: string, amount: number): Promise<CustomerDebt> {
    return apiFetchJSON<CustomerDebt>(`${BASE_URL}/debts/${debtId}/payment`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  // Get stats
  async getStats(): Promise<CustomerStats> {
    return apiFetchJSON<CustomerStats>(`${BASE_URL}/stats`);
  },
};
