import React, { useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Navigation,
  Phone,
  Radio,
} from 'lucide-react-native';

import LiveTripMap, { type MapPoint } from './LiveTripMap';
import TripOtpCard from './TripOtpCard';
import DriverAvatar from '../bookings/DriverAvatar';
import AppStackHeader from '../ui/AppStackHeader';
import DataSkeleton from '../ui/DataSkeleton';
import GoldButton from '../auth/GoldButton';
import { brand } from '../../theme/brand';
import { shouldShowTripStartOtp } from '../../utils/bookingDisplay';
import { LOCATION_ACCENT } from '../../utils/googlePlaces';
import { colors, shadows, typography } from '../../theme';

const REF_W = 390;

const STATUS_RANK: Record<string, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  DRIVER_ASSIGNED: 2,
  DRIVER_EN_ROUTE: 3,
  DRIVER_ARRIVED: 4,
  IN_PROGRESS: 5,
  COMPLETED: 6,
  RATED: 7,
  CANCELLED: -1,
};

export function mergeLiveStatus(tracked: string, bookingStatus?: string): string {
  if (!bookingStatus) return tracked || 'PENDING';
  if (!tracked) return bookingStatus;
  const trackedRank = STATUS_RANK[tracked] ?? 0;
  const bookingRank = STATUS_RANK[bookingStatus] ?? 0;
  return bookingRank > trackedRank ? bookingStatus : tracked;
}

type Props = {
  title?: string;
  subtitle?: string;
  bookingNumberLabel: string;
  statusLabel: string;
  statusCode: string;
  isLive: boolean;
  steps: string[];
  activeStep: number;
  etaLabel: string;
  /** Override default "Estimated arrival" + status chip when partner not assigned yet. */
  summaryLabel?: string;
  summaryChipLabel?: string;
  serviceLabel: string;
  pickupLabel: string;
  dropLabel?: string;
  driverName: string;
  driverPhone?: string;
  fleetVehicleLabel?: string;
  locationHint?: string | null;
  tripOtp?: string;
  pickup?: MapPoint | null;
  dropoff?: MapPoint | null;
  driver?: MapPoint | null;
  loading?: boolean;
  primaryLabel: string;
  onPrimary: () => void;
  onBack: () => void;
  footerExtra?: React.ReactNode;
};

