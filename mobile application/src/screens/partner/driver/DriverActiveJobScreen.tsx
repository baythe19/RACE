import { PartnerText, PartnerTextInput } from '../../../components/partner/PartnerText';
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
  BackHandler,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  ArrowLeft,
  CalendarDays,
  Car,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  House,
  Info,
  LocateFixed,
  MapPin,
  MoreVertical,
  Navigation,
  Phone,
  RefreshCw,
  Route,
  ShieldCheck,
  TriangleAlert,
  User,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DeliveryNavMap from '../../../components/booking/DeliveryNavMap';
import LiveTripMap, { type RouteMeta } from '../../../components/booking/LiveTripMap';
import { images } from '../../../assets';
import { isUiTestPermissiveMode, UI_PREVIEW_MODE } from '../../../constants/preview';
import { updateMockActiveJobStatus } from '../../../data/mockPartnerData';
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
import { getGoogleMapsApiKey } from '../../../utils/googleMaps';
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
  outlined = false,
  endColor = C.red,
}: {
  tone: 'start' | 'end';
  last?: boolean;
  px: (value: number) => number;
  outlined?: boolean;
  endColor?: string;
}) {
  if (outlined) {
    return (
      <View style={{ width: px(18), alignItems: 'center', paddingTop: px(2) }}>
        <MapPin
          size={px(16)}
          color={tone === 'end' ? endColor : C.blue}
          strokeWidth={2.4}
        />
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

  return (
    <View style={{ width: px(18), alignItems: 'center', paddingTop: px(2) }}>
      {tone === 'end' ? (
        <MapPin size={px(16)} color={endColor} strokeWidth={2.4} fill={endColor} />
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
  tone: 'green' | 'info' | 'white';
  dot?: boolean;
  px: (value: number) => number;
}) {
  const bg = tone === 'green' ? C.green : tone === 'info' ? C.bluePill : C.white;
  const fg = tone === 'green' ? C.white : tone === 'info' ? C.blue : C.green;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: px(22),
        paddingHorizontal: px(8),
        borderRadius: px(R.pill),
        backgroundColor: bg,
        ...driverShadow,
      }}>
      {dot ? (
        <View
          style={{
            width: px(5),
            height: px(5),
            borderRadius: px(2.5),
            backgroundColor: C.green,
            marginRight: px(4),
          }}
        />
      ) : null}
      <PartnerText
        style={{
          fontSize: px(9.5),
          lineHeight: px(12),
          fontWeight: '700',
          letterSpacing: 0.3,
          color: fg,
        }}>
        {label}
      </PartnerText>
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
        bottom: px(28),
        left: px(12),
        minWidth: px(112),
        maxWidth: px(170),
        paddingHorizontal: px(12),
        paddingVertical: px(8),
        borderRadius: px(12),
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.hairline,
        ...driverShadow,
      }}>
      <PartnerText style={[T.small, { fontSize: px(11), lineHeight: px(14), color: C.greySoft }]}>
        {title}
      </PartnerText>
      {detail ? (
        <PartnerText
          numberOfLines={1}
          style={[T.jobTitle, { fontSize: px(12.5), lineHeight: px(16), color: C.ink, marginTop: px(1) }]}>
          {detail}
        </PartnerText>
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
        <PartnerText style={[T.small, { fontSize: px(12), lineHeight: px(16), color: C.greySoft }]}>
          Drop
        </PartnerText>
        <PartnerText
          numberOfLines={2}
          style={[T.jobTitle, { fontSize: px(14.5), lineHeight: px(19), color: C.ink, marginTop: px(1) }]}>
          {dropoff || 'Drop location'}
        </PartnerText>
        {distanceKm != null ? (
          <PartnerText style={[T.meta, { fontSize: px(12), lineHeight: px(16), color: C.greySoft, marginTop: px(2) }]}>
            {distanceKm} km trip
          </PartnerText>
        ) : null}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------- screen */

export default function DriverActiveJobScreen({ navigation, route }: Props) {
  const px = useScreenPx();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const bookingId = route.params?.bookingId;
  const { data: activeJob, isLoading, isError, refetch } = useDriverActiveJobQuery(true);
  const statusMutation = useUpdateDriverBookingStatusMutation();

  const [acting, setActing] = useState(false);
  const [completedJob, setCompletedJob] = useState<DriverJobBooking | null>(null);
  const [tripOtp, setTripOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [mapRouteMeta, setMapRouteMeta] = useState<RouteMeta | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const otpInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const toggleSheet = useCallback(() => {
    setSheetCollapsed(prev => !prev);
  }, []);

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

  // Once completion is confirmed, keep the local server-confirmed snapshot in
  // front of any stale/partially-shaped active-query payload returned during
  // invalidation. This prevents the earnings card from reverting to estimate.
  const job =
    completedJob && (!bookingId || completedJob.id === bookingId)
      ? completedJob
      : activeJob && (!bookingId || activeJob.id === bookingId)
        ? activeJob
        : null;
  const step: Step = job ? stepForStatus(job.status) : 'en_route';

  /**
   * Keep the inputs and action button comfortably visible when the numeric keyboard opens.
   */
  useEffect(() => {
    const sub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        if (step === 'verify_otp') {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }
      },
    );
    return () => sub.remove();
  }, [step]);

  /**
   * Android Hardware Back Button:
   * 1. If options menu is open -> close it.
   * 2. If trip details bottom sheet is expanded -> collapse to compact navigation view.
   * 3. Otherwise -> default back behavior.
   */
  useEffect(() => {
    const onBackPress = () => {
      if (menuOpen) {
        setMenuOpen(false);
        return true;
      }
      if (!sheetCollapsed && (step === 'en_route' || step === 'in_progress')) {
        setSheetCollapsed(true);
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [menuOpen, sheetCollapsed, step]);

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
        if (isUiTestPermissiveMode() || UI_PREVIEW_MODE) {
          updateMockActiveJobStatus(status);
          if (status === 'COMPLETED') {
            const fallbackHistory = [
              ...(job.statusHistory ?? []),
              { status: 'COMPLETED', timestamp: new Date().toISOString() },
            ];
            setCompletedJob({
              ...job,
              status: 'COMPLETED',
              finalFare: job.finalFare ?? job.estimatedFare,
              statusHistory: fallbackHistory,
            });
          }
          await refetch();
          setOtpError('');
          setTripOtp('');
          return;
        }
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
      const isPermissive = isUiTestPermissiveMode() || UI_PREVIEW_MODE;
      if (!isPermissive && !/^\d{4}$/.test(code)) {
        setOtpError('Enter the 4-digit code shown in the customer app.');
        return;
      }
      setOtpError('');
      const finalCode = code.length === 4 ? code : (code || '1234');
      void runStatusUpdate('IN_PROGRESS', finalCode, true);
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
    // Clear the focused job route so returning to Jobs shows the list instead
    // of reopening the just-completed board from the nested stack.
    navigation.popToTop();
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
  const mapDistanceKm = mapRouteMeta?.distanceKm ?? job?.distanceKm;
  const mapDurationLabel = mapRouteMeta?.durationMinutes
    ? `${mapRouteMeta.durationMinutes} min`
    : undefined;

  const onMapRouteMetaChange = useCallback((meta: RouteMeta | null) => {
    setMapRouteMeta(meta);
  }, []);

  const mapsApiKey = getGoogleMapsApiKey();
  const usePreviewMap =
    !mapsApiKey && UI_PREVIEW_MODE && process.env.EXPO_PUBLIC_UI_PREVIEW_REAL_MAP !== 'true';

  const toggleInAppNavigation = useCallback(() => {
    setIsNavigating(prev => !prev);
    setSheetCollapsed(true);
    setRecenterTrigger(c => c + 1);
  }, []);

  const handleMapPress = useCallback(() => {
    setSheetCollapsed(true);
  }, []);

  /* ------------------------------------------------------------- renderers */

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: insets.top + px(6),
        paddingHorizontal: px(M.pagePadding),
        paddingBottom: px(6),
        height: insets.top + px(54),
        backgroundColor: C.white,
        borderBottomWidth: 1,
        borderBottomColor: C.hairline,
        zIndex: 10,
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
        <PartnerText style={{ fontSize: px(16), lineHeight: px(20), fontWeight: '700', color: C.ink }}>
          Active job
        </PartnerText>
        {job ? (
          <PartnerText
            style={[
              T.small,
              { fontSize: px(12.5), lineHeight: px(16), color: C.greySoft, marginTop: px(1) },
            ]}>
            #{job.bookingNumber}
          </PartnerText>
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

  const menuModal = (
    <Modal
      visible={menuOpen}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setMenuOpen(false)}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(12,12,14,0.18)' }}
        onPress={() => setMenuOpen(false)}>
        <Pressable
          style={{
            position: 'absolute',
            top: insets.top + px(48),
            right: px(14),
            width: px(180),
            backgroundColor: C.card,
            borderRadius: px(12),
            paddingVertical: px(4),
            paddingHorizontal: px(4),
            borderWidth: 1,
            borderColor: C.hairline,
            ...driverShadow,
          }}
          onPress={e => e.stopPropagation?.()}>
          <Pressable
            onPress={() => {
              setMenuOpen(false);
              void refetch();
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: px(10),
              paddingHorizontal: px(10),
              borderRadius: px(8),
              backgroundColor: pressed ? C.light : C.card,
            })}>
            <RefreshCw size={px(15)} color={C.grey} strokeWidth={2.2} />
            <PartnerText style={[T.cardTitle, { fontSize: px(13), color: C.ink, marginLeft: px(8) }]}>
              Refresh job status
            </PartnerText>
          </Pressable>
          <View style={{ height: 1, backgroundColor: C.hairline, marginHorizontal: px(8) }} />
          <Pressable
            onPress={() => {
              setMenuOpen(false);
              void Linking.openURL(SUPPORT_NUMBER);
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: px(10),
              paddingHorizontal: px(10),
              borderRadius: px(8),
              backgroundColor: pressed ? C.light : C.card,
            })}>
            <Phone size={px(15)} color={C.grey} strokeWidth={2.2} />
            <PartnerText style={[T.cardTitle, { fontSize: px(13), color: C.ink, marginLeft: px(8) }]}>
              Call support
            </PartnerText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const mapHeight =
    step === 'verify_otp'
      ? px(170)
      : sheetCollapsed
        ? Math.max(px(380), screenHeight - insets.top - px(200))
        : px(270);

  const mapBlock = (
    <View style={{ marginHorizontal: 0, height: mapHeight, position: 'relative' }}>
      <DeliveryNavMap
        pickupLabel={pickup || 'Saheed Nagar, Bhubaneswar'}
        dropoffLabel={dropoff || 'Mancheswar, Bhubaneswar'}
        isNavigating={isNavigating}
        distanceKm={mapDistanceKm ?? job?.distanceKm ?? 5.4}
        durationMinutes={mapRouteMeta?.durationMinutes ?? 12}
        step={step}
        recenterTrigger={recenterTrigger}
        onToggleNavigation={toggleInAppNavigation}
        onMapPress={handleMapPress}
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
    </View>
  );

  if (isLoading && !job) {
    return (
      <View style={{ flex: 1, backgroundColor: C.pageBg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.amber} size="large" />
      </View>
    );
  }

  if (isError && !job) {
    return (
      <View style={{ flex: 1, backgroundColor: C.pageBg }}>
        {header}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: px(24) }}>
          <View
            style={{
              width: px(64),
              height: px(64),
              borderRadius: px(32),
              backgroundColor: C.cream,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <TriangleAlert size={px(28)} color={C.amberText} strokeWidth={2.2} />
          </View>
          <PartnerText
            style={[
              T.sectionTitle,
              { fontSize: px(19), lineHeight: px(24), color: C.ink, marginTop: px(16) },
            ]}>
            Couldn’t load active job
          </PartnerText>
          <PartnerText
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
            Check your connection and try again.
          </PartnerText>
          <Pressable
            onPress={() => void refetch()}
            accessibilityRole="button"
            style={{
              height: px(M.ctaHeight),
              paddingHorizontal: px(24),
              borderRadius: px(R.button),
              backgroundColor: C.amber,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: px(20),
            }}>
            <PartnerText style={[T.button, { fontSize: px(15), color: C.ink }]}>Try again</PartnerText>
          </Pressable>
        </View>
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
          <PartnerText
            style={[
              T.sectionTitle,
              { fontSize: px(19), lineHeight: px(24), color: C.ink, marginTop: px(16) },
            ]}>
            No active job
          </PartnerText>
          <PartnerText
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
          </PartnerText>
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
            <PartnerText style={[T.button, { fontSize: px(16), color: C.ink }]}>Back to jobs</PartnerText>
          </Pressable>
        </View>
      </View>
    );
  }

  if (step === 'en_route' || step === 'in_progress') {
    return (
      <View style={{ flex: 1, backgroundColor: C.pageBg }}>
        {header}

        {/* Full-bleed interactive navigation map container */}
        <View style={{ flex: 1, position: 'relative' }}>
          <DeliveryNavMap
            pickupLabel={pickup || 'Saheed Nagar, Bhubaneswar'}
            dropoffLabel={dropoff || 'Mancheswar, Bhubaneswar'}
            isNavigating={isNavigating}
            distanceKm={mapDistanceKm ?? job.distanceKm ?? 5.4}
            durationMinutes={mapRouteMeta?.durationMinutes ?? 12}
            step={step}
            recenterTrigger={recenterTrigger}
            onToggleNavigation={toggleInAppNavigation}
            onMapPress={handleMapPress}
          />

          {/* Floating Bottom Sheet Card firmly docked at bottom without empty void */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              maxHeight: screenHeight - insets.top - px(54),
              backgroundColor: C.card,
              borderTopLeftRadius: px(24),
              borderTopRightRadius: px(24),
              paddingHorizontal: px(M.pagePadding),
              paddingTop: px(8),
              paddingBottom: Math.max(insets.bottom + px(6), px(14)),
              borderWidth: 1,
              borderColor: '#E2E8F0',
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: 0.12,
              shadowRadius: 8,
              elevation: 8,
            }}>
            {/* Interactive Collapsible Drag Handle (No text, toggles open/close) */}
            <Pressable
              onPress={toggleSheet}
              hitSlop={{ top: 16, bottom: 20, left: 50, right: 50 }}
              accessibilityRole="button"
              accessibilityLabel={sheetCollapsed ? 'Expand trip details' : 'Minimize trip details'}
              style={({ pressed }) => ({
                alignItems: 'center',
                paddingVertical: px(6),
                marginBottom: px(4),
                opacity: pressed ? 0.6 : 1,
              })}>
              <View
                style={{
                  width: px(44),
                  height: px(4.5),
                  borderRadius: px(2.5),
                  backgroundColor: '#CBD5E1',
                }}
              />
            </Pressable>

            {sheetCollapsed ? (
              /* ----------------- COMPACT / HALF-CLOSED NAVIGATION MODE ----------------- */
              <View>
                {/* Customer Row */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F8FAFC',
                    borderRadius: px(14),
                    padding: px(10),
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    marginBottom: px(10),
                  }}>
                  <View
                    style={{
                      width: px(38),
                      height: px(38),
                      borderRadius: px(19),
                      backgroundColor: '#E2E8F0',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <User size={px(18)} color="#475569" strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1, marginLeft: px(10) }}>
                    <PartnerText style={{ fontSize: px(14.5), fontWeight: '700', color: C.ink }}>
                      {job.customer?.name || 'Rohit Sharma'}
                    </PartnerText>
                    <PartnerText style={{ fontSize: px(12), color: '#64748B', marginTop: px(1) }}>
                      {job.customer?.mobileNumber || '+91 98765 43210'} · Customer
                    </PartnerText>
                  </View>
                  <Pressable
                    onPress={() =>
                      void Linking.openURL(`tel:${job.customer?.mobileNumber || '+919876543210'}`)
                    }
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Call customer"
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: pressed ? '#DCFCE7' : '#F0FDF4',
                      borderWidth: 1,
                      borderColor: '#86EFAC',
                      paddingHorizontal: px(12),
                      paddingVertical: px(7),
                      borderRadius: px(18),
                    })}>
                    <Phone size={px(14)} color="#15803D" strokeWidth={2.4} />
                    <PartnerText
                      style={{
                        fontSize: px(12),
                        fontWeight: '700',
                        color: '#15803D',
                        marginLeft: px(5),
                      }}>
                      Call
                    </PartnerText>
                  </Pressable>
                </View>

                {/* Primary CTA (Arrived at pickup / Complete job) */}
                <Pressable
                  onPress={onPrimaryPress}
                  disabled={acting}
                  accessibilityRole="button"
                  accessibilityLabel={primaryLabel}
                  style={({ pressed }) => ({
                    height: px(48),
                    borderRadius: px(R.button),
                    backgroundColor: C.amber,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.9 : 1,
                    shadowColor: '#D97706',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 2,
                  })}>
                  {acting ? (
                    <ActivityIndicator size="small" color={C.ink} />
                  ) : (
                    <PartnerText
                      style={[
                        T.button,
                        { fontSize: px(16), fontWeight: '800', color: C.ink },
                      ]}>
                      {primaryLabel}
                    </PartnerText>
                  )}
                </Pressable>
              </View>
            ) : (
              /* ----------------- FULL EXPANDED DETAIL MODE ----------------- */
              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                contentContainerStyle={{ paddingBottom: px(4) }}>
                {/* Status row */}
                {step === 'en_route' ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: px(8),
                    }}>
                    <StatusChip label="EN ROUTE TO PICKUP" tone="info" px={px} />
                    <PartnerText style={[T.small, { fontSize: px(12), fontWeight: '700', color: '#2563EB' }]}>
                      {mapDistanceKm != null ? `${mapDistanceKm} km away` : '5.4 km away'}
                    </PartnerText>
                  </View>
                ) : null}

                {/* Trip Title & Booking Number */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                  <PartnerText
                    numberOfLines={1}
                    style={[T.jobTitle, { flex: 1, fontSize: px(15.5), color: C.ink }]}>
                    {serviceName}
                  </PartnerText>
                </View>
                <PartnerText
                  style={[
                    T.meta,
                    { fontSize: px(12), lineHeight: px(16), color: C.greySoft, marginTop: px(1) },
                  ]}>
                  #{job.bookingNumber}
                </PartnerText>

                {/* Perfectly Aligned Route Block */}
                <View
                  style={{
                    marginTop: px(10),
                    backgroundColor: '#F8FAFC',
                    borderRadius: px(14),
                    padding: px(10),
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}>
                  {/* Pickup Row */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View style={{ width: px(22), alignItems: 'center', paddingTop: px(1) }}>
                      <MapPin size={px(17)} color="#2563EB" strokeWidth={2.4} />
                    </View>
                    <View style={{ flex: 1, marginLeft: px(8) }}>
                      <PartnerText
                        style={{
                          fontSize: px(10.5),
                          fontWeight: '700',
                          color: '#2563EB',
                          textTransform: 'uppercase',
                          letterSpacing: 0.3,
                        }}>
                        Pickup
                      </PartnerText>
                      <PartnerText
                        numberOfLines={1}
                        style={{
                          fontSize: px(13),
                          fontWeight: '700',
                          color: C.ink,
                          marginTop: px(1),
                        }}>
                        {pickup || 'Saheed Nagar, Bhubaneswar'}
                      </PartnerText>
                    </View>
                  </View>

                  {/* Dotted Vertical Connector Line with Distance Badge */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginVertical: px(2),
                    }}>
                    <View style={{ width: px(22), alignItems: 'center' }}>
                      {[0, 1, 2].map(idx => (
                        <View
                          key={idx}
                          style={{
                            width: px(2),
                            height: px(2.5),
                            marginVertical: px(1),
                            borderRadius: px(1),
                            backgroundColor: '#94A3B8',
                          }}
                        />
                      ))}
                    </View>
                    <View
                      style={{
                        marginLeft: px(8),
                        backgroundColor: '#EFF6FF',
                        borderWidth: 1,
                        borderColor: '#BFDBFE',
                        paddingHorizontal: px(7),
                        paddingVertical: px(1.5),
                        borderRadius: px(10),
                      }}>
                      <PartnerText
                        style={{
                          fontSize: px(10.5),
                          fontWeight: '700',
                          color: '#1D4ED8',
                        }}>
                        {mapDistanceKm ?? job?.distanceKm ?? 5.4} km trip
                      </PartnerText>
                    </View>
                  </View>

                  {/* Drop Row */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View style={{ width: px(22), alignItems: 'center', paddingTop: px(1) }}>
                      <MapPin size={px(17)} color="#D97706" strokeWidth={2.4} />
                    </View>
                    <View style={{ flex: 1, marginLeft: px(8) }}>
                      <PartnerText
                        style={{
                          fontSize: px(10.5),
                          fontWeight: '700',
                          color: '#D97706',
                          textTransform: 'uppercase',
                          letterSpacing: 0.3,
                        }}>
                        Drop
                      </PartnerText>
                      <PartnerText
                        numberOfLines={1}
                        style={{
                          fontSize: px(13),
                          fontWeight: '700',
                          color: C.ink,
                          marginTop: px(1),
                        }}>
                        {dropoff || 'Mancheswar, Bhubaneswar'}
                      </PartnerText>
                    </View>
                  </View>
                </View>

                {/* Customer Row */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: px(10),
                    paddingTop: px(10),
                    borderTopWidth: 1,
                    borderTopColor: '#E2E8F0',
                  }}>
                  <View
                    style={{
                      width: px(36),
                      height: px(36),
                      borderRadius: px(18),
                      backgroundColor: '#F1F5F9',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                    }}>
                    <User size={px(17)} color="#475569" strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1, marginLeft: px(10) }}>
                    <PartnerText style={{ fontSize: px(14), fontWeight: '700', color: C.ink }}>
                      {job.customer?.name || 'Rohit Sharma'}
                    </PartnerText>
                    <PartnerText style={{ fontSize: px(11.5), color: '#64748B', marginTop: px(1) }}>
                      {job.customer?.mobileNumber || '+91 98765 43210'} · Customer
                    </PartnerText>
                  </View>
                  <Pressable
                    onPress={() =>
                      void Linking.openURL(`tel:${job.customer?.mobileNumber || '+919876543210'}`)
                    }
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Call customer"
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: pressed ? '#DCFCE7' : '#F0FDF4',
                      borderWidth: 1,
                      borderColor: '#86EFAC',
                      paddingHorizontal: px(12),
                      paddingVertical: px(6),
                      borderRadius: px(18),
                    })}>
                    <Phone size={px(13)} color="#15803D" strokeWidth={2.4} />
                    <PartnerText
                      style={{
                        fontSize: px(11.5),
                        fontWeight: '700',
                        color: '#15803D',
                        marginLeft: px(5),
                      }}>
                      Call
                    </PartnerText>
                  </Pressable>
                </View>

                {/* Action Buttons */}
                <View style={{ marginTop: px(12) }}>
                  {step === 'en_route' ? (
                    <Pressable
                      onPress={toggleInAppNavigation}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isNavigating
                          ? 'Exit on-screen navigation'
                          : 'Start on-screen navigation'
                      }
                      style={({ pressed }) => ({
                        height: px(44),
                        borderRadius: px(R.button),
                        borderWidth: 1.5,
                        borderColor: isNavigating ? '#059669' : C.amberBorder,
                        backgroundColor: isNavigating ? '#ECFDF5' : '#FFFFFF',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        marginBottom: px(8),
                        opacity: pressed ? 0.9 : 1,
                      })}>
                      <Navigation
                        size={px(16)}
                        color={isNavigating ? '#059669' : C.ink}
                        strokeWidth={2.4}
                        style={{ marginRight: px(7) }}
                      />
                      <PartnerText
                        style={[
                          T.button,
                          {
                            fontSize: px(14),
                            fontWeight: '700',
                            color: isNavigating ? '#059669' : C.ink,
                          },
                        ]}>
                        {isNavigating
                          ? 'Navigation Active · Tap to Exit'
                          : 'Start On-Screen Navigation'}
                      </PartnerText>
                    </Pressable>
                  ) : null}

                  {/* Primary Action Button */}
                  <Pressable
                    onPress={onPrimaryPress}
                    disabled={acting}
                    accessibilityRole="button"
                    accessibilityLabel={primaryLabel}
                    style={({ pressed }) => ({
                      height: px(48),
                      borderRadius: px(R.button),
                      backgroundColor: C.amber,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.9 : 1,
                      shadowColor: '#D97706',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 2,
                    })}>
                    {acting ? (
                      <ActivityIndicator size="small" color={C.ink} />
                    ) : (
                      <PartnerText
                        style={[
                          T.button,
                          { fontSize: px(16), fontWeight: '800', color: C.ink },
                        ]}>
                        {primaryLabel}
                      </PartnerText>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </View>

        {menuModal}
      </View>
    );
  }

  const showMap = step !== 'completed';

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      {step === 'completed' ? null : header}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + px(54) : 0}>
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: step === 'completed' ? insets.top : 0,
            paddingBottom: 0,
          }}>
          {showMap ? mapBlock : null}

        {/* board 03 — verify customer OTP */}
        {step === 'verify_otp' ? (
          <View
            style={{
              flex: 1,
              marginTop: px(-18),
              backgroundColor: C.card,
              borderTopLeftRadius: px(24),
              borderTopRightRadius: px(24),
              paddingHorizontal: px(M.pagePadding),
              paddingTop: px(20),
              paddingBottom: Math.max(insets.bottom + px(8), px(16)),
              alignItems: 'center',
            }}>
            <View
              style={{
                alignSelf: 'center',
                width: px(32),
                height: px(4),
                borderRadius: px(2),
                backgroundColor: '#D9DBDE',
                marginBottom: px(12),
              }}
            />
            {/* Upgraded Layered Security Badge */}
            <View
              style={{
                width: px(60),
                height: px(60),
                borderRadius: px(30),
                backgroundColor: '#FEF3C7',
                borderWidth: 2,
                borderColor: '#FDE68A',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <View
                style={{
                  width: px(44),
                  height: px(44),
                  borderRadius: px(22),
                  backgroundColor: '#FEA701',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#FEA701',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 2,
                }}>
                <ShieldCheck size={px(24)} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </View>

            <PartnerText
              style={[
                T.sectionTitle,
                {
                  fontSize: px(19),
                  lineHeight: px(25),
                  color: C.ink,
                  marginTop: px(14),
                  textAlign: 'center',
                },
              ]}>
              Confirm customer pickup
            </PartnerText>
            <PartnerText
              style={[
                T.body,
                {
                  fontSize: px(13),
                  lineHeight: px(18),
                  color: C.grey,
                  marginTop: px(4),
                  textAlign: 'center',
                  paddingHorizontal: px(10),
                },
              ]}>
              Ask the customer for the 4-digit code shown in their RACE app.
            </PartnerText>

            {/* OTP Boxes with transparent overlay input for reliable tap & IME cursor */}
            <Pressable
              onPress={() => {
                otpInputRef.current?.focus();
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
              accessibilityRole="button"
              accessibilityLabel="Trip OTP input"
              style={{ flexDirection: 'row', marginTop: px(18), gap: px(12), position: 'relative' }}>
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
                      borderColor: otpError ? C.red : focused ? C.amber : '#CBD5E1',
                      backgroundColor: C.white,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <PartnerText
                      style={{
                        fontSize: px(24),
                        lineHeight: px(28),
                        fontWeight: '700',
                        color: C.ink,
                      }}>
                      {char}
                    </PartnerText>
                  </View>
                );
              })}
              <PartnerTextInput
                ref={otpInputRef}
                value={tripOtp}
                onChangeText={text => {
                  setOtpError('');
                  setTripOtp(text.replace(/\D/g, '').slice(0, OTP_LENGTH));
                }}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                style={{
                  ...StyleSheet.absoluteFill,
                  opacity: 0.01,
                }}
              />
            </Pressable>

            {otpError ? (
              <PartnerText
                style={[
                  T.small,
                  { fontSize: px(12.5), lineHeight: px(17), color: C.red, marginTop: px(10) },
                ]}>
                {otpError}
              </PartnerText>
            ) : null}

            {/* Info Banner with neatly aligned icon badge */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: px(16),
                paddingVertical: px(10),
                paddingHorizontal: px(12),
                borderRadius: px(12),
                backgroundColor: '#EFF6FF',
                borderWidth: 1,
                borderColor: '#DBEAFE',
                alignSelf: 'stretch',
              }}>
              <View
                style={{
                  width: px(22),
                  height: px(22),
                  borderRadius: px(11),
                  backgroundColor: '#DBEAFE',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: px(9),
                }}>
                <Info size={px(13)} color="#2563EB" strokeWidth={2.5} />
              </View>
              <PartnerText
                style={{
                  flex: 1,
                  fontSize: px(12.5),
                  lineHeight: px(17),
                  fontWeight: '500',
                  color: '#1E40AF',
                }}>
                The trip starts after the code is verified.
              </PartnerText>
            </View>

            {/* Primary Action Button */}
            <Pressable
              onPress={onPrimaryPress}
              disabled={acting}
              accessibilityRole="button"
              accessibilityLabel="Verify and start service"
              accessibilityState={{ disabled: acting }}
              style={({ pressed }) => ({
                alignSelf: 'stretch',
                height: px(50),
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
                <PartnerText style={[T.button, { fontSize: px(16), color: C.ink }]}>
                  {primaryLabel}
                </PartnerText>
              )}
            </Pressable>

            {/* Need Help link cleanly placed below button */}
            <Pressable
              onPress={() => void Linking.openURL(SUPPORT_NUMBER)}
              hitSlop={8}
              accessibilityRole="button"
              style={{
                marginTop: px(12),
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: px(4),
              }}>
              <Phone size={px(13)} color="#64748B" strokeWidth={2.2} />
              <PartnerText
                style={{
                  fontSize: px(12.5),
                  fontWeight: '600',
                  color: '#64748B',
                  marginLeft: px(5),
                }}>
                Need help? Call Support
              </PartnerText>
            </Pressable>
          </View>
        ) : null}

        {/* board 05 — job completed summary */}
        {step === 'completed' ? (
          <View style={{ paddingHorizontal: px(M.pagePadding), paddingTop: px(10) }}>
            <View style={{ alignItems: 'center', paddingVertical: px(18), position: 'relative' }}>
              {[
                { left: px(48), top: px(18), color: C.amber, size: 5 },
                { left: px(72), top: px(4), color: C.green, size: 4 },
                { left: px(96), top: px(20), color: C.blue, size: 3 },
                { left: px(122), top: px(2), color: C.amber, size: 3 },
                { left: px(148), top: px(12), color: C.green, size: 4 },
                { left: px(190), top: px(8), color: C.amber, size: 4 },
                { left: px(232), top: px(30), color: C.blue, size: 3 },
                { left: px(260), top: px(52), color: C.green, size: 4 },
                { left: px(42), top: px(68), color: C.blue, size: 3 },
                { left: px(76), top: px(92), color: C.amber, size: 3 },
                { left: px(112), top: px(104), color: C.green, size: 3 },
                { left: px(178), top: px(100), color: C.blue, size: 3 },
                { left: px(246), top: px(78), color: C.amber, size: 5 },
                { left: px(274), top: px(96), color: C.amber, size: 3 },
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
              <PartnerText
                style={[
                  T.sectionTitle,
                  { fontSize: px(24), lineHeight: px(30), color: C.ink, marginTop: px(16) },
                ]}>
                Job completed
              </PartnerText>
              <PartnerText
                style={[
                  T.meta,
                  { fontSize: px(13), lineHeight: px(18), color: C.greySoft, marginTop: px(4) },
                ]}>
                #{job.bookingNumber}
              </PartnerText>
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
                <View
                  style={{
                    width: px(34),
                    height: px(34),
                    borderRadius: px(17),
                    backgroundColor: C.creamRow,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {job.bookingType === 'towing' ? (
                    <Image
                      source={images.icons.towing}
                      style={{ width: px(22), height: px(17) }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Car size={px(20)} color={C.ink} strokeWidth={2} />
                  )}
                </View>
                <PartnerText
                  numberOfLines={1}
                  style={[T.jobTitle, { flex: 1, fontSize: px(15.5), color: C.ink, marginLeft: px(10) }]}>
                  {serviceName}
                </PartnerText>
                <View
                  style={{
                    height: px(M.rowPillHeight),
                    paddingHorizontal: px(10),
                    borderRadius: px(R.pill),
                    backgroundColor: C.greenPill,
                    justifyContent: 'center',
                    marginLeft: px(8),
                  }}>
                  <PartnerText style={[T.pill, { fontSize: px(12), color: C.green }]}>Completed</PartnerText>
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
                  {[0, 1, 2].map(index => (
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
                  <View
                    style={{
                      width: px(11),
                      height: px(11),
                      borderRadius: px(6),
                      backgroundColor: C.amber,
                      marginTop: px(2),
                    }}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: px(10) }}>
                  <PartnerText
                    numberOfLines={1}
                    style={[T.jobTitle, { fontSize: px(14), lineHeight: px(19), color: C.ink }]}>
                    {pickup || 'Pickup location'}
                  </PartnerText>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: px(2) }}>
                    <CalendarDays size={px(13)} color={C.greySoft} strokeWidth={2.2} />
                    <PartnerText
                      style={[
                        T.meta,
                        { fontSize: px(12), lineHeight: px(16), color: C.greySoft, marginLeft: px(5) },
                      ]}>
                      {formatWhen(job.createdAt)}
                    </PartnerText>
                  </View>

                  <PartnerText
                    style={[
                      T.jobTitle,
                      { fontSize: px(14), lineHeight: px(19), color: C.ink, marginTop: px(12) },
                    ]}>
                    {dropoff || 'Drop location'}
                  </PartnerText>
                  {completedAt(job) ? (
                    <View
                      style={{ flexDirection: 'row', alignItems: 'center', marginTop: px(2) }}>
                      <CalendarDays size={px(13)} color={C.greySoft} strokeWidth={2.2} />
                      <PartnerText
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
                      </PartnerText>
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
                    padding: px(10),
                    borderRadius: px(R.innerCard),
                    backgroundColor: C.greenCard,
                  }}>
                  <View
                    style={{
                      width: px(30),
                      height: px(30),
                      borderRadius: px(15),
                      backgroundColor: C.greenTile,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <PartnerText style={{ fontSize: px(16), fontWeight: '800', color: C.green }}>₹</PartnerText>
                  </View>
                  <View style={{ flex: 1, marginLeft: px(10) }}>
                    <PartnerText
                      style={[
                        T.metricValue,
                        { fontSize: px(22), lineHeight: px(27), color: C.ink },
                      ]}>
                      {formatInr(earningsAmount)}
                    </PartnerText>
                    <PartnerText
                      style={[
                        T.meta,
                        { fontSize: px(12.5), lineHeight: px(17), color: C.greySoft, marginTop: px(2) },
                      ]}>
                      {backendConfirmedFare ? 'Final earnings' : 'Estimated earnings'}
                    </PartnerText>
                  </View>
                  {backendConfirmedFare ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        width: px(92),
                        minHeight: px(M.pillHeight + 12),
                        paddingHorizontal: px(8),
                        paddingVertical: px(6),
                        borderRadius: px(R.innerCard),
                        backgroundColor: C.greenPill,
                      }}>
                      <Check size={px(14)} color={C.green} strokeWidth={3} />
                      <PartnerText
                        numberOfLines={2}
                        style={[
                          T.pill,
                          {
                            flex: 1,
                            fontSize: px(11),
                            lineHeight: px(14),
                            color: C.green,
                            marginLeft: px(5),
                            textAlign: 'center',
                          },
                        ]}>
                        Added to earnings
                      </PartnerText>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {tripDuration || job.distanceKm != null ? (
                <View
                  style={{
                    flexDirection: 'row',
                    marginTop: px(12),
                    padding: px(12),
                    borderRadius: px(R.innerCard),
                    backgroundColor: '#F4F8FC',
                  }}>
                  {tripDuration ? (
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                      <View
                        style={{
                          width: px(28),
                          height: px(28),
                          borderRadius: px(14),
                          backgroundColor: C.bluePill,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Clock3 size={px(15)} color={C.blue} strokeWidth={2.4} />
                      </View>
                      <View style={{ marginLeft: px(8) }}>
                        <PartnerText style={[T.small, { fontSize: px(11.5), color: C.greySoft }]}>Total time</PartnerText>
                        <PartnerText style={[T.jobTitle, { fontSize: px(15), color: C.ink, marginTop: px(1) }]}>
                          {tripDuration}
                        </PartnerText>
                      </View>
                    </View>
                  ) : null}
                  {job.distanceKm != null ? (
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                      <View
                        style={{
                          width: px(28),
                          height: px(28),
                          borderRadius: px(14),
                          backgroundColor: C.bluePill,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Route size={px(15)} color={C.blue} strokeWidth={2.4} />
                      </View>
                      <View style={{ marginLeft: px(8) }}>
                        <PartnerText style={[T.small, { fontSize: px(11.5), color: C.greySoft }]}>Total distance</PartnerText>
                        <PartnerText style={[T.jobTitle, { fontSize: px(15), color: C.ink, marginTop: px(1) }]}>
                          {job.distanceKm} km
                        </PartnerText>
                      </View>
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
                <PartnerText style={[T.button, { fontSize: px(16), color: C.ink, marginLeft: px(8) }]}>
                  Back to Home
                </PartnerText>
              </Pressable>
            </View>

            <Pressable
              onPress={() => navigation.popToTop()}
              accessibilityRole="button"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: px(14),
              }}>
              <PartnerText style={[T.link, { fontSize: px(14), color: C.grey }]}>View job details</PartnerText>
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
      </KeyboardAvoidingView>

      {menuModal}
    </View>
  );
}
