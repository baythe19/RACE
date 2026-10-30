import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Phone, Smartphone } from 'lucide-react-native';

import FormField from '../../components/auth/FormField';
import GoldButton from '../../components/auth/GoldButton';
import OtpInput from '../../components/auth/OtpInput';
import ProfileSubScreenLayout, { useProfilePx } from '../../components/profile/ProfileSubScreenLayout';
import { useAppDialog } from '../../hooks/useAppDialog';
import { getApiErrorMessage } from '../../services/api';
import { confirmMobileChange, requestMobileChange } from '../../services/profileService';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { colors, typography } from '../../theme';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

export default function ChangeMobileNumberScreen() {
  const px = useProfilePx();
  const navigation = useNavigation();
  const { dialog, showDialog } = useAppDialog();
  const authUser = useAuthStore(state => state.user);
  const profile = useProfileStore(state => state.profile);
  const fetchProfile = useProfileStore(state => state.fetchProfile);
  const [newPhone, setNewPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [activeIndex, setActiveIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentPhone = profile?.mobileNumber ?? authUser?.mobileNumber ?? '';

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendOtp = async () => {
    if (!newPhone.trim() || newPhone.replace(/\D/g, '').length < 10) {
      showDialog({
        tone: 'warning',
        title: 'Invalid Number',
        message: 'Please enter a valid mobile number.',
        primaryLabel: 'OK',
      });
      return;
    }
    if (newPhone.replace(/\D/g, '').slice(-10) === currentPhone.replace(/\D/g, '').slice(-10)) {
      showDialog({
        tone: 'warning',
        title: 'Same Number',
        message: 'New number must be different from current number.',
        primaryLabel: 'OK',
      });
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await requestMobileChange(newPhone.replace(/\D/g, '').slice(-10));
      setPendingToken(result.pendingToken);
      setDevOtp(result.devOtp ?? null);
      setOtpSent(true);
      setTimer(result.expiresIn ? Math.max(1, Math.round(result.expiresIn)) : 300);
      setDigits(['', '', '', '', '', '']);
      setActiveIndex(0);
      showDialog({
        tone: 'success',
        title: 'OTP Sent',
        message: `Verification code sent to ${result.newMobile}`,
        primaryLabel: 'OK',
      });
    } catch (error) {
      showDialog({
        tone: 'error',
        title: 'Could not send OTP',
        message: getApiErrorMessage(error),
        primaryLabel: 'OK',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    const pending = pendingToken;
    if (!otpSent || !pending) {
      void handleSendOtp();
      return;
    }
    const code = digits.join('');
    if (code.length !== 6) {
      showDialog({
        tone: 'warning',
        title: 'Invalid OTP',
        message: 'Please enter the complete 6-digit code.',
        primaryLabel: 'OK',
      });
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      await confirmMobileChange(pending, code);
      await fetchProfile();
      const updatedProfile = useProfileStore.getState().profile;
      const updatedAuthUser = useAuthStore.getState().user;
      if (updatedAuthUser && updatedProfile) {
        useAuthStore.getState().setUser({ ...updatedAuthUser, mobileNumber: updatedProfile.mobileNumber });
      }
      showDialog({
        tone: 'success',
        title: 'Updated',
        message: `Your mobile number has been updated to ${newPhone}.`,
        primaryLabel: 'OK',
        onPrimary: () => goBackWithinStack(navigation),
      });
    } catch (error) {
      showDialog({
        tone: 'error',
        title: 'Could not update number',
        message: getApiErrorMessage(error),
        primaryLabel: 'OK',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProfileSubScreenLayout
      title="Change Mobile Number"
      subtitle="Verify your new number with OTP">
      {dialog}
      <View
        style={{
          borderRadius: px(14),
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.lightGrey,
          padding: px(14),
          marginBottom: px(16),
        }}>
        <Text style={{ fontSize: px(11), color: colors.grey, marginBottom: px(4) }}>Current Number</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(8) }}>
          <Smartphone size={px(18)} color={colors.primary} strokeWidth={2} />
          <Text style={{ fontSize: px(16), fontWeight: typography.weights.bold, color: colors.dark }}>
            {currentPhone || '—'}
          </Text>
        </View>
      </View>

      <FormField
        label="New Mobile Number"
        value={newPhone}
        onChangeText={setNewPhone}
        placeholder="+91 98765 43210"
        Icon={Phone}
        variant="outlined"
        compact
        keyboardType="phone-pad"
      />

      <Text style={{ fontSize: px(12), color: colors.grey, marginBottom: px(16), lineHeight: px(17) }}>
        We'll send a 6-digit OTP to your new number to confirm the change.
      </Text>

      {otpSent && devOtp ? (
        <Text style={{ fontSize: px(11), color: colors.grey, marginBottom: px(12) }}>
          Dev OTP for testing: {devOtp}
        </Text>
      ) : null}

      {otpSent ? (
        <View style={{ marginBottom: px(16) }}>
          <Text
            style={{
              fontSize: px(13),
              fontWeight: typography.weights.bold,
              color: colors.dark,
              textAlign: 'center',
              marginBottom: px(12),
            }}>
            Enter Verification Code
          </Text>
          <OtpInput
            digits={digits}
            activeIndex={activeIndex}
            onChange={setDigits}
            onActiveIndexChange={setActiveIndex}
            px={px}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: px(14), gap: px(8) }}>
            {timer > 0 ? (
              <Text style={{ fontSize: px(12), color: colors.grey }}>Resend code in 00:{String(timer).padStart(2, '0')}</Text>
            ) : (
              <Pressable onPress={handleSendOtp}>
                <Text style={{ fontSize: px(12), fontWeight: typography.weights.bold, color: colors.primary }}>
                  Resend OTP
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : null}

      <GoldButton
        label={submitting ? 'Please wait…' : otpSent ? 'Update Mobile Number' : 'Send OTP'}
        disabled={submitting}
        onPress={handleUpdate}
        style={{ width: '100%' }}
        height={px(52)}
        borderRadius={px(14)}
      />
    </ProfileSubScreenLayout>
  );
}
