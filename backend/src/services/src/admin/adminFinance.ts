import { Types } from 'mongoose';
import { PaymentTransactionModel } from '../../../models/src/paymentTransaction';
import { TransactionModel } from '../../../models/src/transaction';
import { escapeRegex } from './pagination';

type FinanceFilters = Record<string, string | number | undefined>;

function dateRange(filters: FinanceFilters): Record<string, Date> | undefined {
  const range: Record<string, Date> = {};
  if (filters.dateFrom) {
    const from = new Date(String(filters.dateFrom));
    if (Number.isFinite(from.getTime())) range.$gte = from;
  }
  if (filters.dateTo) {
    const to = new Date(String(filters.dateTo));
    if (Number.isFinite(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      range.$lte = to;
    }
  }
  return Object.keys(range).length ? range : undefined;
}

function normalizeStatus(status: string | number | undefined): string | undefined {
  const value = String(status ?? '').toUpperCase();
  return !value || value === 'ALL' ? undefined : value;
}

function mapPaymentStatus(status: string): string {
  if (status === 'success') return 'COMPLETED';
  if (status === 'initiated') return 'PENDING';
  return 'FAILED';
}

function toLegacyTransaction(doc: Record<string, any>) {
  const createdAt = new Date(doc.createdAt);
  return {
    id: String(doc._id),
    transactionId: doc.transactionCode,
    type: doc.type,
    status: doc.status,
    amount: doc.amount,
    currency: doc.currency,
    description: doc.description ?? '',
    reference: doc.reference ?? '',
    date: createdAt.toISOString(),
    from: doc.customerId ? String(doc.customerId) : "N/A",
    to: doc.vendorId ? String(doc.vendorId) : "N/A",
  };
}

function toBookingPayment(doc: Record<string, any>) {
  const id = String(doc._id);
  const gatewayReferenceId = doc.gatewayReferenceId as string | undefined;
  const paymentLabel = doc.paymentType === 'refund' ? 'refund' : `${doc.paymentType} payment`;
  return {
    id,
    transactionId: gatewayReferenceId || `BOOKING-${id.slice(-8).toUpperCase()}`,
    type: doc.paymentType === 'refund' ? 'REFUND' : 'PAYMENT',
    status: mapPaymentStatus(doc.status),
    amount: doc.amount,
    currency: 'INR',
    description: doc.note ?? `${paymentLabel} for ${doc.bookingType} booking`,
    reference: gatewayReferenceId || String(doc.bookingId),
    date: new Date(doc.createdAt).toISOString(),
    from: String(doc.customerId),
    to: `${doc.bookingType} booking ${String(doc.bookingId)}`,
  };
}

function byNewestFirst(a: { date: string; id: string }, b: { date: string; id: string }) {
  const timeDifference = new Date(b.date).getTime() - new Date(a.date).getTime();
  return timeDifference || b.id.localeCompare(a.id);
}

export const adminFinanceService = {
  async listTransactions(filters: FinanceFilters) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 10));
    const offset = (page - 1) * pageSize;
    const candidateLimit = offset + pageSize;
    const type = String(filters.type ?? '').toUpperCase();
    const status = normalizeStatus(filters.status);
    const dates = dateRange(filters);
    const createdAt = dates ? { createdAt: dates } : {};

    const legacyQuery: Record<string, unknown> = { ...createdAt };
    const paymentQuery: Record<string, unknown> = { ...createdAt };

    if (type && type !== 'ALL') {
      legacyQuery.type = type;
      if (type === 'PAYMENT') paymentQuery.paymentType = { $in: ['advance', 'final'] };
      else if (type === 'REFUND') paymentQuery.paymentType = 'refund';
      else paymentQuery._id = { $exists: false };
    }
    if (status) {
      legacyQuery.status = status;
      const mappedStatus =
        status === 'COMPLETED' ? 'success' :
        status === 'PENDING' ? 'initiated' :
        status === 'FAILED' ? 'failed' : undefined;
      if (mappedStatus) paymentQuery.status = mappedStatus;
      else paymentQuery._id = { $exists: false };
    }

    if (filters.search) {
      const regex = new RegExp(escapeRegex(String(filters.search)), 'i');
      legacyQuery.$or = [
        { transactionCode: regex },
        { reference: regex },
        { description: regex },
      ];
      const paymentSearch: Record<string, unknown>[] = [
        { gatewayReferenceId: regex },
        { note: regex },
      ];
      const searchValue = String(filters.search).trim();
      if (Types.ObjectId.isValid(searchValue)) {
        const objectId = new Types.ObjectId(searchValue);
        paymentSearch.push({ bookingId: objectId }, { customerId: objectId }, { _id: objectId });
      }
      paymentQuery.$or = paymentSearch;
    }

    const includeBookingPayments = type === '' || type === 'ALL' || type === 'PAYMENT' || type === 'REFUND';
    const [legacyTotal, paymentTotal, legacyDocs, paymentDocs] = await Promise.all([
      TransactionModel.countDocuments(legacyQuery),
      includeBookingPayments ? PaymentTransactionModel.countDocuments(paymentQuery) : Promise.resolve(0),
      TransactionModel.find(legacyQuery)
        .sort({ createdAt: -1, _id: -1 })
        .limit(candidateLimit)
        .lean(),
      includeBookingPayments
        ? PaymentTransactionModel.find(paymentQuery)
            .sort({ createdAt: -1, _id: -1 })
            .limit(candidateLimit)
            .lean()
        : Promise.resolve([]),
    ]);

    const items = [
      ...legacyDocs.map((doc) => toLegacyTransaction(doc as Record<string, any>)),
      ...paymentDocs.map((doc) => toBookingPayment(doc as Record<string, any>)),
    ]
      .sort(byNewestFirst)
      .slice(offset, offset + pageSize);

    return {
      items,
      total: legacyTotal + paymentTotal,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil((legacyTotal + paymentTotal) / pageSize)),
    };
  },

  async getSummary() {
    const [legacyRevenue, bookingRevenue, legacyCommission, legacyRefunds, bookingRefunds, payouts, pending] =
      await Promise.all([
        TransactionModel.aggregate([
          { $match: { type: 'PAYMENT', status: 'COMPLETED' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        PaymentTransactionModel.aggregate([
          { $match: { paymentType: { $in: ['advance', 'final'] }, status: 'success' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        TransactionModel.aggregate([
          { $match: { type: 'COMMISSION', status: 'COMPLETED' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        TransactionModel.aggregate([
          { $match: { type: 'REFUND', status: 'COMPLETED' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        PaymentTransactionModel.aggregate([
          {
            $match: {
              paymentType: 'refund',
              status: { $in: ['success', 'initiated', 'pending', 'processing'] },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        TransactionModel.aggregate([
          { $match: { type: 'VENDOR_PAYOUT', status: 'COMPLETED' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        TransactionModel.aggregate([
          { $match: { type: 'VENDOR_PAYOUT', status: 'PENDING' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

    return {
      totalRevenue: (legacyRevenue[0]?.total ?? 0) + (bookingRevenue[0]?.total ?? 0),
      totalCommission: legacyCommission[0]?.total ?? 0,
      totalRefunds: (legacyRefunds[0]?.total ?? 0) + (bookingRefunds[0]?.total ?? 0),
      totalPayouts: payouts[0]?.total ?? 0,
      pendingPayouts: pending[0]?.total ?? 0,
    };
  },
};
