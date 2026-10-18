import { PartnerText } from '../../../components/partner/PartnerText';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { images } from '../../../assets';
import PartnerHeaderLogo from '../../../components/partner/PartnerHeaderLogo';
import { useAppDispatch } from '../../../redux/hooks';
import { setSignupPath } from '../../../redux/onboarding/onboardingSlice';
import { usePartnerOnboardingStore } from '../../../store/partnerOnboardingStore';
import type { PartnerAuthStackParamList } from '../../../types/partnerNavigation';

type Props = NativeStackScreenProps<PartnerAuthStackParamList, 'PartnerDriverAuthMode'>;

type DriverType = 'self' | 'vendor';

const REF_W = 390;

export default function PartnerDriverAuthModeScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / REF_W;
  const px = (value: number) => Math.max(1, Math.round(value * scale));
  const setSelectedRole = usePartnerOnboardingStore((state) => state.setSelectedRole);

  const [driverType, setDriverType] = useState<DriverType>('self');

  const handleContinue = () => {
    setSelectedRole('driver');
    dispatch(setSignupPath({ accountType: 'driver', vendorType: null }));

    if (driverType === 'vendor') {
      // Vendor Driver uses Login ID and Password
      navigation.navigate('PartnerVendorDriverLogin');
    } else {
      // Self Driver uses Mobile Number OTP login
      navigation.navigate('PartnerLogin', { role: 'driver' });
    }
  };

  const isSelf = driverType === 'self';
  const isVendorDriver = driverType === 'vendor';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header Bar — Exactly aligned across all auth screens */}
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
          onPress={() => navigation.goBack()}
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
            paddingHorizontal: px(20),
            paddingBottom: insets.bottom + px(24),
          },
        ]}>
        {/* Title & Subtitle (Left-aligned, clean and concise) */}
        <View style={[styles.headingBlock, { marginTop: px(16) }]}>
          <PartnerText style={[styles.mainTitle, { fontSize: px(28), lineHeight: px(34) }]}>
            Choose your
          </PartnerText>
          <PartnerText style={[styles.mainTitle, { fontSize: px(28), lineHeight: px(34) }]}>
            driver type
          </PartnerText>
          <PartnerText style={[styles.subtitle, { fontSize: px(14.5), marginTop: px(8) }]}>
            Select how you work with RACE.
          </PartnerText>
        </View>

        {/* Options List with Prominent Optimized Avatars (Instantly Loaded) */}
        <View style={[styles.cardsContainer, { marginTop: px(22) }]}>
          {/* Option 1: Self Driver */}
          <Pressable
            onPress={() => setDriverType('self')}
            style={({ pressed }) => [
              styles.optionCard,
              isSelf ? styles.optionCardSelected : styles.optionCardUnselected,
              { padding: px(16), borderRadius: px(20), minHeight: px(116) },
              pressed && styles.pressed,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelf }}>
            {/* Prominent High-Res Self Driver Avatar */}
            <View
              style={[
                styles.avatarBox,
                {
                  width: px(88),
                  height: px(88),
                  borderRadius: px(44),
                  backgroundColor: '#FEF3C7',
                },
              ]}>
              <Image
                source={images.selfDriverAvatar}
                style={{ width: px(88), height: px(88), borderRadius: px(44) }}
                resizeMode="cover"
                accessibilityLabel="Self Driver"
              />
            </View>

            <View style={styles.cardTextBox}>
              <PartnerText style={[styles.cardTitle, { fontSize: px(17) }]}>Self Driver</PartnerText>
              <PartnerText style={[styles.cardDescription, { fontSize: px(13), marginTop: px(4) }]}>
                I own my vehicle and work independently using my mobile number.
              </PartnerText>
            </View>

            {/* Custom Radio Button */}
            <View
              style={[
                styles.radioOuter,
                isSelf ? styles.radioOuterSelected : styles.radioOuterUnselected,
                { width: px(22), height: px(22), borderRadius: px(11) },
              ]}>
              {isSelf ? (
                <View
                  style={[
                    styles.radioInnerSelected,
                    { width: px(11), height: px(11), borderRadius: px(5.5) },
                  ]}
                />
              ) : null}
            </View>
          </Pressable>

          {/* Option 2: Vendor Driver */}
          <Pressable
            onPress={() => setDriverType('vendor')}
            style={({ pressed }) => [
              styles.optionCard,
              isVendorDriver ? styles.optionCardSelected : styles.optionCardUnselected,
              { padding: px(16), borderRadius: px(20), minHeight: px(116), marginTop: px(14) },
              pressed && styles.pressed,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: isVendorDriver }}>
            {/* Prominent High-Res Vendor Driver Avatar */}
            <View
              style={[
                styles.avatarBox,
                {
                  width: px(88),
                  height: px(88),
                  borderRadius: px(44),
                  backgroundColor: '#F3F4F6',
                },
              ]}>
              <Image
                source={images.vendorDriverAvatar}
                style={{ width: px(88), height: px(88), borderRadius: px(44) }}
                resizeMode="cover"
                accessibilityLabel="Vendor Driver"
              />
            </View>

            <View style={styles.cardTextBox}>
              <PartnerText style={[styles.cardTitle, { fontSize: px(17) }]}>Vendor Driver</PartnerText>
              <PartnerText style={[styles.cardDescription, { fontSize: px(13), marginTop: px(4) }]}>
                I'm a driver working with a registered RACE vendor. I have a Login ID and Password from my vendor.
              </PartnerText>
            </View>

            {/* Custom Radio Button */}
            <View
              style={[
                styles.radioOuter,
                isVendorDriver ? styles.radioOuterSelected : styles.radioOuterUnselected,
                { width: px(22), height: px(22), borderRadius: px(11) },
              ]}>
              {isVendorDriver ? (
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
            styles.continueButton,
            { minHeight: px(52), borderRadius: px(14), marginTop: px(26) },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Continue">
          <PartnerText style={[styles.continueButtonText, { fontSize: px(16.5) }]}>Continue</PartnerText>
          <ArrowRight size={px(20)} color="#111827" strokeWidth={2.6} style={{ marginLeft: px(8) }} />
        </Pressable>
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
    width: 32,
    height: 32,
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
    alignItems: 'flex-start',
  },
  mainTitle: {
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontWeight: '400',
    color: '#6B7280',
  },
  cardsContainer: {
    width: '100%',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionCardSelected: {
    backgroundColor: '#FFFDF5',
    borderWidth: 1.8,
    borderColor: '#F59E0B',
  },
  optionCardUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  avatarBox: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardTextBox: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  cardTitle: {
    fontWeight: '800',
    color: '#111827',
  },
  cardDescription: {
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 18.5,
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
  continueButton: {
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
  continueButtonText: {
    fontWeight: '800',
    color: '#111827',
  },
  pressed: {
    opacity: 0.88,
  },
});
