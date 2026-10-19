import type { DriverJobBooking } from '../services/driver/driverApi';
import type { FleetVehicle } from '../services/vendor/vendorVehiclesApi';
import type { VendorDriver } from '../services/vendor/vendorDriversApi';
import type { VendorBookingItem } from '../services/vendor/vendorBookingsApi';
import type { VendorDashboardStats } from '../services/vendor/vendorApi';
import type { VendorProfileResponse } from '../types/vendor';
import type { AuthUser } from '../types/auth';
import type { Profile } from '../types/models';
import {
  PREVIEW_DRIVER,
  PREVIEW_DRIVER_HISTORY,
  PREVIEW_VENDOR,
  PREVIEW_VENDOR_DASHBOARD,
  PREVIEW_VENDOR_LEGACY_DRIVERS,
  PREVIEW_VENDOR_VEHICLES,
  buildPreviewDriverProfile,
  buildPreviewDriverUser,
  buildPreviewVendorProfile,
  buildPreviewVendorStatus,
  buildPreviewVendorUser,
  getPreviewMockActiveJob,
  getPreviewDriverJobOffers,
  previewAcceptDriverJob,
  previewRejectDriverJob,
  updatePreviewMockActiveJobStatus,
} from './previewPartnerWorld';

/** @deprecated Import PREVIEW_VENDOR / buildPreviewVendorUser from previewPartnerWorld */
export const MOCK_VENDOR_USER: AuthUser = buildPreviewVendorUser();

/** @deprecated Import PREVIEW_DRIVER / buildPreviewDriverUser from previewPartnerWorld */
export const MOCK_DRIVER_USER: AuthUser = buildPreviewDriverUser();

export const MOCK_DRIVER_PROFILE: Profile = buildPreviewDriverProfile();
export const MOCK_VENDOR_PROFILE: Profile = buildPreviewVendorProfile();
export const MOCK_VENDOR_STATUS: VendorProfileResponse = buildPreviewVendorStatus();
export const MOCK_VENDOR_DASHBOARD: VendorDashboardStats = PREVIEW_VENDOR_DASHBOARD;
export const MOCK_VENDOR_VEHICLES: FleetVehicle[] = PREVIEW_VENDOR_VEHICLES;
export const MOCK_VENDOR_DRIVERS: VendorDriver[] = PREVIEW_VENDOR_LEGACY_DRIVERS;

export const MOCK_DRIVER_JOBS: DriverJobBooking[] = PREVIEW_DRIVER_HISTORY;

/** Live preview active trip (linked to vendor bookings). */
export function getMockActiveJobState(): DriverJobBooking | null {
  return getPreviewMockActiveJob();
}

/** @deprecated Use getMockActiveJobState() — kept for legacy imports */
export let mockActiveJobState: DriverJobBooking | null = getPreviewMockActiveJob();

export function syncMockActiveJobExport(): void {
  mockActiveJobState = getPreviewMockActiveJob();
}

export function updateMockActiveJobStatus(nextStatus: string): DriverJobBooking | null {
  const updated = updatePreviewMockActiveJobStatus(nextStatus);
  syncMockActiveJobExport();
  return updated;
}

export const MOCK_VENDOR_BOOKINGS: VendorBookingItem[] = [];

export const MOCK_JOB_OFFERS: DriverJobBooking[] = [];

export function ensureMockDriverActiveJob(): DriverJobBooking | null {
  const active = getPreviewMockActiveJob();
  if (active && !['COMPLETED', 'RATED', 'PAID', 'CANCELLED'].includes(active.status)) {
    syncMockActiveJobExport();
    return active;
  }
  const offer = getPreviewDriverJobOffers()[0];
  if (!offer) return null;
  const ok = previewAcceptDriverJob(offer.id, offer.bookingType);
  syncMockActiveJobExport();
  return ok ? getPreviewMockActiveJob() : null;
}

export function acceptMockDriverJob(
  bookingId: string,
  bookingType: DriverJobBooking['bookingType'],
): DriverJobBooking | null {
  const ok = previewAcceptDriverJob(bookingId, bookingType);
  syncMockActiveJobExport();
  return ok ? getPreviewMockActiveJob() : null;
}

export function rejectMockDriverJob(bookingId: string): void {
  previewRejectDriverJob(bookingId);
}

export function getMockDriverJobOffers(): DriverJobBooking[] {
  return getPreviewDriverJobOffers();
}

export { PREVIEW_VENDOR, PREVIEW_DRIVER } from './previewPartnerWorld';
