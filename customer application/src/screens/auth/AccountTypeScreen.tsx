import React, { useCallback } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import SoftScreenFade from '../../components/auth/SoftScreenFade';
import { images } from '../../assets';
import { useAppDispatch } from '../../redux/hooks';
import { clearSignupPath, setSignupPath } from '../../redux/onboarding/onboardingSlice';
import type { AuthStackParamList } from '../../types/navigation';
import { colors, layout, radius, spacing, typography } from '../../theme';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'AccountType'>;

const REF_W = 390;

export default function AccountTypeScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / REF_W;
  const px = (n: number) => Math.max(1, Math.round(n * scale));

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      goBackWithinStack(navigation);
      return;
    }
    const parent = navigation.getParent();
    if (parent?.canGoBack()) {
      parent.goBack();
    }
  }, [navigation]);

  const canGoBack =
    navigation.canGoBack() || Boolean(navigation.getParent()?.canGoBack());

  const handleGetStarted = () => {
    dispatch(setSignupPath({ accountType: 'customer', vendorType: null }));
    navigation.navigate('MobileNumber');
  };

  const handleAlreadyUser = () => {
    dispatch(clearSignupPath());
    navigation.navigate('MobileNumber');
  };

  return (
    <SoftScreenFade duration={200} style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {canGoBack ? (
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [
            styles.backButton,
            {
              top: insets.top + px(spacing.sm),
              left: px(layout.screenPadding),
              width: px(40),
              height: px(40),
              borderRadius: px(20),
            },
            pressed && styles.pressed,
          ]}>
          <ArrowLeft size={22} color={colors.dark} strokeWidth={2.5} />
        </Pressable>
      ) : null}

      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            flexGrow: 1,
            paddingHorizontal: px(24),
            paddingBottom: insets.bottom + px(spacing.lg),
          },
        ]}>
        <Image
          source={images.logo}
          style={{ width: px(150), height: px(150 * (230 / 480)), alignSelf: 'center', marginTop: px(8) }}
          resizeMode="contain"
        />

        <Text
          style={[
            styles.heroTitle,
            { fontSize: px(26), lineHeight: px(32), marginTop: px(16) },
          ]}>
          Get Started{'\n'}with RACE Service
        </Text>
        <Text
          style={[
            styles.heroSubtitle,
            { fontSize: px(15), lineHeight: px(22), marginTop: px(8), paddingHorizontal: px(12) },
          ]}>
          Book towing, drivers, and roadside support in minutes.
        </Text>

        <View style={[styles.artWrap, { minHeight: px(200), marginTop: px(4) }]}>
          <Image
            source={images.homeHeroTruck}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
          />
        </View>

        <View style={[styles.actions, { marginTop: px(8), gap: px(10) }]}>
          <Pressable
            onPress={handleGetStarted}
            style={({ pressed }) => [
              styles.primaryButton,
              { minHeight: px(52), borderRadius: px(radius.pill) },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.primaryLabel, { fontSize: px(16) }]}>Get Started</Text>
          </Pressable>

          <Pressable
            onPress={handleAlreadyUser}
            style={({ pressed }) => [
              styles.secondaryButton,
              { minHeight: px(52), borderRadius: px(radius.pill) },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.secondaryLabel, { fontSize: px(15) }]}>I'm Already a User</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => navigation.navigate('Onboarding')}
          style={({ pressed }) => [
            styles.footerLink,
            { marginTop: px(14), gap: px(2) },
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.footerText, { fontSize: px(13) }]}>See how RACE works</Text>
          <ChevronRight size={px(14)} color={colors.primaryDark} strokeWidth={2.2} />
        </Pressable>
      </ScrollView>
    </SoftScreenFade>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.pageBg },
  content: { flexGrow: 1 },
  backButton: {
    position: 'absolute',
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  heroSubtitle: {
    color: colors.grey,
    textAlign: 'center',
    alignSelf: 'center',
  },
  artWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {},
  primaryButton: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    color: colors.dark,
    fontWeight: typography.weights.semibold,
  },
  secondaryButton: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    color: colors.dark,
    fontWeight: typography.weights.medium,
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  footerText: {
    color: colors.primaryDark,
    fontWeight: typography.weights.medium,
  },
  pressed: { opacity: 0.9 },
});
