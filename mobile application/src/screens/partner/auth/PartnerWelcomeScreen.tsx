import React from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { images } from '../../../assets';
import PartnerWelcomeTrustCard from '../../../components/partner/PartnerWelcomeTrustCard';
import type { PartnerAuthStackParamList } from '../../../types/partnerNavigation';
import { colors, layout, radius, spacing, typography } from '../../../theme';
import { useAppDispatch } from '../../../redux/hooks';
import { loginAsMockDriver, loginAsMockVendor } from '../../../config/uiPreviewMode';

type Props = NativeStackScreenProps<PartnerAuthStackParamList, 'PartnerWelcome'>;

const REF_W = 390;

export default function PartnerWelcomeScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = width / REF_W;
  const px = (value: number) => Math.round(value * scale);

  const goToRoleSelection = () => navigation.navigate('PartnerRoleSelection');
  const goToLogin = () => navigation.navigate('PartnerLogin');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView
        style={styles.scroll}
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + px(spacing.xxxl),
            paddingBottom: insets.bottom + px(spacing.lg),
            paddingHorizontal: px(layout.screenPadding),
          },
        ]}>
        <View style={[styles.mainBlock, { paddingVertical: px(spacing.xxl) }]}>
          <View style={styles.titleSection}>
            <Text style={[styles.titleLead, { fontSize: px(18) }]}>Welcome to</Text>
            <Text style={[styles.titleAccent, { fontSize: px(32), lineHeight: px(40), marginTop: px(2) }]}>
              RACE Service
            </Text>
            <View style={[styles.accentLine, { width: px(48), marginTop: px(10) }]} />
            <Text style={[styles.subtitle, { fontSize: px(14), lineHeight: px(21), marginTop: px(12) }]}>
              Your trusted partner for managing your business and deliveries seamlessly.
            </Text>
          </View>

          <View style={[styles.illustrationWrap, { marginTop: px(spacing.xl) }]}>
            <Image
              source={images.partnerWelcomeIllustration}
              style={[styles.illustration, { height: px(220) }]}
              resizeMode="contain"
              accessibilityLabel="RACE partner and customer service illustration"
            />
          </View>

          <View style={{ marginTop: px(spacing.lg) }}>
            <PartnerWelcomeTrustCard />
          </View>

          <View style={[styles.actions, { marginTop: px(spacing.xl), gap: px(12) }]}>
            <Pressable
              onPress={goToRoleSelection}
              style={({ pressed }) => [
                styles.primaryButton,
                { borderRadius: px(10), minHeight: px(52) },
                pressed && styles.buttonPressed,
              ]}>
              <Text style={[styles.primaryButtonLabel, { fontSize: px(17) }]}>Get Started</Text>
            </Pressable>

            <Pressable
              onPress={goToLogin}
              style={({ pressed }) => [
                styles.outlineButton,
                { borderRadius: px(10), minHeight: px(52) },
                pressed && styles.buttonPressed,
              ]}>
              <Text style={[styles.outlineButtonLabel, { fontSize: px(17) }]}>Login</Text>
            </Pressable>
          </View>

          {/* Instant Demo Preview Entry */}
          <View style={[styles.demoCard, { marginTop: px(spacing.lg), padding: px(14), borderRadius: px(12) }]}>
            <Text style={[styles.demoTitle, { fontSize: px(11) }]}>⚡ INSTANT FRONTEND PREVIEW</Text>
            <Text style={[styles.demoSubtitle, { fontSize: px(12), marginTop: px(2) }]}>
              Test full UI with mock data without backend:
            </Text>
            <View style={{ flexDirection: 'row', gap: px(8), marginTop: px(10) }}>
              <Pressable
                onPress={() => void loginAsMockDriver(dispatch)}
                style={({ pressed }) => [styles.demoButton, pressed && styles.buttonPressed]}>
                <Text style={styles.demoButtonText}>🚗 Driver View</Text>
              </Pressable>
              <Pressable
                onPress={() => void loginAsMockVendor(dispatch)}
                style={({ pressed }) => [styles.demoButton, pressed && styles.buttonPressed]}>
                <Text style={styles.demoButtonText}>🏢 Vendor View</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Pressable
          onPress={goToRoleSelection}
          style={({ pressed }) => [styles.footerLink, pressed && styles.buttonPressed]}>
          <Text style={[styles.footerText, { fontSize: px(14) }]}>
            New here?{' '}
            <Text style={styles.footerLinkText}>Create an account ›</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  mainBlock: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  titleSection: {
    alignItems: 'center',
  },
  titleLead: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  titleAccent: {
    color: colors.primary,
    fontWeight: typography.weights.extrabold,
    textAlign: 'center',
  },
  accentLine: {
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  subtitle: {
    color: colors.grey,
    fontWeight: typography.weights.regular,
    textAlign: 'center',
    maxWidth: 300,
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  illustration: {
    width: '100%',
  },
  actions: {},
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  primaryButtonLabel: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  outlineButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  outlineButtonLabel: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  demoCard: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  demoTitle: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.8,
  },
  demoSubtitle: {
    color: colors.grey,
  },
  demoButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoButtonText: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: 13,
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  footerLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  footerText: {
    color: colors.dark,
    textAlign: 'center',
  },
  footerLinkText: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
});
