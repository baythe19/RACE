import { Types } from 'mongoose';

import { UserModel } from '../../../models/src/user';
import { driverRepository } from '../driverRepository';
import { vendorRepository } from '../vendorRepository';
import { BookingModel } from '../../../models/src/booking';
import { DriverBookingModel } from '../../../models/src/driverBooking';
import { TowingBookingModel } from '../../../models/src/towingBooking';
import { TransactionModel } from '../../../models/src/transaction';
import { VendorVehicleModel } from '../../../models/src/vendorVehicle';
import { VendorDocumentModel } from '../../../models/src/vendorDocument';
import { escapeRegex, paginate } from './pagination';
import { logActivity } from './activityLogger';
import { createNotification } from './notificationService';
import { getEntityActivities } from './entityActivities';
import {
  driverInitials,
  formatInr,
  buildVendorDocuments,
  deriveDocumentsStatus,
  mapVendorTypeLabel,
  mapVerificationStage,
  mapVerificationStageLabel,
} from './responseMappers';
import {
  mapVendorFilterToUserQuery,
  toVendorRecord,
} from '../userProfileMappers';
import { vendorDriversService } from '../vendorDrivers';
import type { CreateVendorDriverDto } from '../vendorDriversValidator';
import { notificationService } from '../eventNotification';
import { BadRequestError, ConflictError, NotFoundError } from '../../../utils/src/errors';
import type { IUser } from '../../../models/src/user';
import { REQUIRED_DOCUMENTS } from '../vendorValidator';

function mapAdminVendorStatus(status?: string): string {
  switch (String(status ?? 'PENDING').toUpperCase()) {
    case 'APPROVED':
      return 'approved';
    case 'REJECTED':
      return 'rejected';
    case 'SUSPENDED':
      return 'changes_requested';
    default:
      return 'pending';
  }
}

function mapAssignedDriverStatus(status: string): 'ACTIVE' | 'ON_LEAVE' {
  if (status === 'SUSPENDED') return 'ON_LEAVE';
  return 'ACTIVE';
}

function mapDriverCard(d: { _id: { toString(): string }; fullName?: string; mobileNumber: string; driverProfile?: { status?: string; fleetSource?: string } }) {
  return {
    id: d._id.toString(),
    name: d.fullName ?? 'Driver',
    phone: d.mobileNumber,
    status: mapAssignedDriverStatus(d.driverProfile?.status ?? 'PENDING'),
    initials: driverInitials(d.fullName ?? 'Driver'),
  };
}

function isAdminAssignedDriver(driver: { driverProfile?: { fleetSource?: string } }): boolean {
  return driver.driverProfile?.fleetSource === 'admin';
}

function isVendorFleetDriver(driver: { driverProfile?: { fleetSource?: string } }): boolean {
  const source = driver.driverProfile?.fleetSource;
  return !source || source === 'vendor';
}

function mapVendorStatus(status: string): string {
  if (status === 'approved') return 'APPROVED';
  if (status === 'rejected') return 'REJECTED';
  if (status === 'suspended') return 'SUSPENDED';
  return 'PENDING';
}

const VENDOR_DOCUMENT_LABELS: Record<string, string> = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  gst: 'GST Certificate',
  shop_license: 'Shop License',
  msme: 'MSME Certificate',
  cancelled_cheque: 'Cancelled Cheque',
  commercial_licence: 'Commercial Licence',
  driving_license: 'Driving License',
  police_verification: 'Police Verification',
  medical_certificate: 'Medical Fitness Certificate',
  vehicle_insurance: 'Vehicle Insurance',
  fitness_certificate: 'Fitness Certificate',
  puc: 'PUC Certificate',
  commercial_permit: 'Commercial Permit',
  selfie: 'Selfie',
  vehicle_photo: 'Vehicle Photo',
  other: 'Other Document',
};

const VENDOR_DOCUMENT_ALIASES: Record<string, string> = {
  'business-reg': 'shop_license',
  bank: 'cancelled_cheque',
  insurance: 'vehicle_insurance',
  dl: 'driving_license',
};

