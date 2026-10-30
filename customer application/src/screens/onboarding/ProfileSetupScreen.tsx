import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  ChevronDown,
  Mail,
  Plus,
  User,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import FormField from '../../components/auth/FormField';
import DateOfBirthField from '../../components/auth/DateOfBirthField';
import GoldButton from '../../components/auth/GoldButton';
import StepHeader from '../../components/auth/StepHeader';
import AppActionSheet from '../../components/common/AppActionSheet';
import ProfileAddressFields, {
  type AddressFormValues,
} from '../../components/profile/ProfileAddressFields';
import ProfileEmergencyContactFields, {
  type EmergencyContactFormValues,
} from '../../components/profile/ProfileEmergencyContactFields';
import { EMERGENCY_RELATIONSHIP_OPTIONS } from '../../constants/profileForm';
import { useAppDialog } from '../../hooks/useAppDialog';
import { useProfileStore } from '../../store/profileStore';
import { useAuthStore } from '../../store/authStore';
import { setCustomerOnboardingStep } from '../../store/customerOnboarding';
import { useSignupDraftStore } from '../../store/signupDraftStore';
import type { AuthStackParamList } from '../../types/navigation';
import { getApiErrorMessage } from '../../services/api';
import { apiDateToDisplay, buildUpdateProfilePayload, validateProfileForm } from '../../utils/profilePayload';
import { colors, shadows, typography } from '../../theme';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

const REF_W = 390;

type Props = NativeStackScreenProps<AuthStackParamList, 'ProfileSetup'>;

function formatRelationship(value?: string): string {
  if (!value) return '';
  const match = EMERGENCY_RELATIONSHIP_OPTIONS.find(
    option => option.toLowerCase() === value.toLowerCase(),
  );
  return match ?? value;
}

