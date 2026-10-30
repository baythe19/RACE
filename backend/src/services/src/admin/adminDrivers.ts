import { Types } from 'mongoose';

import { UserModel } from '../../../models/src/user';
import { driverRepository } from '../driverRepository';
import { BookingModel } from '../../../models/src/booking';
import { DriverBookingModel } from '../../../models/src/driverBooking';
import { TowingBookingModel } from '../../../models/src/towingBooking';
import { VendorVehicleModel } from '../../../models/src/vendorVehicle';
import { escapeRegex, paginate } from './pagination';
import { logActivity } from './activityLogger';
import { getEntityActivities } from './entityActivities';
import { buildDriverDocuments, deriveDocumentsStatus, mapVerificationStage } from './responseMappers';
import {
  mapDriverFilterToUserQuery,
  toDriverRecord,
} from '../userProfileMappers';
import { NotFoundError, BadRequestError } from '../../../utils/src/errors';
import type { IUser } from '../../../models/src/user';

async function mapDriver(user: IUser, vendorName?: string) {
  const driver = toDriverRecord(user);
  const documents = buildDriverDocuments(driver);
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    licenseNo: driver.licenseNo,
    driverType: driver.driverType,
    vendorId: driver.vendorId?.toString() ?? '',
    vendorName: vendorName ?? '—',
    city: driver.city,
    vehicleRegistration: driver.vehicleRegistration ?? '—',
    rating: driver.rating,
    reviewCount: driver.reviewCount,
    status: driver.status,
    verificationStatus: mapVerificationStage(
      driver.status === 'APPROVED' ? 'approved' : driver.status === 'REJECTED' ? 'rejected' : 'document_review',
      driver.status.toLowerCase(),
    ),
    documentsStatus: deriveDocumentsStatus(documents),
  };
}

