import { Types } from 'mongoose';

import { BookingModel } from '../../../models/src/booking';
import { DriverBookingModel } from '../../../models/src/driverBooking';
import { TowingBookingModel } from '../../../models/src/towingBooking';
import { UserModel } from '../../../models/src/user';
import { ActivityLogModel } from '../../../models/src/activityLog';
import { TransactionModel } from '../../../models/src/transaction';
import { PlatformSettingsModel } from '../../../models/src/platformSettings';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function trend(current: number, previous: number) {
  if (previous === 0) {
    return { value: current > 0 ? '+100%' : '0%', direction: 'neutral' as const };
  }
  const pct = ((current - previous) / previous) * 100;
  const direction = pct > 0 ? ('up' as const) : pct < 0 ? ('down' as const) : ('neutral' as const);
  return { value: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`, direction, label: 'vs last month' };
}

function monthRange(offsetMonths: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - offsetMonths + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export const adminDashboardService = {
  async getDashboard() {
    const settings = await PlatformSettingsModel.findOne().lean();
    const commissionRate = settings?.commissionRate ?? 12.5;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const currentMonth = monthRange(0);
    const previousMonth = monthRange(1);

    const [
      totalCustomers,
      totalVendors,
      totalDrivers,
      legacyCompleted,
      towingCompleted,
      driverCompleted,
      pendingVendors,
      pendingDrivers,
      revenueAgg,
      commissionAgg,
      prevCustomers,
      prevVendors,
      prevDrivers,
      prevLegacy,
      prevTowing,
      prevDriver,
      prevRevenueAgg,
      revenueByWeek,
      legacyBookingsByWeek,
      towingBookingsByWeek,
      driverBookingsByWeek,
      legacyServiceDistribution,
      recentActivities,
      recentLegacyBookings,
      recentTowingBookings,
      recentDriverBookings,
      recentVendors,
    ] = await Promise.all([
      UserModel.countDocuments({ role: 'customer' }),
      UserModel.countDocuments({ role: 'vendor', vendorProfile: { $exists: true } }),
      UserModel.countDocuments({ role: 'driver', driverProfile: { $exists: true } }),
      BookingModel.countDocuments({ status: { $in: ['SERVICE_COMPLETED', 'PAID'] } }),
      TowingBookingModel.countDocuments({ status: { $in: ['COMPLETED', 'RATED'] } }),
      DriverBookingModel.countDocuments({ status: { $in: ['COMPLETED', 'RATED'] } }),
      UserModel.countDocuments({ role: 'vendor', 'vendorProfile.status': { $in: ['pending', 'under_review'] } }),
      UserModel.countDocuments({ role: 'driver', 'driverProfile.status': 'PENDING' }),
      TransactionModel.aggregate([
        { $match: { type: 'PAYMENT', status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      TransactionModel.aggregate([
        { $match: { type: 'COMMISSION', status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      UserModel.countDocuments({
        role: 'customer',
        createdAt: { $gte: previousMonth.start, $lte: previousMonth.end },
      }),
      UserModel.countDocuments({
        role: 'vendor',
        createdAt: { $gte: previousMonth.start, $lte: previousMonth.end },
      }),
      UserModel.countDocuments({
        role: 'driver',
        createdAt: { $gte: previousMonth.start, $lte: previousMonth.end },
      }),
      BookingModel.countDocuments({
        createdAt: { $gte: previousMonth.start, $lte: previousMonth.end },
      }),
      TowingBookingModel.countDocuments({
        createdAt: { $gte: previousMonth.start, $lte: previousMonth.end },
      }),
      DriverBookingModel.countDocuments({
        createdAt: { $gte: previousMonth.start, $lte: previousMonth.end },
      }),
      TransactionModel.aggregate([
        {
          $match: {
            type: 'PAYMENT',
            status: 'COMPLETED',
            createdAt: { $gte: previousMonth.start, $lte: previousMonth.end },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      TransactionModel.aggregate([
        {
          $match: {
            type: 'PAYMENT',
            status: 'COMPLETED',
            createdAt: { $gte: currentMonth.start, $lte: currentMonth.end },
          },
        },
        {
          $group: {
            _id: { $week: '$createdAt' },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 4 },
      ]),
      BookingModel.aggregate([
        { $match: { createdAt: { $gte: currentMonth.start, $lte: currentMonth.end } } },
        { $group: { _id: { $week: '$createdAt' }, total: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $limit: 4 },
      ]),
      TowingBookingModel.aggregate([
        { $match: { createdAt: { $gte: currentMonth.start, $lte: currentMonth.end } } },
        { $group: { _id: { $week: '$createdAt' }, total: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $limit: 4 },
      ]),
      DriverBookingModel.aggregate([
        { $match: { createdAt: { $gte: currentMonth.start, $lte: currentMonth.end } } },
        { $group: { _id: { $week: '$createdAt' }, total: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $limit: 4 },
      ]),
      BookingModel.aggregate([
        { $group: { _id: '$serviceLabel', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      ActivityLogModel.find().sort({ createdAt: -1 }).limit(8).lean(),
      BookingModel.find().sort({ createdAt: -1 }).limit(6).populate('customerId', 'fullName').lean(),
      TowingBookingModel.find().sort({ createdAt: -1 }).limit(6).populate('customerId', 'fullName').lean(),
      DriverBookingModel.find().sort({ createdAt: -1 }).limit(6).populate('customerId', 'fullName').lean(),
      UserModel.find({ role: 'vendor' }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const completedBookings = legacyCompleted + towingCompleted + driverCompleted;
    const prevBookings = prevLegacy + prevTowing + prevDriver;

    const [
      legacyBookings,
      towingCount,
      driverCount,
      towingToday,
      driverToday,
      towingPending,
      driverPending,
      towingActive,
      driverActive,
      towingRevenueAgg,
      driverRevenueAgg,
    ] = await Promise.all([
      BookingModel.countDocuments(),
      TowingBookingModel.countDocuments(),
      DriverBookingModel.countDocuments(),
      TowingBookingModel.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
      DriverBookingModel.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
      TowingBookingModel.countDocuments({ status: 'PENDING' }),
      DriverBookingModel.countDocuments({ status: 'PENDING' }),
      TowingBookingModel.countDocuments({ status: 'IN_PROGRESS' }),
      DriverBookingModel.countDocuments({ status: 'IN_PROGRESS' }),
      TowingBookingModel.aggregate([
        { $match: { paymentStatus: 'FULLY_PAID' } },
        { $group: { _id: null, total: { $sum: '$estimatedFare' } } },
      ]),
      DriverBookingModel.aggregate([
        { $match: { paymentStatus: 'FULLY_PAID' } },
        { $group: { _id: null, total: { $sum: '$estimatedFare' } } },
      ]),
    ]);

    const totalRevenue = revenueAgg[0]?.total ?? 0;
    const totalCommission = commissionAgg[0]?.total ?? 0;
    const prevRevenue = prevRevenueAgg[0]?.total ?? 0;

    const currentMonthCustomers = await UserModel.countDocuments({
      role: 'customer',
      createdAt: { $gte: currentMonth.start, $lte: currentMonth.end },
    });
    const currentMonthVendors = await UserModel.countDocuments({
      role: 'vendor',
      createdAt: { $gte: currentMonth.start, $lte: currentMonth.end },
    });
    const currentMonthDrivers = await UserModel.countDocuments({
      role: 'driver',
      createdAt: { $gte: currentMonth.start, $lte: currentMonth.end },
    });
    const [currLegacy, currTowing, currDriver] = await Promise.all([
      BookingModel.countDocuments({ createdAt: { $gte: currentMonth.start, $lte: currentMonth.end } }),
      TowingBookingModel.countDocuments({ createdAt: { $gte: currentMonth.start, $lte: currentMonth.end } }),
      DriverBookingModel.countDocuments({ createdAt: { $gte: currentMonth.start, $lte: currentMonth.end } }),
    ]);
    const currentMonthBookings = currLegacy + currTowing + currDriver;

    const currentMonthRevenueAgg = await TransactionModel.aggregate([
      {
        $match: {
          type: 'PAYMENT',
          status: 'COMPLETED',
          createdAt: { $gte: currentMonth.start, $lte: currentMonth.end },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const currentMonthRevenue = currentMonthRevenueAgg[0]?.total ?? 0;

    const weekMap = new Map<number, number>();
    for (const row of [...legacyBookingsByWeek, ...towingBookingsByWeek, ...driverBookingsByWeek]) {
      if (typeof row._id === 'number') {
        weekMap.set(row._id, (weekMap.get(row._id) ?? 0) + row.total);
      }
    }
    const bookingsByWeek = Array.from(weekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(0, 4)
      .map(([week, total]) => ({ _id: week, total }));

    const serviceDistribution = [
      ...(towingCount > 0 ? [{ _id: 'Towing Service', count: towingCount }] : []),
      ...(driverCount > 0 ? [{ _id: 'Driver Service', count: driverCount }] : []),
      ...legacyServiceDistribution,
    ];

    const colors = ['#F5A623', '#2563EB', '#16A34A', '#DC2626', '#7C3AED'];

    const totalServiceBookings = towingCount + driverCount;
    const todayBookings = towingToday + driverToday;
    const pendingBookings = towingPending + driverPending;
    const activeServiceBookings = towingActive + driverActive;
    const newRevenue = (towingRevenueAgg[0]?.total ?? 0) + (driverRevenueAgg[0]?.total ?? 0);

    return {
      totalBookings: totalServiceBookings,
      todayBookings,
      pendingBookings,
      activeBookings: activeServiceBookings,
      totalRevenue: newRevenue,
      legacyBookings,
      stats: [
        {
          id: 'customers',
          label: 'Total Customers',
          value: totalCustomers,
          trend: trend(currentMonthCustomers, prevCustomers),
          icon: 'Users',
        },
        {
          id: 'vendors',
          label: 'Total Vendors',
          value: totalVendors,
          trend: trend(currentMonthVendors, prevVendors),
          icon: 'Building2',
        },
        {
          id: 'drivers',
          label: 'Total Drivers',
          value: totalDrivers,
          trend: trend(currentMonthDrivers, prevDrivers),
          icon: 'Car',
        },
        {
          id: 'active_bookings',
          label: 'Active Bookings',
          value: activeServiceBookings,
          trend: trend(currentMonthBookings, prevBookings),
          icon: 'ClipboardList',
        },
        {
          id: 'total_bookings',
          label: 'Total Bookings',
          value: totalServiceBookings,
          icon: 'List',
        },
        {
          id: 'completed_bookings',
          label: 'Completed Bookings',
          value: completedBookings,
          icon: 'CheckCircle2',
        },
        {
          id: 'revenue',
          label: 'Total Revenue',
          value: formatCurrency(totalRevenue),
          trend: trend(currentMonthRevenue, prevRevenue),
          icon: 'IndianRupee',
        },
        {
          id: 'commission',
          label: 'Platform Commission',
          value: formatCurrency(totalCommission || Math.round(totalRevenue * (commissionRate / 100))),
          icon: 'Percent',
        },
        {
          id: 'pending_vendors',
          label: 'Pending Vendor Approvals',
          value: pendingVendors,
          variant: 'warning',
          icon: 'Hourglass',
        },
        {
          id: 'pending_drivers',
          label: 'Pending Driver Approvals',
          value: pendingDrivers,
          variant: 'warning',
          icon: 'Hourglass',
        },
      ],
      revenueChart: revenueByWeek.map((row, i) => ({
        label: `Week ${i + 1}`,
        current: row.total,
        previous: Math.round(row.total * 0.9),
      })),
      bookingsChart: bookingsByWeek.map((row, i) => ({
        label: `Week ${i + 1}`,
        current: row.total,
        previous: Math.max(0, row.total - 20),
      })),
      topServices: serviceDistribution.map((row, i) => ({
        name: row._id ?? 'Other',
        value: row.count,
        color: colors[i % colors.length],
      })),
      recentActivities: recentActivities.map((log) => ({
        id: log._id.toString(),
        title: log.title,
        description: log.description,
        timestamp: log.createdAt.toISOString(),
        type: mapActivityType(log.entityType),
      })),
      recentBookings: [
        ...recentLegacyBookings.map((b) => {
          const customer = b.customerId as { fullName?: string } | Types.ObjectId;
          const customerName =
            customer && typeof customer === 'object' && 'fullName' in customer
              ? customer.fullName ?? 'Customer'
              : 'Customer';
          return {
            id: b._id.toString(),
            bookingNumber: b.bookingNumber,
            customerName,
            service: b.serviceLabel ?? 'Roadside Service',
            status: b.status,
            amount: b.invoice?.total ?? 0,
            createdAt: new Date(b.createdAt),
          };
        }),
        ...recentTowingBookings.map((b) => {
          const customer = b.customerId as { fullName?: string } | Types.ObjectId;
          const customerName =
            customer && typeof customer === 'object' && 'fullName' in customer
              ? customer.fullName ?? 'Customer'
              : 'Customer';
          return {
            id: b._id.toString(),
            bookingNumber: b.bookingNumber,
            customerName,
            service: 'Towing Service',
            status: b.status,
            amount: b.estimatedFare ?? 0,
            createdAt: new Date(b.createdAt),
          };
        }),
        ...recentDriverBookings.map((b) => {
          const customer = b.customerId as { fullName?: string } | Types.ObjectId;
          const customerName =
            customer && typeof customer === 'object' && 'fullName' in customer
              ? customer.fullName ?? 'Customer'
              : 'Customer';
          return {
            id: b._id.toString(),
            bookingNumber: b.bookingNumber,
            customerName,
            service: 'Driver Service',
            status: b.status,
            amount: b.estimatedFare ?? 0,
            createdAt: new Date(b.createdAt),
          };
        }),
      ]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 6)
        .map((b) => ({
          ...b,
          createdAt: b.createdAt.toISOString(),
        })),
      recentVendors: recentVendors.map((vendor) => ({
        id: vendor._id.toString(),
        name: vendor.vendorProfile?.businessName ?? vendor.vendorProfile?.ownerName ?? vendor.fullName ?? 'Vendor',
        type: vendor.vendorProfile?.vendorType ?? 'towing_company',
        status: mapVendorStatus(vendor.vendorProfile?.status ?? 'pending'),
        submittedAt: (vendor.vendorProfile?.submittedAt ?? vendor.createdAt).toISOString(),
        city: vendor.vendorProfile?.address?.split(',')[0] ?? vendor.address?.city ?? 'Odisha',
      })),
    };
  },
};

function mapActivityType(entityType: string) {
  if (entityType.includes('vendor')) return 'vendor';
  if (entityType.includes('driver')) return 'driver';
  if (entityType.includes('booking')) return 'booking';
  if (entityType.includes('transaction') || entityType.includes('payment')) return 'payment';
  if (entityType.includes('customer') || entityType.includes('user')) return 'customer';
  return 'system';
}

function mapVendorStatus(status: string) {
  switch (status) {
    case 'approved':
      return 'APPROVED';
    case 'rejected':
      return 'REJECTED';
    case 'pending':
    case 'under_review':
      return 'PENDING';
    default:
      return 'PENDING';
  }
}
