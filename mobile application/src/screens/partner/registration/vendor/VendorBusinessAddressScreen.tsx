import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronDown, ChevronRight, MapPin, ShieldCheck } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DriverRegistrationLayout from '../../../../components/partner/DriverRegistrationLayout';
import PartnerRegistrationStepCard from '../../../../components/partner/PartnerRegistrationStepCard';
import { PartnerText, PartnerTextInput } from '../../../../components/partner/PartnerText';
import LocationPickerModal from '../../../../components/common/LocationPickerModal';
import { INDIAN_STATE_OPTIONS, VENDOR_REGISTRATION_STEPS } from '../../../../constants/partnerRegistration';
import { usePartnerRegistrationStore } from '../../../../store/partnerRegistrationStore';
import type { LocationResult } from '../../../../types/location';
import type { PartnerRegistrationStackParamList } from '../../../../types/partnerNavigation';
import { reverseGeocodeToLocation, toAddressFormValues } from '../../../../utils/googlePlaces';
import {
  isPartnerRegistrationRelaxedValidation,
  isValidIndianPin,
  partnerRegistrationGoBack,
  showSelectOptions,
} from '../../../../utils/partnerRegistration';
import { resolveIndianPincode } from '../../../../utils/indianPincode';
import { getCurrentPositionWhenAllowed } from '../../../../utils/locationPermission';
import { colors } from '../../../../theme';

type Props = NativeStackScreenProps<PartnerRegistrationStackParamList, 'VendorBusinessAddress'>;

