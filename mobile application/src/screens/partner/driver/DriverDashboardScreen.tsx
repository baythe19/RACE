/**
 * RACE Partner — Driver Dashboard (board 01).
 *
 * [SCREEN] Driver dashboard — "Good evening, Om / Ready for your next job?"
 * [GOAL] Tell the driver in one glance: am I online, what did I earn, and is there
 *        a request waiting for me — then get them into that job in one tap.
 * [PRIMARY_ACTION] Toggle availability (online/offline) + open the newest request.
 * [KEEP] Availability toggle, earnings summary, new requests, recent jobs,
 *        verification indicator, tab bar.
 * [REMOVE] Duplicated "jobs today / active drivers" stat cards, the line chart
 *          legend, vendor-only quick-action rows.
 * [MOVE] Nothing — every figure on this screen is already driver-scoped.
 * [BEHAVIOR] Availability is read on mount and is never mutated without a user tap.
 *            Accept/withdraw live on the Jobs screen; this screen only opens it.
 * [STATES] loading · offline · no-requests (empty section) · verification pending
 * [DATA] Real API only: driver jobs, job offers, active job, profile availability.
 *        No invented fares/distances — every number comes from the booking or is
 *        omitted when the API does not provide it.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Car,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  MapPin,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import AppScreenLayout from '../../../components/ui/AppScreenLayout';
import PartnerHeaderLogo from '../../../components/partner/PartnerHeaderLogo';
import { images } from '../../../assets';
import { useScreenPx } from '../../../hooks/useScreenPx';
import { useAppSelector } from '../../../redux/hooks';
import {
  openLocationSettings,
  retryDriverLocationReport,
  useDriverLocationReporting,
} from '../../../hooks/useDriverLocationReporting';
import {
  locationHealthCopy,
  useDriverPresenceStore,
} from '../../../store/driverPresenceStore';
import {
  useDriverActiveJobQuery,
  useDriverAvailabilityMutation,
  useDriverJobOffersQuery,
  useDriverJobsQuery,
  useDriverProfileQuery,
} from '../../../services/driver/useDriverQueries';
import type { DriverJobBooking } from '../../../services/driver/driverApi';
import type { PartnerTabParamList } from '../../../types/partnerNavigation';
import { formatReadableAddress } from '../../../utils/readableAddress';
import {
  isActiveBookingStatus,
  isCancelledBookingStatus,
  isCompletedBookingStatus,
  jobEarnings,
} from '../../../utils/driverBookingStatus';
import { buildDriverVerification } from '../../../utils/driverVerification';
import {
  driverColors as C,
  driverMetrics as M,
  driverRadius as R,
  driverShadow,
  driverType as T,
} from '../../../theme/driverUi';

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const TODAY_BUCKETS: Array<{ label: string; from: number; to: number }> = [
  { label: '12a', from: 0, to: 3 },
  { label: '3a', from: 3, to: 6 },
  { label: '6a', from: 6, to: 9 },
  { label: '9a', from: 9, to: 12 },
  { label: '12p', from: 12, to: 15 },
  { label: '3p', from: 15, to: 18 },
  { label: '6p', from: 18, to: 21 },
  { label: '9p', from: 21, to: 24 },
];

type Period = 'today' | 'week' | 'month';
type Bar = { label: string; value: number };

const PERIOD_OPTIONS: Array<{ id: Period; label: string; chartLabel: string }> = [
  { id: 'today', label: 'Today', chartLabel: 'Today' },
  { id: 'week', label: 'This week', chartLabel: 'This week' },
  { id: 'month', label: 'This month', chartLabel: 'This month' },
];

/* ------------------------------------------------------------------ helpers */

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

/** Monday-based start of the current week. */
function startOfWeek(date = new Date()) {
  const next = startOfDay(date);
  const mondayIndex = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - mondayIndex);
  return next;
}

function startOfMonth(date = new Date()) {
  const next = startOfDay(date);
  next.setDate(1);
  return next;
}

function firstName(fullName?: string | null) {
  const name = (fullName ?? '').trim();
  if (!name) return 'Driver';
  return name.split(/\s+/)[0] ?? 'Driver';
}

function initials(fullName?: string | null) {
  const name = (fullName ?? '').trim();
  if (!name) return 'D';
  return name.charAt(0).toUpperCase();
}

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatInr(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatWhen(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(+date)) return '';
  const today = startOfDay(new Date());
  const day = startOfDay(date);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const diffDays = Math.round((+today - +day) / 86_400_000);
  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Yesterday, ${time}`;
  return date.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatShortWhen(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(+date)) return '';
  return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${date.toLocaleTimeString(
    [],
    { hour: 'numeric', minute: '2-digit' },
  )}`;
}

