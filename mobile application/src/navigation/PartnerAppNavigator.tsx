import React, { Suspense, useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../hooks/useAuth';
import { useAppSelector } from '../redux/hooks';
import { useAuthStore } from '../store/authStore';
import PartnerAuthNavigator from './PartnerAuthNavigator';
import { partnerNavigationRef } from './partnerNavigationRef';
import PartnerRegistrationNavigator from './PartnerRegistrationNavigator';
import PartnerSelectSheet from '../components/partner/PartnerSelectSheet';
import DriverVerificationGateScreen from '../screens/partner/driver/DriverVerificationGateScreen';
import WrongAppRoleScreen from '../screens/partner/auth/WrongAppRoleScreen';
import { useDriverProfileQuery } from '../services/driver/useDriverQueries';
import type { PartnerRootStackParamList } from '../types/partnerNavigation';
import { buildDriverVerification } from '../utils/driverVerification';
import { colors } from '../theme';

const PartnerNavigator = React.lazy(() => import('./PartnerNavigator'));

function PartnerMainSuspense() {
  return (
    <Suspense
      fallback={
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      }>
      <PartnerNavigator />
    </Suspense>
  );
}

const RootStack = createNativeStackNavigator<PartnerRootStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.cardBg,
    text: colors.dark,
    border: colors.border,
    notification: colors.error,
  },
};

export default function PartnerAppNavigator() {
  const { isLoading, isAuthenticated, onboardingRequired } = useAuth();
  const accessToken = useAppSelector(state => state.auth.accessToken);
  const user = useAppSelector(state => state.auth.user);
  const authSessionVersion = useAuthStore(state => state.authSessionVersion);
  const isDriver = user?.role === 'driver';
  const enterMain =
    Boolean(accessToken) &&
    isAuthenticated &&
    !onboardingRequired &&
    (user?.role === 'driver' || user?.role === 'vendor');
  const showWrongApp =
    Boolean(accessToken) && isAuthenticated && user?.role === 'customer';

  /**
   * A driver whose application is still being reviewed must not land on the live
   * dashboard: the backend blocks availability, location and job acceptance until
   * `driverProfile.status === 'APPROVED'`.
   */
  const { data: profile, isLoading: profileLoading } = useDriverProfileQuery(
    Boolean(enterMain) && isDriver,
  );
  const verification = useMemo(() => buildDriverVerification(profile), [profile]);
  const needsDriverGate =
    Boolean(enterMain) && isDriver && (!verification.known || !verification.isApproved);

  /** Approved while sitting on the gate (status polls every 60s) → enter the app. */
  useEffect(() => {
    if (needsDriverGate || !partnerNavigationRef.isReady()) return;
    if (partnerNavigationRef.getCurrentRoute()?.name === 'PartnerDriverVerification') {
      partnerNavigationRef.navigate('PartnerMain' as never);
    }
  }, [needsDriverGate]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Wait for the verification state before choosing the starting screen, so an
  // approved driver never sees the gate flash on launch.
  if (enterMain && isDriver && profileLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (showWrongApp) {
    return (
      <NavigationContainer theme={navigationTheme}>
        <WrongAppRoleScreen />
      </NavigationContainer>
    );
  }

  const navigatorKey = enterMain
    ? `partner-main-${authSessionVersion}`
    : `partner-auth-${authSessionVersion}`;

  return (
    <NavigationContainer key={navigatorKey} theme={navigationTheme} ref={partnerNavigationRef}>
      <PartnerSelectSheet />
      <RootStack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={
          enterMain
            ? needsDriverGate
              ? 'PartnerDriverVerification'
              : 'PartnerMain'
            : undefined
        }>
        {enterMain ? (
          <>
            <RootStack.Screen
              name="PartnerMain"
              component={PartnerMainSuspense}
            />
            <RootStack.Screen
              name="PartnerDriverVerification"
              component={DriverVerificationGateScreen}
            />
          </>
        ) : (
          <>
            <RootStack.Screen name="PartnerBootstrap" component={PartnerAuthNavigator} />
            <RootStack.Screen name="PartnerRegistration" component={PartnerRegistrationNavigator} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
