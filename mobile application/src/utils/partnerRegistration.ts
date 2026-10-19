import type { NavigationProp } from '@react-navigation/native';

import {
  UI_PREVIEW_MODE,
  UI_PREVIEW_MUTATIONS_ENABLED,
  isUiTestPermissiveMode,
} from '../constants/preview';
import { usePartnerSelectStore } from '../store/partnerSelectStore';
import type {
  PartnerRegistrationStackParamList,
  PartnerRootStackParamList,
  PartnerRole,
} from '../types/partnerNavigation';

export function showSelectOptions(
  title: string,
  options: readonly string[],
  onSelect: (value: string) => void,
  selectedValue?: string,
) {
  usePartnerSelectStore.getState().open({
    title,
    options: [...options],
    selectedValue,
    onSelect,
  });
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidIndianPin(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}

/** UI preview / mock walkthroughs — skip harsh field validation and red error chrome. */
export function isPartnerRegistrationRelaxedValidation(): boolean {
  return UI_PREVIEW_MODE && (isUiTestPermissiveMode() || UI_PREVIEW_MUTATIONS_ENABLED);
}

const PREVIOUS_REGISTRATION_SCREEN: Partial<
  Record<keyof PartnerRegistrationStackParamList, keyof PartnerRegistrationStackParamList>
> = {
  VendorBusinessAddress: 'VendorBusinessInfo',
  VendorDocuments: 'VendorBusinessAddress',
  VendorReview: 'VendorDocuments',
  DriverVehicleInfo: 'DriverPersonalInfo',
  DriverDocuments: 'DriverVehicleInfo',
  DriverReview: 'DriverDocuments',
};

type RegistrationParams = { role: PartnerRole; mobileNumber?: string };

/** Avoids unhandled GO_BACK after OTP resets the root stack / hot reload. */
export function partnerRegistrationGoBack(
  navigation: NavigationProp<PartnerRegistrationStackParamList>,
  currentScreen: keyof PartnerRegistrationStackParamList,
  params: RegistrationParams,
) {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }

  const previous = PREVIOUS_REGISTRATION_SCREEN[currentScreen];
  if (previous) {
    navigation.navigate(previous, params);
    return;
  }

  const rootNavigation = navigation.getParent<NavigationProp<PartnerRootStackParamList>>();
  if (rootNavigation?.canGoBack()) {
    rootNavigation.goBack();
    return;
  }

  (rootNavigation as any)?.navigate('PartnerBootstrap', {
    screen: 'PartnerRoleSelection',
    params: { mobileNumber: params.mobileNumber },
  });
}
