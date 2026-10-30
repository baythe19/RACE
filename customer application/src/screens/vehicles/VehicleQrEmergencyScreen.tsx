import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import GlassCard from '../../components/ui/GlassCard';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { useAppDialog } from '../../hooks/useAppDialog';
import { getApiErrorMessage } from '../../services/api';
import { verifyVehicle } from '../../services/vehicleService';
import { getVehicleQrScanUrl } from '../../components/vehicles/vehicleUi';
import type { HomeStackParamList } from '../../types/navigation';
import type { VehicleVerifyValidResponse } from '../../types/vehicle';
import { colors, spacing, typography } from '../../theme';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<any, 'VehicleQrEmergency'>;

function formatTelUrl(number: string): string {
  const digits = number.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length >= 12) {
    return `tel:+${digits}`;
  }
  return `tel:+91${digits}`;
}

export default function VehicleQrEmergencyScreen({ navigation, route }: Props) {
  const vehicleId = (route.params as { vehicleId?: string } | undefined)?.vehicleId?.trim();
  const { dialog, showDialog } = useAppDialog();
  const [verified, setVerified] = useState<VehicleVerifyValidResponse | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (!vehicleId) {
      setVerifyError('No vehicle ID on this scan. Try scanning the sticker again.');
      setIsVerifying(false);
      return;
    }

    let cancelled = false;
    setIsVerifying(true);
    setVerifyError(null);
    setVerified(null);

    verifyVehicle(vehicleId)
      .then(result => {
        if (cancelled) return;
        if (!result.valid) {
          setVerifyError('This QR is not linked to an active RACE vehicle.');
          return;
        }
        setVerified(result);
      })
      .catch(error => {
        if (!cancelled) {
          setVerifyError(getApiErrorMessage(error, 'Unable to verify this QR right now.'));
        }
      })
      .finally(() => {
        if (!cancelled) setIsVerifying(false);
      });

    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  const callNumber = (number?: string) => {
    if (!number?.trim()) {
      showDialog({
        tone: 'error',
        title: 'Unavailable',
        message: 'No phone number on file for this contact.',
        primaryLabel: 'OK',
      });
      return;
    }
    void Linking.openURL(formatTelUrl(number));
  };

  const handleRequestTowing = () => {
    const parent = navigation.getParent();
    if (parent) {
      (parent as any).navigate('Home', { screen: 'TowingService' });
    } else {
      try {
        navigation.navigate('Home', { screen: 'TowingService' });
      } catch {
        navigation.navigate('TowingService');
      }
    }
  };

  const handleSendSOS = () => {
    navigation.navigate('SOSEmergency');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {dialog}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.badge}>
          <Ionicons name="warning" size={16} color={colors.textLight} />
          <Text style={styles.badgeText}>Emergency QR</Text>
        </View>

        {isVerifying ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.meta}>Verifying vehicle…</Text>
          </View>
        ) : verifyError ? (
          <View style={{ alignItems: 'stretch', paddingVertical: spacing.md }}>
            <GlassCard>
              <Text style={styles.errorTitle}>QR not recognised</Text>
              <Text style={styles.meta}>{verifyError}</Text>
            </GlassCard>
            <PrimaryButton label="Call 112" onPress={() => void Linking.openURL('tel:112')} />
            <Pressable
              onPress={() => goBackWithinStack(navigation)}
              style={{ alignItems: 'center', marginTop: spacing.md }}>
              <Text style={styles.linkMuted}>Go back</Text>
            </Pressable>
          </View>
        ) : verified ? (
          <>
            <GlassCard>
              <Text style={styles.plate}>{verified.vehicleNumber}</Text>
              <Text style={styles.meta}>
                {verified.brand} {verified.model}
              </Text>
              {verified.color ? (
                <Text style={styles.meta}>
                  {verified.color} · {verified.fuelType}
                </Text>
              ) : null}
              {verified.ownerName ? (
                <Text style={styles.owner}>Owner: {verified.ownerName}</Text>
              ) : null}
            </GlassCard>

            <PrimaryButton
              label={`📞 Contact Owner${verified.ownerName ? `: ${verified.ownerName}` : ''}`}
              onPress={() => callNumber(verified.ownerMobile)}
            />
            <PrimaryButton
              label={`🚨 Emergency Contact: ${verified.emergencyName ?? 'Call'}`}
              onPress={() => callNumber(verified.emergencyMobile)}
              variant="outline"
            />
            <PrimaryButton
              label="🚜 Request Towing for this Vehicle"
              onPress={handleRequestTowing}
              variant="outline"
            />
            <PrimaryButton
              label="⚠️ Send SOS Emergency Alert"
              onPress={handleSendSOS}
              variant="outline"
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surfaceDarker },
  content: { padding: spacing.lg },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    marginBottom: spacing.lg,
  },
  badgeText: { color: colors.textLight, fontWeight: typography.weights.bold },
  plate: {
    color: colors.textLight,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  meta: { color: colors.grey, textAlign: 'center', marginTop: spacing.xs },
  owner: {
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontWeight: typography.weights.semibold,
  },
  errorTitle: {
    color: colors.textLight,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  linkMuted: {
    color: colors.grey,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
});