function mapStoredVendorDocument(document: {
  _id: { toString(): string };
  documentType: string;
  verificationStatus: string;
  uploadedAt: Date;
}, vendorId: string) {
  const status =
    document.verificationStatus === 'approved'
      ? 'VERIFIED'
      : document.verificationStatus === 'rejected'
        ? 'REJECTED'
        : 'PENDING';
  return {
    id: document._id.toString(),
    key: document.documentType,
    name: VENDOR_DOCUMENT_LABELS[document.documentType] ?? document.documentType.replace(/_/g, ' '),
    status,
    url: '/admin/documents/vendor/' + vendorId + '/' + document.documentType,
    uploadedAt: document.uploadedAt.toISOString(),
  };
}

function deriveVendorCity(user: IUser, address?: string) {
  if (user.address?.city?.trim()) return user.address.city.trim();
  if (!address?.trim()) return '—';
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return '—';
  // Strip PIN codes from the trailing segment ("Odisha 751007" → "Odisha").
  const cleaned = parts.map((part) => part.replace(/\s*\d{6}\s*$/, '').trim()).filter(Boolean);
  if (cleaned.length === 0) return '—';
  // The trailing segment is often the state ("…, Odisha") — prefer the
  // segment before it when it looks like a state name.
  const STATE_NAMES = new Set([
    'odisha', 'orissa', 'madhya pradesh', 'mp', 'maharashtra', 'delhi',
    'west bengal', 'bihar', 'jharkhand', 'uttar pradesh', 'up', 'rajasthan',
    'gujarat', 'karnataka', 'tamil nadu', 'telangana', 'andhra pradesh',
    'kerala', 'punjab', 'haryana', 'assam', 'chhattisgarh', 'uk', 'goa',
  ]);
  const last = cleaned[cleaned.length - 1];
  if (cleaned.length >= 2 && STATE_NAMES.has(last.toLowerCase())) {
    return cleaned[cleaned.length - 2];
  }
  return last;
}

function mapVendorFromUser(user: IUser) {
  const vendor = toVendorRecord(user);
  const city = deriveVendorCity(user, vendor.address);
  const status = mapVendorStatus(vendor.status);
  const documents = buildVendorDocuments(vendor);
  return {
    id: vendor.id,
    businessName: vendor.businessName ?? vendor.ownerName ?? 'Vendor',
    ownerName: vendor.ownerName ?? '—',
    phone: vendor.mobileNumber,
    email: vendor.email ?? '',
    location: vendor.address ?? city,
    city,
    vehicleCount: 0,
    driverCount: 0,
    rating: 0,
    reviewCount: 0,
    status,
    verificationStatus: mapVerificationStage(vendor.verificationStage, vendor.status),
    documentsStatus: deriveDocumentsStatus(documents),
  };
}

