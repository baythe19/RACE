import { PartnerText } from '../../../components/partner/PartnerText';
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
import { ActivityIndicator, Animated, Image, Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  Car,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  TriangleAlert,
  Truck,
  User,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { partnerAccountParams, partnerJobsParams } from '../../../navigation/partnerNavigationRef';

import AppScreenLayout from '../../../components/ui/AppScreenLayout';
import DriverDataSkeleton from '../../../components/partner/DriverDataSkeleton';
import PartnerHeaderLogo from '../../../components/partner/PartnerHeaderLogo';
import LocationPickerModal from '../../../components/common/LocationPickerModal';
import { images } from '../../../assets';
import { useScreenPx } from '../../../hooks/useScreenPx';
import { usePartnerDialog } from '../../../hooks/usePartnerDialog';
import { useAppSelector } from '../../../redux/hooks';
import {
  openLocationSettings,
  reportDriverManualLocationNow,
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
  useAcceptDriverJobMutation,
  useRefreshDriverDataOnFocus,
} from '../../../services/driver/useDriverQueries';
import {
  useDriverVendorInvitationsQuery,
  useDriverVendorMembershipQuery,
  useRespondToVendorInvitationMutation,
} from '../../../services/vendor/useVendorMembershipQueries';
import { useNotificationsQuery } from '../../../services/useNotificationQueries';
import { getApiErrorMessage } from '../../../services/auth/useAuthMutations';
import type { DriverJobBooking } from '../../../services/driver/driverApi';
import type { PartnerTabParamList } from '../../../types/partnerNavigation';
import { formatReadableAddress } from '../../../utils/readableAddress';
import {
  isActiveBookingStatus,
  isCancelledBookingStatus,
  isCompletedBookingStatus,
  jobEarnings,
} from '../../../utils/driverBookingStatus';
import { buildDriverVerification, assertDriverCanAcceptJobs } from '../../../utils/driverVerification';
import { getDriverAcceptLocationGate, pickupCoordsFromJob } from '../../../utils/driverLocationGuide';
import { UI_PREVIEW_MODE } from '../../../constants/preview';
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
const ACTIVE_STATUS_LABELS: Record<string, string> = {
  DRIVER_ASSIGNED: 'Driver Assigned',
  DRIVER_EN_ROUTE: 'En Route to Pickup',
  DRIVER_ARRIVED: 'Arrived at Pickup',
  IN_PROGRESS: 'Trip in Progress',
};

function activeStatusLabel(status: string) {
  return ACTIVE_STATUS_LABELS[status] ?? status.replace(/_/g, ' ').toLowerCase();
}

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

  const trackWidth = px(52);
  const trackHeight = px(28);
  const knob = px(24);
  const travel = trackWidth - knob - px(4);

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
        backgroundColor: value ? '#10B981' : '#E2E8F0',
        paddingHorizontal: px(2),
        justifyContent: 'center',
      }}>
      <Animated.View
        style={{
          width: knob,
          height: knob,
          borderRadius: knob / 2,
          backgroundColor: '#FFFFFF',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 2.5,
          elevation: 2,
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, travel],
              }),
            },
          ],
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
          <PartnerText
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
          </PartnerText>
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
                <PartnerText
                  style={[
                    T.cardTitle,
                    { fontSize: px(15), lineHeight: px(20), color: selected ? C.ink : C.grey },
                  ]}>
                  {option.label}
                </PartnerText>
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
      <PartnerText
        numberOfLines={1}
        style={[
          T.body,
          { flex: 1, marginLeft: px(21), fontSize: px(13.5), color: C.inkSoft },
        ]}>
        {address}
      </PartnerText>
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
        marginTop: px(10),
        backgroundColor: '#FFFFFF',
        borderRadius: px(14),
        borderWidth: 1,
        borderColor: '#FDE68A',
        padding: px(12),
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 3,
        elevation: 0.5,
      }}>
      {/* Top Header: Icon + Title + NEW / Distance */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: px(38),
            height: px(38),
            borderRadius: px(10),
            backgroundColor: '#FEF3C7',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#FDE68A',
          }}>
          {offer.bookingType === 'towing' ? (
            <Image
              source={images.icons.towing}
              style={{ width: px(21), height: px(17) }}
              resizeMode="contain"
            />
          ) : (
            <Car size={px(24)} color={C.ink} strokeWidth={2} />
          )}
        </View>

        <View style={{ flex: 1, marginLeft: px(10) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <PartnerText
              numberOfLines={1}
              style={{
                flex: 1,
                fontSize: px(14),
                lineHeight: px(18),
                fontWeight: '800',
                color: '#111827',
                marginRight: px(8),
              }}>
              {serviceTitle(offer)}
            </PartnerText>
            <View
              style={{
                backgroundColor: '#EFF6FF',
                borderRadius: px(R.pill),
                paddingHorizontal: px(7),
                paddingVertical: px(2),
                borderWidth: 1,
                borderColor: '#BFDBFE',
              }}>
              <PartnerText style={{ fontSize: px(9.5), fontWeight: '700', color: '#1D4ED8' }}>
                NEW
              </PartnerText>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: px(2) }}>
            {offer.bookingNumber ? (
              <PartnerText style={{ fontSize: px(11), fontWeight: '600', color: '#6B7280' }}>
                #{offer.bookingNumber}
              </PartnerText>
            ) : null}
            {offer.bookingNumber && offer.distanceKm != null ? (
              <PartnerText style={{ fontSize: px(11), color: '#9CA3AF', marginHorizontal: px(5) }}>•</PartnerText>
            ) : null}
            {offer.distanceKm != null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MapPin size={px(11)} color="#059669" strokeWidth={2.4} />
                <PartnerText
                  style={{
                    marginLeft: px(3),
                    fontSize: px(11.5),
                    fontWeight: '700',
                    color: '#059669',
                  }}>
                  {offer.distanceKm} km away
                </PartnerText>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Route Timeline Box */}
      {showRoute ? (
        <View
          style={{
            marginTop: px(10),
            backgroundColor: '#F9FAFB',
            borderRadius: px(10),
            paddingVertical: px(8),
            paddingHorizontal: px(10),
            borderWidth: 1,
            borderColor: '#F3F4F6',
          }}>
          {pickup ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ alignItems: 'center', width: px(14), paddingTop: px(2) }}>
                <View
                  style={{
                    width: px(8),
                    height: px(8),
                    borderRadius: px(4),
                    backgroundColor: '#10B981',
                  }}
                />
                {drop ? (
                  <View
                    style={{
                      width: px(1.5),
                      height: px(16),
                      backgroundColor: '#D1D5DB',
                      marginVertical: px(2),
                    }}
                  />
                ) : null}
              </View>
              <View style={{ flex: 1, marginLeft: px(7) }}>
                <PartnerText style={{ fontSize: px(9.5), fontWeight: '700', color: '#059669', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Pickup
                </PartnerText>
                <PartnerText
                  numberOfLines={1}
                  style={{ fontSize: px(11.5), lineHeight: px(15), fontWeight: '600', color: '#1F2937', marginTop: px(1) }}>
                  {pickup}
                </PartnerText>
              </View>
            </View>
          ) : null}

          {drop ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: pickup ? px(2) : 0 }}>
              <View style={{ alignItems: 'center', width: px(14), paddingTop: px(3) }}>
                <View
                  style={{
                    width: px(8),
                    height: px(8),
                    borderRadius: px(4),
                    backgroundColor: '#F59E0B',
                  }}
                />
              </View>
              <View style={{ flex: 1, marginLeft: px(7) }}>
                <PartnerText style={{ fontSize: px(9.5), fontWeight: '700', color: '#D97706', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Dropoff
                </PartnerText>
                <PartnerText
                  numberOfLines={1}
                  style={{ fontSize: px(11.5), lineHeight: px(15), fontWeight: '600', color: '#1F2937', marginTop: px(1) }}>
                  {drop}
                </PartnerText>
              </View>
            </View>
          ) : null}

          {offer.createdAt ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: px(7),
                paddingTop: px(7),
                borderTopWidth: 1,
                borderTopColor: '#E5E7EB',
              }}>
              <CalendarDays size={px(11)} color="#6B7280" strokeWidth={2.2} />
              <PartnerText style={{ fontSize: px(10.5), color: '#6B7280', marginLeft: px(5) }}>
                {formatWhen(offer.createdAt)}
              </PartnerText>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Footer: Earnings + CTA Button */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: px(10),
          paddingTop: px(10),
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
        }}>
        <View style={{ flex: 1 }}>
          <PartnerText
            style={{
              fontSize: px(10),
              lineHeight: px(13),
              fontWeight: '700',
              color: '#6B7280',
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}>
            Estimated earnings
          </PartnerText>
          <PartnerText
            style={{
              fontSize: px(20),
              lineHeight: px(24),
              fontWeight: '800',
              color: '#000000',
              marginTop: px(2),
            }}>
            {offer.estimatedFare != null ? formatInr(offer.estimatedFare) : '—'}
          </PartnerText>
        </View>

        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel="View request details"
          style={({ pressed }) => ({
            height: px(36),
            paddingHorizontal: px(16),
            borderRadius: px(R.pill),
            backgroundColor: '#FEA701',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.9 : 1,
          })}>
          <PartnerText style={{ fontSize: px(12.5), fontWeight: '700', color: '#000000' }}>
            View details
          </PartnerText>
          <ArrowRight size={px(14)} color="#000000" strokeWidth={2.6} style={{ marginLeft: px(5) }} />
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
          width: px(30),
          height: px(30),
          borderRadius: px(15),
          backgroundColor: C.creamRow,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {job.bookingType === 'towing' ? (
          <Image
            source={images.icons.towing}
            style={{ width: px(19), height: px(15) }}
            resizeMode="contain"
          />
        ) : (
          <Car size={px(19)} color={C.ink} strokeWidth={2} />
        )}
      </View>

      <View style={{ flex: 1, marginLeft: px(10) }}>
        <PartnerText
          numberOfLines={1}
          style={[T.jobTitle, { fontSize: px(13.5), lineHeight: px(17), color: C.ink }]}>
          #{job.bookingNumber}
        </PartnerText>
        {pickup || drop ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: px(2) }}>
            {pickup ? (
              <PartnerText
                numberOfLines={1}
                style={[T.meta, { flexShrink: 1, fontSize: px(11), lineHeight: px(14), color: C.greySoft }]}>
                {pickup}
              </PartnerText>
            ) : null}
            {pickup && drop ? (
              <PartnerText style={[T.meta, { fontSize: px(11), lineHeight: px(14), marginHorizontal: px(4), color: C.greySoft }]}>→</PartnerText>
            ) : null}
            {drop ? (
              <PartnerText
                numberOfLines={1}
                style={[T.meta, { flexShrink: 1, fontSize: px(11), lineHeight: px(14), color: C.greySoft }]}>
                {drop}
              </PartnerText>
            ) : null}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: px(1) }}>
          <PartnerText style={[T.meta, { fontSize: px(10.5), lineHeight: px(13), color: C.greySoft }]}>
            {formatShortWhen(job.createdAt)}
          </PartnerText>
          {jobEarnings(job) != null ? (
            <>
              <PartnerText
                style={[
                  T.meta,
                  { fontSize: px(10.5), lineHeight: px(13), marginHorizontal: px(4), color: C.greySoft },
                ]}>
                •
              </PartnerText>
              <PartnerText style={[T.meta, { fontSize: px(10.5), lineHeight: px(13), color: C.greySoft }]}>
                {formatInr(jobEarnings(job) as number)}
              </PartnerText>
            </>
          ) : null}
        </View>
      </View>

      <View
        style={{
          backgroundColor: pill.bg,
          borderRadius: px(R.pill),
          height: px(M.rowPillHeight - 2),
          justifyContent: 'center',
          paddingHorizontal: px(7),
          marginLeft: px(5),
        }}>
        <PartnerText style={[T.pill, { fontSize: px(9.5), lineHeight: px(12), color: pill.fg }]}>
          {pill.label}
        </PartnerText>
      </View>
      <ChevronRight
        size={px(13)}
        color={C.greySoft}
        strokeWidth={2.4}
        style={{ marginLeft: px(5) }}
      />
    </Pressable>
  );
}

