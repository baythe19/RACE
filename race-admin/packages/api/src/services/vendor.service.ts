import type {
  PaginatedResponse,
  VendorDetail,
  VendorListFilters,
  VendorListItem,
  VendorVehicle,
} from '@race/types';

import { apiDelete, apiGet, apiPatch, apiPost } from '../http';

export async function getVendors(
  filters: VendorListFilters = {},
): Promise<PaginatedResponse<VendorListItem>> {
  return apiGet<PaginatedResponse<VendorListItem>>('/vendors', filters as Record<string, unknown>);
}

export async function getVendorById(id: string): Promise<VendorDetail> {
  return apiGet<VendorDetail>(`/vendors/${id}`);
}

export async function approveVendor(id: string): Promise<VendorListItem> {
  return apiPost<VendorListItem>(`/vendors/${id}/approve`);
}

export async function rejectVendor(id: string, note?: string): Promise<VendorListItem> {
  return apiPost<VendorListItem>(`/vendors/${id}/reject`, { note });
}

export async function reviewVendorDocument(
  vendorId: string,
  docKey: string,
  status: 'VERIFIED' | 'REJECTED',
) {
  return apiPatch<VendorDetail>(`/vendors/${vendorId}/documents/${encodeURIComponent(docKey)}`, { status });
}

export async function getVendorStatusCountsApi() {
  return apiGet<{ all: number; pending: number; approved: number; rejected: number; suspended: number }>(
    '/vendors/counts',
  );
}

export async function getVendorCities(): Promise<string[]> {
  const result = await getVendors({ page: 1, pageSize: 1000 });
  return [...new Set(result.items.map((v) => v.city).filter(Boolean))].sort();
}

export async function exportVendorsCsv(filters: VendorListFilters = {}) {
  const result = await getVendors({ ...filters, page: 1, pageSize: 10000 });
  return result.items;
}

export async function createVendor(input: Record<string, string | undefined>) {
  return apiPost<VendorListItem>('/vendors', input);
}

export async function updateVendor(id: string, input: Record<string, string | undefined>) {
  return apiPatch<VendorListItem>(`/vendors/${id}`, input);
}

export async function suspendVendor(id: string, note?: string) {
  return apiPost<VendorListItem>(`/vendors/${id}/suspend`, { note });
}

export async function deleteVendor(id: string) {
  await apiDelete(`/vendors/${id}`);
}

export async function createVendorVehicle(
  vendorId: string,
  input: {
    registrationNo: string;
    type: string;
    model: string;
    year?: number;
    status?: string;
  },
) {
  return apiPost<VendorVehicle>(`/vendors/${vendorId}/vehicles`, input);
}

export async function updateVendorVehicle(
  vehicleId: string,
  input: {
    type?: string;
    model?: string;
    year?: number;
    status?: string;
  },
) {
  return apiPatch<VendorVehicle>(`/vehicles/${vehicleId}`, input);
}

export async function deleteVendorVehicle(vehicleId: string) {
  await apiDelete(`/vehicles/${vehicleId}`);
}

export async function assignVendorDrivers(vendorId: string, driverIds: string[]) {
  return apiPost<{ assigned: number }>(`/vendors/${vendorId}/assign-drivers`, { driverIds });
}

export async function unassignVendorDriver(vendorId: string, driverId: string) {
  return apiPost<{ unassigned: boolean; driverId: string }>(
    `/vendors/${vendorId}/unassign-drivers/${driverId}`,
    {},
  );
}

export type VendorFleetDriver = {
  id: string;
  name: string;
  phone: string;
  driverType: string;
  licenseNo: string;
  status: string;
  isAvailable: boolean;
  isBusy: boolean;
};

export async function listVendorFleetDrivers(vendorId: string): Promise<VendorFleetDriver[]> {
  return apiGet<VendorFleetDriver[]>(`/vendors/${vendorId}/drivers`);
}

export async function createVendorFleetDriver(
  vendorId: string,
  input: {
    name: string;
    phone: string;
    licenseNo: string;
    driverType: string;
    city?: string;
  },
): Promise<VendorFleetDriver> {
  return apiPost<VendorFleetDriver>(`/vendors/${vendorId}/drivers`, input);
}

export async function removeVendorFleetDriver(vendorId: string, driverId: string): Promise<void> {
  await apiDelete(`/vendors/${vendorId}/drivers/${driverId}`);
}
