import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowLeft, Camera, CheckCircle2, MapPin, Phone, ShieldCheck } from 'lucide-react-native';
import VehicleDamageInspectionModal, { type InspectionData } from '../inspection/VehicleDamageInspectionModal';

const OTP_LENGTH = 4;

interface Props {
  pickupAddress: string;
  customerName?: string;
  customerMobile?: string;
  tripOtp: string;
  setTripOtp: (otp: string) => void;
  otpError?: string;
  onVerify: () => void;
  onUndoArrival: () => void;
  acting?: boolean;
  /** Preview builds only: tells the tester which code the mock backend accepts. */
  previewHint?: string;
  insetsTop?: number;
  insetsBottom?: number;
}

/**
 * Pickup reached — the ONLY place the customer OTP is entered.
 * (Previously a sheet led to a second full-screen OTP page; both are now one sheet.)
 */
export default function ArrivedPickupCard({
  pickupAddress,
  customerName = 'Customer',
  customerMobile,
  tripOtp,
  setTripOtp,
  otpError,
  onVerify,
  onUndoArrival,
  acting = false,
  previewHint,
  insetsTop = 0,
  insetsBottom = 0,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  // iOS does not resize the window for the number pad; lift the sheet by hand.
  // (Android resizes the window itself, so no offset there.)
  const cardRef = useRef<View>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, event => {
      const { height } = event.endCoordinates;
      setKeyboardHeight(height);
    });
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const complete = tripOtp.length === OTP_LENGTH;
  const canSubmit = complete && !acting;

  const [inspectionModalVisible, setInspectionModalVisible] = useState(false);
  const [inspectionData, setInspectionData] = useState<InspectionData>({});

  const inspectionPhotoCount = Object.keys(inspectionData).filter(
    k => k.endsWith('Photo') && Boolean((inspectionData as any)[k]),
  ).length;

  return (
    <>
      <View style={[styles.topBanner, { top: insetsTop + 8 }]} pointerEvents="box-none">
        <View style={styles.bannerInner}>
          <View style={styles.pinCircle}>
            <MapPin size={18} color="#FFFFFF" strokeWidth={2.6} />
          </View>
          <View style={styles.bannerTextCol}>
            <Text style={styles.bannerTitle}>You have reached pickup</Text>
            <Text style={styles.bannerSubtitle} numberOfLines={1}>
              {pickupAddress}
            </Text>
          </View>
        </View>
      </View>

      <View ref={cardRef} style={[styles.bottomCard, { bottom: keyboardHeight }]} pointerEvents="box-none">
        {/* Bottom padding is inside the surface: no strip of map under the sheet. */}
        <View style={[styles.cardSurface, { paddingBottom: (keyboardHeight > 0 ? 0 : Math.max(insetsBottom, 12)) + 12 }]}>
          <View style={styles.handle} />

          <View style={styles.headlineRow}>
            <View style={styles.shieldBadge}>
              <ShieldCheck size={20} color="#15803D" strokeWidth={2.4} />
            </View>
            <View style={styles.headlineText}>
              <Text style={styles.cardTitle}>Verify customer OTP</Text>
              <Text style={styles.cardSubtitle}>
                Ask {customerName} for the 4-digit code to start the service.
              </Text>
            </View>
          </View>

          {/* Pre-Trip Vehicle Damage Inspection Trigger */}
          <Pressable
            style={({ pressed }) => [
              styles.inspectionRow,
              pressed && styles.inspectionRowPressed,
            ]}
            onPress={() => setInspectionModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Record pre-trip damage inspection photos">
            <View style={styles.inspectionIconWrap}>
              {inspectionPhotoCount > 0 ? (
                <CheckCircle2 size={20} color="#10B981" />
              ) : (
                <Camera size={20} color="#D97706" />
              )}
            </View>
            <View style={styles.inspectionTextWrap}>
              <Text style={styles.inspectionTitle}>Pre-Trip Damage Inspection</Text>
              <Text style={styles.inspectionSubtitle} numberOfLines={1}>
                {inspectionPhotoCount > 0
                  ? `✅ ${inspectionPhotoCount}/4 photos recorded · Tap to review`
                  : 'Capture 4 vehicle angles before towing (Protects you)'}
              </Text>
            </View>
            <View style={[styles.inspectionBadge, inspectionPhotoCount > 0 && styles.inspectionBadgeSaved]}>
              <Text style={[styles.inspectionBadgeText, inspectionPhotoCount > 0 && styles.inspectionBadgeTextSaved]}>
                {inspectionPhotoCount > 0 ? 'Recorded' : 'Inspect'}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => inputRef.current?.focus()}
            style={styles.boxesRow}
            accessibilityRole="button"
            accessibilityLabel="Tap to enter the customer OTP">
            {Array.from({ length: OTP_LENGTH }, (_, idx) => (
              <View
                key={idx}
                style={[
                  styles.box,
                  tripOtp.length === idx && styles.boxFocused,
                  Boolean(otpError) && styles.boxError,
                ]}>
                <Text style={styles.boxChar}>{tripOtp[idx] ?? ''}</Text>
              </View>
            ))}
            <TextInput
              ref={inputRef}
              value={tripOtp}
              onChangeText={text => setTripOtp(text.replace(/\D/g, '').slice(0, OTP_LENGTH))}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              style={styles.hiddenInput}
              returnKeyType="done"
              onSubmitEditing={() => canSubmit && onVerify()}
            />
          </Pressable>

          {otpError ? (
            <Text style={styles.errorText} accessibilityLiveRegion="polite">
              {otpError}
            </Text>
          ) : previewHint ? (
            <Text style={styles.hintText}>{previewHint}</Text>
          ) : null}

          <Pressable
            onPress={onVerify}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
            accessibilityLabel="Verify OTP and start service"
            style={({ pressed }) => [
              styles.primaryButton,
              !canSubmit && styles.primaryButtonDisabled,
              pressed && canSubmit && styles.primaryButtonPressed,
            ]}>
            {acting ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <Text style={styles.primaryButtonText}>Verify & start service</Text>
            )}
          </Pressable>

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => (customerMobile ? void Linking.openURL(`tel:${customerMobile}`) : undefined)}
              accessibilityRole="button"
              accessibilityLabel="Call customer"
              style={({ pressed }) => [styles.callButton, pressed && styles.callButtonPressed]}>
              <Phone size={15} color="#0F172A" strokeWidth={2.4} style={{ marginRight: 6 }} />
              <Text style={styles.callButtonText}>Call customer</Text>
            </Pressable>

            <Pressable
              onPress={onUndoArrival}
              disabled={acting}
              accessibilityRole="button"
              accessibilityLabel="Not at pickup yet, return to navigation"
              style={({ pressed }) => [styles.undoButton, pressed && { opacity: 0.7 }]}>
              <ArrowLeft size={14} color="#64748B" strokeWidth={2.2} style={{ marginRight: 4 }} />
              <Text style={styles.undoButtonText}>Not at pickup yet</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <VehicleDamageInspectionModal
        visible={inspectionModalVisible}
        initialData={inspectionData}
        onClose={() => setInspectionModalVisible(false)}
        onSave={setInspectionData}
      />
    </>
  );
}

