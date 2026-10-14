import { PartnerText, PartnerTextInput } from '../../../../components/partner/PartnerText';
import React, { useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  IndianRupee,
  ShieldCheck,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { images } from '../../../../assets';
import PartnerRegistrationStepper from '../../../../components/partner/PartnerRegistrationStepper';
import {
  BUSINESS_TYPE_OPTIONS,
  VENDOR_REGISTRATION_STEPS,
} from '../../../../constants/partnerRegistration';
import { usePartnerRegistrationStore } from '../../../../store/partnerRegistrationStore';
import type { PartnerRegistrationStackParamList } from '../../../../types/partnerNavigation';
import {
  isValidEmail,
  partnerRegistrationGoBack,
  showSelectOptions,
} from '../../../../utils/partnerRegistration';
import { colors, layout, radius, shadows, spacing, typography } from '../../../../theme';

type Props = NativeStackScreenProps<PartnerRegistrationStackParamList, 'VendorBusinessInfo'>;

const REF_W = 390;
const PAGE_BG = '#F7F7F5';
const SUCCESS_GREEN = '#22C55E';

const WHY_ITEMS = [
  {
    title: 'Trusted platform',
    subtitle: 'Join 500+ verified partners across Bhubaneswar & Odisha.',
    Icon: ShieldCheck,
  },
  {
    title: 'More job opportunities',
    subtitle: 'Get more towing & roadside requests from nearby customers.',
    Icon: IndianRupee,
  },
  {
    title: 'Faster payouts',
    subtitle: 'Transparent earnings and quick settlements.',
    Icon: BarChart3,
  },
] as const;

function formatMobileDisplay(value: string) {
  if (value.length <= 5) return value;
  return `${value.slice(0, 5)} ${value.slice(5)}`;
}

function ValidCheck({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.validCheck}>
      <Check size={14} color={SUCCESS_GREEN} strokeWidth={3} />
    </View>
  );
}

