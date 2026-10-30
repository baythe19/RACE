import { API_ENDPOINTS } from '../../config/api';
import type { ApiSuccessResponse } from '../../types/auth';
import type {
  CreateDriverBookingRequest,
  CreateRoadsideBookingRequest,
  CreateTowingBookingRequest,
  InitiatePaymentRequest,
  PaymentSession,
  RoadsideAvailabilityResponse,
  RoadsideBookingResponse,
  CancelBookingResult,
  CancellationPolicy,
  ServiceBooking,
  ServiceBookingTracking,
  ServiceBookingType,
  VerifyPaymentRequest,
} from '../../types/serviceBooking';
import { apiClient } from '../api/apiClient';

async function unwrap<T>(promise: Promise<{ data: ApiSuccessResponse<T> }>): Promise<T> {
  const { data } = await promise;
  return data.data;
}

export async function createTowingBooking(
  payload: CreateTowingBookingRequest,
): Promise<ServiceBooking> {
  return unwrap(
    apiClient.post<ApiSuccessResponse<ServiceBooking>>(API_ENDPOINTS.towingBookings, payload),
  );
}

export async function listTowingBookings(status?: string): Promise<ServiceBooking[]> {
  return unwrap(
    apiClient.get<ApiSuccessResponse<ServiceBooking[]>>(API_ENDPOINTS.towingBookings, {
      params: status ? { status } : undefined,
    }),
  );
}

export async function getTowingBooking(id: string): Promise<ServiceBooking> {
  return unwrap(
    apiClient.get<ApiSuccessResponse<ServiceBooking>>(API_ENDPOINTS.towingBooking(id)),
  );
}

export async function getTowingBookingTracking(id: string): Promise<ServiceBookingTracking> {
  return unwrap(
    apiClient.get<ApiSuccessResponse<ServiceBookingTracking>>(
      API_ENDPOINTS.towingBookingTracking(id),
    ),
  );
}

export async function createDriverBooking(
  payload: CreateDriverBookingRequest,
): Promise<ServiceBooking> {
  return unwrap(
    apiClient.post<ApiSuccessResponse<ServiceBooking>>(API_ENDPOINTS.driverBookings, payload),
  );
}

export async function listDriverBookings(status?: string): Promise<ServiceBooking[]> {
  return unwrap(
    apiClient.get<ApiSuccessResponse<ServiceBooking[]>>(API_ENDPOINTS.driverBookings, {
      params: status ? { status } : undefined,
    }),
  );
}

export async function getDriverBooking(id: string): Promise<ServiceBooking> {
  return unwrap(
    apiClient.get<ApiSuccessResponse<ServiceBooking>>(API_ENDPOINTS.driverBooking(id)),
  );
}

export async function getDriverBookingTracking(id: string): Promise<ServiceBookingTracking> {
  return unwrap(
    apiClient.get<ApiSuccessResponse<ServiceBookingTracking>>(
      API_ENDPOINTS.driverBookingTracking(id),
    ),
  );
}

export async function getServiceBookingCancelPreview(
  bookingId: string,
  bookingType: ServiceBookingType,
): Promise<CancellationPolicy> {
  const endpoint =
    bookingType === 'towing'
      ? API_ENDPOINTS.towingBookingCancelPreview(bookingId)
      : API_ENDPOINTS.driverBookingCancelPreview(bookingId);

  return unwrap(apiClient.get<ApiSuccessResponse<CancellationPolicy>>(endpoint));
}

export async function cancelServiceBooking(
  bookingId: string,
  bookingType: ServiceBookingType,
  reason?: string,
): Promise<CancelBookingResult> {
  const endpoint =
    bookingType === 'towing'
      ? API_ENDPOINTS.towingBookingCancel(bookingId)
      : API_ENDPOINTS.driverBookingCancel(bookingId);

  return unwrap(
    apiClient.post<ApiSuccessResponse<CancelBookingResult>>(endpoint, {
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
    }),
  );
}

export async function submitServiceBookingRating(
  bookingId: string,
  bookingType: ServiceBookingType,
  payload: { rating: number; review?: string; tags?: string[] },
): Promise<ServiceBooking> {
  const endpoint =
    bookingType === 'towing'
      ? `${API_ENDPOINTS.towingBooking(bookingId)}/rating`
      : `${API_ENDPOINTS.driverBooking(bookingId)}/rating`;

  return unwrap(apiClient.post<ApiSuccessResponse<ServiceBooking>>(endpoint, payload));
}

