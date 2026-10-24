import { BadRequestError } from '../../../utils/src/errors';

/** 4-digit trip start code shown to customer (Ola/Uber style). */
export function generateTripStartOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function assertTripStartOtp(
  booking: { tripStartOtp?: string | null; tripStartOtpVerified?: boolean | null },
  input: string | undefined,
): void {
  if (!booking.tripStartOtp) {
    throw new BadRequestError('Trip OTP is not ready yet. Wait for partner assignment.');
  }
  if (booking.tripStartOtpVerified) {
    throw new BadRequestError('Trip OTP was already verified');
  }
  const code = (input ?? '').trim();
  if (!/^\d{4}$/.test(code)) {
    throw new BadRequestError('Enter the 4-digit trip OTP from the customer');
  }
  if (booking.tripStartOtp !== code) {
    throw new BadRequestError('Invalid trip OTP. Ask the customer to share their code.');
  }
}

export function customerTripOtp(
  booking: { tripStartOtp?: string | null; tripStartOtpVerified?: boolean | null; status?: string },
): string | undefined {
  if (booking.tripStartOtpVerified) return undefined;
  if (!booking.tripStartOtp) return undefined;
  const active = ['DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(
    booking.status ?? '',
  );
  return active ? booking.tripStartOtp : undefined;
}

/** 4-digit trip completion code shown to customer upon payment confirmation */
export function generateCompletionOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function assertCompletionOtp(
  booking: { completionOtp?: string | null; completionOtpVerified?: boolean | null },
  input: string | undefined,
): void {
  if (!booking.completionOtp) {
    throw new BadRequestError('Completion OTP is not ready yet. Ask customer to confirm payment.');
  }
  if (booking.completionOtpVerified) {
    throw new BadRequestError('Completion OTP was already verified');
  }
  const code = (input ?? '').trim();
  if (!/^\d{4}$/.test(code)) {
    throw new BadRequestError('Enter the 4-digit completion OTP from the customer');
  }
  if (booking.completionOtp !== code) {
    throw new BadRequestError('Invalid completion OTP. Ask the customer to share their code.');
  }
}

export function customerCompletionOtp(
  booking: {
    completionOtp?: string | null;
    completionOtpVerified?: boolean | null;
    status?: string;
    arrivedAtDropoffAt?: Date | null;
    paymentConfirmedByCustomer?: boolean | null;
  },
): string | undefined {
  if (booking.completionOtpVerified) return undefined;
  if (!booking.completionOtp) return undefined;
  if (booking.status === 'COMPLETED' || booking.status === 'RATED' || booking.status === 'CANCELLED') {
    return undefined;
  }
  return booking.completionOtp;
}

