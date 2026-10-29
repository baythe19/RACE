import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import GoldButton from '../../../components/auth/GoldButton';
import { DRIVER_ACCENT, DRIVER_LIGHT_BG } from '../../../constants/driverBooking';
import { useProfileStore } from '../../../store/profileStore';
import { createEnquiry, type EnquiryDto } from '../../../services/enquiryService';
import type { HomeStackParamList } from '../../../types/navigation';
import { colors, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'DriverEnquiry'>;

function formatMobile(mobile?: string): string {
  if (!mobile) return '—';
  const digits = mobile.replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2)}`;
  }
  return mobile.startsWith('+') ? mobile : `+${digits}`;
}

export default function DriverEnquiryScreen({ navigation }: Props) {
  const { profile, fetchProfile } = useProfileStore();
  const [submitting, setSubmitting] = useState(false);
  const [enquiry, setEnquiry] = useState<EnquiryDto | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!profile) {
      void fetchProfile().catch((error) => {
        if (__DEV__) {
          console.warn('[DriverEnquiry] fetchProfile failed', error);
        }
      });
    }
  }, [profile, fetchProfile]);

  const handleCreateEnquiry = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await createEnquiry({
        serviceType: 'full_time_driver',
        notes: 'Full-time driver request from mobile customer app',
      });
      setEnquiry(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit enquiry';
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!attemptedRef.current) {
      attemptedRef.current = true;
      void handleCreateEnquiry();
    }
  }, []);

  const displayName = profile?.fullName?.trim() || enquiry?.customerName || 'Guest User';
  const displayMobile = formatMobile(profile?.mobileNumber || enquiry?.customerMobile);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 8 }}>
        <Pressable onPress={() => goBackWithinStack(navigation)} hitSlop={12} style={{ marginBottom: 20 }}>
          <Ionicons name="arrow-back" size={24} color={colors.dark} />
        </Pressable>

        <Text
          style={{
            fontSize: 22,
            fontWeight: typography.weights.extrabold,
            color: colors.dark,
            textAlign: 'center',
            marginBottom: 20,
          }}>
          Full-Time Driver
        </Text>

        {submitting ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={DRIVER_ACCENT} />
            <Text style={{ marginTop: 16, fontSize: 16, color: colors.grey }}>
              Registering your enquiry with support...
            </Text>
          </View>
        ) : errorMsg && !enquiry ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
            <Ionicons name="alert-circle-outline" size={54} color={colors.error || '#DC2626'} />
            <Text
              style={{
                fontSize: 18,
                fontWeight: typography.weights.bold,
                color: colors.dark,
                marginTop: 12,
                textAlign: 'center',
              }}>
              Could not submit enquiry
            </Text>
            <Text style={{ fontSize: 14, color: colors.grey, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
              {errorMsg}
            </Text>
            <GoldButton
              label={submitting ? 'Submitting...' : 'Try Again'}
              onPress={() => void handleCreateEnquiry()}
              disabled={submitting}
              loading={submitting}
            />
          </View>
        ) : (
          <>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  backgroundColor: DRIVER_LIGHT_BG,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}>
                <Ionicons name="calendar" size={42} color={DRIVER_ACCENT} />
              </View>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: typography.weights.extrabold,
                  color: colors.dark,
                  marginBottom: 8,
                }}>
                Enquiry Raised!
              </Text>
              <Text style={{ fontSize: 15, color: colors.grey, textAlign: 'center' }}>
                Our support team will contact you shortly
              </Text>
              {enquiry?.enquiryNumber ? (
                <View
                  style={{
                    marginTop: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 12,
                    backgroundColor: '#FEF3C7',
                    borderWidth: 1,
                    borderColor: '#F59E0B',
                  }}>
                  <Text style={{ fontSize: 13, fontWeight: typography.weights.bold, color: '#B45309' }}>
                    Ref #{enquiry.enquiryNumber}
                  </Text>
                </View>
              ) : null}
            </View>

            <View
              style={{
                backgroundColor: DRIVER_LIGHT_BG,
                borderRadius: 16,
                padding: 16,
                gap: 14,
                marginBottom: 20,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="call-outline" size={20} color={DRIVER_ACCENT} />
                <Text style={{ flex: 1, fontSize: 14, color: colors.dark }}>
                  We'll call you within 2 hours
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="time-outline" size={20} color={DRIVER_ACCENT} />
                <Text style={{ flex: 1, fontSize: 14, color: colors.dark }}>
                  Available Mon-Sat, 9AM-6PM
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="briefcase-outline" size={20} color={DRIVER_ACCENT} />
                <Text style={{ flex: 1, fontSize: 14, color: colors.dark }}>
                  Full-time drivers from ₹999/day
                </Text>
              </View>
            </View>

            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 16,
                gap: 12,
                marginBottom: 24,
              }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, color: colors.grey }}>Name</Text>
                <Text style={{ fontSize: 14, fontWeight: typography.weights.bold, color: colors.dark }}>
                  {displayName}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, color: colors.grey }}>Mobile</Text>
                <Text style={{ fontSize: 14, fontWeight: typography.weights.bold, color: colors.dark }}>
                  {displayMobile}
                </Text>
              </View>
            </View>

            <View style={{ gap: 10, marginTop: 'auto', paddingBottom: 16 }}>
              <GoldButton
                label="Back to Services"
                onPress={() => {
                  navigation.dispatch(
                    CommonActions.navigate({
                      name: 'Services',
                      params: { screen: 'ServicesMain' },
                    }),
                  );
                }}
              />
              <GoldButton
                label="Go Home"
                onPress={() => navigation.popToTop()}
                variant="outline"
              />
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