export const adminVendorsService = {
  async list(filters: Record<string, string | number | undefined>) {
    const query: Record<string, unknown> = {};
    if (filters.status && filters.status !== 'ALL') {
      const statusMap: Record<string, string> = {
        APPROVED: 'approved',
        PENDING: 'pending',
        REJECTED: 'rejected',
        SUSPENDED: 'changes_requested',
      };
      query.status = statusMap[String(filters.status)] ?? String(filters.status).toLowerCase();
    }
    if (filters.search) {
      const regex = new RegExp(escapeRegex(String(filters.search)), 'i');
      query.$or = [{ businessName: regex }, { ownerName: regex }, { mobileNumber: regex }, { email: regex }];
    }
    if (filters.verification && filters.verification !== 'ALL') {
      if (filters.verification === 'VERIFIED') {
        query.verificationStage = 'approved';
        query.status = 'approved';
      } else if (filters.verification === 'REJECTED') {
        query.$or = [{ verificationStage: 'rejected' }, { status: 'rejected' }];
      } else {
        query.status = { $in: ['pending', 'under_review'] };
        query.verificationStage = { $nin: ['approved', 'rejected'] };
      }
    }

    const userQuery = mapVendorFilterToUserQuery(query);
    const result = await paginate(UserModel, userQuery, filters as never, (doc) =>
      mapVendorFromUser(doc as IUser),
    );

    const vendorIds = result.items.map((v) => new Types.ObjectId(v.id));
    const [driverCounts, vehicleCounts, revenueAgg] = await Promise.all([
      UserModel.aggregate([
        { $match: { role: 'driver', 'driverProfile.vendorUserId': { $in: vendorIds } } },
        { $group: { _id: '$driverProfile.vendorUserId', count: { $sum: 1 } } },
      ]),
      VendorVehicleModel.aggregate([
        { $match: { vendorId: { $in: vendorIds } } },
        { $group: { _id: '$vendorId', count: { $sum: 1 } } },
      ]),
      TransactionModel.aggregate([
        { $match: { vendorId: { $in: vendorIds }, type: 'PAYMENT', status: 'COMPLETED' } },
        { $group: { _id: '$vendorId', total: { $sum: '$amount' } } },
      ]),
    ]);
    const storedDocuments = await VendorDocumentModel.find({ vendorId: { $in: vendorIds } })
      .select('vendorId verificationStatus')
      .lean()
      .exec();
    const documentStatuses = new Map<string, string[]>();
    for (const document of storedDocuments) {
      const key = document.vendorId.toString();
      const statuses = documentStatuses.get(key) ?? [];
      statuses.push(
        document.verificationStatus === 'approved'
          ? 'VERIFIED'
          : document.verificationStatus === 'rejected'
            ? 'REJECTED'
            : 'PENDING',
      );
      documentStatuses.set(key, statuses);
    }
    const driverMap = new Map(driverCounts.map((d) => [d._id.toString(), d.count]));
    const vehicleMap = new Map(vehicleCounts.map((d) => [d._id.toString(), d.count]));
    const revenueMap = new Map(revenueAgg.map((d) => [d._id.toString(), d.total]));

    return {
      ...result,
      items: result.items.map((v) => ({
        ...v,
        driverCount: driverMap.get(v.id) ?? 0,
        vehicleCount: vehicleMap.get(v.id) ?? (v.vehicleCount || 0),
        totalRevenue: revenueMap.get(v.id) ?? 0,
        documentsStatus: deriveDocumentsStatus(
          (documentStatuses.get(v.id) ?? []).map((status) => ({ status })),
        ),
      })),
    };
  },

  async getById(id: string) {
    const user = await UserModel.findOne({ _id: id, role: 'vendor' });
    if (!user?.vendorProfile) throw new NotFoundError('Vendor not found');
    const vendor = toVendorRecord(user);
    const base = mapVendorFromUser(user);
    const driverUsers = await UserModel.find({ role: 'driver', 'driverProfile.vendorUserId': user._id }).lean();
    const driverIds = driverUsers.map((d) => d._id.toString());
    const driverObjectIds = driverUsers.map((d) => d._id);

    const bookingQuery =
      driverIds.length > 0
        ? { $or: [{ vendorId: user._id }, { 'driver.id': { $in: driverIds } }] }
        : { vendorId: user._id };
    const serviceBookingQuery =
      driverObjectIds.length > 0
        ? { $or: [{ vendorId: user._id }, { driverId: { $in: driverObjectIds } }] }
        : { vendorId: user._id };

    const [
      vehicles,
      bookings,
      towingBookings,
      driverBookings,
      activities,
      revenueAgg,
      bookingCount,
      towingBookingCount,
      driverBookingCount,
      towingRevenueAgg,
      driverRevenueAgg,
      storedDocuments,
    ] = await Promise.all([
      VendorVehicleModel.find({ vendorId: user._id }).lean(),
      BookingModel.find(bookingQuery).sort({ createdAt: -1 }).limit(10).lean(),
      TowingBookingModel.find(serviceBookingQuery).sort({ createdAt: -1 }).limit(10).lean(),
      DriverBookingModel.find(serviceBookingQuery).sort({ createdAt: -1 }).limit(10).lean(),
      getEntityActivities('vendor', id),
      TransactionModel.aggregate([
        { $match: { vendorId: user._id, type: 'PAYMENT', status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      BookingModel.countDocuments(bookingQuery),
      TowingBookingModel.countDocuments(serviceBookingQuery),
      DriverBookingModel.countDocuments(serviceBookingQuery),
      TowingBookingModel.aggregate([
        {
          $match: {
            ...serviceBookingQuery,
            status: { $in: ['COMPLETED', 'RATED'] },
            paymentStatus: 'FULLY_PAID',
          },
        },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$finalFare', '$estimatedFare'] } } } },
      ]),
      DriverBookingModel.aggregate([
        {
          $match: {
            ...serviceBookingQuery,
            status: { $in: ['COMPLETED', 'RATED'] },
            paymentStatus: 'FULLY_PAID',
          },
        },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$finalFare', '$estimatedFare'] } } } },
      ]),
      vendorRepository.findDocuments(id),
    ]);

    const customerIds = [
      ...new Set([
        ...bookings.map((b) => b.customerId.toString()),
        ...towingBookings.map((b) => b.customerId.toString()),
        ...driverBookings.map((b) => b.customerId.toString()),
      ]),
    ];
    const customers = await UserModel.find({ _id: { $in: customerIds } }).lean();
    const customerMap = new Map(customers.map((c) => [c._id.toString(), c.fullName ?? 'Customer']));
    const driverMap = new Map(driverUsers.map((driver) => [driver._id.toString(), driver.fullName ?? 'Driver']));

    const totalBookings = bookingCount + towingBookingCount + driverBookingCount;
    const totalRevenue =
      (revenueAgg[0]?.total ?? 0) +
      (towingRevenueAgg[0]?.total ?? 0) +
      (driverRevenueAgg[0]?.total ?? 0);
    const documents = storedDocuments.map((document) => mapStoredVendorDocument(document, id));

    return {
      ...base,
      vehicleCount: vehicles.length,
      driverCount: driverUsers.length,
      address: vendor.address ?? base.location,
      joinedAt: (vendor.approvedAt ?? vendor.submittedAt ?? vendor.createdAt).toISOString(),
      businessType: mapVendorTypeLabel(vendor.vendorType),
      gstNumber: '—',
      panNumber: '—',
      bankName: vendor.bankDetails?.bankName ?? '—',
      accountNumber: vendor.bankDetails?.accountNumber ?? '—',
      ifscCode: vendor.bankDetails?.ifsc ?? '—',
      serviceAreas: ['Bhubaneswar, Odisha'],
      workingHours: '24/7',
      totalBookings,
      totalRevenue,
      verificationStage: vendor.verificationStage,
      verificationStageLabel: mapVerificationStageLabel(vendor.verificationStage),
      reviewNotes: vendor.reviewNotes ?? '',
      documentsStatus: deriveDocumentsStatus(documents),
      documents,
      assignedDrivers: driverUsers.filter(isAdminAssignedDriver).map(mapDriverCard),
      myDrivers: driverUsers.filter(isVendorFleetDriver).map(mapDriverCard),
      vehicles: vehicles.map((v) => ({
        id: v._id.toString(),
        registrationNo: v.registrationNo,
        type: v.type,
        model: v.vehicleModel,
        year: v.year,
        status: v.status,
      })),
      recentBookings: [
        ...bookings.map((b) => ({
          id: b._id.toString(),
          bookingNumber: b.bookingNumber,
          customerName: customerMap.get(b.customerId.toString()) ?? 'Customer',
          service: b.serviceLabel,
          driverName: b.driver?.name ?? '—',
          status: b.status,
          amount: b.invoice?.total ?? 0,
          date: b.createdAt.toISOString(),
          bookingType: 'legacy' as const,
        })),
        ...towingBookings.map((b) => ({
          id: b._id.toString(),
          bookingNumber: b.bookingNumber,
          customerName: customerMap.get(b.customerId.toString()) ?? 'Customer',
          service: b.assistLabel?.trim() || 'Towing',
          driverName: b.driverId ? driverMap.get(b.driverId.toString()) ?? '—' : '—',
          status: b.status,
          amount: b.finalFare ?? b.estimatedFare,
          date: b.createdAt.toISOString(),
          bookingType: 'towing' as const,
        })),
        ...driverBookings.map((b) => ({
          id: b._id.toString(),
          bookingNumber: b.bookingNumber,
          customerName: customerMap.get(b.customerId.toString()) ?? 'Customer',
          service: 'Driver Service',
          driverName: b.driverId ? driverMap.get(b.driverId.toString()) ?? '—' : '—',
          status: b.status,
          amount: b.finalFare ?? b.estimatedFare,
          date: b.createdAt.toISOString(),
          bookingType: 'driver' as const,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10),
      activities,
      quickStats: [
        { id: 'bookings', label: 'Total Bookings', value: String(totalBookings), icon: 'ClipboardList' },
        { id: 'revenue', label: 'Total Revenue', value: formatInr(totalRevenue), icon: 'IndianRupee' },
        { id: 'rating', label: 'Average Rating', value: base.rating > 0 ? String(base.rating) : '—', icon: 'Star' },
      ],
    };
  },

  async create(
    input: {
      businessName?: string;
      ownerName?: string;
      phone?: string;
      email?: string;
      city?: string;
      state?: string;
      addressLine?: string;
      pincode?: string;
      vendorType?: string;
      status?: string;
    },
    actor: { id: string; name: string },
  ) {
    const businessName = input.businessName?.trim();
    const ownerName = input.ownerName?.trim();
    const phone = input.phone?.trim();
    const email = input.email?.trim();
    const city = input.city?.trim();
    const state = input.state?.trim() || 'Odisha';
    const addressLine = input.addressLine?.trim();
    const pincode = input.pincode?.trim();

    if (!businessName) throw new BadRequestError('Business name is required');
    if (!ownerName) throw new BadRequestError('Owner name is required');
    if (!phone) throw new BadRequestError('Phone is required');

    const existingUser = await UserModel.findOne({ mobileNumber: phone });
    if (existingUser) throw new ConflictError('A user with this phone number already exists');

    const vendorStatus = mapAdminVendorStatus(input.status);
    const isApproved = vendorStatus === 'approved';

    const vendor = await vendorRepository.create({
      vendorType: (input.vendorType as never) ?? 'towing_company',
      status: vendorStatus as never,
      verificationStage: isApproved ? 'approved' : 'document_review',
      businessName,
      ownerName,
      mobileNumber: phone,
      email: email || undefined,
      address: [
        addressLine,
        city,
        pincode,
        state,
      ].filter(Boolean).join(', ') || undefined,
      submittedAt: new Date(),
      approvedAt: isApproved ? new Date() : undefined,
      statusHistory: [{ status: vendorStatus, changedAt: new Date(), note: 'Created by admin' }],
    });

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'VENDOR_CREATED',
      entityType: 'vendor',
      entityId: vendor.id,
      title: `Vendor ${vendor.businessName} created`,
    });

    await createNotification({
      title: 'New vendor created',
      message: `${vendor.businessName} added by admin`,
      category: 'vendor',
      entityType: 'vendor',
      entityId: vendor.id,
    });

    return mapVendorFromUser((await UserModel.findById(vendor.id))!);
  },

  async update(
    id: string,
    input: Partial<{
      businessName: string;
      ownerName: string;
      phone: string;
      email: string;
      city: string;
      status: string;
      bankDetails: Record<string, string>;
    }>,
    actor: { id: string; name: string },
  ) {
    const user = await UserModel.findOne({ _id: id, role: 'vendor' });
    if (!user?.vendorProfile) throw new NotFoundError('Vendor not found');

    if (input.businessName) user.vendorProfile.businessName = input.businessName;
    if (input.ownerName) {
      user.vendorProfile.ownerName = input.ownerName;
      user.fullName = input.ownerName;
    }
    if (input.phone) {
      const phone = input.phone.trim();
      const duplicate = await UserModel.findOne({ mobileNumber: phone, _id: { $ne: user._id } });
      if (duplicate) throw new ConflictError('A user with this phone number already exists');
      user.mobileNumber = phone;
    }
    if (input.email !== undefined) user.email = input.email;
    if (input.city) user.vendorProfile.address = `${input.city}, Odisha`;
    if (input.status) {
      const vendorStatus = mapAdminVendorStatus(input.status);
      user.vendorProfile.status = vendorStatus as never;
      if (vendorStatus === 'approved') {
        user.vendorProfile.verificationStage = 'approved';
        user.vendorProfile.approvedAt = new Date();
      }
      user.vendorProfile.statusHistory.push({
        status: vendorStatus,
        changedAt: new Date(),
        note: 'Updated by admin',
      });
    }
    if (input.bankDetails) user.vendorProfile.bankDetails = input.bankDetails as never;
    await user.save();

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'VENDOR_UPDATED',
      entityType: 'vendor',
      entityId: id,
      title: `Vendor ${user.vendorProfile.businessName ?? user.vendorProfile.ownerName} updated`,
    });

    return mapVendorFromUser(user);
  },

  async suspend(id: string, note: string | undefined, actor: { id: string; name: string }) {
    const user = await UserModel.findOne({ _id: id, role: 'vendor' });
    if (!user?.vendorProfile) throw new NotFoundError('Vendor not found');
    user.vendorProfile.status = 'changes_requested';
    user.vendorProfile.statusHistory.push({
      status: 'changes_requested',
      changedAt: new Date(),
      note: note ?? 'Suspended',
    });
    await user.save();

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'VENDOR_SUSPENDED',
      entityType: 'vendor',
      entityId: id,
      title: `Vendor ${user.vendorProfile.businessName ?? user.vendorProfile.ownerName} suspended`,
    });

    return mapVendorFromUser(user);
  },

  async approve(id: string, actor: { id: string; name: string }) {
    const user = await UserModel.findOne({ _id: id, role: 'vendor' });
    if (!user?.vendorProfile) throw new NotFoundError('Vendor not found');
    const requiredDocumentTypes = REQUIRED_DOCUMENTS[user.vendorProfile.vendorType] ?? [];
    const uploadedDocuments = await vendorRepository.findDocuments(id);
    const missingDocuments = requiredDocumentTypes.filter(
      (documentType) =>
        !uploadedDocuments.some(
          (document) =>
            document.documentType === documentType &&
            document.verificationStatus === 'approved',
        ),
    );
    if (missingDocuments.length > 0) {
      throw new BadRequestError(
        'Verify required vendor documents before approval: ' + missingDocuments.join(', '),
      );
    }
    user.vendorProfile.status = 'approved';
    user.vendorProfile.verificationStage = 'approved';
    user.vendorProfile.approvedAt = new Date();
    user.vendorProfile.statusHistory.push({
      status: 'approved',
      changedAt: new Date(),
      note: 'Approved by admin',
    });
    await user.save();

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'VENDOR_APPROVED',
      entityType: 'vendor',
      entityId: id,
      title: `Vendor ${user.vendorProfile.businessName ?? user.vendorProfile.ownerName} approved`,
    });
    await createNotification({
      title: 'Vendor approved',
      message: `${user.vendorProfile.businessName ?? user.vendorProfile.ownerName} has been approved`,
      type: 'success',
      category: 'vendor',
      entityType: 'vendor',
      entityId: id,
    });
    try {
      await notificationService.notifyVendorApproved(
        id,
        user.mobileNumber,
        id,
      );
    } catch {
      // Approval already saved — partner push/SMS must not block admin UI.
    }
    return mapVendorFromUser(user);
  },

  async reject(id: string, note: string | undefined, actor: { id: string; name: string }) {
    const user = await UserModel.findOne({ _id: id, role: 'vendor' });
    if (!user?.vendorProfile) throw new NotFoundError('Vendor not found');
    user.vendorProfile.status = 'rejected';
    user.vendorProfile.verificationStage = 'rejected';
    user.vendorProfile.reviewNotes = note;
    user.vendorProfile.statusHistory.push({ status: 'rejected', changedAt: new Date(), note });
    await user.save();

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'VENDOR_REJECTED',
      entityType: 'vendor',
      entityId: id,
      title: `Vendor ${user.vendorProfile.businessName ?? user.vendorProfile.ownerName} rejected`,
    });
    await createNotification({
      title: 'Vendor rejected',
      message: `${user.vendorProfile.businessName ?? user.vendorProfile.ownerName} was rejected`,
      type: 'warning',
      category: 'vendor',
      entityType: 'vendor',
      entityId: id,
    });
    try {
      await notificationService.notifyVendorRejected(
        id,
        user.mobileNumber,
        id,
        note,
      );
    } catch {
      // Rejection already saved — partner push/SMS must not block admin UI.
    }
    return mapVendorFromUser(user);
  },

  async reviewDocument(
    id: string,
    docKey: string,
    status: 'VERIFIED' | 'REJECTED',
    actor: { id: string; name: string },
  ) {
    if (status !== 'VERIFIED' && status !== 'REJECTED') {
      throw new BadRequestError('Invalid document status');
    }
    const user = await UserModel.findOne({ _id: id, role: 'vendor' });
    if (!user?.vendorProfile) throw new NotFoundError('Vendor not found');

    const normalizedDocKey = VENDOR_DOCUMENT_ALIASES[docKey] ?? docKey;
    const allowedDocumentTypes = Object.keys(VENDOR_DOCUMENT_LABELS);
    if (!allowedDocumentTypes.includes(normalizedDocKey)) {
      throw new NotFoundError('Document not found');
    }

    const storedDocument = await vendorRepository.updateDocumentStatus(
      id,
      normalizedDocKey,
      status === 'VERIFIED' ? 'approved' : 'rejected',
    );
    if (!storedDocument) throw new NotFoundError('Uploaded vendor document not found');

    const reviews = [...(user.vendorProfile.documentReviews ?? [])];
    const idx = reviews.findIndex((review) => review.key === normalizedDocKey);
    const entry = { key: normalizedDocKey, status, reviewedAt: new Date() };
    if (idx >= 0) reviews[idx] = entry;
    else reviews.push(entry);
    user.vendorProfile.documentReviews = reviews;
    if (status === 'REJECTED') {
      user.vendorProfile.status = 'changes_requested';
      user.vendorProfile.verificationStage = 'document_review';
      user.vendorProfile.reviewNotes = 'Required document rejected: ' + normalizedDocKey;
      user.vendorProfile.statusHistory.push({
        status: 'changes_requested',
        changedAt: new Date(),
        note: user.vendorProfile.reviewNotes,
      });
    } else if (user.vendorProfile.status !== 'approved') {
      user.vendorProfile.verificationStage = 'document_review';
    }
    await user.save();

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: status === 'VERIFIED' ? 'VENDOR_DOCUMENT_VERIFIED' : 'VENDOR_DOCUMENT_REJECTED',
      entityType: 'vendor',
      entityId: id,
      title: `${docKey} ${status === 'VERIFIED' ? 'verified' : 'rejected'} for ${user.vendorProfile.businessName ?? user.vendorProfile.ownerName}`,
    });

    return this.getById(id);
  },

  async getCounts() {
    const [all, pending, approved, rejected, suspended] = await Promise.all([
      vendorRepository.countUsers({}),
      vendorRepository.countUsers({ status: { $in: ['pending', 'under_review'] } }),
      vendorRepository.countUsers({ status: 'approved' }),
      vendorRepository.countUsers({ status: 'rejected' }),
      vendorRepository.countUsers({ status: 'changes_requested' }),
    ]);
    return { all, pending, approved, rejected, suspended };
  },

  async assignDrivers(id: string, driverIds: string[], actor: { id: string; name: string }) {
    const user = await UserModel.findOne({ _id: id, role: 'vendor' });
    if (!user?.vendorProfile) throw new NotFoundError('Vendor not found');
    if (!driverIds.length) throw new BadRequestError('Select at least one driver');

    const drivers = await UserModel.find({ _id: { $in: driverIds }, role: 'driver' }).exec();
    if (drivers.length !== driverIds.length) {
      throw new NotFoundError('One or more drivers were not found');
    }

    for (const driver of drivers) {
      const currentVendor = driver.driverProfile?.vendorUserId?.toString();
      if (currentVendor && currentVendor !== id) {
        throw new ConflictError(`${driver.fullName ?? 'Driver'} already belongs to another vendor`);
      }
      if (driver.driverProfile?.fleetSource === 'vendor' && currentVendor === id) {
        throw new ConflictError(
          `${driver.fullName ?? 'Driver'} is a vendor fleet driver. Manage them in Partner app → My Drivers.`,
        );
      }
    }

    await driverRepository.updateManyVendor(driverIds, user._id, 'admin');

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'VENDOR_DRIVERS_ASSIGNED',
      entityType: 'vendor',
      entityId: id,
      title: `${driverIds.length} driver(s) assigned to vendor`,
    });

    return { assigned: driverIds.length };
  },

  async unassignDriver(
    vendorUserId: string,
    driverId: string,
    actor: { id: string; name: string },
  ) {
    const driver = await UserModel.findOne({ _id: driverId, role: 'driver' }).exec();
    if (!driver?.driverProfile) throw new NotFoundError('Driver not found');
    if (driver.driverProfile.vendorUserId?.toString() !== vendorUserId) {
      throw new BadRequestError('Driver is not assigned to this vendor');
    }
    if (driver.driverProfile.fleetSource !== 'admin') {
      throw new BadRequestError('Only admin-assigned drivers can be removed here');
    }

    await driverRepository.updateManyVendor([driverId], null);

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'VENDOR_DRIVER_UNASSIGNED',
      entityType: 'vendor',
      entityId: vendorUserId,
      title: `Driver ${driver.fullName ?? driverId} unassigned from vendor`,
    });

    return { unassigned: true, driverId };
  },

  async listFleetDrivers(vendorUserId: string) {
    return vendorDriversService.list(vendorUserId);
  },

  async createFleetDriver(
    vendorUserId: string,
    dto: CreateVendorDriverDto,
    actor: { id: string; name: string },
  ) {
    const driver = await vendorDriversService.create(vendorUserId, dto);
    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'VENDOR_DRIVER_CREATED',
      entityType: 'vendor',
      entityId: vendorUserId,
      title: `Driver ${dto.name} added to vendor fleet`,
    });
    return driver;
  },

  async removeFleetDriver(
    vendorUserId: string,
    driverId: string,
    actor: { id: string; name: string },
  ) {
    const result = await vendorDriversService.remove(vendorUserId, driverId);
    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'VENDOR_DRIVER_REMOVED',
      entityType: 'vendor',
      entityId: vendorUserId,
      title: `Driver removed from vendor fleet`,
    });
    return result;
  },

  async remove(id: string, actor: { id: string; name: string }) {
    const user = await UserModel.findOne({ _id: id, role: 'vendor' });
    if (!user?.vendorProfile) throw new NotFoundError('Vendor not found');

    const vendorName = user.vendorProfile.businessName ?? user.vendorProfile.ownerName ?? 'Vendor';

    await Promise.all([
      UserModel.updateMany(
        { role: 'driver', 'driverProfile.vendorUserId': user._id },
        { $unset: { 'driverProfile.vendorUserId': 1 } },
      ),
      VendorVehicleModel.deleteMany({ vendorId: user._id }),
      BookingModel.updateMany({ vendorId: user._id }, { $unset: { vendorId: 1 } }),
      TransactionModel.updateMany({ vendorId: user._id }, { $unset: { vendorId: 1 } }),
    ]);

    await UserModel.findByIdAndDelete(user._id);

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'VENDOR_DELETED',
      entityType: 'vendor',
      entityId: id,
      title: `Vendor ${vendorName} deleted`,
    });
  },
};