/** `formatReadableAddress` renders an em dash for missing input — treat that as absent. */
function addressOf(input?: string | null) {
  const formatted = formatReadableAddress(input);
  return formatted === '—' ? '' : formatted;
}

/** Only backend-known values are used — unknown fields are simply omitted. */
function serviceTitle(job: DriverJobBooking) {
  const label = (job.serviceLabel ?? '').trim();
  if (label) return label;
  return job.bookingType === 'towing' ? 'Towing request' : 'Driver request';
}

function statusPill(status: string) {
  if (isCompletedBookingStatus(status)) {
    return { label: 'Completed', bg: C.greenPill, fg: C.green };
  }
  if (isCancelledBookingStatus(status)) {
    return { label: 'Cancelled', bg: C.redPill, fg: C.red };
  }
  if (isActiveBookingStatus(status)) {
    return { label: 'In Progress', bg: C.bluePill, fg: C.blue };
  }
  return { label: 'New', bg: C.bluePill, fg: C.blue };
}

function sumFares(list: DriverJobBooking[]) {
  return list.reduce((total, job) => total + (jobEarnings(job) ?? 0), 0);
}

function buildBars(jobs: DriverJobBooking[], period: Period): Bar[] {
  const completed = jobs.filter(
    job => isCompletedBookingStatus(job.status) && jobEarnings(job) != null,
  );
  const between = (from: Date, to: Date) =>
    sumFares(
      completed.filter(job => {
        const at = new Date(job.createdAt);
        return at >= from && at < to;
      }),
    );

  if (period === 'today') {
    const dayStart = startOfDay(new Date());
    return TODAY_BUCKETS.map(bucket => ({
      label: bucket.label,
      value: sumFares(
        completed.filter(job => {
          const at = new Date(job.createdAt);
          return at >= dayStart && at.getHours() >= bucket.from && at.getHours() < bucket.to;
        }),
      ),
    }));
  }

  if (period === 'month') {
    const monthStart = startOfMonth();
    return Array.from({ length: 5 }, (_, index) => {
      const from = new Date(monthStart);
      from.setDate(1 + index * 7);
      const to = new Date(monthStart);
      to.setDate(1 + (index + 1) * 7);
      return { label: `W${index + 1}`, value: between(from, to) };
    });
  }

  const weekStart = startOfWeek();
  return WEEK_LABELS.map((label, index) => {
    const from = new Date(weekStart);
    from.setDate(from.getDate() + index);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    return { label, value: between(from, to) };
  });
}

/* --------------------------------------------------------------- sub-views */

function DriverToggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  const px = useScreenPx();
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [progress, value]);

  const trackWidth = px(59);
  const trackHeight = px(24);
  const knob = px(22);
  const travel = trackWidth - knob - px(2);

  return (
    <Pressable
      onPress={onChange}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
      accessibilityLabel="Availability"
      style={{
        width: trackWidth,
        height: trackHeight,
        borderRadius: trackHeight / 2,
        backgroundColor: value ? C.green : '#D8DAD3',
        paddingHorizontal: px(1),
        justifyContent: 'center',
      }}>
      <Animated.View
        style={{
          width: knob,
          height: knob,
          borderRadius: knob / 2,
          backgroundColor: C.white,
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, travel],
              }),
            },
          ],
          ...driverShadow,
        }}
      />
    </Pressable>
  );
}

