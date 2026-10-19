import { PartnerText } from '../../../components/partner/PartnerText';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  CircleUser,
  Send,
  Shield,
  Smartphone,
  Users,
  Wallet,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { images } from '../../../assets';
import PartnerRoleCard from '../../../components/partner/PartnerRoleCard';
import { useAppDispatch } from '../../../redux/hooks';
import { setSignupPath } from '../../../redux/onboarding/onboardingSlice';
import {
  usePartnerOnboardingStore,
  type PartnerRole,
} from '../../../store/partnerOnboardingStore';
import type { PartnerAuthStackParamList } from '../../../types/partnerNavigation';
import { colors, layout, spacing, typography } from '../../../theme';

type Props = NativeStackScreenProps<PartnerAuthStackParamList, 'PartnerRoleSelection'>;

const REF_W = 390;
const LINK_BLUE = '#2563EB';
const PAGE_BG = '#F7F7F5';

const ROLE_OPTIONS = [
  {
    role: 'driver' as const,
    title: 'Driver',
    description:
      'Drive & Earn — Full-Time or Part-Time flexible driver jobs. No personal vehicle needed.',
    Icon: CircleUser,
    features: [
      { label: 'Full-Time & Part-Time driver jobs', Icon: Smartphone },
      { label: 'Connect with Towing Vendors (Full-Time)', Icon: Users },
      { label: 'Weekly automated payouts', Icon: Wallet },
    ],
  },
  {
    role: 'vendor' as const,
    title: 'Towing Vendor',
    description:
      'Fleet & Business — Own tow trucks, manage fleet drivers, and fulfill roadside towing jobs.',
    Icon: Building2,
    features: [
      { label: 'Register & manage tow trucks', Icon: Shield },
      { label: 'Invite & assign verified drivers', Icon: Users },
      { label: 'Live job tracking & business analytics', Icon: BarChart3 },
    ],
  },
];

export default function PartnerRoleSelectionScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / REF_W;
  const px = (value: number) => Math.max(1, Math.round(value * scale));

  const storedRole = usePartnerOnboardingStore((state) => state.selectedRole);
  const setSelectedRole = usePartnerOnboardingStore((state) => state.setSelectedRole);
  const [selectedRole, setLocalRole] = useState<PartnerRole | null>(storedRole ?? 'driver');

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'PartnerLogin' }],
    });
  };

  const persistRoleAndContinue = (role: PartnerRole) => {
    setSelectedRole(role);
    dispatch(
      setSignupPath({
        accountType: role,
        vendorType: null,
      }),
    );
    usePartnerRegistrationStore.getState().setRole(role);

    const rootNavigation =
      navigation.getParent<NativeStackScreenProps<PartnerRootStackParamList>['navigation']>();
    if (rootNavigation) {
      rootNavigation.navigate('PartnerRegistration', { role });
    } else {
      (navigation as any).navigate('PartnerRegistration', { role });
    }
  };

  const handleContinue = () => {
    if (!selectedRole) return;
    persistRoleAndContinue(selectedRole);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={PAGE_BG} />

      <View style={[styles.topBar, { paddingHorizontal: px(layout.screenPadding) }]}>
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <ArrowLeft size={22} color={colors.dark} strokeWidth={2.5} />
        </Pressable>

        <View style={styles.brandBlock}>
          <PartnerText style={[styles.brandRace, { fontSize: px(18), lineHeight: px(22) }]}>RACE</PartnerText>
          <PartnerText style={[styles.brandPartner, { fontSize: px(11), lineHeight: px(14) }]}>
            PARTNER
          </PartnerText>
        </View>

        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: px(layout.screenPadding),
            paddingBottom: insets.bottom + px(spacing.xl),
          },
        ]}>
        <View style={[styles.hero, { marginTop: px(spacing.md) }]}>
          <Image
            source={images.homeHeroTruck}
            style={[styles.heroImage, { height: px(140) }]}
            resizeMode="contain"
            accessibilityLabel="RACE Partner tow truck"
          />
          <PartnerText style={[styles.headline, { fontSize: px(28), lineHeight: px(34), marginTop: px(8) }]}>
            Select your role
          </PartnerText>
          <PartnerText style={[styles.subtitle, { fontSize: px(14), lineHeight: px(21), marginTop: px(8) }]}>
            This decides which registration and dashboard you see. You can change this anytime
            later.
          </PartnerText>
        </View>

        <View style={{ marginTop: px(spacing.xl), gap: px(4) }}>
          {ROLE_OPTIONS.map((option) => (
            <PartnerRoleCard
              key={option.role}
              role={option.role}
              title={option.title}
              description={option.description}
              Icon={option.Icon}
              features={option.features}
              selected={selectedRole === option.role}
              onPress={() => setLocalRole(option.role)}
            />
          ))}
        </View>

        <Pressable
          disabled={!selectedRole}
          onPress={handleContinue}
          style={({ pressed }) => [
            styles.continueButton,
            {
              marginTop: px(spacing.lg),
              minHeight: px(54),
              borderRadius: px(14),
            },
            !selectedRole && styles.continueButtonDisabled,
            pressed && selectedRole && styles.pressed,
          ]}>
          <PartnerText
            style={[
              styles.continueLabel,
              { fontSize: px(17) },
              !selectedRole && styles.continueLabelDisabled,
            ]}>
            Continue
          </PartnerText>
          <ArrowRight
            size={px(18)}
            color={!selectedRole ? colors.grey : colors.dark}
            strokeWidth={2.5}
          />
        </Pressable>

        <PartnerText style={[styles.helpText, { fontSize: px(13), lineHeight: px(20), marginTop: px(14) }]}>
          Not sure? You can change your role anytime from{' '}
          <PartnerText style={styles.helpLink}>Account settings.</PartnerText>
        </PartnerText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBlock: { alignItems: 'center' },
  brandRace: {
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  brandPartner: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.6,
  },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  hero: { alignItems: 'center' },
  heroImage: { width: '100%', maxWidth: 280 },
  headline: {
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.grey,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
  },
  continueButtonDisabled: { backgroundColor: colors.border },
  continueLabel: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  continueLabelDisabled: { color: colors.grey },
  helpText: {
    color: colors.grey,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  helpLink: {
    color: LINK_BLUE,
    fontWeight: typography.weights.semibold,
  },
  pressed: { opacity: 0.9 },
});
