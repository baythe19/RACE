/**
 * RACE Partner — Driver Jobs (board 01 "JOBS / AVAILABLE").
 *
 * [GOAL] Let the driver accept or decline the requests waiting for them.
 * [PRIMARY_ACTION] Accept trip (per card). Decline is deliberately quieter.
 * [BEHAVIOR]
 *   - Accept/Decline hit the backend first; the active job screen is only opened
 *     after the API confirms the accept (per the handoff notes).
 *   - Buttons lock while a mutation is in flight so a second tap cannot fire.
 *   - Segments: Available (offers) · Active (accepted, running) · Done (closed).
 * [DATA] Real API only — service label, booking number, distance, pickup/drop,
 *        created time and estimated fare come from the booking payload.
 * [STATES] loading · empty per segment · error via alert · success → active job
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  Bell,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Inbox,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  TriangleAlert,
  User,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openPartnerNotifications } from '../../../navigation/partnerNavigationRef';
import { images } from '../../../assets';
import { useScreenPx } from '../../../hooks/useScreenPx';
import { getApiErrorMessage } from '../../../services/auth/useAuthMutations';
import {
  useAcceptDriverJobMutation,
  useDriverActiveJobQuery,
  useDriverJobOffersQuery,
  useDriverJobsQuery,
  useDriverProfileQuery,
  useRejectDriverJobMutation,
} from '../../../services/driver/useDriverQueries';
import type { DriverJobBooking } from '../../../services/driver/driverApi';
import type { PartnerJobsStackParamList } from '../../../types/partnerNavigation';
import { formatReadableAddress } from '../../../utils/readableAddress';
import { buildDriverVerification } from '../../../utils/driverVerification';
import {
  isActiveBookingStatus,
  isClosedBookingStatus,
  isCancelledBookingStatus,
  jobEarnings,
} from '../../../utils/driverBookingStatus';
import {
  driverColors as C,
  driverMetrics as M,
  driverRadius as R,
  driverType as T,
} from '../../../theme/driverUi';

type Segment = 'available' | 'active' | 'done';

type Props = {
  navigation: NativeStackNavigationProp<PartnerJobsStackParamList, 'PartnerJobsList'>;
};

function addressOf(input?: string | null) {
  const formatted = formatReadableAddress(input);
  return formatted === '—' ? '' : formatted;
}

function formatInr(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatWhen(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(+date)) return '';
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  if (+target === +day) return `Today, ${time}`;
  return date.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const ACTIVE_STATUS_LABELS: Record<string, string> = {
  DRIVER_ASSIGNED: 'Assigned',
  DRIVER_EN_ROUTE: 'En route to pickup',
  DRIVER_ARRIVED: 'Arrived at pickup',
  IN_PROGRESS: 'Service in progress',
};

function activeStatusLabel(status: string) {
  return ACTIVE_STATUS_LABELS[status] ?? status.replace(/_/g, ' ').toLowerCase();
}

function serviceTitle(job: DriverJobBooking) {
  const label = (job.serviceLabel ?? '').trim();
  if (label) return label;
  return job.bookingType === 'towing' ? 'Towing request' : 'Driver request';
}

function JobGlyph({
  job,
  px,
  size = 24,
}: {
  job: DriverJobBooking;
  px: (value: number) => number;
  size?: number;
}) {
  if (job.bookingType === 'towing') {
    return (
      <Image
        source={images.icons.towing}
        style={{ width: px(size), height: px(size * 0.8) }}
        resizeMode="contain"
      />
    );
  }
  return <Car size={px(size)} color={C.ink} strokeWidth={2} />;
}

function RouteSpine({ px }: { px: (value: number) => number }) {
  return (
    <View style={{ width: px(18), alignItems: 'center', paddingTop: px(3) }}>
      <View
        style={{ width: px(11), height: px(11), borderRadius: px(6), backgroundColor: C.blue }}
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
  );
}

function RequestJobCard({
  job,
  px,
  accepting,
  declining,
  onAccept,
  onDecline,
}: {
  job: DriverJobBooking;
  px: (value: number) => number;
  accepting: boolean;
  declining: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const pickup = addressOf(job.pickup?.address || job.pickup?.label);
  const drop = addressOf(job.dropoff?.address || job.dropoff?.label);
  const busy = accepting || declining;

  return (
    <View
      style={{
        backgroundColor: C.card,
        borderRadius: px(R.innerCard),
        borderWidth: 1,
        borderColor: C.amberBorder,
        padding: px(12),
        marginBottom: px(10),
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: px(40),
            height: px(40),
            borderRadius: px(20),
            backgroundColor: C.amberTileSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <JobGlyph job={job} px={px} size={24} />
        </View>

        <View style={{ flex: 1, marginLeft: px(10) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  backgroundColor: C.bluePill,
                  borderRadius: px(R.pill),
                  paddingHorizontal: px(7),
                  paddingVertical: px(2),
                  marginRight: px(6),
                }}>
                <Text style={[T.pill, { fontSize: px(10), lineHeight: px(13), color: C.blue }]}>
                  NEW
                </Text>
              </View>
              <Text
                numberOfLines={1}
                style={[T.jobTitle, { fontSize: px(13.5), color: C.inkSoft }]}>
                #{job.bookingNumber}
              </Text>
            </View>
            {job.distanceKm != null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MapPin size={px(12)} color={C.green} strokeWidth={2.6} />
                <Text
                  style={[
                    T.distance,
                    { fontSize: px(12.5), lineHeight: px(16), color: C.green, marginLeft: px(3) },
                  ]}>
                  {job.distanceKm} km away
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <Text
        numberOfLines={1}
        style={[
          T.jobTitle,
          { fontSize: px(14.5), lineHeight: px(19), color: C.ink, marginTop: px(8) },
        ]}>
        {serviceTitle(job)}
      </Text>

      {pickup || drop ? (
        <View style={{ flexDirection: 'row', marginTop: px(7) }}>
          <RouteSpine px={px} />
          <View style={{ flex: 1, marginLeft: px(9) }}>
            {pickup ? (
              <Text
                numberOfLines={1}
                style={[T.body, { fontSize: px(13), color: C.inkSoft }]}>
                {pickup}
              </Text>
            ) : null}
            {drop ? (
              <Text
                numberOfLines={1}
                style={[T.body, { fontSize: px(13), color: C.inkSoft, marginTop: px(6) }]}>
                {drop}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {job.createdAt ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: px(6),
            paddingLeft: px(24),
          }}>
          <CalendarDays size={px(13)} color={C.greySoft} strokeWidth={2.2} />
          <Text
            style={[
              T.meta,
              { fontSize: px(12), lineHeight: px(16), color: C.greySoft, marginLeft: px(6) },
            ]}>
            {formatWhen(job.createdAt)}
          </Text>
        </View>
      ) : null}

      {job.estimatedFare != null ? (
        <View style={{ marginTop: px(8), paddingLeft: px(24) }}>
          <Text style={[T.metricValue, { fontSize: px(22), lineHeight: px(26), color: C.ink }]}>
            {formatInr(job.estimatedFare)}
          </Text>
          <Text
            style={[
              T.small,
              { fontSize: px(11.5), lineHeight: px(15), color: C.greySoft, marginTop: px(1) },
            ]}>
            Estimated earnings
          </Text>
        </View>
      ) : null}

      {/* Action buttons in one line side-by-side */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: px(10) }}>
        <Pressable
          onPress={onDecline}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Decline trip ${job.bookingNumber}`}
          style={({ pressed }) => ({
            flex: 1,
            height: px(40),
            borderRadius: px(R.button),
            backgroundColor: C.light,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: px(10),
            opacity: pressed ? 0.85 : 1,
          })}>
          {declining ? (
            <ActivityIndicator size="small" color={C.grey} />
          ) : (
            <Text
              style={[
                T.button,
                { fontSize: px(14.5), fontWeight: '600', color: busy ? C.greySoft : C.grey },
              ]}>
              Decline
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={onAccept}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Accept trip ${job.bookingNumber}`}
          style={({ pressed }) => ({
            flex: 1.5,
            height: px(40),
            borderRadius: px(R.button),
            backgroundColor: busy ? C.amberBorder : C.amber,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.9 : 1,
          })}>
          {accepting ? (
            <ActivityIndicator size="small" color={C.ink} />
          ) : (
            <Text style={[T.button, { fontSize: px(15), fontWeight: '700', color: C.ink }]}>
              Accept trip
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function ActiveJobRow({
  job,
  px,
  onOpen,
}: {
  job: DriverJobBooking;
  px: (value: number) => number;
  onOpen: () => void;
}) {
  const pickup = addressOf(job.pickup?.address || job.pickup?.label);
  const drop = addressOf(job.dropoff?.address || job.dropoff?.label);
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Open active job ${job.bookingNumber}`}
      style={({ pressed }) => ({
        backgroundColor: C.card,
        borderRadius: px(R.card),
        borderWidth: 1,
        borderColor: C.greenCardBorder,
        padding: px(14),
        marginBottom: px(12),
        opacity: pressed ? 0.95 : 1,
      })}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: px(46),
            height: px(46),
            borderRadius: px(23),
            backgroundColor: C.greenTile,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <JobGlyph job={job} px={px} size={26} />
        </View>
        <View style={{ flex: 1, marginLeft: px(12) }}>
          <Text
            numberOfLines={1}
            style={[T.jobTitle, { fontSize: px(14.5), color: C.ink }]}>
            #{job.bookingNumber}
          </Text>
          <Text
            numberOfLines={1}
            style={[T.meta, { fontSize: px(12.5), color: C.green, marginTop: px(2) }]}>
            {activeStatusLabel(job.status)}
          </Text>
        </View>
      </View>
      <Text
        numberOfLines={1}
        style={[
          T.jobTitle,
          { fontSize: px(15), lineHeight: px(20), color: C.ink, marginTop: px(10) },
        ]}>
        {serviceTitle(job)}
      </Text>
      {pickup || drop ? (
        <Text numberOfLines={1} style={[T.body, { fontSize: px(13), color: C.greySoft, marginTop: px(4) }]}>
          {[pickup, drop].filter(Boolean).join('  →  ')}
        </Text>
      ) : null}
    </Pressable>
  );
}

function DoneJobRow({
  job,
  px,
  expanded,
  onOpen,
  onViewSummary,
}: {
  job: DriverJobBooking;
  px: (value: number) => number;
  expanded: boolean;
  onOpen: () => void;
  onViewSummary: () => void;
}) {
  const pickup = addressOf(job.pickup?.address || job.pickup?.label) || 'Pickup point';
  const drop = addressOf(job.dropoff?.address || job.dropoff?.label) || 'Drop location';
  const cancelled = isCancelledBookingStatus(job.status);
  const earned = jobEarnings(job);
  const completedEntry = [...(job.statusHistory ?? [])]
    .reverse()
    .find(entry => entry.status === 'COMPLETED');

  return (
    <View
      style={{
        backgroundColor: C.card,
        borderRadius: px(R.card),
        borderWidth: 1,
        borderColor: expanded ? C.amberBorder : C.hairline,
        marginBottom: px(12),
        overflow: 'hidden',
      }}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} details for job ${job.bookingNumber}`}
        style={({ pressed }) => ({
          padding: px(14),
          opacity: pressed ? 0.95 : 1,
        })}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: px(40),
              height: px(40),
              borderRadius: px(20),
              backgroundColor: C.creamRow,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <JobGlyph job={job} px={px} size={20} />
          </View>
          <View style={{ flex: 1, marginLeft: px(12) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[T.jobTitle, { fontSize: px(14.5), color: C.ink }]}>
                #{job.bookingNumber}
              </Text>
              <View
                style={{
                  height: px(M.rowPillHeight),
                  paddingHorizontal: px(9),
                  borderRadius: px(R.pill),
                  backgroundColor: cancelled ? C.redPill : C.greenPill,
                  justifyContent: 'center',
                }}>
                <Text
                  style={[
                    T.pill,
                    { fontSize: px(11.5), color: cancelled ? C.red : C.green, fontWeight: '700' },
                  ]}>
                  {cancelled ? 'Cancelled' : 'Completed'}
                </Text>
              </View>
            </View>
            <Text
              numberOfLines={1}
              style={[T.meta, { fontSize: px(12.5), color: C.greySoft, marginTop: px(2) }]}>
              {serviceTitle(job)} • {formatWhen(job.createdAt) || 'Recent'}
            </Text>
          </View>
        </View>

        {/* Route preview snippet */}
        <View style={{ marginTop: px(10), flexDirection: 'row', alignItems: 'center' }}>
          <MapPin size={px(13)} color={C.blue} strokeWidth={2.4} />
          <Text
            numberOfLines={1}
            style={[T.body, { flex: 1, fontSize: px(12.5), color: C.inkSoft, marginLeft: px(6) }]}>
            {pickup}
          </Text>
          {drop && drop !== 'Drop location' ? (
            <>
              <Text style={{ marginHorizontal: px(4), color: C.greySoft, fontSize: px(12) }}>→</Text>
              <Text
                numberOfLines={1}
                style={[T.body, { flex: 1, fontSize: px(12.5), color: C.inkSoft }]}>
                {drop}
              </Text>
            </>
          ) : null}
        </View>

        {/* Fare row & expand toggle */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: px(10),
            paddingTop: px(8),
            borderTopWidth: 1,
            borderTopColor: C.hairline,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {earned != null ? (
              <Text style={[T.jobTitle, { fontSize: px(15), color: C.green, fontWeight: '700' }]}>
                {formatInr(earned)}
              </Text>
            ) : null}
            {job.distanceKm != null ? (
              <Text
                style={[
                  T.meta,
                  { fontSize: px(12), color: C.greySoft, marginLeft: earned != null ? px(8) : 0 },
                ]}>
                {job.distanceKm} km
              </Text>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[T.link, { fontSize: px(12), color: C.grey }]}>
              {expanded ? 'Hide details' : 'Trip details'}
            </Text>
            {expanded ? (
              <ChevronUp size={px(16)} color={C.grey} strokeWidth={2.2} style={{ marginLeft: px(4) }} />
            ) : (
              <ChevronDown size={px(16)} color={C.grey} strokeWidth={2.2} style={{ marginLeft: px(4) }} />
            )}
          </View>
        </View>
      </Pressable>

      {/* Expanded detailed trip view */}
      {expanded ? (
        <View
          style={{
            paddingHorizontal: px(14),
            paddingBottom: px(14),
            backgroundColor: '#FAFAFA',
            borderTopWidth: 1,
            borderTopColor: C.hairline,
          }}>
          <View style={{ paddingTop: px(10), gap: px(8) }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ width: px(18), alignItems: 'center', paddingTop: px(2) }}>
                <MapPin size={px(14)} color={C.blue} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1, marginLeft: px(8) }}>
                <Text style={[T.small, { fontSize: px(11), color: C.greySoft }]}>Pickup point</Text>
                <Text style={[T.body, { fontSize: px(13), color: C.ink, marginTop: px(1) }]}>
                  {pickup}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ width: px(18), alignItems: 'center', paddingTop: px(2) }}>
                <MapPin size={px(14)} color={C.amberText} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1, marginLeft: px(8) }}>
                <Text style={[T.small, { fontSize: px(11), color: C.greySoft }]}>Drop-off point</Text>
                <Text style={[T.body, { fontSize: px(13), color: C.ink, marginTop: px(1) }]}>
                  {drop}
                </Text>
              </View>
            </View>

            {job.createdAt ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: px(18), alignItems: 'center' }}>
                  <CalendarDays size={px(13)} color={C.greySoft} strokeWidth={2.2} />
                </View>
                <Text style={[T.body, { fontSize: px(12.5), color: C.grey, marginLeft: px(8) }]}>
                  Requested: {formatWhen(job.createdAt)}
                </Text>
              </View>
            ) : null}

            {completedEntry ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: px(18), alignItems: 'center' }}>
                  <Clock3 size={px(13)} color={C.green} strokeWidth={2.2} />
                </View>
                <Text style={[T.body, { fontSize: px(12.5), color: C.grey, marginLeft: px(8) }]}>
                  Finished: {formatWhen(completedEntry.timestamp)}
                </Text>
              </View>
            ) : null}

            {job.customer?.name ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: px(18), alignItems: 'center' }}>
                  <User size={px(13)} color={C.greySoft} strokeWidth={2.2} />
                </View>
                <Text style={[T.body, { fontSize: px(12.5), color: C.grey, marginLeft: px(8) }]}>
                  Customer: {job.customer.name}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Metrics summary */}
          <View
            style={{
              flexDirection: 'row',
              marginTop: px(12),
              padding: px(10),
              borderRadius: px(R.innerCard),
              backgroundColor: C.white,
              borderWidth: 1,
              borderColor: C.hairline,
            }}>
            {job.distanceKm != null ? (
              <View style={{ flex: 1 }}>
                <Text style={[T.small, { fontSize: px(11), color: C.greySoft }]}>Distance</Text>
                <Text style={[T.jobTitle, { fontSize: px(14), color: C.ink, marginTop: px(2) }]}>
                  {job.distanceKm} km
                </Text>
              </View>
            ) : null}
            {earned != null ? (
              <View style={{ flex: 1 }}>
                <Text style={[T.small, { fontSize: px(11), color: C.greySoft }]}>Earnings</Text>
                <Text style={[T.jobTitle, { fontSize: px(14), color: C.green, marginTop: px(2) }]}>
                  {formatInr(earned)}
                </Text>
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={[T.small, { fontSize: px(11), color: C.greySoft }]}>Status</Text>
              <Text
                style={[
                  T.jobTitle,
                  { fontSize: px(14), color: cancelled ? C.red : C.green, marginTop: px(2) },
                ]}>
                {cancelled ? 'Cancelled' : 'Completed'}
              </Text>
            </View>
          </View>

          {/* Full view button */}
          <Pressable
            onPress={onViewSummary}
            accessibilityRole="button"
            accessibilityLabel={`View full summary for trip ${job.bookingNumber}`}
            style={({ pressed }) => ({
              height: px(38),
              borderRadius: px(R.button),
              backgroundColor: C.amber,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: px(12),
              opacity: pressed ? 0.9 : 1,
            })}>
            <Text style={[T.button, { fontSize: px(13.5), fontWeight: '700', color: C.ink }]}>
              View trip receipt & summary
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function JobsCount({
  count,
  label,
  px,
}: {
  count: number;
  label: 'ready to accept' | 'active trip';
  px: (value: number) => number;
}) {
  const isReady = label === 'ready to accept';
  const Icon = isReady ? Inbox : Navigation;
  const iconColor = isReady ? C.amberText : C.blue;
  const iconBg = isReady ? C.amberTile : C.bluePill;

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: px(10),
        paddingVertical: px(6),
      }}>
      <View
        style={{
          width: px(34),
          height: px(34),
          borderRadius: px(10),
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon size={px(17)} color={iconColor} strokeWidth={2.4} />
      </View>
      <View style={{ marginLeft: px(10) }}>
        <Text style={[T.metricValue, { fontSize: px(18), lineHeight: px(22), color: C.ink }]}>
          {count}
        </Text>
        <Text
          style={[
            T.small,
            {
              fontSize: px(11),
              lineHeight: px(14),
              fontWeight: '600',
              color: C.grey,
              textTransform: 'uppercase',
              letterSpacing: 0.3,
              marginTop: px(1),
            },
          ]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

export default function DriverJobsScreen({ navigation }: Props) {
  const px = useScreenPx();
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading: profileLoading } = useDriverProfileQuery(true);
  const isApproved = buildDriverVerification(profile).isApproved;
  const {
    data: jobs = [],
    isLoading: jobsLoading,
    isError: jobsError,
    refetch: refetchJobs,
  } = useDriverJobsQuery(isApproved);
  const {
    data: offers = [],
    isLoading: offersLoading,
    isError: offersError,
    refetch: refetchOffers,
  } = useDriverJobOffersQuery(isApproved);
  const {
    data: activeJob,
    isLoading: activeLoading,
    isError: activeError,
    refetch: refetchActive,
  } = useDriverActiveJobQuery(isApproved);
  const acceptMutation = useAcceptDriverJobMutation();
  const rejectMutation = useRejectDriverJobMutation();

  const [segment, setSegment] = useState<Segment>('available');
  const [pendingAcceptId, setPendingAcceptId] = useState<string | null>(null);
  const [pendingDeclineId, setPendingDeclineId] = useState<string | null>(null);
  const [expandedDoneId, setExpandedDoneId] = useState<string | null>(null);
  const initialLoading = profileLoading || jobsLoading || offersLoading || activeLoading;
  const hasQueryError = jobsError || offersError || activeError;

  const retryQueries = useCallback(() => {
    void Promise.all([refetchJobs(), refetchOffers(), refetchActive()]);
  }, [refetchActive, refetchJobs, refetchOffers]);

  const activeJobs = useMemo(() => {
    const list = jobs.filter(job => isActiveBookingStatus(job.status));
    if (activeJob && !list.some(job => job.id === activeJob.id)) {
      return [activeJob, ...list];
    }
    return list;
  }, [activeJob, jobs]);

  const doneJobs = useMemo(
    () =>
      jobs
        .filter(job => isClosedBookingStatus(job.status))
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [jobs],
  );

  const openActiveJob = useCallback(
    (job: DriverJobBooking) => {
      navigation.navigate('PartnerActiveJob', {
        bookingId: job.id,
        bookingType: job.bookingType,
      });
    },
    [navigation],
  );

  const onAccept = useCallback(
    async (job: DriverJobBooking) => {
      if (pendingAcceptId || pendingDeclineId) return;
      setPendingAcceptId(job.id);
      try {
        // The active job opens only after the API confirms the accept.
        await acceptMutation.mutateAsync({ bookingId: job.id, bookingType: job.bookingType });
        await refetchJobs();
        navigation.navigate('PartnerActiveJob', {
          bookingId: job.id,
          bookingType: job.bookingType,
        });
      } catch (error) {
        Alert.alert('Accept failed', getApiErrorMessage(error, 'Could not accept this trip'));
      } finally {
        setPendingAcceptId(null);
      }
    },
    [acceptMutation, navigation, pendingAcceptId, pendingDeclineId, refetchJobs],
  );

  const onDecline = useCallback(
    (job: DriverJobBooking) => {
      if (pendingAcceptId || pendingDeclineId) return;
      Alert.alert('Decline trip', `Remove request #${job.bookingNumber} from your list?`, [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            setPendingDeclineId(job.id);
            void rejectMutation
              .mutateAsync({ bookingId: job.id, bookingType: job.bookingType })
              .catch(error => {
                Alert.alert(
                  'Decline failed',
                  getApiErrorMessage(error, 'Could not decline this trip'),
                );
              })
              .finally(() => setPendingDeclineId(null));
          },
        },
      ]);
    },
    [pendingAcceptId, pendingDeclineId, rejectMutation],
  );

  const segments: Array<{ id: Segment; label: string; count: number }> = [
    { id: 'available', label: 'Available', count: offers.length },
    { id: 'active', label: 'Active', count: activeJobs.length },
    { id: 'done', label: 'Done', count: doneJobs.length },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      {/* fixed header ------------------------------------------------- */}
      <View
        style={{
          paddingTop: insets.top + px(6),
          paddingHorizontal: px(M.pagePadding),
          paddingBottom: px(6),
          backgroundColor: C.pageBg,
          borderBottomWidth: 1,
          borderBottomColor: C.hairline,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
        }}>
        <View>
          <Text
            style={[
              T.greeting,
              {
                fontSize: px(22),
                lineHeight: px(28),
                color: C.ink,
                letterSpacing: -0.3,
              },
            ]}>
            Jobs
          </Text>
          <Text
            style={[
              T.subtitle,
              { fontSize: px(12.5), lineHeight: px(16), color: C.grey, marginTop: px(1) },
            ]}>
            Trips approved for you
          </Text>
        </View>

        <Pressable
          onPress={openPartnerNotifications}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          style={{
            width: px(36),
            height: px(36),
            borderRadius: px(18),
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.hairline,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Bell size={px(18)} color={C.ink} strokeWidth={2} />
          {offers.length > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: px(6),
                right: px(7),
                width: px(8),
                height: px(8),
                borderRadius: px(4),
                backgroundColor: C.red,
                borderWidth: px(1.5),
                borderColor: C.card,
              }}
            />
          ) : null}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: px(24) }}>
        {/* counts ------------------------------------------------------- */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: px(8),
            marginHorizontal: px(M.pagePadding),
            borderRadius: px(R.innerCard),
            borderWidth: 1,
            borderColor: C.hairline,
            backgroundColor: C.card,
            paddingVertical: px(4),
            paddingHorizontal: px(6),
          }}>
          <JobsCount label="ready to accept" count={offers.length} px={px} />
          <View style={{ width: 1, height: px(20), backgroundColor: C.hairline }} />
          <JobsCount label="active trip" count={activeJobs.length} px={px} />
        </View>

        {/* segmented tabs ----------------------------------------------- */}
        <View
          style={{
            flexDirection: 'row',
            marginTop: px(12),
            marginHorizontal: px(M.pagePadding),
            padding: px(4),
            borderRadius: px(14),
            backgroundColor: '#F1F5F9',
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }}>
          {segments.map(item => {
            const selected = item.id === segment;
            return (
              <Pressable
                key={item.id}
                onPress={() => setSegment(item.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={({ pressed }) => ({
                  flex: 1,
                  height: px(36),
                  paddingHorizontal: px(4),
                  borderRadius: px(10),
                  backgroundColor: selected ? C.card : 'transparent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: selected ? 1 : 0,
                  borderColor: selected ? 'rgba(0,0,0,0.06)' : 'transparent',
                  ...(selected
                    ? {
                        shadowColor: '#0F172A',
                        shadowOpacity: 0.08,
                        shadowRadius: 4,
                        shadowOffset: { width: 0, height: 1.5 },
                        elevation: 2,
                      }
                    : {}),
                  opacity: pressed ? 0.9 : 1,
                })}>
                <Text
                  style={{
                    fontSize: px(13),
                    lineHeight: px(17),
                    fontWeight: selected ? '700' : '600',
                    color: selected ? C.ink : '#64748B',
                  }}>
                  {item.label}
                </Text>
                <View
                  style={{
                    marginLeft: px(5),
                    paddingHorizontal: px(6),
                    paddingVertical: px(1.5),
                    borderRadius: px(10),
                    backgroundColor: selected ? C.amberTile : 'rgba(100, 116, 139, 0.12)',
                  }}>
                  <Text
                    style={{
                      fontSize: px(10.5),
                      lineHeight: px(13),
                      fontWeight: '700',
                      color: selected ? C.amberText : '#64748B',
                    }}>
                    {item.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* list --------------------------------------------------------- */}
        <View style={{ paddingHorizontal: px(M.pagePadding), marginTop: px(12) }}>
          {initialLoading ? (
            <JobsSkeleton px={px} />
          ) : !isApproved ? (
            <JobsApprovalState px={px} />
          ) : hasQueryError ? (
            <JobsErrorState px={px} onRetry={retryQueries} />
          ) : segment === 'available' ? (
            offers.length === 0 ? (
              <EmptyState
                type="available"
                title="No open requests"
                subtitle="New towing and roadside requests will appear here."
                px={px}
                onRefresh={retryQueries}
              />
            ) : (
              offers.map(job => (
                <RequestJobCard
                  key={`${job.bookingType}-${job.id}`}
                  job={job}
                  px={px}
                  accepting={pendingAcceptId === job.id}
                  declining={pendingDeclineId === job.id}
                  onAccept={() => void onAccept(job)}
                  onDecline={() => onDecline(job)}
                />
              ))
            )
          ) : segment === 'active' ? (
            activeJobs.length === 0 ? (
              <EmptyState
                type="active"
                title="No active trip"
                subtitle="Accept a request to start your next trip."
                px={px}
                onRefresh={retryQueries}
              />
            ) : (
              activeJobs.map(job => (
                <ActiveJobRow
                  key={`${job.bookingType}-${job.id}`}
                  job={job}
                  px={px}
                  onOpen={() => openActiveJob(job)}
                />
              ))
            )
          ) : doneJobs.length === 0 ? (
            <EmptyState
              type="done"
              title="No completed jobs yet"
              subtitle="Your finished trips and earnings will be listed here."
              px={px}
            />
          ) : (
            doneJobs.map(job => (
              <DoneJobRow
                key={`${job.bookingType}-${job.id}`}
                job={job}
                px={px}
                expanded={expandedDoneId === job.id}
                onOpen={() => setExpandedDoneId(current => (current === job.id ? null : job.id))}
                onViewSummary={() => openActiveJob(job)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function JobsErrorState({
  px,
  onRetry,
}: {
  px: (value: number) => number;
  onRetry: () => void;
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: px(40) }}>
      <View
        style={{
          width: px(56),
          height: px(56),
          borderRadius: px(28),
          backgroundColor: C.cream,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <TriangleAlert size={px(24)} color={C.amberText} strokeWidth={2.2} />
      </View>
      <Text style={[T.cardTitle, { fontSize: px(16), color: C.ink, marginTop: px(14) }]}>
        Couldn’t load jobs
      </Text>
      <Text
        style={[
          T.cardSubtitle,
          { fontSize: px(13), color: C.grey, marginTop: px(6), textAlign: 'center' },
        ]}>
        Check your connection and try again.
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        style={{
          height: px(40),
          paddingHorizontal: px(20),
          borderRadius: px(R.button),
          backgroundColor: C.amber,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: px(16),
        }}>
        <Text style={[T.button, { fontSize: px(14), color: C.ink }]}>Try again</Text>
      </Pressable>
    </View>
  );
}

function JobsApprovalState({ px }: { px: (value: number) => number }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: px(40) }}>
      <View
        style={{
          width: px(56),
          height: px(56),
          borderRadius: px(28),
          backgroundColor: C.amberTile,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <TriangleAlert size={px(24)} color={C.amberText} strokeWidth={2.2} />
      </View>
      <Text style={[T.cardTitle, { fontSize: px(16), color: C.ink, marginTop: px(14) }]}>
        Jobs unlock after approval
      </Text>
      <Text
        style={[
          T.cardSubtitle,
          { fontSize: px(13), color: C.grey, marginTop: px(6), textAlign: 'center' },
        ]}>
        Your account is still under review. You can view the dashboard while RACE verifies your documents.
      </Text>
    </View>
  );
}

function EmptyState({
  type,
  title,
  subtitle,
  px,
  onRefresh,
}: {
  type: 'available' | 'active' | 'done';
  title: string;
  subtitle: string;
  px: (value: number) => number;
  onRefresh?: () => void;
}) {
  const Icon = type === 'available' ? Inbox : type === 'active' ? Navigation : CheckCircle2;
  const iconColor = type === 'available' ? C.amberText : type === 'active' ? C.blue : C.green;
  const iconBg = type === 'available' ? C.amberTile : type === 'active' ? C.bluePill : C.greenPill;

  return (
    <View
      style={{
        alignItems: 'center',
        paddingVertical: px(36),
        paddingHorizontal: px(20),
        marginTop: px(8),
        borderRadius: px(R.card),
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.hairline,
      }}>
      <View
        style={{
          width: px(60),
          height: px(60),
          borderRadius: px(30),
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: px(14),
        }}>
        <Icon size={px(26)} color={iconColor} strokeWidth={2.2} />
      </View>
      <Text
        style={[
          T.sectionTitle,
          { fontSize: px(16.5), lineHeight: px(21), color: C.ink, textAlign: 'center' },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          T.cardSubtitle,
          {
            fontSize: px(13),
            lineHeight: px(18),
            color: C.grey,
            marginTop: px(6),
            textAlign: 'center',
            maxWidth: px(280),
          },
        ]}>
        {subtitle}
      </Text>
      {onRefresh ? (
        <Pressable
          onPress={onRefresh}
          accessibilityRole="button"
          accessibilityLabel="Check for requests"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            height: px(38),
            paddingHorizontal: px(16),
            borderRadius: px(R.pill),
            backgroundColor: C.light,
            borderWidth: 1,
            borderColor: C.hairline,
            marginTop: px(16),
            opacity: pressed ? 0.85 : 1,
          })}>
          <RefreshCw size={px(13)} color={C.grey} strokeWidth={2.4} />
          <Text style={[T.link, { fontSize: px(13), color: C.ink, marginLeft: px(6) }]}>
            Check for requests
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function JobsSkeleton({ px }: { px: (value: number) => number }) {
  return (
    <View accessibilityLabel="Loading jobs" style={{ paddingTop: px(4) }}>
      {[0, 1, 2].map(index => (
        <View
          key={index}
          style={{
            height: px(index === 0 ? 204 : index === 1 ? 148 : 110),
            marginBottom: px(12),
            padding: px(14),
            borderRadius: px(R.card),
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.hairline,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: px(40),
                height: px(40),
                borderRadius: px(12),
                backgroundColor: C.light,
              }}
            />
            <View style={{ flex: 1, marginLeft: px(12) }}>
              <View style={{ width: '42%', height: px(12), borderRadius: px(6), backgroundColor: C.light }} />
              <View
                style={{
                  width: '68%',
                  height: px(10),
                  borderRadius: px(5),
                  backgroundColor: C.light,
                  marginTop: px(8),
                }}
              />
            </View>
          </View>
          <View style={{ width: '60%', height: px(14), borderRadius: px(7), backgroundColor: C.light, marginTop: px(14) }} />
          <View style={{ width: '84%', height: px(10), borderRadius: px(5), backgroundColor: C.light, marginTop: px(10) }} />
          {index === 0 ? (
            <View style={{ flexDirection: 'row', marginTop: px(16) }}>
              <View style={{ flex: 1, height: px(38), borderRadius: px(R.button), backgroundColor: C.light }} />
              <View style={{ flex: 1.5, height: px(38), borderRadius: px(R.button), backgroundColor: C.light, marginLeft: px(10) }} />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}
