import React, { useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import type { TextInput } from 'react-native';
import { Building2, Check, ChevronDown, ShieldCheck } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DriverRegistrationLayout from '../../../../components/partner/DriverRegistrationLayout';
import PartnerRegistrationStepCard from '../../../../components/partner/PartnerRegistrationStepCard';
import { PartnerText, PartnerTextInput } from '../../../../components/partner/PartnerText';
import { BUSINESS_TYPE_OPTIONS, VENDOR_REGISTRATION_STEPS } from '../../../../constants/partnerRegistration';
import { usePartnerRegistrationStore } from '../../../../store/partnerRegistrationStore';
import type { PartnerRegistrationStackParamList } from '../../../../types/partnerNavigation';
import {
  isPartnerRegistrationRelaxedValidation,
  isValidEmail,
  partnerRegistrationGoBack,
  showSelectOptions,
} from '../../../../utils/partnerRegistration';
import { colors } from '../../../../theme';

type Props = NativeStackScreenProps<PartnerRegistrationStackParamList, 'VendorBusinessInfo'>;

const SUCCESS_GREEN = '#22C55E';

function formatMobileDisplay(value: string) {
  if (value.length <= 5) return value;
  return value.slice(0, 5) + ' ' + value.slice(5);
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
  const vendorBusiness = usePartnerRegistrationStore((s) => s.vendorBusiness);
  const setVendorBusiness = usePartnerRegistrationStore((s) => s.setVendorBusiness);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const businessNameInput = useRef<TextInput>(null);
  const ownerNameInput = useRef<TextInput>(null);
  const mobileInput = useRef<TextInput>(null);
  const emailInput = useRef<TextInput>(null);

  const handleBack = () => partnerRegistrationGoBack(navigation, 'VendorBusinessInfo', route.params);

  const fieldValid = useMemo(
    () => ({
      businessName: vendorBusiness.businessName.trim().length >= 2,
      ownerName: vendorBusiness.ownerName.trim().length >= 2,
      mobileNumber: /^[6-9]\d{9}$/.test(vendorBusiness.mobileNumber),
      email: !vendorBusiness.email.trim() || isValidEmail(vendorBusiness.email.trim()),
      businessType: Boolean(vendorBusiness.businessType),
    }),
    [vendorBusiness],
  );

  const relaxedValidation = isPartnerRegistrationRelaxedValidation();

  const validate = () => {
    if (relaxedValidation) {
      setErrors({});
      return true;
    }
    const next: Record<string, string> = {};
    if (vendorBusiness.businessName.trim().length < 2) next.businessName = 'Enter your business name';
    if (vendorBusiness.ownerName.trim().length < 2) next.ownerName = 'Enter the business owner name';
    if (!/^[6-9]\d{9}$/.test(vendorBusiness.mobileNumber)) {
      next.mobileNumber = 'Enter a valid 10-digit mobile number';
    }
    if (vendorBusiness.email.trim() && !isValidEmail(vendorBusiness.email.trim())) {
      next.email = 'Enter a valid email address';
    }
    if (!vendorBusiness.businessType) next.businessType = 'Select a business type';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onContinue = () => {
    Keyboard.dismiss();
    setFocusedField(null);
    if (!validate()) return;
    setVendorBusiness({
      businessName: vendorBusiness.businessName.trim(),
      ownerName: vendorBusiness.ownerName.trim(),
      mobileNumber: vendorBusiness.mobileNumber.replace(/\D/g, '').slice(-10),
      email: vendorBusiness.email.trim(),
    });
    navigation.navigate('VendorBusinessAddress', route.params);
  };

  return (
    <DriverRegistrationLayout
      step={1}
      stepLabels={VENDOR_REGISTRATION_STEPS}
      title="Vendor registration"
      subtitle="Tell us about your towing business."
      onBack={handleBack}
      onContinue={onContinue}
      continueLabel="Continue">
      <PartnerRegistrationStepCard
        title="Business details"
        subtitle="Enter the details shown on your business documents."
        Icon={Building2}>
        <View>
          <PartnerText style={styles.fieldLabel}>Business name <PartnerText style={styles.required}>*</PartnerText></PartnerText>
          <View style={[styles.inputWrap, focusedField === 'businessName' && styles.inputFocused, errors.businessName && styles.inputError]}>
            <PartnerTextInput
              ref={businessNameInput}
              value={vendorBusiness.businessName}
              onChangeText={(businessName) => {
                setVendorBusiness({ businessName });
                if (errors.businessName) setErrors((e) => ({ ...e, businessName: '' }));
              }}
              placeholder="Business or trading name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              returnKeyType="next"
              onFocus={() => setFocusedField('businessName')}
              onBlur={() => setFocusedField((current) => current === 'businessName' ? null : current)}
              onSubmitEditing={() => ownerNameInput.current?.focus()}
              style={styles.input}
            />
            <ValidCheck visible={fieldValid.businessName && !errors.businessName} />
          </View>
          {errors.businessName ? <PartnerText style={styles.error}>{errors.businessName}</PartnerText> : null}

          <PartnerText style={styles.fieldLabelSpaced}>Owner name <PartnerText style={styles.required}>*</PartnerText></PartnerText>
          <View style={[styles.inputWrap, focusedField === 'ownerName' && styles.inputFocused, errors.ownerName && styles.inputError]}>
            <PartnerTextInput
              ref={ownerNameInput}
              value={vendorBusiness.ownerName}
              onChangeText={(ownerName) => {
                setVendorBusiness({ ownerName });
                if (errors.ownerName) setErrors((e) => ({ ...e, ownerName: '' }));
              }}
              placeholder="Full name of business owner"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              returnKeyType="next"
              onFocus={() => setFocusedField('ownerName')}
              onBlur={() => setFocusedField((current) => current === 'ownerName' ? null : current)}
              onSubmitEditing={() => mobileInput.current?.focus()}
              style={styles.input}
            />
            <ValidCheck visible={fieldValid.ownerName && !errors.ownerName} />
          </View>
          {errors.ownerName ? <PartnerText style={styles.error}>{errors.ownerName}</PartnerText> : null}

          <PartnerText style={styles.fieldLabelSpaced}>Mobile number <PartnerText style={styles.required}>*</PartnerText></PartnerText>
          <View style={[
            styles.inputWrap,
            styles.phoneInputWrap,
            focusedField === 'mobileNumber' && styles.inputFocused,
            errors.mobileNumber && styles.inputError,
          ]}>
            <View style={styles.countryPrefix}>
              <PartnerText style={styles.countryCode}>+91</PartnerText>
            </View>
            <PartnerTextInput
              ref={mobileInput}
              value={formatMobileDisplay(vendorBusiness.mobileNumber)}
              onChangeText={(text) => {
                setVendorBusiness({ mobileNumber: text.replace(/\D/g, '').slice(0, 10) });
                if (errors.mobileNumber) setErrors((e) => ({ ...e, mobileNumber: '' }));
              }}
              onFocus={() => setFocusedField('mobileNumber')}
              onBlur={() => setFocusedField((current) => current === 'mobileNumber' ? null : current)}
              keyboardType="number-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={11}
              placeholder="98765 43210"
              placeholderTextColor={colors.textMuted}
              returnKeyType="next"
              onSubmitEditing={() => emailInput.current?.focus()}
              style={styles.input}
            />
            <ValidCheck visible={fieldValid.mobileNumber && !errors.mobileNumber} />
          </View>
          {errors.mobileNumber ? <PartnerText style={styles.error}>{errors.mobileNumber}</PartnerText> : null}

          <PartnerText style={styles.fieldLabelSpaced}>Email <PartnerText style={styles.optional}>(optional)</PartnerText></PartnerText>
          <View style={[styles.inputWrap, focusedField === 'email' && styles.inputFocused, errors.email && styles.inputError]}>
            <PartnerTextInput
              ref={emailInput}
              value={vendorBusiness.email}
              onChangeText={(email) => {
                setVendorBusiness({ email: email.trimStart() });
                if (errors.email) setErrors((e) => ({ ...e, email: '' }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="done"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField((current) => current === 'email' ? null : current)}
              onSubmitEditing={() => { Keyboard.dismiss(); setFocusedField(null); }}
              placeholder="you@company.com"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <ValidCheck visible={Boolean(vendorBusiness.email.trim()) && fieldValid.email && !errors.email} />
          </View>
          {errors.email ? <PartnerText style={styles.error}>{errors.email}</PartnerText> : null}

          <PartnerText style={styles.fieldLabelSpaced}>Business type <PartnerText style={styles.required}>*</PartnerText></PartnerText>
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setFocusedField(null);
              showSelectOptions('Business type', BUSINESS_TYPE_OPTIONS, (businessType) => {
                setVendorBusiness({ businessType });
                if (errors.businessType) setErrors((e) => ({ ...e, businessType: '' }));
              }, vendorBusiness.businessType);
            }}
            style={[styles.inputWrap, errors.businessType && styles.inputError]}
            accessibilityRole="button">
            <PartnerText style={[styles.input, !vendorBusiness.businessType && styles.placeholder]} numberOfLines={1}>
              {vendorBusiness.businessType || 'Select business type'}
            </PartnerText>
            {fieldValid.businessType ? <ValidCheck visible /> : <ChevronDown size={18} color={colors.grey} />}
          </Pressable>
          {errors.businessType ? <PartnerText style={styles.error}>{errors.businessType}</PartnerText> : null}
        </View>

        <View style={styles.privacyNote}>
          <ShieldCheck size={14} color="#6B7280" />
          <PartnerText style={styles.privacyText}>Your information is used only to verify this partner account.</PartnerText>
        </View>
      </PartnerRegistrationStepCard>
    </DriverRegistrationLayout>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
  },
  fieldLabelSpaced: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 11,
    marginBottom: 5,
  },
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
    backgroundColor: '#F9FAFB',
  },
  inputFocused: { borderColor: '#94A3B8' },
  inputError: { borderColor: '#DC2626' },
  input: {
    flex: 1,
    minHeight: 40,
    color: '#111827',
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 6,
  },
  placeholder: { color: '#9CA3AF' },
  validCheck: { marginLeft: 5 },
  error: { marginTop: 3, color: '#DC2626', fontSize: 10.5 },
  countryPrefix: {
    minHeight: 24,
    justifyContent: 'center',
    paddingRight: 10,
    marginRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  countryCode: { color: '#374151', fontSize: 13, fontWeight: '600' },
  phoneInputWrap: { flex: 1 },
  privacyNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 11 },
  privacyText: { flex: 1, color: '#6B7280', fontSize: 10.5, lineHeight: 15 },
});
