/**
 * Post-submit confirmation for a self-registering driver.
 *
 * Thin adapter: the screen itself lives in `components/partner/DriverVerificationView`
 * so the registration flow and the in-app gate render the exact same thing.
 *
 * The state is read from the backend (`/api/v1/profile` → `driverProfile.status`) —
 * a driver who was auto-approved (non-production) sees the approved state here
 * instead of a fixed "Under review" tracker.
 */

import React, { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DriverVerificationView from '../../../components/partner/DriverVerificationView';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { finishPartnerSignup } from '../../../redux/onboarding/onboardingSlice';
import { useDriverProfileQuery } from '../../../services/driver/useDriverQueries';
import type {
  PartnerRegistrationStackParamList,
  PartnerRootStackParamList,
} from '../../../types/partnerNavigation';
import { usePartnerRegistrationStore } from '../../../store/partnerRegistrationStore';
import { buildDriverVerification } from '../../../utils/driverVerification';

type Props = NativeStackScreenProps<
  PartnerRegistrationStackParamList,
  'DriverVerificationPending'
>;

export default function DriverVerificationPendingScreen({ navigation, route }: Props) {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector(state => state.auth.accessToken);
  const { data: profile, refetch, isRefetching } = useDriverProfileQuery();
  const { driverPersonal, driverVehicle, driverDocuments } = usePartnerRegistrationStore();

  const verification = useMemo(
    () =>
      buildDriverVerification(profile, {
        driverPersonal,
        driverVehicle,
        driverDocuments,
      }),
    [profile, driverPersonal, driverVehicle, driverDocuments],
  );

  const handleGoToDashboard = useCallback(() => {
    if (!accessToken) {
      // Never fabricate a session to get past the gate — without a token the
      // dashboard would be empty and every request would 401.
      Alert.alert(
        'Sign in required',
        'Sign in again to open your dashboard. Your application is already submitted.',
      );
      return;
    }

    dispatch(finishPartnerSignup());

    const rootNavigation =
      navigation.getParent<NativeStackScreenProps<PartnerRootStackParamList>['navigation']>();
    const routeNames = rootNavigation?.getState()?.routeNames;
    if (routeNames?.includes('PartnerMain')) {
      rootNavigation?.reset({ index: 0, routes: [{ name: 'PartnerMain' }] });
    }
  }, [accessToken, dispatch, navigation]);

  /** Registration stack still has the editable review step — keep it reachable. */
  const handleViewApplication = useCallback(() => {
    navigation.navigate('DriverReview', {
      role: route.params?.role ?? 'driver',
      mobileNumber: route.params?.mobileNumber,
    });
  }, [navigation, route.params?.mobileNumber, route.params?.role]);

  return (
    <DriverVerificationView
      verification={verification}
      onOpenDashboard={handleGoToDashboard}
      onOpenApplication={handleViewApplication}
      onRefresh={() => void refetch()}
      refreshing={isRefetching}
    />
  );
}
