import { PartnerText } from '../../../components/partner/PartnerText';
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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Linking, Pressable, ScrollView, View } from 'react-native';
import {
  ArrowRight,
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
  Phone,
  RefreshCw,
  Route,
  TriangleAlert,
  Truck,
  User,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openPartnerNotifications } from '../../../navigation/partnerNavigationRef';
import PartnerHeaderLogo from '../../../components/partner/PartnerHeaderLogo';
import { images } from '../../../assets';
import { useScreenPx } from '../../../hooks/useScreenPx';
import { usePartnerDialog } from '../../../hooks/usePartnerDialog';
import { getApiErrorMessage } from '../../../services/auth/useAuthMutations';
import {
  useAcceptDriverJobMutation,
  useDriverActiveJobQuery,
  useDriverJobOffersQuery,
  useDriverJobsQuery,
  useDriverProfileQuery,
  useRejectDriverJobMutation,
  useRefreshDriverDataOnFocus,
} from '../../../services/driver/useDriverQueries';
import { useNotificationsQuery } from '../../../services/useNotificationQueries';
import type { DriverJobBooking } from '../../../services/driver/driverApi';
import type { PartnerJobsStackParamList } from '../../../types/partnerNavigation';
import { formatReadableAddress } from '../../../utils/readableAddress';
import { assertDriverCanAcceptJobs, buildDriverVerification } from '../../../utils/driverVerification';
import { getDriverAcceptLocationGate, pickupCoordsFromJob } from '../../../utils/driverLocationGuide';
import { UI_PREVIEW_MODE } from '../../../constants/preview';
import { useAppSelector } from '../../../redux/hooks';
import {
  useDriverPresenceStore,
} from '../../../store/driverPresenceStore';
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

