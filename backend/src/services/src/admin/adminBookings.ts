import { Types } from 'mongoose';

import { BookingModel, type BookingStatus } from '../../../models/src/booking';
import { DriverBookingModel } from '../../../models/src/driverBooking';
import { TowingBookingModel } from '../../../models/src/towingBooking';
import { UserModel } from '../../../models/src/user';
import { VehicleModel } from '../../../models/src/vehicle';
import { PaymentTransactionModel } from '../../../models/src/paymentTransaction';
import { adminServiceBookingsService } from './adminServiceBookings';
import { TransactionModel } from '../../../models/src/transaction';
import { escapeRegex } from './pagination';
import { logActivity } from './activityLogger';
import { createNotification } from './notificationService';
import { mapLocationPoint } from './responseMappers';
import { generateBookingFinancials, generateRefund } from './transactionEngine';
import { mapPublicBookingStatus } from '../bookingDisplayStatus';
import { generatePrefixedBookingNumber } from '../bookings/booking';
import {
  encryptTripOtpForStorage,
  generateTripStartOtp,
  generateCompletionOtp,
  hashTripOtpForStorage,
} from '../bookings/tripOtp';
import { BadRequestError, NotFoundError } from '../../../utils/src/errors';

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

async function resolveServiceBookingType(id: string): Promise<'towing' | 'driver' | null> {
  const [towingExists, driverExists] = await Promise.all([
    TowingBookingModel.exists({ _id: id }),
    DriverBookingModel.exists({ _id: id }),
  ]);
  if (towingExists) return 'towing';
  if (driverExists) return 'driver';
  return null;
}

function mapServiceBookingDetailToListItem(
  detail: {
    id: string;
    bookingNumber: string;
    customerId: string;
    customerName: string;
    vendorId?: string;
    vendorName?: string;
    driverId?: string;
    driverName?: string;
    service?: string;
    amount?: number;
    city?: string;
    status: string;
    date: string;
  },
  bookingType: 'towing' | 'driver',
) {
  return {
    id: detail.id,
    bookingType,
    bookingNumber: detail.bookingNumber,
    customerId: detail.customerId,
    customerName: detail.customerName,
    vendorId: detail.vendorId ?? '',
    vendorName: detail.vendorName ?? '—',
    driverId: detail.driverId,
    driverName: detail.driverName,
    driverAssignment: detail.driverName ? 'Assigned' : 'Unassigned',
    service: detail.service ?? (bookingType === 'towing' ? 'Towing' : 'Driver Service'),
    serviceType: bookingType,
    amount: detail.amount ?? 0,
    city: detail.city ?? '—',
    status: detail.status,
    date: detail.date,
  };
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
  assignedFleetVehicleLabel?: string;
  createdAt: Date;
};


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

