import type {
  CustomerDetail,
  CustomerListFilters,
  CustomerListItem,
  PaginatedResponse,
} from '@race/types';

import { apiDelete, apiGet, apiPatch, apiPost } from '../http';

export async function getCustomers(
  filters: CustomerListFilters = {},
): Promise<PaginatedResponse<CustomerListItem>> {
  return apiGet<PaginatedResponse<CustomerListItem>>('/customers', filters as Record<string, unknown>);
}

export async function getCustomerById(id: string): Promise<CustomerDetail> {
  return apiGet<CustomerDetail>(`/customers/${id}`);
}

export async function getCustomerCities(): Promise<string[]> {
  return apiGet<string[]>('/customers/cities');
}

export async function exportCustomersCsv(filters: CustomerListFilters = {}) {
  return apiGet<CustomerListItem[]>('/customers/export/csv', filters as Record<string, unknown>);
}

export async function createCustomer(input: Record<string, string | undefined>) {
  return apiPost<CustomerListItem>('/customers', input);
}

export async function updateCustomer(id: string, input: Record<string, string | undefined>) {
  return apiPatch<CustomerListItem>(`/customers/${id}`, input);
}

export async function deleteCustomer(id: string) {
  await apiDelete(`/customers/${id}`);
}

export async function setCustomerStatus(id: string, status: string) {
  return apiPatch<CustomerListItem>(`/customers/${id}/status`, { status });
}
