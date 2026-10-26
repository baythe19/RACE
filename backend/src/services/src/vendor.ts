import { Types } from 'mongoose';
import { AppError, BadRequestError, ConflictError, NotFoundError } from '../../utils/src/errors';
import { notificationService } from './eventNotification';
import { storageService } from '../../storage/src/index';
import { BookingModel } from '../../models/src/booking';
import { TransactionModel } from '../../models/src/transaction';
import { UserModel } from '../../models/src/user';
import { DriverBookingModel } from '../../models/src/driverBooking';
import { TowingBookingModel } from '../../models/src/towingBooking';
import { PaymentTransactionModel } from '../../models/src/paymentTransaction';
import type { VendorBankDetails } from '../../models/src/userProfileSchema';
import { userRepository } from './userRepository';
import { vendorRepository } from './vendorRepository';
import type { IVendor } from '../../models/src/vendor';
import {
  REQUIRED_DOCUMENTS,
  VENDOR_EXEMPT_DOCUMENT_CHECK_TYPES,
  type RegisterVendorDto,
  type ReviewDocumentDto,
  type ReviewVendorDto,
  type SavePayoutAccountDto,
  type SaveVendorDraftDto,
  type UpdateVendorDto,
  type VendorResponseDto,
  type PayoutAccountDto,
  type VendorEarningsDto,
} from './vendorValidator';

async function mapVendor(vendor: IVendor): Promise<VendorResponseDto> {
  const documents = await vendorRepository.findDocuments(vendor.id);
  return {
    id: vendor.id,
    userId: vendor.userId.toString(),
    vendorType: vendor.vendorType,
    status: vendor.status,
    verificationStage: vendor.verificationStage,
    businessName: vendor.businessName,
    ownerName: vendor.ownerName,
    mobileNumber: vendor.mobileNumber,
    email: vendor.email,
    address: vendor.address,
    towVehicle: vendor.towVehicle as VendorResponseDto['towVehicle'],
    bankDetails: vendor.bankDetails as VendorResponseDto['bankDetails'],
    driverProfile: vendor.driverProfile as VendorResponseDto['driverProfile'],
    reviewNotes: vendor.reviewNotes,
    statusHistory: vendor.statusHistory.map((item) => ({
      status: item.status,
      note: item.note,
      changedAt: item.changedAt.toISOString(),
    })),
    documents: documents.map((doc) => ({
      id: doc.id,
      documentType: doc.documentType,
      fileUrl: doc.fileUrl,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      verificationStatus: doc.verificationStatus,
      reviewNotes: doc.reviewNotes,
      uploadedAt: doc.uploadedAt.toISOString(),
    })),
    submittedAt: vendor.submittedAt?.toISOString(),
    approvedAt: vendor.approvedAt?.toISOString(),
    createdAt: vendor.createdAt.toISOString(),
    updatedAt: vendor.updatedAt.toISOString(),
  };
}

async function getServicePaymentTransactions(
  vendorId: Types.ObjectId,
  driverIds: Types.ObjectId[],
) {
  const bookingQuery =
    driverIds.length > 0
      ? { $or: [{ vendorId }, { driverId: { $in: driverIds } }] }
      : { vendorId };
  const [towingBookingIds, driverBookingIds] = await Promise.all([
    TowingBookingModel.find(bookingQuery).distinct('_id').exec(),
    DriverBookingModel.find(bookingQuery).distinct('_id').exec(),
  ]);
  const [towingTransactions, driverTransactions] = await Promise.all([
    PaymentTransactionModel.find({
      bookingType: 'towing',
      bookingId: { $in: towingBookingIds },
      status: 'success',
    }).lean().exec(),
    PaymentTransactionModel.find({
      bookingType: 'driver',
      bookingId: { $in: driverBookingIds },
      status: 'success',
    }).lean().exec(),
  ]);
  return [...towingTransactions, ...driverTransactions];
}

function netServicePayments(
  transactions: Array<{ paymentType: string; amount: number; updatedAt: Date }>,
  from?: Date,
): number {
  return transactions.reduce((total, transaction) => {
    if (from && transaction.updatedAt < from) return total;
    return total + (transaction.paymentType === 'refund' ? -transaction.amount : transaction.amount);
  }, 0);
}

