import React, { useState } from 'react';
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
import { ArrowRight, Building2 } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { images } from '../../../assets';
import PartnerHeaderLogo from '../../../components/partner/PartnerHeaderLogo';
import { useAppDispatch } from '../../../redux/hooks';
import { setSignupPath } from '../../../redux/onboarding/onboardingSlice';
import {
  usePartnerOnboardingStore,
  type PartnerRole,
} from '../../../store/partnerOnboardingStore';
import type { PartnerAuthStackParamList } from '../../../types/partnerNavigation';
import { loginAsMockDriver, loginAsMockVendor, UI_PREVIEW_MODE } from '../../../config/uiPreviewMode';

type Props = NativeStackScreenProps<PartnerAuthStackParamList, 'PartnerWelcome'>;

const REF_W = 390;

export default function PartnerWelcomeScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = width / REF_W;
  const px = (value: number) => Math.max(1, Math.round(value * scale));

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

  const handleContinue = () => {
    setSelectedRole(selectedRole);
    dispatch(setSignupPath({ accountType: selectedRole, vendorType: null }));

    if (selectedRole === 'driver') {
      // Driver flow routes to Driver Type selection (Self vs Vendor Driver)
      navigation.navigate('PartnerDriverAuthMode');
    } else {
      // Vendor flow routes directly to Mobile OTP login
      navigation.navigate('PartnerLogin', { role: 'vendor' });
    }
  };

  const isDriver = selectedRole === 'driver';
  const isVendor = selectedRole === 'vendor';

  // Hero image natural aspect ratio (1760 x 894)
  const heroHeight = Math.round(width * (894 / 1760));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header Bar — Perfectly aligned across all auth screens */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + px(4),
            paddingHorizontal: px(20),
            height: insets.top + px(54),
          },
        ]}>
        <View style={{ width: px(32) }} />

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
        {/* Welcome Headlines with Bold Typography */}
        <View style={[styles.headingBlock, { marginTop: px(8), paddingHorizontal: px(20) }]}>
          <Text style={[styles.welcomeTitle, { fontSize: px(28), lineHeight: px(34) }]}>
            Welcome to
          </Text>
          <Text style={[styles.brandHighlight, { fontSize: px(28), lineHeight: px(34) }]}>
            RACE Partner
          </Text>
          <Text style={[styles.subtitle, { fontSize: px(14.5), marginTop: px(6) }]}>
            Choose how you work with RACE.
          </Text>
        </View>

        {/* Hero Artwork Image — Full Width Edge-to-Edge Fit */}
        <View style={[styles.artworkContainer, { height: heroHeight, marginTop: px(14) }]}>
          <Image
            source={images.partnerWelcomeHero}
            style={[styles.heroImage, { width, height: heroHeight }]}
            resizeMode="cover"
            accessibilityLabel="RACE Partner Drivers and Fleet Illustration"
          />
        </View>

        {/* Content Section with Screen Padding */}
        <View style={[styles.contentSection, { paddingHorizontal: px(20) }]}>
          {/* "I'm joining as" Section */}
          <View style={[styles.roleSection, { marginTop: px(16) }]}>
            <Text style={[styles.sectionTitle, { fontSize: px(17) }]}>I'm joining as</Text>

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
              accessibilityLabel="Driver: Accept jobs and manage your trips">
              {/* Premium Tow Truck Icon Badge */}
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
                <Text style={[styles.roleTitle, { fontSize: px(16.5) }]}>Driver</Text>
                <Text style={[styles.roleSubtitle, { fontSize: px(13.5), marginTop: px(3) }]}>
                  Accept jobs and manage your trips
                </Text>
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

            {/* Option 2: Vendor / Fleet */}
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
              accessibilityLabel="Vendor / Fleet: Manage vehicles, drivers and bookings">
              {/* Premium Fleet Headquarters Building Badge */}
              <View
                style={[
                  styles.iconBox,
                  {
                    width: px(52),
                    height: px(52),
                    borderRadius: px(14),
                    backgroundColor: '#F3F4F6',
                  },
                ]}>
                <Building2 size={px(27)} color="#374151" strokeWidth={2.3} />
              </View>

              <View style={styles.roleTextContainer}>
                <Text style={[styles.roleTitle, { fontSize: px(16.5) }]}>Vendor / Fleet</Text>
                <Text style={[styles.roleSubtitle, { fontSize: px(13.5), marginTop: px(3) }]}>
                  Manage vehicles, drivers and bookings
                </Text>
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
            accessibilityLabel={`Continue as ${isVendor ? 'Vendor' : 'Driver'}`}>
            <Text style={[styles.primaryButtonText, { fontSize: px(16.5) }]}>
              {isVendor ? 'Continue as Vendor' : 'Continue as Driver'}
            </Text>
            <ArrowRight size={px(20)} color="#111827" strokeWidth={2.6} style={{ marginLeft: px(8) }} />
          </Pressable>

          {/* Terms & Privacy Policy Footer */}
          <View style={[styles.termsFooter, { marginTop: px(14) }]}>
            <Text style={[styles.termsText, { fontSize: px(12.5) }]}>
              By continuing, you agree to our{' '}
              <Text style={styles.termsLink}>Terms & Privacy Policy</Text>
            </Text>
          </View>

          {/* Discreet Dev Demo Mode (for offline QA testing) */}
          {(__DEV__ || UI_PREVIEW_MODE) && (
            <View style={[styles.demoRow, { marginTop: px(12) }]}>
              <Text style={[styles.demoLabel, { fontSize: px(10) }]}>Demo View:</Text>
              <Pressable
                onPress={() => void loginAsMockDriver(dispatch)}
                style={styles.demoLink}>
                <Text style={styles.demoLinkText}>Driver</Text>
              </Pressable>
              <Text style={styles.demoDivider}>•</Text>
              <Pressable
                onPress={() => void loginAsMockVendor(dispatch)}
                style={styles.demoLink}>
                <Text style={styles.demoLinkText}>Vendor</Text>
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
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  brandHighlight: {
    fontWeight: '800',
    color: '#F59E0B',
    textAlign: 'center',
  },
  subtitle: {
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
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
    fontWeight: '800',
    color: '#111827',
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
    fontWeight: '800',
    color: '#111827',
  },
  roleSubtitle: {
    fontWeight: '400',
    color: '#6B7280',
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
    fontWeight: '800',
    color: '#111827',
  },
  termsFooter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsText: {
    color: '#6B7280',
    textAlign: 'center',
  },
  termsLink: {
    color: '#D97706',
    fontWeight: '600',
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
    fontWeight: '600',
  },
  demoLink: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  demoLinkText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  demoDivider: {
    color: '#D1D5DB',
    fontSize: 10,
  },
  pressed: {
    opacity: 0.88,
  },
});
