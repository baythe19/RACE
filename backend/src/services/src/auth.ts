import { AppError, ConflictError, ForbiddenError, UnauthorizedError } from '../../utils/src/errors';
import {
  generateTokenPair,
  isRefreshTokenValid,
  revokeRefreshToken,
  verifyRefreshToken,
} from '../../utils/src/jwt';
import {
  normalizeDriverLoginId,
  verifyDriverPassword,
} from '../../utils/src/driverPassword';
import { userRepository } from './userRepository';
import { computeProfileCompleted } from '../../utils/src/user';
import type { IUser, UserRole } from '../../models/src/user';
import { UserModel } from '../../models/src/user';
import { otpService } from './otp';
import type {
  DriverCredentialLoginDto,
  SendOtpDto,
  VerifyOtpDto,
} from './authValidator';
import { normalizeSendOtpDto, normalizeVerifyOtpDto } from './authValidator';
import type { RefreshTokenDto } from './authDto';

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: {
    id: string;
    mobileNumber: string;
    role: string;
    isVerified: boolean;
    isProfileCompleted: boolean;
    fullName?: string;
    email?: string;
  };
  onboardingRequired: boolean;
}

const ROLE_LABEL: Record<UserRole, string> = {
  customer: 'customer',
  vendor: 'vendor',
  driver: 'driver',
};

function assertAccountActive(accountStatus?: string): void {
  if (accountStatus === 'SUSPENDED') {
    throw new ForbiddenError('Your account has been suspended. Please contact support.');
  }
  if (accountStatus === 'INACTIVE') {
    throw new ForbiddenError('Your account is inactive. Please contact support.');
  }
}

function roleMismatchMessage(existingRole: UserRole, requestedRole: UserRole): string {
  return `This number is registered as a ${ROLE_LABEL[existingRole]}. You cannot access the ${ROLE_LABEL[requestedRole]} app with it. Use the correct app or a different number.`;
}

