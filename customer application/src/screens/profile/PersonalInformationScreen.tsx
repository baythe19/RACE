import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Camera,
  ChevronDown,
  ChevronRight,
  Mail,
  Plus,
  Smartphone,
  User,
} from 'lucide-react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import FormField from '../../components/auth/FormField';
import DateOfBirthField from '../../components/auth/DateOfBirthField';
import GoldButton from '../../components/auth/GoldButton';
import SelectOptionModal, {
  type SelectOption,
} from '../../components/auth/SelectOptionModal';
import ProfileAddressFields, {
  type AddressFormValues,
} from '../../components/profile/ProfileAddressFields';
import ProfileEmergencyContactFields, {
  type EmergencyContactFormValues,
} from '../../components/profile/ProfileEmergencyContactFields';
import ProfileSubScreenLayout, { useProfilePx } from '../../components/profile/ProfileSubScreenLayout';
import DataSkeleton from '../../components/ui/DataSkeleton';
import { EMERGENCY_RELATIONSHIP_OPTIONS } from '../../constants/profileForm';
import { useAppDialog } from '../../hooks/useAppDialog';
import { useProfileStore } from '../../store/profileStore';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';
import { getApiErrorMessage } from '../../services/api';
import { apiDateToDisplay, buildUpdateProfilePayload, validateProfileForm } from '../../utils/profilePayload';
import { colors, shadows, typography } from '../../theme';
import type { ProfileStackParamList } from '../../types/navigation';

function formatRelationship(value?: string): string {
  if (!value) return '';
  const match = EMERGENCY_RELATIONSHIP_OPTIONS.find(
    option => option.toLowerCase() === value.toLowerCase(),
  );
  return match ?? value;
}

export default function PersonalInformationScreen() {
  const px = useProfilePx();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { dialog, showDialog } = useAppDialog();
  const { profile, fetchProfile, updateProfile, isLoading } = useProfileStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
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
  const [genderPickerOpen, setGenderPickerOpen] = useState(false);
  const [relationPickerOpen, setRelationPickerOpen] = useState(false);

  const genderOptions: SelectOption[] = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' },
  ];

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!profile) return;
    setName(profile.fullName ?? '');
    setEmail(profile.email ?? '');
    setDob(apiDateToDisplay(profile.dateOfBirth));
    setGender(profile.gender ?? '');
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
  }, [profile]);

  const clearError = (key: string) => {
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSave = async () => {
    if (isLoading) return;
    const nextErrors = validateProfileForm({
      fullName: name,
      email,
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
      await updateProfile(
        buildUpdateProfilePayload({
          fullName: name,
          email,
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
      );
      // Saved → refresh upstream pages, then return to Profile (standard
      // push/pop flow instead of leaving the user stuck on the form).
      void fetchProfile();
      showDialog({
        tone: 'success',
        title: 'Saved',
        message: 'Your profile has been updated.',
        primaryLabel: 'OK',
        onPrimary: () => goBackWithinStack(navigation),
      });
    } catch (error) {
      showDialog({
        tone: 'error',
        title: 'Profile',
        message: getApiErrorMessage(error, 'Unable to update profile'),
        primaryLabel: 'OK',
      });
    }
  };

  const optionalTag = (
    <Text style={{ fontSize: px(11), color: colors.grey }}>(Optional)</Text>
  );

  if (isLoading && !profile) {
    return (
      <ProfileSubScreenLayout title="Personal Information">
        <DataSkeleton variant="profile" />
      </ProfileSubScreenLayout>
    );
  }

  return (
    <ProfileSubScreenLayout title="Personal Information">
      {dialog}
      <Pressable
        onPress={() =>
          showDialog({
            tone: 'info',
            title: 'Profile photo',
            message: 'Photo upload is coming soon. Your name and contact details are saved on the server.',
            primaryLabel: 'Got it',
          })
        }
        style={{
          alignSelf: 'center',
          alignItems: 'center',
          marginBottom: px(22),
        }}>
        <View style={{ position: 'relative' }}>
          <View
            style={{
              width: px(88),
              height: px(88),
              borderRadius: px(44),
              backgroundColor: colors.goldLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Camera size={px(30)} color={colors.primary} strokeWidth={2} />
          </View>
          <View
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: px(26),
              height: px(26),
              borderRadius: px(13),
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: colors.background,
            }}>
            <Plus size={px(14)} color={colors.dark} strokeWidth={2.5} />
          </View>
        </View>
        <Text
          style={{
            marginTop: px(8),
            fontSize: px(13),
            fontWeight: typography.weights.bold,
            color: colors.primary,
          }}>
          Change Photo
        </Text>
      </Pressable>

      <View style={{ gap: px(12), marginBottom: px(20) }}>
        <FormField
          label="Full Name"
          value={name}
          onChangeText={text => {
            setName(text);
            clearError('name');
          }}
          placeholder="e.g. Shivam Ramdasani"
          Icon={User}
          variant="outlined"
          compact
          required
          error={errors.name}
        />
        <FormField
          label="Email (optional)"
          value={email}
          onChangeText={text => {
            setEmail(text);
            clearError('email');
          }}
          placeholder="your@email.com"
          Icon={Mail}
          variant="outlined"
          compact
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
        />
        <DateOfBirthField
          value={dob}
          onChange={text => {
            setDob(text);
            clearError('dob');
          }}
          error={errors.dob}
        />
        <FormField
          label="Gender"
          value={gender}
          onChangeText={() => {}}
          placeholder="Select gender"
          Icon={User}
          variant="outlined"
          compact
          editable={false}
          onPress={() => setGenderPickerOpen(true)}
          rightElement={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(6) }}>
              {optionalTag}
              <ChevronDown size={px(16)} color={colors.grey} />
            </View>
          }
        />
        <ProfileEmergencyContactFields
          values={emergency}
          errors={errors}
          onChange={patch => setEmergency(prev => ({ ...prev, ...patch }))}
          onClearError={clearError}
        />
        <ProfileAddressFields
          values={address}
          errors={errors}
          onChange={patch => setAddress(prev => ({ ...prev, ...patch }))}
          onClearError={clearError}
        />
      </View>

      <Pressable
        onPress={() => navigation.navigate('ChangeMobileNumber')}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: px(12),
            marginTop: px(18),
            marginBottom: px(8),
            paddingHorizontal: px(14),
            paddingVertical: px(12),
            borderRadius: px(14),
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: pressed ? colors.pageBg : colors.background,
          },
          shadows.card,
        ]}>
        <View
          style={{
            width: px(34),
            height: px(34),
            borderRadius: px(17),
            backgroundColor: colors.goldLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Smartphone size={px(16)} color={colors.primary} strokeWidth={2.2} />
        </View>
        <Text style={{ flex: 1, fontSize: px(13), fontWeight: typography.weights.bold, color: colors.dark }}>
          Change mobile number
        </Text>
        <ChevronRight size={px(16)} color={colors.grey} />
      </Pressable>

      <GoldButton
        label={isLoading ? 'Saving...' : 'Save Changes'}
        onPress={() => void handleSave()}
        style={shadows.card}
        disabled={isLoading}
      />

      <SelectOptionModal
        visible={genderPickerOpen}
        title="Select Gender"
        options={genderOptions}
        selectedValue={gender}
        onSelect={value => {
          setGender(value);
          clearError('gender');
        }}
        onClose={() => setGenderPickerOpen(false)}
      />
    </ProfileSubScreenLayout>
  );
}