type JobsListRoute = RouteProp<PartnerJobsStackParamList, 'PartnerJobsList'>;

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
  hasActiveJob = false,
  onAccept,
  onDecline,
}: {
  job: DriverJobBooking;
  px: (value: number) => number;
  accepting: boolean;
  declining: boolean;
  hasActiveJob?: boolean;
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
        borderWidth: 1.25,
        borderColor: C.amberBorder,
        padding: px(12),
        marginBottom: px(10),
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: px(M.jobTile),
            height: px(M.jobTile),
            borderRadius: px(R.tile),
            backgroundColor: C.amberTileSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <JobGlyph job={job} px={px} size={20} />
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
                <PartnerText style={[T.pill, { fontSize: px(10), lineHeight: px(13), color: C.blue }]}>
                  NEW
                </PartnerText>
              </View>
              <PartnerText
                numberOfLines={1}
                style={[T.jobTitle, { fontSize: px(11.5), lineHeight: px(15), color: C.inkSoft }]}>
                #{job.bookingNumber}
              </PartnerText>
            </View>
            {job.distanceKm != null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MapPin size={px(12)} color={C.green} strokeWidth={2.6} />
                <PartnerText
                  style={[
                    T.distance,
                    { fontSize: px(11.5), lineHeight: px(15), color: C.green, marginLeft: px(3) },
                  ]}>
                  {job.distanceKm} km away
                </PartnerText>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <PartnerText
        numberOfLines={1}
        style={[
          T.jobTitle,
          { fontSize: px(14), lineHeight: px(18), color: C.ink, marginTop: px(6) },
        ]}>
        {serviceTitle(job)}
      </PartnerText>

      {pickup || drop ? (
        <View style={{ flexDirection: 'row', marginTop: px(6) }}>
          <RouteSpine px={px} />
          <View style={{ flex: 1, marginLeft: px(9) }}>
            {pickup ? (
              <PartnerText
                numberOfLines={1}
                style={[T.body, { fontSize: px(12), lineHeight: px(16), color: C.inkSoft }]}>
                {pickup}
              </PartnerText>
            ) : null}
            {drop ? (
              <PartnerText
                numberOfLines={1}
                style={[T.body, { fontSize: px(12), lineHeight: px(16), color: C.inkSoft, marginTop: px(4) }]}>
                {drop}
              </PartnerText>
            ) : null}
          </View>
        </View>
      ) : null}

      {job.createdAt ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: px(4),
            paddingLeft: px(24),
          }}>
          <CalendarDays size={px(13)} color={C.greySoft} strokeWidth={2.2} />
          <PartnerText
            style={[
              T.meta,
              { fontSize: px(10.5), lineHeight: px(14), color: C.greySoft, marginLeft: px(6) },
            ]}>
            {formatWhen(job.createdAt)}
          </PartnerText>
        </View>
      ) : null}

      {job.estimatedFare != null ? (
        <View style={{ marginTop: px(6), paddingLeft: px(24) }}>
          <PartnerText style={[T.metricValue, { fontSize: px(18), lineHeight: px(22), color: C.ink }]}>
            {formatInr(job.estimatedFare)}
          </PartnerText>
          <PartnerText
            style={[
              T.small,
              { fontSize: px(10.5), lineHeight: px(14), color: C.greySoft, marginTop: px(1) },
            ]}>
            Estimated earnings
          </PartnerText>
        </View>
      ) : null}

      {/* Action buttons in one line side-by-side */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: px(8) }}>
        <Pressable
          onPress={onDecline}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Decline trip ${job.bookingNumber}`}
          style={({ pressed }) => ({
            flex: 1,
            height: px(48),
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
            <PartnerText
              style={[
                T.button,
                { fontSize: px(14.5), fontWeight: '600', color: busy ? C.greySoft : C.grey },
              ]}>
              Decline
            </PartnerText>
          )}
        </Pressable>

        <Pressable
          onPress={onAccept}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={
            hasActiveJob
              ? `Trip in progress. Finish current trip before accepting #${job.bookingNumber}`
              : `Accept trip ${job.bookingNumber}`
          }
          style={({ pressed }) => ({
            flex: 1.5,
            height: px(48),
            borderRadius: px(R.button),
            backgroundColor: hasActiveJob ? '#E2E8F0' : busy ? C.amberBorder : C.amber,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.9 : 1,
          })}>
          {accepting ? (
            <ActivityIndicator size="small" color={C.ink} />
          ) : (
            <PartnerText
              style={[
                T.button,
                {
                  fontSize: px(14),
                  fontWeight: '700',
                  color: hasActiveJob ? '#64748B' : C.ink,
                },
              ]}>
              {hasActiveJob ? 'Trip In Progress' : 'Accept trip'}
            </PartnerText>
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
  const fare = jobEarnings(job);

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Open active job #${job.bookingNumber}`}
      style={({ pressed }) => ({
        backgroundColor: '#FFFFFF',
        borderRadius: px(R.card),
        borderWidth: 1.5,
        borderColor: '#86EFAC',
        padding: px(14),
        marginBottom: px(12),
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
              backgroundColor: '#ECFDF5',
              paddingHorizontal: px(8),
              paddingVertical: px(3),
              borderRadius: px(12),
              borderWidth: 1,
              borderColor: '#A7F3D0',
            }}>
            <View
              style={{
                width: px(6),
                height: px(6),
                borderRadius: px(3),
                backgroundColor: '#10B981',
                marginRight: px(5),
                flexShrink: 0,
              }}
            />
            <PartnerText
              numberOfLines={1}
              style={{
                fontSize: px(10.5),
                fontWeight: '800',
                color: '#059669',
                letterSpacing: 0.4,
              }}>
              {activeStatusLabel(job.status).toUpperCase()}
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
            #{job.bookingNumber}
          </PartnerText>
        </View>

        {fare != null ? (
          <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
            <PartnerText
              style={{
                fontSize: px(17),
                lineHeight: px(21),
                fontWeight: '800',
                color: '#0F172A',
              }}>
              {formatInr(fare)}
            </PartnerText>
            <PartnerText
              style={{
                fontSize: px(10),
                color: '#64748B',
                fontWeight: '600',
              }}>
              Est. fare
            </PartnerText>
          </View>
        ) : null}
      </View>

      {/* Service Title & Glyphs */}
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
              fontSize: px(14.5),
              fontWeight: '800',
              color: '#0F172A',
            }}>
            {serviceTitle(job)}
          </PartnerText>
          {job.distanceKm != null ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: px(2),
                minWidth: 0,
                flexShrink: 1,
              }}>
              <MapPin size={px(11)} color="#059669" strokeWidth={2.4} />
              <PartnerText
                numberOfLines={1}
                style={{
                  fontSize: px(11.5),
                  fontWeight: '600',
                  color: '#059669',
                  marginLeft: px(3),
                }}>
                {job.distanceKm} km trip
              </PartnerText>
              {job.assignedFleetVehicleLabel ? (
                <PartnerText
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{
                    flexShrink: 1,
                    fontSize: px(11.5),
                    color: '#94A3B8',
                    marginLeft: px(4),
                  }}>
                  • {job.assignedFleetVehicleLabel}
                </PartnerText>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      {/* Route Section: Pickup & Drop */}
      {pickup || drop ? (
        <View
          style={{
            marginTop: px(10),
            backgroundColor: '#F8FAFC',
            borderRadius: px(12),
            padding: px(10),
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }}>
          {pickup ? (
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
                  {pickup}
                </PartnerText>
              </View>
            </View>
          ) : null}

          {pickup && drop ? (
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

          {drop ? (
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
                    fontSize: px(10),
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
                    fontSize: px(12.5),
                    fontWeight: '600',
                    color: '#1E293B',
                    marginTop: px(1),
                  }}>
                  {drop}
                </PartnerText>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Customer info (if available) */}
      {job.customer?.name || job.customer?.mobileNumber ? (
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
              <PartnerText style={{ fontSize: px(12), fontWeight: '700', color: '#1E293B' }}>
                {job.customer?.name || 'Customer'}
              </PartnerText>
              {job.customer?.mobileNumber ? (
                <PartnerText style={{ fontSize: px(11), color: '#64748B' }}>
                  {job.customer.mobileNumber}
                </PartnerText>
              ) : null}
            </View>
          </View>

          {job.customer?.mobileNumber ? (
            <Pressable
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                void Linking.openURL(`tel:${job.customer?.mobileNumber}`);
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
              <Phone size={px(12)} color="#15803D" strokeWidth={2.4} />
              <PartnerText style={{ fontSize: px(11.5), fontWeight: '700', color: '#15803D', marginLeft: px(4) }}>
                Call
              </PartnerText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Primary Action Button (Clear CTA so user knows to click to get access) */}
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Continue active trip #${job.bookingNumber}`}
        style={({ pressed }) => ({
          marginTop: px(12),
          height: px(42),
          borderRadius: px(12),
          backgroundColor:
            job.status === 'DRIVER_ASSIGNED'
              ? pressed ? '#B45309' : '#D97706'
              : pressed ? '#047857' : '#059669',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: job.status === 'DRIVER_ASSIGNED' ? '#D97706' : '#059669',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.18,
          shadowRadius: 4,
          elevation: 2,
        })}>
        <Navigation size={px(15)} color="#FFFFFF" strokeWidth={2.6} style={{ marginRight: px(7) }} />
        <PartnerText
          style={{
            fontSize: px(14),
            fontWeight: '800',
            color: '#FFFFFF',
            letterSpacing: 0.3,
          }}>
          {job.status === 'DRIVER_ASSIGNED'
            ? 'Accept Assignment & Start Navigation'
            : 'Continue Active Trip'}
        </PartnerText>
        <ArrowRight size={px(15)} color="#FFFFFF" strokeWidth={2.6} style={{ marginLeft: px(6) }} />
      </Pressable>
    </Pressable>
  );
}

function DoneJobRow({
  job,
  px,
  expanded,
  onOpen,
}: {
  job: DriverJobBooking;
  px: (value: number) => number;
  expanded: boolean;
  onOpen: () => void;
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
              <PartnerText style={[T.jobTitle, { fontSize: px(14.5), color: C.ink }]}>
                #{job.bookingNumber}
              </PartnerText>
              <View
                style={{
                  height: px(M.rowPillHeight),
                  paddingHorizontal: px(9),
                  borderRadius: px(R.pill),
                  backgroundColor: cancelled ? C.redPill : C.greenPill,
                  justifyContent: 'center',
                }}>
                <PartnerText
                  style={[
                    T.pill,
                    { fontSize: px(11.5), color: cancelled ? C.red : C.green, fontWeight: '700' },
                  ]}>
                  {cancelled ? 'Cancelled' : 'Completed'}
                </PartnerText>
              </View>
            </View>
            <PartnerText
              numberOfLines={1}
              style={[T.meta, { fontSize: px(12.5), color: C.greySoft, marginTop: px(2) }]}>
              {serviceTitle(job)} • {formatWhen(job.createdAt) || 'Recent'}
            </PartnerText>
          </View>
        </View>

        {/* Route preview snippet */}
        <View style={{ marginTop: px(10), flexDirection: 'row', alignItems: 'center' }}>
          <MapPin size={px(13)} color={C.blue} strokeWidth={2.4} />
          <PartnerText
            numberOfLines={1}
            style={[T.body, { flex: 1, fontSize: px(12.5), color: C.inkSoft, marginLeft: px(6) }]}>
            {pickup}
          </PartnerText>
          {drop && drop !== 'Drop location' ? (
            <>
              <PartnerText style={{ marginHorizontal: px(4), color: C.greySoft, fontSize: px(12) }}>→</PartnerText>
              <PartnerText
                numberOfLines={1}
                style={[T.body, { flex: 1, fontSize: px(12.5), color: C.inkSoft }]}>
                {drop}
              </PartnerText>
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
              <PartnerText style={[T.jobTitle, { fontSize: px(15), color: C.green, fontWeight: '700' }]}>
                {formatInr(earned)}
              </PartnerText>
            ) : null}
            {job.distanceKm != null ? (
              <PartnerText
                style={[
                  T.meta,
                  { fontSize: px(12), color: C.greySoft, marginLeft: earned != null ? px(8) : 0 },
                ]}>
                {job.distanceKm} km
              </PartnerText>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <PartnerText style={[T.link, { fontSize: px(12), color: C.grey }]}>
              {expanded ? 'Hide details' : 'Trip details'}
            </PartnerText>
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
                <PartnerText style={[T.small, { fontSize: px(11), color: C.greySoft }]}>Pickup point</PartnerText>
                <PartnerText style={[T.body, { fontSize: px(13), color: C.ink, marginTop: px(1) }]}>
                  {pickup}
                </PartnerText>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ width: px(18), alignItems: 'center', paddingTop: px(2) }}>
                <MapPin size={px(14)} color={C.amberText} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1, marginLeft: px(8) }}>
                <PartnerText style={[T.small, { fontSize: px(11), color: C.greySoft }]}>Drop-off point</PartnerText>
                <PartnerText style={[T.body, { fontSize: px(13), color: C.ink, marginTop: px(1) }]}>
                  {drop}
                </PartnerText>
              </View>
            </View>

            {job.createdAt ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: px(18), alignItems: 'center' }}>
                  <CalendarDays size={px(13)} color={C.greySoft} strokeWidth={2.2} />
                </View>
                <PartnerText style={[T.body, { fontSize: px(12.5), color: C.grey, marginLeft: px(8) }]}>
                  Requested: {formatWhen(job.createdAt)}
                </PartnerText>
              </View>
            ) : null}

            {completedEntry ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: px(18), alignItems: 'center' }}>
                  <Clock3 size={px(13)} color={C.green} strokeWidth={2.2} />
                </View>
                <PartnerText style={[T.body, { fontSize: px(12.5), color: C.grey, marginLeft: px(8) }]}>
                  Finished: {formatWhen(completedEntry.timestamp)}
                </PartnerText>
              </View>
            ) : null}

            {job.customer?.name ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: px(18), alignItems: 'center' }}>
                  <User size={px(13)} color={C.greySoft} strokeWidth={2.2} />
                </View>
                <PartnerText style={[T.body, { fontSize: px(12.5), color: C.grey, marginLeft: px(8) }]}>
                  Customer: {job.customer.name}
                </PartnerText>
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
                <PartnerText style={[T.small, { fontSize: px(11), color: C.greySoft }]}>Distance</PartnerText>
                <PartnerText style={[T.jobTitle, { fontSize: px(14), color: C.ink, marginTop: px(2) }]}>
                  {job.distanceKm} km
                </PartnerText>
              </View>
            ) : null}
            {earned != null ? (
              <View style={{ flex: 1 }}>
                <PartnerText style={[T.small, { fontSize: px(11), color: C.greySoft }]}>Earnings</PartnerText>
                <PartnerText style={[T.jobTitle, { fontSize: px(14), color: C.green, marginTop: px(2) }]}>
                  {formatInr(earned)}
                </PartnerText>
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <PartnerText style={[T.small, { fontSize: px(11), color: C.greySoft }]}>Status</PartnerText>
              <PartnerText
                style={[
                  T.jobTitle,
                  { fontSize: px(14), color: cancelled ? C.red : C.green, marginTop: px(2) },
                ]}>
                {cancelled ? 'Cancelled' : 'Completed'}
              </PartnerText>
            </View>
          </View>
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
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: px(10),
        paddingVertical: px(8),
      }}>
      <View
        style={{
          width: px(34),
          height: px(34),
          borderRadius: px(10),
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
        <Icon size={px(17)} color={iconColor} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1, minWidth: 0, marginLeft: px(10) }}>
        <PartnerText style={[T.metricValue, { fontSize: px(18), lineHeight: px(22), color: C.ink }]}>
          {count}
        </PartnerText>
        <PartnerText
          numberOfLines={1}
          style={[
            T.small,
            {
              fontSize: px(10.5),
              lineHeight: px(13.5),
              fontWeight: '600',
              color: C.grey,
              textTransform: 'uppercase',
              letterSpacing: 0.3,
              marginTop: px(1),
            },
          ]}>
          {label}
        </PartnerText>
      </View>
    </View>
  );
}