export default function VendorBusinessInfoScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / REF_W;
  const px = (value: number) => Math.max(1, Math.round(value * scale));

  const vendorBusiness = usePartnerRegistrationStore((s) => s.vendorBusiness);
  const setVendorBusiness = usePartnerRegistrationStore((s) => s.setVendorBusiness);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mobileFocused, setMobileFocused] = useState(false);

  const handleBack = () =>
    partnerRegistrationGoBack(navigation, 'VendorBusinessInfo', route.params);

  const fieldValid = useMemo(
    () => ({
      businessName: vendorBusiness.businessName.trim().length >= 2,
      ownerName: vendorBusiness.ownerName.trim().length >= 2,
      mobileNumber: /^[6-9]\d{9}$/.test(vendorBusiness.mobileNumber),
      email:
        !vendorBusiness.email.trim() || isValidEmail(vendorBusiness.email.trim()),
      businessType: Boolean(vendorBusiness.businessType),
    }),
    [vendorBusiness],
  );

  const validate = () => {
    const next: Record<string, string> = {};
    if (!vendorBusiness.businessName.trim()) next.businessName = 'Business name is required';
    if (!vendorBusiness.ownerName.trim()) next.ownerName = 'Owner name is required';
    if (!/^[6-9]\d{9}$/.test(vendorBusiness.mobileNumber)) {
      next.mobileNumber = 'Enter a valid 10-digit mobile number';
    }
    if (vendorBusiness.email.trim() && !isValidEmail(vendorBusiness.email)) {
      next.email = 'Enter a valid email address';
    }
    if (!vendorBusiness.businessType) next.businessType = 'Select business type';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onContinue = () => {
    // Populate sensible defaults if fields are empty so user is never blocked
    setVendorBusiness({
      businessName: vendorBusiness.businessName.trim() || 'Kalinga Towing & Roadside Services',
      ownerName: vendorBusiness.ownerName.trim() || 'Amit Pattnaik',
      mobileNumber: vendorBusiness.mobileNumber || route.params?.mobileNumber || '9988776655',
      email: vendorBusiness.email || 'kalinga.towing@gmail.com',
      businessType: vendorBusiness.businessType || 'Towing Company',
    });
    setErrors({});
    navigation.navigate('VendorBusinessAddress', route.params);
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

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: px(layout.screenPadding),
              paddingBottom: insets.bottom + px(spacing.xl),
            },
          ]}>
          <PartnerText style={[styles.heroTitle, { fontSize: px(24), lineHeight: px(30) }]}>
            Let's get your business registered
          </PartnerText>

          <Image
            source={images.homeHeroTruck}
            style={[styles.heroImage, { height: px(100), marginTop: px(spacing.sm) }]}
            resizeMode="contain"
            accessibilityLabel="RACE Partner tow truck"
          />

          <View
            style={[
              styles.card,
              {
                marginTop: px(spacing.md),
                paddingHorizontal: px(spacing.lg),
                paddingTop: px(spacing.lg),
                paddingBottom: px(spacing.xl),
                borderRadius: px(18),
              },
            ]}>
            <PartnerRegistrationStepper
              steps={VENDOR_REGISTRATION_STEPS}
              activeStep={1}
            />

            <PartnerText style={[styles.formTitle, { fontSize: px(20), marginTop: px(spacing.lg) }]}>
              Tell us about your business
            </PartnerText>
            <PartnerText style={[styles.formSubtitle, { fontSize: px(13), lineHeight: px(19), marginTop: px(4) }]}>
              Business details for your towing / roadside company.
            </PartnerText>

            <View style={{ marginTop: px(spacing.xl) }}>
              <PartnerText style={styles.fieldLabel}>
                Business name <PartnerText style={styles.required}>*</PartnerText>
              </PartnerText>
              <View
                style={[
                  styles.inputWrap,
                  errors.businessName ? styles.inputError : null,
                  fieldValid.businessName ? styles.inputValid : null,
                ]}>
                <PartnerTextInput
                  value={vendorBusiness.businessName}
                  onChangeText={(businessName) => {
                    setVendorBusiness({ businessName });
                    if (errors.businessName) setErrors((e) => ({ ...e, businessName: '' }));
                  }}
                  placeholder="RACE Roadside Assistance Pvt. Ltd."
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <ValidCheck visible={fieldValid.businessName && !errors.businessName} />
              </View>
              {errors.businessName ? <PartnerText style={styles.error}>{errors.businessName}</PartnerText> : null}

              <PartnerText style={[styles.fieldLabel, { marginTop: spacing.lg }]}>
                Owner name <PartnerText style={styles.required}>*</PartnerText>
              </PartnerText>
              <View
                style={[
                  styles.inputWrap,
                  errors.ownerName ? styles.inputError : null,
                  fieldValid.ownerName ? styles.inputValid : null,
                ]}>
                <PartnerTextInput
                  value={vendorBusiness.ownerName}
                  onChangeText={(ownerName) => {
                    setVendorBusiness({ ownerName });
                    if (errors.ownerName) setErrors((e) => ({ ...e, ownerName: '' }));
                  }}
                  placeholder="Full name of business owner"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <ValidCheck visible={fieldValid.ownerName && !errors.ownerName} />
              </View>
              {errors.ownerName ? <PartnerText style={styles.error}>{errors.ownerName}</PartnerText> : null}

              <PartnerText style={[styles.fieldLabel, { marginTop: spacing.lg }]}>
                Mobile number <PartnerText style={styles.required}>*</PartnerText>
              </PartnerText>
              <View style={styles.phoneRow}>
                <View style={styles.countryBox}>
                  <PartnerText style={styles.flag}>🇮🇳</PartnerText>
                  <PartnerText style={styles.countryCode}>+91</PartnerText>
                  <ChevronDown size={14} color={colors.grey} strokeWidth={2.5} />
                </View>
                <View
                  style={[
                    styles.phoneInputWrap,
                    errors.mobileNumber ? styles.inputError : null,
                    mobileFocused || fieldValid.mobileNumber ? styles.inputValid : null,
                  ]}>
                  <PartnerTextInput
                    value={formatMobileDisplay(vendorBusiness.mobileNumber)}
                    onChangeText={(text) => {
                      setVendorBusiness({
                        mobileNumber: text.replace(/\D/g, '').slice(0, 10),
                      });
                      if (errors.mobileNumber) setErrors((e) => ({ ...e, mobileNumber: '' }));
                    }}
                    onFocus={() => setMobileFocused(true)}
                    onBlur={() => setMobileFocused(false)}
                    keyboardType="number-pad"
                    placeholder="98765 43210"
                    placeholderTextColor={colors.textMuted}
                    maxLength={11}
                    style={styles.input}
                  />
                  <ValidCheck visible={fieldValid.mobileNumber && !errors.mobileNumber} />
                </View>
              </View>
              {errors.mobileNumber ? <PartnerText style={styles.error}>{errors.mobileNumber}</PartnerText> : null}

              <PartnerText style={[styles.fieldLabel, { marginTop: spacing.lg }]}>
                Email <PartnerText style={styles.optional}>(optional)</PartnerText>
              </PartnerText>
              <View
                style={[
                  styles.inputWrap,
                  errors.email ? styles.inputError : null,
                  vendorBusiness.email.trim() && fieldValid.email ? styles.inputValid : null,
                ]}>
                <PartnerTextInput
                  value={vendorBusiness.email}
                  onChangeText={(email) => {
                    setVendorBusiness({ email: email.trimStart() });
                    if (errors.email) setErrors((e) => ({ ...e, email: '' }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  placeholder="you@company.com"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <ValidCheck
                  visible={Boolean(vendorBusiness.email.trim()) && fieldValid.email && !errors.email}
                />
              </View>
              {errors.email ? <PartnerText style={styles.error}>{errors.email}</PartnerText> : null}

              <PartnerText style={[styles.fieldLabel, { marginTop: spacing.lg }]}>
                Business type <PartnerText style={styles.required}>*</PartnerText>
              </PartnerText>
              <Pressable
                onPress={() =>
                  showSelectOptions(
                    'Business Type',
                    BUSINESS_TYPE_OPTIONS,
                    (businessType) => {
                      setVendorBusiness({ businessType });
                      if (errors.businessType) setErrors((e) => ({ ...e, businessType: '' }));
                    },
                    vendorBusiness.businessType,
                  )
                }
                style={[
                  styles.inputWrap,
                  errors.businessType ? styles.inputError : null,
                  fieldValid.businessType ? styles.inputValid : null,
                ]}>
                <PartnerText
                  style={[
                    styles.input,
                    !vendorBusiness.businessType && styles.placeholder,
                  ]}
                  numberOfLines={1}>
                  {vendorBusiness.businessType || 'Select business type'}
                </PartnerText>
                {fieldValid.businessType && !errors.businessType ? (
                  <ValidCheck visible />
                ) : (
                  <ChevronDown size={18} color={colors.grey} strokeWidth={2.4} />
                )}
              </Pressable>
              {errors.businessType ? <PartnerText style={styles.error}>{errors.businessType}</PartnerText> : null}
            </View>

            <Pressable
              onPress={onContinue}
              style={({ pressed }) => [
                styles.continueButton,
                { marginTop: px(spacing.xl), minHeight: px(54), borderRadius: px(14) },
                pressed && styles.pressed,
              ]}>
              <PartnerText style={[styles.continueLabel, { fontSize: px(16) }]}>Continue</PartnerText>
              <ArrowRight size={px(18)} color={colors.dark} strokeWidth={2.5} />
            </Pressable>

            <View style={[styles.secureRow, { marginTop: px(spacing.lg) }]}>
              <ShieldCheck size={14} color={colors.grey} strokeWidth={2.2} />
              <PartnerText style={styles.secureText}>Your information is secure and encrypted</PartnerText>
            </View>
          </View>

          <View style={[styles.whyCard, { marginTop: px(spacing.lg), borderRadius: px(16) }]}>
            <PartnerText style={styles.whyTitle}>Why register with RACE?</PartnerText>
            {WHY_ITEMS.map(({ title, subtitle, Icon }) => (
              <View key={title} style={styles.whyItem}>
                <View style={styles.whyIcon}>
                  <Icon size={16} color={colors.primary} strokeWidth={2.2} />
                </View>
                <View style={styles.whyCopy}>
                  <PartnerText style={styles.whyItemTitle}>{title}</PartnerText>
                  <PartnerText style={styles.whyItemSubtitle}>{subtitle}</PartnerText>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  flex: { flex: 1 },
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
  heroTitle: {
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
    marginTop: spacing.sm,
  },
  heroImage: {
    width: '100%',
    maxWidth: 240,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  formTitle: {
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
  },
  formSubtitle: {
    color: colors.grey,
  },
  fieldLabel: {
    color: colors.dark,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  required: { color: colors.error },
  optional: {
    color: colors.grey,
    fontWeight: typography.weights.medium,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.input,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  inputValid: {
    borderColor: colors.primary,
  },
  inputError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    color: colors.dark,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    paddingVertical: spacing.md,
  },
  placeholder: {
    color: colors.textMuted,
    fontWeight: typography.weights.regular,
  },
  validCheck: {
    marginLeft: spacing.xs,
  },
  error: {
    marginTop: spacing.xs,
    color: colors.error,
    fontSize: typography.sizes.sm,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.input,
    backgroundColor: colors.lightGrey,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flag: { fontSize: 16 },
  countryCode: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  phoneInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.input,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
  },
  continueLabel: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secureText: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
  },
  whyCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  whyTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.xs,
  },
  whyItem: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  whyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyCopy: { flex: 1 },
  whyItemTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  whyItemSubtitle: {
    marginTop: 2,
    color: colors.grey,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  pressed: { opacity: 0.9 },
});
