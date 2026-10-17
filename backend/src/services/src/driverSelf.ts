import { BadRequestError, NotFoundError } from '../../utils/src/errors';
import { UserModel } from '../../models/src/user';
import { driverRepository } from './driverRepository';
import { storageService } from '../../storage/src/index';
import { z } from 'zod';

export const registerDriverSelfSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email().optional(),
  address: z.string().min(5).max(300).optional(),
  licenseNo: z.string().min(4).max(40),
  driverType: z.enum(['Tow Driver', 'Full-Time', 'Part-Time']).default('Tow Driver'),
  vehicleRegistration: z.string().min(4).max(20).optional(),
  city: z.string().min(2).max(100).optional(),
  vehicleType: z.string().max(50).optional(),
  dateOfBirth: z.string().optional(),
  emergencyContact: z
    .object({
      name: z.string().min(1).max(100),
      mobileNumber: z.string().min(7).max(15),
      relationship: z.string().max(50).optional(),
    })
    .optional(),
  experienceYears: z.number().min(0).max(50).optional(),
  languages: z.array(z.string().min(1).max(50)).optional(),
  availabilityWindow: z.string().max(100).optional(),
  documents: z
    .array(
      z.object({
        type: z.string(),
        url: z.string(),
        status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
      }),
    )
    .optional(),
});

export type RegisterDriverSelfDto = z.infer<typeof registerDriverSelfSchema>;

export class DriverSelfService {
  async register(userId: string, dto: RegisterDriverSelfDto) {
    const user = await UserModel.findById(userId).exec();
    if (!user) throw new NotFoundError('User not found');

    if (user.role === 'vendor') {
      throw new BadRequestError('Vendor accounts cannot register as drivers on this path');
    }

    const status = process.env.NODE_ENV === 'production' ? 'PENDING' : 'APPROVED';

    const parsedDob = dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined;
    const formattedDocs = (dto.documents ?? []).map((doc) => ({
      type: doc.type,
      url: doc.url,
      status: (doc.status ?? 'PENDING') as 'PENDING' | 'VERIFIED' | 'REJECTED',
      uploadedAt: new Date(),
    }));

    if (user.role === 'driver' && user.driverProfile) {
      user.fullName = dto.fullName;
      if (dto.email) user.email = dto.email;
      if (parsedDob && !isNaN(parsedDob.getTime())) user.dateOfBirth = parsedDob;
      if (dto.emergencyContact) user.emergencyContact = dto.emergencyContact;
      if (dto.address) {
        user.address = {
          line1: dto.address,
          city: dto.city ?? user.address?.city ?? 'Bhubaneswar',
          state: 'Odisha',
          pincode: user.address?.pincode ?? '751001',
          country: 'India',
        };
      }
      user.driverProfile.licenseNo = dto.licenseNo;
      user.driverProfile.driverType = dto.driverType;
      user.driverProfile.city = dto.city ?? user.driverProfile.city ?? 'Bhubaneswar';
      if (dto.vehicleRegistration) {
        user.driverProfile.vehicleRegistration = dto.vehicleRegistration;
      }
      if (dto.experienceYears !== undefined) {
        user.driverProfile.experienceYears = dto.experienceYears;
      }
      if (dto.languages) {
        user.driverProfile.languages = dto.languages;
      }
      if (dto.availabilityWindow) {
        user.driverProfile.availabilityWindow = dto.availabilityWindow;
      }
      if (formattedDocs.length > 0) {
        user.driverProfile.documents = formattedDocs;
      }
      user.driverProfile.status = status as 'PENDING' | 'APPROVED';
      user.isProfileCompleted = true;
      user.isVerified = true;
      if (!user.currentLocation) {
        user.currentLocation = {
          latitude: 20.2961,
          longitude: 85.8245,
          updatedAt: new Date(),
        };
      }
      await user.save();
      return {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        status: user.driverProfile.status,
        isProfileCompleted: user.isProfileCompleted,
      };
    }

    // Promote customer → driver
    const count = await driverRepository.count();
    const driverCode = user.driverProfile?.driverCode ?? `DRV${String(count + 1).padStart(4, '0')}`;

    user.role = 'driver';
    user.fullName = dto.fullName;
    if (dto.email) user.email = dto.email;
    if (parsedDob && !isNaN(parsedDob.getTime())) user.dateOfBirth = parsedDob;
    if (dto.emergencyContact) user.emergencyContact = dto.emergencyContact;
    if (dto.address) {
      user.address = {
        line1: dto.address,
        city: dto.city ?? 'Bhubaneswar',
        state: 'Odisha',
        pincode: '751001',
        country: 'India',
      };
    }
    user.isVerified = true;
    user.isProfileCompleted = true;
    // VOC P0.5: a brand-new self-driver must NOT become dispatch-eligible with
    // a placeholder Bhubaneswar coordinate. Availability stays false until the
    // device sends its first real location fix; the placeholder is only a
    // display default in non-production.
    user.isAvailable = false;
    user.currentLocation = {
      latitude: 20.2961,
      longitude: 85.8245,
      updatedAt: new Date(),
    };
    user.driverProfile = {
      driverCode,
      licenseNo: dto.licenseNo,
      driverType: dto.driverType,
      city: dto.city ?? 'Bhubaneswar',
      state: 'Odisha',
      vehicleRegistration: dto.vehicleRegistration,
      experienceYears: dto.experienceYears,
      languages: dto.languages,
      availabilityWindow: dto.availabilityWindow,
      status: status as 'PENDING' | 'APPROVED',
      rating: 0,
      reviewCount: 0,
      totalTrips: 0,
      documents: formattedDocs,
      statusHistory: [{ status: status as 'PENDING' | 'APPROVED', changedAt: new Date() }],
    };
    await user.save();

    return {
      id: user.id,
      role: user.role,
      fullName: user.fullName,
      status,
      isProfileCompleted: true,
    };
  }

