import { PartnerText } from '../../../components/partner/PartnerText';
/**
 * RACE Partner — Driver active job.
 *
 * One screen walks the driver through the whole job lifecycle, fully in-app
 * (no hand-off to an external maps app):
 *
 *   4  Route overview to pickup (directions list, Start navigation)
 *   5  Turn-by-turn to pickup        → "Arrived"
 *   6  Reached pickup + customer OTP (ONE sheet; also "Not at pickup yet")
 *   8  Turn-by-turn to drop          (starts automatically after OTP)  → "Arrived"
 *   9  At / on the way to drop       → "Complete job" (confirmed)
 *  10  Job completed summary         → Back to Home
 *  11  Off route  /  12 Weak GPS     (overlays driven by real signals)
 *
 * [BEHAVIOR]
 *   - Status transitions come from the backend and are never assumed locally;
 *     the UI re-reads the active booking after every mutation.
 *   - Arrival is never automatic (city GPS error > a driveway). The Arrived
 *     button turns green when the driver is within range; tapping it from far
 *     away asks for confirmation.
 *   - The route is fetched once per leg and again only when the driver leaves
 *     it (useDriverRoute). Remaining distance, ETA and the next manoeuvre all
 *     come from the live GPS fix snapped onto that route.
 *   - Preview builds feed the same pipeline from useTripSimulation instead of
 *     the device GPS, so the mock flow exercises production code.
 *   - If arrival was tapped by mistake, "Not at pickup yet" reverts to en route
 *     (status DRIVER_EN_ROUTE) and hides the OTP step until arrival is confirmed again.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  Keyboard,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  ArrowLeft,
  MoreVertical,
  Navigation,
  Phone,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LiveTripMap from '../../../components/booking/LiveTripMap';
import RouteOverviewCards from '../../../components/partner/driver/RouteOverviewCards';
import NavTurnBanner from '../../../components/partner/driver/NavTurnBanner';
import NavBottomBar from '../../../components/partner/driver/NavBottomBar';
import ArrivedPickupCard from '../../../components/partner/driver/ArrivedPickupCard';
import TripInProgressSheet from '../../../components/partner/driver/TripInProgressSheet';
import JobCompletedModal from '../../../components/partner/driver/JobCompletedModal';
import { OffRouteBanner, WeakGpsAlert } from '../../../components/partner/driver/NavigationAlertBanners';
import {
  isUiTestPermissiveMode,
  UI_PREVIEW_MODE,
  UI_PREVIEW_MUTATIONS_ENABLED,
  UI_QA_NAVIGATOR_ENABLED,
} from '../../../constants/preview';
import {
  ARRIVAL_PROMPT_METERS,
  formatKm,
  haversineMeters,
  legForJobStatus,
  legTitle,
} from '../../../services/driver/tripNavigation';
import { formatEta } from '../../../services/driver/roadRoutingService';
import { updateMockActiveJobStatus } from '../../../data/mockPartnerData';
import { getPreviewDriverStart } from '../../../data/previewPartnerWorld';
import { useScreenPx } from '../../../hooks/useScreenPx';
import { usePartnerDialog } from '../../../hooks/usePartnerDialog';
import DriverDataSkeleton from '../../../components/partner/DriverDataSkeleton';
import { retryDriverLocationReport, useDriverLocationReporting } from '../../../hooks/useDriverLocationReporting';
import { useNavigationGps, useTravelHeading } from '../../../hooks/useNavigationGps';
import { useDriverRoute } from '../../../hooks/useDriverRoute';
import { useTripSimulation } from '../../../hooks/useTripSimulation';
import {
  useDriverActiveJobQuery,
  useUpdateDriverBookingStatusMutation,
  useRejectDriverJobMutation,
  useDriverArrivedAtDropoffMutation,
  useDriverCompleteBookingMutation,
  useRefreshDriverDataOnFocus,
  useAcceptDriverJobMutation,
  useDriverProfileQuery,
} from '../../../services/driver/useDriverQueries';
import { getApiErrorMessage } from '../../../services/auth/useAuthMutations';
import { useAppSelector } from '../../../redux/hooks';
import { assertDriverCanAcceptJobs } from '../../../utils/driverVerification';
import { getDriverAcceptLocationGate, pickupCoordsFromJob } from '../../../utils/driverLocationGuide';
import { PREVIEW_TRIP_OTP, type DriverJobBooking } from '../../../services/driver/driverApi';
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
/** Confirm "Arrived" / "Complete" taps made this far from the destination. */
const FAR_FROM_DESTINATION_METERS = 400;
/** GPS older than this (or less accurate than ACCURACY) is treated as weak. */
const GPS_STALE_MS = 20_000;
const GPS_POOR_ACCURACY_METERS = 80;

