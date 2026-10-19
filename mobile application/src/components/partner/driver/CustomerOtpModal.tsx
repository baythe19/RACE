import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ShieldCheck, ArrowLeft, Phone } from 'lucide-react-native';

interface Props {
  bookingNumber: string;
  tripOtp: string;
  setTripOtp: (otp: string) => void;
  otpError: string;
  acting: boolean;
  onVerify: () => void;
  onBack: () => void;
  customerMobile?: string;
  insetsTop?: number;
  insetsBottom?: number;
}

const OTP_LENGTH = 4;

export default function CustomerOtpModal({
  bookingNumber,
  tripOtp,
  setTripOtp,
  otpError,
  acting,
  onVerify,
  onBack,
  customerMobile,
  insetsTop = 0,
  insetsBottom = 0,
}: Props) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Focus number pad immediately when opening OTP screen
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insetsTop }]}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <ArrowLeft size={22} color="#0F172A" strokeWidth={2.4} />
        </Pressable>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Verify customer OTP</Text>
          <Text style={styles.headerSubtitle}>#{bookingNumber}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}>
        <View style={styles.contentWrap}>
          {/* Orange Shield Badge */}
          <View style={styles.shieldHalo}>
            <View style={styles.shieldCircle}>
              <ShieldCheck size={28} color="#FFFFFF" strokeWidth={2.6} />
            </View>
          </View>

          {/* Headline & Subtitle */}
          <Text style={styles.headline}>Enter 4-digit OTP</Text>
          <Text style={styles.subheadline}>
            Ask the customer for the OTP to start the service.
          </Text>

          {/* 4 Digit Boxes with hidden text input */}
          <Pressable
            onPress={() => inputRef.current?.focus()}
            style={styles.boxesRow}
            accessibilityRole="button"
            accessibilityLabel="Tap to enter OTP">
            {Array.from({ length: OTP_LENGTH }, (_, idx) => {
              const char = tripOtp[idx] ?? '';
              const isFocused = tripOtp.length === idx;
              return (
                <View
                  key={idx}
                  style={[
                    styles.box,
                    isFocused && styles.boxFocused,
                    Boolean(otpError) && styles.boxError,
                  ]}>
                  <Text style={styles.boxChar}>{char}</Text>
                </View>
              );
            })}

            {/* Hidden Input for reliable native keypad input */}
            <TextInput
              ref={inputRef}
              value={tripOtp}
              onChangeText={text => {
                const clean = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
                setTripOtp(clean);
                if (clean.length === OTP_LENGTH) {
                  // Optional auto-submit when all 4 digits are entered
                }
              }}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              style={styles.hiddenInput}
              autoFocus
            />
          </Pressable>

          {/* Error Message */}
          {otpError ? (
            <View style={styles.errorBubble}>
              <Text style={styles.errorText}>{otpError}</Text>
            </View>
          ) : null}

          {/* Primary Action Button: Start service */}
          <Pressable
            onPress={onVerify}
            disabled={acting || tripOtp.length !== OTP_LENGTH}
            accessibilityRole="button"
            accessibilityLabel="Start service"
            style={({ pressed }) => [
              styles.startServiceButton,
              (acting || tripOtp.length !== OTP_LENGTH) && styles.startServiceDisabled,
              pressed && styles.startServicePressed,
            ]}>
            {acting ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <Text style={styles.startServiceText}>Start service</Text>
            )}
          </Pressable>

          {/* Help / Call Customer link */}
          <Pressable
            onPress={() => (customerMobile ? void Linking.openURL(`tel:${customerMobile}`) : undefined)}
            style={styles.helpLink}
            accessibilityRole="button">
            <Phone size={14} color="#64748B" strokeWidth={2.4} style={{ marginRight: 6 }} />
            <Text style={styles.helpLinkText}>Having issue? Call customer</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 50,
  },
  headerBar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  contentWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 36,
  },
  shieldHalo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FDE68A',
    marginBottom: 20,
  },
  shieldCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FEA701',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FEA701',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subheadline: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  boxesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
    position: 'relative',
  },
  box: {
    width: 58,
    height: 60,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFocused: {
    borderColor: '#FEA701',
    backgroundColor: '#FFFBEB',
  },
  boxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  boxChar: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  errorBubble: {
    marginTop: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12.5,
    fontWeight: '600',
  },
  startServiceButton: {
    alignSelf: 'stretch',
    backgroundColor: '#FEA701',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  startServicePressed: {
    backgroundColor: '#F59E0B',
    transform: [{ scale: 0.98 }],
  },
  startServiceDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  startServiceText: {
    color: '#0F172A',
    fontSize: 16.5,
    fontWeight: '800',
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  helpLinkText: {
    color: '#64748B',
    fontSize: 13.5,
    fontWeight: '600',
  },
});
