import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { setCredentials } from '../redux/auth/authSlice';
import type { AppDispatch } from '../redux/store';
import type { AuthStackParamList } from '../types/navigation';
import type { AuthUser } from '../types/auth';
import { UI_PREVIEW_MOBILE } from './uiPreviewMode';

type AuthNav = NativeStackNavigationProp<AuthStackParamList, keyof AuthStackParamList>;

const previewUserBase: AuthUser = {
  id: 'ui-preview-user',
  mobileNumber: `+91${UI_PREVIEW_MOBILE}`,
  role: 'customer',
  isVerified: true,
  isProfileCompleted: false,
};

export function ensurePreviewAuthSession(dispatch: AppDispatch, profileComplete = false) {
  dispatch(
    setCredentials({
      user: {
        ...previewUserBase,
        isProfileCompleted: profileComplete,
        fullName: profileComplete ? 'Preview User' : undefined,
      },
      accessToken: 'ui-preview-access',
      refreshToken: 'ui-preview-refresh',
      onboardingRequired: !profileComplete,
    }),
  );
}

export function previewAdvanceFromMobileNumber(
  navigation: AuthNav,
  dispatch: AppDispatch,
  isSignup: boolean,
) {
  ensurePreviewAuthSession(dispatch, false);
  navigation.navigate('OtpVerification', {
    mobileNumber: UI_PREVIEW_MOBILE,
    isExistingUser: !isSignup,
  });
}

export function previewAdvanceFromOtp(
  navigation: AuthNav,
  dispatch: AppDispatch,
  isExistingUser: boolean,
) {
  if (isExistingUser) {
    ensurePreviewAuthSession(dispatch, true);
    return;
  }
  ensurePreviewAuthSession(dispatch, false);
  navigation.replace('ProfileWizard');
}
