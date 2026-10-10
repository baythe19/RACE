import { api } from '../api';
import { API_ENDPOINTS } from '../../config/api';
import type { ApiSuccessResponse } from '../../types/auth';
import type { DriverJobBooking } from '../driver/driverApi';
import { UI_PREVIEW_MODE } from '../../config/uiPreviewMode';
import { MOCK_JOB_OFFERS } from '../../data/mockPartnerData';

export type VendorApproveResult = {
  id: string;
  status: string;
  bookingNumber: string;
  vendorId?: string;
  assignedFleetVehicleLabel?: string;
  message?: string;
};

/** @deprecated Use VendorApproveResult — assign API kept for older clients. */
export type VendorAssignResult = VendorApproveResult & {
  driverId?: string;
  driver?: { id: string; name: string; phone: string; rating: number };
};

export async function listVendorBookingOffers(): Promise<DriverJobBooking[]> {
  try {
    const { data } = await api.get<ApiSuccessResponse<DriverJobBooking[]>>(
      API_ENDPOINTS.vendorBookingOffers,
    );
    return data.data ?? [];
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      return MOCK_JOB_OFFERS;
    }
    throw error;
  }
}

export async function approveVendorBooking(payload: {
  bookingId: string;
  bookingType: 'towing' | 'driver';
  vehicleId: string;
}): Promise<VendorApproveResult> {
  try {
    const { data } = await api.post<ApiSuccessResponse<VendorApproveResult>>(
      API_ENDPOINTS.vendorBookingApprove(payload.bookingId),
      {
        bookingType: payload.bookingType,
        vehicleId: payload.vehicleId,
      },
    );
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      return {
        id: payload.bookingId,
        status: 'CONFIRMED',
        bookingNumber: `TOW-${payload.bookingId.slice(-5)}`,
        vendorId: 'mock-vendor-001',
        assignedFleetVehicleLabel: 'Tata 407 (OD-02-TOW-1001)',
        message: 'Booking approved with fleet vehicle',
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
    if (UI_PREVIEW_MODE) {
      return {
        id: payload.bookingId,
        status: 'DRIVER_ASSIGNED',
        bookingNumber: `TOW-${payload.bookingId.slice(-5)}`,
        vendorId: 'mock-vendor-001',
        driverId: payload.driverId,
        message: 'Driver assigned successfully',
      };
    }
    throw error;
  }
}
