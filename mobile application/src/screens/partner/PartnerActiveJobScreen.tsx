import { PartnerText, PartnerTextInput } from '../../components/partner/PartnerText';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { MapPin, Navigation, Phone } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import GlassCard from '../../components/ui/GlassCard';
import PrimaryButton from '../../components/ui/PrimaryButton';
import AppScreenLayout from '../../components/ui/AppScreenLayout';
import LiveTripMap from '../../components/booking/LiveTripMap';
import { useDriverLocationReporting } from '../../hooks/useDriverLocationReporting';
import {
  useDriverActiveJobQuery,
  useUpdateDriverBookingStatusMutation,
} from '../../services/driver/useDriverQueries';
import { getApiErrorMessage } from '../../services/auth/useAuthMutations';
import type { PartnerJobsStackParamList } from '../../types/partnerNavigation';
import { formatReadableAddress } from '../../utils/readableAddress';
import { colors, radius, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<PartnerJobsStackParamList, 'PartnerActiveJob'>;

type JobStatus =
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_EN_ROUTE'
  | 'DRIVER_ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

const STATUS_ACTIONS: Partial<
  Record<JobStatus, { next: JobStatus; label: string; variant?: 'primary' | 'outline' }>
> = {
  DRIVER_EN_ROUTE: { next: 'DRIVER_ARRIVED', label: 'Arrived at pickup' },
  DRIVER_ARRIVED: { next: 'IN_PROGRESS', label: 'Start trip' },
  IN_PROGRESS: { next: 'COMPLETED', label: 'Complete job' },
};

const STATUS_LABELS: Record<string, string> = {
  DRIVER_ASSIGNED: 'Assigned — accept from jobs list',
  DRIVER_EN_ROUTE: 'En route to pickup',
  DRIVER_ARRIVED: 'Arrived at pickup',
  IN_PROGRESS: 'Trip in progress',
  COMPLETED: 'Completed',
};

export default function PartnerActiveJobScreen({ navigation, route }: Props) {
  const bookingId = route.params?.bookingId;
  const bookingType = route.params?.bookingType ?? 'driver';
  const { data: activeJob, isLoading, refetch } = useDriverActiveJobQuery(true);
  const statusMutation = useUpdateDriverBookingStatusMutation();
  const [acting, setActing] = useState(false);
  const [otpModal, setOtpModal] = useState(false);
  const [tripOtp, setTripOtp] = useState('');

  const job =
    activeJob && (!bookingId || activeJob.id === bookingId) ? activeJob : null;

  const reportingEnabled = Boolean(
    job && ['DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(job.status),
  );
  useDriverLocationReporting(reportingEnabled);

  const action = useMemo(() => {
    if (!job) return null;
    return STATUS_ACTIONS[job.status as JobStatus] ?? null;
  }, [job]);

  const onStatusUpdate = async (nextStatus: JobStatus, otp?: string) => {
    if (!job) return;
    setActing(true);
    try {
      await statusMutation.mutateAsync({
        bookingId: job.id,
        bookingType: job.bookingType,
        status: nextStatus,
        tripOtp: otp,
      });
      await refetch();
      setOtpModal(false);
      setTripOtp('');
      if (nextStatus === 'COMPLETED') {
        Alert.alert('Job completed', 'You are available for new bookings.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      Alert.alert('Update failed', getApiErrorMessage(error, 'Could not update job status'));
    } finally {
      setActing(false);
    }
  };

  const onActionPress = () => {
    if (!action) return;
    if (action.next === 'IN_PROGRESS') {
      setOtpModal(true);
      return;
    }
    void onStatusUpdate(action.next);
  };

  const submitTripOtp = () => {
    if (!/^\d{4}$/.test(tripOtp.trim())) {
      Alert.alert('Trip OTP', 'Enter the 4-digit code from the customer app.');
      return;
    }
    void onStatusUpdate('IN_PROGRESS', tripOtp.trim());
  };

  if (isLoading) {
    return (
      <AppScreenLayout scrollable={false}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      </AppScreenLayout>
    );
  }

  if (!job) {
    return (
      <AppScreenLayout
        header={
          <View style={styles.headerPad}>
            <PartnerText style={styles.title}>Active job</PartnerText>
          </View>
        }>
        <View style={styles.empty}>
          <Navigation size={40} color={colors.primary} />
          <PartnerText style={styles.emptyTitle}>No active job</PartnerText>
          <PartnerText style={styles.emptySubtitle}>Accept a booking from the Jobs tab.</PartnerText>
          <PrimaryButton label="Back to jobs" onPress={() => navigation.goBack()} />
        </View>
      </AppScreenLayout>
    );
  }

  const pickup = formatReadableAddress(job.pickup?.address || job.pickup?.label);
  const dropoff = job.dropoff
    ? formatReadableAddress(job.dropoff.address || job.dropoff.label)
    : null;

  return (
    <AppScreenLayout
      header={
        <View style={styles.headerPad}>
          <PartnerText style={styles.title}>Active job</PartnerText>
          <PartnerText style={styles.subtitle}>#{job.bookingNumber}</PartnerText>
        </View>
      }>
      <GlassCard style={styles.card}>
        <View style={styles.typeRow}>
          <PartnerText style={styles.typePill}>
            {job.bookingType === 'towing' ? 'Towing' : 'Driver hire'}
          </PartnerText>
          <PartnerText style={styles.status}>
            {STATUS_LABELS[job.status] ?? job.status.replace(/_/g, ' ')}
          </PartnerText>
        </View>

        <LiveTripMap
          borderRadius={radius.lg}
          style={styles.map}
          showsUserLocation
          pickup={
            job.pickup?.latitude != null && job.pickup?.longitude != null
              ? {
                  latitude: job.pickup.latitude,
                  longitude: job.pickup.longitude,
                  label: pickup || 'Pickup',
                }
              : null
          }
          dropoff={
            job.dropoff?.latitude != null && job.dropoff?.longitude != null
              ? {
                  latitude: job.dropoff.latitude,
                  longitude: job.dropoff.longitude,
                  label: dropoff || 'Drop-off',
                }
              : null
          }
        />

        <View style={styles.locationRow}>
          <MapPin size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <PartnerText style={styles.locationLabel}>Pickup</PartnerText>
            <PartnerText style={styles.locationValue}>{pickup || 'Pickup location'}</PartnerText>
          </View>
        </View>

        {dropoff ? (
          <View style={styles.locationRow}>
            <MapPin size={18} color={colors.secondary} />
            <View style={{ flex: 1 }}>
              <PartnerText style={styles.locationLabel}>Drop</PartnerText>
              <PartnerText style={styles.locationValue}>{dropoff}</PartnerText>
            </View>
          </View>
        ) : null}

        {typeof job.estimatedFare === 'number' ? (
          <PartnerText style={styles.fare}>Est. ₹{Math.round(job.estimatedFare)}</PartnerText>
        ) : null}
      </GlassCard>

      {reportingEnabled ? (
        <View style={styles.liveBanner}>
          <View style={styles.liveDot} />
          <PartnerText style={styles.liveText}>Live location sharing with customer</PartnerText>
        </View>
      ) : null}

      {action ? (
        <PrimaryButton
          label={acting ? 'Updating…' : action.label}
          onPress={onActionPress}
          disabled={acting}
        />
      ) : job.status === 'COMPLETED' ? (
        <PrimaryButton label="Back to jobs" onPress={() => navigation.goBack()} />
      ) : null}

      <Pressable
        style={styles.callBtn}
        onPress={() => void Linking.openURL('tel:18001234567')}>
        <Phone size={18} color={colors.primary} />
        <PartnerText style={styles.callLabel}>Call support</PartnerText>
      </Pressable>

      <Modal visible={otpModal} transparent animationType="fade" onRequestClose={() => setOtpModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOtpModal(false)}>
          <Pressable style={styles.otpSheet} onPress={e => e.stopPropagation()}>
            <PartnerText style={styles.otpTitle}>Verify trip OTP</PartnerText>
            <PartnerText style={styles.otpHint}>
              Ask the customer for the 4-digit code shown in their RACE app.
            </PartnerText>
            <PartnerTextInput
              value={tripOtp}
              onChangeText={text => setTripOtp(text.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="0000"
              placeholderTextColor={colors.textMuted}
              style={styles.otpInput}
            />
            <PrimaryButton
              label={acting ? 'Verifying…' : 'Start trip'}
              onPress={submitTripOtp}
              disabled={acting}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </AppScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerPad: {
    paddingHorizontal: 12,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.dark,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.extrabold,
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.grey,
    fontSize: typography.sizes.sm,
  },
  card: { gap: spacing.md, marginBottom: spacing.lg },
  map: { height: 220, width: '100%' },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typePill: {
    backgroundColor: colors.goldLight,
    color: colors.primaryDark,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  status: {
    color: colors.secondary,
    fontWeight: typography.weights.semibold,
    textTransform: 'capitalize',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  locationLabel: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
  },
  locationValue: {
    color: colors.dark,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  fare: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.lg,
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    marginBottom: spacing.lg,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  liveText: {
    color: colors.success,
    fontWeight: typography.weights.semibold,
    flex: 1,
  },
  callBtn: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  callLabel: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.dark,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  emptySubtitle: {
    color: colors.grey,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  otpSheet: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  otpTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.lg,
  },
  otpHint: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 28,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 8,
    textAlign: 'center',
    color: colors.dark,
  },
});
