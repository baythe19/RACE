import { API_ENDPOINTS } from '../../config/api';
import type { ApiSuccessResponse } from '../../types/auth';
import type { Booking, BookingStatus, SubmitRatingRequest } from '../../types/booking';
import type { CombinedBookingListItem, ServiceBooking, ServiceBookingType } from '../../types/serviceBooking';
import { apiClient } from '../api/apiClient';
import { formatBookingStopAddress, formatReadableAddress } from '../../utils/readableAddress';
import { customerUnifiedStatusFromApi } from '../../utils/customerTrackStatus';
import {
  getDriverBooking,
  getDriverBookingTracking,
  getTowingBooking,
  getTowingBookingTracking,
} from './serviceBookingApi';

function mapUnifiedStatus(status: string): BookingStatus {
  switch (status) {
    case 'PENDING':
    case 'CONFIRMED':
    case 'DRIVER_ASSIGNED':
      return 'ASSIGNED';
    case 'DRIVER_EN_ROUTE':
      return 'EN_ROUTE';
    case 'DRIVER_ARRIVED':
      return 'ARRIVED';
    case 'IN_PROGRESS':
      return 'SERVICE_STARTED';
    case 'COMPLETED':
      return 'SERVICE_COMPLETED';
    case 'RATED':
      return 'PAID';
    case 'CANCELLED':
      return 'SERVICE_COMPLETED';
    default:
      return 'ASSIGNED';
  }
}

function resolveServiceLabel(item: ServiceBooking, bookingType: 'towing' | 'driver'): string {
  const labeled = item as ServiceBooking & { serviceLabel?: string };
  if (labeled.serviceLabel?.trim()) {
    return labeled.serviceLabel.trim();
  }
  if (bookingType === 'driver') {
    switch (item.driverServiceType) {
      case 'full_time':
        return 'Full-Time Driver';
      case 'part_time':
        return 'Part-Time Driver';
      case 'outstation':
        return 'Outstation Driver';
      case 'night':
        return 'Night Driver';
      default:
        return 'Driver hire';
    }
  }
  if (item.assistLabel?.trim()) {
    return item.assistLabel.trim();
  }
  if (item.towingMode === 'emergency') return 'Emergency Towing';
  if (item.towingMode === 'scheduled') return 'Scheduled Towing';
  if (item.towingMode === 'instant') return 'Instant Towing';
  return 'Towing';
}

function toBookingLocation(point: {
  address?: string;
  latitude?: number;
  longitude?: number;
}) {
  const address = point.address?.trim() ?? '';
  const display = formatBookingStopAddress(address) || formatReadableAddress(address);
  return {
    label: display,
    address,
    latitude: point.latitude,
    longitude: point.longitude,
  };
}

function mapServiceBookingToBooking(
  item: ServiceBooking,
  bookingType: 'towing' | 'driver',
  serviceLabel?: string,
): Booking {
  const resolvedLabel = serviceLabel?.trim() || resolveServiceLabel(item, bookingType);
  const unifiedStatus = customerUnifiedStatusFromApi(item);
  const status = mapUnifiedStatus(unifiedStatus);
  return {
    id: item.id,
    bookingNumber: item.bookingNumber,
    bookingType,
    unifiedStatus,
    categoryId: bookingType,
    serviceId: bookingType,
    serviceLabel: resolvedLabel,
    status,
    vehicleId: item.vehicleId,
    vehicleNumber: '',
    pickup: toBookingLocation(item.pickup),
    dropoff: item.dropoff ? toBookingLocation(item.dropoff) : undefined,
    scheduledAt: item.scheduledAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    distanceKm: item.distanceKm,
    durationMinutes: item.estimatedDurationHours
      ? Math.round(item.estimatedDurationHours * 60)
      : undefined,
    driver: item.driver
      ? {
          id: item.driver.id,
          name: item.driver.name,
          rating: item.driver.rating,
          phone: item.driver.phone,
        }
      : undefined,
    vendorId: item.vendorId,
    assignedFleetVehicleLabel: item.assignedFleetVehicleLabel,
    tripStartOtp: item.tripStartOtp,
    invoice: {
      baseFare: item.estimatedFare,
      total: item.estimatedFare,
      currency: 'INR',
      paymentMethod: item.advancePaid ? 'UPI' : undefined,
    },
    timeline: item.statusHistory.map(entry => ({
      status: mapUnifiedStatus(entry.status),
      label: entry.status.replace(/_/g, ' '),
      timestamp: entry.timestamp,
      completed: true,
    })),
    rating: item.rating?.score,
    review: item.rating?.review,
    advanceAmount: item.advanceAmount,
    remainingAmount: item.remainingAmount,
    advancePaid: item.advancePaid,
    remainingPaid: item.remainingPaid,
    paymentStatus: item.paymentStatus,
    estimatedFare: item.estimatedFare,
    fareBreakdown: item.fareBreakdown,
    arrivedAtDropoffAt: item.arrivedAtDropoffAt,
    completionOtp: item.completionOtp,
    paymentCollectionMode: item.paymentCollectionMode,
    paymentConfirmedByCustomer: item.paymentConfirmedByCustomer,
  };
}

