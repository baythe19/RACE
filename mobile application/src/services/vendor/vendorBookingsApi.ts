import { api } from '../api';
import { API_ENDPOINTS } from '../../config/api';
import type { ApiSuccessResponse } from '../../types/auth';
import type { DriverJobBooking } from '../driver/driverApi';
import { UI_PREVIEW_MODE, UI_PREVIEW_MUTATIONS_ENABLED } from '../../constants/preview';
import {
  PREVIEW_DRIVER,
  PREVIEW_VENDOR,
  getPreviewVendorBookings,
  getPreviewVendorOpenLeads,
  getPreviewVendorBookingTracking,
  previewApproveVendorBooking,
} from '../../data/previewPartnerWorld';

export type VendorApproveResult = {
  id: string;
  status: string;
  bookingNumber: string;
  vendorId?: string;
  assignedFleetVehicleLabel?: string;
  message?: string;
};

/** One booking row for the vendor portal list (mirrors GET /vendor/bookings). */
export type VendorBookingItem = {
  bookingType: 'towing' | 'driver';
  id: string;
  bookingNumber: string;
  status: string;
  pickup?: { label?: string; address?: string; latitude?: number; longitude?: number };
  dropoff?: { label?: string; address?: string; latitude?: number; longitude?: number } | null;
  estimatedFare?: number;
  finalFare?: number;
  distanceKm?: number;
  createdAt: string;
  scheduledAt?: string;
  serviceLabel: string;
  onSiteAssist?: boolean;
  assignedFleetVehicleId?: string;
  assignedFleetVehicleLabel?: string;
  driver?: { id: string; name: string; phone: string; rating: number };
};

export type VendorBookingTracking = {
  bookingType: 'towing' | 'driver';
  id: string;
  bookingNumber: string;
  status: string;
  serviceLabel: string;
  pickup?: { address?: string; latitude?: number; longitude?: number };
  dropoff?: { address?: string; latitude?: number; longitude?: number } | null;
  assignedFleetVehicleLabel?: string;
  driver?: { id: string; name: string; phone: string };
  driverLocation?: { latitude: number; longitude: number; updatedAt?: string } | null;
  isLocationFresh: boolean;
  statusHistory: Array<{ status: string; timestamp: string; note?: string }>;
};

/* Location-101 preview fixture: a live EN_ROUTE trip with a fresh driver fix
 * between pickup and drop. Mirrors GET /vendor/bookings/:id/tracking so the
 * tracking screen can be exercised without a backend session. Real API wins. */
const MOCK_TRACKING_LAT = 20.2961;
const buildMockTracking = (bookingId: string, bookingType: 'towing' | 'driver'): VendorBookingTracking => ({
  bookingType,
  id: bookingId,
  bookingNumber: bookingType === 'towing' ? 'TOW-10048' : 'DRV-10048',
  status: 'DRIVER_EN_ROUTE',
  serviceLabel: bookingType === 'towing' ? 'Emergency Towing' : 'Full-Time Driver',
  pickup: {
    address: 'Janpath Road, Saheed Nagar, Bhubaneswar',
    latitude: 20.2891,
    longitude: 85.8412,
  },
  dropoff: {
    address: 'Sector B, Mancheswar Industrial Workshop, Bhubaneswar',
    latitude: 20.3204,
    longitude: 85.8678,
  },
  assignedFleetVehicleLabel: 'Tata 407 (OD-02-TOW-1001)',
  driver: {
    id: PREVIEW_DRIVER.id,
    name: PREVIEW_DRIVER.fullName,
    phone: PREVIEW_DRIVER.phone,
  },
  driverLocation: {
    latitude: MOCK_TRACKING_LAT,
    longitude: 85.852,
    updatedAt: new Date().toISOString(),
  },
  isLocationFresh: true,
  statusHistory: [
    {
      status: 'CONFIRMED',
      timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
      note: 'Advance payment verified',
    },
    {
      status: 'DRIVER_ASSIGNED',
      timestamp: new Date(Date.now() - 26 * 60 * 1000).toISOString(),
      note: `${PREVIEW_DRIVER.fullName} assigned with Tata 407`,
    },
    {
      status: 'DRIVER_EN_ROUTE',
      timestamp: new Date(Date.now() - 21 * 60 * 1000).toISOString(),
      note: 'Driver accepted the job',
    },
  ],
});