export default function DriverJobsScreen({ navigation }: Props) {
  const route = useRoute<JobsListRoute>();
  const px = useScreenPx();
  useRefreshDriverDataOnFocus(true);
  const insets = useSafeAreaInsets();
  const { dialog: partnerDialog, showAlert } = usePartnerDialog();
  const { data: profile, isLoading: profileLoading } = useDriverProfileQuery(true);
  const verification = useMemo(() => buildDriverVerification(profile), [profile]);
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
  const acceptMutation = useAcceptDriverJobMutation();
  const rejectMutation = useRejectDriverJobMutation();
  const { data: notifData } = useNotificationsQuery();
  const unreadNotifCount = notifData?.unreadCount ?? 0;

  const [segment, setSegment] = useState<Segment>('available');

  useEffect(() => {
    if (isVendorStaff && segment === 'available') {
      setSegment('active');
    }
  }, [isVendorStaff, segment]);

  useEffect(() => {
    const initial = route.params?.initialSegment;
    if (initial) {
      setSegment(initial);
    }
  }, [route.params?.initialSegment]);
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

  const hasActiveJob = Boolean(activeJob) || activeJobs.length > 0;
  // While driver has an active job, open offers are not counted in the notification badge
  const badgeCount = Math.max(unreadNotifCount, hasActiveJob ? 0 : offers.length);

  const sortedOffers = useMemo(
    () =>
      [...offers].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [offers],
  );

  /* Pickup-radius gate: a driver without a usable position (or far outside the
     pickup radius) cannot accept — they could never serve the job in time. */
  const user = useAppSelector(state => state.auth.user);
  const manualLocation = useDriverPresenceStore(state => state.manualLocation);
  const gpsLocation = useDriverPresenceStore(state => state.driverLocation);

  const checkAcceptLocation = useCallback(
    (job: DriverJobBooking): boolean => {
      const gate = getDriverAcceptLocationGate({
        manualLocation,
        gpsLocation,
        pickup: pickupCoordsFromJob(job),
        mobileNumber: user?.mobileNumber,
        previewMode: UI_PREVIEW_MODE,
      });
      if (gate.ok) return true;
      showAlert({
        tone: 'warning',
        title: gate.title,
        message: gate.message,
      });
      return false;
    },
    [manualLocation, gpsLocation, user?.mobileNumber, showAlert],
  );

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
      // Profile gate first: rejected/suspended/unsubmitted accounts never accept.
      const profileVerdict = assertDriverCanAcceptJobs(profile ?? undefined);
      if (!profileVerdict.ok) {
        showAlert({
          tone: 'warning',
          title: profileVerdict.title ?? 'Profile check failed',
          message: profileVerdict.message ?? 'You cannot accept jobs right now.',
        });
        return;
      }
      if (hasActiveJob) {
        showAlert({
          tone: 'warning',
          title: 'Active Trip in Progress',
          message: 'You already have an active trip in progress. Please complete or cancel your current trip before accepting a new request.',
          primaryAction: {
            label: 'View Active Trip',
            onPress: () => {
              const currentJob = activeJob || activeJobs[0];
              if (currentJob) {
                openActiveJob(currentJob);
              }
            },
          },
          secondaryAction: { label: 'OK', onPress: () => {} },
        });
        return;
      }
      if (!checkAcceptLocation(job)) return;
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
        showAlert({
          tone: 'error',
          title: 'Accept failed',
          message: getApiErrorMessage(error, 'Could not accept this trip'),
        });
      } finally {
        setPendingAcceptId(null);
      }
    },
    [acceptMutation, activeJob, activeJobs, checkAcceptLocation, hasActiveJob, navigation, openActiveJob, pendingAcceptId, pendingDeclineId, profile, refetchJobs, showAlert],
  );

  const onDecline = useCallback(
    (job: DriverJobBooking) => {
      if (pendingAcceptId || pendingDeclineId) return;
      showAlert({
        tone: 'warning',
        title: 'Decline trip',
        message: `Remove request #${job.bookingNumber} from your list?`,
        primaryAction: {
          label: 'Decline',
          onPress: () => {
            setPendingDeclineId(job.id);
            void rejectMutation
              .mutateAsync({ bookingId: job.id, bookingType: job.bookingType })
              .catch(error => {
                showAlert({
                  tone: 'error',
                  title: 'Decline failed',
                  message: getApiErrorMessage(error, 'Could not decline this trip'),
                });
              })
              .finally(() => setPendingDeclineId(null));
          },
        },
        secondaryAction: { label: 'Keep', onPress: () => {} },
      });
    },
    [pendingAcceptId, pendingDeclineId, rejectMutation, showAlert],
  );

  const segments: Array<{ id: Segment; label: string; count: number }> = isVendorStaff
    ? [
        { id: 'active', label: 'Assigned / Active', count: activeJobs.length },
        { id: 'done', label: 'Done', count: doneJobs.length },
      ]
    : [
        { id: 'available', label: 'Available', count: offers.length },
        { id: 'active', label: 'Active', count: activeJobs.length },
        { id: 'done', label: 'Done', count: doneJobs.length },
      ];

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      {/* Brand, action and subtitle follow the vendor Jobs header rhythm. */}
      <View
        style={{
          paddingTop: insets.top + px(4),
          paddingHorizontal: px(M.pagePadding),
          paddingBottom: px(6),
          backgroundColor: C.pageBg,
          borderBottomWidth: 1,
          borderBottomColor: C.hairline,
          zIndex: 10,
        }}>
        <View
          style={{
            minHeight: px(36),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <PartnerHeaderLogo width={px(76)} />
          <Pressable
            onPress={openPartnerNotifications}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={
              badgeCount > 0 ? `Notifications, ${badgeCount} unread` : 'Notifications'
            }
            style={{
              width: px(32),
              height: px(32),
              borderRadius: px(16),
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.hairline,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Bell size={px(18)} color={C.ink} strokeWidth={2} />
            {badgeCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: -px(3),
                  right: -px(3),
                  minWidth: px(17),
                  height: px(17),
                  borderRadius: px(8.5),
                  backgroundColor: C.red,
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
        </View>
        <PartnerText
          style={[T.subtitle, { fontSize: px(12.5), lineHeight: px(16), color: C.grey, marginTop: px(4) }]}
          numberOfLines={1}>
          {isVendorStaff
            ? 'Trips assigned by your vendor appear here — tap to start.'
            : 'Customer booking requests appear here — accept to start.'}
        </PartnerText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: px(24), flexGrow: 1 }}>
        {/* counts ------------------------------------------------------- */}
        <View
          style={{
            flexDirection: 'row',
            gap: px(8),
            marginTop: px(8),
            marginHorizontal: px(M.pagePadding),
          }}>
          <View
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: px(14),
              borderWidth: 1,
              borderColor: C.hairline,
              backgroundColor: C.card,
              paddingVertical: px(4),
              paddingHorizontal: px(2),
            }}>
            <JobsCount label="ready to accept" count={offers.length} px={px} />
          </View>
          <View
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: px(14),
              borderWidth: 1,
              borderColor: C.hairline,
              backgroundColor: C.card,
              paddingVertical: px(4),
              paddingHorizontal: px(2),
            }}>
            <JobsCount label="active trip" count={activeJobs.length} px={px} />
          </View>
        </View>

        {/* segmented tabs ----------------------------------------------- */}
        <View
          style={{
            flexDirection: 'row',
            gap: px(6),
            marginTop: px(12),
            marginHorizontal: px(M.pagePadding),
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
                  minHeight: px(30),
                  paddingHorizontal: px(6),
                  borderRadius: px(8),
                  backgroundColor: selected ? C.amber : C.light,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: selected ? C.amber : '#E5E7EB',
                  opacity: pressed ? 0.86 : 1,
                })}>
                <PartnerText
                  style={{
                    fontSize: px(12),
                    lineHeight: px(15),
                    fontWeight: selected ? '700' : '600',
                    color: selected ? C.ink : C.grey,
                  }}>
                  {item.label}
                </PartnerText>
              </Pressable>
            );
          })}
        </View>

        {/* list --------------------------------------------------------- */}
        <View style={{ paddingHorizontal: px(M.pagePadding), marginTop: px(12), flex: 1 }}>
          {initialLoading ? (
            <JobsSkeleton px={px} />
          ) : !isOperational ? (
            <JobsApprovalState px={px} />
          ) : hasQueryError ? (
            <JobsErrorState px={px} onRetry={retryQueries} />
          ) : segment === 'available' ? (
            sortedOffers.length === 0 ? (
              <EmptyState
                type="available"
                title="No open requests"
                subtitle="New Driver-Hire requests will appear here."
                px={px}
                onRefresh={retryQueries}
              />
            ) : (
              <>
                {hasActiveJob && (activeJob || activeJobs[0]) ? (
                  <Pressable
                    onPress={() => openActiveJob(activeJob || activeJobs[0])}
                    accessibilityRole="button"
                    accessibilityLabel="Active trip in progress. Tap to open trip details"
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? '#EFF6FF' : '#F0F9FF',
                      borderRadius: px(14),
                      borderWidth: 1,
                      borderColor: '#BAE6FD',
                      padding: px(12),
                      marginBottom: px(12),
                      flexDirection: 'row',
                      alignItems: 'center',
                    })}>
                    <View
                      style={{
                        width: px(36),
                        height: px(36),
                        borderRadius: px(18),
                        backgroundColor: '#E0F2FE',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: px(10),
                      }}>
                      <Navigation size={px(18)} color="#0284C7" strokeWidth={2.4} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <PartnerText
                        numberOfLines={1}
                        ellipsizeMode="middle"
                        style={{ fontSize: px(13), fontWeight: '700', color: '#0369A1' }}>
                        Active Trip in Progress (#{activeJob?.bookingNumber || activeJobs[0]?.bookingNumber})
                      </PartnerText>
                      <PartnerText
                        numberOfLines={2}
                        style={{ fontSize: px(11.5), color: '#475569', marginTop: px(2) }}>
                        Complete your active trip before accepting new requests.
                      </PartnerText>
                    </View>
                    <ArrowRight size={px(16)} color="#0284C7" strokeWidth={2.2} />
                  </Pressable>
                ) : null}
                {sortedOffers.map(job => (
                  <RequestJobCard
                    key={`${job.bookingType}-${job.id}`}
                    job={job}
                    px={px}
                    accepting={pendingAcceptId === job.id}
                    declining={pendingDeclineId === job.id}
                    hasActiveJob={hasActiveJob}
                    onAccept={() => void onAccept(job)}
                    onDecline={() => onDecline(job)}
                  />
                ))}
              </>
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
                  onOpen={() => {
                    if (job.status === 'DRIVER_ASSIGNED') {
                      void onAccept(job);
                      return;
                    }
                    openActiveJob(job);
                  }}
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
              />
            ))
          )}
        </View>
      </ScrollView>
      {partnerDialog}
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
      <PartnerText style={[T.cardTitle, { fontSize: px(16), color: C.ink, marginTop: px(14) }]}>
        Couldn’t load jobs
      </PartnerText>
      <PartnerText
        style={[
          T.cardSubtitle,
          { fontSize: px(13), color: C.grey, marginTop: px(6), textAlign: 'center' },
        ]}>
        Check your connection and try again.
      </PartnerText>
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
        <PartnerText style={[T.button, { fontSize: px(14), color: C.ink }]}>Try again</PartnerText>
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
      <PartnerText style={[T.cardTitle, { fontSize: px(16), color: C.ink, marginTop: px(14) }]}>
        Account cannot take jobs
      </PartnerText>
      <PartnerText
        style={[
          T.cardSubtitle,
          { fontSize: px(13), color: C.grey, marginTop: px(6), textAlign: 'center' },
        ]}>
        This account is suspended or rejected. Contact RACE support before taking jobs.
      </PartnerText>
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
        justifyContent: 'center',
        flex: 1,
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
      <PartnerText
        style={[
          T.sectionTitle,
          { fontSize: px(16.5), lineHeight: px(21), color: C.ink, textAlign: 'center' },
        ]}>
        {title}
      </PartnerText>
      <PartnerText
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
      </PartnerText>
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
          <PartnerText style={[T.link, { fontSize: px(13), color: C.ink, marginLeft: px(6) }]}>
            Check for requests
          </PartnerText>
        </Pressable>
      ) : null}
    </View>
  );
}

function JobsSkeleton({ px }: { px: (value: number) => number }) {
  const opacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 650, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);
  return (
    <Animated.View accessibilityLabel="Loading jobs" style={[{ paddingTop: px(4) }, { opacity }]}>
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
    </Animated.View>
  );
}
