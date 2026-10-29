import { createNotification } from './admin/notificationService';
import { notificationService } from './notification';
import { UserModel } from '../../models/src/user';
import { emitDriverOffersUpdated, emitVendorOffersUpdated } from './socket';
import type { UnifiedBookingStatus } from './bookingStatusConstants';

type ServiceBookingKind = 'towing' | 'driver';

function serviceLabel(bookingType: ServiceBookingKind): string {
  return bookingType === 'towing' ? 'Towing' : 'Driver service';
}

export async function notifyAdminCustomerBookingCreated(params: {
  bookingNumber: string;
  bookingType: ServiceBookingKind;
  bookingId: string;
}): Promise<void> {
  await createNotification({
    title: 'New customer booking',
    message: `${serviceLabel(params.bookingType)} ${params.bookingNumber} created — advance payment pending`,
    category: 'booking',
    entityType: 'booking',
    entityId: params.bookingId,
  });
}

export async function notifyCustomerBookingCreated(params: {
  customerId: string;
  bookingNumber: string;
  bookingType: ServiceBookingKind;
  bookingId: string;
  advanceAmount: number;
}): Promise<void> {
  await notificationService.createForUser(
    params.customerId,
    {
      type: 'BOOKING_CONFIRMED',
      title: 'Booking created',
      message: `${params.bookingNumber} is saved. Pay ₹${params.advanceAmount} advance to confirm and find a partner.`,
      metadata: {
        bookingId: params.bookingId,
        bookingType: params.bookingType,
        bookingNumber: params.bookingNumber,
      },
    },
    { category: 'booking' },
  );
}

export async function notifyAdminAdvancePaid(params: {
  bookingNumber: string;
  bookingType: ServiceBookingKind;
  bookingId: string;
  amount: number;
}): Promise<void> {
  await createNotification({
    title: 'Advance payment received',
    message: `${serviceLabel(params.bookingType)} ${params.bookingNumber} — ₹${params.amount} advance paid`,
    type: 'success',
    category: 'payment',
    entityType: 'booking',
    entityId: params.bookingId,
  });
}

export async function notifyCustomerAdvancePaid(params: {
  customerId: string;
  bookingNumber: string;
  bookingType: ServiceBookingKind;
  bookingId: string;
  amount: number;
}): Promise<void> {
  await notificationService.createForUser(
    params.customerId,
    {
      type: 'PAYMENT_SUCCESS',
      title: 'Advance paid — booking confirmed',
      message: `₹${params.amount} received for ${params.bookingNumber}. We are matching a nearby partner.`,
      metadata: {
        bookingId: params.bookingId,
        bookingType: params.bookingType,
        bookingNumber: params.bookingNumber,
      },
    },
    { category: 'payment' },
  );
}

export async function notifyCustomerBookingCancelled(params: {
  customerId: string;
  bookingNumber: string;
  bookingType: ServiceBookingKind;
  bookingId: string;
  refundAmount?: number;
}): Promise<void> {
  const refundLine =
    params.refundAmount && params.refundAmount > 0
      ? ` Refund of ₹${params.refundAmount} is being processed.`
      : '';
  await notificationService.createForUser(
    params.customerId,
    {
      type: 'BOOKING_COMPLETED',
      title: 'Booking cancelled',
      message: `${params.bookingNumber} was cancelled.${refundLine}`,
      metadata: {
        bookingId: params.bookingId,
        bookingType: params.bookingType,
        bookingNumber: params.bookingNumber,
      },
    },
    { category: 'booking' },
  );
}

