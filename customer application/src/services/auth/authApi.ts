import * as authService from '../authService';
import * as profileService from '../profileService';
import { unwrapApi, api } from '../api';
import type {
  AuthUser,
  CompleteProfileRequest,
  SendOtpRequest,
  SendOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from '../../types/auth';
import type { Profile } from '../../types/models';

function toAuthUser(profile: Profile | null | undefined): AuthUser {
  if (!profile) {
    return {
      id: '',
      mobileNumber: '',
      role: 'customer',
      isVerified: false,
      isProfileCompleted: false,
    };
  }
  return {
    id: profile.id ?? '',
    mobileNumber: profile.mobileNumber ?? '',
    role: profile.role ?? 'customer',
    isVerified: Boolean(profile.isVerified),
    isProfileCompleted: Boolean(profile.isProfileCompleted),
    fullName: profile.fullName,
    email: profile.email,
    gender: profile.gender,
  };
}

export async function sendOtp(payload: SendOtpRequest): Promise<SendOtpResponse> {
  return unwrapApi(
    api.post('/api/v1/auth/send-otp', {
      mobileNumber: payload.mobileNumber,
      role: payload.role ?? 'customer',
    }),
  );
}

export async function verifyOtp(payload: VerifyOtpRequest): Promise<VerifyOtpResponse> {
  return authService.verifyOtp({
    mobileNumber: payload.mobileNumber,
    otp: payload.otp,
    role: payload.role ?? 'customer',
  });
}

export async function completeProfile(payload: CompleteProfileRequest): Promise<AuthUser> {
  const profile = await unwrapApi<Profile>(
    api.put('/api/v1/profile/complete', payload),
  );
  return toAuthUser(profile);
}

export async function getProfile(): Promise<AuthUser> {
  const profile = await profileService.getProfile();
  return toAuthUser(profile);
}
