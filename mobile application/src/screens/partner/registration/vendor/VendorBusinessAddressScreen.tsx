import React, { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  MapPin,
  ShieldCheck,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { images } from '../../../../assets';
import LocationPickerModal from '../../../../components/common/LocationPickerModal';
import PartnerRegistrationStepper from '../../../../components/partner/PartnerRegistrationStepper';
import {
  INDIAN_STATE_OPTIONS,
  VENDOR_REGISTRATION_STEPS,
} from '../../../../constants/partnerRegistration';
import { usePartnerRegistrationStore } from '../../../../store/partnerRegistrationStore';
import type { LocationResult } from '../../../../types/location';
import type { PartnerRegistrationStackParamList } from '../../../../types/partnerNavigation';
import { toAddressFormValues } from '../../../../utils/googlePlaces';
import {
  isValidIndianPin,
  partnerRegistrationGoBack,
  showSelectOptions,
} from '../../../../utils/partnerRegistration';
import { colors, layout, radius, shadows, spacing, typography } from '../../../../theme';

type Props = NativeStackScreenProps<PartnerRegistrationStackParamList, 'VendorBusinessAddress'>;

const REF_W = 390;
const PAGE_BG = '#F7F7F5';
const SUCCESS_GREEN = '#22C55E';

function ValidCheck({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.validCheck}>
      <Check size={14} color={SUCCESS_GREEN} strokeWidth={3} />
    </View>
  );
}