export default function ProfileSetupScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const s = width / REF_W;
  const px = (n: number) => Math.round(n * s);

  const { dialog, showDialog } = useAppDialog();
  const { profile, updateProfile, isLoading } = useProfileStore();
  const signupDraft = useSignupDraftStore(state => state.draft);
  const canGoBack = navigation.canGoBack();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [emergency, setEmergency] = useState<EmergencyContactFormValues>({
    name: '',
    phone: '',
    relationship: '',
  });
  const [address, setAddress] = useState<AddressFormValues>({
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const nextName = profile?.fullName || signupDraft.fullName || '';
    setName(nextName);
    setEmail(profile?.email ?? '');

    if (!profile) return;

    setDob(apiDateToDisplay(profile.dateOfBirth));
    if (profile.gender) {
      const label = profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1);
      setGender(label === 'Prefer_not_to_say' ? 'Other' : label);
    }
    setEmergency({
      name: profile.emergencyContact?.name ?? '',
      phone: profile.emergencyContact?.mobileNumber ?? '',
      relationship: formatRelationship(profile.emergencyContact?.relationship),
    });
    setAddress({
      line1: profile.address?.line1 ?? '',
      line2: profile.address?.line2 ?? '',
      city: profile.address?.city ?? '',
      state: profile.address?.state ?? '',
      pincode: profile.address?.pincode ?? '',
    });
  }, [profile, signupDraft.fullName]);

  const providedName = (profile?.fullName || signupDraft.fullName || '').trim();
  const showNameField = !providedName;
  const showEmailField = !profile?.email?.trim();
  const resolvedName = providedName || name;

  const clearError = (key: string) => {
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const [genderSheetOpen, setGenderSheetOpen] = useState(false);

  const handleGenderPress = () => {
    setGenderSheetOpen(true);
  };

  const handleContinue = async () => {
    const nextErrors = validateProfileForm({
      fullName: resolvedName,
      email: email.trim() || undefined,
      gender,
      dateOfBirth: dob,
      emergencyPhone: emergency.phone,
      emergencyName: emergency.name,
      emergencyRelationship: emergency.relationship,
      addressLine1: address.line1,
      addressLine2: address.line2,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: profile?.address?.country,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await setCustomerOnboardingStep('vehicle');
      useAuthStore.getState().setCustomerOnboardingStep('vehicle');

      await updateProfile(
        buildUpdateProfilePayload({
          fullName: resolvedName,
          email: email.trim() || undefined,
          gender,
          dateOfBirth: dob,
          emergencyPhone: emergency.phone,
          emergencyName: emergency.name,
          emergencyRelationship: emergency.relationship,
          addressLine1: address.line1,
          addressLine2: address.line2,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          country: profile?.address?.country,
        }),
        { syncOnboarding: false },
      );

      navigation.replace('VehicleRegistration');
    } catch (error) {
      Alert.alert('Profile', getApiErrorMessage(error, 'Unable to save profile'));
    }
  };

  const optionalTag = (
    <Text style={{ fontSize: px(11), color: colors.grey }}>(Optional)</Text>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {dialog}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{
            paddingHorizontal: px(24),
            paddingBottom: px(16),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <StepHeader
            step={1}
            scale={s}
            onBack={canGoBack ? () => goBackWithinStack(navigation) : undefined}
            onSkip={() => {
              void setCustomerOnboardingStep('vehicle').then(() => {
                useAuthStore.getState().setCustomerOnboardingStep('vehicle');
                navigation.navigate('VehicleRegistration');
              });
            }}
          />

          <Text
            style={{
              fontSize: px(24),
              fontWeight: typography.weights.extrabold,
              color: colors.dark,
              textAlign: 'center',
            }}>
            Complete Your Profile
          </Text>
          <Text
            style={{
              marginTop: px(6),
              marginBottom: px(22),
              fontSize: px(14),
              color: colors.grey,
              textAlign: 'center',
            }}>
            Help us serve you better.
          </Text>

          <Pressable
            style={{ alignItems: 'center', marginBottom: px(24) }}
            onPress={() => Alert.alert('Photo', 'Camera coming soon')}>
            <View
              style={{
                width: px(110),
                height: px(110),
                borderRadius: px(55),
                borderWidth: 2,
                borderColor: colors.primary,
                backgroundColor: colors.goldLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Camera size={px(32)} color={colors.primary} />
              <View
                style={{
                  position: 'absolute',
                  bottom: px(4),
                  right: px(4),
                  width: px(22),
                  height: px(22),
                  borderRadius: px(11),
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Plus size={px(12)} color={colors.background} strokeWidth={3} />
              </View>
            </View>
            <Text
              style={{
                marginTop: px(12),
                fontSize: px(14),
                fontWeight: typography.weights.bold,
                color: colors.primary,
              }}>
              Add Photo
            </Text>
            <Text style={{ fontSize: px(11), color: colors.grey, marginTop: px(2) }}>
              (Optional)
            </Text>
          </Pressable>

          {(!showNameField || profile?.email?.trim()) ? (
            <View
              style={{
                marginBottom: px(16),
                padding: px(12),
                borderRadius: px(12),
                backgroundColor: colors.goldLight,
                borderWidth: 1,
                borderColor: colors.border,
              }}>
              <Text style={{ fontSize: px(12), color: colors.grey, marginBottom: px(4) }}>
                Already provided
              </Text>
              {!showNameField ? (
                <Text style={{ fontSize: px(14), color: colors.dark, fontWeight: typography.weights.semibold }}>
                  {resolvedName}
                </Text>
              ) : null}
              {profile?.email?.trim() ? (
                <Text style={{ fontSize: px(14), color: colors.dark, marginTop: px(4) }}>
                  {profile.email}
                </Text>
              ) : null}
            </View>
          ) : null}

          {showNameField ? (
          <FormField
            variant="outlined"
            compact
            scale={s}
            label="Full Name"
            required
            Icon={User}
            value={name}
            placeholder="e.g. Shivam Ramdasani"
            onChangeText={text => {
              setName(text);
              clearError('name');
            }}
            error={errors.name}
          />
          ) : null}

          {showEmailField ? (
          <FormField
            variant="outlined"
            compact
            scale={s}
            label="Email (optional)"
            Icon={Mail}
            value={email}
            placeholder="you@example.com"
            onChangeText={text => {
              setEmail(text);
              clearError('email');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          ) : null}

          <DateOfBirthField
            scale={s}
            value={dob}
            onChange={text => {
              setDob(text);
              clearError('dob');
            }}
            error={errors.dob}
          />

          <FormField
            variant="outlined"
            compact
            scale={s}
            label="Gender"
            Icon={User}
            value={gender}
            placeholder="Select gender"
            onPress={handleGenderPress}
            editable={false}
            rightElement={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(6) }}>
                {optionalTag}
                <ChevronDown size={px(18)} color={colors.grey} />
              </View>
            }
          />

          <ProfileEmergencyContactFields
            scale={s}
            values={emergency}
            errors={errors}
            onChange={patch => setEmergency(prev => ({ ...prev, ...patch }))}
            onClearError={clearError}
          />

          <ProfileAddressFields
            scale={s}
            values={address}
            errors={errors}
            onChange={patch => setAddress(prev => ({ ...prev, ...patch }))}
            onClearError={clearError}
          />
        </ScrollView>

        <View
          style={{
            paddingHorizontal: px(24),
            paddingTop: px(12),
            paddingBottom: Math.max(insets.bottom, px(16)),
            backgroundColor: colors.pageBg,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
          }}>
          <GoldButton
            label={isLoading ? 'Saving...' : 'Save & Continue'}
            onPress={() => void handleContinue()}
            style={[styles.fullBtn, shadows.card]}
            height={px(54)}
            labelSize={px(17)}
            borderRadius={px(14)}
            disabled={isLoading}
          />
        </View>
      </KeyboardAvoidingView>
      <AppActionSheet
        visible={genderSheetOpen}
        title="Select Gender"
        onCancel={() => setGenderSheetOpen(false)}
        options={[
          { key: 'male', label: 'Male', onPress: () => setGender('Male') },
          { key: 'female', label: 'Female', onPress: () => setGender('Female') },
          { key: 'other', label: 'Other', onPress: () => setGender('Other') },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  flex: {
    flex: 1,
  },
  fullBtn: {
    width: '100%',
  },
});
