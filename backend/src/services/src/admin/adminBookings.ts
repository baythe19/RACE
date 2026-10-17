import { Types } from 'mongoose';

import { BookingModel, type BookingStatus } from '../../../models/src/booking';
import { DriverBookingModel } from '../../../models/src/driverBooking';
import { TowingBookingModel } from '../../../models/src/towingBooking';
import { UserModel } from '../../../models/src/user';
import { VehicleModel } from '../../../models/src/vehicle';
import { PaymentTransactionModel } from '../../../models/src/paymentTransaction';
import { releaseDriver } from '../bookings/driverAssignment';
import { adminServiceBookingsService } from './adminServiceBookings';
import { emitBookingStatusUpdate } from '../socket';
import { TransactionModel } from '../../../models/src/transaction';
import { escapeRegex } from './pagination';
import { logActivity } from './activityLogger';
import { createNotification } from './notificationService';
import { mapLocationPoint } from './responseMappers';
import { generateBookingFinancials, generateRefund } from './transactionEngine';
import { mapPublicBookingStatus } from '../bookingDisplayStatus';
import { BadRequestError, NotFoundError } from '../../../utils/src/errors';
import { canTransition, UNIFIED_BOOKING_STATUSES, type UnifiedBookingStatus } from '../bookingStatusConstants';

const LEGACY_ADMIN_TRANSITIONS: Record<string, string[]> = {
  CREATED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['EN_ROUTE', 'CANCELLED'],
  EN_ROUTE: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['SERVICE_STARTED', 'CANCELLED'],
  SERVICE_STARTED: ['SERVICE_COMPLETED', 'CANCELLED'],
  SERVICE_COMPLETED: ['PAYMENT_PENDING', 'PAID', 'COMPLETED'],
  PAYMENT_PENDING: ['PAID', 'REFUNDED', 'CANCELLED'],
  PAID: ['REFUNDED'],
  CANCELLED: ['REFUNDED'],
  REFUNDED: [],
};

function canAdminTransitionLegacy(current: BookingStatus, next: string): boolean {
  return LEGACY_ADMIN_TRANSITIONS[current]?.includes(next) ?? false;
}

const COMPLETED_STATUSES = ['SERVICE_COMPLETED', 'PAID'];

function mapAdminBookingStatus(status: string) {
  if (COMPLETED_STATUSES.includes(status)) return 'COMPLETED';
  if (status === 'CANCELLED') return 'CANCELLED';
  if (status === 'REFUNDED') return 'REFUNDED';
  return status;
}

type AdminBookingType = 'legacy' | 'towing' | 'driver';

type ServiceBookingRecord = {
  _id: Types.ObjectId;
  bookingNumber: string;
  customerId: Types.ObjectId;
  driverId?: Types.ObjectId;
  vehicleId?: Types.ObjectId;
  status: string;
  estimatedFare: number;
  fareBreakdown?: Record<string, unknown>;
  vehicleCategory?: string;
  packageHours?: number;
  statusHistory: Array<{ status: string; timestamp: Date; note?: string }>;
  pickup: { address: string; latitude: number; longitude: number };
  dropoff?: { address: string; latitude: number; longitude: number };
  cancellationReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  refundAmount?: number;
  refundStatus?: string;
  createdAt: Date;
};

function statusMatches(status: string, filter?: string): boolean {
  if (!filter || filter === 'ALL') return true;
  if (filter === 'COMPLETED') {
    return ['COMPLETED', 'RATED', 'SERVICE_COMPLETED', 'PAID'].includes(status);
  }
  if (filter === 'ACTIVE') {
    return [
      'ASSIGNED',
      'ACCEPTED',
      'EN_ROUTE',
      'ARRIVED',
      'SERVICE_STARTED',
      'PAYMENT_PENDING',
      'DRIVER_EN_ROUTE',
      'DRIVER_ARRIVED',
      'IN_PROGRESS',
    ].includes(status);
  }
  if (filter === 'PENDING') {
    return ['CREATED', 'PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED'].includes(status);
  }
  return status === filter;
}
function inDateRange(date: Date, from?: string, to?: string): boolean {
  if (from && date < new Date(from)) return false;
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (date > end) return false;
  }
  return true;
}

