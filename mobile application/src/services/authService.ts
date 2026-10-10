import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import { API_BASE_URL, TOKEN_KEYS } from '../config/env';
import { clearTokens, saveTokens, unwrapApi, api } from './api';
import type { User, VerifyOtpResponse } from '../types/auth';
import { UI_PREVIEW_MODE } from '../config/uiPreviewMode';
import { MOCK_DRIVER_USER, MOCK_VENDOR_USER } from '../data/mockPartnerData';

export interface SendOtpPayload {
  mobileNumber: string;
  role: 'customer' | 'vendor' | 'driver';
}

export interface VerifyOtpPayload {
  mobileNumber: string;
  otp: string;
  role: 'customer' | 'vendor' | 'driver';
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
  try {
    return await unwrapApi(
      api.post('/api/v1/auth/send-otp', {
        mobileNumber: payload.mobileNumber,
        role: payload.role,
      }),
    );
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      return {
        message: 'Mock verification code is 123456',
        expiresIn: 300,
        isExistingUser: true,
        isProfileCompleted: true,
        onboardingRequired: false,
        devOtp: '123456',
      };
    }
    throw error;
  }
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<VerifyOtpResponse> {
  try {
    const result = await unwrapApi<VerifyOtpResponse>(
      api.post('/api/v1/auth/verify-otp', {
        mobileNumber: payload.mobileNumber,
        otp: payload.otp,
        role: payload.role,
      }),
    );
    await saveTokens(result.accessToken, result.refreshToken);
    return result;
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      const mockUser = payload.role === 'vendor' ? MOCK_VENDOR_USER : MOCK_DRIVER_USER;
      const token = `mock-${payload.role}-token`;
      await saveTokens(token, token);
      return {
        user: mockUser,
        accessToken: token,
        refreshToken: token,
        expiresIn: '86400',
        onboardingRequired: false,
      };
    }
    throw error;
  }
}

export interface DriverCredentialLoginPayload {
  loginId: string;
  password: string;
}

export async function loginDriverWithCredentials(
  payload: DriverCredentialLoginPayload,
): Promise<VerifyOtpResponse> {
  try {
    const result = await unwrapApi<VerifyOtpResponse>(
      api.post('/api/v1/auth/driver-login', {
        loginId: payload.loginId,
        password: payload.password,
      }),
    );
    await saveTokens(result.accessToken, result.refreshToken);
    return result;
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      const token = 'mock-driver-token';
      await saveTokens(token, token);
      return {
        user: MOCK_DRIVER_USER,
        accessToken: token,
        refreshToken: token,
        expiresIn: '86400',
        onboardingRequired: false,
      };
    }
    throw error;
  }
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

  if (UI_PREVIEW_MODE && (refreshToken === 'mock-driver-token' || refreshToken === 'mock-vendor-token')) {
    const isVendor = refreshToken === 'mock-vendor-token';
    return {
      user: isVendor ? MOCK_VENDOR_USER : MOCK_DRIVER_USER,
      accessToken: refreshToken,
      refreshToken,
      expiresIn: '86400',
      onboardingRequired: false,
    };
  }

  try {
    const result = await unwrapApi<VerifyOtpResponse>(
      axios.post(`${API_BASE_URL}/api/v1/auth/refresh-token`, { refreshToken }),
    );
    await saveTokens(result.accessToken, result.refreshToken);
    return result;
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      return {
        user: MOCK_DRIVER_USER,
        accessToken: 'mock-driver-token',
        refreshToken: 'mock-driver-token',
        expiresIn: '86400',
        onboardingRequired: false,
      };
    }
    throw error;
  }
}

export type { User };
