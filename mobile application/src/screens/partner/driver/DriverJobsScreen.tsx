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
import { Bell, CalendarDays, Car, MapPin } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PartnerHeaderLogo from '../../../components/partner/PartnerHeaderLogo';
import { openPartnerNotifications } from '../../../navigation/partnerNavigationRef';
import { images } from '../../../assets';
import { useScreenPx } from '../../../hooks/useScreenPx';
import { getApiErrorMessage } from '../../../services/auth/useAuthMutations';
import {
  useAcceptDriverJobMutation,
  useDriverActiveJobQuery,
  useDriverJobOffersQuery,
  useDriverJobsQuery,
  useRejectDriverJobMutation,
} from '../../../services/driver/useDriverQueries';
import type { DriverJobBooking } from '../../../services/driver/driverApi';
import type { PartnerJobsStackParamList } from '../../../types/partnerNavigation';
import { formatReadableAddress } from '../../../utils/readableAddress';
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
  driverShadow,
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
        borderRadius: px(R.card),
        borderWidth: 1,
        borderColor: C.amberBorder,
        padding: px(14),
        marginBottom: px(12),
        ...driverShadow,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: px(46),
            height: px(46),
            borderRadius: px(R.tile),
            backgroundColor: C.amberTileSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <JobGlyph job={job} px={px} size={26} />
        </View>

        <View style={{ flex: 1, marginLeft: px(12) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                backgroundColor: C.bluePill,
                borderRadius: px(R.pill),
                paddingHorizontal: px(9),
                paddingVertical: px(3),
                marginRight: px(8),
              }}>
              <Text style={[T.pill, { fontSize: px(10.5), lineHeight: px(13), color: C.blue }]}>
                NEW
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={[T.jobTitle, { flex: 1, fontSize: px(14.5), color: C.inkSoft }]}>
              #{job.bookingNumber}
            </Text>
          </View>
          {job.distanceKm != null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: px(3) }}>
              <MapPin size={px(13)} color={C.green} strokeWidth={2.6} />
              <Text
                style={[
                  T.distance,
                  { fontSize: px(13.5), lineHeight: px(18), color: C.green, marginLeft: px(4) },
                ]}>
                {job.distanceKm} km away
              </Text>
            </View>
          ) : null}
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
        <View style={{ flexDirection: 'row', marginTop: px(10) }}>
          <RouteSpine px={px} />
          <View style={{ flex: 1, marginLeft: px(10) }}>
            {pickup ? (
              <Text
                numberOfLines={1}
                style={[T.body, { fontSize: px(13.5), color: C.inkSoft }]}>
                {pickup}
              </Text>
            ) : null}
            {drop ? (
              <Text
                numberOfLines={1}
                style={[T.body, { fontSize: px(13.5), color: C.inkSoft, marginTop: px(11) }]}>
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
            marginTop: px(10),
            paddingLeft: px(24),
          }}>
          <CalendarDays size={px(15)} color={C.greySoft} strokeWidth={2.2} />
          <Text
            style={[
              T.meta,
              { fontSize: px(13), lineHeight: px(18), color: C.greySoft, marginLeft: px(9) },
            ]}>
            {formatWhen(job.createdAt)}
          </Text>
        </View>
      ) : null}

      {job.estimatedFare != null ? (
        <View style={{ marginTop: px(12), paddingLeft: px(24) }}>
          <Text style={[T.metricValue, { fontSize: px(24), lineHeight: px(29), color: C.ink }]}>
            {formatInr(job.estimatedFare)}
          </Text>
          <Text
            style={[
              T.small,
              { fontSize: px(12), lineHeight: px(16), color: C.greySoft, marginTop: px(1) },
            ]}>
            Estimated earnings
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={onAccept}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={`Accept trip ${job.bookingNumber}`}
        style={({ pressed }) => ({
          height: px(M.ctaHeight),
          marginTop: px(14),
          borderRadius: px(R.button),
          backgroundColor: busy ? C.amberBorder : C.amber,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.94 : 1,
        })}>
        {accepting ? (
          <ActivityIndicator color={C.ink} />
        ) : (
          <Text style={[T.button, { fontSize: px(16), color: C.ink }]}>Accept trip</Text>
        )}
      </Pressable>

      <Pressable
        onPress={onDecline}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={`Decline trip ${job.bookingNumber}`}
        style={{ paddingVertical: px(12), alignItems: 'center', justifyContent: 'center' }}>
        {declining ? (
          <ActivityIndicator color={C.grey} />
        ) : (
          <Text
            style={[
              T.button,
              { fontSize: px(15), color: busy ? C.greySoft : C.grey },
            ]}>
            Decline
          </Text>
        )}
      </Pressable>
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
        ...driverShadow,
      })}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: px(46),
            height: px(46),
            borderRadius: px(R.tile),
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
}: {
  job: DriverJobBooking;
  px: (value: number) => number;
}) {
  const pickup = addressOf(job.pickup?.address || job.pickup?.label);
  const drop = addressOf(job.dropoff?.address || job.dropoff?.label);
  const cancelled = isCancelledBookingStatus(job.status);
  const earned = jobEarnings(job);
  return (
    <View
      style={{
        backgroundColor: C.card,
        borderRadius: px(R.card),
        borderWidth: 1,
        borderColor: C.hairline,
        padding: px(14),
        marginBottom: px(12),
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: px(M.rowIcon),
            height: px(M.rowIcon),
            borderRadius: px(M.rowIcon / 2),
            backgroundColor: C.creamRow,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <JobGlyph job={job} px={px} size={20} />
        </View>
        <View style={{ flex: 1, marginLeft: px(12) }}>
          <Text style={[T.jobTitle, { fontSize: px(14), color: C.ink }]}>
            #{job.bookingNumber}
          </Text>
          <Text
            numberOfLines={1}
            style={[T.meta, { fontSize: px(12.5), color: C.greySoft, marginTop: px(2) }]}>
            {[formatWhen(job.createdAt), pickup].filter(Boolean).join(' • ')}
          </Text>
        </View>
        <View
          style={{
            height: px(M.rowPillHeight),
            paddingHorizontal: px(10),
            borderRadius: px(R.pill),
            backgroundColor: cancelled ? C.redPill : C.greenPill,
            justifyContent: 'center',
          }}>
          <Text
            style={[
              T.pill,
              { fontSize: px(12), color: cancelled ? C.red : C.green },
            ]}>
            {cancelled ? 'Cancelled' : 'Completed'}
          </Text>
        </View>
      </View>
      {earned != null ? (
        <Text
          style={[
            T.jobTitle,
            { fontSize: px(14.5), color: C.ink, marginTop: px(10) },
          ]}>
          {formatInr(earned)}
        </Text>
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
  label: string;
  px: (value: number) => number;
}) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: px(8) }}>
      <View
        style={{
          width: px(28),
          height: px(28),
          borderRadius: px(10),
          backgroundColor: C.amberTile,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View
          style={{
            width: px(8),
            height: px(8),
            borderRadius: px(4),
            backgroundColor: C.amber,
          }}
        />
      </View>
      <View style={{ marginLeft: px(8) }}>
        <Text style={[T.metricValue, { fontSize: px(20), lineHeight: px(23), color: C.ink }]}>
          {count}
        </Text>
        <Text style={[T.small, { fontSize: px(11.5), lineHeight: px(15), color: C.grey }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

export default function DriverJobsScreen({ navigation }: Props) {
  const px = useScreenPx();
  const insets = useSafeAreaInsets();
  const { data: jobs = [], isLoading, refetch } = useDriverJobsQuery(true);
  const { data: offers = [] } = useDriverJobOffersQuery(true);
  const { data: activeJob } = useDriverActiveJobQuery(true);
  const acceptMutation = useAcceptDriverJobMutation();
  const rejectMutation = useRejectDriverJobMutation();

  const [segment, setSegment] = useState<Segment>('available');
  const [pendingAcceptId, setPendingAcceptId] = useState<string | null>(null);
  const [pendingDeclineId, setPendingDeclineId] = useState<string | null>(null);

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
        await refetch();
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
    [acceptMutation, navigation, pendingAcceptId, pendingDeclineId, refetch],
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: px(24) }}>
        {/* header ------------------------------------------------------- */}
        <View
          style={{
            paddingTop: insets.top + px(6),
            paddingHorizontal: px(M.pagePadding),
            paddingBottom: px(4),
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }} />
            <PartnerHeaderLogo width={px(56)} showPartnerText />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Pressable
                onPress={openPartnerNotifications}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                style={{
                  width: px(36),
                  height: px(36),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Bell size={px(22)} color={C.ink} strokeWidth={2} />
                {offers.length > 0 ? (
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
            </View>
          </View>

          <Text
            style={[
              T.greeting,
              {
                fontSize: px(27),
                lineHeight: px(34),
                color: C.ink,
                marginTop: px(10),
                letterSpacing: -0.4,
              },
            ]}>
            Jobs
          </Text>
          <Text
            style={[
              T.subtitle,
              { fontSize: px(14.5), lineHeight: px(20), color: C.grey, marginTop: px(2) },
            ]}>
            Trips approved for you
          </Text>
        </View>

        {/* counts ------------------------------------------------------- */}
        <View
          style={{
            flexDirection: 'row',
            marginTop: px(14),
            marginHorizontal: px(M.pagePadding),
            borderRadius: px(R.card),
            borderWidth: 1,
            borderColor: C.hairline,
            backgroundColor: C.card,
            paddingVertical: px(10),
            paddingHorizontal: px(8),
            ...driverShadow,
          }}>
          <JobsCount label="ready to accept" count={offers.length} px={px} />
          <JobsCount label="active trip" count={activeJobs.length} px={px} />
        </View>

        {/* segments ----------------------------------------------------- */}
        <View
          style={{
            flexDirection: 'row',
            marginTop: px(16),
            marginHorizontal: px(M.pagePadding),
            gap: px(8),
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
                  height: px(34),
                  paddingHorizontal: px(16),
                  borderRadius: px(R.pill),
                  backgroundColor: selected ? C.amber : C.light,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.9 : 1,
                })}>
                <Text
                  style={[
                    T.link,
                    {
                      fontSize: px(13.5),
                      lineHeight: px(18),
                      color: selected ? C.ink : C.grey,
                    },
                  ]}>
                  {item.label} ({item.count})
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* list --------------------------------------------------------- */}
        <View style={{ paddingHorizontal: px(M.pagePadding), marginTop: px(14) }}>
          {isLoading ? (
            <ActivityIndicator color={C.amber} style={{ marginTop: px(28) }} />
          ) : segment === 'available' ? (
            offers.length === 0 ? (
              <EmptyState
                title="No open requests"
                subtitle="New towing and roadside requests will appear here."
                px={px}
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
                title="No active trip"
                subtitle="Accept a request to start your next trip."
                px={px}
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
              title="No completed jobs yet"
              subtitle="Your finished trips and earnings will be listed here."
              px={px}
            />
          ) : (
            doneJobs.map(job => (
              <DoneJobRow key={`${job.bookingType}-${job.id}`} job={job} px={px} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function EmptyState({
  title,
  subtitle,
  px,
}: {
  title: string;
  subtitle: string;
  px: (value: number) => number;
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
        <CalendarDays size={px(24)} color={C.amber} strokeWidth={2.2} />
      </View>
      <Text
        style={[
          T.cardTitle,
          { fontSize: px(16), color: C.ink, marginTop: px(14), textAlign: 'center' },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          T.cardSubtitle,
          { fontSize: px(13), color: C.grey, marginTop: px(6), textAlign: 'center' },
        ]}>
        {subtitle}
      </Text>
    </View>
  );
}
