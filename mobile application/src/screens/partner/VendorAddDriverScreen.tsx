import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DriverRegistrationFlowScreen from './registration/driver/DriverRegistrationFlowScreen';
import type { PartnerJobsStackParamList } from '../../types/partnerNavigation';

type Props = NativeStackScreenProps<PartnerJobsStackParamList, 'VendorAddDriver'>;

/**
 * Vendor “Add driver” uses the same Driver registration screens a driver
 * fills during onboarding: Personal information → Documents → Review.
 * Submit stays on the vendor account and creates a staff driver.
 */
export default function VendorAddDriverScreen({ navigation }: Props) {
  return (
    <DriverRegistrationFlowScreen
      navigation={navigation as never}
      route={
        {
          key: 'vendor-staff-driver-registration',
          name: 'DriverPersonalInfo',
          params: {
            role: 'driver',
            vendorStaffOnboarding: true,
            initialStep: 1,
          },
        } as never
      }
    />
  );
}
