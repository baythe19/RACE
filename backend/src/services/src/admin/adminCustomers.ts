import { Types } from 'mongoose';

import { normalizeMobileNumber } from '../../../utils/src/otp';
import { ConflictError } from '../../../utils/src/errors';
import { BookingModel } from '../../../models/src/booking';
import { TowingBookingModel } from '../../../models/src/towingBooking';
import { DriverBookingModel } from '../../../models/src/driverBooking';
import { PaymentTransactionModel } from '../../../models/src/paymentTransaction';
import { userRepository } from '../userRepository';
import { UserModel } from '../../../models/src/user';
import { VehicleModel } from '../../../models/src/vehicle';
import { TransactionModel } from '../../../models/src/transaction';
import { UserSubscriptionModel } from '../../../models/src/subscription';
import { escapeRegex, paginate } from './pagination';
import { logActivity } from './activityLogger';
import { getEntityActivities } from './entityActivities';
import { NotFoundError } from '../../../utils/src/errors';

function mapCustomerPaymentStatus(status: string): string {
  const normalized = String(status).toLowerCase();
  if (normalized === 'success' || normalized === 'completed') return 'COMPLETED';
  if (normalized === 'initiated' || normalized === 'pending') return 'PENDING';
  if (normalized === 'failed') return 'FAILED';
  return String(status).toUpperCase();
}

function mapCustomer(
  user: {
    _id: Types.ObjectId;
    customerCode?: string;
    fullName?: string;
    mobileNumber: string;
    email?: string;
    address?: { line1?: string; city?: string; state?: string; pincode?: string };
    gender?: string;
    dateOfBirth?: Date;
    emergencyContact?: { name?: string; mobileNumber?: string; relationship?: string };
    accountStatus?: string;
    createdAt: Date;
  },
  vehicleCount = 0,
  totalBookings = 0,
) {
  const genderLabels: Record<string, string> = {
    male: 'Male',
    female: 'Female',
    other: 'Other',
    prefer_not_to_say: 'Prefer not to say',
  };
  return {
    id: user._id.toString(),
    customerId: user.customerCode ?? `CUST${user._id.toString().slice(-6).toUpperCase()}`,
    name: user.fullName ?? 'Unnamed Customer',
    phone: user.mobileNumber,
    email: user.email ?? '',
    addressLine: user.address?.line1 ?? '—',
    city: user.address?.city ?? '—',
    state: user.address?.state ?? 'Odisha',
    pincode: user.address?.pincode ?? '—',
    gender: user.gender ? genderLabels[user.gender] ?? user.gender : '—',
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
    emergencyContact:
      user.emergencyContact?.name && user.emergencyContact?.mobileNumber
        ? `${user.emergencyContact.name} (${user.emergencyContact.mobileNumber})${user.emergencyContact.relationship ? ` · ${user.emergencyContact.relationship}` : ''}`
        : null,
    vehicleCount,
    totalBookings,
    status: (user.accountStatus ?? 'ACTIVE') as 'ACTIVE' | 'SUSPENDED' | 'INACTIVE',
    joinedAt: user.createdAt.toISOString(),
  };
}

async function bookingCountsByCustomer(customerIds: Types.ObjectId[]) {
  if (customerIds.length === 0) return new Map<string, number>();

  const [legacy, towing, driver] = await Promise.all([
    BookingModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { customerId: { $in: customerIds } } },
      { $group: { _id: '$customerId', count: { $sum: 1 } } },
    ]),
    TowingBookingModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { customerId: { $in: customerIds } } },
      { $group: { _id: '$customerId', count: { $sum: 1 } } },
    ]),
    DriverBookingModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { customerId: { $in: customerIds } } },
      { $group: { _id: '$customerId', count: { $sum: 1 } } },
    ]),
  ]);

  const map = new Map<string, number>();
  for (const row of [...legacy, ...towing, ...driver]) {
    const key = row._id.toString();
    map.set(key, (map.get(key) ?? 0) + row.count);
  }
  return map;
}

async function vehicleCountsByCustomer(customerIds: Types.ObjectId[]) {
  if (customerIds.length === 0) return new Map<string, number>();
  const rows = await VehicleModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { customerId: { $in: customerIds } } },
    { $group: { _id: '$customerId', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id.toString(), row.count]));
}