export const adminDriversService = {
  async list(filters: {
    search?: string;
    status?: string;
    verification?: string;
    city?: string;
    vendorId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const query: Record<string, unknown> = {};
    if (filters.status && filters.status !== 'ALL') query.status = filters.status;
    if (filters.city && filters.city !== 'ALL') query.city = filters.city;
    if (filters.vendorId && filters.vendorId !== 'ALL') query.vendorId = filters.vendorId;
    if (filters.verification && filters.verification !== 'ALL') {
      if (filters.verification === 'VERIFIED') query.status = 'APPROVED';
      else if (filters.verification === 'REJECTED') query.status = 'REJECTED';
      else query.status = 'PENDING';
    }
    if (filters.search?.trim()) {
      const regex = new RegExp(escapeRegex(filters.search.trim()), 'i');
      query.$or = [{ name: regex }, { phone: regex }, { licenseNo: regex }, { driverCode: regex }];
    }

    const userQuery = mapDriverFilterToUserQuery(query);
    const result = await paginate(UserModel, userQuery, filters, (doc) => doc as IUser);
    const vendorIds = [
      ...new Set(
        result.items
          .map((d) => d.driverProfile?.vendorUserId?.toString())
          .filter(Boolean) as string[],
      ),
    ];
    const vendors = await UserModel.find({ _id: { $in: vendorIds }, role: 'vendor' }).lean();
    const vendorMap = new Map(
      vendors.map((v) => [v._id.toString(), v.vendorProfile?.businessName ?? v.vendorProfile?.ownerName ?? 'Vendor']),
    );

    return {
      ...result,
      items: await Promise.all(
        result.items.map((d) =>
          mapDriver(
            d,
            d.driverProfile?.vendorUserId
              ? vendorMap.get(d.driverProfile.vendorUserId.toString())
              : undefined,
          ),
        ),
      ),
    };
  },

  async getById(id: string) {
    const user = await UserModel.findOne({ _id: id, role: 'driver' });
    if (!user?.driverProfile) throw new NotFoundError('Driver not found');
    const driver = toDriverRecord(user);

    let vendorName: string | undefined;
    if (driver.vendorId) {
      const vendor = await UserModel.findOne({ _id: driver.vendorId, role: 'vendor' }).lean();
      vendorName = vendor?.vendorProfile?.businessName ?? vendor?.vendorProfile?.ownerName;
    }
    const base = await mapDriver(user, vendorName);

    const driverObjectId = user._id;

    const [legacyBookings, towingBookings, driverBookings, activities, fleetVehicle] =
      await Promise.all([
        BookingModel.find({ 'driver.id': id }).sort({ createdAt: -1 }).limit(20).lean(),
        TowingBookingModel.find({ driverId: driverObjectId }).sort({ createdAt: -1 }).limit(20).lean(),
        DriverBookingModel.find({ driverId: driverObjectId }).sort({ createdAt: -1 }).limit(20).lean(),
        getEntityActivities('driver', id),
        driver.vehicleRegistration
          ? VendorVehicleModel.findOne({ registrationNo: driver.vehicleRegistration }).lean()
          : Promise.resolve(null),
      ]);

    type UnifiedDriverBookingRow = {
      id: string;
      bookingNumber: string;
      service: string;
      status: string;
      amount: number;
      date: string;
      customerId?: string;
      bookingType: 'legacy' | 'towing' | 'driver';
    };

    const unified: UnifiedDriverBookingRow[] = [
      ...legacyBookings.map((b) => ({
        id: b._id.toString(),
        bookingNumber: b.bookingNumber,
        service: b.serviceLabel ?? 'Roadside',
        status: b.status,
        amount: b.invoice?.total ?? 0,
        date: b.createdAt.toISOString(),
        customerId: b.customerId?.toString(),
        bookingType: 'legacy' as const,
      })),
      ...towingBookings.map((b) => ({
        id: b._id.toString(),
        bookingNumber: b.bookingNumber,
        service: b.assistLabel?.trim() || 'Towing',
        status: b.status,
        amount: b.finalFare ?? b.estimatedFare ?? 0,
        date: b.createdAt.toISOString(),
        customerId: b.customerId?.toString(),
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
        customerId: b.customerId?.toString(),
        bookingType: 'driver' as const,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 40);

    const customerIds = [
      ...new Set(unified.map((b) => b.customerId).filter(Boolean)),
    ] as string[];
    const customers = customerIds.length
      ? await UserModel.find({ _id: { $in: customerIds }, role: 'customer' }).lean()
      : [];
    const customerMap = new Map(
      customers.map((c) => [c._id.toString(), c.fullName ?? 'Customer'] as const),
    );

    return {
      ...base,
      email: driver.email ?? '',
      address: `${driver.city}${driver.state ? `, ${driver.state}` : ''}`,
      joinedAt: driver.createdAt.toISOString(),
      licenseExpiry: '',
      // Not captured in driver profiles yet; avoid showing incorrect defaults.
      licenseClass: '—',
      aadhaarMasked: 'XXXX-XXXX-XXXX',
      assignedVehicle: {
        registrationNo: driver.vehicleRegistration ?? fleetVehicle?.registrationNo ?? '—',
        type: fleetVehicle?.type ?? driver.driverType,
        model: fleetVehicle?.vehicleModel ?? '—',
        year: fleetVehicle?.year ?? new Date().getFullYear(),
        status: (fleetVehicle?.status ?? 'ACTIVE') as 'ACTIVE' | 'UNDER_MAINTENANCE',
      },
      bookings: unified.map((b) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        service: b.service,
        status: b.status,
        amount: b.amount,
        date: b.date,
        customerName: b.customerId ? customerMap.get(b.customerId) : undefined,
        bookingType: b.bookingType,
      })),
      reviews: [],
      documents: buildDriverDocuments(driver),
      activities,
    };
  },

  async create(input: Record<string, string>, actor: { id: string; name: string }) {
    const count = await driverRepository.count();
    const experienceYears = input.experienceYears ? Number(input.experienceYears) : undefined;
    const driver = await driverRepository.create({
      driverCode: `DRV${String(count + 1).padStart(4, '0')}`,
      fullName: input.name,
      mobileNumber: input.phone,
      email: input.email,
      licenseNo: input.licenseNo,
      driverType: input.driverType ?? 'Tow Driver',
      vendorUserId: input.vendorId || undefined,
      fleetSource: input.vendorId ? 'vendor' : 'admin',
      city: input.city ?? 'Bhubaneswar',
      state: input.state ?? 'Odisha',
      vehicleRegistration: input.vehicleRegistration,
      status: (input.status ?? 'PENDING') as never,
      statusHistory: [{ status: input.status ?? 'PENDING', changedAt: new Date() }],
      experienceYears: Number.isFinite(experienceYears) ? experienceYears : undefined,
      emergencyContact:
        input.emergencyContactName && input.emergencyContactPhone
          ? {
              name: input.emergencyContactName,
              mobileNumber: input.emergencyContactPhone,
              relationship: input.emergencyContactRelation || undefined,
            }
          : undefined,
    });

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'DRIVER_CREATED',
      entityType: 'driver',
      entityId: driver.id,
      title: `Driver ${driver.name} created`,
    });

    return mapDriver((await UserModel.findById(driver.id))!);
  },

  async update(id: string, input: Record<string, string>, actor: { id: string; name: string }) {
    const existing = await driverRepository.findById(id);
    if (!existing) throw new NotFoundError('Driver not found');

    if (input.status === 'APPROVED' && existing.status !== 'APPROVED') {
      const user = await UserModel.findOne({ _id: id, role: 'driver' })
        .select('driverProfile.documents')
        .exec();
      const documents = user?.driverProfile?.documents ?? [];
      const hasVerifiedRequiredDocument = (labels: string[]) =>
        documents.some((document) =>
          labels.some((label) => document.type.toLowerCase().includes(label)) &&
          document.status === 'VERIFIED',
        );

      if (
        !hasVerifiedRequiredDocument(['driving license']) ||
        !hasVerifiedRequiredDocument(['government id', 'aadhaar', 'pan'])
      ) {
        throw new BadRequestError(
          'Verify the driver license and government ID before approving this driver',
        );
      }
    }

    const driver = await driverRepository.updateById(id, {
      name: input.name ?? existing.name,
      phone: input.phone ?? existing.phone,
      email: input.email ?? existing.email,
      licenseNo: input.licenseNo ?? existing.licenseNo,
      driverType: input.driverType ?? existing.driverType,
      city: input.city ?? existing.city,
      vehicleRegistration: input.vehicleRegistration ?? existing.vehicleRegistration,
      vendorId: input.vendorId ? new Types.ObjectId(input.vendorId) : existing.vendorId,
      status: input.status && input.status !== existing.status ? (input.status as never) : undefined,
    });
    if (!driver) {
      const current = await UserModel.findOne({ _id: id, role: 'driver' })
        .select('activeBookingId')
        .exec();
      if (current?.activeBookingId) {
        throw new BadRequestError('Cannot update a driver during an active booking');
      }
      throw new NotFoundError('Driver not found');
    }

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'DRIVER_UPDATED',
      entityType: 'driver',
      entityId: id,
      title: `Driver ${driver.name} updated`,
    });

    return mapDriver((await UserModel.findById(id))!);
  },

  async remove(id: string, actor: { id: string; name: string }) {
    const driver = await driverRepository.deleteById(id);
    if (!driver) {
      const current = await UserModel.findOne({ _id: id, role: 'driver' })
        .select('activeBookingId')
        .exec();
      if (current?.activeBookingId) {
        throw new BadRequestError('Cannot remove a driver during an active booking');
      }
      throw new NotFoundError('Driver not found');
    }
    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'DRIVER_DELETED',
      entityType: 'driver',
      entityId: id,
      title: `Driver ${driver.name} deleted`,
    });
  },

  async reviewDocument(
    id: string,
    documentId: string,
    status: 'VERIFIED' | 'REJECTED',
    actor: { id: string; name: string },
  ) {
    if (status !== 'VERIFIED' && status !== 'REJECTED') {
      throw new BadRequestError('Invalid document status');
    }
    const user = await driverRepository.findUserById(id);
    if (!user?.driverProfile) throw new NotFoundError('Driver not found');

    const driverId = user._id.toString();
    const DOC_BY_KEY: Record<string, string> = {
      dl: 'Driving License',
      aadhaar: 'Aadhaar Card',
      police: 'Police Verification',
      medical: 'Medical Fitness Certificate',
    };

    let docIndex = -1;
    const indexMatch = documentId.match(/-doc-(\d+)$/);
    if (indexMatch) {
      docIndex = Number(indexMatch[1]);
    } else if (documentId.startsWith(`${driverId}-`)) {
      const docKey = documentId.slice(driverId.length + 1);
      const docType = DOC_BY_KEY[docKey];
      if (!docType) throw new NotFoundError('Document not found');

      if (!user.driverProfile.documents?.length) {
        user.driverProfile.documents = [];
      }
      docIndex = user.driverProfile.documents.findIndex((doc) => doc.type === docType);
      if (docIndex < 0) {
        user.driverProfile.documents.push({
          type: docType,
          url: `/admin/documents/driver/${driverId}/${docKey}`,
          status,
          uploadedAt: new Date(),
        });
        docIndex = user.driverProfile.documents.length - 1;
      }
    } else {
      throw new NotFoundError('Document not found');
    }

    if (!user.driverProfile.documents[docIndex]) throw new NotFoundError('Document not found');

    const reviewedDocument = user.driverProfile.documents[docIndex];
    reviewedDocument.status = status;

    const requiredDocumentRejected =
      status === 'REJECTED' &&
      ['driving license', 'government id', 'aadhaar', 'pan'].some((label) =>
        reviewedDocument.type.toLowerCase().includes(label),
      );
    if (requiredDocumentRejected) {
      user.driverProfile.status = 'REJECTED';
      user.isAvailable = false;
      user.driverProfile.statusHistory.push({
        status: 'REJECTED',
        note: 'Required document rejected: ' + reviewedDocument.type,
        changedAt: new Date(),
        changedBy: actor.id,
      });
    }

    await user.save();

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: status === 'VERIFIED' ? 'DRIVER_DOCUMENT_VERIFIED' : 'DRIVER_DOCUMENT_REJECTED',
      entityType: 'driver',
      entityId: id,
      title: `${user.driverProfile.documents[docIndex].type} ${status === 'VERIFIED' ? 'verified' : 'rejected'} for ${user.fullName}`,
    });

    return this.getById(id);
  },

  async getCounts() {
    const [all, pending, approved, rejected, suspended] = await Promise.all([
      driverRepository.count(),
      driverRepository.count({ status: 'PENDING' }),
      driverRepository.count({ status: 'APPROVED' }),
      driverRepository.count({ status: 'REJECTED' }),
      driverRepository.count({ status: 'SUSPENDED' }),
    ]);
    return { all, pending, approved, rejected, suspended };
  },
};
