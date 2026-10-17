import type {
  BookingDetail,
  BookingListFilters,
  BookingListItem,
  BookingStatusCounts,
  PaginatedResponse,
} from '@race/types';

import { apiDelete, apiGet, apiPatch, apiPost } from '../http';

export async function getBookings(
  filters: BookingListFilters = {},
): Promise<PaginatedResponse<BookingListItem>> {
  return apiGet<PaginatedResponse<BookingListItem>>('/bookings', filters as Record<string, unknown>);
}

export async function getBookingStatusCountsApi(): Promise<BookingStatusCounts> {
  return apiGet<BookingStatusCounts>('/bookings/counts');
}

export async function getBookingById(id: string): Promise<BookingDetail> {
  return apiGet<BookingDetail>(`/bookings/${id}`);
}

export async function getBookingByIdWithType(
  id: string,
  type?: 'towing' | 'driver' | 'legacy',
): Promise<BookingDetail> {
  return apiGet<BookingDetail>(`/bookings/${id}`, type ? { type } : undefined);
}

export async function createBooking(input: Record<string, string | number>) {
  return apiPost<BookingListItem>('/bookings', input);
}

export async function updateBooking(id: string, input: Record<string, string | number>) {
  return apiPatch<BookingListItem>(`/bookings/${id}`, input);
}

export async function deleteBooking(id: string) {
  await apiDelete(`/bookings/${id}`);
}

export async function assignBookingVendor(id: string, vendorId: string) {
  return apiPost<BookingListItem>(`/bookings/${id}/assign-vendor`, { vendorId });
}

export async function assignBookingDriver(id: string, driverId: string) {
  return apiPost<BookingListItem>(`/bookings/${id}/assign-driver`, { driverId });
}

export async function assignServiceBookingDriver(
  id: string,
  payload: { driverId: string; bookingType: 'towing' | 'driver' },
) {
  return apiPatch<BookingDetail>(`/bookings/${id}/assign-driver`, payload);
}

export async function updateBookingStatus(
  id: string,
  status: string,
  options?: { reason?: string; amount?: number; bookingType?: 'towing' | 'driver' | 'legacy' },
) {
  return apiPatch<BookingListItem>(`/bookings/${id}/status`, { status, ...options });
}

export async function getAvailableDrivers(params?: {
  bookingType?: 'towing' | 'driver';
  bookingId?: string;
  lat?: number;
  lng?: number;
}) {
  return apiGet<
    Array<{
      _id: string;
      fullName: string;
      mobileNumber: string;
      isAvailable: boolean;
      currentLocation?: { latitude?: number; longitude?: number; updatedAt?: string };
      activeBookingId?: string | null;
      distanceKm?: number;
    }>
  >('/drivers/available', params as Record<string, unknown>);
}

export async function exportBookingsCsv(filters: BookingListFilters = {}) {
  const result = await getBookings({ ...filters, page: 1, pageSize: 10000 });
  return result.items;
}

export function getBookingServiceTypes() {
  return [
    { label: 'Towing', value: 'towing' },
    { label: 'Roadside', value: 'roadside' },
    { label: 'Driver', value: 'driver' },
  ];
}
