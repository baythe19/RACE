import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PartnerLoginScreen from '../screens/partner/auth/PartnerLoginScreen';
import PartnerOtpVerificationScreen from '../screens/partner/auth/PartnerOtpVerificationScreen';
import PartnerRoleSelectionScreen from '../screens/partner/auth/PartnerRoleSelectionScreen';
import PartnerSplashScreen from '../screens/partner/auth/PartnerSplashScreen';
import { useAuthStore } from '../store/authStore';
import type { PartnerAuthStackParamList } from '../types/partnerNavigation';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<PartnerAuthStackParamList>();

export default function PartnerAuthNavigator() {
  const partnerAuthEntry = useAuthStore(state => state.partnerAuthEntry);
  const clearPartnerAuthEntry = useAuthStore(state => state.clearPartnerAuthEntry);

  useEffect(() => {
    if (partnerAuthEntry === 'PartnerSplash') return;
    return () => {
      clearPartnerAuthEntry();
    };
  }, [clearPartnerAuthEntry, partnerAuthEntry]);

  return (
    <Stack.Navigator
      key={partnerAuthEntry}
      initialRouteName={partnerAuthEntry === 'PartnerSplash' ? 'PartnerSplash' : 'PartnerLogin'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}>
      <Stack.Screen name="PartnerSplash" component={PartnerSplashScreen} />
      <Stack.Screen name="PartnerLogin" component={PartnerLoginScreen} />
      <Stack.Screen name="PartnerOtpVerification" component={PartnerOtpVerificationScreen} />
      <Stack.Screen name="PartnerRoleSelection" component={PartnerRoleSelectionScreen} />
    </Stack.Navigator>
  );
}