function assertEditable(vendor: IVendor): void {
  if (!['draft', 'changes_requested'].includes(vendor.status)) {
    throw new ConflictError('Application cannot be edited in current status');
  }
}

const VENDOR_IDENTITY_TYPES = ['aadhaar', 'pan', 'driving_license', 'voter_id'];
const VENDOR_BUSINESS_TYPES = [
  'shop_license',
  'gst',
  'msme',
  'commercial_licence',
  'commercial_permit',
];

function validateRequiredDocuments(vendorType: string, documentTypes: string[]): void {
  if (VENDOR_EXEMPT_DOCUMENT_CHECK_TYPES.has(vendorType)) {
    // One identity proof + one business identity proof; any type in each bucket.
    const hasIdentity = documentTypes.some((type) => VENDOR_IDENTITY_TYPES.includes(type));
    const hasBusiness = documentTypes.some((type) => VENDOR_BUSINESS_TYPES.includes(type));
    if (!hasIdentity) {
      throw new AppError('Add at least one identity proof document', 400);
    }
    if (!hasBusiness) {
      throw new AppError('Add at least one business identity proof document', 400);
    }
    return;
  }
  const required = REQUIRED_DOCUMENTS[vendorType] ?? [];
  const missing = required.filter((type) => !documentTypes.includes(type));
  if (missing.length > 0) {
    throw new AppError(`Missing required documents: ${missing.join(', ')}`, 400);
  }
}

export class VendorService {
  async getOrCreateDraft(userId: string, vendorType: SaveVendorDraftDto['vendorType']): Promise<IVendor> {
    const existing = await vendorRepository.findByUserId(userId);
    if (existing) return existing;

    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    return vendorRepository.create({
      userId: userId as unknown as IVendor['userId'],
      vendorType,
      status: 'draft',
      verificationStage: 'submitted',
      ownerName: user.fullName ?? '',
      mobileNumber: user.mobileNumber,
      email: user.email,
      statusHistory: [{ status: 'draft', note: 'Draft created', changedAt: new Date() }],
    });
  }

  async saveDraft(userId: string, dto: SaveVendorDraftDto): Promise<VendorResponseDto> {
    const vendor = await this.getOrCreateDraft(userId, dto.vendorType);
    assertEditable(vendor);

    const updated = await vendorRepository.updateById(vendor.id, {
      vendorType: dto.vendorType,
      businessName: dto.businessName,
      ownerName: dto.ownerName,
      mobileNumber: dto.mobileNumber,
      email: dto.email,
      address: dto.address,
      towVehicle: dto.towVehicle,
      bankDetails: dto.bankDetails,
      driverProfile: dto.driverProfile,
      status: 'draft',
    });

    if (!updated) throw new NotFoundError('Vendor not found');

    if (dto.documents?.length) {
      await vendorRepository.replaceDocuments(updated.id, dto.documents);
    }

    return mapVendor(updated);
  }

  async update(userId: string, dto: UpdateVendorDto): Promise<VendorResponseDto> {
    const vendor = await vendorRepository.findByUserId(userId);
    if (!vendor) throw new NotFoundError('No vendor application found');
    assertEditable(vendor);

    const updated = await vendorRepository.updateById(vendor.id, {
      businessName: dto.businessName,
      ownerName: dto.ownerName,
      mobileNumber: dto.mobileNumber,
      email: dto.email,
      address: dto.address,
      towVehicle: dto.towVehicle,
      bankDetails: dto.bankDetails,
      driverProfile: dto.driverProfile,
    });

    if (!updated) throw new NotFoundError('Vendor not found');

    if (dto.documents?.length) {
      await vendorRepository.replaceDocuments(updated.id, dto.documents);
    }

    return mapVendor(updated);
  }

