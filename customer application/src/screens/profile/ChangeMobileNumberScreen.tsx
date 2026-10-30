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
import { formatPhoneE164, getPhoneDigits } from '../../utils/phone';

export default function ChangeMobileNumberScreen() {
  const px = useProfilePx();
  const navigation = useNavigation();
  const { dialog, showDialog } = useAppDialog();
  const authUser = useAuthStore(state => state.user);
  const profile = useProfileStore(state => state.profile);
  const fetchProfile = useProfileStore(state => state.fetchProfile);
  const setUser = useAuthStore(state => state.setUser);
  const [newPhone, setNewPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [activeIndex, setActiveIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentPhone = profile?.mobileNumber ?? authUser?.mobileNumber ?? '';
  const currentDisplay = currentPhone ? formatPhoneE164(currentPhone) : '—';

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const normalizedNew = () => getPhoneDigits(newPhone).slice(-10);

  const handleSendOtp = async () => {
    const nextDigits = normalizedNew();
    if (nextDigits.length < 10) {
      showDialog({
        tone: 'warning',
        title: 'Invalid number',
        message: 'Enter a valid 10-digit mobile number.',
        primaryLabel: 'OK',
      });
      return;
    }
    if (nextDigits === getPhoneDigits(currentPhone).slice(-10)) {
      showDialog({
        tone: 'warning',
        title: 'Same number',
        message: 'Choose a number different from your current one.',
        primaryLabel: 'OK',
      });
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await requestMobileChange(nextDigits);
      setPendingToken(result.pendingToken);
      setDevOtp(result.devOtp ?? null);
      setOtpSent(true);
      setTimer(result.expiresIn ? Math.max(1, Math.round(result.expiresIn)) : 300);
      setDigits(['', '', '', '', '', '']);
      setActiveIndex(0);
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
        message: 'Enter the 6-digit code sent to your new number.',
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
      if (updatedAuthUser && updatedProfile?.mobileNumber) {
        setUser({ ...updatedAuthUser, mobileNumber: updatedProfile.mobileNumber });
      }
      const updatedDisplay = formatPhoneE164(updatedProfile?.mobileNumber ?? normalizedNew());
      showDialog({
        tone: 'success',
        title: 'Mobile updated',
        message: `Your login number is now ${updatedDisplay}. Use this number the next time you sign in.`,
        primaryLabel: 'OK',
        onPrimary: () => goBackWithinStack(navigation),
      });
      setPendingToken(null);
      setOtpSent(false);
    } catch (error) {
      showDialog({
        tone: 'error',
        title: 'Could not update',
        message: getApiErrorMessage(error),
        primaryLabel: 'OK',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProfileSubScreenLayout title="Change Mobile Number">
      {dialog}
      <View
        style={{
          borderRadius: px(14),
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.lightGrey,
          padding: px(14),
          marginBottom: px(18),
        }}>
        <Text style={{ fontSize: px(11), color: colors.grey, marginBottom: px(4) }}>Current number</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(8) }}>
          <Smartphone size={px(18)} color={colors.primary} strokeWidth={2} />
          <Text style={{ fontSize: px(16), fontWeight: typography.weights.bold, color: colors.dark }}>
            {currentDisplay}
          </Text>
        </View>
      </View>

      <FormField
        label="New mobile number"
        value={newPhone}
        onChangeText={text => setNewPhone(getPhoneDigits(text).slice(0, 10))}
        placeholder="10-digit number"
        Icon={Phone}
        variant="outlined"
        compact
        keyboardType="phone-pad"
        maxLength={10}
      />

      {otpSent && devOtp ? (
        <Text style={{ fontSize: px(11), color: colors.grey, marginBottom: px(12) }}>
          Dev OTP: {devOtp}
        </Text>
      ) : null}

      {otpSent ? (
        <View style={{ marginTop: px(8), marginBottom: px(18) }}>
          <Text
            style={{
              fontSize: px(13),
              fontWeight: typography.weights.bold,
              color: colors.dark,
              textAlign: 'center',
              marginBottom: px(12),
            }}>
            Enter OTP
          </Text>
          <OtpInput
            digits={digits}
            activeIndex={activeIndex}
            onChange={setDigits}
            onActiveIndexChange={setActiveIndex}
            px={px}
          />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: px(14),
              gap: px(8),
            }}>
            {timer > 0 ? (
              <Text style={{ fontSize: px(12), color: colors.grey }}>
                Resend in 00:{String(timer).padStart(2, '0')}
              </Text>
            ) : (
              <Pressable onPress={() => void handleSendOtp()} disabled={submitting}>
                <Text style={{ fontSize: px(12), fontWeight: typography.weights.bold, color: colors.primary }}>
                  Resend OTP
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : null}

      <GoldButton
        label={submitting ? 'Please wait…' : otpSent ? 'Confirm new number' : 'Send OTP'}
        disabled={submitting}
        onPress={() => void handleUpdate()}
        style={{ width: '100%', marginTop: px(4) }}
        height={px(52)}
        borderRadius={px(14)}
      />
    </ProfileSubScreenLayout>
  );
}
