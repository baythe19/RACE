import { api } from '../api';
import { API_ENDPOINTS } from '../../config/api';
import type { ApiSuccessResponse } from '../../types/auth';
import {
  isUiTestPermissiveMode,
  UI_PREVIEW_MODE,
  UI_PREVIEW_MUTATIONS_ENABLED,
} from '../../constants/preview';
import {
  acceptMockDriverJob,
  getMockDriverJobOffers,
  MOCK_DRIVER_JOBS,
  rejectMockDriverJob,
  syncMockActiveJobExport,
  updateMockActiveJobStatus,
} from '../../data/mockPartnerData';
import {
  ensurePreviewAssignmentOffer,
  getPreviewMockActiveJob,
} from '../../data/previewPartnerWorld';
import { getDriverVendorPreviewScenario } from '../vendor/driverVendorPreview';

export type DriverJobBooking = {
  bookingType: 'towing' | 'driver';
  id: string;
  bookingNumber: string;
  status: string;
  pickup?: {
    label?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  dropoff?: {
    label?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  } | null;
  estimatedFare?: number;
  createdAt: string;
  distanceKm?: number;
  /**
   * Backend-decided deadline for accepting an open marketplace offer.
   * Absent for vendor-routed jobs, which do not run on the marketplace clock.
   */
  offerExpiresAt?: string;
  /** Server-computed: the offer decision window has already lapsed. */
  isExpired?: boolean;
  /**
   * Amount the backend confirmed when the job was completed. Present only after
   * COMPLETED — this is the source of truth for earnings, not `estimatedFare`.
   */
  finalFare?: number;
  /** Read-only status timeline, used to show real trip timings. */
  statusHistory?: Array<{ status: string; timestamp: string }>;
  /** Resolved driver summary (vendor portal list only). */
  driver?: { id: string; name: string; phone: string; rating: number };
  /**
   * Customer contact for the assigned job.
   * NOTE: the current backend driver-booking payload does not send this yet —
   * the job-cycle UI only renders the contact row when it is present.
   */
  customer?: {
    name?: string;
    mobileNumber?: string;
  };
  serviceLabel?: string;
  onSiteAssist?: boolean;
  vendorId?: string;
  assignedFleetVehicleLabel?: string;
  vendorApproved?: boolean;
  arrivedAtDropoffAt?: string;
  completionOtp?: string;
  paymentCollectionMode?: 'CASH' | 'UPI' | 'ONLINE';
  paymentConfirmedByCustomer?: boolean;
};

export async function setDriverAvailability(isAvailable: boolean): Promise<{
  isAvailable: boolean;
  message: string;
}> {
  try {
    const { data } = await api.patch<
      ApiSuccessResponse<{ isAvailable: boolean; message: string }>
    >(API_ENDPOINTS.driverAvailability, { isAvailable });
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      return { isAvailable, message: `Status updated to ${isAvailable ? 'Online' : 'Offline'}` };
    }
    throw error;
  }
}

function previewDriverJobs(params?: {
  status?: string;
  type?: 'towing' | 'driver';
}): DriverJobBooking[] {
  const active = getPreviewMockActiveJob();
  if (params?.status === 'COMPLETED') {
    const completedActive = active?.status === 'COMPLETED' ? [active] : [];
    return [
      ...completedActive,
      ...MOCK_DRIVER_JOBS.filter(job => job.status === 'COMPLETED' && job.id !== active?.id),
    ];
  }
  return active
    ? [active, ...MOCK_DRIVER_JOBS.filter(job => job.id !== active.id)]
    : MOCK_DRIVER_JOBS;
}

export async function listDriverJobs(params?: {
  status?: string;
  type?: 'towing' | 'driver';
}): Promise<DriverJobBooking[]> {
  if (UI_PREVIEW_MODE) return previewDriverJobs(params);
  try {
    const { data } = await api.get<ApiSuccessResponse<DriverJobBooking[]>>(
      API_ENDPOINTS.driverMyBookings,
      { params },
    );
    return data.data ?? [];
  } catch (error) {
    if (UI_PREVIEW_MODE) return previewDriverJobs(params);
    throw error;
  }
}

export async function listDriverJobOffers(): Promise<DriverJobBooking[]> {
  if (UI_PREVIEW_MODE) {
    if (getDriverVendorPreviewScenario() === 'assignment') {
      ensurePreviewAssignmentOffer();
    }
    return getMockDriverJobOffers();
  }
  try {
    const { data } = await api.get<ApiSuccessResponse<DriverJobBooking[]>>(
      API_ENDPOINTS.driverBookingOffers,
    );
    return data.data ?? [];
  } catch (error) {
    if (UI_PREVIEW_MODE) return getMockDriverJobOffers();
    throw error;
  }
}