export default function LiveTrackingContent({
  title = 'Live Tracking',
  subtitle,
  bookingNumberLabel,
  statusLabel,
  statusCode,
  isLive,
  steps,
  activeStep,
  etaLabel,
  summaryLabel,
  summaryChipLabel,
  serviceLabel,
  pickupLabel,
  dropLabel,
  driverName,
  driverPhone,
  fleetVehicleLabel,
  locationHint,
  tripOtp,
  pickup,
  dropoff,
  driver,
  loading,
  primaryLabel,
  onPrimary,
  onBack,
  footerExtra,
}: Props) {
  const { width, height } = useWindowDimensions();
  const px = (n: number) => Math.round((width / REF_W) * n);
  const callPhone = driverPhone?.trim() || brand.phoneRaw;
  const etaDisplay = etaLabel === 'updating' ? 'Calculating…' : etaLabel;
  const cardLabel = summaryLabel ?? 'Estimated arrival';
  const cardValue =
    summaryLabel != null
      ? etaLabel === 'updating'
        ? 'Calculating…'
        : etaLabel
      : etaDisplay;
  const chipText = summaryChipLabel ?? statusLabel;
  const mapMin = Math.max(px(180), Math.round(height * 0.28));
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const showTripOtp = Boolean(tripOtp && shouldShowTripStartOtp(statusCode));

  const progressPct = useMemo(() => {
    if (steps.length <= 1) return 0;
    return Math.min(1, Math.max(0, activeStep / (steps.length - 1)));
  }, [activeStep, steps.length]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppStackHeader title={title} subtitle={subtitle ?? bookingNumberLabel} onBack={onBack} />
        <View style={styles.loadingWrap}>
          <DataSkeleton variant="detail" />
          <Text style={styles.loadingText}>Loading trip…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppStackHeader
        title={title}
        subtitle={subtitle ?? bookingNumberLabel}
        onBack={onBack}
      />

      <View style={styles.body}>
        {/* Tap map → collapse bottom sheet so more map is visible */}
        <View style={[styles.mapWrap, { minHeight: mapMin }]}>
          <LiveTripMap
            borderRadius={0}
            style={StyleSheet.absoluteFill}
            pickup={pickup}
            dropoff={dropoff}
            driver={driver}
            tripStatus={statusCode}
            onPress={() => setSheetExpanded(false)}
          />

          <View style={[styles.mapChipRow, { top: px(10), left: px(12) }]} pointerEvents="none">
            {isLive ? (
              <View style={styles.liveChip}>
                <Radio size={px(12)} color={colors.error} strokeWidth={2.4} />
                <Text style={styles.liveChipText}>LIVE</Text>
              </View>
            ) : (
              <View style={[styles.liveChip, styles.doneChip]}>
                <Text style={styles.doneChipText}>{statusLabel}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.sheet, shadows.cardSoft]}>
          {/* Drag / toggle handle */}
          <Pressable
            onPress={() => setSheetExpanded(prev => !prev)}
            style={styles.handleHit}
            accessibilityRole="button"
            accessibilityLabel={sheetExpanded ? 'Collapse trip details' : 'Expand trip details'}>
            <View style={styles.handleBar} />
            {sheetExpanded ? (
              <ChevronDown size={px(16)} color={colors.grey} strokeWidth={2.4} />
            ) : (
              <ChevronUp size={px(16)} color={colors.grey} strokeWidth={2.4} />
            )}
          </Pressable>

          {!sheetExpanded ? (
            <Pressable
              onPress={() => setSheetExpanded(true)}
              style={styles.collapsedRow}
              accessibilityRole="button"
              accessibilityLabel="Show trip details">
              <View style={styles.etaIconSmall}>
                <Clock size={px(14)} color={LOCATION_ACCENT} strokeWidth={2.3} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.collapsedTitle} numberOfLines={1}>
                  {cardLabel} · {cardValue}
                </Text>
                <Text style={styles.collapsedSub} numberOfLines={1}>
                  {chipText} · {driverName}
                </Text>
              </View>
              <Text style={styles.collapsedHint}>Details</Text>
            </Pressable>
          ) : (
            <View style={{ gap: px(10) }}>
              <View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.max(8, progressPct * 100)}%`,
                        backgroundColor: LOCATION_ACCENT,
                      },
                    ]}
                  />
                </View>
                <View style={styles.stepsRow}>
                  {steps.map((step, index) => {
                    const active = index <= activeStep;
                    const current = index === activeStep;
                    return (
                      <View key={step} style={styles.stepItem}>
                        <View
                          style={[
                            styles.stepDot,
                            {
                              backgroundColor: active ? LOCATION_ACCENT : colors.border,
                              width: current ? px(11) : px(7),
                              height: current ? px(11) : px(7),
                              borderRadius: current ? px(5) : px(3),
                            },
                          ]}
                        />
                        <Text
                          numberOfLines={1}
                          style={{
                            marginTop: px(5),
                            fontSize: px(10),
                            fontWeight: current
                              ? typography.weights.bold
                              : typography.weights.semibold,
                            color: active ? colors.dark : colors.grey,
                            textAlign: 'center',
                          }}>
                          {step}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.etaCard}>
                <View style={styles.etaIcon}>
                  <Clock size={px(15)} color={LOCATION_ACCENT} strokeWidth={2.3} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.etaLabel}>{cardLabel}</Text>
                  <Text style={styles.etaValue} numberOfLines={2}>
                    {cardValue}
                  </Text>
                </View>
                <View style={styles.statusChip}>
                  <Navigation size={px(11)} color={colors.dark} strokeWidth={2.3} />
                  <Text style={styles.statusChipText} numberOfLines={1}>
                    {chipText}
                  </Text>
                </View>
              </View>

              <View style={styles.driverCard}>
                <DriverAvatar size={px(42)} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.driverName} numberOfLines={1}>
                    {driverName}
                  </Text>
                  <Text style={styles.driverMeta} numberOfLines={1}>
                    {[serviceLabel, fleetVehicleLabel].filter(Boolean).join(' · ') ||
                      'Driver details updating'}
                  </Text>
                  <View style={styles.routeLine}>
                    <MapPin size={px(12)} color={colors.grey} strokeWidth={2.2} />
                    <Text style={styles.routeText} numberOfLines={1}>
                      {pickupLabel}
                      {dropLabel ? ` → ${dropLabel}` : ''}
                    </Text>
                  </View>
                  {locationHint ? (
                    <Text
                      style={[
                        styles.hintText,
                        {
                          color:
                            statusCode === 'DRIVER_ASSIGNED' || statusCode === 'CONFIRMED'
                              ? colors.warning
                              : colors.success,
                        },
                      ]}
                      numberOfLines={1}>
                      {locationHint}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => void Linking.openURL(`tel:${callPhone}`)}
                  style={styles.callBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Call driver">
                  <Phone size={px(16)} color={colors.dark} strokeWidth={2.3} />
                </Pressable>
              </View>

              {showTripOtp && tripOtp ? (
                <TripOtpCard
                  otp={tripOtp}
                  compact
                  subtitle="Share with driver at pickup to start the trip."
                />
              ) : null}

              <GoldButton
                label={primaryLabel}
                onPress={onPrimary}
                style={{ width: '100%' }}
                height={px(48)}
                labelSize={px(15)}
                borderRadius={px(14)}
              />
            </View>
          )}
        </View>
      </View>

      {footerExtra}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.grey,
    fontWeight: typography.weights.semibold,
  },
  mapWrap: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  mapChipRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 5,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  liveChipText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.error,
  },
  doneChip: {
    backgroundColor: '#E8F8EE',
    borderColor: '#BBF7D0',
  },
  doneChipText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.success,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -16,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  handleHit: {
    alignItems: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingBottom: 4,
  },
  etaIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245,158,11,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  collapsedSub: {
    marginTop: 2,
    fontSize: 11,
    color: colors.grey,
  },
  collapsedHint: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: LOCATION_ACCENT,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepDot: {
    backgroundColor: colors.border,
  },
  etaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.background,
  },
  etaIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaLabel: {
    fontSize: 11,
    color: colors.grey,
    fontWeight: typography.weights.semibold,
  },
  etaValue: {
    marginTop: 1,
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  statusChip: {
    maxWidth: '40%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: colors.background,
  },
  driverName: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  driverMeta: {
    marginTop: 2,
    fontSize: 11,
    color: colors.grey,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  routeText: {
    flex: 1,
    fontSize: 11,
    color: colors.grey,
  },
  hintText: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: typography.weights.semibold,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
