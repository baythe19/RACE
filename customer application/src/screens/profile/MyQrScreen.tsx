import React from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import ProfileSubScreenLayout, { useProfilePx } from '../../components/profile/ProfileSubScreenLayout';
import DataSkeleton from '../../components/ui/DataSkeleton';
import VehicleEmergencyQrPanel from '../../components/vehicles/VehicleEmergencyQrPanel';
import { useVehicleQuery } from '../../services/vehicles/useVehicleQueries';
import type { ProfileStackParamList } from '../../types/navigation';
import { colors } from '../../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'MyQr'>;

export default function MyQrScreen({ route }: Props) {
  const px = useProfilePx();
  const { data: vehicle, isLoading, error } = useVehicleQuery(route.params.vehicleId);

  if (isLoading || !vehicle) {
    return (
      <ProfileSubScreenLayout title="My QR">
        <DataSkeleton variant="detail" />
      </ProfileSubScreenLayout>
    );
  }

  if (error) {
    return (
      <ProfileSubScreenLayout title="My QR">
        <Text style={{ color: colors.error, textAlign: 'center', marginTop: 24 }}>
          Unable to load QR
        </Text>
      </ProfileSubScreenLayout>
    );
  }

  return (
    <ProfileSubScreenLayout title="My QR">
      <VehicleEmergencyQrPanel vehicle={vehicle} px={px} showMeta />
    </ProfileSubScreenLayout>
  );
}
