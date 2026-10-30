import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

import { API_BASE_URL, TOKEN_KEYS } from '../config/env';
import type { ApiErrorResponse, ApiSuccessResponse } from '../types/auth';
import { notifyUnauthorized } from './authSession';

export const api = axios.create({
  baseURL: API_BASE_URL,
  // 45s: Render free tier cold-start after sleep can take 30-50s; 15s caused
  // spurious "Network error" on the first Send OTP tap after inactivity.
  timeout: 45000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

const REFRESH_PATH = '/api/v1/auth/refresh-token';

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function processQueue(token: string | null) {
  refreshQueue.forEach(callback => callback(token));
  refreshQueue = [];
}

async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEYS.ACCESS);
}

async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEYS.REFRESH);
}

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS, accessToken);
  await SecureStore.setItemAsync(TOKEN_KEYS.REFRESH, refreshToken);
}

export async function clearTokens(): Promise<void> {
  await Promise.allSettled([
    SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS),
    SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH),
  ]);
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) {
    // Some axios request configs may not have `headers` initialized; ensure the
    // Authorization header is always attached.
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = await getRefreshToken();
    if (!refreshToken || refreshToken.startsWith('mock-')) {
      if (!refreshToken) {
        await clearTokens();
        notifyUnauthorized();
      }
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push(token => {
          if (!token) {
            reject(error);
            return;
          }
          if (!originalRequest.headers) {
            originalRequest.headers = {} as never;
          }
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const response = await axios.post<
        ApiSuccessResponse<{ accessToken: string; refreshToken: string }>
      >(`${API_BASE_URL}${REFRESH_PATH}`, { refreshToken });

      const { accessToken, refreshToken: newRefreshToken } = response.data.data;
      await saveTokens(accessToken, newRefreshToken);
      processQueue(accessToken);

      if (!originalRequest.headers) {
        originalRequest.headers = {} as never;
      }
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(null);
      await clearTokens();
      notifyUnauthorized();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    if (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')) {
      return `Server is slow to wake up (${API_BASE_URL}). Wait a few seconds and try again.`;
    }
    if (error.message === 'Network Error' || !error.response) {
      return `Network error — cannot reach ${API_BASE_URL}. Check internet and try again.`;
    }
    if (error.response?.status === 429) {
      return 'OTP limit reached. Try again in 1 hour.';
    }
    return error.response?.data?.message ?? error.message ?? fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export async function unwrapApi<T>(promise: Promise<{ data: ApiSuccessResponse<T> }>): Promise<T> {
  const response = await promise;
  return response.data.data;
}