function EarningsBars({
  bars,
  px,
}: {
  bars: Bar[];
  px: (value: number) => number;
}) {
  const max = Math.max(...bars.map(bar => bar.value), 1);
  const maxHeight = px(35);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: maxHeight, gap: px(1) }}>
        {bars.map(bar => (
          <View key={bar.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            <View
              style={{
                width: px(8),
                height: Math.max(px(3), Math.round((bar.value / max) * maxHeight)),
                borderRadius: px(3),
                backgroundColor: C.chartBar,
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ height: 1, backgroundColor: C.hairline, marginTop: px(4) }} />
      <View style={{ flexDirection: 'row', marginTop: px(5) }}>
        {bars.map(bar => (
          <Text
            key={bar.label}
            numberOfLines={1}
            style={[
              T.chartLabel,
              {
                flex: 1,
                textAlign: 'center',
                fontSize: px(10),
                lineHeight: px(13),
                color: C.greyFaint,
              },
            ]}>
            {bar.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function PeriodSheet({
  visible,
  value,
  onSelect,
  onClose,
  px,
}: {
  visible: boolean;
  value: Period;
  onSelect: (period: Period) => void;
  onClose: () => void;
  px: (value: number) => number;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable
          style={[
            styles.sheetCard,
            { borderRadius: px(20), padding: px(10), marginHorizontal: px(15) },
          ]}
          onPress={() => undefined}>
          {PERIOD_OPTIONS.map(option => {
            const selected = option.id === value;
            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  onSelect(option.id);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: px(14),
                  paddingHorizontal: px(8),
                }}>
                <Text
                  style={[
                    T.cardTitle,
                    { fontSize: px(15), lineHeight: px(20), color: selected ? C.ink : C.grey },
                  ]}>
                  {option.label}
                </Text>
                {selected ? <Check size={px(18)} color={C.amber} strokeWidth={3} /> : null}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Pickup → drop route spine used inside a request card. */
function RouteRow({
  address,
  tone,
  last,
  px,
  dotSize,
}: {
  address: string;
  tone: 'start' | 'end';
  last?: boolean;
  px: (value: number) => number;
  dotSize: number;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      <View style={{ width: px(M.jobTile), alignItems: 'center' }}>
        <View
          style={{
            width: px(dotSize),
            height: px(dotSize),
            borderRadius: px(dotSize / 2),
            backgroundColor: tone === 'start' ? C.blue : C.amber,
          }}
        />
        {/* Dashed spine drawn as discrete dashes — per-side dashed borders are
            unreliable on Android. */}
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
      <Text
        numberOfLines={1}
        style={[
          T.body,
          { flex: 1, marginLeft: px(21), fontSize: px(13.5), color: C.inkSoft },
        ]}>
        {address}
      </Text>
    </View>
  );
}

function RequestCard({
  offer,
  onOpen,
  px,
}: {
  offer: DriverJobBooking;
  onOpen: () => void;
  px: (value: number) => number;
}) {
  const pickup = addressOf(offer.pickup?.address || offer.pickup?.label);
  const drop = addressOf(offer.dropoff?.address || offer.dropoff?.label);
  const showRoute = Boolean(pickup || drop);

  return (
    <View
      style={{
        marginTop: px(6),
        backgroundColor: C.card,
        borderRadius: px(R.innerCard),
        borderWidth: 1,
        borderColor: C.amberBorder,
        padding: px(8),
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: px(M.jobTile),
            height: px(M.jobTile),
            borderRadius: px(R.tileSm),
            backgroundColor: C.amberTileSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {offer.bookingType === 'towing' ? (
            <Image
              source={images.icons.towing}
              style={{ width: px(22), height: px(18) }}
              resizeMode="contain"
            />
          ) : (
            <Car size={px(22)} color={C.ink} strokeWidth={2} />
          )}
        </View>

        <View style={{ flex: 1, marginLeft: px(14) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text numberOfLines={1} style={[T.jobTitle, { flex: 1, fontSize: px(15), color: C.ink }]}>
              {serviceTitle(offer)}
            </Text>
            <View
              style={{
                backgroundColor: C.bluePill,
                borderRadius: px(R.pill),
                paddingHorizontal: px(10),
                paddingVertical: px(4),
                marginLeft: px(8),
              }}>
              <Text style={[T.pill, { fontSize: px(11), lineHeight: px(14), color: C.blue }]}>
                NEW
              </Text>
            </View>
          </View>
          {offer.distanceKm != null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: px(4) }}>
              <MapPin size={px(13)} color={C.green} strokeWidth={2.6} />
              <Text
                style={[
                  T.distance,
                  { marginLeft: px(4), fontSize: px(14), lineHeight: px(18), color: C.green },
                ]}>
                {offer.distanceKm} km away
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {showRoute ? (
        <View style={{ marginTop: px(6) }}>
          {pickup ? (
            <RouteRow address={pickup} tone="start" px={px} dotSize={11} />
          ) : null}
          {drop ? <RouteRow address={drop} tone="end" last px={px} dotSize={11} /> : null}
        </View>
      ) : null}

      {offer.createdAt ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: px(4),
            paddingLeft: px(22),
          }}>
          <CalendarDays size={px(15)} color={C.greySoft} strokeWidth={2.2} />
          <Text
            style={[
              T.meta,
              { marginLeft: px(9), fontSize: px(13), lineHeight: px(18), color: C.greySoft },
            ]}>
            {formatWhen(offer.createdAt)}
          </Text>
        </View>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginTop: px(6),
        }}>
        <View style={{ flex: 1 }}>
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
              { fontSize: px(24), lineHeight: px(28), color: C.ink, marginTop: px(1) },
            ]}>
            {offer.estimatedFare != null ? formatInr(offer.estimatedFare) : '—'}
          </Text>
        </View>

        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel="View request details"
          style={({ pressed }) => ({
            height: px(40),
            paddingHorizontal: px(20),
            borderRadius: px(R.button),
            backgroundColor: C.amber,
            flexDirection: 'row',
            alignItems: 'center',
            opacity: pressed ? 0.9 : 1,
          })}>
          <Text style={[T.button, { fontSize: px(14), lineHeight: px(18), color: C.ink }]}>
            View details
          </Text>
          <ArrowRight size={px(16)} color={C.ink} strokeWidth={2.6} style={{ marginLeft: px(8) }} />
        </Pressable>
      </View>
    </View>
  );
}

function RecentJobRow({
  job,
  onOpen,
  px,
}: {
  job: DriverJobBooking;
  onOpen: () => void;
  px: (value: number) => number;
}) {
  const pickup = addressOf(job.pickup?.address || job.pickup?.label);
  const drop = addressOf(job.dropoff?.address || job.dropoff?.label);
  const pill = statusPill(job.status);

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Job ${job.bookingNumber}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: C.hairline,
        borderRadius: px(R.tileSm),
        padding: px(7),
        backgroundColor: C.card,
        opacity: pressed ? 0.94 : 1,
      })}>
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
            style={{ width: px(22), height: px(18) }}
            resizeMode="contain"
          />
        ) : (
          <Car size={px(22)} color={C.ink} strokeWidth={2} />
        )}
      </View>

      <View style={{ flex: 1, marginLeft: px(12) }}>
        <Text
          numberOfLines={1}
          style={[T.jobTitle, { fontSize: px(14.5), lineHeight: px(18), color: C.ink }]}>
          #{job.bookingNumber}
        </Text>
        {pickup || drop ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: px(2) }}>
            {pickup ? (
              <Text
                numberOfLines={1}
                style={[T.meta, { flexShrink: 1, fontSize: px(12), lineHeight: px(15), color: C.greySoft }]}>
                {pickup}
              </Text>
            ) : null}
            {pickup && drop ? (
              <Text style={[T.meta, { fontSize: px(12), lineHeight: px(15), marginHorizontal: px(5), color: C.greySoft }]}>→</Text>
            ) : null}
            {drop ? (
              <Text
                numberOfLines={1}
                style={[T.meta, { flexShrink: 1, fontSize: px(12), lineHeight: px(15), color: C.greySoft }]}>
                {drop}
              </Text>
            ) : null}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: px(1) }}>
          <Text style={[T.meta, { fontSize: px(11.5), lineHeight: px(15), color: C.greySoft }]}>
            {formatShortWhen(job.createdAt)}
          </Text>
          {jobEarnings(job) != null ? (
            <>
              <Text
                style={[
                  T.meta,
                  { fontSize: px(11.5), lineHeight: px(15), marginHorizontal: px(5), color: C.greySoft },
                ]}>
                •
              </Text>
              <Text style={[T.meta, { fontSize: px(11.5), lineHeight: px(15), color: C.greySoft }]}>
                {formatInr(jobEarnings(job) as number)}
              </Text>
            </>
          ) : null}
        </View>
      </View>

      <View
        style={{
          backgroundColor: pill.bg,
          borderRadius: px(R.pill),
          height: px(M.rowPillHeight),
          justifyContent: 'center',
          paddingHorizontal: px(8),
          marginLeft: px(6),
        }}>
        <Text style={[T.pill, { fontSize: px(10.5), lineHeight: px(14), color: pill.fg }]}>
          {pill.label}
        </Text>
      </View>
      <ChevronRight
        size={px(14)}
        color={C.greySoft}
        strokeWidth={2.4}
        style={{ marginLeft: px(6) }}
      />
    </Pressable>
  );
}