  async uploadDocument(
    userId: string,
    documentType: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<VendorResponseDto> {
    const vendor = await vendorRepository.findByUserId(userId);
    if (!vendor) throw new NotFoundError('No vendor application found');
    assertEditable(vendor);

    const upload = await storageService.uploadVendorDocument({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
      vendorType: vendor.vendorType,
      documentType,
    });

    await vendorRepository.upsertDocument(vendor.id, documentType, {
      fileUrl: upload.fileUrl,
      fileName: upload.fileName,
      mimeType: file.mimetype,
      verificationStatus: 'pending',
    });

    const refreshed = await vendorRepository.findById(vendor.id);
    if (!refreshed) throw new NotFoundError('Vendor not found');
    return mapVendor(refreshed);
  }

  async uploadSelfie(
    userId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<VendorResponseDto> {
    return this.uploadDocument(userId, 'selfie', file);
  }

  async register(userId: string, dto: RegisterVendorDto): Promise<VendorResponseDto> {
    const existing = await vendorRepository.findByUserId(userId);
    if (existing && !['draft', 'changes_requested'].includes(existing.status)) {
      throw new ConflictError('Vendor application already submitted');
    }

    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    let vendor = existing;
    if (!vendor) {
      vendor = await vendorRepository.create({
        userId,
        vendorType: dto.vendorType,
        status: 'draft',
        verificationStage: 'submitted',
        ownerName: user.fullName ?? '',
        mobileNumber: user.mobileNumber,
        email: user.email,
        statusHistory: [],
      });
    }

    const payload = {
      vendorType: dto.vendorType,
      businessName: dto.businessName,
      ownerName: dto.ownerName,
      mobileNumber: dto.mobileNumber,
      email: dto.email,
      address: dto.address,
      towVehicle: dto.towVehicle,
      bankDetails: dto.bankDetails,
      driverProfile: dto.driverProfile,
      status: 'pending' as const,
      verificationStage: 'document_review' as const,
      submittedAt: new Date(),
      statusHistory: [
        ...vendor.statusHistory,
        { status: 'pending' as const, note: 'Application submitted', changedAt: new Date() },
        {
          status: 'document_review' as const,
          note: 'Documents queued for review',
          changedAt: new Date(),
        },
      ],
    };

    vendor = (await vendorRepository.updateById(vendor.id, payload))!;

    await userRepository.updateById(userId, {
      role: 'vendor',
      isProfileCompleted: true,
      fullName: dto.ownerName ?? user.fullName,
      email: dto.email ?? user.email,
    });

    if (dto.documents?.length) {
      await vendorRepository.replaceDocuments(vendor.id, dto.documents);
    }

    // Production: enforce required docs. Demo / local: allow submit without uploads.
    if (process.env.NODE_ENV === 'production') {
      const docs = await vendorRepository.findDocuments(vendor.id);
      validateRequiredDocuments(
        dto.vendorType,
        docs.map((d) => d.documentType),
      );
    }

    await notificationService.notifyVendorSubmitted(userId, dto.mobileNumber, vendor.id);

    return mapVendor(vendor);
  }

  async getProfile(userId: string): Promise<VendorResponseDto> {
    return this.getStatus(userId);
  }

  async getStatus(userId: string): Promise<VendorResponseDto> {
    const vendor = await vendorRepository.findByUserId(userId);
    if (!vendor) throw new NotFoundError('No vendor application found');
    return mapVendor(vendor);
  }

  async listForAdmin(filters: {
    status?: string;
    verificationStage?: string;
  }): Promise<VendorResponseDto[]> {
    const vendors = await vendorRepository.findAll({
      status: filters.status as IVendor['status'] | undefined,
      verificationStage: filters.verificationStage,
    });
    return Promise.all(vendors.map((v) => mapVendor(v)));
  }

  async getByIdForAdmin(vendorId: string): Promise<VendorResponseDto> {
    const vendor = await vendorRepository.findById(vendorId);
    if (!vendor) throw new NotFoundError('Vendor not found');
    return mapVendor(vendor);
  }

  async approve(vendorId: string, reviewNotes?: string): Promise<VendorResponseDto> {
    return this.review(vendorId, {
      status: 'approved',
      reviewNotes,
      verificationStage: 'approved',
    });
  }

  async reject(vendorId: string, reviewNotes?: string): Promise<VendorResponseDto> {
    return this.review(vendorId, {
      status: 'rejected',
      reviewNotes,
      verificationStage: 'rejected',
    });
  }

  async requestResubmission(vendorId: string, reviewNotes?: string): Promise<VendorResponseDto> {
    return this.review(vendorId, {
      status: 'changes_requested',
      reviewNotes,
      verificationStage: 'document_review',
    });
  }

  async review(vendorId: string, dto: ReviewVendorDto): Promise<VendorResponseDto> {
    let vendor = await vendorRepository.findById(vendorId);
    if (!vendor) throw new NotFoundError('Vendor not found');

    if (dto.status === 'approved') {
      const approvedAt = new Date();
      await userRepository.updateById(vendor.userId.toString(), { role: 'vendor' });
      await notificationService.notifyVendorApproved(
        vendor.userId.toString(),
        vendor.mobileNumber,
        vendor.id,
      );
      vendor = (await vendorRepository.updateById(vendor.id, {
        status: 'approved',
        approvedAt,
        verificationStage: 'approved',
        reviewNotes: dto.reviewNotes,
        statusHistory: [
          ...vendor.statusHistory,
          {
            status: dto.verificationStage ?? dto.status,
            note: dto.reviewNotes,
            changedAt: new Date(),
          },
        ],
      }))!;
    } else if (dto.status === 'rejected') {
      await notificationService.notifyVendorRejected(
        vendor.userId.toString(),
        vendor.mobileNumber,
        vendor.id,
        dto.reviewNotes,
      );
      vendor = (await vendorRepository.updateById(vendor.id, {
        status: 'rejected',
        verificationStage: 'rejected',
        reviewNotes: dto.reviewNotes,
        statusHistory: [
          ...vendor.statusHistory,
          {
            status: dto.verificationStage ?? dto.status,
            note: dto.reviewNotes,
            changedAt: new Date(),
          },
        ],
      }))!;
    } else {
      await notificationService.notifyResubmissionRequired(
        vendor.userId.toString(),
        vendor.mobileNumber,
        vendor.id,
        dto.reviewNotes,
      );
      vendor = (await vendorRepository.updateById(vendor.id, {
        status: 'changes_requested',
        verificationStage: dto.verificationStage ?? 'document_review',
        reviewNotes: dto.reviewNotes,
        statusHistory: [
          ...vendor.statusHistory,
          {
            status: dto.verificationStage ?? dto.status,
            note: dto.reviewNotes,
            changedAt: new Date(),
          },
        ],
      }))!;
    }

    if (!vendor) throw new NotFoundError('Vendor not found');
    return mapVendor(vendor);
  }

  async reviewDocument(
    vendorId: string,
    documentType: string,
    dto: ReviewDocumentDto,
  ): Promise<VendorResponseDto> {
    const vendor = await vendorRepository.findById(vendorId);
    if (!vendor) throw new NotFoundError('Vendor not found');

    const doc = await vendorRepository.updateDocumentStatus(
      vendorId,
      documentType,
      dto.verificationStatus,
      dto.reviewNotes,
    );
    if (!doc) throw new NotFoundError('Document not found');

    if (dto.verificationStatus === 'approved') {
      await notificationService.send({
        userId: vendor.userId.toString(),
        mobileNumber: vendor.mobileNumber,
        vendorId: vendor.id,
        event: 'vendor_documents_approved',
        title: 'Document Approved',
        body: `Your ${documentType.replace(/_/g, ' ')} document has been approved.`,
      });
    } else if (
      dto.verificationStatus === 'rejected' ||
      dto.verificationStatus === 'resubmission_required'
    ) {
      await notificationService.send({
        userId: vendor.userId.toString(),
        mobileNumber: vendor.mobileNumber,
        vendorId: vendor.id,
        event: 'vendor_documents_rejected',
        title: 'Document Review',
        body: dto.reviewNotes ?? `Please re-upload your ${documentType.replace(/_/g, ' ')} document.`,
      });
    }

    return mapVendor(vendor);
  }

  async getDashboardStats(userId: string): Promise<{
    jobsToday: number;
    earningsToday: number;
    earningsTotal: number;
  }> {
    const user = await UserModel.findById(userId);
    if (!user?.vendorProfile) throw new NotFoundError('Vendor not found');

    const driverUsers = await UserModel.find({
      role: 'driver',
      'driverProfile.vendorUserId': user._id,
    })
      .select('_id')
      .lean();
    const driverIds = driverUsers.map((driver) => driver._id.toString());
    const driverObjectIds = driverUsers.map((driver) => driver._id);

    const bookingQuery =
      driverIds.length > 0
        ? { $or: [{ vendorId: user._id }, { 'driver.id': { $in: driverIds } }] }
        : { vendorId: user._id };
    const serviceBookingQuery =
      driverObjectIds.length > 0
        ? { $or: [{ vendorId: user._id }, { driverId: { $in: driverObjectIds } }] }
        : { vendorId: user._id };

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [jobsToday, serviceJobsToday, earningsTodayAgg, earningsTotalAgg, serviceTransactions] = await Promise.all([
      BookingModel.countDocuments({ ...bookingQuery, createdAt: { $gte: startOfDay } }),
      Promise.all([
        TowingBookingModel.countDocuments({ ...serviceBookingQuery, createdAt: { $gte: startOfDay } }),
        DriverBookingModel.countDocuments({ ...serviceBookingQuery, createdAt: { $gte: startOfDay } }),
      ]).then((counts) => counts.reduce((sum, count) => sum + count, 0)),
      TransactionModel.aggregate([
        {
          $match: {
            vendorId: user._id,
            type: 'PAYMENT',
            status: 'COMPLETED',
            createdAt: { $gte: startOfDay },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      TransactionModel.aggregate([
        {
          $match: {
            vendorId: user._id,
            type: 'PAYMENT',
            status: 'COMPLETED',
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      getServicePaymentTransactions(user._id, driverObjectIds),
    ]);

    return {
      jobsToday: jobsToday + serviceJobsToday,
      earningsToday: (earningsTodayAgg[0]?.total ?? 0) + netServicePayments(serviceTransactions, startOfDay),
      earningsTotal: (earningsTotalAgg[0]?.total ?? 0) + netServicePayments(serviceTransactions),
    };
  }

  /**
   * Save (upsert) the partner's (vendor or independent driver) payout account on the user profile.
   * Real validation happens in savePayoutAccountSchema; verification is a
   * separate step — saving alone never marks the channel verified.
   */
  async savePayoutAccount(
    userId: string,
    dto: SavePayoutAccountDto,
  ): Promise<PayoutAccountDto> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const now = new Date();
    const isDriver = user.role === 'driver';
    const existing = isDriver ? user.driverProfile?.bankDetails : user.vendorProfile?.bankDetails;
    const accountNumber =
      dto.payoutMethod === 'bank'
        ? dto.bank?.accountNumber ??
          (existing && (existing.payoutMethod ?? 'bank') === 'bank' ? existing.accountNumber : undefined)
        : undefined;
    if (dto.payoutMethod === 'bank' && !accountNumber) {
      throw new BadRequestError('Bank account number is required for a new payout account');
    }
    const isSameAccount =
      existing &&
      dto.payoutMethod === (existing.payoutMethod ?? 'bank') &&
      dto.accountHolderName === existing.accountHolderName &&
      (dto.payoutMethod === 'upi'
        ? dto.upi?.upiId === existing.upiId
        : accountNumber === existing.accountNumber && dto.bank?.ifsc === existing.ifsc);
    // Re-verification only required when the destination account changes.
    const keepVerified = Boolean(isSameAccount && existing?.isVerified);

    const bankDetails: VendorBankDetails = {
      accountHolderName: dto.accountHolderName,
      payoutMethod: dto.payoutMethod,
      isVerified: keepVerified,
      verifiedAt: keepVerified ? existing?.verifiedAt : undefined,
      source: isDriver ? 'driver_app' : 'vendor_app',
      updatedAt: now,
    };
    if (dto.payoutMethod === 'bank' && dto.bank) {
      bankDetails.accountNumber = accountNumber;
      bankDetails.ifsc = dto.bank.ifsc;
      bankDetails.bankName = dto.bank.bankName;
    }
    if (dto.payoutMethod === 'upi' && dto.upi) {
      bankDetails.upiId = dto.upi.upiId;
    }

    if (isDriver) {
      await userRepository.updateById(userId, {
        driverProfile: { ...user.driverProfile, bankDetails } as NonNullable<typeof user.driverProfile>,
      });
    } else {
      await userRepository.updateById(userId, {
        vendorProfile: { ...user.vendorProfile, bankDetails } as NonNullable<typeof user.vendorProfile>,
      });
    }
    return this.getPayoutAccount(userId);
  }

  async getPayoutAccount(userId: string): Promise<PayoutAccountDto> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    const bank = user.role === 'driver' ? user.driverProfile?.bankDetails : user.vendorProfile?.bankDetails;
    if (!bank || (!bank.accountNumber && !bank.upiId)) {
      throw new NotFoundError('No payout account saved yet');
    }
    const digits = bank.accountNumber ?? '';
    return {
      payoutMethod: bank.payoutMethod ?? 'bank',
      accountHolderName: bank.accountHolderName ?? user.fullName ?? '',
      accountNumberMasked: digits ? `${'*'.repeat(Math.max(digits.length - 4, 0))}${digits.slice(-4)}` : undefined,
      ifsc: bank.ifsc,
      bankName: bank.bankName,
      upiId: bank.upiId,
      isVerified: Boolean(bank.isVerified),
      verifiedAt: bank.verifiedAt?.toISOString(),
      updatedAt: bank.updatedAt?.toISOString(),
    };
  }

  async getEarningsHistory(userId: string): Promise<VendorEarningsDto> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const driverIds = (
      await UserModel.find({ role: 'driver', 'driverProfile.vendorUserId': user._id })
        .select('_id')
        .lean()
        .exec()
    ).map((driver) => driver._id);

    const vendorMatch = driverIds.length > 0
      ? { $or: [{ vendorId: user._id }, { driverId: { $in: driverIds } }] }
      : { vendorId: user._id };

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const sum = async (match: Record<string, unknown>): Promise<number> => {
      const rows = await TransactionModel.aggregate([
        { $match: { ...vendorMatch, type: 'PAYMENT', status: 'COMPLETED', ...match } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      return rows[0]?.total ?? 0;
    };

    const [today, week, month, allTime, payoutsRows, dailyRows, serviceTransactions] = await Promise.all([
      sum({ createdAt: { $gte: startOfToday } }),
      sum({ createdAt: { $gte: weekAgo } }),
      sum({ createdAt: { $gte: monthAgo } }),
      sum({}),
      TransactionModel.find({ ...vendorMatch, type: 'VENDOR_PAYOUT' })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
        .exec(),
      TransactionModel.aggregate([
        { $match: { ...vendorMatch, type: 'PAYMENT', status: 'COMPLETED', createdAt: { $gte: weekAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            amount: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      getServicePaymentTransactions(user._id, driverIds),
    ]);

    const dailyTotals = new Map<string, number>(
      dailyRows.map((row) => [row._id, row.amount]),
    );
    for (const transaction of serviceTransactions) {
      if (transaction.updatedAt < weekAgo) continue;
      const date = transaction.updatedAt.toISOString().slice(0, 10);
      const amount = transaction.paymentType === 'refund' ? -transaction.amount : transaction.amount;
      dailyTotals.set(date, (dailyTotals.get(date) ?? 0) + amount);
    }

    return {
      currency: 'INR',
      totals: {
        today: today + netServicePayments(serviceTransactions, startOfToday),
        week: week + netServicePayments(serviceTransactions, weekAgo),
        month: month + netServicePayments(serviceTransactions, monthAgo),
        allTime: allTime + netServicePayments(serviceTransactions),
      },
      payouts: payoutsRows.map((row) => ({
        id: row._id?.toString() ?? '',
        amount: row.amount,
        status: row.status,
        paidAt: row.createdAt.toISOString(),
        description: row.description,
      })),
      dailyEarnings: [...dailyTotals]
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([date, amount]) => ({ date, amount })),
    };
  }
}

export const vendorService = new VendorService();