export default function VendorBusinessAddressScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / REF_W;
  const px = (value: number) => Math.max(1, Math.round(value * scale));

  const vendorAddress = usePartnerRegistrationStore((s) => s.vendorAddress);
  const setVendorAddress = usePartnerRegistrationStore((s) => s.setVendorAddress);
  const vendorBusiness = usePartnerRegistrationStore((s) => s.vendorBusiness);
  const setVendorBusiness = usePartnerRegistrationStore((s) => s.setVendorBusiness);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const handleBack = () =>
    partnerRegistrationGoBack(navigation, 'VendorBusinessAddress', route.params);

  const searchDisplayValue = [
    vendorAddress.addressLine1,
    vendorAddress.addressLine2,
    vendorAddress.city,
    vendorAddress.state,
    vendorAddress.pinCode,
  ]
    .filter(Boolean)
    .join(', ');

  const fieldValid = useMemo(
    () => ({
      addressLine1: vendorAddress.addressLine1.trim().length >= 3,
      addressLine2: vendorAddress.addressLine2.trim().length >= 2,
      city: vendorAddress.city.trim().length >= 2,
      state: Boolean(vendorAddress.state),
      pinCode: isValidIndianPin(vendorAddress.pinCode),
      landmark: vendorAddress.landmark.trim().length >= 2,
    }),
    [vendorAddress],
  );

  const handleLocationSelect = (location: LocationResult) => {
    const mapped = toAddressFormValues(location);
    setVendorAddress({
      addressLine1: mapped.line1,
      addressLine2: mapped.line2,
      city: mapped.city,
      state: mapped.state,
      pinCode: mapped.pincode,
    });
    setErrors({});
  };

  const clearError = (key: string) => {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!vendorAddress.addressLine1.trim()) next.addressLine1 = 'Address line 1 is required';
    if (!vendorAddress.city.trim()) next.city = 'City is required';
    if (!vendorAddress.state) next.state = 'Select state';
    if (!isValidIndianPin(vendorAddress.pinCode)) next.pinCode = 'Enter a valid 6-digit PIN code';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onContinue = () => {
    if (!validate()) return;
    navigation.navigate('VendorDocuments', route.params);
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
          <Text style={[styles.brandRace, { fontSize: px(18), lineHeight: px(22) }]}>RACE</Text>
          <Text style={[styles.brandPartner, { fontSize: px(11), lineHeight: px(14) }]}>
            PARTNER
          </Text>
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
          <Text style={[styles.heroTitle, { fontSize: px(24), lineHeight: px(30) }]}>
            Almost there!
          </Text>
          <Text
            style={[
              styles.heroSubtitle,
              { fontSize: px(14), lineHeight: px(21), marginTop: px(6) },
            ]}>
            Add your business address so customers and RACE can reach you easily.
          </Text>

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
              activeStep={2}
            />

            <Text style={[styles.formTitle, { fontSize: px(20), marginTop: px(spacing.lg) }]}>
              Where customers can find your business
            </Text>
            <Text
              style={[
                styles.formSubtitle,
                { fontSize: px(13), lineHeight: px(19), marginTop: px(4) },
              ]}>
              We'll use this address for service and booking.
            </Text>

            <Pressable
              onPress={() => setShowLocationPicker(true)}
              style={({ pressed }) => [
                styles.mapPicker,
                { marginTop: px(spacing.lg) },
                pressed && styles.pressed,
              ]}>
              <MapPin size={18} color={colors.primary} strokeWidth={2.2} />
              <Text
                style={[styles.mapPickerText, searchDisplayValue ? styles.mapPickerFilled : null]}
                numberOfLines={2}>
                {searchDisplayValue || 'Search / select address on map'}
              </Text>
              <ChevronRight size={18} color={colors.grey} strokeWidth={2.4} />
            </Pressable>

            <View style={{ marginTop: px(spacing.lg) }}>
              <Text style={styles.fieldLabel}>
                Address line 1 <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  errors.addressLine1 ? styles.inputError : null,
                  fieldValid.addressLine1 ? styles.inputValid : null,
                ]}>
                <TextInput
                  value={vendorAddress.addressLine1}
                  onChangeText={(addressLine1) => {
                    setVendorAddress({ addressLine1 });
                    clearError('addressLine1');
                  }}
                  placeholder="Plot No. 92, Aerodrome Area"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <ValidCheck visible={fieldValid.addressLine1 && !errors.addressLine1} />
              </View>
              {errors.addressLine1 ? <Text style={styles.error}>{errors.addressLine1}</Text> : null}

              <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Address line 2</Text>
              <View
                style={[
                  styles.inputWrap,
                  fieldValid.addressLine2 ? styles.inputValid : null,
                ]}>
                <TextInput
                  value={vendorAddress.addressLine2}
                  onChangeText={(addressLine2) => setVendorAddress({ addressLine2 })}
                  placeholder="Near Khandagiri Square"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <ValidCheck visible={fieldValid.addressLine2} />
              </View>

              <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>
                City <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  errors.city ? styles.inputError : null,
                  fieldValid.city ? styles.inputValid : null,
                ]}>
                <TextInput
                  value={vendorAddress.city}
                  onChangeText={(city) => {
                    setVendorAddress({ city });
                    clearError('city');
                  }}
                  placeholder="Bhubaneswar"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <ValidCheck visible={fieldValid.city && !errors.city} />
              </View>
              {errors.city ? <Text style={styles.error}>{errors.city}</Text> : null}

              <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>
                State <Text style={styles.required}>*</Text>
              </Text>
              <Pressable
                onPress={() =>
                  showSelectOptions(
                    'State',
                    INDIAN_STATE_OPTIONS,
                    (state) => {
                      setVendorAddress({ state });
                      clearError('state');
                    },
                    vendorAddress.state,
                  )
                }
                style={[
                  styles.inputWrap,
                  errors.state ? styles.inputError : null,
                  fieldValid.state ? styles.inputValid : null,
                ]}>
                <Text
                  style={[styles.input, !vendorAddress.state && styles.placeholder]}
                  numberOfLines={1}>
                  {vendorAddress.state || 'Select state'}
                </Text>
                {fieldValid.state && !errors.state ? (
                  <ValidCheck visible />
                ) : (
                  <ChevronDown size={18} color={colors.grey} strokeWidth={2.4} />
                )}
              </Pressable>
              {errors.state ? <Text style={styles.error}>{errors.state}</Text> : null}

              <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>
                PIN code <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  errors.pinCode ? styles.inputError : null,
                  fieldValid.pinCode ? styles.inputValid : null,
                ]}>
                <TextInput
                  value={vendorAddress.pinCode}
                  onChangeText={(pinCode) => {
                    setVendorAddress({ pinCode: pinCode.replace(/\D/g, '').slice(0, 6) });
                    clearError('pinCode');
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="751020"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <ValidCheck visible={fieldValid.pinCode && !errors.pinCode} />
              </View>
              {errors.pinCode ? <Text style={styles.error}>{errors.pinCode}</Text> : null}

              <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>
                Landmark <Text style={styles.optional}>(optional)</Text>
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  fieldValid.landmark ? styles.inputValid : null,
                ]}>
                <TextInput
                  value={vendorAddress.landmark}
                  onChangeText={(landmark) => setVendorAddress({ landmark })}
                  placeholder="Opp. Airport Fire Station"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <ValidCheck visible={fieldValid.landmark} />
              </View>

              <View style={{ marginTop: px(spacing.xl) }}>
                <Text style={[styles.formTitle, { fontSize: px(17) }]}>Bank details for payouts</Text>
                <Text style={[styles.formSubtitle, { fontSize: px(13), marginTop: px(2) }]}>
                  Direct deposit for completed service jobs
                </Text>
              </View>

              <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>
                Account holder name <Text style={styles.optional}>(optional)</Text>
              </Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={vendorBusiness.accountHolderName ?? ''}
                  onChangeText={(accountHolderName) => setVendorBusiness({ accountHolderName })}
                  placeholder="e.g. Ramesh Kumar Sahoo"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>

              <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>
                Bank account number <Text style={styles.optional}>(optional)</Text>
              </Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={vendorBusiness.accountNumber ?? ''}
                  onChangeText={(accountNumber) => setVendorBusiness({ accountNumber: accountNumber.replace(/\D/g, '') })}
                  keyboardType="number-pad"
                  placeholder="Enter bank account number"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>

              <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>
                IFSC code <Text style={styles.optional}>(optional)</Text>
              </Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={vendorBusiness.ifsc ?? ''}
                  onChangeText={(ifsc) => setVendorBusiness({ ifsc: ifsc.toUpperCase() })}
                  autoCapitalize="characters"
                  maxLength={11}
                  placeholder="e.g. SBIN0001234"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>
            </View>

            <Pressable
              onPress={onContinue}
              style={({ pressed }) => [
                styles.continueButton,
                { marginTop: px(spacing.xl), minHeight: px(54), borderRadius: px(14) },
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.continueLabel, { fontSize: px(16) }]}>Continue</Text>
              <ArrowRight size={px(18)} color={colors.dark} strokeWidth={2.5} />
            </Pressable>
          </View>

          <View style={[styles.secureCard, { marginTop: px(spacing.lg), borderRadius: px(14) }]}>
            <ShieldCheck size={16} color={colors.primary} strokeWidth={2.2} />
            <Text style={styles.secureText}>
              Your information is safe. We use enterprise-grade security to protect your data.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LocationPickerModal
        visible={showLocationPicker}
        title="Select your address"
        confirmLabel="Confirm address"
        openSearchOnShow
        onClose={() => setShowLocationPicker(false)}
        onLocationSelected={handleLocationSelect}
      />
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
  heroSubtitle: {
    color: colors.grey,
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
  mapPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.input,
    backgroundColor: colors.goldLight,
    paddingHorizontal: spacing.md,
  },
  mapPickerText: {
    flex: 1,
    color: colors.grey,
    fontSize: typography.sizes.md,
  },
  mapPickerFilled: {
    color: colors.dark,
    fontWeight: typography.weights.semibold,
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
  secureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.card,
  },
  secureText: {
    flex: 1,
    color: colors.grey,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  pressed: { opacity: 0.9 },
});