type Props = NativeStackScreenProps<PartnerJobsStackParamList, 'PartnerActiveJob'>;

/** Lifecycle steps this screen renders. */
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

function historyEntry(job: DriverJobBooking | null | undefined, status: string) {
  return [...(job?.statusHistory ?? [])].reverse().find(entry => entry.status === status);
}

function clockLabel(iso?: string) {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(+date)) return undefined;
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function minutesBetween(startIso?: string, endIso?: string): number | null {
  if (!startIso || !endIso) return null;
  const ms = +new Date(endIso) - +new Date(startIso);
  return Number.isFinite(ms) && ms > 0 ? Math.max(1, Math.round(ms / 60_000)) : null;
}

function finalFareFromResponse(result: unknown): number | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const response = result as { finalFare?: unknown; data?: { finalFare?: unknown } };
  const fare = response.finalFare ?? response.data?.finalFare;
  return typeof fare === 'number' ? fare : undefined;
}

function statusHistoryFromResponse(
  result: unknown,
  fallback: Array<{ status: string; timestamp: string }>,
) {
  if (!result || typeof result !== 'object') return fallback;
  const response = result as { statusHistory?: unknown; data?: { statusHistory?: unknown } };
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

/* -------------------------------------------------------------------- screen */

export default function DriverActiveJobScreen({ navigation, route }: Props) {
  const px = useScreenPx();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { dialog: partnerDialog, showAlert } = usePartnerDialog();
  const bookingId = route.params?.bookingId;
  const { data: activeJob, isLoading, isError, refetch } = useDriverActiveJobQuery(true);
  const statusMutation = useUpdateDriverBookingStatusMutation();
  const rejectMutation = useRejectDriverJobMutation();
  const dropoffArrivalMutation = useDriverArrivedAtDropoffMutation();
  const completeBookingMutation = useDriverCompleteBookingMutation();
  const acceptMutation = useAcceptDriverJobMutation();
  const { data: profile } = useDriverProfileQuery(true);
  const user = useAppSelector(state => state.auth.user);
  useRefreshDriverDataOnFocus(true);

  const [acting, setActing] = useState(false);
  const [completedJob, setCompletedJob] = useState<DriverJobBooking | null>(null);
  const [tripOtp, setTripOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [completionOtp, setCompletionOtp] = useState('');
  const [completionOtpError, setCompletionOtpError] = useState('');
  const [customerPaymentConfirmed, setCustomerPaymentConfirmed] = useState(false);
  const [customerPaymentMode, setCustomerPaymentMode] = useState<'CASH' | 'UPI' | 'ONLINE' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [navMode, setNavMode] = useState<'overview' | 'turn_by_turn'>('overview');
  const [compassHeadingUp, setCompassHeadingUp] = useState(true);
  const [followUser, setFollowUser] = useState(true);
  const [arrivedAtDrop, setArrivedAtDrop] = useState(false);
  const [previewScreen, setPreviewScreen] = useState<number | null>(null);
  const [qaMenuOpen, setQaMenuOpen] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [weakDismissedAt, setWeakDismissedAt] = useState(0);

  const driverLocation = useDriverPresenceStore(state => state.driverLocation);
  const manualLocation = useDriverPresenceStore(state => state.manualLocation);
  const navSyncKey = useRef('');

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
  const jobStatus = job?.status ?? '';

  // Re-open or a status change restores the same stage. A local Exit navigation
  // tap does not change the key, so it is not forced back into turn-by-turn.
  useEffect(() => {
    if (!job) return;
    const key = `${job.id}:${job.status}:${job.arrivedAtDropoffAt ?? ''}`;
    if (navSyncKey.current === key) return;
    navSyncKey.current = key;
    if (job.arrivedAtDropoffAt) {
      setArrivedAtDrop(true);
      setNavMode('overview');
      return;
    }
    setArrivedAtDrop(false);
    if (job.status === 'DRIVER_EN_ROUTE' || job.status === 'IN_PROGRESS') {
      setNavMode('turn_by_turn');
      return;
    }
    setNavMode('overview');
  }, [job]);

  const reportingEnabled = Boolean(
    job && ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(job.status),
  );
  const simulate = UI_PREVIEW_MODE && reportingEnabled;
  useDriverLocationReporting(reportingEnabled);
  useNavigationGps(reportingEnabled && !simulate);

  const pickup = addressOf(job?.pickup?.address || job?.pickup?.label);
  const dropoff = addressOf(job?.dropoff?.address || job?.dropoff?.label);
  const pickupPoint = useMemo(
    () =>
      job?.pickup?.latitude != null && job.pickup.longitude != null
        ? { latitude: job.pickup.latitude, longitude: job.pickup.longitude, label: 'Pickup' }
        : null,
    [job?.pickup?.latitude, job?.pickup?.longitude],
  );
  const dropPoint = useMemo(
    () =>
      job?.dropoff?.latitude != null && job.dropoff.longitude != null
        ? { latitude: job.dropoff.latitude, longitude: job.dropoff.longitude, label: 'Drop' }
        : null,
    [job?.dropoff?.latitude, job?.dropoff?.longitude],
  );

  const tripLeg = legForJobStatus(jobStatus);
  const toDrop = tripLeg === 'to_drop';
  const destinationPoint = toDrop ? dropPoint : pickupPoint;
  const destinationAddress = toDrop ? dropoff : pickup;

  const gpsFresh = driverLocation != null && clock - driverLocation.updatedAt < 60_000;
  const driverFix = useMemo(
    () =>
      driverLocation && gpsFresh
        ? { latitude: driverLocation.latitude, longitude: driverLocation.longitude, label: 'You' }
        : null,
    [driverLocation, gpsFresh],
  );
  const vehicleHeading = useTravelHeading(driverLocation);

  const routeEnabled = reportingEnabled && step !== 'verify_otp' && step !== 'completed';
  const routeState = useDriverRoute({
    origin: driverFix,
    destination: routeEnabled ? destinationPoint : null,
    destinationName: destinationAddress || undefined,
    enabled: routeEnabled,
  });
  const { route: roadRoute } = routeState;

  const straightToDestination =
    driverFix && destinationPoint ? haversineMeters(driverFix, destinationPoint) : null;
  const remainingMeters =
    routeState.remainingMeters != null && !routeState.offRoute
      ? routeState.remainingMeters
      : straightToDestination;
  const nearDestination = remainingMeters != null && remainingMeters <= ARRIVAL_PROMPT_METERS;
  const farFromDestination =
    straightToDestination != null && straightToDestination > FAR_FROM_DESTINATION_METERS;
  const remainingMinutes =
    routeState.remainingSeconds != null && !routeState.offRoute
      ? Math.max(1, Math.ceil(routeState.remainingSeconds / 60))
      : roadRoute
        ? roadRoute.durationMinutes
        : null;
  const distanceLabel = remainingMeters != null ? formatKm(remainingMeters / 1000) : null;
  const etaClock = formatEta((remainingMinutes ?? 0) * 60);

  /* Demo driver: moves along the real route, same pipeline as production GPS. */
  const previewStart = useMemo(() => (UI_PREVIEW_MODE ? getPreviewDriverStart() : null), [job?.id]);
  const navigating = navMode === 'turn_by_turn' && (step === 'en_route' || step === 'in_progress');
  const sim = useTripSimulation({
    enabled: simulate,
    jobId: job?.id,
    status: job?.status,
    start: previewStart,
    pickup: pickupPoint,
    path: roadRoute?.coordinates ?? null,
    pathDistanceMeters: roadRoute?.distanceMeters,
    moving: navigating && !nearDestination,
    hold: routeState.offRoute || routeState.rerouting,
  });

  /* GPS health for the weak-signal sheet (real devices only). */
  useEffect(() => {
    if (!reportingEnabled) return undefined;
    const timer = setInterval(() => setClock(Date.now()), 5_000);
    return () => clearInterval(timer);
  }, [reportingEnabled]);
  const gpsAge = driverLocation ? clock - driverLocation.updatedAt : null;
  const gpsWeak =
    reportingEnabled &&
    !simulate &&
    (driverLocation == null
      ? navigating
      : (gpsAge ?? 0) > GPS_STALE_MS ||
        (driverLocation.accuracy != null && driverLocation.accuracy > GPS_POOR_ACCURACY_METERS)) &&
    clock - weakDismissedAt > 60_000;

  /* Stage changes drive the navigation mode (so OTP success lands on drop nav). */
  const prevStep = useRef<Step>(step);
  useEffect(() => {
    const previous = prevStep.current;
    if (previous === step) return;
    prevStep.current = step;
    setPreviewScreen(null);
    setArrivedAtDrop(false);
    if (step === 'in_progress') {
      setNavMode('turn_by_turn');
      setFollowUser(true);
    } else if (step === 'verify_otp' || step === 'en_route') {
      setNavMode('overview');
    }
  }, [step]);

  useEffect(() => {
    setPreviewScreen(null);
  }, [jobStatus]);

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
          showAlert({ tone: 'error', title: 'Update failed', message });
        }
      } finally {
        setActing(false);
      }
    },
    [job, refetch, statusMutation, showAlert],
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
    showAlert({
      tone: 'info',
      title: 'Not at pickup yet?',
      message: 'You can go back to navigation. The customer code will stay hidden until you confirm arrival again.',
      primaryAction: { label: 'Go back', onPress: undoPickupArrival },
      secondaryAction: { label: 'Stay here', onPress: () => {} },
    });
  }, [acting, step, undoPickupArrival, showAlert]);

  const onTripBack = useCallback(() => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    if (qaMenuOpen) {
      setQaMenuOpen(false);
      return;
    }
    if (step === 'verify_otp') {
      confirmUndoPickupArrival();
      return;
    }
    if (navMode === 'turn_by_turn') {
      setNavMode('overview');
      return;
    }
    if (step === 'en_route' || step === 'in_progress') {
      showAlert({
        tone: 'info',
        title: 'Leave this trip screen?',
        message: 'The trip stays on this job. Open it again from Jobs and you continue from the same step.',
        primaryAction: { label: 'Stay', onPress: () => {} },
        secondaryAction: { label: 'Leave', onPress: () => navigation.goBack() },
      });
      return;
    }
    navigation.goBack();
  }, [confirmUndoPickupArrival, menuOpen, navMode, navigation, qaMenuOpen, showAlert, step]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onTripBack();
      return true;
    });
    return () => sub.remove();
  }, [onTripBack]);

  /** "Start navigation": the driver is now moving. First tap also accepts ASSIGNED jobs. */
  const startNavigation = useCallback(async () => {
    if (acting || !job) return;

    if (job.status === 'DRIVER_ASSIGNED' && !UI_PREVIEW_MODE) {
      const profileVerdict = assertDriverCanAcceptJobs(profile ?? undefined);
      if (!profileVerdict.ok) {
        showAlert({
          tone: 'warning',
          title: profileVerdict.title ?? 'Profile check failed',
          message: profileVerdict.message ?? 'You cannot accept jobs right now.',
        });
        return;
      }
      const gate = getDriverAcceptLocationGate({
        manualLocation,
        gpsLocation: driverLocation,
        pickup: pickupCoordsFromJob(job),
        mobileNumber: user?.mobileNumber,
        previewMode: UI_PREVIEW_MODE,
      });
      if (!gate.ok) {
        showAlert({
          tone: 'warning',
          title: gate.title,
          message: gate.message,
        });
        return;
      }
      setActing(true);
      try {
        await acceptMutation.mutateAsync({
          bookingId: job.id,
          bookingType: job.bookingType,
        });
        await refetch();
      } catch (error) {
        showAlert({
          tone: 'error',
          title: 'Accept failed',
          message: getApiErrorMessage(error, 'Could not accept this assignment'),
        });
        return;
      } finally {
        setActing(false);
      }
    } else if (job.status === 'DRIVER_ASSIGNED') {
      setActing(true);
      try {
        await runStatusUpdate('DRIVER_EN_ROUTE');
      } finally {
        setActing(false);
      }
    }

    setFollowUser(true);
    setNavMode('turn_by_turn');
  }, [
    acceptMutation,
    acting,
    driverLocation,
    job,
    manualLocation,
    profile,
    refetch,
    runStatusUpdate,
    showAlert,
    user?.mobileNumber,
  ]);

  const confirmFarAction = useCallback(
    (title: string, message: string, confirmLabel: string, onConfirm: () => void) => {
      if (!farFromDestination) {
        onConfirm();
        return;
      }
      showAlert({
        tone: 'warning',
        title,
        message,
        primaryAction: { label: confirmLabel, onPress: onConfirm },
        secondaryAction: { label: 'Not yet', onPress: () => {} },
      });
    },
    [farFromDestination, showAlert],
  );

  const arrivedAtPickup = useCallback(() => {
    if (acting) return;
    confirmFarAction(
      'Arrived at pickup?',
      `You are about ${formatKm((straightToDestination ?? 0) / 1000)} from the pickup point.`,
      'Mark arrived',
      () => void runStatusUpdate('DRIVER_ARRIVED'),
    );
  }, [acting, confirmFarAction, runStatusUpdate, straightToDestination]);

  const arrivedAtDropoff = useCallback(() => {
    confirmFarAction(
      'Arrived at drop?',
      `You are about ${formatKm((straightToDestination ?? 0) / 1000)} from the drop point.`,
      'Mark arrived',
      async () => {
        setActing(true);
        try {
          if (job) {
            await dropoffArrivalMutation.mutateAsync({
              bookingId: job.id,
              bookingType: job.bookingType,
            });
          }
          setArrivedAtDrop(true);
          setNavMode('overview');
        } catch (err) {
          showAlert({
            tone: 'error',
            title: 'Arrival notice',
            message: getApiErrorMessage(err, 'Failed to update drop arrival.'),
          });
        } finally {
          setActing(false);
        }
      },
    );
  }, [confirmFarAction, dropoffArrivalMutation, job, straightToDestination]);

  const verifyOtp = useCallback(() => {
    if (acting || !job || step !== 'verify_otp') return;
    const code = tripOtp.trim();
    if (code.length !== OTP_LENGTH || /\D/.test(code)) {
      setOtpError('Enter the 4-digit code shown in the customer app.');
      return;
    }
    Keyboard.dismiss();
    setOtpError('');
    void runStatusUpdate('IN_PROGRESS', code, true);
  }, [acting, job, runStatusUpdate, step, tripOtp]);

  const verifyAndCompleteJob = useCallback(async () => {
    if (acting || !job) return;
    if (!job.paymentConfirmedByCustomer && !customerPaymentConfirmed) {
      setCompletionOtpError('Wait until the customer confirms Cash, UPI, or in-app payment. Then enter the SMS code.');
      return;
    }
    const code = completionOtp.trim();
    if (code.length !== OTP_LENGTH || /\D/.test(code)) {
      setCompletionOtpError('Enter the 4-digit completion code provided by the customer.');
      return;
    }
    setActing(true);
    setCompletionOtpError('');
    try {
      const result = await completeBookingMutation.mutateAsync({
        bookingId: job.id,
        bookingType: job.bookingType,
        completionOtp: code,
      });
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
      await refetch();
    } catch (err) {
      const message = getApiErrorMessage(err, 'Invalid completion OTP. Please verify with customer.');
      setCompletionOtpError(message);
    } finally {
      setActing(false);
    }
  }, [acting, completeBookingMutation, completionOtp, customerPaymentConfirmed, job, refetch]);

  const completeJob = useCallback(() => {
    if (acting || !job || step !== 'in_progress') return;
    arrivedAtDropoff();
  }, [acting, arrivedAtDropoff, job, step]);

  const goHome = useCallback(() => {
    navigation.popToTop();
    navigation.getParent()?.navigate('PartnerHome' as never);
  }, [navigation]);

  const onDeclineAssignment = useCallback(() => {
    if (acting || !job) return;
    showAlert({
      tone: 'warning',
      title: 'Decline assignment?',
      message: 'This job will be returned to your vendor so another driver can be assigned.',
      primaryAction: {
        label: 'Decline',
        onPress: async () => {
          setActing(true);
          try {
            await rejectMutation.mutateAsync({
              bookingId: job.id,
              bookingType: job.bookingType,
            });
            showAlert({
              tone: 'success',
              title: 'Assignment declined',
              message: 'The vendor has been notified.',
              primaryAction: { label: 'OK', onPress: goHome },
            });
          } catch (error) {
            showAlert({
              tone: 'error',
              title: 'Could not decline',
              message: getApiErrorMessage(error, 'Failed to decline assignment.'),
            });
          } finally {
            setActing(false);
          }
        },
      },
      secondaryAction: { label: 'Keep Job', onPress: () => {} },
    });
  }, [acting, goHome, job, rejectMutation, showAlert]);

  const recenterMap = useCallback(() => {
    setFollowUser(true);
    setRecenterTrigger(current => current + 1);
  }, []);

  /* ----------------------------------------------------------- QA switcher */

  const qaJump = useCallback(
    async (screen: number | null) => {
      setQaMenuOpen(false);
      if (screen == null) {
        setPreviewScreen(null);
        return;
      }
      if (screen === 11) {
        setNavMode('turn_by_turn');
        setPreviewScreen(null);
        sim.deviate();
        return;
      }
      if (screen === 12) {
        setPreviewScreen(12);
        return;
      }
      // With mock mutations on, jump by moving the real mock job so every screen
      // is driven by the same state it would have in production.
      const statusFor: Record<number, string> = {
        4: 'DRIVER_EN_ROUTE',
        5: 'DRIVER_EN_ROUTE',
        6: 'DRIVER_ARRIVED',
        8: 'IN_PROGRESS',
        9: 'IN_PROGRESS',
      };
      if (UI_PREVIEW_MUTATIONS_ENABLED && job && screen === 10) {
        void runStatusUpdate('COMPLETED');
        return;
      }
      if (UI_PREVIEW_MUTATIONS_ENABLED && job && statusFor[screen]) {
        setCompletedJob(null);
        updateMockActiveJobStatus(statusFor[screen]);
        setNavMode(screen === 5 || screen === 8 ? 'turn_by_turn' : 'overview');
        setFollowUser(true);
        await refetch();
        return;
      }
      setPreviewScreen(screen);
    },
    [job, refetch, runStatusUpdate, sim],
  );

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
        onPress={onTripBack}
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
          {job?.status === 'DRIVER_ASSIGNED' ? (
            <>
              <View style={{ height: 1, backgroundColor: C.hairline, marginHorizontal: px(8) }} />
              <Pressable
                onPress={() => {
                  setMenuOpen(false);
                  onDeclineAssignment();
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: px(10),
                  paddingHorizontal: px(10),
                  borderRadius: px(8),
                  backgroundColor: pressed ? C.light : C.card,
                })}>
                <TriangleAlert size={px(15)} color={C.red} strokeWidth={2.2} />
                <PartnerText style={[T.cardTitle, { fontSize: px(13), color: C.red, marginLeft: px(8) }]}>
                  Decline assignment
                </PartnerText>
              </Pressable>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
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
        {partnerDialog}
      </View>
    );
  }

  const effectiveScreen =
    previewScreen ??
    (step === 'completed'
      ? 10
      : step === 'verify_otp'
        ? 6
        : step === 'en_route'
          ? navMode === 'turn_by_turn'
            ? 5
            : 4
          : navMode === 'turn_by_turn'
            ? 8
            : 9);
  const isNavigating = effectiveScreen === 5 || effectiveScreen === 8;
  const maneuver = routeState.maneuver;
  const startedAt = historyEntry(job, 'IN_PROGRESS')?.timestamp;
  const completedAtIso = historyEntry(job, 'COMPLETED')?.timestamp;
  const demoOtpHint =
    UI_PREVIEW_MUTATIONS_ENABLED && !isUiTestPermissiveMode()
      ? `Demo code: ${PREVIEW_TRIP_OTP}`
      : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg, position: 'relative' }}>
      {!isNavigating && effectiveScreen !== 10 ? header : null}

      <View style={{ flex: 1, position: 'relative' }} accessibilityLabel={toDrop ? 'To drop' : 'To pickup'}>
        <LiveTripMap
          style={StyleSheet.absoluteFill}
          borderRadius={0}
          showsUserLocation={!driverFix && !simulate}
          driverLocation={driverFix}
          pickup={pickupPoint}
          dropoff={dropPoint}
          activeDestination={destinationPoint}
          routeApiEnabled
          routePathOverride={routeState.route ? routeState.remainingPath : []}
          navigationMode={isNavigating}
          navigationCamera={{ follow: isNavigating && followUser, headingUp: compassHeadingUp }}
          vehicleHeading={vehicleHeading}
          vehicleType={job.bookingType === 'driver' ? 'car' : 'tow_truck'}
          isOffRoute={routeState.offRoute && isNavigating}
          bottomCoverRatio={isNavigating ? 0 : effectiveScreen === 6 ? 0.5 : 0.42}
          onUserPan={() => setFollowUser(false)}
          recenterTrigger={recenterTrigger}
        />

        {/* 4 — Route overview to pickup */}
        {effectiveScreen === 4 ? (
          <RouteOverviewCards
            title={legTitle(tripLeg)}
            destinationAddress={destinationAddress || (toDrop ? 'Drop location' : 'Pickup location')}
            destinationCaption={toDrop ? 'Drop location' : 'Pickup location'}
            distanceLabel={distanceLabel}
            durationMinutes={remainingMinutes}
            steps={roadRoute?.steps ?? []}
            loading={routeState.loading || routeState.rerouting}
            approximate={roadRoute?.approximate}
            waitingForGps={!driverFix}
            onStartNavigation={startNavigation}
            onRecenter={recenterMap}
            onToggleCompass={() => setCompassHeadingUp(prev => !prev)}
            compassHeadingUp={compassHeadingUp}
            insetsTop={px(8)}
            insetsBottom={insets.bottom}
          />
        ) : null}

        {/* 5 / 8 — Turn-by-turn (to pickup / to drop) */}
        {isNavigating ? (
          <>
            <NavTurnBanner
              currentStep={maneuver?.step ?? null}
              distanceMeters={maneuver?.distanceMeters}
              nextStep={maneuver?.next ?? null}
              compassHeadingUp={compassHeadingUp}
              onToggleCompass={() => setCompassHeadingUp(prev => !prev)}
              onRecenter={recenterMap}
              showRecenter={!followUser}
              insetsTop={insets.top}
            />
            <NavBottomBar
              etaMinutes={remainingMinutes ?? 0}
              distanceLabel={distanceLabel ?? '—'}
              etaTimeFormatted={remainingMinutes != null ? etaClock : '—'}
              arriveEmphasis={nearDestination}
              onExitNav={() => setNavMode('overview')}
              onArriveAction={effectiveScreen === 5 ? arrivedAtPickup : arrivedAtDropoff}
              arriveActionLabel={effectiveScreen === 5 ? 'Arrive at Pickup' : 'Arrive at Drop Location'}
              insetsBottom={insets.bottom}
            />
          </>
        ) : null}

        {/* 6 — Pickup reached + the single OTP entry */}
        {effectiveScreen === 6 ? (
          <ArrivedPickupCard
            pickupAddress={pickup || 'Pickup location'}
            customerName={job.customer?.name || 'Customer'}
            customerMobile={job.customer?.mobileNumber}
            tripOtp={tripOtp}
            setTripOtp={value => {
              setTripOtp(value);
              if (otpError) setOtpError('');
            }}
            otpError={otpError}
            onVerify={verifyOtp}
            onUndoArrival={confirmUndoPickupArrival}
            acting={acting}
            previewHint={demoOtpHint}
            insetsTop={px(8)}
            insetsBottom={insets.bottom}
          />
        ) : null}

        {/* 9 — On the way to / at the drop */}
        {effectiveScreen === 9 ? (
          <TripInProgressSheet
            bookingNumber={job.bookingNumber}
            dropAddress={dropoff || 'Drop location'}
            distanceLabel={distanceLabel}
            durationMinutes={remainingMinutes}
            atDrop={Boolean(job.arrivedAtDropoffAt) || arrivedAtDrop}
            startedAt={startedAt}
            onResumeNavigation={() => {
              if (!job.arrivedAtDropoffAt) setArrivedAtDrop(false);
              setFollowUser(true);
              setNavMode('turn_by_turn');
            }}
            customerMobile={job.customer?.mobileNumber}
            onCompletePress={completeJob}
            acting={acting}
            insetsTop={px(8)}
            insetsBottom={insets.bottom}
            customerPaymentMode={job.paymentCollectionMode || customerPaymentMode}
            customerPaymentConfirmed={Boolean(job.paymentConfirmedByCustomer || customerPaymentConfirmed)}
            fareAmount={job.finalFare ?? job.estimatedFare}
            completionOtp={completionOtp}
            setCompletionOtp={val => {
              setCompletionOtp(val);
              if (completionOtpError) setCompletionOtpError('');
            }}
            otpError={completionOtpError}
            onVerifyAndComplete={verifyAndCompleteJob}
          />
        ) : null}

        {/* 10 — Job completed summary (never skipped) */}
        <JobCompletedModal
          visible={effectiveScreen === 10}
          bookingNumber={job.bookingNumber}
          totalEarnings={typeof job.finalFare === 'number' ? job.finalFare : (job.estimatedFare ?? 0)}
          pickupAddress={pickup || 'Pickup'}
          dropAddress={dropoff || 'Drop'}
          pickupTimeFormatted={clockLabel(startedAt)}
          dropTimeFormatted={clockLabel(completedAtIso)}
          distanceKm={typeof job.distanceKm === 'number' ? job.distanceKm : null}
          durationMinutes={minutesBetween(startedAt, completedAtIso)}
          onBackToHome={goHome}
          onViewJobDetails={() => {
            showAlert({
              tone: 'info',
              title: 'Job Details',
              message: `Booking #${job.bookingNumber}\nStatus: COMPLETED`,
            });
          }}
          insetsTop={insets.top}
          insetsBottom={insets.bottom}
        />

        {/* 11 — Off route: driven by the real snap-to-route distance */}
        <OffRouteBanner
          visible={routeState.offRoute && isNavigating}
          rerouting={routeState.rerouting}
          insetsTop={insets.top}
        />

        {/* 12 — Weak GPS */}
        <WeakGpsAlert
          visible={gpsWeak || previewScreen === 12}
          onRetryGps={() => {
            setClock(Date.now());
            retryDriverLocationReport();
          }}
          onDismissSheet={() => {
            setWeakDismissedAt(Date.now());
            setPreviewScreen(null);
          }}
          insetsTop={insets.top}
          insetsBottom={insets.bottom}
        />
      </View>
      {partnerDialog}

      {/* UI QA switcher — only when preview + QA navigator are explicitly enabled in env. */}
      {UI_PREVIEW_MODE && UI_QA_NAVIGATOR_ENABLED ? (
        <View style={{ position: 'absolute', right: 6, top: screenHeight * 0.4, zIndex: 100 }}>
          <Pressable
            onPress={() => setQaMenuOpen(prev => !prev)}
            accessibilityRole="button"
            accessibilityLabel="Toggle UI QA screen switcher"
            style={({ pressed }) => ({
              backgroundColor: '#FEA701',
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: 12,
              opacity: pressed ? 0.8 : 0.92,
              elevation: 5,
            })}>
            <PartnerText style={{ fontSize: 10.5, fontWeight: '800', color: '#0F172A' }}>
              QA{previewScreen ? ` ${previewScreen}` : ''}
            </PartnerText>
          </Pressable>
        </View>
      ) : null}

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
            <PartnerText style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
              Navigation flow QA
            </PartnerText>
            <PartnerText style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
              {simulate
                ? `Simulated driver from ${previewStart?.name ?? 'Bhopal'} · speed ×${sim.speedMultiplier}`
                : 'Live GPS'}
            </PartnerText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { label: '4 · Route overview', screen: 4 },
                { label: '5 · Nav to pickup', screen: 5 },
                { label: '6 · Arrived + OTP', screen: 6 },
                { label: '8 · Nav to drop', screen: 8 },
                { label: '9 · At drop', screen: 9 },
                { label: '10 · Job completed', screen: 10 },
                { label: '11 · Wrong turn (off route)', screen: 11 },
                { label: '12 · Weak GPS', screen: 12 },
                { label: 'Live flow', screen: null },
              ].map(item => (
                <Pressable
                  key={item.label}
                  onPress={() => void qaJump(item.screen)}
                  style={{
                    backgroundColor: previewScreen === item.screen ? '#FEA701' : '#F1F5F9',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                  }}>
                  <PartnerText style={{ fontSize: 12.5, fontWeight: '700', color: '#334155' }}>
                    {item.label}
                  </PartnerText>
                </Pressable>
              ))}
            </View>
            {simulate ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {[1, 3, 8].map(speed => (
                  <Pressable
                    key={speed}
                    onPress={() => sim.setSpeedMultiplier(speed)}
                    style={{
                      backgroundColor: sim.speedMultiplier === speed ? '#0F172A' : '#F1F5F9',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 12,
                    }}>
                    <PartnerText
                      style={{
                        fontSize: 12.5,
                        fontWeight: '700',
                        color: sim.speedMultiplier === speed ? '#FFFFFF' : '#334155',
                      }}>
                      Speed ×{speed}
                    </PartnerText>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => {
                    setQaMenuOpen(false);
                    sim.skipToArrival();
                  }}
                  style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}>
                  <PartnerText style={{ fontSize: 12.5, fontWeight: '700', color: '#334155' }}>
                    Skip to arrival
                  </PartnerText>
                </Pressable>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {menuModal}
      {partnerDialog}
    </View>
  );
}
