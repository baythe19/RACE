import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PartnerLoginScreen from '../screens/partner/auth/PartnerLoginScreen';
import PartnerOtpVerificationScreen from '../screens/partner/auth/PartnerOtpVerificationScreen';
import PartnerDriverAuthModeScreen from '../screens/partner/auth/PartnerDriverAuthModeScreen';
import PartnerVendorDriverLoginScreen from '../screens/partner/auth/PartnerVendorDriverLoginScreen';
import PartnerRoleSelectionScreen from '../screens/partner/auth/PartnerRoleSelectionScreen';
import PartnerSplashScreen from '../screens/partner/auth/PartnerSplashScreen';
import PartnerWelcomeScreen from '../screens/partner/auth/PartnerWelcomeScreen';
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
      initialRouteName={partnerAuthEntry}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}>
      <Stack.Screen name="PartnerSplash" component={PartnerSplashScreen} />
      <Stack.Screen name="PartnerWelcome" component={PartnerWelcomeScreen} />
      <Stack.Screen name="PartnerRoleSelection" component={PartnerWelcomeScreen as any} />
      <Stack.Screen name="PartnerDriverAuthMode" component={PartnerDriverAuthModeScreen} />
      <Stack.Screen name="PartnerVendorDriverLogin" component={PartnerVendorDriverLoginScreen} />
      <Stack.Screen name="PartnerLogin" component={PartnerLoginScreen} />
      <Stack.Screen name="PartnerOtpVerification" component={PartnerOtpVerificationScreen} />
    </Stack.Navigator>
  );
}
