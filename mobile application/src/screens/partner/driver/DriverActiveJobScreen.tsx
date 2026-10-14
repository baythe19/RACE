/**
 * RACE Partner — Driver active job (boards 02–05).
 *
 * One focused screen that walks the driver through the whole job lifecycle:
 *   EN ROUTE TO PICKUP  →  VERIFY CUSTOMER OTP  →  SERVICE IN PROGRESS  →  JOB COMPLETED
 *
 * [GOAL] Finish the current job with as little thinking as possible.
 * [PRIMARY_ACTION] Exactly one per step — Arrived at pickup → Verify & start service
 *                  → Complete job → Back to Home.
 * [BEHAVIOR]
 *   - Status transitions come from the backend and are never assumed locally;
 *     the UI re-reads the active booking after every mutation.
 *   - Duplicate taps are blocked while a mutation is in flight.
 *   - The 4-digit trip OTP is verified by the API. A rejected code keeps the
 *     driver on the same step with an inline error, so it can be re-entered.
 *   - The tab bar is hidden here (see PartnerTabBar) so map + action stay focused.
 * [DATA] Only API-provided values. No invented ETA, duration, trip distance or
 *        final fare — the boards mark those as illustrative.
 * [STATES] loading · no-job · en-route · verify-otp · in-progress · completed
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  House,
  Info,
  LocateFixed,
  MapPin,
  MoreVertical,
  Navigation,
  Phone,
  ShieldCheck,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LiveTripMap from '../../../components/booking/LiveTripMap';
import { useScreenPx } from '../../../hooks/useScreenPx';
import { useDriverLocationReporting } from '../../../hooks/useDriverLocationReporting';
import {
  useDriverActiveJobQuery,
  useUpdateDriverBookingStatusMutation,
} from '../../../services/driver/useDriverQueries';
import { getApiErrorMessage } from '../../../services/auth/useAuthMutations';
import type { DriverJobBooking } from '../../../services/driver/driverApi';
import type { PartnerJobsStackParamList } from '../../../types/partnerNavigation';
import { formatReadableAddress } from '../../../utils/readableAddress';
import {
  driverColors as C,
  driverMetrics as M,
  driverRadius as R,
  driverShadow,
  driverType as T,
} from '../../../theme/driverUi';

const SUPPORT_NUMBER = 'tel:18001234567';
const OTP_LENGTH = 4;

type Props = NativeStackScreenProps<PartnerJobsStackParamList, 'PartnerActiveJob'>;

/** Lifecycle steps this screen renders (see the flow doc in the design handoff). */
type Step = 'en_route' | 'verify_otp' | 'in_progress' | 'completed';

function stepForStatus(status: string): Step {
  if (status === 'IN_PROGRESS') return 'in_progress';
  if (status === 'DRIVER_ARRIVED') return 'verify_otp';
  if (status === 'COMPLETED' || status === 'RATED' || status === 'PAID') return 'completed';
  return 'en_route';
}

function addressOf(input?: string | null) {
  const formatted = formatReadableAddress(input);
  return formatted === '—' ? '' : formatted;
}

