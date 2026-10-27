import { PartnerText } from '../../../components/partner/PartnerText';
import React, { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { images } from '../../../assets';
import PartnerHeaderLogo from '../../../components/partner/PartnerHeaderLogo';
import { useAppDispatch } from '../../../redux/hooks';
import { setSignupPath } from '../../../redux/onboarding/onboardingSlice';
import {
  usePartnerOnboardingStore,
  type PartnerRole,
} from '../../../store/partnerOnboardingStore';
import { usePartnerRegistrationStore } from '../../../store/partnerRegistrationStore';
import type { PartnerAuthStackParamList, PartnerRootStackParamList } from '../../../types/partnerNavigation';
import { loginAsMockDriver, loginAsMockVendor } from '../../../config/uiPreviewMode';
import { UI_PREVIEW_MUTATIONS_ENABLED } from '../../../constants/preview';
import { typography } from '../../../theme';

type Props = NativeStackScreenProps<PartnerAuthStackParamList, 'PartnerRoleSelection'>;

const REF_W = 390;

export default function PartnerRoleSelectionScreen({ navigation, route }: Props) {
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = width / REF_W;
  const px = (value: number) => Math.max(1, Math.round(value * scale));

  const mobileNumber = route.params?.mobileNumber;
  const storedRole = usePartnerOnboardingStore((state) => state.selectedRole);
  const setSelectedRole = usePartnerOnboardingStore((state) => state.setSelectedRole);

  const [selectedRole, setLocalRole] = useState<PartnerRole>(
    storedRole === 'vendor' ? 'vendor' : 'driver',
  );

  const handleSelectRole = (role: PartnerRole) => {
    setLocalRole(role);
    setSelectedRole(role);
    dispatch(setSignupPath({ accountType: role, vendorType: null }));
  };

  /**
   * Back button on role selection cleanly resets to login.
   * Crucial invariant: never go back to the already-consumed OTP screen.
   */
  const handleBack = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'PartnerLogin' }],
    });
  };

  /**
   * Crucial invariant: Continue MUST take the user directly into the registration wizard.
   * Never loop back to Login or OTP.
   */
  const persistRoleAndContinue = (role: PartnerRole) => {
    setSelectedRole(role);
    dispatch(
      setSignupPath({
        accountType: role,
        vendorType: null,
      }),
    );
    usePartnerRegistrationStore.getState().setRole(role);
    if (mobileNumber) {
      usePartnerRegistrationStore.getState().setDriverPersonal({ mobileNumber });
      usePartnerRegistrationStore.getState().setVendorBusiness({ mobileNumber });
    }

    const rootNavigation =
      navigation.getParent<NativeStackScreenProps<PartnerRootStackParamList>['navigation']>();
    if (rootNavigation) {
      rootNavigation.navigate('PartnerRegistration', { role, mobileNumber });
    } else {
      (navigation as any).navigate('PartnerRegistration', { role, mobileNumber });
    }
  };

  const handleContinue = () => {
    persistRoleAndContinue(selectedRole);
  };

  const isDriver = selectedRole === 'driver';
  const isVendor = selectedRole === 'vendor';

  // Hero image natural aspect ratio (1760 x 894)
  const heroHeight = Math.round(width * (894 / 1760));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header Bar — Back button & Centered RACE Partner Logo */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + px(4),
            paddingHorizontal: px(20),
            height: insets.top + px(54),
          },
        ]}>
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <ArrowLeft size={px(24)} color="#111827" strokeWidth={2.4} />
        </Pressable>

        <View style={styles.headerLogoContainer}>
          <PartnerHeaderLogo width={px(104)} />
        </View>

        <View style={{ width: px(32) }} />
      </View>

      <ScrollView
        style={styles.scroll}
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + px(16),
          },
        ]}>
        {/* Role selection headlines */}
        <View style={[styles.headingBlock, { marginTop: px(8), paddingHorizontal: px(20) }]}>
          <PartnerText style={[styles.brandPartner, { fontSize: px(26), lineHeight: px(32) }]}>
            Choose Your Partner Role
          </PartnerText>
          <PartnerText style={[styles.subtitle, { fontSize: px(14), marginTop: px(6) }]}>
            Tell us who you are so we can set up the right tools for your work.
          </PartnerText>
        </View>

        {/* Hero Artwork Image — Full Width Edge-to-Edge Fit */}
        <View
          style={[styles.artworkContainer, { height: heroHeight, marginTop: px(14), backgroundColor: '#FFFBEB' }]}
          testID="roleSelectionHero">
          <Image
            source={images.partnerWelcomeHero}
            style={[styles.heroImage, { width: '100%', height: '100%' }]}
            resizeMode="cover"
            fadeDuration={0}
            accessibilityLabel="RACE Partner Drivers and Fleet Illustration"
          />
        </View>

        {/* Content Section with Screen Padding */}
        <View style={[styles.contentSection, { paddingHorizontal: px(20) }]}>
          {/* Role Choice Section */}
          <View style={[styles.roleSection, { marginTop: px(16) }]}>
            <PartnerText style={[styles.sectionTitle, { fontSize: px(16) }]}>
              Select your work profile
            </PartnerText>

            {/* Option 1: Driver */}
            <Pressable
              onPress={() => handleSelectRole('driver')}
              style={({ pressed }) => [
                styles.roleCard,
                isDriver ? styles.roleCardSelected : styles.roleCardUnselected,
                { minHeight: px(82), padding: px(16), borderRadius: px(18), marginTop: px(12) },
                pressed && styles.pressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: isDriver }}
              accessibilityLabel="Driver: Drive full-time for a fleet or accept direct customer driver hire requests">
              {/* Tow Truck Icon Badge */}
              <View
                style={[
                  styles.iconBox,
                  {
                    width: px(52),
                    height: px(52),
                    borderRadius: px(14),
                    backgroundColor: '#FEF3C7',
                  },
                ]}>
                <Image
                  source={images.icons.truck}
                  style={{ width: px(40), height: px(26) }}
                  resizeMode="contain"
                  accessibilityLabel="Tow Truck"
                />
              </View>

              <View style={styles.roleTextContainer}>
                <PartnerText style={[styles.roleTitle, { fontSize: px(16.5) }]}>Driver</PartnerText>
                <PartnerText style={[styles.roleSubtitle, { fontSize: px(13), marginTop: px(3) }]}>
                  Drive full-time for a fleet or accept direct customer driver hire requests
                </PartnerText>
              </View>

              {/* Radio Circle */}
              <View
                style={[
                  styles.radioOuter,
                  isDriver ? styles.radioOuterSelected : styles.radioOuterUnselected,
                  { width: px(22), height: px(22), borderRadius: px(11) },
                ]}>
                {isDriver ? (
                  <View
                    style={[
                      styles.radioInnerSelected,
                      { width: px(11), height: px(11), borderRadius: px(5.5) },
                    ]}
                  />
                ) : null}
              </View>
            </Pressable>

            {/* Option 2: Towing Vendor */}
            <Pressable
              onPress={() => handleSelectRole('vendor')}
              style={({ pressed }) => [
                styles.roleCard,
                isVendor ? styles.roleCardSelected : styles.roleCardUnselected,
                { minHeight: px(82), padding: px(16), borderRadius: px(18), marginTop: px(12) },
                pressed && styles.pressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: isVendor }}
              accessibilityLabel="Towing Vendor: Manage towing trucks, dispatch emergency jobs, and add fleet drivers">
              {/* Tow Truck Artwork Badge (matches Driver card style) */}
              <View
                style={[
                  styles.iconBox,
                  {
                    width: px(52),
                    height: px(52),
                    borderRadius: px(14),
                    backgroundColor: '#FEF3C7',
                  },
                ]}>
                <Image
                  source={images.icons.towing}
                  style={{ width: px(40), height: px(26) }}
                  resizeMode="contain"
                  accessibilityLabel="Towing Vendor"
                />
              </View>

              <View style={styles.roleTextContainer}>
                <PartnerText style={[styles.roleTitle, { fontSize: px(16.5) }]}>Towing Vendor</PartnerText>
                <PartnerText style={[styles.roleSubtitle, { fontSize: px(13), marginTop: px(3) }]}>
                  Manage towing trucks, dispatch emergency jobs, and add fleet drivers
                </PartnerText>
              </View>

              {/* Radio Circle */}
              <View
                style={[
                  styles.radioOuter,
                  isVendor ? styles.radioOuterSelected : styles.radioOuterUnselected,
                  { width: px(22), height: px(22), borderRadius: px(11) },
                ]}>
                {isVendor ? (
                  <View
                    style={[
                      styles.radioInnerSelected,
                      { width: px(11), height: px(11), borderRadius: px(5.5) },
                    ]}
                  />
                ) : null}
              </View>
            </Pressable>
          </View>

          {/* Primary CTA Button */}
          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.primaryButton,
              { minHeight: px(52), borderRadius: px(14), marginTop: px(20) },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Continue as ${isVendor ? 'Towing Vendor' : 'Driver'}`}>
            <PartnerText style={[styles.primaryButtonText, { fontSize: px(16.5) }]}>
              {isVendor ? 'Continue as Towing Vendor' : 'Continue as Driver'}
            </PartnerText>
            <ArrowRight size={px(20)} color="#111827" strokeWidth={2.6} style={{ marginLeft: px(8) }} />
          </Pressable>

          {/* Terms & Privacy Policy Footer */}
          <View style={[styles.termsFooter, { marginTop: px(14) }]}>
            <PartnerText style={[styles.termsText, { fontSize: px(12.5) }]}>
              By continuing, you agree to our{' '}
              <PartnerText style={styles.termsLink}>Terms & Privacy Policy</PartnerText>
            </PartnerText>
            <Pressable
              onPress={() => void Linking.openURL('https://www.raceservice.in/terms.html')}
              hitSlop={8}
              accessibilityRole="link"
              accessibilityLabel="Read Terms and Privacy Policy"
              style={({ pressed }) => [styles.termsLinkBtn, pressed && styles.pressed]}>
              <PartnerText style={[styles.termsLink, { fontSize: px(12.5) }]}>
                Read full terms ↗
              </PartnerText>
            </Pressable>
          </View>

          {/* Discreet Dev Demo Mode (for offline QA testing) */}
          {UI_PREVIEW_MUTATIONS_ENABLED && (
            <View style={[styles.demoRow, { marginTop: px(12) }]}>
              <PartnerText style={[styles.demoLabel, { fontSize: px(10) }]}>Demo View:</PartnerText>
              <Pressable
                onPress={() => void loginAsMockDriver(dispatch)}
                style={styles.demoLink}>
                <PartnerText style={styles.demoLinkText}>Driver</PartnerText>
              </Pressable>
              <PartnerText style={styles.demoDivider}>•</PartnerText>
              <Pressable
                onPress={() => void loginAsMockVendor(dispatch)}
                style={styles.demoLink}>
                <PartnerText style={styles.demoLinkText}>Vendor</PartnerText>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headingBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    color: '#111827',
    textAlign: 'center',
    fontWeight: typography.weights.medium,
  },
  brandPartner: {
    color: '#111827',
    textAlign: 'center',
    fontWeight: typography.weights.semibold,
  },
  subtitle: {
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: typography.weights.regular,
  },
  artworkContainer: {
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  heroImage: {
    width: '100%',
  },
  contentSection: {
    width: '100%',
  },
  roleSection: {
    width: '100%',
  },
  sectionTitle: {
    color: '#111827',
    fontWeight: typography.weights.semibold,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleCardSelected: {
    backgroundColor: '#FFFDF5',
    borderWidth: 1.8,
    borderColor: '#F59E0B',
  },
  roleCardUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTextContainer: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  roleTitle: {
    color: '#111827',
    fontWeight: typography.weights.semibold,
  },
  roleSubtitle: {
    color: '#6B7280',
    fontWeight: typography.weights.regular,
  },
  radioOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  radioOuterSelected: {
    borderColor: '#F59E0B',
  },
  radioOuterUnselected: {
    borderColor: '#D1D5DB',
  },
  radioInnerSelected: {
    backgroundColor: '#F59E0B',
  },
  primaryButton: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#111827',
    fontWeight: typography.weights.semibold,
  },
  termsFooter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsLinkBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  termsText: {
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: typography.weights.regular,
  },
  termsLink: {
    color: '#D97706',
    fontWeight: typography.weights.semibold,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    opacity: 0.65,
  },
  demoLabel: {
    color: '#9CA3AF',
    fontWeight: typography.weights.semibold,
  },
  demoLink: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  demoLinkText: {
    fontSize: 11,
    color: '#6B7280',
    textDecorationLine: 'underline',
    fontWeight: typography.weights.semibold,
  },
  demoDivider: {
    color: '#D1D5DB',
    fontSize: 10,
    fontWeight: typography.weights.regular,
  },
  pressed: {
    opacity: 0.88,
  },
});
