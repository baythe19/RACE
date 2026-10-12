import React, { Suspense } from 'react';
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
import WrongAppRoleScreen from '../screens/partner/auth/WrongAppRoleScreen';
import type { PartnerRootStackParamList } from '../types/partnerNavigation';
import { colors } from '../theme';

const PartnerNavigator = React.lazy(() => import('./PartnerNavigator'));

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
  const enterMain =
    Boolean(accessToken) &&
    isAuthenticated &&
    !onboardingRequired &&
    (user?.role === 'driver' || user?.role === 'vendor');
  const showWrongApp =
    Boolean(accessToken) && isAuthenticated && user?.role === 'customer';

  if (isLoading) {
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
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {enterMain ? (
          <RootStack.Screen name="PartnerMain">
            {() => (
              <Suspense
                fallback={
                  <View style={styles.loader}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                }>
                <PartnerNavigator />
              </Suspense>
            )}
          </RootStack.Screen>
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
