import type {
  DriverDetail,
  DriverListFilters,
  DriverListItem,
  PaginatedResponse,
  VendorListItem,
} from '@race/types';

import { apiDelete, apiGet, apiPatch, apiPost } from '../http';

export async function getDrivers(
  filters: DriverListFilters = {},
): Promise<PaginatedResponse<DriverListItem>> {
  return apiGet<PaginatedResponse<DriverListItem>>('/drivers', filters as Record<string, unknown>);
}

export async function getDriverById(id: string): Promise<DriverDetail> {
  return apiGet<DriverDetail>(`/drivers/${id}`);
}

export async function createDriver(input: Record<string, string | undefined>): Promise<DriverListItem> {
  return apiPost<DriverListItem>('/drivers', input);
}

export async function updateDriver(id: string, input: Record<string, string | undefined>): Promise<DriverListItem> {
  return apiPatch<DriverListItem>(`/drivers/${id}`, input);
}

export async function deleteDriver(id: string): Promise<void> {
  await apiDelete(`/drivers/${id}`);
}

export async function approveDriver(id: string) {
  return apiPost<DriverListItem>(`/drivers/${id}/approve`);
}

export async function rejectDriver(id: string) {
  return apiPost<DriverListItem>(`/drivers/${id}/reject`);
}

export async function reviewDriverDocument(
  driverId: string,
  documentId: string,
  status: 'VERIFIED' | 'REJECTED',
) {
  return apiPatch<DriverDetail>(`/drivers/${driverId}/documents/${encodeURIComponent(documentId)}`, { status });
}

export async function getDriverStatusCountsApi() {
  return apiGet<{ all: number; pending: number; approved: number; rejected: number; suspended: number }>(
    '/drivers/counts',
  );
}

export async function getDriverCities() {
  const result = await getDrivers({ page: 1, pageSize: 1000 });
  return [...new Set(result.items.map((d) => d.city).filter(Boolean))].sort();
}

export async function getDriverVendors() {
  const vendors = await apiGet<PaginatedResponse<VendorListItem>>('/vendors', {
    page: 1,
    pageSize: 100,
    status: 'APPROVED',
  });
  return vendors.items.map((v) => ({ id: v.id, name: v.businessName }));
}

export async function exportDriversCsv(filters: DriverListFilters = {}) {
  const result = await getDrivers({ ...filters, page: 1, pageSize: 10000 });
  return result.items;
}