const INDIAN_IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export default function VendorBusinessAddressScreen({ navigation, route }: Props) {
  const vendorAddress = usePartnerRegistrationStore((s) => s.vendorAddress);
  const setVendorAddress = usePartnerRegistrationStore((s) => s.setVendorAddress);
  const vendorBusiness = usePartnerRegistrationStore((s) => s.vendorBusiness);
  const setVendorBusiness = usePartnerRegistrationStore((s) => s.setVendorBusiness);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [bankDetailsExpanded, setBankDetailsExpanded] = useState(false);
  const relaxedValidation = isPartnerRegistrationRelaxedValidation();

  const handleBack = () => partnerRegistrationGoBack(navigation, 'VendorBusinessAddress', route.params);

  const offerLiveLocation = async () => {
    const pos = await getCurrentPositionWhenAllowed();
    if (!pos) return;
    try {
      const place = await reverseGeocodeToLocation(pos.coords.latitude, pos.coords.longitude);
      const mapped = toAddressFormValues(place);
      setVendorAddress({
        addressLine1: mapped.line1 || vendorAddress.addressLine1,
        addressLine2: mapped.line2 || vendorAddress.addressLine2,
        city: mapped.city || vendorAddress.city,
        state: mapped.state || vendorAddress.state,
        pinCode: mapped.pincode || vendorAddress.pinCode,
      });
      setErrors({});
    } catch {
      // GPS or geocode unavailable — user can type the address manually.
    }
  };

  const searchDisplayValue = [
    vendorAddress.addressLine1,
    vendorAddress.addressLine2,
    vendorAddress.city,
    vendorAddress.state,
    vendorAddress.pinCode,
  ].filter(Boolean).join(', ');

  const fieldValid = useMemo(() => ({
    addressLine1: vendorAddress.addressLine1.trim().length >= 3,
    city: vendorAddress.city.trim().length >= 2,
    state: Boolean(vendorAddress.state),
    pinCode: isValidIndianPin(vendorAddress.pinCode),
  }), [vendorAddress]);

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
    if (relaxedValidation) {
      setErrors({});
      return true;
    }
    const next: Record<string, string> = {};
    if (vendorAddress.addressLine1.trim().length < 3) next.addressLine1 = 'Enter your street address';
    if (vendorAddress.city.trim().length < 2) next.city = 'Enter your city';
    if (!vendorAddress.state) next.state = 'Select a state';
    if (!isValidIndianPin(vendorAddress.pinCode)) next.pinCode = 'Enter a valid 6-digit PIN code';

    const accountNumber = (vendorBusiness.accountNumber ?? '').replace(/\D/g, '');
    const ifsc = (vendorBusiness.ifsc ?? '').trim().toUpperCase();
    if (accountNumber || ifsc) {
      if (accountNumber.length < 9 || accountNumber.length > 18) {
        next.accountNumber = 'Enter a valid bank account number';
      }
      if (!INDIAN_IFSC_PATTERN.test(ifsc)) next.ifsc = 'Enter a valid IFSC code';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onContinue = () => {
    if (!validate()) {
      if (vendorBusiness.accountNumber || vendorBusiness.ifsc) {
        setBankDetailsExpanded(true);
      }
      return;
    }
    setVendorAddress({
      addressLine1: vendorAddress.addressLine1.trim(),
      addressLine2: vendorAddress.addressLine2.trim(),
      city: vendorAddress.city.trim(),
      pinCode: vendorAddress.pinCode.trim(),
      landmark: vendorAddress.landmark.trim(),
    });
    setVendorBusiness({
      accountHolderName: vendorBusiness.accountHolderName?.trim(),
      accountNumber: vendorBusiness.accountNumber?.replace(/\D/g, ''),
      ifsc: vendorBusiness.ifsc?.trim().toUpperCase(),
    });
    navigation.navigate('VendorDocuments', route.params);
  };

  return (
    <>
      <DriverRegistrationLayout
        step={2}
        stepLabels={VENDOR_REGISTRATION_STEPS}
        title="Vendor registration"
        subtitle="Add your business service address."
        onBack={handleBack}
        onContinue={onContinue}
        continueLabel="Continue">
        <PartnerRegistrationStepCard
          title="Business address"
          subtitle="Add the location customers and RACE can use to reach you."
          Icon={MapPin}>
          <Pressable
            onPress={() => setShowLocationPicker(true)}
            style={({ pressed }) => [styles.mapPicker, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Search or select address on map">
            <MapPin size={17} color="#F59E0B" strokeWidth={2.2} />
            <PartnerText style={[styles.mapPickerText, Boolean(searchDisplayValue) && styles.mapPickerFilled]} numberOfLines={2}>
              {searchDisplayValue || 'Search or select address on map'}
            </PartnerText>
            <ChevronRight size={17} color="#6B7280" />
          </Pressable>

          <View style={styles.fieldGroup}>
            <PartnerText style={styles.fieldLabel}>Address line 1 <PartnerText style={styles.required}>*</PartnerText></PartnerText>
            <View style={[styles.inputWrap, errors.addressLine1 ? styles.inputError : null, fieldValid.addressLine1 && !errors.addressLine1 ? styles.inputValid : null]}>
              <PartnerTextInput
                value={vendorAddress.addressLine1}
                onFocus={() => {
                  void offerLiveLocation();
                }}
                onChangeText={(addressLine1) => { setVendorAddress({ addressLine1 }); clearError('addressLine1'); }}
                placeholder="House, building, street or locality"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                returnKeyType="next"
                style={styles.input}
              />
            </View>
            {errors.addressLine1 ? <PartnerText style={styles.error}>{errors.addressLine1}</PartnerText> : null}

            <PartnerText style={styles.fieldLabelSpaced}>Address line 2 <PartnerText style={styles.optional}>(optional)</PartnerText></PartnerText>
            <View style={styles.inputWrap}>
              <PartnerTextInput
                value={vendorAddress.addressLine2}
                onChangeText={(addressLine2) => setVendorAddress({ addressLine2 })}
                placeholder="Apartment, area or nearby location"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                returnKeyType="next"
                style={styles.input}
              />
            </View>

            <View style={styles.cityStateRow}>
              <View style={styles.cityColumn}>
                <PartnerText style={styles.fieldLabel}>City <PartnerText style={styles.required}>*</PartnerText></PartnerText>
                <View style={[styles.inputWrap, errors.city ? styles.inputError : null, fieldValid.city && !errors.city ? styles.inputValid : null]}>
                  <PartnerTextInput
                    value={vendorAddress.city}
                    onChangeText={(city) => { setVendorAddress({ city }); clearError('city'); }}
                    placeholder="City"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    returnKeyType="next"
                    style={styles.input}
                  />
                </View>
                {errors.city ? <PartnerText style={styles.error}>{errors.city}</PartnerText> : null}
              </View>
              <View style={styles.pinColumn}>
                <PartnerText style={styles.fieldLabel}>PIN code <PartnerText style={styles.required}>*</PartnerText></PartnerText>
                <View style={[styles.inputWrap, errors.pinCode ? styles.inputError : null, fieldValid.pinCode && !errors.pinCode ? styles.inputValid : null]}>
                  <PartnerTextInput
                    value={vendorAddress.pinCode}
                    onChangeText={async (text) => {
                      const pin = text.replace(/\D/g, '').slice(0, 6);
                      setVendorAddress({ pinCode: pin });
                      clearError('pinCode');
                      if (pin.length === 6) {
                        const geo = await resolveIndianPincode(pin);
                        if (geo) {
                          setVendorAddress({
                            pinCode: pin,
                            city: vendorAddress.city ? vendorAddress.city : geo.district,
                            state: vendorAddress.state ? vendorAddress.state : geo.state,
                          });
                          clearError('city');
                          clearError('state');
                        }
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="751001"
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="done"
                    style={styles.input}
                  />
                </View>
                {errors.pinCode ? <PartnerText style={styles.error}>{errors.pinCode}</PartnerText> : null}
              </View>
            </View>

            <PartnerText style={styles.fieldLabelSpaced}>State <PartnerText style={styles.required}>*</PartnerText></PartnerText>
            <Pressable
              onPress={() => showSelectOptions('State', INDIAN_STATE_OPTIONS, (state) => { setVendorAddress({ state }); clearError('state'); }, vendorAddress.state)}
              style={[styles.inputWrap, errors.state ? styles.inputError : null, fieldValid.state && !errors.state ? styles.inputValid : null]}
              accessibilityRole="button">
              <PartnerText style={[styles.input, !vendorAddress.state && styles.placeholder]} numberOfLines={1}>
                {vendorAddress.state || 'Select state'}
              </PartnerText>
              {fieldValid.state ? <View style={styles.validDot}><ShieldCheck size={14} color="#16A34A" /></View> : <ChevronDown size={17} color="#6B7280" />}
            </Pressable>
            {errors.state ? <PartnerText style={styles.error}>{errors.state}</PartnerText> : null}

            <PartnerText style={styles.fieldLabelSpaced}>Landmark <PartnerText style={styles.optional}>(optional)</PartnerText></PartnerText>
            <View style={styles.inputWrap}>
              <PartnerTextInput
                value={vendorAddress.landmark}
                onChangeText={(landmark) => setVendorAddress({ landmark })}
                placeholder="Nearby landmark"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                returnKeyType="done"
                style={styles.input}
              />
            </View>
          </View>
        </PartnerRegistrationStepCard>

        <View style={styles.bankCard}>
          <Pressable
            onPress={() => setBankDetailsExpanded((value) => !value)}
            style={({ pressed }) => [styles.bankHeader, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityState={{ expanded: bankDetailsExpanded }}>
            <View style={styles.bankIcon}><ShieldCheck size={16} color="#D97706" /></View>
            <View style={styles.bankHeaderCopy}>
              <PartnerText style={styles.bankTitle}>Bank details for payouts</PartnerText>
              <PartnerText style={styles.bankSubtitle}>Optional now; add before your first payout.</PartnerText>
            </View>
            <ChevronDown size={17} color="#6B7280" style={{ transform: [{ rotate: bankDetailsExpanded ? '180deg' : '0deg' }] }} />
          </Pressable>
          {bankDetailsExpanded ? (
            <View style={styles.bankFields}>
              <PartnerText style={styles.fieldLabel}>Account holder name <PartnerText style={styles.optional}>(optional)</PartnerText></PartnerText>
              <View style={styles.inputWrap}>
                <PartnerTextInput
                  value={vendorBusiness.accountHolderName ?? ''}
                  onChangeText={(accountHolderName) => setVendorBusiness({ accountHolderName })}
                  placeholder="Name on the bank account"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  returnKeyType="next"
                  style={styles.input}
                />
              </View>
              <PartnerText style={styles.fieldLabelSpaced}>Bank account number <PartnerText style={styles.optional}>(optional)</PartnerText></PartnerText>
              <View style={[styles.inputWrap, errors.accountNumber ? styles.inputError : null]}>
                <PartnerTextInput
                  value={vendorBusiness.accountNumber ?? ''}
                  onChangeText={(accountNumber) => { setVendorBusiness({ accountNumber: accountNumber.replace(/\D/g, '') }); if (errors.accountNumber) setErrors((e) => ({ ...e, accountNumber: '' })); }}
                  keyboardType="number-pad"
                  placeholder="Enter bank account number"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>
              {errors.accountNumber ? <PartnerText style={styles.error}>{errors.accountNumber}</PartnerText> : null}
              <PartnerText style={styles.fieldLabelSpaced}>IFSC code <PartnerText style={styles.optional}>(optional)</PartnerText></PartnerText>
              <View style={[styles.inputWrap, errors.ifsc ? styles.inputError : null]}>
                <PartnerTextInput
                  value={vendorBusiness.ifsc ?? ''}
                  onChangeText={(ifsc) => { setVendorBusiness({ ifsc: ifsc.toUpperCase() }); if (errors.ifsc) setErrors((e) => ({ ...e, ifsc: '' })); }}
                  autoCapitalize="characters"
                  maxLength={11}
                  placeholder="e.g. SBIN0001234"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>
              {errors.ifsc ? <PartnerText style={styles.error}>{errors.ifsc}</PartnerText> : null}
            </View>
          ) : null}
        </View>
      </DriverRegistrationLayout>

      <LocationPickerModal
        visible={showLocationPicker}
        title="Select your business address"
        confirmLabel="Use this address"
        openSearchOnShow
        onClose={() => setShowLocationPicker(false)}
        onLocationSelected={handleLocationSelect}
      />
    </>
  );
}

const styles = StyleSheet.create({
  mapPicker: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    backgroundColor: '#FFFBEB',
  },
  mapPickerText: { flex: 1, color: '#6B7280', fontSize: 12, lineHeight: 17 },
  mapPickerFilled: { color: '#111827', fontWeight: '600' },
  fieldGroup: { width: '100%' },
  fieldLabel: { color: '#374151', fontSize: 12, fontWeight: '600', marginBottom: 5 },
  fieldLabelSpaced: { color: '#374151', fontSize: 12, fontWeight: '600', marginTop: 11, marginBottom: 5 },
  required: { color: '#DC2626', fontWeight: '700' },
  optional: { color: '#9CA3AF', fontWeight: '400' },
  inputWrap: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  inputValid: { borderColor: '#F59E0B' },
  inputError: { borderColor: '#DC2626' },
  input: { flex: 1, minHeight: 40, paddingVertical: 6, color: '#111827', fontSize: 13, fontWeight: '500' },
  placeholder: { color: '#9CA3AF' },
  error: { marginTop: 3, color: '#DC2626', fontSize: 10.5 },
  cityStateRow: { flexDirection: 'row', gap: 8, marginTop: 11 },
  cityColumn: { flex: 1.3 },
  pinColumn: { flex: 0.9 },
  validDot: { marginLeft: 4 },
  bankCard: {
    marginTop: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  bankHeader: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bankIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#FEF3C7' },
  bankHeaderCopy: { flex: 1 },
  bankTitle: { color: '#111827', fontSize: 12.5, fontWeight: '700' },
  bankSubtitle: { marginTop: 2, color: '#6B7280', fontSize: 10.5 },
  bankFields: { paddingBottom: 12 },
  pressed: { opacity: 0.85 },
});