function previewActiveJob(): DriverJobBooking | null {
  const active = getPreviewMockActiveJob();
  if (!active || ['COMPLETED', 'RATED', 'PAID', 'CANCELLED'].includes(active.status)) {
    return null;
  }
  return active;
}

export async function getDriverActiveJob(): Promise<DriverJobBooking | null> {
  if (UI_PREVIEW_MODE) return previewActiveJob();
  try {
    const { data } = await api.get<
      ApiSuccessResponse<{ active: boolean; booking?: DriverJobBooking } | DriverJobBooking | null>
    >(API_ENDPOINTS.driverActiveBooking);
    const payload = data.data;
    if (!payload) return null;
    if (typeof payload === 'object' && 'active' in payload) {
      return payload.active && payload.booking ? payload.booking : null;
    }
    return payload as DriverJobBooking;
  } catch (error) {
    if (UI_PREVIEW_MODE) return previewActiveJob();
    throw error;
  }
}

export async function updateDriverLocation(
  latitude: number,
  longitude: number,
): Promise<{ location: { latitude: number; longitude: number }; updatedAt: string }> {
  try {
    const { data } = await api.patch<
      ApiSuccessResponse<{ location: { latitude: number; longitude: number }; updatedAt: string }>
    >(API_ENDPOINTS.driverLocation, { latitude, longitude });
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      return { location: { latitude, longitude }, updatedAt: new Date().toISOString() };
    }
    throw error;
  }
}

/** Code the mock backend accepts when preview mutations are on (shown as a hint in the UI). */
export const PREVIEW_TRIP_OTP = '1234';

export async function updateDriverBookingStatus(
  bookingId: string,
  bookingType: 'towing' | 'driver',
  status: string,
  tripOtp?: string,
): Promise<unknown> {
  try {
    const { data } = await api.patch(API_ENDPOINTS.driverBookingStatus(bookingId), {
      bookingType,
      status,
      ...(tripOtp ? { tripOtp } : {}),
    });
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      if (status === 'IN_PROGRESS' && !isUiTestPermissiveMode() && tripOtp !== PREVIEW_TRIP_OTP) {
        throw new Error('Incorrect trip OTP. Check the customer app and try again.');
      }
      const updatedJob = updateMockActiveJobStatus(status);
      // Keep the preview response shaped like the real completion response so
      // the completion board can distinguish a server-confirmed fare from the
      // estimate shown before the trip is finished.
      return {
        success: true,
        status,
        ...(status === 'COMPLETED' && updatedJob?.finalFare != null
          ? { finalFare: updatedJob.finalFare }
          : {}),
      };
    }
    throw error;
  }
}

export async function acceptDriverJob(
  bookingId: string,
  bookingType: 'towing' | 'driver',
): Promise<unknown> {
  try {
    const { data } = await api.post(API_ENDPOINTS.driverBookingAccept(bookingId), { bookingType });
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      const active = getPreviewMockActiveJob();
      if (active && !['COMPLETED', 'RATED', 'PAID', 'CANCELLED'].includes(active.status)) {
        throw new Error('You already have an active trip in progress. Finish it before accepting another.');
      }
      if (!acceptMockDriverJob(bookingId, bookingType)) {
        throw new Error('This trip is no longer available. Refresh the Jobs tab.');
      }
      syncMockActiveJobExport();
      return { success: true, message: 'Job accepted' };
    }
    throw error;
  }
}

export async function rejectDriverJob(
  bookingId: string,
  bookingType: 'towing' | 'driver',
): Promise<unknown> {
  try {
    const { data } = await api.post(API_ENDPOINTS.driverBookingReject(bookingId), { bookingType });
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      rejectMockDriverJob(bookingId);
      return { success: true, message: 'Job rejected' };
    }
    throw error;
  }
}

export async function driverArrivedAtDropoff(
  bookingId: string,
  bookingType: 'towing' | 'driver',
): Promise<unknown> {
  try {
    const { data } = await api.post(API_ENDPOINTS.driverArrivedDropoff(bookingId), { bookingType });
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      return { success: true, message: 'Driver arrived at dropoff location' };
    }
    throw error;
  }
}

export async function driverCompleteBooking(
  bookingId: string,
  bookingType: 'towing' | 'driver',
  completionOtp: string,
): Promise<unknown> {
  try {
    const { data } = await api.post(API_ENDPOINTS.driverCompleteBooking(bookingId), {
      bookingType,
      completionOtp,
    });
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      const updatedJob = updateMockActiveJobStatus('COMPLETED');
      return {
        success: true,
        status: 'COMPLETED',
        finalFare: updatedJob?.finalFare ?? 1250,
      };
    }
    throw error;
  }
}