export async function getRoadsideAvailability(): Promise<RoadsideAvailabilityResponse> {
  return unwrap(
    apiClient.get<ApiSuccessResponse<RoadsideAvailabilityResponse>>(
      API_ENDPOINTS.roadsideAvailability,
    ),
  );
}

export async function createRoadsideBooking(
  payload: CreateRoadsideBookingRequest,
): Promise<RoadsideBookingResponse> {
  return unwrap(
    apiClient.post<ApiSuccessResponse<RoadsideBookingResponse>>(
      API_ENDPOINTS.roadsideBookings,
      payload,
    ),
  );
}

export async function initiateAdvancePayment(
  payload: InitiatePaymentRequest,
): Promise<PaymentSession> {
  return unwrap(
    apiClient.post<ApiSuccessResponse<PaymentSession>>(API_ENDPOINTS.paymentAdvance, payload),
  );
}

export async function verifyAdvancePayment(
  payload: VerifyPaymentRequest,
): Promise<PaymentSession> {
  return unwrap(
    apiClient.post<ApiSuccessResponse<PaymentSession>>(
      API_ENDPOINTS.paymentAdvanceVerify,
      payload,
    ),
  );
}

export async function initiateFinalPayment(
  payload: InitiatePaymentRequest,
): Promise<PaymentSession> {
  return unwrap(
    apiClient.post<ApiSuccessResponse<PaymentSession>>(API_ENDPOINTS.paymentFinal, payload),
  );
}

export async function verifyFinalPayment(payload: VerifyPaymentRequest): Promise<PaymentSession> {
  return unwrap(
    apiClient.post<ApiSuccessResponse<PaymentSession>>(API_ENDPOINTS.paymentFinalVerify, payload),
  );
}

/**
 * MVP local: server-side stub advance/final (no card charge). Requires
 * ALLOW_STUB_PAYMENTS=true on the API in development.
 */
/** Stub gateway flow: initiate advance payment then verify success. */
export async function completeAdvancePayment(
  bookingId: string,
  bookingType: ServiceBookingType,
): Promise<PaymentSession> {
  const session = await initiateAdvancePayment({ bookingId, bookingType });
  return verifyAdvancePayment({
    transactionId: session.transactionId,
    status: 'success',
  });
}

/** Stub gateway flow: initiate final payment then verify success. */
// TODO: Replace with real Razorpay gateway
export async function completeFinalPayment(
  bookingId: string,
  bookingType: ServiceBookingType,
): Promise<PaymentSession> {
  const session = await initiateFinalPayment({ bookingId, bookingType });
  return verifyFinalPayment({
    transactionId: session.transactionId,
    status: 'success',
  });
}

export async function createTowingBookingWithPayment(
  payload: CreateTowingBookingRequest,
): Promise<{ booking: ServiceBooking; payment: PaymentSession }> {
  const booking = await createTowingBooking(payload);
  const payment = await completeAdvancePayment(booking.id, 'towing');
  return { booking, payment };
}

export async function createDriverBookingWithPayment(
  payload: CreateDriverBookingRequest,
): Promise<{ booking: ServiceBooking; payment: PaymentSession }> {
  const booking = await createDriverBooking(payload);
  const payment = await completeAdvancePayment(booking.id, 'driver');
  return { booking, payment };
}

export type ConfirmPaymentModePayload = {
  bookingId: string;
  bookingType: ServiceBookingType;
  paymentMode: 'CASH' | 'UPI' | 'ONLINE';
};

export type ConfirmPaymentModeResult = {
  success: boolean;
  bookingId: string;
  bookingNumber?: string;
  bookingType: ServiceBookingType;
  paymentMode: 'CASH' | 'UPI' | 'ONLINE';
  amount?: number;
  completionOtp: string;
};

export async function confirmCustomerPaymentMode(
  payload: ConfirmPaymentModePayload,
): Promise<ConfirmPaymentModeResult> {
  return unwrap(
    apiClient.post<ApiSuccessResponse<ConfirmPaymentModeResult>>(
      API_ENDPOINTS.confirmPaymentMode(payload.bookingId),
      {
        bookingType: payload.bookingType,
        paymentMode: payload.paymentMode,
      },
    ),
  );
}
