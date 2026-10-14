import { PartnerText } from '../../../components/partner/PartnerText';
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import PartnerBrandLogo from '../../../components/partner/PartnerBrandLogo';
import PartnerPageDots from '../../../components/partner/PartnerPageDots';
import PrimaryButton from '../../../components/ui/PrimaryButton';
import { useAuthStore } from '../../../store/authStore';
import { shouldUsePartnerExperience } from '../../../utils/roleRouting';
import type {
  PartnerAuthStackParamList,
  PartnerRootStackParamList,
} from '../../../types/partnerNavigation';
import { colors, spacing, typography } from '../../../theme';

const FADE_IN_MS = 900;

type PartnerSplashNav = NativeStackNavigationProp<PartnerAuthStackParamList, 'PartnerSplash'>;
type PartnerRootNav = NativeStackNavigationProp<PartnerRootStackParamList>;

export default function PartnerSplashScreen() {
  const navigation = useNavigation<PartnerSplashNav>();
  const rootNavigation = navigation.getParent<PartnerRootNav>();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  const handleContinue = useCallback(() => {
    if (isAuthenticated && shouldUsePartnerExperience(user, false)) {
      const routeNames = rootNavigation?.getState()?.routeNames;
      if (routeNames && routeNames.includes('PartnerMain')) {
        rootNavigation?.reset({
          index: 0,
          routes: [{ name: 'PartnerMain' }],
        });
      }
      return;
    }

    navigation.replace('PartnerWelcome');
  }, [isAuthenticated, navigation, rootNavigation, user]);

  useEffect(() => {
    const fadeIn = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: FADE_IN_MS,
      useNativeDriver: true,
    });

    fadeIn.start();

    const timer = setTimeout(() => {
      handleContinue();
    }, 1500);

    return () => {
      clearTimeout(timer);
      fadeAnim.stopAnimation();
    };
  }, [fadeAnim, handleContinue]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <Animated.View
        style={[
          styles.body,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom + spacing.xl,
            opacity: fadeAnim,
          },
        ]}>
        <View style={styles.centerBlock}>
          <PartnerBrandLogo />
          <PartnerText style={styles.appName}>RACE Service</PartnerText>
        </View>

        <View style={styles.footer}>
          <PartnerPageDots total={4} activeIndex={0} />
          <PrimaryButton label="Continue" onPress={handleContinue} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xxxl,
    justifyContent: 'space-between',
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  appName: {
    marginTop: spacing.xl,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.dark,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  footer: {
    gap: spacing.lg,
    width: '100%',
  },
});