function mapCombinedItem(item: CombinedBookingListItem): Booking {
  return mapServiceBookingToBooking(item, item.bookingType, item.serviceLabel);
}

export async function listBookings(): Promise<Booking[]> {
  const { isCustomerMockDataEnabled } = await import('../../config/customerQa');
  if (isCustomerMockDataEnabled()) {
    const { getPreviewCustomerBookings } = await import('../../data/previewCustomerBookings');
    return getPreviewCustomerBookings();
  }

  const { data } = await apiClient.get<ApiSuccessResponse<CombinedBookingListItem[]>>(
    API_ENDPOINTS.bookings,
  );
  return data.data.map(mapCombinedItem);
}

export async function getBooking(
  id: string,
  bookingType?: ServiceBookingType,
): Promise<Booking | null> {
  const { isCustomerMockDataEnabled } = await import('../../config/customerQa');
  if (isCustomerMockDataEnabled()) {
    const { getPreviewCustomerBookings } = await import('../../data/previewCustomerBookings');
    const matches = getPreviewCustomerBookings().filter(
      booking => booking.id === id && (!bookingType || booking.bookingType === bookingType),
    );
    return matches[0] ?? null;
  }

  if (bookingType === 'towing') {
    const towing = await getTowingBooking(id);
    return mapServiceBookingToBooking(towing, 'towing');
  }
  if (bookingType === 'driver') {
    const driver = await getDriverBooking(id);
    return mapServiceBookingToBooking(driver, 'driver');
  }

  // Legacy callers without a type resolve through the combined endpoint. Never
  // probe two Mongo collections by ID because their ObjectIds can collide.
  const matches = (await listBookings()).filter(booking => booking.id === id);
  if (matches.length > 1) {
    throw new Error('Booking type is required because this ID exists in multiple service collections');
  }
  return matches[0] ?? null;
}

/** @deprecated Use towing/driver booking APIs via Home flow. */
export async function createBookingApi(_payload: unknown): Promise<Booking | null> {
  return null;
}

export async function submitBookingRating(
  bookingId: string,
  bookingType: 'towing' | 'driver',
  payload: SubmitRatingRequest,
): Promise<Booking> {
  const { submitServiceBookingRating } = await import('./serviceBookingApi');
  const result = await submitServiceBookingRating(bookingId, bookingType, payload);
  return mapServiceBookingToBooking(result, bookingType);
}

export interface BookingTracking {
  bookingId: string;
  status: string;
  etaMinutes?: number;
  driver?: Booking['driver'];
  driverLocation?: { latitude: number; longitude: number };
  pickup: Booking['pickup'];
  dropoff?: Booking['dropoff'];
  tripStartOtp?: string;
  assignedFleetVehicleLabel?: string;
}

export async function getBookingTracking(
  bookingId: string,
  bookingType?: ServiceBookingType,
): Promise<BookingTracking | null> {
  const resolvedType = bookingType ?? (await getBooking(bookingId))?.bookingType;
  if (!resolvedType) return null;

  const result =
    resolvedType === 'towing'
      ? await getTowingBookingTracking(bookingId)
      : await getDriverBookingTracking(bookingId);
  return {
    bookingId: result.bookingId,
    status: result.status,
    driverLocation: result.driverLocation,
    pickup: toBookingLocation(result.pickup),
    dropoff: result.dropoff ? toBookingLocation(result.dropoff) : undefined,
    tripStartOtp: result.tripStartOtp,
    assignedFleetVehicleLabel: result.assignedFleetVehicleLabel,
  };
}