  /**
   * Self-driver KYC upload (BUG-05 / PA-2 fix): stores the file via the same
   * storage pipeline used for vendor-managed drivers and attaches it to the
   * caller's own driverProfile.documents. Registration no longer needs to
   * fabricate local device URIs — upload first, then register referencing
   * the returned fileUrl.
   */
  async uploadSelfDocument(
    userId: string,
    documentType: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ) {
    const user = await UserModel.findById(userId).exec();
    if (!user) throw new NotFoundError('User not found');
    if (user.role === 'vendor') {
      throw new BadRequestError('Vendor accounts use the vendor document upload path');
    }

    const upload = await storageService.uploadDriverDocument({
      driverId: userId,
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
      documentType,
    });

    if (!user.driverProfile) {
      // Pre-registration upload: park the document on a minimal profile so
      // register() (existing-driver branch) will keep it.
      const count = await driverRepository.count();
      user.driverProfile = {
        driverCode: `DRV${String(count + 1).padStart(4, '0')}`,
        licenseNo: 'PENDING',
        driverType: 'Tow Driver',
        city: 'Bhubaneswar',
        state: 'Odisha',
        status: 'PENDING',
        rating: 0,
        reviewCount: 0,
        totalTrips: 0,
        documents: [],
      } as NonNullable<typeof user.driverProfile>;
    }
    if (!user.driverProfile.documents?.length) {
      user.driverProfile.documents = [];
    }

    const existingIndex = user.driverProfile.documents.findIndex((d) => d.type === documentType);
    if (existingIndex >= 0) {
      user.driverProfile.documents[existingIndex].url = upload.fileUrl;
      user.driverProfile.documents[existingIndex].status = 'PENDING';
      user.driverProfile.documents[existingIndex].uploadedAt = new Date();
    } else {
      user.driverProfile.documents.push({
        type: documentType,
        url: upload.fileUrl,
        status: 'PENDING',
        uploadedAt: new Date(),
      });
    }

    // A fresh upload always returns the application to admin review.
    if (user.role === 'driver' && user.driverProfile.status === 'APPROVED') {
      user.driverProfile.status = 'PENDING';
      user.driverProfile.statusHistory?.push({ status: 'PENDING', changedAt: new Date() });
    }

    await user.save();
    return {
      uploaded: true,
      documentType,
      fileUrl: upload.fileUrl,
      documents: user.driverProfile.documents,
    };
  }
}

export const driverSelfService = new DriverSelfService();