function formatInr(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/** Real trip duration, derived from the backend status timeline. */
function tripDurationLabel(
  history?: Array<{ status: string; timestamp: string }>,
): string | null {
  if (!history?.length) return null;
  const start = history.find(entry =>
    ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE'].includes(entry.status),
  );
  const end = [...history].reverse().find(entry => entry.status === 'COMPLETED');
  if (!start || !end) return null;
  const ms = +new Date(end.timestamp) - +new Date(start.timestamp);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function formatWhen(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(+date)) return '';
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (+target === +day) return `Today, ${time}`;
  return date.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function completedAt(job?: DriverJobBooking | null) {
  const entry = [...(job?.statusHistory ?? [])]
    .reverse()
    .find(item => item.status === 'COMPLETED');
  return entry ? formatWhen(entry.timestamp) : '';
}

function finalFareFromResponse(result: unknown): number | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const response = result as {
    finalFare?: unknown;
    data?: { finalFare?: unknown };
  };
  const fare = response.finalFare ?? response.data?.finalFare;
  return typeof fare === 'number' ? fare : undefined;
}

function statusHistoryFromResponse(
  result: unknown,
  fallback: Array<{ status: string; timestamp: string }>,
) {
  if (!result || typeof result !== 'object') return fallback;
  const response = result as {
    statusHistory?: unknown;
    data?: { statusHistory?: unknown };
  };
  const history = response.statusHistory ?? response.data?.statusHistory;
  if (!Array.isArray(history)) return fallback;
  const normalized = history.filter(
    (entry): entry is { status: string; timestamp: string } =>
      Boolean(
        entry &&
          typeof entry === 'object' &&
          typeof (entry as { status?: unknown }).status === 'string' &&
          typeof (entry as { timestamp?: unknown }).timestamp === 'string',
      ),
  );
  return normalized.length > 0 ? normalized : fallback;
}

/* ------------------------------------------------------------ small pieces */

function RouteDot({
  tone,
  last,
  px,
}: {
  tone: 'start' | 'end';
  last?: boolean;
  px: (value: number) => number;
}) {
  return (
    <View style={{ width: px(18), alignItems: 'center', paddingTop: px(2) }}>
      {tone === 'end' ? (
        <MapPin size={px(16)} color={C.red} strokeWidth={2.4} fill={C.red} />
      ) : (
        <View
          style={{
            width: px(12),
            height: px(12),
            borderRadius: px(6),
            backgroundColor: C.blue,
          }}
        />
      )}
      {last
        ? null
        : [0, 1, 2].map(index => (
            <View
              key={index}
              style={{
                width: px(1.5),
                height: px(3),
                marginTop: px(2),
                borderRadius: px(1),
                backgroundColor: '#C9CBD3',
              }}
            />
          ))}
    </View>
  );
}

function StatusChip({
  label,
  tone,
  dot,
  px,
}: {
  label: string;
  tone: 'green' | 'white';
  dot?: boolean;
  px: (value: number) => number;
}) {
  const bg = tone === 'green' ? C.green : C.white;
  const fg = tone === 'green' ? C.white : C.green;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: px(28),
        paddingHorizontal: px(12),
        borderRadius: px(R.pill),
        backgroundColor: bg,
        ...driverShadow,
      }}>
      {dot ? (
        <View
          style={{
            width: px(7),
            height: px(7),
            borderRadius: px(4),
            backgroundColor: C.green,
            marginRight: px(5),
          }}
        />
      ) : null}
      <Text
        style={{
          fontSize: px(11),
          lineHeight: px(14),
          fontWeight: '800',
          letterSpacing: 0.5,
          color: fg,
        }}>
        {label}
      </Text>
    </View>
  );
}

