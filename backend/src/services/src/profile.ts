import { NotFoundError } from '../../utils/src/errors';
import { userRepository } from './userRepository';
import type { IUser } from '../../models/src/user';
import type {
  ProfileDriverSummaryDto,
  ProfileResponseDto,
  UpdateProfileDto,
  CompleteProfileDto,
} from './profileValidator';

/**
 * Verification state of a driver account, read from the same field the driver
 * endpoints gate on (`driverProfile.status`). Without this the app could only
 * see `isVerified`, which is set at registration and stays true while the
 * application is still pending — the app then told drivers they were approved.
 */
function mapDriverProfile(user: IUser): ProfileDriverSummaryDto | undefined {
  const profile = user.driverProfile;
  if (!profile) return undefined;

  const history = [...(profile.statusHistory ?? [])].sort(
    (a, b) => +new Date(a.changedAt) - +new Date(b.changedAt),
  );

  return {
    status: profile.status,
    driverCode: profile.driverCode,
    driverType: profile.driverType,
    licenseNo: profile.licenseNo,
    city: profile.city,
    state: profile.state,
    vehicleRegistration: profile.vehicleRegistration,
    fleetSource: profile.fleetSource,
    policeVerificationStatus: profile.policeVerificationStatus,
    documents: (profile.documents ?? []).map((doc) => ({
      type: doc.type,
      status: doc.status,
      uploadedAt: doc.uploadedAt?.toISOString(),
    })),
    statusHistory: history.map((entry) => ({
      status: entry.status,
      note: entry.note,
      changedAt: entry.changedAt.toISOString(),
    })),
    submittedAt: (history[0]?.changedAt ?? user.createdAt)?.toISOString(),
  };
}

function mapProfile(user: IUser): ProfileResponseDto {
  return {
    id: user.id,
    mobileNumber: user.mobileNumber,
    fullName: user.fullName,
    email: user.email,
    gender: user.gender,
    dateOfBirth: user.dateOfBirth?.toISOString().split('T')[0],
    emergencyContact: user.emergencyContact,
    address: user.address,
    profilePhoto: user.profilePhoto,
    isVerified: user.isVerified,
    isProfileCompleted: user.isProfileCompleted,
    role: user.role,
    ...(user.role === 'driver' ? { isAvailable: user.driverProfile?.status === 'APPROVED' && user.isAvailable === true && !user.activeBookingId } : {}),
    ...(user.role === 'driver' ? { driverProfile: mapDriverProfile(user) } : {}),
  };
}

export class ProfileService {
  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return mapProfile(user);
  }

  async completeProfile(userId: string, dto: CompleteProfileDto): Promise<ProfileResponseDto> {
    const user = await userRepository.updateById(userId, {
      fullName: dto.fullName,
      ...(dto.email ? { email: dto.email } : {}),
      gender: dto.gender,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      emergencyContact: dto.emergencyContact,
      address: dto.address,
      profilePhoto: dto.profilePhoto,
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return mapProfile(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<ProfileResponseDto> {
    const patch: Record<string, unknown> = {};

    if (dto.fullName !== undefined) patch.fullName = dto.fullName;
    if (dto.email !== undefined) patch.email = dto.email;
    if (dto.gender !== undefined) patch.gender = dto.gender;
    if (dto.dateOfBirth !== undefined) {
      patch.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined;
    }
    if (dto.emergencyContact !== undefined) patch.emergencyContact = dto.emergencyContact;
    if (dto.address !== undefined) patch.address = dto.address;
    if (dto.profilePhoto !== undefined) patch.profilePhoto = dto.profilePhoto;

    const user = await userRepository.updateById(userId, patch);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return mapProfile(user);
  }
}

export const profileService = new ProfileService();