export async function notifyCustomerTripStatus(params: {
  customerId: string;
  bookingNumber: string;
  bookingType: ServiceBookingKind;
  bookingId: string;
  status: UnifiedBookingStatus | string;
}): Promise<void> {
  const status = String(params.status).toUpperCase();
  let title: string | undefined;
  let message: string | undefined;
  let type: 'BOOKING_CONFIRMED' | 'BOOKING_COMPLETED' | 'PAYMENT_SUCCESS' = 'BOOKING_CONFIRMED';

  switch (status) {
    case 'DRIVER_ASSIGNED':
      title = 'Partner assigned';
      message = `${params.bookingNumber}: a partner has been assigned. They will accept and head to you shortly.`;
      break;
    case 'DRIVER_EN_ROUTE':
      title = 'Partner on the way';
      message = `${params.bookingNumber}: your partner accepted and is en route to pickup.`;
      break;
    case 'DRIVER_ARRIVED':
    case 'DRIVER_ARRIVED_PICKUP':
      title = 'Partner at pickup';
      message = `${params.bookingNumber}: your partner arrived at pickup. Share the trip OTP to start.`;
      break;
    case 'IN_PROGRESS':
      title = 'Trip in progress';
      message = `${params.bookingNumber}: service is in progress. Track live in the app.`;
      break;
    case 'DRIVER_ARRIVED_DROPOFF':
      title = 'Arrived at destination';
      message = `${params.bookingNumber}: vehicle reached drop-off. Complete payment to get your completion code.`;
      type = 'PAYMENT_SUCCESS';
      break;
    case 'COMPLETED':
      title = 'Trip completed';
      message = `${params.bookingNumber} is complete. Rate your experience when you have a moment.`;
      type = 'BOOKING_COMPLETED';
      break;
    default:
      return;
  }

  await notificationService.createForUser(
    params.customerId,
    {
      type,
      title,
      message,
      metadata: {
        bookingId: params.bookingId,
        bookingType: params.bookingType,
        bookingNumber: params.bookingNumber,
        status,
      },
    },
    { category: 'booking' },
  );
}

export async function notifyDriverJobOffer(params: {
  driverId: string;
  bookingNumber: string;
  bookingType: ServiceBookingKind;
  bookingId: string;
  message?: string;
}): Promise<void> {
  await notificationService.createForUser(
    params.driverId,
    {
      type: 'BOOKING_CONFIRMED',
      title: 'New job offer',
      message: params.message ?? `${params.bookingNumber} — open the app to accept or reject.`,
      metadata: {
        bookingId: params.bookingId,
        bookingType: params.bookingType,
        bookingNumber: params.bookingNumber,
      },
    },
    { audience: 'driver', category: 'booking' },
  );
}

/** Confirmed hire jobs land with the matching independent drivers. */
export async function notifyDriversOpenHireJob(params: {
  bookingNumber: string;
  bookingId: string;
  serviceLabel: string;
  driverServiceType?: 'part_time' | 'full_time' | 'outstation' | 'night';
  pickupAddress?: string;
}): Promise<void> {
  emitDriverOffersUpdated();

  const category =
    params.driverServiceType === 'part_time'
      ? { selfDriverCategory: 'PART_TIME' as const }
      : params.driverServiceType === 'full_time'
        ? { selfDriverCategory: 'FULL_TIME' as const }
        : { selfDriverCategory: { $in: ['PART_TIME', 'FULL_TIME'] as const } };

  const drivers = await UserModel.find({
    role: 'driver',
    driverContext: 'INDEPENDENT',
    accountStatus: { $nin: ['SUSPENDED', 'INACTIVE'] },
    ...category,
  })
    .select('_id')
    .limit(40)
    .lean()
    .exec();

  const where = params.pickupAddress?.trim() ? ` · ${params.pickupAddress.trim()}` : '';
  await Promise.all(
    drivers.map(driver =>
      notificationService
        .createForUser(
          driver._id.toString(),
          {
            type: 'BOOKING_CONFIRMED',
            title: 'New driver job',
            message: `${params.serviceLabel} ${params.bookingNumber}${where}. Open Jobs to accept.`,
            metadata: {
              bookingId: params.bookingId,
              bookingType: 'driver',
              bookingNumber: params.bookingNumber,
            },
          },
          { audience: 'driver', category: 'booking' },
        )
        .catch(() => undefined),
    ),
  );
}
export async function notifyVendorsOpenTowingJob(params: {
  bookingNumber: string;
  bookingId: string;
  serviceLabel: string;
  pickupAddress?: string;
}): Promise<void> {
  emitVendorOffersUpdated();

  const vendors = await UserModel.find({
    $or: [{ role: 'vendor' }, { capabilities: 'vendor' }],
    accountStatus: { $nin: ['SUSPENDED', 'INACTIVE'] },
  })
    .select('_id')
    .limit(40)
    .lean()
    .exec();

  const where = params.pickupAddress?.trim() ? ` · ${params.pickupAddress.trim()}` : '';
  await Promise.all(
    vendors.map(vendor =>
      notificationService
        .createForUser(
          vendor._id.toString(),
          {
            type: 'BOOKING_CONFIRMED',
            title: 'New job',
            message: `${params.serviceLabel} ${params.bookingNumber}${where}. Open Jobs to accept.`,
            metadata: {
              bookingId: params.bookingId,
              bookingType: 'towing',
              bookingNumber: params.bookingNumber,
            },
          },
          { audience: 'vendor', category: 'booking' },
        )
        .catch(() => undefined),
    ),
  );
}