/** Locked once verified — one mobile number maps to exactly one role. */
function assertRoleAccess(user: IUser, requestedRole: UserRole): void {
  if (user.role === requestedRole) {
    return;
  }

  if (!user.isVerified) {
    return;
  }

  throw new ConflictError(roleMismatchMessage(user.role, requestedRole));
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

async function createUnverifiedUser(mobileNumber: string, role: UserRole): Promise<IUser> {
  try {
    return await userRepository.create({
      mobileNumber,
      isVerified: false,
      isProfileCompleted: false,
      role,
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const existing = await userRepository.findByMobile(mobileNumber);
    if (!existing) {
      throw error;
    }

    return existing;
  }
}

/**
 * Ensure DB role matches the login intent.
 * Unverified abandoned signups may switch role; verified accounts cannot.
 */
async function ensureUserRole(user: IUser, requestedRole: UserRole): Promise<IUser> {
  if (user.role === requestedRole) {
    return user;
  }

  if (user.isVerified) {
    throw new ConflictError(roleMismatchMessage(user.role, requestedRole));
  }

  user.role = requestedRole;
  await user.save();
  return user;
}

export class AuthService {
  async sendOtp(dto: SendOtpDto) {
    const { mobileNumber, role } = normalizeSendOtpDto(dto);
    let user = await userRepository.findByMobile(mobileNumber);

    if (user) {
      assertRoleAccess(user, role);
      user = await ensureUserRole(user, role);
      assertAccountActive(user.accountStatus);

      if (
        role === 'driver' &&
        user.role === 'driver' &&
        user.driverProfile?.loginId &&
        user.driverProfile?.vendorUserId
      ) {
        throw new ConflictError(
          'This number belongs to a vendor driver. Sign in with the Login ID and password provided by your vendor.',
        );
      }

      const otpResult = await otpService.sendOtp(mobileNumber, role);

      return {
        ...otpResult,
        isExistingUser: user.isVerified,
        isProfileCompleted: user.isVerified ? computeProfileCompleted(user) : false,
        onboardingRequired: !user.isVerified || !computeProfileCompleted(user),
        role: user.role,
      };
    }

    // Brand new user — create with the requested role (customer / vendor / driver)
    await createUnverifiedUser(mobileNumber, role);
    const otpResult = await otpService.sendOtp(mobileNumber, role);

    return {
      ...otpResult,
      isExistingUser: false,
      isProfileCompleted: false,
      onboardingRequired: true,
      role,
    };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthTokensResponse> {
    const { mobileNumber, otp, role } = normalizeVerifyOtpDto(dto);

    await otpService.verifyOtp(mobileNumber, otp);

    let user = await userRepository.findByMobile(mobileNumber);
    if (!user) {
      throw new AppError('Account not found. Please request OTP first.', 404);
    }

    assertRoleAccess(user, role);
    user = await ensureUserRole(user, role);
    assertAccountActive(user.accountStatus);

    if (
      role === 'driver' &&
      user.driverProfile?.loginId &&
      user.driverProfile?.vendorUserId
    ) {
      throw new ConflictError(
        'This number belongs to a vendor driver. Sign in with the Login ID and password provided by your vendor.',
      );
    }

    user.isVerified = true;
    user.isProfileCompleted = computeProfileCompleted(user);
    await user.save();

    const tokens = await generateTokenPair(user.id, user.role, user.mobileNumber);

    return {
      ...tokens,
      user: {
        id: user.id,
        mobileNumber: user.mobileNumber,
        role: user.role,
        isVerified: user.isVerified,
        isProfileCompleted: user.isProfileCompleted,
        fullName: user.fullName,
        email: user.email,
      },
      onboardingRequired: !user.isProfileCompleted,
    };
  }

  async loginDriverWithCredentials(dto: DriverCredentialLoginDto): Promise<AuthTokensResponse> {
    const loginId = normalizeDriverLoginId(dto.loginId);

    const user = await UserModel.findOne({
      role: 'driver',
      'driverProfile.loginId': loginId,
    })
      .select('+driverProfile.passwordHash')
      .exec();

    if (!user?.driverProfile?.passwordHash) {
      throw new UnauthorizedError('Invalid login ID or password');
    }

    const valid = await verifyDriverPassword(dto.password, user.driverProfile.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid login ID or password');
    }

    assertAccountActive(user.accountStatus);

    if (user.driverProfile.status === 'SUSPENDED' || user.driverProfile.status === 'REJECTED') {
      throw new ForbiddenError('Your driver account is not active. Contact your vendor.');
    }

    user.isVerified = true;
    if (!user.isProfileCompleted) {
      user.isProfileCompleted = true;
    }
    await user.save();

    const tokens = await generateTokenPair(user.id, user.role, user.mobileNumber);

    return {
      ...tokens,
      user: {
        id: user.id,
        mobileNumber: user.mobileNumber,
        role: user.role,
        isVerified: user.isVerified,
        isProfileCompleted: user.isProfileCompleted,
        fullName: user.fullName,
        email: user.email,
      },
      onboardingRequired: false,
    };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<AuthTokensResponse> {
    let payload;
    try {
      payload = verifyRefreshToken(dto.refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const valid = await isRefreshTokenValid(payload.sub, payload.jti);
    if (!valid) {
      throw new UnauthorizedError('Refresh token expired or revoked');
    }

    const user = await userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    assertAccountActive(user.accountStatus);

    await revokeRefreshToken(payload.sub, payload.jti);
    const tokens = await generateTokenPair(user.id, user.role, user.mobileNumber);

    return {
      ...tokens,
      user: {
        id: user.id,
        mobileNumber: user.mobileNumber,
        role: user.role,
        isVerified: user.isVerified,
        isProfileCompleted: user.isProfileCompleted,
        fullName: user.fullName,
        email: user.email,
      },
      onboardingRequired: !computeProfileCompleted(user),
    };
  }
}

export const authService = new AuthService();