const styles = StyleSheet.create({
  topBanner: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 25,
  },
  bannerInner: {
    backgroundColor: '#FEA701',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  pinCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  bannerSubtitle: {
    color: '#FFFBEB',
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 2,
  },
  bottomCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 25,
  },
  cardSurface: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headlineText: {
    flex: 1,
    marginLeft: 12,
  },
  shieldBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 17,
  },
  boxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 18,
  },
  box: {
    width: 56,
    height: 58,
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
    fontSize: 25,
    fontWeight: '800',
    color: '#0F172A',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  errorText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#DC2626',
    fontSize: 12.5,
    fontWeight: '600',
  },
  hintText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: '#FEA701',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonDisabled: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonPressed: {
    backgroundColor: '#F59E0B',
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  actionRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  callButtonPressed: {
    backgroundColor: '#F1F5F9',
  },
  callButtonText: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '700',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  undoButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  inspectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 14,
  },
  inspectionRowPressed: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  inspectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  inspectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#92400E',
  },
  inspectionSubtitle: {
    fontSize: 11.5,
    color: '#B45309',
    marginTop: 2,
  },
  inspectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
  },
  inspectionBadgeSaved: {
    backgroundColor: '#10B981',
  },
  inspectionBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  inspectionBadgeTextSaved: {
    color: '#FFFFFF',
  },
});