/* -------------------------------------------------------------------- screen */

export default function DriverDashboardScreen() {
  const px = useScreenPx();
  const navigation = useNavigation<BottomTabNavigationProp<PartnerTabParamList>>();
  const user = useAppSelector(state => state.auth.user);
  const { dialog: partnerDialog, showAlert } = usePartnerDialog();

  /* Review status is shown on this screen. Queries stay open while review is
     pending. Only a suspended, disabled, or rejected account stops them. */
  const {
    data: profile,
    isLoading: loadingProfile,
    refetch: refetchProfile,
  } = useDriverProfileQuery(true);
  const verification = useMemo(() => buildDriverVerification(profile), [profile]);
  const isApproved = verification.isApproved;
  const isOperational =
    profile?.operationalStatus !== 'SUSPENDED' &&
    profile?.operationalStatus !== 'DISABLED' &&
    profile?.reviewStatus !== 'REJECTED' &&
    verification.state !== 'rejected' &&
    verification.state !== 'suspended';
  const isVendorStaff =
    profile?.driverContext === 'VENDOR_MANAGED' ||
    Boolean(profile?.driverProfile?.vendorUserId) ||
    Boolean(profile?.vendorUserId) ||
    profile?.driverProfile?.fleetSource === 'vendor';

  const {
    data: jobs = [],
    isLoading: jobsLoading,
    isError: jobsError,
    refetch: refetchJobs,
  } = useDriverJobsQuery(isOperational);
  const {
    data: offers = [],
    isLoading: offersLoading,
    isError: offersError,
    refetch: refetchOffers,
  } = useDriverJobOffersQuery(isOperational && !isVendorStaff);
  const {
    data: activeJob,
    isLoading: activeLoading,
    isError: activeError,
    refetch: refetchActive,
  } = useDriverActiveJobQuery(isOperational);
  const { data: driverMembership } = useDriverVendorMembershipQuery(isOperational);
  const {
    data: vendorInvitations = [],
    refetch: refetchVendorInvitations,
  } = useDriverVendorInvitationsQuery(isOperational && !driverMembership);
  const respondInvitationMutation = useRespondToVendorInvitationMutation();

  const availabilityMutation = useDriverAvailabilityMutation();
  const acceptMutation = useAcceptDriverJobMutation();
  useRefreshDriverDataOnFocus(true);

  const [isOnline, setIsOnline] = useState(false);
  const [period, setPeriod] = useState<Period>('week');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const locationHealth = useDriverPresenceStore(state => state.locationHealth);
  const manualLocation = useDriverPresenceStore(state => state.manualLocation);
  const setManualLocation = useDriverPresenceStore(state => state.setManualLocation);
  const [pickerOpen, setPickerOpen] = useState(false);

  /* Availability is read from the backend — never mutated on mount. */
  useEffect(() => {
    if (typeof profile?.isAvailable !== 'boolean') return;
    const available = isOperational && profile.isAvailable;
    setIsOnline(available);
    // Share availability with the request alert + location reporter.
    useDriverPresenceStore.getState().setOnline(available);
  }, [isOperational, profile?.isAvailable]);

  useDriverLocationReporting(isOperational && isOnline);

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

  const sortedOffers = useMemo(
    () => [...offers].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [offers],
  );

  const pendingRequests = sortedOffers.length;
  const latestOffer = sortedOffers[0];
  const activeJobSubtitle = activeJob
    ? `#${activeJob.bookingNumber} · ${addressOf(
        activeJob.pickup?.address || activeJob.pickup?.label,
      )}`.replace(/ · —$/, '')
    : undefined;

  /**
   * TRUE while the driver has a job in any active status (assigned, en-route,
   * arrived, or in-progress).  When true the "New requests" section is hidden
   * and Accept is blocked — the driver must finish or cancel the current trip
   * before another booking can be accepted.
   */
  const hasActiveJob = Boolean(activeJob);

  const { data: notifData } = useNotificationsQuery();
  const unreadNotifCount = notifData?.unreadCount ?? 0;
  // When driver has an active job, pending offer count is NOT shown in badge
  // because they cannot act on those offers anyway.
  const badgeCount = Math.max(unreadNotifCount, hasActiveJob ? 0 : pendingRequests);

  const openJobs = useCallback(() => {
    navigation.navigate('PartnerJobs', partnerJobsParams('PartnerJobsList'));
  }, [navigation]);

  const openNotifications = useCallback(() => {
    navigation.navigate(
      'PartnerAccount',
      partnerAccountParams('PartnerNotifications'),
    );
  }, [navigation]);

  const openProfile = useCallback(() => {
    navigation.navigate(
      'PartnerAccount',
      partnerAccountParams('PartnerAccountMain'),
    );
  }, [navigation]);

  const openActiveJob = useCallback(async () => {
    if (!activeJob) {
      openJobs();
      return;
    }
    if (activeJob.status === 'DRIVER_ASSIGNED' && !UI_PREVIEW_MODE) {
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
        gpsLocation: useDriverPresenceStore.getState().driverLocation,
        pickup: pickupCoordsFromJob(activeJob),
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
      try {
        await acceptMutation.mutateAsync({
          bookingId: activeJob.id,
          bookingType: activeJob.bookingType,
        });
        await refetchActive();
      } catch (error) {
        showAlert({
          tone: 'error',
          title: 'Accept failed',
          message: getApiErrorMessage(error, 'Could not accept this assignment'),
        });
        return;
      }
    }
    navigation.navigate(
      'PartnerJobs',
      partnerJobsParams('PartnerActiveJob', {
        bookingId: activeJob.id,
        bookingType: activeJob.bookingType,
      }),
    );
  }, [
    acceptMutation,
    activeJob,
    manualLocation,
    navigation,
    openJobs,
    profile,
    refetchActive,
    showAlert,
    user?.mobileNumber,
  ]);

  const toggleAvailability = useCallback(async () => {
    const next = !isOnline;
    try {
      const result = await availabilityMutation.mutateAsync(next);
      setIsOnline(result.isAvailable);
      useDriverPresenceStore.getState().setOnline(result.isAvailable);
    } catch (error) {
      showAlert({
        tone: 'error',
        title: 'Availability',
        message: getApiErrorMessage(error, 'Could not update availability. Please try again.'),
      });
    }
  }, [availabilityMutation, isOnline, showAlert]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchProfile(),
        refetchJobs(),
        refetchOffers(),
        refetchActive(),
        refetchVendorInvitations(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchActive, refetchJobs, refetchOffers, refetchProfile, refetchVendorInvitations]);

  const name = firstName(user?.fullName);
  const availableBars = bars.some(bar => bar.value > 0);
  const dashboardVerificationTitle = isApproved ? 'Verification approved' : verification.title;
  /** Location problem copy — null while location is healthy or not yet checked. */
  const locationIssue = locationHealthCopy(locationHealth);
  const dataIssue = jobsError || offersError || activeError;
  const initialLoading = (loadingProfile && !profile) ||
    (isOperational && !jobs.length && jobsLoading) ||
    (isOperational && !offers.length && offersLoading) ||
    (isOperational && !activeJob && activeLoading);

  return (
    <View style={{ flex: 1 }}>
    <AppScreenLayout
      backgroundColor={C.pageBg}
      horizontalPadding={px(M.pagePadding)}
      contentStyle={{ paddingTop: px(4), paddingBottom: px(M.tabBarHeight + 56) }}
      refreshing={refreshing}
      onRefresh={() => void onRefresh()}
      header={
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: px(M.pagePadding),
            paddingTop: px(1),
            paddingBottom: px(2),
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 0.5,
            borderBottomColor: '#E8ECF0',
            zIndex: 100,
            elevation: 0,
            minHeight: px(34),
          }}>
          <PartnerHeaderLogo width={px(64)} height={px(30)} />

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable
              onPress={openNotifications}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={
                badgeCount > 0
                  ? `Notifications, ${badgeCount} unread`
                  : 'Notifications'
              }
              style={({ pressed }) => ({
                width: px(30),
                height: px(30),
                borderRadius: px(15),
                backgroundColor: pressed ? '#F1F5F9' : '#FFFFFF',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                alignItems: 'center',
                justifyContent: 'center',
              })}>
              <Bell size={px(15)} color="#1E293B" strokeWidth={2} />
              {badgeCount > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -px(3),
                    right: -px(3),
                    minWidth: px(16),
                    height: px(16),
                    borderRadius: px(8),
                    backgroundColor: '#EF4444',
                    borderWidth: 1.5,
                    borderColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: px(2),
                  }}>
                  <PartnerText
                    style={{
                      fontSize: px(9),
                      fontWeight: '800',
                      color: '#FFFFFF',
                      lineHeight: px(11),
                      textAlign: 'center',
                      includeFontPadding: false,
                    }}>
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </PartnerText>
                </View>
              ) : null}
            </Pressable>

            <Pressable
              onPress={openProfile}
              accessibilityRole="button"
              accessibilityLabel="Partner account"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: pressed ? '#F1F5F9' : '#FFFFFF',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                borderRadius: px(16),
                paddingVertical: px(3),
                paddingLeft: px(4),
                paddingRight: px(6),
                marginLeft: px(6),
              })}>
              <View style={{ position: 'relative' }}>
                <View
                  style={{
                    width: px(24),
                    height: px(24),
                    borderRadius: px(12),
                    backgroundColor: '#FEF3C7',
                    borderWidth: 1,
                    borderColor: '#FDE68A',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <PartnerText
                    style={{
                      fontSize: px(10.5),
                      fontWeight: '700',
                      color: '#92400E',
                    }}>
                    {initials(user?.fullName)}
                  </PartnerText>
                </View>
                <View
                  style={{
                    position: 'absolute',
                    right: -1,
                    bottom: -1,
                    width: px(7),
                    height: px(7),
                    borderRadius: px(3.5),
                    backgroundColor: isOnline ? '#10B981' : '#94A3B8',
                    borderWidth: 1.2,
                    borderColor: '#FFFFFF',
                  }}
                />
              </View>
              <View style={{ marginLeft: px(6), marginRight: px(3), maxWidth: px(100) }}>
                <PartnerText
                  numberOfLines={1}
                  style={{
                    fontSize: px(12),
                    lineHeight: px(15),
                    fontWeight: '700',
                    color: '#0F172A',
                  }}>
                  {user?.fullName ?? 'RACE Partner'}
                </PartnerText>
              </View>
              <View
                style={{
                  width: px(14),
                  height: px(14),
                  borderRadius: px(7),
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: px(1),
                }}>
                <ChevronDown size={px(9)} color="#475569" strokeWidth={2.5} />
              </View>
            </Pressable>
          </View>
        </View>
      }>
      {initialLoading ? <DriverDataSkeleton variant="dashboard" /> : (
        <>
      {/* greeting -------------------------------------------------------- */}
      <PartnerText
        style={[
          T.greeting,
          {
            fontSize: px(20),
            lineHeight: px(25),
            color: C.ink,
            marginTop: px(5),
            letterSpacing: -0.3,
          },
        ]}>
        {greetingForNow()}, {name} 👋
      </PartnerText>
      <PartnerText
        style={[
          T.subtitle,
          { fontSize: px(12.5), lineHeight: px(16), color: C.grey, marginTop: px(1) },
        ]}>
        {hasActiveJob ? 'You have an active trip in progress' : 'Ready for your next job?'}
      </PartnerText>

      {/* availability ---------------------------------------------------- */}
      <View
        style={{
          marginTop: px(10),
          borderRadius: px(16),
          borderWidth: 1,
          borderColor: !isOperational
            ? '#FECACA'
            : isOnline
              ? '#D1FAE5'
              : '#E2E8F0',
          backgroundColor: !isOperational ? '#FEF2F2' : '#FFFFFF',
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: px(14),
          paddingRight: px(12),
          paddingVertical: px(12),
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.02,
          shadowRadius: 3,
          elevation: 0.5,
        }}>
        {/* Live Radar Beacon Badge */}
        <View
          style={{
            width: px(34),
            height: px(34),
            borderRadius: px(17),
            backgroundColor: !isOperational
              ? '#FEE2E2'
              : isOnline
                ? '#ECFDF5'
                : '#F1F5F9',
            borderWidth: 1,
            borderColor: !isOperational
              ? '#FECACA'
              : isOnline
                ? '#A7F3D0'
                : '#E2E8F0',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {!isOperational ? (
            <ShieldCheck size={px(16)} color="#DC2626" strokeWidth={2.4} />
          ) : isOnline ? (
            <View
              style={{
                width: px(20),
                height: px(20),
                borderRadius: px(10),
                backgroundColor: '#A7F3D0',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <View
                style={{
                  width: px(10),
                  height: px(10),
                  borderRadius: px(5),
                  backgroundColor: '#059669',
                }}
              />
            </View>
          ) : (
            <View
              style={{
                width: px(10),
                height: px(10),
                borderRadius: px(5),
                backgroundColor: '#94A3B8',
              }}
            />
          )}
        </View>

        <View style={{ flex: 1, marginLeft: px(12) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <PartnerText
              style={{
                fontSize: px(14),
                lineHeight: px(18),
                fontWeight: '700',
                color: C.ink,
                letterSpacing: -0.2,
              }}>
              {!isOperational
                ? 'Account suspended or rejected'
                : isOnline
                  ? "You're online"
                  : "You're offline"}
            </PartnerText>
            {isOnline && isOperational ? (
              <View
                style={{
                  backgroundColor: '#ECFDF5',
                  paddingHorizontal: px(6),
                  paddingVertical: px(1.5),
                  borderRadius: px(9),
                  marginLeft: px(7),
                  borderWidth: 1,
                  borderColor: '#A7F3D0',
                }}>
                <PartnerText
                  style={{
                    fontSize: px(9.5),
                    fontWeight: '800',
                    color: '#059669',
                    letterSpacing: 0.5,
                  }}>
                  LIVE
                </PartnerText>
              </View>
            ) : null}
          </View>
          <PartnerText
            style={{
              fontSize: px(11.5),
              lineHeight: px(15),
              color: C.grey,
              marginTop: px(2),
            }}>
            {!isOperational
              ? 'Please contact RACE support to resolve account status'
              : isOnline
                ? (!isApproved ? 'Receiving jobs · Review in background' : 'Receiving nearby requests')
                : 'Go online to receive jobs'}
          </PartnerText>
        </View>

        {availabilityMutation.isPending || loadingProfile ? (
          <ActivityIndicator size="small" color="#10B981" />
        ) : isOperational ? (
          <DriverToggle value={isOnline} onChange={() => void toggleAvailability()} />
        ) : (
          <View
            style={{
              height: px(M.rowPillHeight + 6),
              borderRadius: px(R.pill),
              paddingHorizontal: px(12),
              justifyContent: 'center',
              marginRight: px(4),
              backgroundColor: '#FEE2E2',
            }}>
            <PartnerText style={[T.pill, { fontSize: px(12), lineHeight: px(16), color: '#DC2626' }]}>Blocked</PartnerText>
          </View>
        )}
      </View>

      {/* vendor fleet invitation card ------------------------------------ */}
      {!driverMembership && vendorInvitations.length > 0 ? (
        <View
          style={{
            marginTop: px(10),
            borderRadius: px(16),
            borderWidth: 1.5,
            borderColor: '#FCD34D',
            backgroundColor: '#FFFDF5',
            padding: px(14),
            shadowColor: '#F59E0B',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 2,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: px(38),
                height: px(38),
                borderRadius: px(12),
                backgroundColor: '#FEF3C7',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#FDE68A',
              }}>
              <Building2 size={px(20)} color="#D97706" strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1, marginLeft: px(10) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <PartnerText
                  style={{
                    fontSize: px(14),
                    fontWeight: '800',
                    color: '#1E293B',
                  }}>
                  Vendor Fleet Invitation
                </PartnerText>
                <View
                  style={{
                    backgroundColor: '#FEF3C7',
                    borderRadius: px(R.pill),
                    paddingHorizontal: px(7),
                    paddingVertical: px(2),
                    borderWidth: 1,
                    borderColor: '#FDE68A',
                  }}>
                  <PartnerText style={{ fontSize: px(9.5), fontWeight: '700', color: '#B45309' }}>
                    NEW
                  </PartnerText>
                </View>
              </View>
              <PartnerText
                style={{
                  fontSize: px(12),
                  lineHeight: px(16),
                  color: '#475569',
                  marginTop: px(2),
                }}>
                <PartnerText style={{ fontWeight: '700', color: '#0F172A' }}>
                  {vendorInvitations[0].vendor.name}
                </PartnerText>{' '}
                has invited you to join their fleet as a Full-Time driver.
              </PartnerText>
              {vendorInvitations.length > 1 ? (
                <Pressable
                  onPress={() => navigation.navigate('PartnerVendor' as any)}
                  style={{ marginTop: px(4) }}>
                  <PartnerText style={{ fontSize: px(11), fontWeight: '700', color: '#2563EB' }}>
                    +{vendorInvitations.length - 1} more invitation{vendorInvitations.length > 2 ? 's' : ''} in My Vendor →
                  </PartnerText>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(8), marginTop: px(12) }}>
            <Pressable
              disabled={respondInvitationMutation.isPending}
              onPress={() => {
                respondInvitationMutation.mutate(
                  { id: vendorInvitations[0].id, decision: 'decline' },
                  {
                    onError: error =>
                      showAlert({
                        tone: 'error',
                        title: 'Could not update',
                        message: error instanceof Error ? error.message : 'Please try again.',
                      }),
                  },
                );
              }}
              style={({ pressed }) => ({
                flex: 1,
                height: px(36),
                borderRadius: px(10),
                borderWidth: 1,
                borderColor: '#E2E8F0',
                backgroundColor: pressed ? '#F1F5F9' : '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
              })}>
              <PartnerText style={{ fontSize: px(12.5), fontWeight: '700', color: '#64748B' }}>
                Decline
              </PartnerText>
            </Pressable>

            <Pressable
              disabled={respondInvitationMutation.isPending}
              onPress={() => {
                respondInvitationMutation.mutate(
                  { id: vendorInvitations[0].id, decision: 'accept' },
                  {
                    onSuccess: () => {
                      showAlert({
                        tone: 'success',
                        title: 'Connected to Fleet',
                        message: `You are now officially connected with ${vendorInvitations[0].vendor.name}.`,
                      });
                    },
                    onError: error =>
                      showAlert({
                        tone: 'error',
                        title: 'Could not update',
                        message: error instanceof Error ? error.message : 'Please try again.',
                      }),
                  },
                );
              }}
              style={({ pressed }) => ({
                flex: 1.5,
                height: px(36),
                borderRadius: px(10),
                backgroundColor: pressed ? '#E08A00' : '#FEA701',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: px(5),
              })}>
              {respondInvitationMutation.isPending ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <>
                  <Check size={px(15)} color="#000000" strokeWidth={2.8} />
                  <PartnerText style={{ fontSize: px(12.5), fontWeight: '800', color: '#000000' }}>
                    Accept & Connect
                  </PartnerText>
                </>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* location health -------------------------------------------------- */}
      {isOnline && locationIssue ? (
        <View
          style={{
            marginTop: px(8),
            borderRadius: px(R.innerCard),
            borderWidth: 1,
            borderColor: C.amberBorder,
            backgroundColor: C.cream,
            paddingVertical: px(8),
            paddingHorizontal: px(12),
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <View
            style={{
              width: px(28),
              height: px(28),
              borderRadius: px(7),
              backgroundColor: C.amberTile,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <TriangleAlert size={px(15)} color={C.amberText} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1, marginHorizontal: px(10) }}>
            <PartnerText
              numberOfLines={1}
              style={[T.cardTitle, { fontSize: px(13), lineHeight: px(17), color: C.ink, fontWeight: '700' }]}>
              {locationIssue.title}
            </PartnerText>
            <PartnerText
              numberOfLines={1}
              style={[
                T.cardSubtitle,
                { fontSize: px(11), lineHeight: px(15), color: C.grey, marginTop: px(1) },
              ]}>
              {locationIssue.message}
            </PartnerText>
          </View>
          <Pressable
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Set my location manually"
            style={({ pressed }) => ({
              height: px(28),
              paddingHorizontal: px(10),
              borderRadius: px(R.pill),
              borderWidth: 1,
              borderColor: C.amber,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: px(6),
              opacity: pressed ? 0.85 : 1,
            })}>
            <PartnerText style={[T.small, { fontSize: px(11), fontWeight: '700', color: C.ink }]}>
              Set location
            </PartnerText>
          </Pressable>
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
                height: px(28),
                paddingHorizontal: px(10),
                borderRadius: px(R.pill),
                backgroundColor: C.amber,
                marginLeft: px(6),
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
              })}>
              <PartnerText style={[T.small, { fontSize: px(11), fontWeight: '700', color: C.ink }]}>
                {locationIssue.actionLabel}
              </PartnerText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {isOnline && manualLocation ? (
        <Pressable
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Change my chosen location"
          style={({ pressed }) => ({
            marginTop: px(8),
            borderRadius: px(R.innerCard),
            borderWidth: 1,
            borderColor: '#BBF7D0',
            backgroundColor: '#F0FDF4',
            paddingVertical: px(8),
            paddingHorizontal: px(12),
            flexDirection: 'row',
            alignItems: 'center',
            opacity: pressed ? 0.9 : 1,
          })}>
          <View
            style={{
              width: px(28),
              height: px(28),
              borderRadius: px(7),
              backgroundColor: '#DCFCE7',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MapPin size={px(15)} color="#16A34A" strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1, marginHorizontal: px(10) }}>
            <PartnerText
              numberOfLines={1}
              style={[T.cardTitle, { fontSize: px(13), lineHeight: px(17), color: C.ink, fontWeight: '700' }]}>
              Location set manually
            </PartnerText>
            <PartnerText
              numberOfLines={1}
              style={[T.cardSubtitle, { fontSize: px(11), lineHeight: px(15), color: C.grey, marginTop: px(1) }]}>
              Jobs match near your chosen point — tap to change
            </PartnerText>
          </View>
          <ChevronRight size={px(16)} color={C.grey} strokeWidth={2.2} />
        </Pressable>
      ) : null}

      {isOperational && dataIssue ? (
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
          <PartnerText
            style={[T.cardSubtitle, { flex: 1, fontSize: px(12.5), color: C.grey, marginLeft: px(9) }]}>
            Couldn’t refresh your latest jobs.
          </PartnerText>
          <Pressable
            onPress={() => void onRefresh()}
            accessibilityRole="button"
            style={{ paddingVertical: px(4), paddingHorizontal: px(5) }}>
            <PartnerText style={[T.link, { fontSize: px(12.5), color: C.amberText }]}>Retry</PartnerText>
          </Pressable>
        </View>
      ) : null}

      {/* earnings -------------------------------------------------------- */}
      <View
        style={{
          marginTop: px(10),
          borderRadius: px(R.card),
          borderWidth: 1,
          borderColor: '#E2E8F0',
          backgroundColor: '#FFFFFF',
          paddingHorizontal: px(14),
          paddingVertical: px(11),
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.02,
          shadowRadius: 3,
          elevation: 0.5,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <PartnerText style={[T.metricLabel, { fontSize: px(12.5), lineHeight: px(17), color: C.ink }]}>
            Today's earnings
          </PartnerText>
          <Info size={px(13)} color={C.greySoft} strokeWidth={2.2} style={{ marginLeft: px(5) }} />
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
            <PartnerText style={[T.chip, { fontSize: px(11), lineHeight: px(15), color: C.grey }]}>
              {PERIOD_OPTIONS.find(option => option.id === period)?.chartLabel ?? 'This week'}
            </PartnerText>
            <ChevronDown
              size={px(12)}
              color={C.grey}
              strokeWidth={2.6}
              style={{ marginLeft: px(4) }}
            />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: px(6) }}>
          <View style={{ flex: 1, paddingBottom: px(6) }}>
            <PartnerText
              style={[
                T.metricValue,
                { fontSize: px(28), lineHeight: px(32), color: C.ink },
              ]}>
              {formatInr(earningsToday)}
            </PartnerText>
            <PartnerText
              style={[
                T.metricCaption,
                { fontSize: px(11.5), lineHeight: px(15), color: C.grey, marginTop: px(2) },
              ]}>
              <PartnerText style={{ fontWeight: '700', color: C.ink }}>
                {todayCompleted.length}
              </PartnerText>{' '}
              {todayCompleted.length === 1 ? 'job completed' : 'jobs completed'}
            </PartnerText>
          </View>

          <View style={{ width: px(175) }}>
            {availableBars || jobs.length === 0 ? (
              <EarningsBars bars={bars} px={px} />
            ) : (
              <PartnerText
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
              </PartnerText>
            )}
          </View>
        </View>
      </View>

      {/* active job ------------------------------------------------------ */}
      {activeJob ? (
        <Pressable
          onPress={openActiveJob}
          accessibilityRole="button"
          accessibilityLabel={`Active trip #${activeJob.bookingNumber}, tap to view details`}
          style={({ pressed }) => ({
            marginTop: px(M.cardGap),
            borderRadius: px(R.card),
            backgroundColor: '#FFFFFF',
            borderWidth: 1.5,
            borderColor: '#86EFAC',
            padding: px(14),
            shadowColor: '#10B981',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
            opacity: pressed ? 0.96 : 1,
          })}>
          {/* Header Row: Live Badge, Booking # & Fare */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: px(10),
              borderBottomWidth: 1,
              borderBottomColor: '#F1F5F9',
              gap: px(8),
            }}>
            <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flexShrink: 1,
                  backgroundColor: activeJob.status === 'DRIVER_ASSIGNED' ? '#FEF3C7' : '#ECFDF5',
                  paddingHorizontal: px(8),
                  paddingVertical: px(3),
                  borderRadius: px(12),
                  borderWidth: 1,
                  borderColor: activeJob.status === 'DRIVER_ASSIGNED' ? '#FDE68A' : '#A7F3D0',
                }}>
                <View
                  style={{
                    width: px(6),
                    height: px(6),
                    borderRadius: px(3),
                    backgroundColor: activeJob.status === 'DRIVER_ASSIGNED' ? '#D97706' : '#10B981',
                    marginRight: px(5),
                  }}
                />
                <PartnerText
                  numberOfLines={1}
                  style={{
                    fontSize: px(9.5),
                    fontWeight: '800',
                    color: activeJob.status === 'DRIVER_ASSIGNED' ? '#B45309' : '#059669',
                    letterSpacing: 0.4,
                  }}>
                  {activeJob.status === 'DRIVER_ASSIGNED'
                    ? 'ASSIGNED BY VENDOR'
                    : activeStatusLabel(activeJob.status).toUpperCase()}
                </PartnerText>
              </View>

              <PartnerText
                numberOfLines={1}
                ellipsizeMode="middle"
                style={{
                  flexShrink: 1,
                  fontSize: px(12),
                  fontWeight: '700',
                  color: '#475569',
                  marginLeft: px(8),
                }}>
                #{activeJob.bookingNumber}
              </PartnerText>
            </View>

            {jobEarnings(activeJob) != null ? (
              <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                <PartnerText
                  style={{
                    fontSize: px(15),
                    lineHeight: px(19),
                    fontWeight: '800',
                    color: '#0F172A',
                  }}>
                  {formatInr(jobEarnings(activeJob)!)}
                </PartnerText>
                <PartnerText
                  style={{
                    fontSize: px(9.5),
                    color: '#64748B',
                    fontWeight: '600',
                  }}>
                  Est. fare
                </PartnerText>
              </View>
            ) : null}
          </View>

          {/* Service Title & Vehicle / Distance */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: px(10) }}>
            <View
              style={{
                width: px(36),
                height: px(36),
                borderRadius: px(10),
                backgroundColor: '#F0FDF4',
                borderWidth: 1,
                borderColor: '#DCFCE7',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Navigation size={px(18)} color="#15803D" strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1, marginLeft: px(10) }}>
              <PartnerText
                numberOfLines={1}
                style={{
                  fontSize: px(13.5),
                  fontWeight: '800',
                  color: '#0F172A',
                }}>
                {serviceTitle(activeJob)}
              </PartnerText>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: px(2), flexWrap: 'wrap' }}>
                {activeJob.distanceKm != null ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MapPin size={px(10)} color="#059669" strokeWidth={2.4} />
                    <PartnerText
                      style={{
                        fontSize: px(10.5),
                        fontWeight: '600',
                        color: '#059669',
                        marginLeft: px(3),
                      }}>
                      {activeJob.distanceKm} km trip
                    </PartnerText>
                  </View>
                ) : null}
                {activeJob.assignedFleetVehicleLabel ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: activeJob.distanceKm != null ? px(6) : 0 }}>
                    <Truck size={px(11)} color="#2563EB" strokeWidth={2.2} />
                    <PartnerText style={{ fontSize: px(11), color: '#1D4ED8', fontWeight: '700', marginLeft: px(3) }}>
                      {activeJob.assignedFleetVehicleLabel}
                    </PartnerText>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Route Section: Pickup & Drop */}
          {activeJob.pickup || activeJob.dropoff ? (
            <View
              style={{
                marginTop: px(10),
                backgroundColor: '#F8FAFC',
                borderRadius: px(12),
                padding: px(10),
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}>
              {/* Pickup location */}
              {activeJob.pickup ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: px(18),
                      height: px(18),
                      borderRadius: px(9),
                      backgroundColor: '#DCFCE7',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: px(8),
                    }}>
                    <View
                      style={{
                        width: px(7),
                        height: px(7),
                        borderRadius: px(3.5),
                        backgroundColor: '#16A34A',
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PartnerText
                      style={{
                        fontSize: px(10),
                        fontWeight: '700',
                        color: '#15803D',
                        textTransform: 'uppercase',
                        letterSpacing: 0.3,
                      }}>
                      Pickup Location
                    </PartnerText>
                    <PartnerText
                      numberOfLines={1}
                      style={{
                        fontSize: px(12.5),
                        fontWeight: '600',
                        color: '#1E293B',
                        marginTop: px(1),
                      }}>
                      {addressOf(activeJob.pickup?.address || activeJob.pickup?.label) || 'Customer location'}
                    </PartnerText>
                  </View>
                </View>
              ) : null}

              {/* Connecting line */}
              {activeJob.pickup && activeJob.dropoff ? (
                <View
                  style={{
                    marginLeft: px(8.5),
                    height: px(10),
                    width: px(1.5),
                    backgroundColor: '#CBD5E1',
                    marginVertical: px(2),
                  }}
                />
              ) : null}

              {/* Dropoff location */}
              {activeJob.dropoff ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: px(18),
                      height: px(18),
                      borderRadius: px(9),
                      backgroundColor: '#FEF3C7',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: px(8),
                    }}>
                    <View
                      style={{
                        width: px(7),
                        height: px(7),
                        borderRadius: px(3.5),
                        backgroundColor: '#D97706',
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PartnerText
                      style={{
                        fontSize: px(9.5),
                        fontWeight: '700',
                        color: '#B45309',
                        textTransform: 'uppercase',
                        letterSpacing: 0.3,
                      }}>
                      Drop Location
                    </PartnerText>
                    <PartnerText
                      numberOfLines={1}
                      style={{
                        fontSize: px(11.5),
                        fontWeight: '600',
                        color: '#1E293B',
                        marginTop: px(1),
                      }}>
                      {addressOf(activeJob.dropoff?.address || activeJob.dropoff?.label) || 'Destination location'}
                    </PartnerText>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Customer info (if available) */}
          {activeJob.customer?.name || activeJob.customer?.mobileNumber ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: px(10),
                paddingHorizontal: px(4),
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: px(26),
                    height: px(26),
                    borderRadius: px(13),
                    backgroundColor: '#E2E8F0',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <User size={px(14)} color="#475569" strokeWidth={2.2} />
                </View>
                <View style={{ marginLeft: px(8) }}>
                  <PartnerText style={{ fontSize: px(11.5), fontWeight: '700', color: '#1E293B' }}>
                    {activeJob.customer?.name || 'Customer'}
                  </PartnerText>
                  {activeJob.customer?.mobileNumber ? (
                    <PartnerText style={{ fontSize: px(10.5), color: '#64748B' }}>
                      {activeJob.customer.mobileNumber}
                    </PartnerText>
                  ) : null}
                </View>
              </View>

              {activeJob.customer?.mobileNumber ? (
                <Pressable
                  hitSlop={8}
                  onPress={(e) => {
                    e.stopPropagation();
                    void Linking.openURL(`tel:${activeJob.customer?.mobileNumber}`);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: pressed ? '#DCFCE7' : '#F0FDF4',
                    borderWidth: 1,
                    borderColor: '#86EFAC',
                    paddingHorizontal: px(10),
                    paddingVertical: px(4.5),
                    borderRadius: px(14),
                  })}>
                  <Phone size={px(11)} color="#15803D" strokeWidth={2.4} />
                  <PartnerText style={{ fontSize: px(10.5), fontWeight: '700', color: '#15803D', marginLeft: px(4) }}>
                    Call
                  </PartnerText>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* Primary Action Button */}
          <Pressable
            onPress={openActiveJob}
            accessibilityRole="button"
            accessibilityLabel={`Open active job #${activeJob.bookingNumber}`}
            style={({ pressed }) => ({
              marginTop: px(10),
              height: px(40),
              borderRadius: px(11),
              backgroundColor:
                activeJob.status === 'DRIVER_ASSIGNED'
                  ? pressed ? '#B45309' : '#D97706'
                  : pressed ? '#047857' : '#059669',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: activeJob.status === 'DRIVER_ASSIGNED' ? '#D97706' : '#059669',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.18,
              shadowRadius: 4,
              elevation: 2,
            })}>
            <Navigation size={px(14)} color="#FFFFFF" strokeWidth={2.6} style={{ marginRight: px(6) }} />
            <PartnerText
              style={{
                fontSize: px(12.5),
                fontWeight: '800',
                color: '#FFFFFF',
                letterSpacing: 0.3,
              }}>
              {activeJob.status === 'DRIVER_ASSIGNED'
                ? 'Accept Assignment & Start Navigation'
                : 'Continue Active Trip'}
            </PartnerText>
            <ArrowRight size={px(14)} color="#FFFFFF" strokeWidth={2.6} style={{ marginLeft: px(5) }} />
          </Pressable>
        </Pressable>
      ) : null}

      {/* new requests ---------------------------------------------------- */}
      {/* Hidden while driver has an active job — must finish current trip first */}
      {pendingRequests > 0 && !hasActiveJob ? (
        <View
          style={{
            marginTop: px(12),
            borderRadius: px(20),
            backgroundColor: '#FEF8E8',
            borderWidth: 1,
            borderColor: '#FDE68A',
            padding: px(12),
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: px(36),
                height: px(36),
                borderRadius: px(10),
                backgroundColor: '#FEF3C7',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#FDE68A',
              }}>
              <Bell size={px(18)} color="#D97706" strokeWidth={2.2} fill="#D97706" />
            </View>
            <View style={{ flex: 1, marginLeft: px(10) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <PartnerText style={{ fontSize: px(14), lineHeight: px(18), fontWeight: '800', color: C.ink }}>
                  {pendingRequests} new {pendingRequests === 1 ? 'request' : 'requests'}
                </PartnerText>
                <View
                  style={{
                    width: px(7),
                    height: px(7),
                    borderRadius: px(3.5),
                    backgroundColor: '#10B981',
                    marginLeft: px(6),
                  }}
                />
              </View>
              <PartnerText
                numberOfLines={1}
                style={{ fontSize: px(11), lineHeight: px(14), color: C.grey, marginTop: px(1) }}>
                Nearby customer requests waiting for you
              </PartnerText>
            </View>
            <Pressable
              onPress={openJobs}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="View all requests"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: px(4),
                paddingHorizontal: px(6),
                opacity: pressed ? 0.8 : 1,
              })}>
              <PartnerText style={{ fontSize: px(12), fontWeight: '700', color: '#D97706' }}>
                View all
              </PartnerText>
              <ChevronRight
                size={px(14)}
                color="#D97706"
                strokeWidth={2.8}
                style={{ marginLeft: px(2) }}
              />
            </Pressable>
          </View>

          <RequestCard offer={latestOffer} onOpen={openJobs} px={px} />
        </View>
      ) : null}

      {/* recent jobs ----------------------------------------------------- */}
      {recentJobs.length > 0 ? (
        <View
          style={{
            marginTop: px(M.cardGap),
            borderRadius: px(R.card),
            borderWidth: 1,
            borderColor: '#E2E8F0',
            backgroundColor: '#FFFFFF',
            padding: px(12),
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.02,
            shadowRadius: 3,
            elevation: 0.5,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: px(8),
            }}>
            <PartnerText style={[T.sectionTitle, { fontSize: px(14.5), lineHeight: px(19), color: C.ink }]}>
              Recent jobs
            </PartnerText>
            <Pressable
              onPress={openJobs}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="View all jobs"
              style={{ flexDirection: 'row', alignItems: 'center' }}>
              <PartnerText style={[T.link, { fontSize: px(13), lineHeight: px(17), color: C.amberText }]}>
                View all
              </PartnerText>
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

      {/* verification (only shown when account is pending/in review; hidden when approved) */}
      {!isApproved ? (
        <View
          style={{
            marginTop: px(10),
            borderRadius: px(R.card),
            borderWidth: 1,
            borderColor: '#E2E8F0',
            backgroundColor: '#FFFFFF',
            padding: px(12),
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.02,
            shadowRadius: 3,
            elevation: 0.5,
          }}>
          <View
            style={{
              width: px(34),
              height: px(34),
              borderRadius: px(10),
              backgroundColor: C.amberTileSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <ShieldCheck
              size={px(20)}
              color={C.amber}
              strokeWidth={2.4}
            />
          </View>
          <View style={{ flex: 1, marginLeft: px(10) }}>
            <PartnerText style={[T.cardTitle, { fontSize: px(14.5), lineHeight: px(19), color: C.ink }]}>
              {dashboardVerificationTitle}
            </PartnerText>
            <PartnerText
              numberOfLines={1}
              style={[
                T.cardSubtitle,
                { fontSize: px(12), lineHeight: px(16), color: C.greySoft, marginTop: px(1) },
              ]}>
              {verification.hint}
            </PartnerText>
          </View>
          <View
            style={{
              height: px(20),
              borderRadius: px(R.pill),
              paddingHorizontal: px(10),
              justifyContent: 'center',
              marginLeft: px(8),
              backgroundColor: C.amberTile,
            }}>
            <PartnerText
              style={[
                T.pill,
                { fontSize: px(11.5), lineHeight: px(15), color: C.ink },
              ]}>
              {verification.badge}
            </PartnerText>
          </View>
        </View>
      ) : null}

      <PeriodSheet
        visible={periodOpen}
        value={period}
        onSelect={setPeriod}
        onClose={() => setPeriodOpen(false)}
        px={px}
      />
        </>
      )}
    </AppScreenLayout>
    <LocationPickerModal
      visible={pickerOpen}
      onClose={() => setPickerOpen(false)}
      title="Set your location"
      confirmLabel="Use this location"
      initialLocation={
        manualLocation
          ? { latitude: manualLocation.latitude, longitude: manualLocation.longitude, address: '' }
          : undefined
      }
      onLocationSelected={location => {
        setManualLocation({
          latitude: location.latitude,
          longitude: location.longitude,
          updatedAt: Date.now(),
        });
        setPickerOpen(false);
        reportDriverManualLocationNow();
      }}
    />
    {partnerDialog}
    </View>
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
