import React, { useState } from 'react';
import { Alert, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Eye, EyeOff, Lock } from 'lucide-react-native';

import FormField from '../../components/auth/FormField';
import GoldButton from '../../components/auth/GoldButton';
import ProfileSubScreenLayout, { useProfilePx } from '../../components/profile/ProfileSubScreenLayout';
import { getApiErrorMessage } from '../../services/api';
import { changePassword } from '../../services/profileService';
import { colors, typography } from '../../theme';

const REF_W = 390;

export default function ChangePasswordScreen() {
  const px = useProfilePx();
  const { width } = useWindowDimensions();
  const scale = width / REF_W;

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigation = useNavigation();

  const inputStyle = {
    color: colors.dark,
    fontSize: px(14),
  };

  const handleSave = async () => {
    if (!current.trim()) {
      Alert.alert('Required', 'Enter your current password.');
      return;
    }
    if (next.length < 8) {
      Alert.alert('Weak Password', 'New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      await changePassword(current, next);
      Alert.alert('Updated', 'Your password has been changed successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Could not update password', getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileSubScreenLayout title="Change Password" subtitle="Update your login password">
      <View style={{ gap: px(4), marginBottom: px(20), marginTop: px(4) }}>
        <FormField
          label="Current Password"
          value={current}
          onChangeText={setCurrent}
          placeholder="Enter current password"
          Icon={Lock}
          variant="outlined"
          compact
          scale={scale}
          secureTextEntry={!showCurrent}
          style={inputStyle}
          rightElement={
            <Pressable onPress={() => setShowCurrent(v => !v)} hitSlop={8}>
              {showCurrent ? <EyeOff size={px(20)} color={colors.grey} /> : <Eye size={px(20)} color={colors.grey} />}
            </Pressable>
          }
        />
        <FormField
          label="New Password"
          value={next}
          onChangeText={setNext}
          placeholder="Enter new password"
          Icon={Lock}
          variant="outlined"
          compact
          scale={scale}
          secureTextEntry={!showNext}
          style={inputStyle}
          rightElement={
            <Pressable onPress={() => setShowNext(v => !v)} hitSlop={8}>
              {showNext ? <EyeOff size={px(20)} color={colors.grey} /> : <Eye size={px(20)} color={colors.grey} />}
            </Pressable>
          }
        />
        <FormField
          label="Confirm New Password"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Re-enter new password"
          Icon={Lock}
          variant="outlined"
          compact
          scale={scale}
          secureTextEntry={!showConfirm}
          style={inputStyle}
          rightElement={
            <Pressable onPress={() => setShowConfirm(v => !v)} hitSlop={8}>
              {showConfirm ? <EyeOff size={px(20)} color={colors.grey} /> : <Eye size={px(20)} color={colors.grey} />}
            </Pressable>
          }
        />
      </View>

      <Text style={{ fontSize: px(11), color: colors.grey, marginBottom: px(16), lineHeight: px(16) }}>
        Password must be at least 8 characters. Tap the eye icon to show what you type.
      </Text>

      <GoldButton
        label={saving ? 'Updating…' : 'Update Password'}
        disabled={saving}
        onPress={handleSave}
        style={{ width: '100%' }}
        height={px(52)}
        borderRadius={px(14)}
      />
    </ProfileSubScreenLayout>
  );
}