function toRegex(search?: string): RegExp | null {
  if (!search?.trim()) return null;
  return new RegExp(escapeRegex(search.trim()), 'i');
}

async function mapBookingListItem(booking: {
  _id: Types.ObjectId;
  bookingNumber: string;
  serviceLabel: string;
  categoryId: string;
  status: string;
  invoice?: { total: number };
  createdAt: Date;
  customerId: Types.ObjectId;
  vendorId?: Types.ObjectId;
  driver?: { name: string };
}) {
  const [customer, vendor] = await Promise.all([
    UserModel.findById(booking.customerId).lean(),
    booking.vendorId ? UserModel.findOne({ _id: booking.vendorId, role: 'vendor' }).lean() : null,
  ]);

  return {
    id: booking._id.toString(),
    bookingNumber: booking.bookingNumber,
    customerName: customer?.fullName ?? 'Customer',
    vendorName: vendor?.vendorProfile?.businessName ?? vendor?.vendorProfile?.ownerName ?? vendor?.fullName ?? '—',
    driverName: booking.driver?.name,
    service: booking.serviceLabel,
    serviceType: booking.categoryId,
    amount: booking.invoice?.total ?? 0,
    city: customer?.address?.city ?? '—',
    status: mapAdminBookingStatus(booking.status),
    date: booking.createdAt.toISOString(),
  };
}

async function pushStatus(
  booking: { status: string; statusHistory: { status: string; timestamp: Date }[] },
  status: string,
) {
  booking.status = status;
  booking.statusHistory.push({ status, timestamp: new Date() });
}

