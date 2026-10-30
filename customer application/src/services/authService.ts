import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import { API_BASE_URL, TOKEN_KEYS } from '../config/env';
import { clearTokens, unwrapApi, api } from './api';
import { persistSessionTokens } from './sessionTokens';
import type { User, VerifyOtpResponse } from '../types/auth';

export interface SendOtpPayload {
  mobileNumber: string;
  role?: 'customer' | 'vendor' | 'driver';
}

export interface VerifyOtpPayload {
  mobileNumber: string;
  otp: string;
  role?: 'customer' | 'vendor' | 'driver';
}

export interface SendOtpResult {
  message: string;
  expiresIn: number;
  isExistingUser: boolean;
  isProfileCompleted: boolean;
  onboardingRequired?: boolean;
  devOtp?: string;
}

export async function sendOtp(payload: SendOtpPayload): Promise<SendOtpResult> {
  return unwrapApi(
    api.post('/api/v1/auth/send-otp', {
      mobileNumber: payload.mobileNumber,
      role: payload.role ?? 'customer',
    }),
  );
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<VerifyOtpResponse> {
  const result = await unwrapApi<VerifyOtpResponse>(
    api.post('/api/v1/auth/verify-otp', {
      mobileNumber: payload.mobileNumber,
      otp: payload.otp,
      role: payload.role ?? 'customer',
    }),
  );
  await persistSessionTokens(result.accessToken, result.refreshToken);
  return result;
}

export async function logout(): Promise<void> {
  await clearTokens();
}

/** Re-issue tokens from DB role (e.g. after vendor registration or admin approval). */
export async function refreshAuthSession(): Promise<VerifyOtpResponse> {
  const refreshToken = await SecureStore.getItemAsync(TOKEN_KEYS.REFRESH);
  if (!refreshToken) {
    throw new Error('No refresh token');
  }

  const result = await unwrapApi<VerifyOtpResponse>(
    axios.post(`${API_BASE_URL}/api/v1/auth/refresh-token`, { refreshToken }),
  );
  await persistSessionTokens(result.accessToken, result.refreshToken);
  return result;
}

export type { User };
