import { BookingModel } from '../../../models/src/booking';
import { TowingBookingModel } from '../../../models/src/towingBooking';
import { DriverBookingModel } from '../../../models/src/driverBooking';
import { UserModel } from '../../../models/src/user';
import { TransactionModel } from '../../../models/src/transaction';
import { PaymentTransactionModel } from '../../../models/src/paymentTransaction';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildDateMatch(dateFrom?: string, dateTo?: string) {
  const dateFilter: Record<string, Date> = {};
  if (dateFrom) dateFilter.$gte = new Date(dateFrom);
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    dateFilter.$lte = end;
  }
  return Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};
}

function monthLabel(monthNumber: number) {
  return MONTH_NAMES[Math.max(0, Math.min(11, monthNumber - 1))] ?? `Month ${monthNumber}`;
}

function formatServiceName(type: string): string {
  switch (type) {
    case 'instant': return 'Instant Towing';
    case 'emergency': return 'Emergency Towing';
    case 'scheduled': return 'Scheduled Towing';
    case 'full_time': return 'Full-Time Driver';
    case 'part_time': return 'Part-Time Driver';
    case 'outstation': return 'Outstation Driver';
    case 'night': return 'Night Shift Driver';
    default: return type ? type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ') : 'Other';
  }
}

export const adminReportsService = {
  async getReports(dateFrom?: string, dateTo?: string) {
    const match = buildDateMatch(dateFrom, dateTo);

    const [
      revenueTrend,
      bookingRevenueTrend,
      legacyBookingTrend,
      towingBookingTrend,
      driverBookingTrend,
      vendorGrowth,
      customerGrowth,
      legacyServiceDistribution,
      towingServiceDistribution,
      driverServiceDistribution,
      topVendors,
      legacyCompletionRate,
      towingCompletionRate,
      driverCompletionRate,
      revenueAgg,
      bookingRevenueAgg,
      topDrivers,
      totalDrivers,
      totalVendors,
      totalCustomers,
    ] = await Promise.all([
      TransactionModel.aggregate([
        { $match: { ...match, type: 'PAYMENT', status: 'COMPLETED' } },
        { $group: { _id: { $month: '$createdAt' }, revenue: { $sum: '$amount' } } },
        { $sort: { _id: 1 } },
      ]),
      PaymentTransactionModel.aggregate([
        { $match: { ...match, paymentType: { $in: ['advance', 'final'] }, status: 'success' } },
        { $group: { _id: { $month: '$createdAt' }, revenue: { $sum: '$amount' } } },
        { $sort: { _id: 1 } },
      ]),
      BookingModel.aggregate([
        { $match: match },
        { $group: { _id: { $month: '$createdAt' }, bookings: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      TowingBookingModel.aggregate([
        { $match: match },
        { $group: { _id: { $month: '$createdAt' }, bookings: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      DriverBookingModel.aggregate([
        { $match: match },
        { $group: { _id: { $month: '$createdAt' }, bookings: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      UserModel.aggregate([
        { $match: { ...match, role: 'vendor' } },
        { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      UserModel.aggregate([
        { $match: { ...match, role: 'customer' } },
        { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      BookingModel.aggregate([
        { $match: match },
        { $group: { _id: '$serviceLabel', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
      TowingBookingModel.aggregate([
        { $match: match },
        { $group: { _id: { $ifNull: ['$towingMode', 'instant'] }, count: { $sum: 1 } } },
      ]),
      DriverBookingModel.aggregate([
        { $match: match },
        { $group: { _id: { $ifNull: ['$driverServiceType', 'full_time'] }, count: { $sum: 1 } } },
      ]),
      UserModel.find({ ...match, role: 'vendor' }).sort({ createdAt: -1 }).limit(5).lean(),
      BookingModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $in: ['$status', ['SERVICE_COMPLETED', 'PAID']] }, 1, 0] },
            },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
            revenue: { $sum: '$invoice.total' },
          },
        },
      ]),
      TowingBookingModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $in: ['$status', ['COMPLETED', 'RATED']] }, 1, 0] },
            },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
            revenue: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'FULLY_PAID'] }, '$estimatedFare', '$advanceAmount'],
              },
            },
          },
        },
      ]),
      DriverBookingModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $in: ['$status', ['COMPLETED', 'RATED']] }, 1, 0] },
            },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
            revenue: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'FULLY_PAID'] }, '$estimatedFare', '$advanceAmount'],
              },
            },
          },
        },
      ]),
      TransactionModel.aggregate([
        { $match: { ...match, type: 'PAYMENT', status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      PaymentTransactionModel.aggregate([
        { $match: { ...match, paymentType: { $in: ['advance', 'final'] }, status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      UserModel.find({ role: 'driver' }).sort({ 'driverProfile.totalTrips': -1 }).limit(5).lean(),
      UserModel.countDocuments({ role: 'driver', 'driverProfile.status': 'APPROVED' }),
      UserModel.countDocuments({ ...match, role: 'vendor' }),
      UserModel.countDocuments({ ...match, role: 'customer' }),
    ]);

    // Merge booking trends across all 3 collections
    const monthBookingsMap = new Map<number, number>();
    for (const row of [...legacyBookingTrend, ...towingBookingTrend, ...driverBookingTrend]) {
      if (typeof row._id === 'number') {
        monthBookingsMap.set(row._id, (monthBookingsMap.get(row._id) ?? 0) + row.bookings);
      }
    }
    const combinedBookingTrend = Array.from(monthBookingsMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([month, bookings]) => ({ _id: month, bookings }));

    const monthRevenueMap = new Map<number, number>();
    for (const row of [...revenueTrend, ...bookingRevenueTrend]) {
      if (typeof row._id === 'number') {
        monthRevenueMap.set(row._id, (monthRevenueMap.get(row._id) ?? 0) + row.revenue);
      }
    }
    const combinedRevenueTrend = Array.from(monthRevenueMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([month, revenue]) => ({ _id: month, revenue }));

    // Combined service distribution
    const combinedServiceDistribution = [
      ...towingServiceDistribution.map((row) => ({
        name: formatServiceName(row._id ?? 'instant'),
        value: row.count,
      })),
      ...driverServiceDistribution.map((row) => ({
        name: formatServiceName(row._id ?? 'full_time'),
        value: row.count,
      })),
      ...legacyServiceDistribution.map((row) => ({ name: row._id ?? 'Other', value: row.count })),
    ];

    const lRates = legacyCompletionRate[0] ?? { total: 0, completed: 0, cancelled: 0, revenue: 0 };
    const tRates = towingCompletionRate[0] ?? { total: 0, completed: 0, cancelled: 0, revenue: 0 };
    const dRates = driverCompletionRate[0] ?? { total: 0, completed: 0, cancelled: 0, revenue: 0 };

    const rates = {
      total: (lRates.total ?? 0) + (tRates.total ?? 0) + (dRates.total ?? 0),
      completed: (lRates.completed ?? 0) + (tRates.completed ?? 0) + (dRates.completed ?? 0),
      cancelled: (lRates.cancelled ?? 0) + (tRates.cancelled ?? 0) + (dRates.cancelled ?? 0),
      revenue: (lRates.revenue ?? 0) + (tRates.revenue ?? 0) + (dRates.revenue ?? 0),
    };
    const totalRevenue = (revenueAgg[0]?.total ?? 0) + (bookingRevenueAgg[0]?.total ?? 0);
    const totalBookings = rates.total ?? 0;
    const avgBookingValue = totalBookings ? Math.round((rates.revenue ?? 0) / totalBookings) : 0;
    const newCustomers = customerGrowth.reduce((sum, row) => sum + row.count, 0);
    const avgDriverRating =
      topDrivers.length > 0
        ? topDrivers.reduce((sum, driver) => sum + (driver.driverProfile?.rating ?? 0), 0) / topDrivers.length
        : 0;
    const totalDriverTrips = topDrivers.reduce((sum, driver) => sum + (driver.driverProfile?.totalTrips ?? 0), 0);

    return {
      revenueTrend: combinedRevenueTrend.map((row) => ({
        label: monthLabel(row._id),
        value: row.revenue,
      })),
      bookingTrend: combinedBookingTrend.map((row) => ({
        label: monthLabel(row._id),
        value: row.bookings,
      })),
      vendorGrowth: vendorGrowth.map((row) => ({
        label: monthLabel(row._id),
        value: row.count,
      })),
      customerGrowth: customerGrowth.map((row) => ({
        label: monthLabel(row._id),
        value: row.count,
      })),
      serviceDistribution: combinedServiceDistribution,
      topVendors: topVendors.map((vendor) => ({
        id: vendor._id.toString(),
        name: vendor.vendorProfile?.businessName ?? vendor.vendorProfile?.ownerName ?? vendor.fullName ?? 'Vendor',
        bookings: 0,
        revenue: 0,
      })),
      topDrivers: topDrivers.map((driver) => ({
        id: driver._id.toString(),
        name: driver.fullName ?? 'Driver',
        trips: driver.driverProfile?.totalTrips ?? 0,
        rating: driver.driverProfile?.rating ?? 0,
      })),
      completionRate: totalBookings ? Math.round((rates.completed / totalBookings) * 100) : 0,
      cancellationRate: totalBookings ? Math.round((rates.cancelled / totalBookings) * 100) : 0,
      summary: {
        totalRevenue,
        totalBookings,
        totalVendors,
        totalCustomers,
        totalDrivers,
        completedBookings: rates.completed ?? 0,
        cancelledBookings: rates.cancelled ?? 0,
        avgBookingValue,
        newCustomers,
        avgDriverRating,
        totalDriverTrips,
      },
    };
  },
};