export const adminBookingsService = {
  async list(filters: {
    search?: string;
    status?: string;
    serviceType?: string;
    type?: 'towing' | 'driver' | 'all';
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, Number(filters.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize ?? 10)));
    const regex = toRegex(filters.search);
    const type = filters.type ?? 'all';

    const [legacyBookings, towingBookings, driverBookings] = await Promise.all([
      type === 'all'
        ? BookingModel.find().lean()
        : Promise.resolve([]),
      type === 'driver'
        ? Promise.resolve([])
        : TowingBookingModel.find().lean(),
      type === 'towing'
        ? Promise.resolve([])
        : DriverBookingModel.find().lean(),
    ]);

    const serviceItems = [
      ...towingBookings.map((b) => ({ bookingType: 'towing' as const, booking: b as unknown as ServiceBookingRecord })),
      ...driverBookings.map((b) => ({ bookingType: 'driver' as const, booking: b as unknown as ServiceBookingRecord })),
    ].filter(({ bookingType, booking }) => {
      if (filters.serviceType && filters.serviceType !== 'ALL' && filters.serviceType !== bookingType) return false;
      if (!statusMatches(booking.status, filters.status)) return false;
      if (!inDateRange(new Date(booking.createdAt), filters.dateFrom, filters.dateTo)) return false;
      if (regex && !regex.test(booking.bookingNumber)) return false;
      return true;
    });

    const legacyItems = legacyBookings
      .filter((b) => {
        if (filters.serviceType && filters.serviceType !== 'ALL' && filters.serviceType !== b.categoryId) return false;
        if (!statusMatches(b.status, filters.status)) return false;
        if (!inDateRange(new Date(b.createdAt), filters.dateFrom, filters.dateTo)) return false;
        if (regex && !(regex.test(b.bookingNumber) || regex.test(b.serviceLabel))) return false;
        return true;
      })
      .map((booking) => ({ bookingType: 'legacy' as const, booking }));

    const merged = [...serviceItems, ...legacyItems].sort(
      (a, b) => new Date(b.booking.createdAt).getTime() - new Date(a.booking.createdAt).getTime(),
    );

    const paged = merged.slice((page - 1) * pageSize, page * pageSize);
    const customerIds = [
      ...new Set(
        paged
          .map((row) => row.booking.customerId?.toString())
          .filter((v): v is string => Boolean(v)),
      ),
    ];
    const driverIds = [
      ...new Set(
        paged
          .map((row) =>
            row.bookingType === 'legacy'
              ? (row.booking as unknown as { driver?: { id?: string } }).driver?.id
              : (row.booking as ServiceBookingRecord).driverId?.toString(),
          )
          .filter((v): v is string => Boolean(v)),
      ),
    ];
    const [customers, drivers] = await Promise.all([
      UserModel.find({ _id: { $in: customerIds } }).lean(),
      UserModel.find({ _id: { $in: driverIds } }).lean(),
    ]);
    const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));
    const driverMap = new Map(drivers.map((d) => [d._id.toString(), d]));

    const items = paged.map((row) => {
      if (row.bookingType === 'legacy') {
        const booking = row.booking as unknown as {
          _id: Types.ObjectId;
          bookingNumber: string;
          customerId: Types.ObjectId;
          categoryId: string;
          serviceLabel: string;
          status: string;
          invoice?: { total: number };
          driver?: { id?: string; name?: string };
          createdAt: Date;
        };
        const customer = customerMap.get(booking.customerId.toString());
        return {
          id: booking._id.toString(),
          bookingType: 'legacy',
          bookingNumber: booking.bookingNumber,
          customerId: booking.customerId.toString(),
          customerName: customer?.fullName ?? 'Customer',
          vendorId: '',
          vendorName: '—',
          driverId: booking.driver?.id,
          driverName: booking.driver?.name,
          driverAssignment: booking.driver?.id ? 'Assigned' : 'Unassigned',
          service: booking.serviceLabel,
          serviceType: booking.categoryId,
          amount: booking.invoice?.total ?? 0,
          city: customer?.address?.city ?? '—',
          status: mapAdminBookingStatus(booking.status),
          date: new Date(booking.createdAt).toISOString(),
          fareBreakdown: undefined,
        };
      }

      const booking = row.booking as ServiceBookingRecord;
      const customer = customerMap.get(booking.customerId.toString());
      const driverId = booking.driverId?.toString();
      const driver = driverId ? driverMap.get(driverId) : undefined;
      return {
        id: booking._id.toString(),
        bookingType: row.bookingType,
        bookingNumber: booking.bookingNumber,
        customerId: booking.customerId.toString(),
        customerName: customer?.fullName ?? 'Customer',
        vendorId: '',
        vendorName: '—',
        driverId,
        driverName: driver?.fullName,
        driverAssignment:
          booking.status === 'DRIVER_ASSIGNED'
            ? 'Awaiting acceptance'
            : driver
              ? 'Assigned'
              : 'Unassigned',
        service: row.bookingType === 'towing' ? 'Towing' : 'Driver Service',
        serviceType: row.bookingType,
        amount: booking.estimatedFare ?? 0,
        city: customer?.address?.city ?? '—',
        status: mapPublicBookingStatus(booking.status),
        internalStatus: booking.status,
        date: new Date(booking.createdAt).toISOString(),
        fareBreakdown: booking.fareBreakdown,
        vehicleCategory: booking.vehicleCategory,
        packageHours: booking.packageHours,
      };
    });

    return {
      items,
      bookings: items,
      total: merged.length,
      page,
      pageSize,
      limit: pageSize,
      totalPages: Math.max(1, Math.ceil(merged.length / pageSize)),
    };
  },

  async getCounts() {
    const [
      legacyAll,
      legacyCreated,
      legacyAssigned,
      legacyEnRoute,
      legacyInProgress,
      legacyCompleted,
      legacyCancelled,
      legacyRefunded,
      towingAll,
      towingPending,
      towingActive,
      towingCompleted,
      towingCancelled,
      driverAll,
      driverPending,
      driverActive,
      driverCompleted,
      driverCancelled,
    ] = await Promise.all([
      BookingModel.countDocuments(),
      BookingModel.countDocuments({ status: 'CREATED' }),
      BookingModel.countDocuments({ status: { $in: ['ASSIGNED', 'ACCEPTED'] } }),
      BookingModel.countDocuments({ status: { $in: ['EN_ROUTE', 'ARRIVED'] } }),
      BookingModel.countDocuments({ status: { $in: ['SERVICE_STARTED', 'PAYMENT_PENDING'] } }),
      BookingModel.countDocuments({ status: { $in: COMPLETED_STATUSES } }),
      BookingModel.countDocuments({ status: 'CANCELLED' }),
      BookingModel.countDocuments({ status: 'REFUNDED' }),
      TowingBookingModel.countDocuments(),
      TowingBookingModel.countDocuments({
        status: { $in: ['PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED'] },
      }),
      TowingBookingModel.countDocuments({
        status: { $in: ['DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'] },
      }),
      TowingBookingModel.countDocuments({ status: { $in: ['COMPLETED', 'RATED'] } }),
      TowingBookingModel.countDocuments({ status: 'CANCELLED' }),
      DriverBookingModel.countDocuments(),
      DriverBookingModel.countDocuments({
        status: { $in: ['PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED'] },
      }),
      DriverBookingModel.countDocuments({
        status: { $in: ['DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'] },
      }),
      DriverBookingModel.countDocuments({ status: { $in: ['COMPLETED', 'RATED'] } }),
      DriverBookingModel.countDocuments({ status: 'CANCELLED' }),
    ]);

    return {
      all: legacyAll + towingAll + driverAll,
      created: legacyCreated,
      assigned: legacyAssigned,
      enRoute: legacyEnRoute + towingActive + driverActive,
      active: legacyAssigned + legacyEnRoute + legacyInProgress + towingActive + driverActive,
      completed: legacyCompleted + towingCompleted + driverCompleted,
      cancelled: legacyCancelled + towingCancelled + driverCancelled,
      refunded: legacyRefunded,
      pending: legacyCreated + towingPending + driverPending,
    };
  },

  async getById(id: string, type?: 'towing' | 'driver' | 'legacy') {
    if (type === 'towing' || type === 'driver') {
      const booking =
        type === 'towing'
          ? await TowingBookingModel.findById(id).lean()
          : await DriverBookingModel.findById(id).lean();
      if (!booking) throw new NotFoundError('Booking not found');

      const [customer, driver, vehicle, paymentTransactions] = await Promise.all([
        UserModel.findById(booking.customerId).lean(),
        booking.driverId ? UserModel.findById(booking.driverId).lean() : null,
        booking.vehicleId ? VehicleModel.findById(booking.vehicleId).lean() : null,
        PaymentTransactionModel.find({ bookingId: booking._id, bookingType: type }).sort({ createdAt: -1 }).lean(),
      ]);

      return {
        id: booking._id.toString(),
        bookingType: type,
        bookingNumber: booking.bookingNumber,
        customerId: booking.customerId.toString(),
        customerName: customer?.fullName ?? 'Customer',
        customerPhone: customer?.mobileNumber ?? '—',
        customerEmail: customer?.email ?? '',
        vendorId: '',
        vendorName: '—',
        vendorPhone: '—',
        driverId: booking.driverId?.toString(),
        driverName: driver?.fullName,
        driverPhone: driver?.mobileNumber,
        driver: driver
          ? {
              name: driver.fullName ?? 'Driver',
              mobile: driver.mobileNumber,
              currentLocation: driver.currentLocation ?? null,
            }
          : undefined,
        customer: {
          name: customer?.fullName ?? 'Customer',
          mobile: customer?.mobileNumber ?? '—',
          email: customer?.email ?? '',
        },
        vehicle: vehicle
          ? {
              brand: vehicle.brand,
              model: vehicle.vehicleModel,
              vehicleNumber: vehicle.vehicleNumber,
            }
          : undefined,
        service: type === 'towing' ? 'Towing' : 'Driver Service',
        serviceType: type,
        amount: booking.estimatedFare ?? 0,
        city: customer?.address?.city ?? '—',
        status: mapPublicBookingStatus(booking.status),
        internalStatus: booking.status,
        date: booking.createdAt.toISOString(),
        location: {
          pickup: {
            address: booking.pickup.address,
            lat: booking.pickup.latitude,
            lng: booking.pickup.longitude,
          },
          dropoff: booking.dropoff
            ? {
                address: booking.dropoff.address,
                lat: booking.dropoff.latitude,
                lng: booking.dropoff.longitude,
              }
            : undefined,
        },
        payment: {
          amount: booking.estimatedFare ?? 0,
          method: 'online',
          status: booking.paymentStatus,
          transactionId: paymentTransactions[0]?._id?.toString() ?? '—',
        },
        fareBreakdown: booking.fareBreakdown,
        packageHours: (booking as unknown as { packageHours?: number }).packageHours,
        vehicleCategory: (booking as unknown as { vehicleCategory?: string }).vehicleCategory,
        paymentTransactions: paymentTransactions.map((tx) => ({
          id: tx._id.toString(),
          paymentType: tx.paymentType,
          amount: tx.amount,
          status: tx.status,
          note: tx.note,
          createdAt: tx.createdAt.toISOString(),
        })),
        statusHistory: booking.statusHistory.map((entry, index) => ({
          id: `${booking._id.toString()}-${index}`,
          status: entry.status,
          timestamp: entry.timestamp.toISOString(),
          note: entry.note,
        })),
        timeline: booking.statusHistory.map((entry, index) => ({
          id: `${booking._id.toString()}-${index}`,
          title:
            entry.status === 'DRIVER_ASSIGNED'
              ? 'Driver allotted — awaiting acceptance'
              : entry.status.replace(/_/g, ' '),
          timestamp: entry.timestamp.toISOString(),
          status: mapPublicBookingStatus(entry.status),
          description: entry.note,
        })),
        cancellationInfo: booking.cancelledAt
          ? {
              cancelledAt: booking.cancelledAt.toISOString(),
              cancelledBy: booking.cancelledBy,
              cancellationReason: booking.cancellationReason,
              refundAmount: booking.refundAmount ?? 0,
              refundStatus: booking.refundStatus ?? 'NOT_APPLICABLE',
            }
          : undefined,
        notes: booking.cancellationReason,
      };
    }

    const booking = await BookingModel.findById(id);
    if (!booking) throw new NotFoundError('Booking not found');
    let vendorId = booking.vendorId;
    if (!vendorId && booking.driver?.id) {
      const driver = await UserModel.findOne({ _id: booking.driver.id, role: 'driver' }).lean();
      vendorId = driver?.driverProfile?.vendorUserId;
    }
    const [customer, vendor, payments] = await Promise.all([
      UserModel.findById(booking.customerId).lean(),
      vendorId ? UserModel.findOne({ _id: vendorId, role: 'vendor' }).lean() : null,
      TransactionModel.find({ bookingId: booking._id }).sort({ createdAt: -1 }).lean(),
    ]);
    const paymentTx = payments.find((p) => p.type === 'PAYMENT') ?? payments[0];
    return {
      id: booking._id.toString(),
      bookingType: 'legacy',
      bookingNumber: booking.bookingNumber,
      customerId: booking.customerId.toString(),
      customerName: customer?.fullName ?? 'Customer',
      customerPhone: customer?.mobileNumber ?? '—',
      customerEmail: customer?.email ?? '',
      vendorId: vendorId?.toString() ?? '',
      vendorName: vendor?.vendorProfile?.businessName ?? vendor?.vendorProfile?.ownerName ?? vendor?.fullName ?? '—',
      vendorPhone: vendor?.mobileNumber ?? '—',
      driverId: booking.driver?.id,
      driverName: booking.driver?.name,
      driverPhone: booking.driver?.phone,
      service: booking.serviceLabel,
      serviceType: booking.categoryId,
      amount: booking.invoice?.total ?? 0,
      city: customer?.address?.city ?? booking.pickup.label,
      status: mapAdminBookingStatus(booking.status),
      date: booking.createdAt.toISOString(),
      location: {
        pickup: mapLocationPoint(booking.pickup),
        dropoff: booking.dropoff ? mapLocationPoint(booking.dropoff) : undefined,
      },
      payment: {
        amount: booking.invoice?.total ?? paymentTx?.amount ?? 0,
        method: booking.invoice?.paymentMethod ?? paymentTx?.paymentMethod ?? 'UPI',
        status: paymentTx?.status ?? (booking.status === 'PAID' ? 'COMPLETED' : 'PENDING'),
        transactionId: paymentTx?.transactionCode ?? paymentTx?._id?.toString() ?? '—',
        paidAt: paymentTx?.completedAt?.toISOString(),
      },
      timeline: booking.statusHistory.map((s, index) => ({
        id: `${booking._id.toString()}-${index}`,
        title: s.status.replace(/_/g, ' '),
        timestamp: s.timestamp.toISOString(),
        status: mapAdminBookingStatus(s.status),
      })),
      notes: booking.cancelReason,
    };
  },

  async create(input: Record<string, string | number>, actor: { id: string; name: string }) {
    const count = await BookingModel.countDocuments();
    const customer = await UserModel.findOne({ fullName: input.customerName as string, role: 'customer' });
    if (!customer) throw new NotFoundError('Customer not found');

    let vehicle = await VehicleModel.findOne({ customerId: customer._id });
    if (!vehicle) {
      vehicle = await VehicleModel.create({
        customerId: customer._id,
        vehicleNumber: `OD-TEMP-${count + 1}`,
        vehicleType: 'car',
        brand: 'Generic',
        vehicleModel: 'Vehicle',
        color: 'White',
        fuelType: 'petrol',
        qrCode: `QR-${customer._id.toString().slice(-8)}-${count + 1}`,
      });
    }

    const booking = await BookingModel.create({
      customerId: customer._id,
      vendorId: input.vendorId ? new Types.ObjectId(String(input.vendorId)) : undefined,
      bookingNumber: `BK${String(count + 1000)}${String.fromCharCode(65 + (count % 26))}`,
      categoryId: String(input.serviceType ?? 'towing'),
      serviceId: String(input.serviceType ?? 'towing'),
      serviceLabel: String(input.service ?? 'Towing Service'),
      status: String(input.status ?? 'CREATED'),
      vehicleId: vehicle._id,
      vehicleNumber: vehicle.vehicleNumber,
      pickup: { label: String(input.city ?? 'Pickup'), address: String(input.city ?? 'Pickup') },
      invoice: { baseFare: Number(input.amount ?? 0), total: Number(input.amount ?? 0), currency: 'INR' },
      statusHistory: [{ status: 'CREATED', timestamp: new Date() }],
    });

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'BOOKING_CREATED',
      entityType: 'booking',
      entityId: booking._id.toString(),
      title: `Booking ${booking.bookingNumber} created`,
    });

    await createNotification({
      title: 'New booking created',
      message: `Booking ${booking.bookingNumber} created by admin`,
      category: 'booking',
      entityType: 'booking',
      entityId: booking._id.toString(),
    });

    return mapBookingListItem(booking);
  },

  async assignVendor(id: string, vendorId: string, actor: { id: string; name: string }) {
    const [booking, vendor] = await Promise.all([
      BookingModel.findById(id),
      UserModel.findOne({ _id: vendorId, role: 'vendor' }),
    ]);
    if (!booking) throw new NotFoundError('Booking not found');
    if (!vendor) throw new NotFoundError('Vendor not found');

    booking.vendorId = vendor._id;
    await pushStatus(booking, 'ASSIGNED');
    await booking.save();

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'BOOKING_VENDOR_ASSIGNED',
      entityType: 'booking',
      entityId: id,
      title: `Vendor assigned to ${booking.bookingNumber}`,
    });

    await createNotification({
      title: 'Booking assigned to vendor',
      message: `${booking.bookingNumber} assigned to ${vendor.vendorProfile?.businessName ?? vendor.vendorProfile?.ownerName ?? vendor.fullName}`,
      category: 'booking',
      entityType: 'booking',
      entityId: id,
    });

    return mapBookingListItem(booking);
  },

  async assignDriver(id: string, driverId: string, actor: { id: string; name: string }) {
    const [booking, driver] = await Promise.all([
      BookingModel.findById(id),
      UserModel.findOne({ _id: driverId, role: 'driver' }),
    ]);
    if (!booking) throw new NotFoundError('Booking not found');
    if (!driver) throw new NotFoundError('Driver not found');

    booking.driver = {
      id: driver._id.toString(),
      name: driver.fullName ?? 'Driver',
      rating: driver.driverProfile?.rating ?? 0,
      phone: driver.mobileNumber,
    };
    if (driver.driverProfile?.vendorUserId) booking.vendorId = driver.driverProfile.vendorUserId;
    await pushStatus(booking, 'ASSIGNED');
    await booking.save();

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'BOOKING_DRIVER_ASSIGNED',
      entityType: 'booking',
      entityId: id,
      title: `Driver ${driver.fullName ?? 'Driver'} assigned to ${booking.bookingNumber}`,
    });

    return mapBookingListItem(booking);
  },

  async updateStatus(
    id: string,
    status: string,
    actor: { id: string; name: string },
    options?: { reason?: string; amount?: number; bookingType?: AdminBookingType },
  ) {
    if (
      status === 'CANCELLED' &&
      (options?.bookingType === 'towing' || options?.bookingType === 'driver')
    ) {
      return adminServiceBookingsService.cancelBooking(id, {
        bookingType: options.bookingType,
        reason: options.reason?.trim() || 'Cancelled by admin',
        refundAmount: options.amount,
      }, actor);
    }

    if (options?.bookingType === 'towing' || options?.bookingType === 'driver') {
      const booking =
        options.bookingType === 'towing'
          ? await TowingBookingModel.findById(id)
          : await DriverBookingModel.findById(id);
      if (!booking) throw new NotFoundError('Booking not found');

      const nextStatus = UNIFIED_BOOKING_STATUSES.find((candidate) => candidate === status) as
        | UnifiedBookingStatus
        | undefined;
      if (!nextStatus || !canTransition(booking.status, nextStatus)) {
        throw new BadRequestError('Invalid booking status transition');
      }
      if (nextStatus !== 'CONFIRMED') {
        throw new BadRequestError(
          'Use driver assignment and trip actions to advance an active service booking',
        );
      }

      booking.status = nextStatus;
      booking.statusHistory.push({
        status: status as never,
        timestamp: new Date(),
        note: 'Status updated by admin',
      });
      await booking.save();

      if (['COMPLETED', 'CANCELLED'].includes(status) && booking.driverId) {
        await releaseDriver(booking.driverId.toString(), booking._id.toString());
      }

      emitBookingStatusUpdate(booking._id.toString(), status, {
        statusHistory: booking.statusHistory.map((entry) => ({
          status: entry.status,
          timestamp: entry.timestamp.toISOString(),
          note: entry.note,
        })),
      });

      await logActivity({
        actorId: actor.id,
        actorName: actor.name,
        action: `SERVICE_BOOKING_${status}`,
        entityType: 'booking',
        entityId: id,
        title: `Service booking ${booking.bookingNumber} status → ${status}`,
      });

      return {
        id: booking._id.toString(),
        bookingType: options.bookingType,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        date: booking.createdAt.toISOString(),
      };
    }

    const booking = await BookingModel.findById(id);
    if (!booking) throw new NotFoundError('Booking not found');
    if (!canAdminTransitionLegacy(booking.status, status)) {
      throw new BadRequestError('Invalid booking status transition');
    }
    if (status === 'REFUNDED') {
      const refundAmount = options?.amount ?? booking.invoice?.total ?? 0;
      const maximumRefund = booking.invoice?.total ?? 0;
      if (!Number.isFinite(refundAmount) || refundAmount <= 0 || refundAmount > maximumRefund) {
        throw new BadRequestError('Refund amount must be positive and cannot exceed the booking total');
      }
    }

    await pushStatus(booking, status);

    if (options?.amount !== undefined) {
      booking.invoice = {
        baseFare: options.amount,
        total: options.amount,
        currency: booking.invoice?.currency ?? 'INR',
        platformFee: booking.invoice?.platformFee,
      };
    }

    if (status === 'CANCELLED') {
      booking.cancelReason = options?.reason;
      await createNotification({
        title: 'Booking cancelled',
        message: `${booking.bookingNumber} was cancelled`,
        type: 'warning',
        category: 'booking',
        entityType: 'booking',
        entityId: id,
      });
    } else if (['SERVICE_COMPLETED', 'PAID', 'COMPLETED'].includes(status)) {
      booking.status = 'PAID';
      booking.statusHistory.push({ status: 'PAID', timestamp: new Date() });
      await generateBookingFinancials(booking._id);
      await createNotification({
        title: 'Booking completed',
        message: `${booking.bookingNumber} marked completed`,
        type: 'success',
        category: 'booking',
        entityType: 'booking',
        entityId: id,
      });
    } else if (status === 'REFUNDED') {
      booking.refundedAt = new Date();
      await generateRefund(booking._id, options?.amount);
      await createNotification({
        title: 'Refund processed',
        message: `Refund processed for ${booking.bookingNumber}`,
        type: 'info',
        category: 'payment',
        entityType: 'booking',
        entityId: id,
      });
    }

    await booking.save();

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: `BOOKING_${status}`,
      entityType: 'booking',
      entityId: id,
      title: `Booking ${booking.bookingNumber} status → ${status}`,
      description: options?.reason,
    });

    return mapBookingListItem(booking);
  },

  async update(id: string, input: Record<string, string | number>, actor: { id: string; name: string }) {
    if (input.status) {
      return this.updateStatus(id, String(input.status), actor, {
        reason: input.reason as string | undefined,
        amount: input.amount !== undefined ? Number(input.amount) : undefined,
      });
    }

    const booking = await BookingModel.findById(id);
    if (!booking) throw new NotFoundError('Booking not found');

    if (input.amount) {
      booking.invoice = {
        baseFare: Number(input.amount),
        total: Number(input.amount),
        currency: 'INR',
      };
    }
    await booking.save();

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'BOOKING_UPDATED',
      entityType: 'booking',
      entityId: booking._id.toString(),
      title: `Booking ${booking.bookingNumber} updated`,
    });

    return mapBookingListItem(booking);
  },

  async remove(id: string, actor: { id: string; name: string }) {
    const booking = await BookingModel.findByIdAndDelete(id);
    if (!booking) throw new NotFoundError('Booking not found');
    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'BOOKING_DELETED',
      entityType: 'booking',
      entityId: id,
      title: `Booking ${booking.bookingNumber} deleted`,
    });
  },
};