export async function getVendorBookingTracking(input: {
  bookingId: string;
  bookingType: 'towing' | 'driver';
}): Promise<VendorBookingTracking> {
  if (UI_PREVIEW_MODE) {
    const linked = getPreviewVendorBookingTracking(input.bookingId, input.bookingType);
    if (linked) return linked;
    return buildMockTracking(input.bookingId, input.bookingType);
  }
  try {
    const { data } = await api.get<ApiSuccessResponse<VendorBookingTracking>>(
      API_ENDPOINTS.vendorBookingTracking(input.bookingId),
      { params: { bookingType: input.bookingType } },
    );
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      // Location-101 preview: serve the live-trip fixture so the tracking
      // screen (map, fresh driver marker, progress timeline) is testable.
      const linked = getPreviewVendorBookingTracking(input.bookingId, input.bookingType);
      if (linked) return linked;
      return buildMockTracking(input.bookingId, input.bookingType);
    }
    throw error;
  }
}

export async function listVendorBookings(): Promise<VendorBookingItem[]> {
  if (UI_PREVIEW_MODE) return getPreviewVendorBookings();
  try {
    const { data } = await api.get<ApiSuccessResponse<VendorBookingItem[]>>(
      API_ENDPOINTS.vendorBookings,
    );
    return data.data ?? [];
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      return getPreviewVendorBookings();
    }
    throw error;
  }
}

/** @deprecated Use VendorApproveResult — assign API kept for older clients. */
export type VendorAssignResult = VendorApproveResult & {
  driverId?: string;
  driver?: { id: string; name: string; phone: string; rating: number };
};

export async function listVendorBookingOffers(): Promise<DriverJobBooking[]> {
  if (UI_PREVIEW_MODE) return getPreviewVendorOpenLeads();
  try {
    const { data } = await api.get<ApiSuccessResponse<DriverJobBooking[]>>(
      API_ENDPOINTS.vendorBookingOffers,
    );
    return data.data ?? [];
  } catch (error) {
    if (UI_PREVIEW_MODE) return getPreviewVendorOpenLeads();
    throw error;
  }
}

export async function approveVendorBooking(payload: {
  bookingId: string;
  bookingType: 'towing' | 'driver';
  driverId: string;
  vehicleId?: string;
}): Promise<VendorApproveResult> {
  try {
    const { data } = await api.post<ApiSuccessResponse<VendorApproveResult>>(
      API_ENDPOINTS.vendorBookingApprove(payload.bookingId),
      {
        bookingType: payload.bookingType,
        driverId: payload.driverId,
        ...(payload.vehicleId ? { vehicleId: payload.vehicleId } : {}),
      },
    );
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      previewApproveVendorBooking({
        bookingId: payload.bookingId,
        bookingType: payload.bookingType,
        driverId: payload.driverId,
        vehicleLabel: 'OD 02 TOW 1001 · Flatbed Tow Truck · Tata 407 Recovery',
      });
      const booking = getPreviewVendorBookings().find(b => b.id === payload.bookingId);
      return {
        id: payload.bookingId,
        status: 'DRIVER_ASSIGNED',
        bookingNumber: booking?.bookingNumber ?? `TOW-${payload.bookingId.slice(-5)}`,
        vendorId: PREVIEW_VENDOR.id,
        assignedFleetVehicleLabel: 'OD 02 TOW 1001 · Flatbed Tow Truck · Tata 407 Recovery',
        message: 'Driver and fleet assignment confirmed',
      };
    }
    throw error;
  }
}

/** @deprecated Use approveVendorBooking — vendor now approves with vehicle only. */
export async function assignVendorBooking(payload: {
  bookingId: string;
  bookingType: 'towing' | 'driver';
  driverId: string;
  vehicleId?: string;
}): Promise<VendorAssignResult> {
  try {
    const { data } = await api.post<ApiSuccessResponse<VendorAssignResult>>(
      API_ENDPOINTS.vendorBookingAssign(payload.bookingId),
      {
        bookingType: payload.bookingType,
        driverId: payload.driverId,
        vehicleId: payload.vehicleId,
      },
    );
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      return {
        id: payload.bookingId,
        status: 'DRIVER_ASSIGNED',
        bookingNumber: `TOW-${payload.bookingId.slice(-5)}`,
        vendorId: PREVIEW_VENDOR.id,
        driverId: payload.driverId,
        message: 'Driver assigned successfully',
      };
    }
    throw error;
  }
}
