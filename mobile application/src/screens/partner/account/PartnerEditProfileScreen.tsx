import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera, Calendar, MapPin, CheckCircle, ChevronDown, Plus, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { useAppSelector } from '../../../redux/hooks';
import { useDriverProfileQuery, driverQueryKeys } from '../../../services/driver/useDriverQueries';
import { updateProfile } from '../../../services/profileService';
import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';
import type { PartnerAccountStackParamList } from '../../../types/partnerNavigation';
import PartnerSuccessDialog from '../../../components/partner/dialogs/PartnerSuccessDialog';
import PartnerUploadSheet from '../../../components/partner/dialogs/PartnerUploadSheet';
import PartnerScreenLayout from '../../../components/partner/PartnerScreenLayout';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'PartnerEditProfile'>;

export default function PartnerEditProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const user = useAppSelector(state => state.auth.user);
  const { data: profile } = useDriverProfileQuery();

  const [fullName, setFullName] = useState(profile?.fullName || user?.fullName || 'Partner');
  const [email, setEmail] = useState(profile?.email || user?.email || '');
  const [dob, setDob] = useState('29 Jun 1998');
  const [city, setCity] = useState(profile?.address?.city || 'Bhubaneswar');
  const [address, setAddress] = useState(
    profile?.address?.line1 || 'Station Square, Bhubaneswar, Odisha',
  );
  const [languages, setLanguages] = useState<string[]>(['Odia', 'Hindi']);
  const [showAddLang, setShowAddLang] = useState(false);
  const [newLangInput, setNewLangInput] = useState('');

  const [uploadSheetVisible, setUploadSheetVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mobileNumber = profile?.mobileNumber || user?.mobileNumber || '+91 99765 43210';

  useEffect(() => {
    if (profile?.fullName || user?.fullName) {
      setFullName(profile?.fullName || user?.fullName || '');
    }
    if (profile?.email || user?.email) {
      setEmail(profile?.email || user?.email || '');
    }
    if (profile?.address?.city) {
      setCity(profile.address.city);
    }
    if (profile?.address?.line1) {
      setAddress(profile.address.line1);
    }
  }, [profile, user]);

  const handleAddLanguage = () => {
    if (newLangInput.trim() && !languages.includes(newLangInput.trim())) {
      setLanguages([...languages, newLangInput.trim()]);
      setNewLangInput('');
      setShowAddLang(false);
    }
  };

  const handleRemoveLanguage = (lang: string) => {
    setLanguages(languages.filter(l => l !== lang));
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      setErrorMessage('Full name is required');
      return;
    }
    setErrorMessage(null);
    setSaving(true);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        gender: profile?.gender ?? 'male',
        dateOfBirth: '1998-06-29',
        emergencyContact: profile?.emergencyContact ?? {
          name: 'Emergency Contact',
          mobileNumber: '9988776655',
          relationship: 'family',
        },
        address: {
          line1: address.trim() || 'Station Square',
          city: city.trim() || 'Bhubaneswar',
          state: profile?.address?.state ?? 'Odisha',
          pincode: profile?.address?.pincode ?? '751001',
          country: 'India',
        },
      });
      await queryClient.invalidateQueries({ queryKey: driverQueryKeys.profile });
      setSuccessVisible(true);
    } catch (e: any) {
      setErrorMessage(e?.message ?? 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PartnerScreenLayout
      title="Edit Profile"
      onBack={() => navigation.goBack()}
      footer={
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            getPressableFeedback(pressed),
            saving && styles.disabledButton,
          ]}
          disabled={saving}
          onPress={handleSave}>
          {saving ? (
            <ActivityIndicator size="small" color={driverColors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </Pressable>
      }>
      {/* Avatar Header */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>
              {fullName
                .split(' ')
                .map(n => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'OS'}
            </Text>
          </View>
          <Pressable
            style={styles.cameraBadge}
            hitSlop={8}
            onPress={() => setUploadSheetVisible(true)}>
            <Camera size={16} color={driverColors.white} strokeWidth={2.4} />
          </Pressable>
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Form Fields */}
      <View style={styles.formCard}>
        {/* Full Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Full Name <Text style={styles.requiredStar}>*</Text>
          </Text>
          <TextInput
            style={styles.textInput}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter full name"
            placeholderTextColor={driverColors.greySoft}
          />
        </View>

        {/* Mobile Number (Read-only verified) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mobile Number</Text>
          <View style={styles.readOnlyRow}>
            <Text style={styles.readOnlyText}>{mobileNumber}</Text>
            <View style={styles.verifiedBadge}>
              <CheckCircle size={14} color={driverColors.green} strokeWidth={2.5} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>
          <Text style={styles.helperText}>Mobile number cannot be changed</Text>
        </View>

        {/* Email Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address (Optional)</Text>
          <TextInput
            style={styles.textInput}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email address"
            placeholderTextColor={driverColors.greySoft}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Date of Birth */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Date of Birth <Text style={styles.requiredStar}>*</Text>
          </Text>
          <View style={styles.inputWithIcon}>
            <Calendar size={18} color={driverColors.grey} strokeWidth={2} />
            <TextInput
              style={styles.inputIconText}
              value={dob}
              onChangeText={setDob}
              placeholder="DD MMM YYYY"
              placeholderTextColor={driverColors.greySoft}
            />
          </View>
        </View>

        {/* City */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>City</Text>
          <View style={styles.inputWithIcon}>
            <MapPin size={18} color={driverColors.grey} strokeWidth={2} />
            <TextInput
              style={styles.inputIconText}
              value={city}
              onChangeText={setCity}
              placeholder="City name"
              placeholderTextColor={driverColors.greySoft}
            />
            <ChevronDown size={18} color={driverColors.grey} />
          </View>
        </View>

        {/* Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Address <Text style={styles.requiredStar}>*</Text>
          </Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={address}
            onChangeText={setAddress}
            placeholder="Full residential address"
            placeholderTextColor={driverColors.greySoft}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Languages Known */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Languages Known (Optional)</Text>
          <View style={styles.chipsRow}>
            {languages.map(lang => (
              <View key={lang} style={styles.langChip}>
                <Text style={styles.langChipText}>{lang}</Text>
                <Pressable
                  hitSlop={6}
                  onPress={() => handleRemoveLanguage(lang)}>
                  <X size={14} color={driverColors.grey} strokeWidth={2.4} />
                </Pressable>
              </View>
            ))}

            {showAddLang ? (
              <View style={styles.addLangInputBox}>
                <TextInput
                  style={styles.addLangTextInput}
                  value={newLangInput}
                  onChangeText={setNewLangInput}
                  placeholder="Language"
                  placeholderTextColor={driverColors.greySoft}
                  autoFocus
                  onSubmitEditing={handleAddLanguage}
                />
                <Pressable hitSlop={6} onPress={handleAddLanguage}>
                  <CheckCircle size={16} color={driverColors.green} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.addChip}
                onPress={() => setShowAddLang(true)}>
                <Plus size={14} color={driverColors.grey} strokeWidth={2.4} />
                <Text style={styles.addChipText}>Add</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Supporting Dialogs */}
      <PartnerUploadSheet
        visible={uploadSheetVisible}
        onTakePhoto={() => setUploadSheetVisible(false)}
        onPickGallery={() => setUploadSheetVisible(false)}
        onClose={() => setUploadSheetVisible(false)}
      />

      <PartnerSuccessDialog
        visible={successVisible}
        title="Updated successfully!"
        message="Your profile details have been updated."
        buttonLabel="Done"
        onDismiss={() => {
          setSuccessVisible(false);
          navigation.goBack();
        }}
      />
    </PartnerScreenLayout>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: driverColors.creamRow,
    borderWidth: 2,
    borderColor: driverColors.amberTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '800',
    color: driverColors.ink,
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: driverColors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: driverColors.white,
  },
  errorBanner: {
    backgroundColor: driverColors.redPill,
    padding: 12,
    borderRadius: driverRadius.innerCard,
    marginBottom: 16,
  },
  errorText: {
    color: driverColors.red,
    fontSize: 13,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    padding: 18,
    borderWidth: 1,
    borderColor: driverColors.hairline,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: driverColors.ink,
  },
  requiredStar: {
    color: driverColors.red,
  },
  textInput: {
    backgroundColor: driverColors.light,
    borderRadius: driverRadius.innerCard,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: driverColors.ink,
    borderWidth: 1,
    borderColor: driverColors.hairline,
  },
  multilineInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  readOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: driverColors.light,
    borderRadius: driverRadius.innerCard,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: driverColors.hairline,
  },
  readOnlyText: {
    fontSize: 14,
    color: driverColors.ink,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: driverColors.greenPill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: driverColors.green,
  },
  helperText: {
    fontSize: 11,
    color: driverColors.grey,
    marginTop: 2,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: driverColors.light,
    borderRadius: driverRadius.innerCard,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: driverColors.hairline,
  },
  inputIconText: {
    flex: 1,
    fontSize: 14,
    color: driverColors.ink,
    padding: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: driverColors.light,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: driverRadius.pill,
    borderWidth: 1,
    borderColor: driverColors.hairline,
  },
  langChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: driverColors.ink,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: driverColors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: driverRadius.pill,
    borderWidth: 1,
    borderColor: '#D0D4DC',
    borderStyle: 'dashed',
  },
  addChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: driverColors.grey,
  },
  addLangInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: driverColors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: driverRadius.pill,
    borderWidth: 1,
    borderColor: driverColors.amber,
  },
  addLangTextInput: {
    fontSize: 13,
    color: driverColors.ink,
    minWidth: 60,
    padding: 0,
  },
  saveButton: {
    height: 50,
    borderRadius: driverRadius.button,
    backgroundColor: driverColors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: driverColors.white,
  },
  disabledButton: {
    opacity: 0.7,
  },
});
