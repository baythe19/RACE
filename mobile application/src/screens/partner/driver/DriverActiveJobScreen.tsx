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
 *   - If arrival was tapped by mistake, "Not at pickup yet" reverts to en route
 *     (status DRIVER_EN_ROUTE) and hides the OTP step until arrival is confirmed again.
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
  Truck,
  User,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LiveTripMap from '../../../components/booking/LiveTripMap';
import RouteOverviewCards from '../../../components/partner/driver/RouteOverviewCards';
import NavTurnBanner from '../../../components/partner/driver/NavTurnBanner';
import NavBottomBar from '../../../components/partner/driver/NavBottomBar';
import ArrivedPickupCard from '../../../components/partner/driver/ArrivedPickupCard';
import CustomerOtpModal from '../../../components/partner/driver/CustomerOtpModal';
import TripInProgressSheet from '../../../components/partner/driver/TripInProgressSheet';
import JobCompletedModal from '../../../components/partner/driver/JobCompletedModal';
import { OffRouteBanner, WeakGpsAlert } from '../../../components/partner/driver/NavigationAlertBanners';
import type { RoadRouteResult, RouteManeuverStep } from '../../../services/driver/roadRoutingService';
import { images } from '../../../assets';
import {
  isUiTestPermissiveMode,
  UI_PREVIEW_MODE,
  UI_PREVIEW_MUTATIONS_ENABLED,
} from '../../../constants/preview';
import {
  formatKm,
  haversineKm,
  haversineMeters,
  legForJobStatus,
  legTitle,
  NEAR_PICKUP_METERS,
} from '../../../services/driver/tripNavigation';
import { updateMockActiveJobStatus } from '../../../data/mockPartnerData';
import { useScreenPx } from '../../../hooks/useScreenPx';
import DriverDataSkeleton from '../../../components/partner/DriverDataSkeleton';
import { useDriverLocationReporting } from '../../../hooks/useDriverLocationReporting';
import {
  useDriverActiveJobQuery,
  useUpdateDriverBookingStatusMutation,
  useRejectDriverJobMutation,
  useRefreshDriverDataOnFocus,
} from '../../../services/driver/useDriverQueries';
import { getApiErrorMessage } from '../../../services/auth/useAuthMutations';
import type { DriverJobBooking } from '../../../services/driver/driverApi';
import type { PartnerJobsStackParamList } from '../../../types/partnerNavigation';
import { formatReadableAddress } from '../../../utils/readableAddress';
import { useDriverPresenceStore } from '../../../store/driverPresenceStore';
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
  const rejectMutation = useRejectDriverJobMutation();
  useRefreshDriverDataOnFocus(true);

  const [acting, setActing] = useState(false);
  const [completedJob, setCompletedJob] = useState<DriverJobBooking | null>(null);
  const [tripOtp, setTripOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const [legMeta, setLegMeta] = useState<{ distanceKm: number; durationMinutes?: number; approximate?: boolean } | null>(null);
  const onLegMeta = useCallback(
    (meta: { distanceKm: number; durationMinutes?: number; approximate?: boolean } | null) => {
      setLegMeta(meta);
    },
    [],
  );
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const otpInputRef = useRef<TextInput>(null);
  const driverLocation = useDriverPresenceStore(state => state.driverLocation);

  const [navMode, setNavMode] = useState<'overview' | 'turn_by_turn'>('overview');
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [compassHeadingUp, setCompassHeadingUp] = useState(false);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [weakGps, setWeakGps] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [previewScreen, setPreviewScreen] = useState<number | null>(null);
  const [calculatedRoute, setCalculatedRoute] = useState<RoadRouteResult | null>(null);
  const [vehicleHeading, setVehicleHeading] = useState(25);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [qaMenuOpen, setQaMenuOpen] = useState(false);

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
  // invalidation. This keeps the confirmed fare from reverting to its estimate.
  const job =
    completedJob && (!bookingId || completedJob.id === bookingId)
      ? completedJob
      : activeJob && (!bookingId || activeJob.id === bookingId)
        ? activeJob
        : null;
  const step: Step = job ? stepForStatus(job.status) : 'en_route';

  // Hide the map while the number pad is open so OTP and its action stay visible.
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  /**
   * Android Hardware Back Button:
   * 1. If options menu is open -> close it.
   * 2. If trip details bottom sheet is expanded -> collapse to compact navigation view.
   * 3. Otherwise -> default back behavior.
   */
  const reportingEnabled = Boolean(
    job && ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(job.status),
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
        if (UI_PREVIEW_MUTATIONS_ENABLED) {
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

  const undoPickupArrival = useCallback(() => {
    if (acting || !job || step !== 'verify_otp') return;
    Keyboard.dismiss();
    setOtpError('');
    setTripOtp('');
    void runStatusUpdate('DRIVER_EN_ROUTE');
  }, [acting, job, runStatusUpdate, step]);

  const confirmUndoPickupArrival = useCallback(() => {
    if (acting || step !== 'verify_otp') return;
    Alert.alert(
      'Not at pickup yet?',
      'You can go back to navigation. The customer code will stay hidden until you confirm arrival again.',
      [
        { text: 'Stay here', style: 'cancel' },
        { text: 'Go back', onPress: undoPickupArrival },
      ],
    );
  }, [acting, step, undoPickupArrival]);

  useEffect(() => {
    const onBackPress = () => {
      if (menuOpen) {
        setMenuOpen(false);
        return true;
      }
      if (step === 'verify_otp') {
        confirmUndoPickupArrival();
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
  }, [confirmUndoPickupArrival, menuOpen, sheetCollapsed, step]);

  const onPrimaryPress = useCallback(() => {
    if (acting || !job) return;
    if (job.status === 'DRIVER_ASSIGNED') {
      void runStatusUpdate('DRIVER_EN_ROUTE');
      return;
    }
    if (step === 'en_route') {
      void runStatusUpdate('DRIVER_ARRIVED');
      return;
    }
    if (step === 'verify_otp') {
      const code = tripOtp.trim();
      const isPermissive = isUiTestPermissiveMode() || UI_PREVIEW_MUTATIONS_ENABLED;
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

  const onDeclineAssignment = useCallback(() => {
    if (acting || !job) return;
    Alert.alert(
      'Decline assignment?',
      'This job will be returned to your vendor so another driver can be assigned.',
      [
        { text: 'Keep Job', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setActing(true);
            try {
              await rejectMutation.mutateAsync({
                bookingId: job.id,
                bookingType: job.bookingType,
              });
              Alert.alert('Assignment declined', 'The vendor has been notified.', [
                {
                  text: 'OK',
                  onPress: () => {
                    navigation.popToTop();
                    navigation.getParent()?.navigate('PartnerHome' as never);
                  },
                },
              ]);
            } catch (error) {
              Alert.alert('Could not decline', getApiErrorMessage(error, 'Failed to decline assignment.'));
            } finally {
              setActing(false);
            }
          },
        },
      ],
    );
  }, [acting, job, navigation, rejectMutation]);

  const primaryLabel =
    job?.status === 'DRIVER_ASSIGNED'
      ? 'Accept Job & Start Route'
      : step === 'en_route'
        ? 'Arrived at pickup'
        : step === 'verify_otp'
          ? 'Verify & start service'
          : step === 'in_progress'
            ? 'Complete job'
            : 'Back to Home';

  /** The backend confirms the amount at completion; only then is it final. */
  const backendConfirmedFare = typeof job?.finalFare === 'number';
  const fareAmount = job
    ? (job.finalFare ?? job.estimatedFare ?? null)
    : null;
  const tripDuration = tripDurationLabel(job?.statusHistory);
  const mapDistanceKm = job?.distanceKm;
  const activeDestination = step === 'in_progress' ? job?.dropoff : job?.pickup;
  const activeDestinationPoint =
    activeDestination?.latitude != null && activeDestination?.longitude != null
      ? {
          latitude: activeDestination.latitude,
          longitude: activeDestination.longitude,
          label: step === 'in_progress' ? 'Drop-off' : 'Pickup',
        }
      : null;
  const freshDriverLocation =
    driverLocation && Date.now() - driverLocation.updatedAt < 60_000
      ? { latitude: driverLocation.latitude, longitude: driverLocation.longitude, label: 'You' }
      : null;
  const previewDriverLocation =
    UI_PREVIEW_MODE && !freshDriverLocation && hasPickupCoords && job?.pickup
      ? {
          latitude: (job.pickup.latitude as number) - 0.012,
          longitude: (job.pickup.longitude as number) - 0.008,
          label: 'You',
        }
      : null;
  const displayDriverLocation =
    step === 'in_progress' && !freshDriverLocation && hasPickupCoords && job?.pickup
      ? {
          latitude: job.pickup.latitude as number,
          longitude: job.pickup.longitude as number,
          label: 'You',
        }
      : (freshDriverLocation ?? previewDriverLocation);
  const tripLeg = legForJobStatus(job?.status ?? '');
  const straightLegKm =
    displayDriverLocation && activeDestinationPoint
      ? haversineKm(displayDriverLocation, activeDestinationPoint)
      : null;
  const legKm = legMeta?.distanceKm ?? straightLegKm;
  const nearPickup =
    tripLeg === 'to_pickup' &&
    displayDriverLocation &&
    activeDestinationPoint &&
    haversineMeters(displayDriverLocation, activeDestinationPoint) <= NEAR_PICKUP_METERS;
  const legDistanceLabel = !displayDriverLocation
    ? 'Turn on location to see how far you are'
    : nearPickup
      ? 'You are near the pickup'
      : legKm == null
        ? 'Route unavailable'
        : `${formatKm(legKm)}${legMeta?.durationMinutes && !legMeta.approximate ? ` · ${legMeta.durationMinutes} min` : ''}${legMeta?.approximate || !legMeta ? ' · straight line' : ''}`;

  const recenterMap = useCallback(() => {
    setRecenterTrigger(current => current + 1);
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

  const mapHeight = sheetCollapsed
    ? Math.max(px(380), screenHeight - insets.top - px(200))
    : px(270);

  const mapBlock = (
    <View
      style={{
        position: 'relative',
        ...(step === 'verify_otp'
          ? { flex: 1, minHeight: px(120) }
          : { height: mapHeight }),
      }}>
      <LiveTripMap
        style={StyleSheet.absoluteFill}
        borderRadius={0}
        showsUserLocation
        driverLocation={displayDriverLocation}
        pickup={
          hasPickupCoords && job?.pickup
            ? { latitude: job.pickup.latitude as number, longitude: job.pickup.longitude as number, label: 'Pickup' }
            : null
        }
        dropoff={
          hasDropCoords && job?.dropoff
            ? { latitude: job.dropoff.latitude as number, longitude: job.dropoff.longitude as number, label: 'Drop' }
            : null
        }
        activeDestination={activeDestinationPoint}
        routeApiEnabled
        straightFallback
        onRouteMetaChange={onLegMeta}
        recenterTrigger={recenterTrigger}
      />
      <Pressable
        onPress={recenterMap}
        accessibilityRole="button"
        accessibilityLabel="Recenter map"
        hitSlop={8}
        style={({ pressed }) => ({
          position: 'absolute',
          right: px(16),
          top: px(14),
          width: px(42),
          height: px(42),
          borderRadius: px(21),
          backgroundColor: pressed ? '#F1F5F9' : C.white,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 3,
        })}>
        <LocateFixed size={px(19)} color={C.ink} strokeWidth={2.3} />
      </Pressable>
      {step === 'verify_otp' ? (
        <View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFill,
            backgroundColor: 'rgba(12, 16, 24, 0.34)',
          }}
        />
      ) : null}
    </View>
  );

  if (isLoading && !job) {
    return (
      <View style={{ flex: 1, backgroundColor: C.pageBg, padding: px(16), paddingTop: insets.top + px(12) }}>
        <DriverDataSkeleton variant="active-job" />
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

  // Effective Screen Number (computed from real step / navMode, or previewScreen override)
  const effectiveScreen = useMemo(() => {
    if (previewScreen != null) return previewScreen;
    if (step === 'completed') return 10;
    if (step === 'verify_otp') return otpModalOpen ? 7 : 6;
    if (step === 'en_route') return navMode === 'turn_by_turn' ? 5 : 4;
    if (step === 'in_progress') return navMode === 'turn_by_turn' ? 8 : 9;
    return 4;
  }, [navMode, otpModalOpen, previewScreen, step]);

  const isNavigating = effectiveScreen === 5 || effectiveScreen === 8;
  const legLabel = legTitle(tripLeg);

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg, position: 'relative' }}>
      {/* Top Header Bar (Shown during overview and when not full navigation mode) */}
      {!isNavigating && effectiveScreen !== 10 && !otpModalOpen && effectiveScreen !== 7 ? header : null}

      {/* Full-bleed Interactive Navigation Map in background */}
      <View style={{ flex: 1, position: 'relative' }} accessibilityLabel={legLabel}>
        <LiveTripMap
          style={StyleSheet.absoluteFill}
          borderRadius={0}
          showsUserLocation
          driverLocation={displayDriverLocation}
          pickup={
            hasPickupCoords && job.pickup
              ? { latitude: job.pickup.latitude as number, longitude: job.pickup.longitude as number, label: 'Pickup' }
              : null
          }
          dropoff={
            hasDropCoords && job.dropoff
              ? { latitude: job.dropoff.latitude as number, longitude: job.dropoff.longitude as number, label: 'Drop' }
              : null
          }
          activeDestination={activeDestinationPoint}
          routeApiEnabled
          straightFallback={false}
          navigationMode={isNavigating}
          vehicleHeading={vehicleHeading}
          vehicleType={job.bookingType === 'driver' ? 'car' : 'tow_truck'}
          isOffRoute={isOffRoute || effectiveScreen === 11}
          onRouteCalculated={setCalculatedRoute}
          onRouteMetaChange={onLegMeta}
          recenterTrigger={recenterTrigger}
        />

        {/* Screen 4: Route Overview to Pickup */}
        {effectiveScreen === 4 ? (
          <RouteOverviewCards
            pickupAddress={pickup || 'Saheed Nagar, Bhubaneswar'}
            distanceKm={calculatedRoute?.distanceKm ?? (typeof legKm === 'number' ? Number(legKm.toFixed(1)) : 5.4)}
            durationMinutes={calculatedRoute?.durationMinutes ?? legMeta?.durationMinutes ?? 18}
            onStartNavigation={() => {
              setNavMode('turn_by_turn');
              if (job.status === 'DRIVER_ASSIGNED') {
                void runStatusUpdate('DRIVER_EN_ROUTE');
              }
            }}
            onRecenter={recenterMap}
            onToggleCompass={() => setCompassHeadingUp(prev => !prev)}
            compassHeadingUp={compassHeadingUp}
            insetsTop={insets.top + px(54)}
            insetsBottom={insets.bottom}
          />
        ) : null}

        {/* Screen 5: Turn-by-Turn Navigation to Pickup */}
        {effectiveScreen === 5 ? (
          <>
            <NavTurnBanner
              currentStep={
                calculatedRoute?.steps?.[currentStepIndex] || {
                  id: 'step-pickup-1',
                  instruction: 'Turn left onto NH-16',
                  shortInstruction: 'Turn left',
                  streetName: 'NH-16',
                  distanceMeters: 650,
                  durationSeconds: 90,
                  maneuverType: 'turn_left',
                  coordinate: { latitude: 20.2958, longitude: 85.8452 },
                }
              }
              voiceMuted={voiceMuted}
              onToggleVoice={() => setVoiceMuted(prev => !prev)}
              compassHeadingUp={compassHeadingUp}
              onToggleCompass={() => setCompassHeadingUp(prev => !prev)}
              onRecenter={recenterMap}
              insetsTop={insets.top}
            />
            <NavBottomBar
              etaMinutes={calculatedRoute?.durationMinutes ?? 17}
              distanceKm={calculatedRoute?.distanceKm ?? 5.4}
              etaTimeFormatted={calculatedRoute?.etaTimeFormatted ?? '10:12 PM'}
              onExitNav={() => setNavMode('overview')}
              onArriveAction={() => void runStatusUpdate('DRIVER_ARRIVED')}
              arriveActionLabel="Arrived"
              insetsBottom={insets.bottom}
            />
          </>
        ) : null}

        {/* Screen 6: Arrived at Pickup */}
        {effectiveScreen === 6 ? (
          <ArrivedPickupCard
            pickupAddress={pickup || 'Saheed Nagar, Bhubaneswar'}
            customerName={job.customer?.name || 'Customer'}
            customerMobile={job.customer?.mobileNumber || '+919876543210'}
            onVerifyOtpPress={() => setOtpModalOpen(true)}
            onUndoArrival={undoPickupArrival}
            acting={acting}
            insetsTop={insets.top}
            insetsBottom={insets.bottom}
          />
        ) : null}

        {/* Screen 7: Customer OTP Verification */}
        {effectiveScreen === 7 || (otpModalOpen && step === 'verify_otp') ? (
          <CustomerOtpModal
            bookingNumber={job.bookingNumber || 'TOW-10048'}
            tripOtp={tripOtp}
            setTripOtp={setTripOtp}
            otpError={otpError}
            acting={acting}
            onVerify={onPrimaryPress}
            onBack={() => {
              setOtpModalOpen(false);
              setOtpError('');
            }}
            customerMobile={job.customer?.mobileNumber || '+919876543210'}
            insetsTop={insets.top}
            insetsBottom={insets.bottom}
          />
        ) : null}

        {/* Screen 8: On Service (Turn-by-Turn to Drop) */}
        {effectiveScreen === 8 ? (
          <>
            <NavTurnBanner
              currentStep={
                calculatedRoute?.steps?.[1] || {
                  id: 'step-drop-1',
                  instruction: 'Continue on NH-16',
                  shortInstruction: 'Straight',
                  streetName: 'NH-16',
                  distanceMeters: 2100,
                  durationSeconds: 180,
                  maneuverType: 'straight',
                  coordinate: { latitude: 20.3068, longitude: 85.8551 },
                }
              }
              voiceMuted={voiceMuted}
              onToggleVoice={() => setVoiceMuted(prev => !prev)}
              compassHeadingUp={compassHeadingUp}
              onToggleCompass={() => setCompassHeadingUp(prev => !prev)}
              onRecenter={recenterMap}
              insetsTop={insets.top}
            />
            <NavBottomBar
              etaMinutes={calculatedRoute?.durationMinutes ?? 12}
              distanceKm={calculatedRoute?.distanceKm ?? 2.1}
              etaTimeFormatted={calculatedRoute?.etaTimeFormatted ?? '10:32 PM'}
              onExitNav={() => setNavMode('overview')}
              onArriveAction={() => void runStatusUpdate('COMPLETED')}
              arriveActionLabel="End"
              insetsBottom={insets.bottom}
            />
          </>
        ) : null}

        {/* Screen 9: Trip In Progress Live Tracking */}
        {effectiveScreen === 9 ? (
          <TripInProgressSheet
            bookingNumber={job.bookingNumber || 'TOW-10048'}
            dropAddress={dropoff || 'Mancheswar, Bhubaneswar'}
            distanceKm={calculatedRoute?.distanceKm ?? 2.1}
            durationMinutes={calculatedRoute?.durationMinutes ?? 12}
            customerName={job.customer?.name || 'Customer'}
            customerMobile={job.customer?.mobileNumber || '+919876543210'}
            onCompletePress={onPrimaryPress}
            acting={acting}
            insetsTop={insets.top}
            insetsBottom={insets.bottom}
          />
        ) : null}

        {/* Screen 10: Job Completion Modal */}
        <JobCompletedModal
          visible={effectiveScreen === 10}
          bookingNumber={job.bookingNumber || 'TOW-10048'}
          totalEarnings={typeof job.finalFare === 'number' ? job.finalFare : (job.estimatedFare ?? 1650)}
          pickupAddress={pickup || 'Saheed Nagar'}
          dropAddress={dropoff || 'Mancheswar'}
          pickupTimeFormatted="10:12 PM"
          dropTimeFormatted="10:34 PM"
          distanceKm={job.distanceKm ?? 5.4}
          durationMinutes={22}
          onBackToHome={() => {
            navigation.popToTop();
            navigation.getParent()?.navigate('PartnerHome' as never);
          }}
          onViewJobDetails={() => {
            Alert.alert('Job Details', `Booking #${job.bookingNumber}\nService: ${serviceName}\nStatus: COMPLETED`);
          }}
          insetsTop={insets.top}
          insetsBottom={insets.bottom}
        />

        {/* Screen 11: Off Route / Rerouting Banner */}
        <OffRouteBanner
          visible={isOffRoute || effectiveScreen === 11}
          onDismiss={() => {
            setIsOffRoute(false);
            setPreviewScreen(null);
          }}
          insetsTop={insets.top}
        />

        {/* Screen 12: Poor GPS / Weak Signal Alert */}
        <WeakGpsAlert
          visible={weakGps || effectiveScreen === 12}
          onRetryGps={() => {
            setWeakGps(false);
            setPreviewScreen(null);
          }}
          onDismissSheet={() => {
            setWeakGps(false);
            setPreviewScreen(null);
          }}
          insetsTop={insets.top}
          insetsBottom={insets.bottom}
        />
      </View>

      {/* Floating UI QA / Screen Switcher Pill */}
      {(UI_PREVIEW_MODE || __DEV__) ? (
        <View style={{ position: 'absolute', right: 14, bottom: insets.bottom + 12, zIndex: 100 }}>
          <Pressable
            onPress={() => setQaMenuOpen(prev => !prev)}
            accessibilityRole="button"
            accessibilityLabel="Toggle UI QA Screen Switcher"
            style={({ pressed }) => ({
              backgroundColor: '#FEA701',
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#D97706',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
              opacity: pressed ? 0.8 : 1,
            })}>
            <PartnerText style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>
              ⚡ UI QA {previewScreen ? `(Screen ${previewScreen})` : ''}
            </PartnerText>
          </Pressable>
        </View>
      ) : null}

      {/* QA Switcher Modal */}
      <Modal
        visible={qaMenuOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setQaMenuOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setQaMenuOpen(false)}>
          <Pressable
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: Math.max(insets.bottom + 16, 24),
            }}
            onPress={e => e.stopPropagation?.()}>
            <PartnerText style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 }}>
              Navigation Blueprint Preview (Screens 4–12)
            </PartnerText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { label: 'Screen 4: Route Overview', screen: 4 },
                { label: 'Screen 5: Nav to Pickup', screen: 5 },
                { label: 'Screen 6: Arrived Pickup', screen: 6 },
                { label: 'Screen 7: Customer OTP', screen: 7 },
                { label: 'Screen 8: Nav to Drop', screen: 8 },
                { label: 'Screen 9: Trip In Progress', screen: 9 },
                { label: 'Screen 10: Job Completed', screen: 10 },
                { label: 'Screen 11: Off Route', screen: 11 },
                { label: 'Screen 12: Weak GPS', screen: 12 },
                { label: 'Live Backend Flow', screen: null },
              ].map(item => (
                <Pressable
                  key={item.label}
                  onPress={() => {
                    setPreviewScreen(item.screen);
                    if (item.screen === 7) setOtpModalOpen(true);
                    else if (item.screen === 6) setOtpModalOpen(false);
                    setQaMenuOpen(false);
                  }}
                  style={{
                    backgroundColor: previewScreen === item.screen ? '#FEA701' : '#F1F5F9',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                  }}>
                  <PartnerText
                    style={{
                      fontSize: 12.5,
                      fontWeight: '700',
                      color: previewScreen === item.screen ? '#0F172A' : '#334155',
                    }}>
                    {item.label}
                  </PartnerText>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {menuModal}
    </View>
  );
}
