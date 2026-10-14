/**
 * In-app verification gate for a driver whose account is not approved yet.
 *
 * Mounted as the initial route of the partner root stack whenever the backend
 * reports `driverProfile.status !== 'APPROVED'`, so an unapproved driver can never
 * land on the live dashboard first. The backend rejects availability, location and
 * job acceptance for these accounts (`assertDriverApproved`), so the dashboard is
 * genuinely read-only — this screen explains why instead of showing failed requests.
 *
 * Renders the same view as the post-registration screen.
 */

import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import DriverVerificationView from '../../../components/partner/DriverVerificationView';
import { useDriverProfileQuery } from '../../../services/driver/useDriverQueries';
import type { PartnerRootStackParamList } from '../../../types/partnerNavigation';
import { buildDriverVerification } from '../../../utils/driverVerification';

export default function DriverVerificationGateScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PartnerRootStackParamList>>();
  const { data: profile, refetch, isRefetching } = useDriverProfileQuery();

  const verification = useMemo(() => buildDriverVerification(profile), [profile]);

  const handleGoToDashboard = useCallback(() => {
    navigation.replace('PartnerMain');
  }, [navigation]);

  const handleEditPrevious = useCallback(() => {
    navigation.navigate('PartnerRegistration', { role: 'driver' });
  }, [navigation]);

  return (
    <DriverVerificationView
      verification={verification}
      onOpenDashboard={handleGoToDashboard}
      onOpenApplication={handleEditPrevious}
      onEditPrevious={handleEditPrevious}
      onRefresh={() => void refetch()}
      refreshing={isRefetching}
    />
  );
}
