import { Types } from 'mongoose';

import { BookingModel } from '../../../models/src/booking';
import { DriverBookingModel } from '../../../models/src/driverBooking';
import { TowingBookingModel } from '../../../models/src/towingBooking';
import { UserModel } from '../../../models/src/user';
import { ActivityLogModel } from '../../../models/src/activityLog';
import { TransactionModel } from '../../../models/src/transaction';
import { PaymentTransactionModel } from '../../../models/src/paymentTransaction';
import { PlatformSettingsModel } from '../../../models/src/platformSettings';
import { UserSubscriptionModel } from '../../../models/src/subscription';

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
    ]);

    const totalCommission = commissionAgg[0]?.total ?? 0;

    const [
      currentMonthCustomers,
      currentMonthVendors,
      currentMonthDrivers,
      currLegacy,
      currTowing,
      currDriver,
      currentMonthLegacyRevenueAgg,
      currentMonthBookingRevenueAgg,
      prevBookingRevenueAgg,
      bookingPaymentRevenueAgg,
      expiringSubscriptions,
      driverFleetStats,
      cancelledTowing,
      cancelledDriver,
      verifiedPoliceDrivers,
    ] = await Promise.all([
      UserModel.countDocuments({
        role: 'customer',
        createdAt: { $gte: currentMonth.start, $lte: currentMonth.end },
      }),
      UserModel.countDocuments({
        role: 'vendor',
        createdAt: { $gte: currentMonth.start, $lte: currentMonth.end },
      }),
      UserModel.countDocuments({
        role: 'driver',
        createdAt: { $gte: currentMonth.start, $lte: currentMonth.end },
      }),
      BookingModel.countDocuments({ createdAt: { $gte: currentMonth.start, $lte: currentMonth.end } }),
      TowingBookingModel.countDocuments({ createdAt: { $gte: currentMonth.start, $lte: currentMonth.end } }),
      DriverBookingModel.countDocuments({ createdAt: { $gte: currentMonth.start, $lte: currentMonth.end } }),
      TransactionModel.aggregate([
        {
          $match: {
            type: 'PAYMENT',
            status: 'COMPLETED',
            createdAt: { $gte: currentMonth.start, $lte: currentMonth.end },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      PaymentTransactionModel.aggregate([
        {
          $match: {
            paymentType: { $in: ['advance', 'final'] },
            status: 'success',
            createdAt: { $gte: currentMonth.start, $lte: currentMonth.end },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      PaymentTransactionModel.aggregate([
        {
          $match: {
            paymentType: { $in: ['advance', 'final'] },
            status: 'success',
            createdAt: { $gte: previousMonth.start, $lte: previousMonth.end },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      PaymentTransactionModel.aggregate([
        { $match: { paymentType: { $in: ['advance', 'final'] }, status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      UserSubscriptionModel.countDocuments({
        status: 'active',
        expiresAt: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
      UserModel.aggregate<{
        _id: null;
        avgRating: number;
        total: number;
        approved: number;
      }>([
        { $match: { role: 'driver', driverProfile: { $exists: true } } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$driverProfile.rating' },
            total: { $sum: 1 },
            approved: {
              $sum: { $cond: [{ $eq: ['$driverProfile.status', 'APPROVED'] }, 1, 0] },
            },
          },
        },
      ]),
      TowingBookingModel.countDocuments({ status: 'CANCELLED' }),
      DriverBookingModel.countDocuments({ status: 'CANCELLED' }),
      UserModel.countDocuments({
        role: 'driver',
        'driverProfile.policeVerificationStatus': 'VERIFIED',
      }),
    ]);

    const currentMonthBookings = currLegacy + currTowing + currDriver;
    // Align with adminFinance.getSummary (ledger payments + booking payment sessions).
    const totalRevenue =
      (revenueAgg[0]?.total ?? 0) + (bookingPaymentRevenueAgg[0]?.total ?? 0);
    const prevRevenue =
      (prevRevenueAgg[0]?.total ?? 0) + (prevBookingRevenueAgg[0]?.total ?? 0);
    const currentMonthRevenue =
      (currentMonthLegacyRevenueAgg[0]?.total ?? 0) +
      (currentMonthBookingRevenueAgg[0]?.total ?? 0);

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
    const serviceCountTotal = serviceDistribution.reduce((sum, row) => sum + (row.count ?? 0), 0);
    const topServices = serviceDistribution.map((row, i) => ({
      name: row._id ?? 'Other',
      value: serviceCountTotal
        ? Math.round(((row.count ?? 0) / serviceCountTotal) * 100)
        : 0,
      color: colors[i % colors.length],
    }));

    const fleet = driverFleetStats[0];
    const avgRating = fleet?.avgRating ?? 0;
    const approvedDrivers = fleet?.approved ?? 0;
    const fleetTotal = fleet?.total ?? 0;
    const cancelledBookings = cancelledTowing + cancelledDriver;
    const completionDenom = completedBookings + cancelledBookings;
    const completionPct = completionDenom
      ? Math.round((completedBookings / completionDenom) * 100)
      : 0;
    const approvalPct = fleetTotal ? Math.round((approvedDrivers / fleetTotal) * 100) : 0;
    const ratingPct = Math.min(100, Math.round((avgRating / 5) * 100));
    const safetyPct = fleetTotal
      ? Math.round((verifiedPoliceDrivers / fleetTotal) * 100)
      : 0;
    // On-time proxy: share of completed service bookings among settled (completed+cancelled).
    const onTimePct = completionPct;

    const alerts: Array<{ id: string; message: string; href: string; urgent: boolean }> = [];
    if (pendingVendors > 0) {
      alerts.push({
        id: 'pending-vendors',
        message: `${pendingVendors} vendor approval${pendingVendors === 1 ? '' : 's'} pending review`,
        href: '/vendors',
        urgent: true,
      });
    }
    if (pendingDrivers > 0) {
      alerts.push({
        id: 'pending-drivers',
        message: `${pendingDrivers} driver verification${pendingDrivers === 1 ? '' : 's'} awaiting action`,
        href: '/drivers',
        urgent: true,
      });
    }
    if (expiringSubscriptions > 0) {
      alerts.push({
        id: 'expiring-subs',
        message: `${expiringSubscriptions} subscription${expiringSubscriptions === 1 ? '' : 's'} expiring within 30 days`,
        href: '/subscriptions',
        urgent: false,
      });
    }
    if (pendingBookings > 0) {
      alerts.push({
        id: 'pending-bookings',
        message: `${pendingBookings} booking${pendingBookings === 1 ? '' : 's'} still pending assignment`,
        href: '/bookings',
        urgent: true,
      });
    }

    return {
      totalBookings: totalServiceBookings,
      todayBookings,
      pendingBookings,
      activeBookings: activeServiceBookings,
      totalRevenue,
      legacyBookings,
      useMockData: Boolean(settings?.useMockData),
      alerts,
      driverPerformance: [
        { metric: 'On-time', value: onTimePct },
        { metric: 'Rating', value: ratingPct },
        { metric: 'Acceptance', value: approvalPct },
        { metric: 'Completion', value: completionPct },
        { metric: 'Safety', value: safetyPct },
      ],
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
          value: formatCurrency(totalCommission),
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
      // Charts: current series from live aggregates; previous = prior month totals (honest, not invented %).
      revenueChart: revenueByWeek.map((row, i) => ({
        label: `Week ${i + 1}`,
        current: row.total,
        previous: i === 0 ? prevRevenue : 0,
      })),
      bookingsChart: bookingsByWeek.map((row, i) => ({
        label: `Week ${i + 1}`,
        current: row.total,
        previous: i === 0 ? prevBookings : 0,
      })),
      topServices,
      recentActivities: recentActivities.map((log) => ({
        id: log._id.toString(),
        title: log.title,
        description: log.description,
        timestamp: log.createdAt.toISOString(),
        type: mapActivityType(log.entityType),
      })),
      recentBookings: [
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
            amount: b.finalFare ?? b.estimatedFare ?? 0,
            createdAt: new Date(b.createdAt),
            bookingType: 'towing' as const,
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
            amount: b.finalFare ?? b.estimatedFare ?? 0,
            createdAt: new Date(b.createdAt),
            bookingType: 'driver' as const,
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
        city: (() => {
          if (vendor.address?.city?.trim()) return vendor.address.city.trim();
          const address = vendor.vendorProfile?.address ?? '';
          const parts = address
            .split(',')
            .map((part: string) => part.trim())
            .filter(Boolean);
          return parts[parts.length - 1] || 'Odisha';
        })(),
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