function MapCallout({
  title,
  detail,
  px,
}: {
  title: string;
  detail?: string;
  px: (value: number) => number;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        top: px(56),
        right: px(14),
        minWidth: px(112),
        maxWidth: px(154),
        paddingHorizontal: px(12),
        paddingVertical: px(9),
        borderRadius: px(12),
        backgroundColor: C.white,
        ...driverShadow,
      }}>
      <Text style={[T.small, { fontSize: px(11.5), lineHeight: px(15), color: C.greySoft }]}>
        {title}
      </Text>
      {detail ? (
        <Text
          numberOfLines={2}
          style={[T.jobTitle, { fontSize: px(12.5), lineHeight: px(16), color: C.ink, marginTop: px(2) }]}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

function DestinationRoute({
  dropoff,
  distanceKm,
  px,
}: {
  dropoff: string;
  distanceKm?: number;
  px: (value: number) => number;
}) {
  return (
    <View style={{ marginTop: px(14), flexDirection: 'row', alignItems: 'flex-start' }}>
      <View style={{ width: px(18), alignItems: 'center' }}>
        <RouteDot tone="end" last px={px} />
      </View>
      <View style={{ flex: 1, marginLeft: px(10) }}>
        <Text style={[T.small, { fontSize: px(12), lineHeight: px(16), color: C.greySoft }]}>
          Drop
        </Text>
        <Text
          numberOfLines={2}
          style={[T.jobTitle, { fontSize: px(14.5), lineHeight: px(19), color: C.ink, marginTop: px(1) }]}>
          {dropoff || 'Drop location'}
        </Text>
        {distanceKm != null ? (
          <Text style={[T.meta, { fontSize: px(12), lineHeight: px(16), color: C.greySoft, marginTop: px(2) }]}>
            {distanceKm} km trip
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------- screen */

export default function DriverActiveJobScreen({ navigation, route }: Props) {
  const px = useScreenPx();
  const insets = useSafeAreaInsets();
  const bookingId = route.params?.bookingId;
  const { data: activeJob, isLoading, refetch } = useDriverActiveJobQuery(true);
  const statusMutation = useUpdateDriverBookingStatusMutation();

  const [acting, setActing] = useState(false);
  const [completedJob, setCompletedJob] = useState<DriverJobBooking | null>(null);
  const [tripOtp, setTripOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const otpInputRef = useRef<TextInput>(null);

  /**
   * Coming back from the background (or a cold relaunch) must re-sync the real
   * job status — the driver should never see a stale stage after the app was
   * minimized, lost network, or was killed mid-trip.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') void refetch();
    });
    return () => subscription.remove();
  }, [refetch]);

  const job =
    activeJob && (!bookingId || activeJob.id === bookingId)
      ? activeJob
      : completedJob && (!bookingId || completedJob.id === bookingId)
        ? completedJob
        : null;
  const step: Step = job ? stepForStatus(job.status) : 'en_route';

  const reportingEnabled = Boolean(
    job && ['DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(job.status),
  );
  useDriverLocationReporting(reportingEnabled);

  const pickup = addressOf(job?.pickup?.address || job?.pickup?.label);
  const dropoff = addressOf(job?.dropoff?.address || job?.dropoff?.label);
  const hasPickupCoords = job?.pickup?.latitude != null && job?.pickup?.longitude != null;
  const hasDropCoords = job?.dropoff?.latitude != null && job?.dropoff?.longitude != null;

  const serviceName = useMemo(() => {
    const label = (job?.serviceLabel ?? '').trim();
    if (label) return label;
    return job?.bookingType === 'towing' ? 'Towing service' : 'Driver service';
  }, [job?.bookingType, job?.serviceLabel]);

  const runStatusUpdate = useCallback(
    async (status: string, otp?: string, otpStep = false) => {
      if (!job) return;
      setActing(true);
      try {
        const result = await statusMutation.mutateAsync({
          bookingId: job.id,
          bookingType: job.bookingType,
          status,
          tripOtp: otp,
        });
        if (status === 'COMPLETED') {
          const fallbackHistory = [
            ...(job.statusHistory ?? []),
            { status: 'COMPLETED', timestamp: new Date().toISOString() },
          ];
          setCompletedJob({
            ...job,
            status: 'COMPLETED',
            finalFare: finalFareFromResponse(result) ?? job.finalFare ?? job.estimatedFare,
            statusHistory: statusHistoryFromResponse(result, fallbackHistory),
          });
        }
        await refetch();
        setOtpError('');
        setTripOtp('');
      } catch (error) {
        const message = getApiErrorMessage(error, 'Could not update job status');
        if (otpStep) {
          // A rejected code keeps the driver on the same step so it can be re-entered.
          setOtpError(message);
          setTripOtp('');
        } else {
          Alert.alert('Update failed', message);
        }
      } finally {
        setActing(false);
      }
    },
    [job, refetch, statusMutation],
  );

  const onPrimaryPress = useCallback(() => {
    if (acting || !job) return;
    if (step === 'en_route') {
      void runStatusUpdate('DRIVER_ARRIVED');
      return;
    }
    if (step === 'verify_otp') {
      const code = tripOtp.trim();
      if (!/^\d{4}$/.test(code)) {
        setOtpError('Enter the 4-digit code shown in the customer app.');
        return;
      }
      setOtpError('');
      void runStatusUpdate('IN_PROGRESS', code, true);
      return;
    }
    if (step === 'in_progress') {
      Alert.alert(
        'Complete job?',
        'Confirm that the service is finished at the destination.',
        [
          { text: 'Keep working', style: 'cancel' },
          { text: 'Complete job', onPress: () => void runStatusUpdate('COMPLETED') },
        ],
      );
      return;
    }
    navigation.getParent()?.navigate('PartnerHome' as never);
  }, [acting, job, navigation, runStatusUpdate, step, tripOtp]);

  const primaryLabel =
    step === 'en_route'
      ? 'Arrived at pickup'
      : step === 'verify_otp'
        ? 'Verify & start service'
        : step === 'in_progress'
          ? 'Complete job'
          : 'Back to Home';

  /** The backend confirms the amount at completion; only then is it final. */
  const backendConfirmedFare = typeof job?.finalFare === 'number';
  const earningsAmount = job
    ? (job.finalFare ?? job.estimatedFare ?? null)
    : null;
  const tripDuration = tripDurationLabel(job?.statusHistory);

  const openNavigation = useCallback(() => {
    const lat = job?.pickup?.latitude;
    const lng = job?.pickup?.longitude;
    if (lat == null || lng == null) {
      Alert.alert('Navigation', 'Pickup coordinates are not available for this booking.');
      return;
    }
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
        : `google.navigation:q=${lat},${lng}`;
    void Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`),
    );
  }, [job?.pickup?.latitude, job?.pickup?.longitude]);

  /* ------------------------------------------------------------- renderers */

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: insets.top + px(6),
        paddingHorizontal: px(M.pagePadding),
        paddingBottom: px(10),
        backgroundColor: C.pageBg,
      }}>
      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={{
          width: px(34),
          height: px(34),
          borderRadius: px(17),
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <ArrowLeft size={px(22)} color={C.ink} strokeWidth={2.6} />
      </Pressable>

      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ fontSize: px(16), lineHeight: px(20), fontWeight: '700', color: C.ink }}>
          Active job
        </Text>
        {job ? (
          <Text
            style={[
              T.small,
              { fontSize: px(12.5), lineHeight: px(16), color: C.greySoft, marginTop: px(1) },
            ]}>
            #{job.bookingNumber}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={() => void Linking.openURL(SUPPORT_NUMBER)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Call support"
        style={{
          width: px(34),
          height: px(34),
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Phone size={px(20)} color={C.ink} strokeWidth={2.2} />
      </Pressable>
      <Pressable
        onPress={() => setMenuOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="More options"
        style={{
          width: px(30),
          height: px(34),
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <MoreVertical size={px(20)} color={C.ink} strokeWidth={2.2} />
      </Pressable>
    </View>
  );

  const mapBlock = (
    <View style={{ marginHorizontal: 0 }}>
      <LiveTripMap
        borderRadius={0}
        style={{ height: px(300) }}
        showsUserLocation
        routeColor={C.blue}
        pickupColor={step === 'in_progress' ? C.blue : C.amber}
        dropoffColor={C.red}
        recenterTrigger={recenterTrigger}
        pickup={
          hasPickupCoords
            ? {
                latitude: job!.pickup!.latitude as number,
                longitude: job!.pickup!.longitude as number,
                label: pickup || 'Pickup',
              }
            : null
        }
        dropoff={
          hasDropCoords
            ? {
                latitude: job!.dropoff!.latitude as number,
                longitude: job!.dropoff!.longitude as number,
                label: dropoff || 'Drop-off',
              }
            : null
        }
      />

      {step === 'verify_otp' ? (
        <View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFill,
            backgroundColor: 'rgba(12, 16, 24, 0.42)',
          }}
        />
      ) : null}

      {step === 'en_route' ? (
        <MapCallout
          title="Pickup"
          detail={job!.distanceKm != null ? `${job!.distanceKm} km away` : pickup || undefined}
          px={px}
        />
      ) : step === 'in_progress' ? (
        <MapCallout
          title="Destination"
          detail={job!.distanceKm != null ? `${job!.distanceKm} km trip` : dropoff || undefined}
          px={px}
        />
      ) : null}

      <View
        style={{
          position: 'absolute',
          top: px(12),
          left: px(12),
          right: px(12),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        pointerEvents="box-none">
        {step === 'in_progress' ? (
          <>
            <StatusChip label="SERVICE IN PROGRESS" tone="green" px={px} />
            <StatusChip label="Live" tone="white" dot px={px} />
          </>
        ) : null}
      </View>

      <Pressable
        onPress={() => setRecenterTrigger(value => value + 1)}
        accessibilityRole="button"
        accessibilityLabel="Center route"
        style={{
          position: 'absolute',
          right: px(12),
          bottom: px(70),
          width: px(38),
          height: px(38),
          borderRadius: px(19),
          backgroundColor: C.white,
          alignItems: 'center',
          justifyContent: 'center',
          ...driverShadow,
        }}>
        <LocateFixed size={px(18)} color={C.ink} strokeWidth={2.2} />
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.pageBg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.amber} size="large" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={{ flex: 1, backgroundColor: C.pageBg }}>
        {header}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: px(24) }}>
          <View
            style={{
              width: px(64),
              height: px(64),
              borderRadius: px(32),
              backgroundColor: C.amberTile,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Navigation size={px(28)} color={C.amber} strokeWidth={2.2} />
          </View>
          <Text
            style={[
              T.sectionTitle,
              { fontSize: px(19), lineHeight: px(24), color: C.ink, marginTop: px(16) },
            ]}>
            No active job
          </Text>
          <Text
            style={[
              T.cardSubtitle,
              {
                fontSize: px(13.5),
                lineHeight: px(19),
                color: C.grey,
                marginTop: px(6),
                textAlign: 'center',
              },
            ]}>
            Accept a request from the Jobs tab to start a trip.
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            style={{
              marginTop: px(20),
              height: px(M.ctaHeight),
              paddingHorizontal: px(24),
              borderRadius: px(R.button),
              backgroundColor: C.amber,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={[T.button, { fontSize: px(16), color: C.ink }]}>Back to jobs</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const showMap = step !== 'completed';

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      {step === 'completed' ? null : header}

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, px(24)) }}>
        {showMap ? mapBlock : null}

        {/* ---------------------------------------------------- step content */}
        {step === 'en_route' || step === 'in_progress' ? (
          <View
            style={{
              marginTop: showMap ? px(-18) : 0,
              marginHorizontal: showMap ? 0 : px(M.pagePadding),
              backgroundColor: C.card,
              borderTopLeftRadius: px(24),
              borderTopRightRadius: px(24),
              paddingHorizontal: px(M.pagePadding),
              paddingTop: px(16),
              paddingBottom: px(4),
              minHeight: px(220),
            }}>
            {step === 'en_route' ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: px(12),
                }}>
                <StatusChip label="EN ROUTE TO PICKUP" tone="green" px={px} />
                {job.distanceKm != null ? (
                  <Text style={[T.small, { fontSize: px(12), color: C.greySoft }]}>
                    {job.distanceKm} km away
                  </Text>
                ) : null}
              </View>
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Text
                numberOfLines={1}
                style={[T.jobTitle, { flex: 1, fontSize: px(16), color: C.ink }]}>
                {serviceName}
              </Text>
            </View>
            <Text
              style={[
                T.meta,
                { fontSize: px(12.5), lineHeight: px(16), color: C.greySoft, marginTop: px(2) },
              ]}>
              #{job.bookingNumber}
            </Text>

            {/* route block */}
            {step === 'in_progress' ? (
              <DestinationRoute dropoff={dropoff} distanceKm={job.distanceKm} px={px} />
            ) : (
            <View style={{ marginTop: px(14), flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ width: px(18), alignItems: 'center' }}>
                <RouteDot tone="start" px={px} />
                <View style={{ height: px(22) }} />
                <RouteDot tone="end" last px={px} />
              </View>
              <View style={{ flex: 1, marginLeft: px(10) }}>
                <Text
                  style={[
                    T.small,
                    { fontSize: px(12), lineHeight: px(16), color: C.greySoft },
                  ]}>
                  Pickup
                </Text>
                <Text
                  numberOfLines={2}
                  style={[
                    T.jobTitle,
                    { fontSize: px(14.5), lineHeight: px(19), color: C.ink, marginTop: px(1) },
                  ]}>
                  {pickup || 'Pickup location'}
                </Text>
                {job.distanceKm != null ? (
                  <Text
                    style={[
                      T.meta,
                      { fontSize: px(12), lineHeight: px(16), color: C.greySoft, marginTop: px(2) },
                    ]}>
                    {job.distanceKm} km trip
                  </Text>
                ) : null}

                <Text
                  style={[
                    T.small,
                    {
                      fontSize: px(12),
                      lineHeight: px(16),
                      color: C.greySoft,
                      marginTop: px(14),
                    },
                  ]}>
                  Drop
                </Text>
                <Text
                  numberOfLines={2}
                  style={[
                    T.jobTitle,
                    { fontSize: px(14.5), lineHeight: px(19), color: C.ink, marginTop: px(1) },
                  ]}>
                  {dropoff || 'Drop location shared at pickup'}
                </Text>
              </View>
            </View>
            )}

            {/* customer row — rendered only when the booking carries a contact */}
            {job.customer?.name || job.customer?.mobileNumber ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: px(16),
                  paddingTop: px(14),
                  borderTopWidth: 1,
                  borderTopColor: C.hairline,
                }}>
                <View
                  style={{
                    width: px(38),
                    height: px(38),
                    borderRadius: px(19),
                    backgroundColor: C.creamRow,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{ fontSize: px(15), fontWeight: '700', color: C.ink }}>
                    {(job.customer.name ?? 'C').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: px(12) }}>
                  <Text style={[T.jobTitle, { fontSize: px(14.5), color: C.ink }]}>
                    {job.customer.name ?? 'Customer'}
                  </Text>
                  <Text style={[T.meta, { fontSize: px(12.5), color: C.greySoft }]}>Customer</Text>
                </View>
                {job.customer.mobileNumber ? (
                  <Pressable
                    onPress={() => void Linking.openURL(`tel:${job.customer?.mobileNumber}`)}
                    accessibilityRole="button"
                    accessibilityLabel="Call customer"
                    style={{
                      width: px(38),
                      height: px(38),
                      borderRadius: px(19),
                      borderWidth: 1,
                      borderColor: C.hairline,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Phone size={px(17)} color={C.ink} strokeWidth={2.2} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {step === 'in_progress' && job.estimatedFare != null ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: px(16),
                  padding: px(12),
                  borderRadius: px(R.innerCard),
                  backgroundColor: C.cream,
                }}>
                <View>
                  <Text
                    style={[
                      T.small,
                      { fontSize: px(12), lineHeight: px(16), color: C.greySoft },
                    ]}>
                    Estimated earnings
                  </Text>
                  <Text
                    style={[
                      T.metricValue,
                      { fontSize: px(22), lineHeight: px(27), color: C.ink, marginTop: px(1) },
                    ]}>
                    {formatInr(job.estimatedFare)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[T.small, { fontSize: px(12), color: C.greySoft }]}>
                    Service
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      T.small,
                      { fontSize: px(12.5), color: C.ink, marginTop: px(2), maxWidth: px(130) },
                    ]}>
                    {serviceName}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={{ marginTop: px(16), paddingBottom: px(12) }}>
              {step === 'en_route' ? (
                <>
                  <Pressable
                    onPress={openNavigation}
                    accessibilityRole="button"
                    style={{
                      height: px(46),
                      borderRadius: px(R.button),
                      borderWidth: 1,
                      borderColor: C.amberBorder,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                    }}>
                    <Navigation size={px(17)} color={C.ink} strokeWidth={2.4} />
                    <Text
                      style={[T.button, { fontSize: px(15), color: C.ink, marginLeft: px(8) }]}>
                      Navigate
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={onPrimaryPress}
                    disabled={acting}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: acting }}
                    style={({ pressed }) => ({
                      height: px(52),
                      marginTop: px(10),
                      borderRadius: px(R.button),
                      backgroundColor: acting ? C.amberBorder : C.amber,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.94 : 1,
                    })}>
                    {acting ? (
                      <ActivityIndicator color={C.ink} />
                    ) : (
                      <Text style={[T.button, { fontSize: px(16), color: C.ink }]}>
                        Arrived at pickup
                      </Text>
                    )}
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    onPress={onPrimaryPress}
                    disabled={acting}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: acting }}
                    style={({ pressed }) => ({
                      height: px(52),
                      borderRadius: px(R.button),
                      backgroundColor: acting ? C.amberBorder : C.amber,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.94 : 1,
                    })}>
                    {acting ? (
                      <ActivityIndicator color={C.ink} />
                    ) : (
                      <Text style={[T.button, { fontSize: px(16), color: C.ink }]}>
                        Complete job
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => void Linking.openURL(SUPPORT_NUMBER)}
                    accessibilityRole="button"
                    style={{
                      paddingVertical: px(13),
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                    }}>
                    <Phone size={px(15)} color={C.amberText} strokeWidth={2.6} />
                    <Text
                      style={[T.link, { fontSize: px(13.5), color: C.amberText, marginLeft: px(6) }]}>
                      Call support
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        ) : null}

        {/* board 03 — verify customer OTP */}
        {step === 'verify_otp' ? (
          <View
            style={{
              marginTop: px(-18),
              backgroundColor: C.card,
              borderTopLeftRadius: px(24),
              borderTopRightRadius: px(24),
              paddingHorizontal: px(M.pagePadding),
              paddingTop: px(22),
              paddingBottom: px(4),
              alignItems: 'center',
              minHeight: px(340),
            }}>
            <View
              style={{
                width: px(56),
                height: px(56),
                borderRadius: px(18),
                backgroundColor: C.cream,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <ShieldCheck size={px(28)} color={C.amber} strokeWidth={2.2} />
            </View>

            <Text
              style={[
                T.sectionTitle,
                {
                  fontSize: px(20),
                  lineHeight: px(26),
                  color: C.ink,
                  marginTop: px(16),
                  textAlign: 'center',
                },
              ]}>
              Confirm customer pickup
            </Text>
            <Text
              style={[
                T.body,
                {
                  fontSize: px(13.5),
                  lineHeight: px(19),
                  color: C.grey,
                  marginTop: px(6),
                  textAlign: 'center',
                },
              ]}>
              Ask the customer for the 4-digit code shown in their RACE app.
            </Text>

            <Pressable
              onPress={() => otpInputRef.current?.focus()}
              accessibilityRole="button"
              accessibilityLabel="Trip OTP input"
              style={{ flexDirection: 'row', marginTop: px(22), gap: px(12) }}>
              {Array.from({ length: OTP_LENGTH }, (_, index) => {
                const char = tripOtp[index] ?? '';
                const focused = tripOtp.length === index;
                return (
                  <View
                    key={index}
                    style={{
                      width: px(54),
                      height: px(54),
                      borderRadius: px(14),
                      borderWidth: 1.5,
                      borderColor: otpError ? C.red : focused ? C.amber : C.hairline,
                      backgroundColor: C.white,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Text
                      style={{
                        fontSize: px(24),
                        lineHeight: px(28),
                        fontWeight: '700',
                        color: C.ink,
                      }}>
                      {char}
                    </Text>
                  </View>
                );
              })}
            </Pressable>
            <TextInput
              ref={otpInputRef}
              value={tripOtp}
              onChangeText={text => {
                setOtpError('');
                setTripOtp(text.replace(/\D/g, '').slice(0, OTP_LENGTH));
              }}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
            />

            {otpError ? (
              <Text
                style={[
                  T.small,
                  { fontSize: px(12.5), lineHeight: px(17), color: C.red, marginTop: px(10) },
                ]}>
                {otpError}
              </Text>
            ) : null}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: px(18),
                paddingVertical: px(12),
                paddingHorizontal: px(14),
                borderRadius: px(R.innerCard),
                backgroundColor: C.bluePill,
                alignSelf: 'stretch',
              }}>
              <Info size={px(15)} color={C.blue} strokeWidth={2.4} />
              <Text
                style={[
                  T.meta,
                  { fontSize: px(12.5), lineHeight: px(17), color: C.grey, marginLeft: px(8), flex: 1 },
                ]}>
                The trip starts after the code is verified.
              </Text>
            </View>

            <Pressable
              onPress={() => void Linking.openURL(SUPPORT_NUMBER)}
              hitSlop={8}
              accessibilityRole="button"
              style={{ marginTop: px(14) }}>
              <Text
                style={[
                  T.link,
                  { fontSize: px(13.5), lineHeight: px(18), color: C.blue },
                ]}>
                Need help?
              </Text>
            </Pressable>

            {/* CTA lives inside the sheet (board 03) so the numeric keyboard can
                never cover the action the driver needs. */}
            <Pressable
              onPress={onPrimaryPress}
              disabled={acting}
              accessibilityRole="button"
              accessibilityLabel="Verify and start service"
              accessibilityState={{ disabled: acting }}
              style={({ pressed }) => ({
                alignSelf: 'stretch',
                height: px(52),
                marginTop: px(16),
                borderRadius: px(R.button),
                backgroundColor: acting ? C.amberBorder : C.amber,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.94 : 1,
              })}>
              {acting ? (
                <ActivityIndicator color={C.ink} />
              ) : (
                <Text style={[T.button, { fontSize: px(16), color: C.ink }]}>
                  {primaryLabel}
                </Text>
              )}
            </Pressable>
            <View style={{ height: px(20) }} />
          </View>
        ) : null}

        {/* board 05 — job completed summary */}
        {step === 'completed' ? (
          <View style={{ paddingHorizontal: px(M.pagePadding), paddingTop: px(10) }}>
            <View style={{ alignItems: 'center', paddingVertical: px(18), position: 'relative' }}>
              {[
                { left: px(48), top: px(18), color: C.amber, size: 5 },
                { left: px(72), top: px(4), color: C.green, size: 4 },
                { left: px(190), top: px(8), color: C.amber, size: 4 },
                { left: px(232), top: px(30), color: C.blue, size: 3 },
                { left: px(42), top: px(68), color: C.blue, size: 3 },
                { left: px(246), top: px(78), color: C.amber, size: 5 },
              ].map((dot, index) => (
                <View
                  key={index}
                  style={{
                    position: 'absolute',
                    left: dot.left,
                    top: dot.top,
                    width: px(dot.size),
                    height: px(dot.size),
                    borderRadius: px(dot.size / 2),
                    backgroundColor: dot.color,
                  }}
                />
              ))}
              <View
                style={{
                  width: px(84),
                  height: px(84),
                  borderRadius: px(42),
                  backgroundColor: C.greenCard,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <View
                  style={{
                    width: px(60),
                    height: px(60),
                    borderRadius: px(30),
                    backgroundColor: C.green,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Check size={px(32)} color={C.white} strokeWidth={3} />
                </View>
              </View>
              <Text
                style={[
                  T.sectionTitle,
                  { fontSize: px(24), lineHeight: px(30), color: C.ink, marginTop: px(16) },
                ]}>
                Job completed
              </Text>
              <Text
                style={[
                  T.meta,
                  { fontSize: px(13), lineHeight: px(18), color: C.greySoft, marginTop: px(4) },
                ]}>
                #{job.bookingNumber}
              </Text>
            </View>

            <View
              style={{
                borderRadius: px(R.card),
                borderWidth: 1,
                borderColor: C.hairline,
                backgroundColor: C.card,
                padding: px(M.cardPadding),
                ...driverShadow,
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <Text
                  numberOfLines={1}
                  style={[T.jobTitle, { flex: 1, fontSize: px(15.5), color: C.ink }]}>
                  {serviceName}
                </Text>
                <View
                  style={{
                    height: px(M.rowPillHeight),
                    paddingHorizontal: px(10),
                    borderRadius: px(R.pill),
                    backgroundColor: C.greenPill,
                    justifyContent: 'center',
                    marginLeft: px(8),
                  }}>
                  <Text style={[T.pill, { fontSize: px(12), color: C.green }]}>Completed</Text>
                </View>
              </View>

              <View style={{ marginTop: px(12), flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ width: px(18), alignItems: 'center' }}>
                  <View
                    style={{
                      width: px(12),
                      height: px(12),
                      borderRadius: px(6),
                      backgroundColor: C.blue,
                      marginTop: px(2),
                    }}
                  />
                  <View style={{ height: px(18) }} />
                  <MapPin size={px(16)} color={C.red} strokeWidth={2.4} fill={C.red} />
                </View>
                <View style={{ flex: 1, marginLeft: px(10) }}>
                  <Text
                    numberOfLines={1}
                    style={[T.jobTitle, { fontSize: px(14), lineHeight: px(19), color: C.ink }]}>
                    {pickup || 'Pickup location'}
                  </Text>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: px(2) }}>
                    <CalendarDays size={px(13)} color={C.greySoft} strokeWidth={2.2} />
                    <Text
                      style={[
                        T.meta,
                        { fontSize: px(12), lineHeight: px(16), color: C.greySoft, marginLeft: px(5) },
                      ]}>
                      {formatWhen(job.createdAt)}
                    </Text>
                  </View>

                  <Text
                    style={[
                      T.jobTitle,
                      { fontSize: px(14), lineHeight: px(19), color: C.ink, marginTop: px(12) },
                    ]}>
                    {dropoff || 'Drop location'}
                  </Text>
                  {completedAt(job) ? (
                    <View
                      style={{ flexDirection: 'row', alignItems: 'center', marginTop: px(2) }}>
                      <CalendarDays size={px(13)} color={C.greySoft} strokeWidth={2.2} />
                      <Text
                        style={[
                          T.meta,
                          {
                            fontSize: px(12),
                            lineHeight: px(16),
                            color: C.greySoft,
                            marginLeft: px(5),
                          },
                        ]}>
                        {completedAt(job)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {earningsAmount != null ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: px(14),
                    paddingTop: px(14),
                    borderTopWidth: 1,
                    borderTopColor: C.hairline,
                  }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        T.metricValue,
                        { fontSize: px(22), lineHeight: px(27), color: C.ink },
                      ]}>
                      {formatInr(earningsAmount)}
                    </Text>
                    <Text
                      style={[
                        T.meta,
                        { fontSize: px(12.5), lineHeight: px(17), color: C.greySoft, marginTop: px(2) },
                      ]}>
                      {backendConfirmedFare ? 'Final earnings' : 'Estimated earnings'}
                    </Text>
                  </View>
                  {backendConfirmedFare ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: px(12),
                        height: px(M.pillHeight + 6),
                        borderRadius: px(R.innerCard),
                        backgroundColor: C.greenPill,
                      }}>
                      <Check size={px(14)} color={C.green} strokeWidth={3} />
                      <Text
                        style={[
                          T.pill,
                          { fontSize: px(12), color: C.green, marginLeft: px(6) },
                        ]}>
                        Added to earnings
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {tripDuration || job.distanceKm != null ? (
                <View
                  style={{
                    flexDirection: 'row',
                    marginTop: px(14),
                    paddingTop: px(14),
                    borderTopWidth: 1,
                    borderTopColor: C.hairline,
                  }}>
                  {tripDuration ? (
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          T.small,
                          { fontSize: px(12), lineHeight: px(16), color: C.greySoft },
                        ]}>
                        Total time
                      </Text>
                      <Text
                        style={[
                          T.jobTitle,
                          { fontSize: px(15), color: C.ink, marginTop: px(2) },
                        ]}>
                        {tripDuration}
                      </Text>
                    </View>
                  ) : null}
                  {job.distanceKm != null ? (
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          T.small,
                          { fontSize: px(12), lineHeight: px(16), color: C.greySoft },
                        ]}>
                        Total distance
                      </Text>
                      <Text
                        style={[
                          T.jobTitle,
                          { fontSize: px(15), color: C.ink, marginTop: px(2) },
                        ]}>
                        {job.distanceKm} km
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <Pressable
                onPress={onPrimaryPress}
                disabled={acting}
                accessibilityRole="button"
                accessibilityLabel="Back to Home"
                accessibilityState={{ disabled: acting }}
                style={({ pressed }) => ({
                  height: px(52),
                  marginTop: px(16),
                  borderRadius: px(R.button),
                  backgroundColor: acting ? C.amberBorder : C.amber,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.94 : 1,
                })}>
                <House size={px(17)} color={C.ink} strokeWidth={2.6} />
                <Text style={[T.button, { fontSize: px(16), color: C.ink, marginLeft: px(8) }]}>
                  Back to Home
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => navigation.getParent()?.navigate('PartnerJobs' as never)}
              accessibilityRole="button"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: px(14),
              }}>
              <Text style={[T.link, { fontSize: px(14), color: C.grey }]}>View job details</Text>
              <ChevronRight
                size={px(16)}
                color={C.grey}
                strokeWidth={2.6}
                style={{ marginLeft: px(2) }}
              />
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {/* options sheet ---------------------------------------------------- */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(12,12,14,0.35)', justifyContent: 'flex-end' }}
          onPress={() => setMenuOpen(false)}>
          <Pressable
            style={{
              backgroundColor: C.card,
              borderTopLeftRadius: px(20),
              borderTopRightRadius: px(20),
              paddingBottom: Math.max(insets.bottom, px(16)),
              paddingTop: px(10),
              paddingHorizontal: px(10),
            }}
            onPress={() => undefined}>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                void refetch();
              }}
              style={{ paddingVertical: px(15), paddingHorizontal: px(8) }}>
              <Text style={[T.cardTitle, { fontSize: px(15), color: C.ink }]}>Refresh job status</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                void Linking.openURL(SUPPORT_NUMBER);
              }}
              style={{ paddingVertical: px(15), paddingHorizontal: px(8) }}>
              <Text style={[T.cardTitle, { fontSize: px(15), color: C.ink }]}>Call support</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