function buildBookingQuery(
  modelKind: 'towing' | 'driver' | 'legacy',
  filters: {
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    serviceType?: string;
  },
): Record<string, unknown> {
  const query: Record<string, unknown> = {};

  if (filters.search?.trim()) {
    const esc = escapeRegex(filters.search.trim());
    if (modelKind === 'legacy') {
      query.$or = [
        { bookingNumber: { $regex: esc, $options: 'i' } },
        { serviceLabel: { $regex: esc, $options: 'i' } },
      ];
    } else {
      query.bookingNumber = { $regex: esc, $options: 'i' };
    }
  }

  if (filters.dateFrom || filters.dateTo) {
    const dateQuery: Record<string, Date> = {};
    if (filters.dateFrom) dateQuery.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      dateQuery.$lte = end;
    }
    query.createdAt = dateQuery;
  }

  if (filters.status && filters.status !== 'ALL') {
    if (modelKind === 'legacy') {
      if (filters.status === 'COMPLETED') {
        query.status = { $in: ['COMPLETED', 'SERVICE_COMPLETED', 'PAID'] };
      } else if (filters.status === 'ACTIVE') {
        query.status = { $in: ['ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'SERVICE_STARTED', 'PAYMENT_PENDING'] };
      } else if (filters.status === 'PENDING') {
        query.status = { $in: ['CREATED', 'PENDING'] };
      } else {
        query.status = filters.status;
      }
    } else {
      if (filters.status === 'COMPLETED') {
        query.status = { $in: ['COMPLETED', 'RATED'] };
      } else if (filters.status === 'ACTIVE') {
        query.status = { $in: ['DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'] };
      } else if (filters.status === 'PENDING') {
        query.status = { $in: ['PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED'] };
      } else {
        query.status = filters.status;
      }
    }
  }

  if (filters.serviceType && filters.serviceType !== 'ALL') {
    if (modelKind === 'legacy') {
      query.categoryId = filters.serviceType;
    } else if (modelKind !== filters.serviceType) {
      return { _id: null };
    }
  }

  return query;
}

export const adminBookingsService = {
  async list(filters: {
    search?: string;
    status?: string;
    serviceType?: string;
    type?: 'towing' | 'driver' | 'legacy' | 'all';
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, Number(filters.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize ?? 10)));
    const type = filters.type ?? 'all';
    const limit = page * pageSize;

    const legacyQuery = buildBookingQuery('legacy', filters);
    const towingQuery = buildBookingQuery('towing', filters);
    const driverQuery = buildBookingQuery('driver', filters);

    const [
      legacyCount,
      towingCount,
      driverCount,
      legacyRows,
      towingRows,
      driverRows,
    ] = await Promise.all([
      type === 'all' || (type as string) === 'legacy' ? BookingModel.countDocuments(legacyQuery) : Promise.resolve(0),
      type === 'all' || type === 'towing' ? TowingBookingModel.countDocuments(towingQuery) : Promise.resolve(0),
      type === 'all' || type === 'driver' ? DriverBookingModel.countDocuments(driverQuery) : Promise.resolve(0),
      type === 'all' || (type as string) === 'legacy'
        ? BookingModel.find(legacyQuery).sort({ createdAt: -1 }).limit(limit).lean()
        : Promise.resolve([]),
      type === 'all' || type === 'towing'
        ? TowingBookingModel.find(towingQuery).sort({ createdAt: -1 }).limit(limit).lean()
        : Promise.resolve([]),
      type === 'all' || type === 'driver'
        ? DriverBookingModel.find(driverQuery).sort({ createdAt: -1 }).limit(limit).lean()
        : Promise.resolve([]),
    ]);

    const total = legacyCount + towingCount + driverCount;

    const merged = [
      ...towingRows.map((b) => ({ bookingType: 'towing' as const, booking: b as unknown as ServiceBookingRecord })),
      ...driverRows.map((b) => ({ bookingType: 'driver' as const, booking: b as unknown as ServiceBookingRecord })),
      ...legacyRows.map((b) => ({ bookingType: 'legacy' as const, booking: b as any })),
    ].sort(
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
    const vendorIds = [
      ...new Set(
        paged
          .map((row) => row.booking.vendorId?.toString())
          .filter((v): v is string => Boolean(v)),
      ),
    ];

    const [customers, drivers, vendors] = await Promise.all([
      UserModel.find({ _id: { $in: customerIds } }).lean(),
      UserModel.find({ _id: { $in: driverIds } }).lean(),
      UserModel.find({ _id: { $in: vendorIds } }).lean(),
    ]);
    const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));
    const driverMap = new Map(drivers.map((d) => [d._id.toString(), d]));
    const vendorMap = new Map(vendors.map((v) => [v._id.toString(), v]));

    const items = paged.map((row) => {
      const vendor = row.booking.vendorId ? vendorMap.get(row.booking.vendorId.toString()) : undefined;
      const vendorName =
        vendor?.vendorProfile?.businessName ??
        vendor?.vendorProfile?.ownerName ??
        vendor?.fullName ??
        '—';
      const vendorId = row.booking.vendorId?.toString() ?? '';

      if (row.bookingType === 'legacy') {
        const booking = row.booking as unknown as {
          _id: Types.ObjectId;
          bookingNumber: string;
          customerId: Types.ObjectId;
          vendorId?: Types.ObjectId;
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
          bookingType: 'legacy' as const,
          bookingNumber: booking.bookingNumber,
          customerId: booking.customerId.toString(),
          customerName: customer?.fullName ?? 'Customer',
          vendorId,
          vendorName,
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
        vendorId,
        vendorName,
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
        // Admin ops view: keep raw service status (do not collapse CONFIRMED/DRIVER_ASSIGNED → PENDING).
        status: booking.status,
        internalStatus: booking.status,
        publicStatus: mapPublicBookingStatus(booking.status),
        date: new Date(booking.createdAt).toISOString(),
        fareBreakdown: booking.fareBreakdown,
        vehicleCategory: booking.vehicleCategory,
        packageHours: booking.packageHours,
        assignedFleetVehicleLabel: booking.assignedFleetVehicleLabel,
      };
    });

    return {
      items,
      bookings: items,
      total,
      page,
      pageSize,
      limit: pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
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
    let resolvedType = type;
    if (!resolvedType) {
      resolvedType = (await resolveServiceBookingType(id)) ?? undefined;
    }

    if (resolvedType === 'towing' || resolvedType === 'driver') {
      const booking =
        resolvedType === 'towing'
          ? await TowingBookingModel.findById(id).lean()
          : await DriverBookingModel.findById(id).lean();
      if (!booking) throw new NotFoundError('Booking not found');

      const [customer, driver, vehicle, vendor, paymentTransactions] = await Promise.all([
        UserModel.findById(booking.customerId).lean(),
        booking.driverId ? UserModel.findById(booking.driverId).lean() : null,
        booking.vehicleId ? VehicleModel.findById(booking.vehicleId).lean() : null,
        booking.vendorId ? UserModel.findById(booking.vendorId).lean() : null,
        PaymentTransactionModel.find({ bookingId: booking._id, bookingType: resolvedType })
          .sort({ createdAt: -1 })
          .lean(),
      ]);

      return {
        id: booking._id.toString(),
        bookingType: resolvedType,
        bookingNumber: booking.bookingNumber,
        customerId: booking.customerId.toString(),
        customerName: customer?.fullName ?? 'Customer',
        customerPhone: customer?.mobileNumber ?? '—',
        customerEmail: customer?.email ?? '',
        vendorId: booking.vendorId?.toString() ?? '',
        vendorName: vendor?.vendorProfile?.businessName ?? vendor?.fullName ?? 'N/A',
        vendorPhone: vendor?.mobileNumber ?? 'N/A',
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
        assignedFleetVehicleLabel: (booking as unknown as { assignedFleetVehicleLabel?: string }).assignedFleetVehicleLabel,
        service: type === 'towing' ? 'Towing' : 'Driver Service',
        serviceType: type,
        amount: booking.estimatedFare ?? 0,
        city: customer?.address?.city ?? '—',
        status: booking.status,
        internalStatus: booking.status,
        publicStatus: mapPublicBookingStatus(booking.status),
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
          transactionId:
            paymentTransactions.find((transaction) => transaction.status === 'success')?._id?.toString() ?? 'N/A',
          paidAt:
            paymentTransactions.find((transaction) => transaction.status === 'success')?.createdAt?.toISOString(),
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
          status: entry.status,
          publicStatus: mapPublicBookingStatus(entry.status),
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
    const isDriverService = String(input.serviceType ?? '').toLowerCase() === 'driver';
    const customer = await UserModel.findOne({ fullName: input.customerName as string, role: 'customer' });
    if (!customer) throw new NotFoundError('Customer not found');

    let vehicle = await VehicleModel.findOne({ customerId: customer._id });
    if (!vehicle) {
      const count = await VehicleModel.countDocuments();
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

    const city = String(input.city ?? 'Bhubaneswar');
    const amount = Number(input.amount ?? 500);
    const vendorId = input.vendorId ? new Types.ObjectId(String(input.vendorId)) : undefined;

    let createdBooking: any;
    let serviceLabel = '';
    let categoryId = '';

    if (isDriverService) {
      categoryId = 'driver';
      serviceLabel = String(input.service ?? 'Driver Service');
      const bookingNumber = await generatePrefixedBookingNumber('DRV', () =>
        DriverBookingModel.countDocuments(),
      );
      const tripStartOtp = generateTripStartOtp();
      const completionOtp = generateCompletionOtp();
      createdBooking = await DriverBookingModel.create({
        customerId: customer._id,
        bookingNumber,
        vehicleId: vehicle._id,
        driverServiceType: 'part_time',
        pickup: { address: `${city} Central`, latitude: 20.2961, longitude: 85.8245 },
        dropoff: { address: `${city} Outskirts`, latitude: 20.3150, longitude: 85.8450 },
        estimatedFare: amount,
        advanceAmount: Math.round(amount * 0.3),
        advancePaid: false,
        remainingAmount: amount - Math.round(amount * 0.3),
        remainingPaid: false,
        paymentStatus: 'PENDING',
        status: vendorId ? 'DRIVER_ASSIGNED' : 'CONFIRMED',
        vendorId,
        tripStartOtp: hashTripOtpForStorage(tripStartOtp),
        tripStartOtpEncrypted: encryptTripOtpForStorage(tripStartOtp),
        completionOtp: hashTripOtpForStorage(completionOtp),
        completionOtpEncrypted: encryptTripOtpForStorage(completionOtp),
        statusHistory: [
          {
            status: vendorId ? 'DRIVER_ASSIGNED' : 'CONFIRMED',
            timestamp: new Date(),
            note: 'Created by Admin',
          },
        ],
      });
    } else {
      categoryId = 'towing';
      serviceLabel = String(input.service ?? 'Towing Service');
      const bookingNumber = await generatePrefixedBookingNumber('TOW', () =>
        TowingBookingModel.countDocuments(),
      );
      const tripStartOtp = generateTripStartOtp();
      const completionOtp = generateCompletionOtp();
      createdBooking = await TowingBookingModel.create({
        customerId: customer._id,
        bookingNumber,
        vehicleId: vehicle._id,
        towingMode: 'instant',
        pickup: { address: `${city} Breakdown Point`, latitude: 20.2961, longitude: 85.8245 },
        dropoff: { address: `${city} Service Workshop`, latitude: 20.3150, longitude: 85.8450 },
        distanceKm: 8,
        estimatedFare: amount,
        advanceAmount: Math.round(amount * 0.3),
        advancePaid: false,
        remainingAmount: amount - Math.round(amount * 0.3),
        remainingPaid: false,
        paymentStatus: 'PENDING',
        status: vendorId ? 'CONFIRMED' : 'PENDING',
        vendorId,
        tripStartOtp: hashTripOtpForStorage(tripStartOtp),
        tripStartOtpEncrypted: encryptTripOtpForStorage(tripStartOtp),
        completionOtp: hashTripOtpForStorage(completionOtp),
        completionOtpEncrypted: encryptTripOtpForStorage(completionOtp),
        statusHistory: [
          {
            status: vendorId ? 'CONFIRMED' : 'PENDING',
            timestamp: new Date(),
            note: 'Created by Admin',
          },
        ],
      });
    }

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'BOOKING_CREATED',
      entityType: 'booking',
      entityId: createdBooking._id.toString(),
      title: `Booking ${createdBooking.bookingNumber} created`,
    });

    await createNotification({
      title: 'New booking created',
      message: `Booking ${createdBooking.bookingNumber} created by admin`,
      category: 'booking',
      entityType: 'booking',
      entityId: createdBooking._id.toString(),
    });

    return {
      id: createdBooking._id.toString(),
      bookingNumber: createdBooking.bookingNumber,
      customerName: customer.fullName ?? 'Customer',
      vendorName: '—',
      driverName: undefined,
      service: serviceLabel,
      serviceType: categoryId,
      amount: createdBooking.estimatedFare,
      city,
      status: mapAdminBookingStatus(createdBooking.status),
      date: createdBooking.createdAt.toISOString(),
    };
  },

  async assignVendor(id: string, vendorId: string, actor: { id: string; name: string }) {
    const serviceType = await resolveServiceBookingType(id);
    if (serviceType) {
      const vendor = await UserModel.findOne({ _id: vendorId, role: 'vendor' });
      if (!vendor) throw new NotFoundError('Vendor not found');

      const booking =
        serviceType === 'towing'
          ? await TowingBookingModel.findById(id).exec()
          : await DriverBookingModel.findById(id).exec();
      if (!booking) throw new NotFoundError('Booking not found');
      if (booking.driverId) {
        throw new BadRequestError('Cannot change vendor after a driver is assigned');
      }
      if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
        throw new BadRequestError('Vendor can only be assigned while the booking is pending or confirmed');
      }

      booking.vendorId = vendor._id;
      booking.statusHistory.push({
        status: booking.status,
        timestamp: new Date(),
        note: `Admin assigned vendor ${vendor.vendorProfile?.businessName ?? vendor.fullName ?? 'Vendor'}`,
      });
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

      const detail = await this.getById(id, serviceType);
      return mapServiceBookingDetailToListItem(detail, serviceType);
    }

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
    const serviceType = await resolveServiceBookingType(id);
    if (serviceType) {
      await adminServiceBookingsService.assignDriver(
        id,
        { driverId, bookingType: serviceType },
        actor,
      );
      const detail = await this.getById(id, serviceType);
      return mapServiceBookingDetailToListItem(detail, serviceType);
    }

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
    let serviceBookingType = options?.bookingType;
    if (serviceBookingType !== 'towing' && serviceBookingType !== 'driver') {
      const resolved = await resolveServiceBookingType(id);
      if (resolved) serviceBookingType = resolved;
    }

    if (
      status === 'CANCELLED' &&
      (serviceBookingType === 'towing' || serviceBookingType === 'driver')
    ) {
      return adminServiceBookingsService.cancelBooking(
        id,
        {
          bookingType: serviceBookingType,
          reason: options?.reason?.trim() || 'Cancelled by admin',
          refundAmount: options?.amount,
        },
        actor,
      );
    }

    if (serviceBookingType === 'towing' || serviceBookingType === 'driver') {
      // Current service-booking state changes have dedicated, guarded paths:
      // verified advance payment confirms, driver assignment/trip actions
      // advance operations, and the cancellation endpoint records refund state.
      // A generic admin PATCH must never create a confirmed-but-unpaid booking.
      throw new BadRequestError(
        'Service booking status is controlled by verified payment, driver assignment, and cancellation actions.',
      );
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
    const serviceType = await resolveServiceBookingType(id);
    if (serviceType) {
      if (input.status) {
        return this.updateStatus(id, String(input.status), actor, {
          reason: input.reason as string | undefined,
          amount: input.amount !== undefined ? Number(input.amount) : undefined,
          bookingType: serviceType,
        });
      }
      throw new BadRequestError(
        'Service bookings cannot be edited this way. Use assign driver, cancel, or status actions.',
      );
    }

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
    const serviceType = await resolveServiceBookingType(id);
    if (serviceType) {
      throw new BadRequestError(
        'Service bookings cannot be deleted. Cancel the booking from the admin detail page instead.',
      );
    }

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