/* -------------------------------------------------------------------- screen */

export default function DriverDashboardScreen() {
  const px = useScreenPx();
  const navigation = useNavigation<BottomTabNavigationProp<PartnerTabParamList>>();
  const user = useAppSelector(state => state.auth.user);

  /* Approval state first — everything else is gated on it. The backend rejects
     jobs, offers, availability and location for an unapproved driver, so asking
     for them would only produce failures. */
  const {
    data: profile,
    isLoading: loadingProfile,
    refetch: refetchProfile,
  } = useDriverProfileQuery(true);
  const verification = useMemo(() => buildDriverVerification(profile), [profile]);
  const isApproved = verification.isApproved;

  const {
    data: jobs = [],
    isError: jobsError,
    refetch: refetchJobs,
  } = useDriverJobsQuery(isApproved);
  const {
    data: offers = [],
    isError: offersError,
    refetch: refetchOffers,
  } = useDriverJobOffersQuery(isApproved);
  const {
    data: activeJob,
    isError: activeError,
    refetch: refetchActive,
  } = useDriverActiveJobQuery(isApproved);
  const availabilityMutation = useDriverAvailabilityMutation();

  const [isOnline, setIsOnline] = useState(false);
  const [period, setPeriod] = useState<Period>('week');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const locationHealth = useDriverPresenceStore(state => state.locationHealth);

  /* Availability is read from the backend — never mutated on mount. */
  useEffect(() => {
    if (typeof profile?.isAvailable !== 'boolean') return;
    // A pending driver may carry a stale `isAvailable` value from registration,
    // but approval is the backend gate for presence and job visibility.
    const available = isApproved && profile.isAvailable;
    setIsOnline(available);
    // Share availability with the request alert + location reporter.
    useDriverPresenceStore.getState().setOnline(available);
  }, [isApproved, profile?.isAvailable]);

  useDriverLocationReporting(isApproved && isOnline);

  const todayCompleted = useMemo(() => {
    const dayStart = +startOfDay(new Date());
    return jobs.filter(
      job =>
        isCompletedBookingStatus(job.status) &&
        jobEarnings(job) != null &&
        +startOfDay(new Date(job.createdAt)) === dayStart,
    );
  }, [jobs]);
  const earningsToday = useMemo(() => sumFares(todayCompleted), [todayCompleted]);
  const bars = useMemo(() => buildBars(jobs, period), [jobs, period]);

  const recentJobs = useMemo(
    () =>
      [...jobs]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 2),
    [jobs],
  );

  const pendingRequests = offers.length;
  const activeJobSubtitle = activeJob
    ? `#${activeJob.bookingNumber} · ${addressOf(
        activeJob.pickup?.address || activeJob.pickup?.label,
      )}`.replace(/ · —$/, '')
    : undefined;

  const openJobs = useCallback(() => {
    navigation.navigate('PartnerJobs');
  }, [navigation]);

  const openNotifications = useCallback(() => {
    navigation.navigate(
      'PartnerAccount',
      {
        screen: 'PartnerNotifications',
      } as never,
    );
  }, [navigation]);

  const openActiveJob = useCallback(() => {
    if (!activeJob) {
      openJobs();
      return;
    }
    navigation.navigate(
      'PartnerJobs',
      {
        screen: 'PartnerActiveJob',
        params: { bookingId: activeJob.id, bookingType: activeJob.bookingType },
      } as never,
    );
  }, [activeJob, navigation, openJobs]);

  const toggleAvailability = useCallback(async () => {
    const next = !isOnline;
    try {
      const result = await availabilityMutation.mutateAsync(next);
      setIsOnline(result.isAvailable);
      useDriverPresenceStore.getState().setOnline(result.isAvailable);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { message?: string } } }).response?.data?.message,
            )
          : '';
      Alert.alert('Availability', message || 'Could not update availability. Please try again.');
    }
  }, [availabilityMutation, isOnline]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchProfile(), refetchJobs(), refetchOffers(), refetchActive()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchActive, refetchJobs, refetchOffers, refetchProfile]);

  const name = firstName(user?.fullName);
  const availableBars = bars.some(bar => bar.value > 0);
  const dashboardVerificationTitle = isApproved ? 'Verification approved' : verification.title;
  /** Location problem copy — null while location is healthy or not yet checked. */
  const locationIssue = locationHealthCopy(locationHealth);
  const dataIssue = jobsError || offersError || activeError;

  return (
    <AppScreenLayout
      backgroundColor={C.pageBg}
      horizontalPadding={px(M.pagePadding)}
      contentStyle={{ paddingBottom: px(M.tabBarHeight + 20) }}
      refreshing={refreshing}
      onRefresh={() => void onRefresh()}>
      {/* brand row ------------------------------------------------------- */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: px(4),
          minHeight: px(38),
        }}>
        <PartnerHeaderLogo width={px(70)} cropZoom={1.4} showPartnerText />

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            onPress={openNotifications}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={
              pendingRequests > 0
                ? `Notifications, ${pendingRequests} new requests`
                : 'Notifications'
            }
            style={{ width: px(38), height: px(38), alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={px(22)} color={C.ink} strokeWidth={2} />
            {pendingRequests > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: px(4),
                  right: px(5),
                  width: px(9),
                  height: px(9),
                  borderRadius: px(5),
                  backgroundColor: C.red,
                  borderWidth: px(2),
                  borderColor: C.pageBg,
                }}
              />
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('PartnerAccount')}
            accessibilityRole="button"
            accessibilityLabel="Partner account"
            style={{ flexDirection: 'row', alignItems: 'center', marginLeft: px(6) }}>
            <View>
              <View
                style={{
                  width: px(30),
                  height: px(30),
                  borderRadius: px(15),
                  backgroundColor: C.amberTile,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text
                  style={{
                    fontSize: px(14),
                    lineHeight: px(18),
                    fontWeight: '700',
                    color: C.ink,
                  }}>
                  {initials(user?.fullName)}
                </Text>
              </View>
              <View
                style={{
                  position: 'absolute',
                  right: px(-1),
                  bottom: px(-1),
                  width: px(11),
                  height: px(11),
                  borderRadius: px(6),
                  backgroundColor: isOnline ? C.green : '#C4C6CD',
                  borderWidth: px(2),
                  borderColor: C.pageBg,
                }}
              />
            </View>
            <View style={{ marginLeft: px(9), maxWidth: px(110) }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: px(15),
                  lineHeight: px(19),
                  fontWeight: '700',
                  color: C.ink,
                }}>
                {user?.fullName ?? 'RACE Partner'}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  T.small,
                  { fontSize: px(12.5), lineHeight: px(16), color: C.greySoft },
                ]}>
                {user?.role === 'vendor' ? 'Vendor' : 'Driver'}
              </Text>
            </View>
            <ChevronDown
              size={px(16)}
              color={C.grey}
              strokeWidth={2.4}
              style={{ marginLeft: px(6) }}
            />
          </Pressable>
        </View>
      </View>

      {/* greeting -------------------------------------------------------- */}
      <Text
        style={[
          T.greeting,
          {
            fontSize: px(27),
            lineHeight: px(34),
            color: C.ink,
            marginTop: px(7),
            letterSpacing: -0.4,
          },
        ]}>
        {greetingForNow()}, {name} 👋
      </Text>
      <Text
        style={[
          T.subtitle,
          { fontSize: px(15), lineHeight: px(21), color: C.grey, marginTop: px(2) },
        ]}>
        Ready for your next job?
      </Text>

      {/* availability ---------------------------------------------------- */}
      <View
        style={{
          height: px(M.onlineCardHeight),
          marginTop: px(14),
          borderRadius: px(R.onlineCard),
          borderWidth: 1,
          borderColor: !isApproved
            ? C.amberBorder
            : isOnline
              ? C.greenCardBorder
              : C.hairline,
          backgroundColor: !isApproved ? C.cream : isOnline ? C.greenCard : C.card,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: px(16),
          paddingRight: px(10),
        }}>
        <View
          style={{
            width: px(16),
            height: px(16),
            borderRadius: px(8),
            backgroundColor: !isApproved
              ? C.amberBorder
              : isOnline
                ? C.green
                : '#C4C6CD',
          }}
        />
        <View style={{ flex: 1, marginLeft: px(18) }}>
          <Text style={[T.cardTitle, { fontSize: px(16), lineHeight: px(20), color: C.ink }]}>
            {!isApproved
              ? 'Offline until approved'
              : isOnline
                ? "You're online"
                : "You're offline"}
          </Text>
          <Text
            style={[
              T.cardSubtitle,
              { fontSize: px(13), lineHeight: px(18), color: C.grey, marginTop: px(1) },
            ]}>
            {!isApproved
              ? 'Accepting jobs unlocks once RACE approves your account'
              : isOnline
                ? 'Receiving nearby requests'
                : 'Go online to receive jobs'}
          </Text>
        </View>
        {availabilityMutation.isPending || loadingProfile ? (
          <ActivityIndicator size="small" color={C.green} />
        ) : isApproved ? (
          <DriverToggle value={isOnline} onChange={() => void toggleAvailability()} />
        ) : (
          <View
            style={{
              height: px(M.rowPillHeight + 6),
              borderRadius: px(R.pill),
              paddingHorizontal: px(12),
              justifyContent: 'center',
              marginRight: px(6),
              backgroundColor: C.amberTile,
            }}>
            <Text style={[T.pill, { fontSize: px(12), lineHeight: px(16), color: C.ink }]}>In review</Text>
          </View>
        )}
      </View>

      {/* location health -------------------------------------------------- */}
      {isOnline && locationIssue ? (
        <View
          style={{
            marginTop: px(10),
            borderRadius: px(R.card),
            borderWidth: 1,
            borderColor: C.amberBorder,
            backgroundColor: C.cream,
            padding: px(14),
            flexDirection: 'row',
            alignItems: 'flex-start',
          }}>
          <View
            style={{
              width: px(34),
              height: px(34),
              borderRadius: px(R.tileSm),
              backgroundColor: C.amberTile,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <TriangleAlert size={px(18)} color={C.amberText} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1, marginLeft: px(12) }}>
            <Text style={[T.cardTitle, { fontSize: px(15), lineHeight: px(20), color: C.ink }]}>
              {locationIssue.title}
            </Text>
            <Text
              style={[
                T.cardSubtitle,
                { fontSize: px(13), lineHeight: px(18), color: C.grey, marginTop: px(3) },
              ]}>
              {locationIssue.message}
            </Text>
            {locationIssue.action ? (
              <Pressable
                onPress={() => {
                  if (locationIssue.action === 'retry') {
                    retryDriverLocationReport();
                    return;
                  }
                  void openLocationSettings();
                }}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  alignSelf: 'flex-start',
                  marginTop: px(10),
                  height: px(34),
                  paddingHorizontal: px(16),
                  borderRadius: px(R.pill),
                  backgroundColor: C.amber,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.9 : 1,
                })}>
                <Text style={[T.small, { fontSize: px(12.5), color: C.ink }]}> 
                  {locationIssue.actionLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {isApproved && dataIssue ? (
        <View
          style={{
            marginTop: px(10),
            borderRadius: px(R.card),
            borderWidth: 1,
            borderColor: C.amberBorder,
            backgroundColor: C.cream,
            padding: px(12),
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <TriangleAlert size={px(18)} color={C.amberText} strokeWidth={2.4} />
          <Text
            style={[T.cardSubtitle, { flex: 1, fontSize: px(12.5), color: C.grey, marginLeft: px(9) }]}>
            Couldn’t refresh your latest jobs.
          </Text>
          <Pressable
            onPress={() => void onRefresh()}
            accessibilityRole="button"
            style={{ paddingVertical: px(4), paddingHorizontal: px(5) }}>
            <Text style={[T.link, { fontSize: px(12.5), color: C.amberText }]}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {/* earnings -------------------------------------------------------- */}
      <View
        style={{
          marginTop: px(M.cardGap),
          borderRadius: px(R.card),
          borderWidth: 1,
          borderColor: C.hairline,
          backgroundColor: C.card,
          paddingHorizontal: px(14),
          paddingVertical: px(13),
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[T.metricLabel, { fontSize: px(14), lineHeight: px(19), color: C.ink }]}>
            Today's earnings
          </Text>
          <Info size={px(14)} color={C.greySoft} strokeWidth={2.2} style={{ marginLeft: px(6) }} />
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => setPeriodOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Earnings period: ${
              PERIOD_OPTIONS.find(option => option.id === period)?.label ?? 'This week'
            }`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              height: px(22),
              paddingHorizontal: px(12),
              borderRadius: px(R.pill),
              borderWidth: 1,
              borderColor: C.hairline,
              backgroundColor: C.white,
              opacity: pressed ? 0.9 : 1,
            })}>
            <Text style={[T.chip, { fontSize: px(12), lineHeight: px(16), color: C.grey }]}>
              {PERIOD_OPTIONS.find(option => option.id === period)?.chartLabel ?? 'This week'}
            </Text>
            <ChevronDown
              size={px(13)}
              color={C.grey}
              strokeWidth={2.6}
              style={{ marginLeft: px(4) }}
            />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: px(6) }}>
          <View style={{ flex: 1, paddingBottom: px(6) }}>
            <Text
              style={[
                T.metricValue,
                { fontSize: px(34), lineHeight: px(38), color: C.ink },
              ]}>
              {formatInr(earningsToday)}
            </Text>
            <Text
              style={[
                T.metricCaption,
                { fontSize: px(13), lineHeight: px(18), color: C.grey, marginTop: px(2) },
              ]}>
              <Text style={{ fontWeight: '700', color: C.ink }}>
                {todayCompleted.length}
              </Text>{' '}
              {todayCompleted.length === 1 ? 'job completed' : 'jobs completed'}
            </Text>
          </View>

          <View style={{ width: px(175) }}>
            {availableBars || jobs.length === 0 ? (
              <EarningsBars bars={bars} px={px} />
            ) : (
              <Text
                style={[
                  T.small,
                  {
                    fontSize: px(12.5),
                    lineHeight: px(17),
                    color: C.greySoft,
                    textAlign: 'right',
                    paddingBottom: px(14),
                  },
                ]}>
                No completed jobs yet
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* active job ------------------------------------------------------ */}
      {activeJob ? (
        <Pressable
          onPress={openActiveJob}
          accessibilityRole="button"
          accessibilityLabel="Continue active job"
          style={({ pressed }) => ({
            marginTop: px(M.cardGap),
            borderRadius: px(R.card),
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.greenCardBorder,
            padding: px(14),
            flexDirection: 'row',
            alignItems: 'center',
            opacity: pressed ? 0.94 : 1,
          })}>
          <View
            style={{
              width: px(38),
              height: px(38),
              borderRadius: px(19),
              backgroundColor: C.greenTile,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <ShieldCheck size={px(20)} color={C.green} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1, marginLeft: px(12) }}>
            <Text style={[T.cardTitle, { fontSize: px(15.5), color: C.ink }]}>Active job</Text>
            <Text
              numberOfLines={1}
              style={[T.meta, { color: C.greySoft, marginTop: px(2) }]}>
              {activeJobSubtitle}
            </Text>
          </View>
          <ChevronRight size={px(16)} color={C.greySoft} strokeWidth={2.4} />
        </Pressable>
      ) : null}

      {/* new requests ---------------------------------------------------- */}
      {pendingRequests > 0 ? (
        <View
          style={{
            marginTop: px(M.cardGap),
            borderRadius: px(R.card),
            backgroundColor: C.cream,
            padding: px(6),
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: px(44),
                height: px(44),
                borderRadius: px(R.tile),
                backgroundColor: C.amberTile,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Bell size={px(22)} color={C.amber} strokeWidth={2} fill={C.amber} />
            </View>
            <View style={{ flex: 1, marginLeft: px(8) }}>
              <Text style={[T.sectionTitle, { fontSize: px(16), lineHeight: px(21), color: C.ink }]}>
                {pendingRequests} new {pendingRequests === 1 ? 'request' : 'requests'}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  T.sectionSubtitle,
                  { fontSize: px(12), lineHeight: px(16), color: C.grey, marginTop: px(1) },
                ]}>
                New towing &amp; roadside requests nearby
              </Text>
            </View>
            <Pressable
              onPress={openJobs}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="View all requests"
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: px(4) }}>
              <Text style={[T.link, { fontSize: px(13), lineHeight: px(17), color: C.amberText }]}>
                View all
              </Text>
              <ChevronRight
                size={px(15)}
                color={C.amberText}
                strokeWidth={2.8}
                style={{ marginLeft: px(2) }}
              />
            </Pressable>
          </View>

          <RequestCard offer={offers[0]} onOpen={openJobs} px={px} />
        </View>
      ) : null}

      {/* recent jobs ----------------------------------------------------- */}
      {recentJobs.length > 0 ? (
        <View
          style={{
            marginTop: px(M.cardGap),
            borderRadius: px(R.card),
            borderWidth: 1,
            borderColor: C.hairline,
            backgroundColor: C.card,
            padding: px(11),
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: px(8),
            }}>
            <Text style={[T.sectionTitle, { fontSize: px(16), lineHeight: px(21), color: C.ink }]}>
              Recent jobs
            </Text>
            <Pressable
              onPress={openJobs}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="View all jobs"
              style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[T.link, { fontSize: px(13), lineHeight: px(17), color: C.amberText }]}>
                View all
              </Text>
              <ChevronRight
                size={px(15)}
                color={C.amberText}
                strokeWidth={2.8}
                style={{ marginLeft: px(2) }}
              />
            </Pressable>
          </View>

          <View style={{ gap: px(6) }}>
            {recentJobs.map(job => (
              <RecentJobRow key={`${job.bookingType}-${job.id}`} job={job} onOpen={openJobs} px={px} />
            ))}
          </View>
        </View>
      ) : null}

      {/* verification ---------------------------------------------------- */}
      <View
        style={{
          marginTop: px(M.cardGap),
          borderRadius: px(R.card),
          borderWidth: 1,
          borderColor: C.hairline,
          backgroundColor: C.card,
          padding: px(10),
          flexDirection: 'row',
          alignItems: 'center',
        }}>
        <View
          style={{
            width: px(34),
            height: px(34),
            borderRadius: px(10),
            backgroundColor: isApproved ? C.greenTile : C.amberTileSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <ShieldCheck
            size={px(20)}
            color={isApproved ? C.green : C.amber}
            strokeWidth={2.4}
          />
        </View>
        <View style={{ flex: 1, marginLeft: px(10) }}>
          <Text style={[T.cardTitle, { fontSize: px(14.5), lineHeight: px(19), color: C.ink }]}>
            {dashboardVerificationTitle}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              T.cardSubtitle,
              { fontSize: px(12), lineHeight: px(16), color: C.greySoft, marginTop: px(1) },
            ]}>
            {verification.hint}
          </Text>
        </View>
        <View
          style={{
            height: px(20),
            borderRadius: px(R.pill),
            paddingHorizontal: px(10),
            justifyContent: 'center',
            marginLeft: px(8),
            backgroundColor: isApproved ? C.greenPill : C.amberTile,
          }}>
          <Text
            style={[
              T.pill,
              { fontSize: px(11.5), lineHeight: px(15), color: isApproved ? C.green : C.ink },
            ]}>
            {verification.badge}
          </Text>
        </View>
      </View>

      <PeriodSheet
        visible={periodOpen}
        value={period}
        onSelect={setPeriod}
        onClose={() => setPeriodOpen(false)}
        px={px}
      />
    </AppScreenLayout>
  );
}

const styles = StyleSheet.create({
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12,12,14,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCard: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
  },
});
