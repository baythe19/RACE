import { PartnerText, PartnerTextInput } from '../../../components/partner/PartnerText';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera, Calendar, MapPin, CheckCircle, ChevronDown, Plus, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { useAppSelector } from '../../../redux/hooks';
import { useDriverProfileQuery, driverQueryKeys } from '../../../services/driver/useDriverQueries';
import { updateProfile } from '../../../services/profileService';
import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';
import { usePartnerPayoutStore } from '../../../store/partnerPayoutStore';
import type { PartnerAccountStackParamList } from '../../../types/partnerNavigation';
import PartnerSuccessDialog from '../../../components/partner/dialogs/PartnerSuccessDialog';
import PartnerUploadSheet from '../../../components/partner/dialogs/PartnerUploadSheet';
import { usePartnerDialog } from '../../../hooks/usePartnerDialog';
import PartnerScreenLayout from '../../../components/partner/PartnerScreenLayout';
import DriverDataSkeleton from '../../../components/partner/DriverDataSkeleton';

import PartnerPermissionDialog, { type PermissionType } from '../../../components/partner/dialogs/PartnerPermissionDialog';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'PartnerEditProfile'>;

export default function PartnerEditProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { dialog: partnerDialog, showAlert } = usePartnerDialog();
  const queryClient = useQueryClient();
  const user = useAppSelector(state => state.auth.user);
  const { data: profile, isLoading: profileLoading } = useDriverProfileQuery();

  const [fullName, setFullName] = useState(profile?.fullName || user?.fullName || 'Partner');
  const [email, setEmail] = useState(profile?.email || user?.email || '');
  const [dob, setDob] = useState('');
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

  const [permissionModal, setPermissionModal] = useState<{
    visible: boolean;
    type: PermissionType;
    onAllow: () => void;
  }>({
    visible: false,
    type: 'camera',
    onAllow: () => {},
  });

  const avatarUri = usePartnerPayoutStore(state => state.avatarUri);
  const setAvatarUri = usePartnerPayoutStore(state => state.setAvatarUri);

  const triggerCameraLaunch = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.85,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch {
      showAlert({ tone: 'error', title: 'Error', message: 'Unable to capture photo. Please try again.' });
    }
  };

  const handleTakePhoto = async () => {
    try {
      const status = await ImagePicker.getCameraPermissionsAsync();
      if (!status.granted) {
        setPermissionModal({
          visible: true,
          type: 'camera',
          onAllow: async () => {
            setPermissionModal(prev => ({ ...prev, visible: false }));
            const req = await ImagePicker.requestCameraPermissionsAsync();
            if (req.granted) {
              await triggerCameraLaunch();
            }
          },
        });
        return;
      }
      await triggerCameraLaunch();
    } catch {
      showAlert({ tone: 'error', title: 'Error', message: 'Unable to capture photo. Please try again.' });
    }
  };

  const triggerGalleryLaunch = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch {
      showAlert({ tone: 'error', title: 'Error', message: 'Unable to select image. Please try again.' });
    }
  };

  const handlePickGallery = async () => {
    try {
      const status = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!status.granted) {
        setPermissionModal({
          visible: true,
          type: 'photos',
          onAllow: async () => {
            setPermissionModal(prev => ({ ...prev, visible: false }));
            const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (req.granted) {
              await triggerGalleryLaunch();
            }
          },
        });
        return;
      }
      await triggerGalleryLaunch();
    } catch {
      showAlert({ tone: 'error', title: 'Error', message: 'Unable to select image. Please try again.' });
    }
  };

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
    if (profile?.dateOfBirth) {
      // API date (YYYY-MM-DD) shown as DD/MM/YYYY
      const [y, m, d] = profile.dateOfBirth.slice(0, 10).split('-');
      if (y && m && d) setDob(`${d}/${m}/${y}`);
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
        dateOfBirth: (() => {
          // Typed DD/MM/YYYY → API ISO; keep prior value when untouched/invalid
          const m = dob.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
          if (m) return `${m[3]}-${m[2]}-${m[1]}`;
          return /^\d{4}-\d{2}-\d{2}$/.test(dob.trim()) ? dob.trim() : profile?.dateOfBirth ?? '1998-06-29';
        })(),
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

  if (profileLoading && !profile) {
    return (
      <PartnerScreenLayout title="Edit Profile" onBack={() => navigation.goBack()}>
        <DriverDataSkeleton variant="profile" />
      </PartnerScreenLayout>
    );
  }

  return (
    <View style={{ flex: 1 }}>
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
            <PartnerText style={styles.saveButtonText}>Save Changes</PartnerText>
          )}
        </Pressable>
      }>
      {/* Avatar Header */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarCircle}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <PartnerText style={styles.avatarInitials}>
                {fullName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || 'OS'}
              </PartnerText>
            )}
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
          <PartnerText style={styles.errorText}>{errorMessage}</PartnerText>
        </View>
      ) : null}

      {/* Form Fields */}
      <View style={styles.formCard}>
        {/* Full Name */}
        <View style={styles.inputGroup}>
          <PartnerText style={styles.label}>
            Full Name <PartnerText style={styles.requiredStar}>*</PartnerText>
          </PartnerText>
          <PartnerTextInput
            style={styles.textInput}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter full name"
            placeholderTextColor={driverColors.greySoft}
          />
        </View>

        {/* Mobile Number (Read-only verified) */}
        <View style={styles.inputGroup}>
          <PartnerText style={styles.label}>Mobile Number</PartnerText>
          <View style={styles.readOnlyRow}>
            <PartnerText style={styles.readOnlyText}>{mobileNumber}</PartnerText>
            <View style={styles.verifiedBadge}>
              <CheckCircle size={14} color={driverColors.green} strokeWidth={2.5} />
              <PartnerText style={styles.verifiedText}>Verified</PartnerText>
            </View>
          </View>
          <PartnerText style={styles.helperText}>Mobile number cannot be changed</PartnerText>
        </View>

        {/* Email Address */}
        <View style={styles.inputGroup}>
          <PartnerText style={styles.label}>Email Address (Optional)</PartnerText>
          <PartnerTextInput
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
          <PartnerText style={styles.label}>
            Date of Birth <PartnerText style={styles.requiredStar}>*</PartnerText>
          </PartnerText>
          <View style={styles.inputWithIcon}>
            <Calendar size={18} color={driverColors.grey} strokeWidth={2} />
            <PartnerTextInput
              style={styles.inputIconText}
              value={dob}
              onChangeText={setDob}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={driverColors.greySoft}
            />
          </View>
        </View>

        {/* City */}
        <View style={styles.inputGroup}>
          <PartnerText style={styles.label}>City</PartnerText>
          <View style={styles.inputWithIcon}>
            <MapPin size={18} color={driverColors.grey} strokeWidth={2} />
            <PartnerTextInput
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
          <PartnerText style={styles.label}>
            Address <PartnerText style={styles.requiredStar}>*</PartnerText>
          </PartnerText>
          <PartnerTextInput
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
          <PartnerText style={styles.label}>Languages Known (Optional)</PartnerText>
          <View style={styles.chipsRow}>
            {languages.map(lang => (
              <View key={lang} style={styles.langChip}>
                <PartnerText style={styles.langChipText}>{lang}</PartnerText>
                <Pressable
                  hitSlop={6}
                  onPress={() => handleRemoveLanguage(lang)}>
                  <X size={14} color={driverColors.grey} strokeWidth={2.4} />
                </Pressable>
              </View>
            ))}

            {showAddLang ? (
              <View style={styles.addLangInputBox}>
                <PartnerTextInput
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
                <PartnerText style={styles.addChipText}>Add</PartnerText>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Supporting Dialogs */}
      <PartnerUploadSheet
        visible={uploadSheetVisible}
        subtitle="Profile photo"
        onTakePhoto={() => void handleTakePhoto()}
        onPickGallery={() => void handlePickGallery()}
        onClose={() => setUploadSheetVisible(false)}
      />

      <PartnerPermissionDialog
        visible={permissionModal.visible}
        type={permissionModal.type}
        onAllow={permissionModal.onAllow}
        onDeny={() => setPermissionModal(prev => ({ ...prev, visible: false }))}
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
    {partnerDialog}
    </View>
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
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
