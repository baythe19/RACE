import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/auth/SplashScreen';
import AuthNavigator from './AuthNavigator';
import { MainTabNavigator } from './AppNavigator';
import { useAuthSessionSync } from '../hooks/useAuthSessionSync';
import { useAppSelector } from '../redux/hooks';
import { useAuthStore } from '../store/authStore';
import type { RootStackParamList } from '../types/navigation';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

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

export default function RootNavigator() {
  useAuthSessionSync();

  const accessToken = useAppSelector(state => state.auth.accessToken);
  const isAuthenticated = useAuthStore(
    state => state.isAuthenticated && Boolean(accessToken),
  );
  const onboardingRequired = useAuthStore(state => state.onboardingRequired);
  const canEnterApp = isAuthenticated && !onboardingRequired;

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          // No native push/scale — SoftScreenFade is opacity-only.
          animation: 'none',
          contentStyle: { backgroundColor: colors.pageBg },
          statusBarAnimation: 'fade',
        }}>
        {canEnterApp ? (
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ animation: 'fade', animationDuration: 280 }}
          />
        ) : (
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen
              name="Auth"
              component={AuthNavigator}
              options={{
                // Keep Splash painted underneath so SoftScreenFade can crossfade
                // instead of flashing pageBg white between screens.
                presentation: 'transparentModal',
                animation: 'none',
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export function AuthBootstrapLoader() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
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