export const adminCustomersService = {
  async list(filters: {
    search?: string;
    status?: string;
    city?: string;
    page?: number;
    pageSize?: number;
  }) {
    const query: Record<string, unknown> = { role: 'customer' };

    if (filters.status && filters.status !== 'ALL') {
      query.accountStatus = filters.status;
    }

    if (filters.city && filters.city !== 'ALL') {
      query['address.city'] = filters.city;
    }

    if (filters.search?.trim()) {
      const regex = new RegExp(escapeRegex(filters.search.trim()), 'i');
      query.$or = [
        { fullName: regex },
        { mobileNumber: regex },
        { email: regex },
        { customerCode: regex },
      ];
    }

    const page = await paginate(UserModel, query, filters, (doc) => mapCustomer(doc as never));
    const ids = page.items.map((item) => new Types.ObjectId(item.id));
    const [bookingMap, vehicleMap] = await Promise.all([
      bookingCountsByCustomer(ids),
      vehicleCountsByCustomer(ids),
    ]);

    return {
      ...page,
      items: page.items.map((item) => ({
        ...item,
        totalBookings: bookingMap.get(item.id) ?? 0,
        vehicleCount: vehicleMap.get(item.id) ?? item.vehicleCount ?? 0,
      })),
    };
  },

  async getById(id: string) {
    const user = await UserModel.findOne({ _id: id, role: 'customer' });
    if (!user) throw new NotFoundError('Customer not found');

    const customerObjectId = user._id;

    const [
      vehicleCount,
      legacyBookings,
      towingBookings,
      driverBookings,
      transactions,
      paymentTransactions,
      subscriptions,
      activities,
    ] = await Promise.all([
      VehicleModel.countDocuments({ customerId: customerObjectId }),
      BookingModel.find({ customerId: customerObjectId }).sort({ createdAt: -1 }).limit(20).lean(),
      TowingBookingModel.find({ customerId: customerObjectId }).sort({ createdAt: -1 }).limit(20).lean(),
      DriverBookingModel.find({ customerId: customerObjectId }).sort({ createdAt: -1 }).limit(20).lean(),
      TransactionModel.find({ customerId: customerObjectId }).sort({ createdAt: -1 }).limit(30).lean(),
      PaymentTransactionModel.find({ customerId: customerObjectId }).sort({ createdAt: -1 }).limit(30).lean(),
      UserSubscriptionModel.find({ userId: customerObjectId }).sort({ createdAt: -1 }).lean(),
      getEntityActivities('customer', id),
    ]);

    type UnifiedBookingRow = {
      id: string;
      bookingNumber: string;
      service: string;
      status: string;
      amount: number;
      date: string;
      vendorId?: string;
      driverName?: string;
      bookingType: 'legacy' | 'towing' | 'driver';
    };

    const unified: UnifiedBookingRow[] = [
      ...legacyBookings.map((b) => ({
        id: b._id.toString(),
        bookingNumber: b.bookingNumber,
        service: b.serviceLabel ?? 'Roadside',
        status: b.status,
        amount: b.invoice?.total ?? 0,
        date: b.createdAt.toISOString(),
        vendorId: b.vendorId?.toString(),
        driverName: b.driver?.name,
        bookingType: 'legacy' as const,
      })),
      ...towingBookings.map((b) => ({
        id: b._id.toString(),
        bookingNumber: b.bookingNumber,
        service: b.assistLabel?.trim() || 'Towing',
        status: b.status,
        amount: b.finalFare ?? b.estimatedFare ?? 0,
        date: b.createdAt.toISOString(),
        vendorId: b.vendorId?.toString(),
        driverName: undefined,
        bookingType: 'towing' as const,
      })),
      ...driverBookings.map((b) => ({
        id: b._id.toString(),
        bookingNumber: b.bookingNumber,
        service:
          b.driverServiceType === 'part_time'
            ? 'Driver Service · Part-time'
            : b.driverServiceType === 'full_time'
              ? 'Driver Service · Full-time'
              : b.driverServiceType === 'outstation'
                ? 'Driver Service · Outstation'
                : b.driverServiceType === 'night'
                  ? 'Driver Service · Night'
                  : 'Driver Service',
        status: b.status,
        amount: b.finalFare ?? b.estimatedFare ?? 0,
        date: b.createdAt.toISOString(),
        vendorId: b.vendorId?.toString(),
        driverName: undefined,
        bookingType: 'driver' as const,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 40);

    const driverIds = [
      ...new Set(
        [...towingBookings, ...driverBookings]
          .map((b) => b.driverId?.toString())
          .filter(Boolean) as string[],
      ),
    ];
    const drivers = driverIds.length
      ? await UserModel.find({ _id: { $in: driverIds }, role: 'driver' }).lean()
      : [];
    const driverMap = new Map(
      drivers.map((d) => [d._id.toString(), d.fullName ?? 'Driver'] as const),
    );

    for (const row of unified) {
      if (row.bookingType === 'towing' || row.bookingType === 'driver') {
        const source =
          row.bookingType === 'towing'
            ? towingBookings.find((b) => b._id.toString() === row.id)
            : driverBookings.find((b) => b._id.toString() === row.id);
        const driverId = source?.driverId?.toString();
        if (driverId) row.driverName = driverMap.get(driverId);
      }
    }

    const vendorIds = [...new Set(unified.map((b) => b.vendorId).filter(Boolean))] as string[];
    const vendors = vendorIds.length
      ? await UserModel.find({ _id: { $in: vendorIds }, role: 'vendor' }).lean()
      : [];
    const vendorMap = new Map(
      vendors.map((v) => [
        v._id.toString(),
        v.vendorProfile?.businessName ?? v.vendorProfile?.ownerName ?? v.fullName ?? 'Vendor',
      ]),
    );

    const bookingCountMap = await bookingCountsByCustomer([customerObjectId]);
    const totalBookings = bookingCountMap.get(id) ?? unified.length;

    const mergedPayments = [
      ...transactions.map((t) => ({
        id: t._id.toString(),
        amount: t.amount,
        method: t.paymentMethod ?? 'UPI',
        status: mapCustomerPaymentStatus(t.status),
        date: t.createdAt.toISOString(),
        reference: t.reference ?? t.transactionCode,
      })),
      ...paymentTransactions.map((t) => ({
        id: t._id.toString(),
        amount: t.amount,
        method: t.gatewayReferenceId ? 'Online' : 'UPI',
        status: mapCustomerPaymentStatus(t.status),
        date: t.createdAt.toISOString(),
        reference:
          t.gatewayReferenceId ??
          `${t.bookingType.toUpperCase()} · ${t.paymentType} · ${t.bookingId.toString().slice(-6)}`,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 40);

    const base = mapCustomer(user, vehicleCount, totalBookings);

    return {
      ...base,
      address: [user.address?.line1, user.address?.line2, user.address?.city, user.address?.state]
        .filter(Boolean)
        .join(', '),
      dateOfBirth: user.dateOfBirth?.toISOString(),
      emergencyContact: user.emergencyContact
        ? `${user.emergencyContact.name} (${user.emergencyContact.mobileNumber})`
        : undefined,
      bookings: unified.map((b) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        service: b.service,
        status: b.status,
        amount: b.amount,
        date: b.date,
        vendorName: b.vendorId ? vendorMap.get(b.vendorId) : undefined,
        driverName: b.driverName,
        bookingType: b.bookingType,
      })),
      payments: mergedPayments,
      subscriptions: subscriptions.map((s) => ({
        id: s._id.toString(),
        planName: s.planName,
        status: s.status,
        startDate: s.startedAt.toISOString(),
        endDate: s.expiresAt.toISOString(),
        amount: s.price,
      })),
      activities,
    };
  },

  async create(
    input: {
      name: string;
      phone: string;
      email?: string;
      city?: string;
      state?: string;
      status?: string;
      addressLine?: string;
      pincode?: string;
      gender?: string;
      dateOfBirth?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      emergencyContactRelation?: string;
    },
    actor: { id: string; name: string },
  ) {
    const mobileNumber = normalizeMobileNumber(input.phone);
    const existing = await userRepository.findByMobile(mobileNumber);
    if (existing) {
      throw new ConflictError('A customer with this phone number already exists');
    }

    const count = await UserModel.countDocuments({ role: 'customer' });
    const dateOfBirth = input.dateOfBirth ? new Date(input.dateOfBirth) : undefined;
    const user = await UserModel.create({
      mobileNumber,
      fullName: input.name,
      email: input.email,
      role: 'customer',
      isVerified: true,
      accountStatus: input.status ?? 'ACTIVE',
      customerCode: `CUST${String(count + 1).padStart(4, '0')}`,
      gender: (input.gender as never) || undefined,
      dateOfBirth: dateOfBirth && !Number.isNaN(dateOfBirth.getTime()) ? dateOfBirth : undefined,
      emergencyContact:
        input.emergencyContactName && input.emergencyContactPhone
          ? {
              name: input.emergencyContactName,
              mobileNumber: input.emergencyContactPhone,
              relationship: input.emergencyContactRelation || undefined,
            }
          : undefined,
      address: {
        line1: input.addressLine || undefined,
        city: input.city,
        state: input.state ?? 'Odisha',
        pincode: input.pincode || undefined,
        country: 'India',
      },
    });

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'CUSTOMER_CREATED',
      entityType: 'customer',
      entityId: user._id.toString(),
      title: `Customer ${user.fullName} created`,
    });

    return mapCustomer(user);
  },

  async update(
    id: string,
    input: Partial<{
      name: string;
      phone: string;
      email: string;
      city: string;
      state: string;
      status: string;
      addressLine: string;
      pincode: string;
      gender: string;
      dateOfBirth: string;
      emergencyContactName: string;
      emergencyContactPhone: string;
      emergencyContactRelation: string;
    }>,
    actor: { id: string; name: string },
  ) {
    const user = await UserModel.findOne({ _id: id, role: 'customer' });
    if (!user) throw new NotFoundError('Customer not found');

    if (input.name) user.fullName = input.name;
    if (input.phone) {
      const mobileNumber = normalizeMobileNumber(input.phone);
      if (mobileNumber !== user.mobileNumber) {
        const existing = await userRepository.findByMobile(mobileNumber);
        if (existing && existing.id !== user.id) {
          throw new ConflictError('A customer with this phone number already exists');
        }
        user.mobileNumber = mobileNumber;
      }
    }
    if (input.email) user.email = input.email;
    if (input.status) user.accountStatus = input.status as never;
    if (input.gender) user.gender = input.gender as never;
    if (input.dateOfBirth !== undefined) {
      const dob = input.dateOfBirth ? new Date(input.dateOfBirth) : undefined;
      user.dateOfBirth = dob && !Number.isNaN(dob.getTime()) ? dob : undefined;
    }
    if (input.emergencyContactName !== undefined || input.emergencyContactPhone !== undefined) {
      const hasContact = Boolean(input.emergencyContactName && input.emergencyContactPhone);
      user.emergencyContact = hasContact
        ? {
            name: input.emergencyContactName ?? user.emergencyContact?.name ?? '',
            mobileNumber: input.emergencyContactPhone ?? user.emergencyContact?.mobileNumber ?? '',
            relationship: input.emergencyContactRelation ?? user.emergencyContact?.relationship,
          }
        : undefined;
    }
    if (input.addressLine !== undefined || input.city || input.state || input.pincode !== undefined) {
      user.address = {
        ...user.address,
        line1: input.addressLine ?? user.address?.line1,
        city: input.city ?? user.address?.city,
        state: input.state ?? user.address?.state,
        pincode: input.pincode ?? user.address?.pincode,
      };
    }
    await user.save();

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'CUSTOMER_UPDATED',
      entityType: 'customer',
      entityId: user._id.toString(),
      title: `Customer ${user.fullName} updated`,
    });

    return mapCustomer(user);
  },

  async setStatus(
    id: string,
    status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE',
    actor: { id: string; name: string },
  ) {
    const user = await UserModel.findOneAndUpdate(
      { _id: id, role: 'customer' },
      { accountStatus: status },
      { new: true },
    );
    if (!user) throw new NotFoundError('Customer not found');

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: `CUSTOMER_${status}`,
      entityType: 'customer',
      entityId: user._id.toString(),
      title: `Customer ${user.fullName} marked ${status}`,
    });

    return mapCustomer(user);
  },

  async remove(id: string, actor: { id: string; name: string }) {
    const user = await UserModel.findOneAndDelete({ _id: id, role: 'customer' });
    if (!user) throw new NotFoundError('Customer not found');

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'CUSTOMER_DELETED',
      entityType: 'customer',
      entityId: id,
      title: `Customer ${user.fullName} deleted`,
    });
  },

  async export(filters: { search?: string; status?: string; city?: string }) {
    const result = await this.list({ ...filters, page: 1, pageSize: 10000 });
    return result.items;
  },

  async getCities() {
    const cities = await UserModel.distinct('address.city', {
      role: 'customer',
      'address.city': { $ne: null },
    });
    return cities.filter(Boolean).sort();
  },
};
