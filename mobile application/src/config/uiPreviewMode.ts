import type { AppDispatch } from '../redux/store';
import { setCredentials } from '../redux/auth/authSlice';
import { saveTokens } from '../services/api';
import {
  MOCK_DRIVER_USER,
  MOCK_VENDOR_USER,
} from '../data/mockPartnerData';
import { UI_PREVIEW_MUTATIONS_ENABLED } from '../constants/preview';

export { UI_PREVIEW_MODE } from '../constants/preview';

export async function loginAsMockDriver(dispatch: AppDispatch): Promise<void> {
  if (!UI_PREVIEW_MUTATIONS_ENABLED) return;
  const token = 'mock-driver-token';
  await saveTokens(token, token);
  dispatch(
    setCredentials({
      user: MOCK_DRIVER_USER,
      accessToken: token,
      refreshToken: token,
      onboardingRequired: false,
    }),
  );
}

export async function loginAsMockVendor(dispatch: AppDispatch): Promise<void> {
  if (!UI_PREVIEW_MUTATIONS_ENABLED) return;
  const token = 'mock-vendor-token';
  await saveTokens(token, token);
  dispatch(
    setCredentials({
      user: MOCK_VENDOR_USER,
      accessToken: token,
      refreshToken: token,
      onboardingRequired: false,
    }),
  );
}

export async function switchMockRole(
  dispatch: AppDispatch,
  targetRole: 'driver' | 'vendor',
): Promise<void> {
  if (targetRole === 'driver') {
    await loginAsMockDriver(dispatch);
  } else {
    await loginAsMockVendor(dispatch);
  }
}
