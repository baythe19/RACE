import React, { useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Calendar,
  Car,
  Clock,
  IndianRupee,
  MapPin,
  Phone,
  Truck,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';

import DriverAvatar from '../../components/bookings/DriverAvatar';
import TripOtpCard from '../../components/booking/TripOtpCard';
import CancellationRefundPolicyModal from '../../components/booking/CancellationRefundPolicyModal';
import ProfileSubScreenLayout from '../../components/profile/ProfileSubScreenLayout';
import GoldButton from '../../components/auth/GoldButton';
import DataSkeleton from '../../components/ui/DataSkeleton';
import { useAppDialog } from '../../hooks/useAppDialog';
import { useBookingDetailQuery } from '../../services/bookings/useBookingQueries';
import {
  cancelServiceBooking,
  getServiceBookingCancelPreview,
} from '../../services/bookings/serviceBookingApi';
import { brand } from '../../theme/brand';
import { LOCATION_ACCENT } from '../../utils/googlePlaces';
import type { BookingsStackParamList } from '../../types/navigation';
import {
  formatBookingDisplayId,
  getCustomerBookingPresentation,
  isBookingCompleted,
  isBookingOngoing,
  resolveBookingType,
  shouldShowTripStartOtp,
} from '../../utils/bookingDisplay';
import {
  bookingHasNamedPartner,
  partnerSectionTitle,
} from '../../utils/bookingFlowCopy';
import { formatLocationCard, formatLocationDisplay } from '../../utils/readableAddress';
import { colors, shadows, typography } from '../../theme';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

const REF_W = 390;

type Props = NativeStackScreenProps<BookingsStackParamList, 'BookingDetail'>;

function DetailRow({
  label,
  value,
  px,
  last,
}: {
  label: string;
  value: string;
  px: (n: number) => number;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: px(8),
        borderBottomWidth: last ? 0 : StyleSheetHairline,
        borderBottomColor: colors.border,
      }}>
      <Text style={{ fontSize: px(12), color: colors.grey }}>{label}</Text>
      <Text
        style={{
          fontSize: px(12),
          fontWeight: typography.weights.bold,
          color: colors.dark,
          textAlign: 'right',
          flex: 1,
          marginLeft: px(12),
        }}>
        {value}
      </Text>
    </View>
  );
}

const StyleSheetHairline = 1;

function statusToneForPill(statusPill: string, isCompleted: boolean, isOngoing: boolean) {
  if (statusPill === 'Cancelled') {
    return { bg: '#F3F4F6', fg: colors.grey, border: '#E5E7EB' };
  }
  if (/finding|awaiting|confirmed ·/i.test(statusPill)) {
    return { bg: '#FFFBEB', fg: '#B45309', border: '#FDE68A' };
  }
  if (isOngoing) {
    return { bg: '#ECFDF5', fg: colors.success, border: '#A7F3D0' };
  }
  if (isCompleted || statusPill === 'Completed') {
    return { bg: '#E8F8EE', fg: colors.success, border: '#BBF7D0' };
  }
  return { bg: '#F3F4F6', fg: colors.dark, border: '#E5E7EB' };
}

export default function BookingDetailScreen({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const s = width / REF_W;
  const px = (n: number) => Math.round(n * s);
  const bookingQuery = useBookingDetailQuery(route.params.bookingId, route.params.bookingType);
  const booking = bookingQuery.data ?? null;
  const queryClient = useQueryClient();
  const { dialog, showDialog } = useAppDialog();

  const isCompleted = booking ? isBookingCompleted(booking) : false;
  const isOngoing = booking ? isBookingOngoing(booking) : false;
  const bookingType = resolveBookingType(booking);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [policy, setPolicy] = useState<{
    canCancel: boolean;
    refundAmount: number;
    refundPercent: number;
    reason: string;
    cancellationFee: number;
  } | null>(null);

  const trackParams = useMemo(
    () => ({
      bookingId: route.params.bookingId,
      bookingType,
      fromBookings: true,
    }),
    [route.params.bookingId, bookingType],
  );

  if (!booking) {
    return (
      <ProfileSubScreenLayout title="Booking details" onBack={() => goBackWithinStack(navigation)}>
        {bookingQuery.isError ? (
          <View style={{ alignItems: 'center', paddingVertical: px(40) }}>
            <Text style={{ color: '#DC2626', fontWeight: '600' }}>
              Unable to load this booking
            </Text>
            <Pressable
              onPress={() => bookingQuery.refetch()}
              style={{ marginTop: px(16), paddingHorizontal: px(24), paddingVertical: px(10) }}
              accessibilityRole="button">
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <DataSkeleton variant="bookingDetail" />
        )}
      </ProfileSubScreenLayout>
    );
  }

  const total = booking.invoice?.total ?? 0;
  const displayId = formatBookingDisplayId(booking.bookingNumber);
  const presentation = getCustomerBookingPresentation(booking);
  const statusLabel = presentation.statusPill;
  const cancellableStatuses = [
    'PENDING',
    'CONFIRMED',
    'DRIVER_ASSIGNED',
    'DRIVER_EN_ROUTE',
    'DRIVER_ARRIVED',
  ];
  const canCancelBooking = cancellableStatuses.includes(booking.unifiedStatus ?? '');
  const tone = statusToneForPill(statusLabel, isCompleted, isOngoing);
  const callPhone = booking.driver?.phone?.trim() || brand.phoneRaw;
  const serviceKind =
    presentation.kind === 'driver'
      ? 'Driver hire'
      : presentation.kind === 'roadside'
        ? 'Roadside'
        : 'Towing';
  const partnerTitle = partnerSectionTitle(presentation.kind);
  const partnerDisplayName = bookingHasNamedPartner(booking.driver)
    ? booking.driver!.name
    : presentation.partnerLine;
  const pickupCard = formatLocationCard(booking.pickup);
  const dropCard = booking.dropoff ? formatLocationCard(booking.dropoff) : null;
  const onSiteOnly =
    presentation.kind === 'roadside' ||
    !booking.dropoff ||
    formatLocationDisplay(booking.dropoff) === formatLocationDisplay(booking.pickup);

  const openCancelModal = async () => {
    if (policyLoading || cancelSubmitting) return;
    try {
      setPolicyLoading(true);
      const preview = await getServiceBookingCancelPreview(booking.id, bookingType);
      setPolicy(preview);
      setShowCancelModal(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch cancellation policy';
      showDialog({
        tone: 'error',
        title: 'Unable to cancel now',
        message,
        primaryLabel: 'OK',
      });
    } finally {
      setPolicyLoading(false);
    }
  };

  const confirmCancel = async () => {
    if (cancelSubmitting) return;
    try {
      setCancelSubmitting(true);
      const result = await cancelServiceBooking(booking.id, bookingType, cancelReason);
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
      await queryClient.invalidateQueries({
        queryKey: ['bookings', bookingType, booking.id],
      });
      setShowCancelModal(false);
      setCancelReason('');
      showDialog({
        tone: 'success',
        title: 'Booking Cancelled',
        message:
          result.refundAmount > 0
            ? `Refund ₹${result.refundAmount} is pending. It has not been processed yet.`
            : 'No refund applicable for this cancellation.',
        primaryLabel: 'OK',
      });
      navigation.navigate('BookingsMain');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel booking';
      showDialog({
        tone: 'error',
        title: 'Cancellation failed',
        message,
        primaryLabel: 'OK',
      });
    } finally {
      setCancelSubmitting(false);
    }
  };

  return (
    <ProfileSubScreenLayout
      title="Booking details"
      onBack={() => goBackWithinStack(navigation)}
      headerRight={
        <View
          style={{
            paddingHorizontal: px(10),
            paddingVertical: px(5),
            borderRadius: px(20),
            backgroundColor: tone.bg,
            borderWidth: 1,
            borderColor: tone.border,
          }}>
          <Text
            style={{
              fontSize: px(11),
              fontWeight: typography.weights.bold,
              color: tone.fg,
            }}>
            {statusLabel}
          </Text>
        </View>
      }>
      {dialog}
      {/* Booking ID — prominent */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: px(10),
          marginBottom: px(10),
          paddingHorizontal: px(12),
          paddingVertical: px(10),
          borderRadius: px(12),
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
        }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: px(10), color: colors.grey, fontWeight: typography.weights.semibold }}>
            Booking ID
          </Text>
          <Text
            numberOfLines={1}
            style={{
              marginTop: px(2),
              fontSize: px(14),
              fontWeight: typography.weights.extrabold,
              color: colors.dark,
              letterSpacing: 0.2,
            }}>
            {displayId}
          </Text>
        </View>
        <Text
          style={{
            fontSize: px(11),
            fontWeight: typography.weights.bold,
            color: colors.grey,
          }}>
          {serviceKind}
        </Text>
      </View>

      {isOngoing && presentation.dispatchHint ? (
        <Text
          style={{
            fontSize: px(12),
            color: colors.grey,
            lineHeight: px(17),
            marginBottom: px(10),
            paddingHorizontal: px(2),
          }}>
          {presentation.dispatchHint}
        </Text>
      ) : null}

      {booking.tripStartOtp && shouldShowTripStartOtp(booking.unifiedStatus) ? (
        <View style={{ marginBottom: px(10) }}>
          <TripOtpCard
            otp={booking.tripStartOtp}
            compact
            subtitle="Share with driver at pickup to start the trip."
          />
        </View>
      ) : null}

      {/* Service + meta (compact) */}
      <View
        style={[
          styles.card,
          shadows.cardSoft,
          { borderRadius: px(12), padding: px(12), marginBottom: px(8) },
        ]}>
        <Text
          style={{
            fontSize: px(15),
            fontWeight: typography.weights.bold,
            color: colors.dark,
            marginBottom: px(8),
          }}>
          {booking.serviceLabel}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px(6) }}>
          {[
            {
              Icon: Calendar,
              text: new Date(booking.createdAt).toLocaleDateString('en-IN'),
            },
            {
              Icon: Clock,
              text: booking.scheduledAt
                ? new Date(booking.scheduledAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'ASAP',
            },
            { Icon: Car, text: booking.vehicleNumber || 'Your vehicle' },
            { Icon: Truck, text: serviceKind },
          ].map(row => (
            <View
              key={row.text}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: px(5),
                paddingHorizontal: px(8),
                paddingVertical: px(5),
                borderRadius: px(8),
                backgroundColor: '#F3F4F6',
              }}>
              <row.Icon size={px(12)} color={colors.grey} strokeWidth={2} />
              <Text style={{ fontSize: px(11), color: colors.dark }} numberOfLines={1}>
                {row.text}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Trip route */}
      <View
        style={[
          styles.card,
          shadows.cardSoft,
          { borderRadius: px(12), padding: px(12), marginBottom: px(8) },
        ]}>
        <Text
          style={{
            fontSize: px(13),
            fontWeight: typography.weights.bold,
            color: colors.dark,
            marginBottom: px(10),
          }}>
          Trip route
        </Text>
        {onSiteOnly ? (
          <View>
            <Text style={{ fontSize: px(10), color: colors.grey, fontWeight: typography.weights.semibold }}>
              Location
            </Text>
            <Text
              style={{
                marginTop: px(2),
                fontSize: px(13),
                fontWeight: typography.weights.semibold,
                color: colors.dark,
              }}>
              {pickupCard.primary}
            </Text>
            {pickupCard.secondary ? (
              <Text style={{ marginTop: px(4), fontSize: px(12), color: colors.grey }}>
                {pickupCard.secondary}
              </Text>
            ) : null}
          </View>
        ) : (
        <View style={{ flexDirection: 'row', gap: px(12) }}>
          <View style={{ alignItems: 'center', width: px(28) }}>
            <View
              style={{
                width: px(28),
                height: px(28),
                borderRadius: px(14),
                backgroundColor: 'rgba(22,163,74,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <View
                style={{
                  width: px(10),
                  height: px(10),
                  borderRadius: px(5),
                  backgroundColor: '#16A34A',
                }}
              />
            </View>
            <View
              style={{
                width: 2,
                flex: 1,
                minHeight: px(18),
                backgroundColor: '#E5E7EB',
                marginVertical: px(4),
              }}
            />
            <View
              style={{
                width: px(28),
                height: px(28),
                borderRadius: px(14),
                backgroundColor: 'rgba(220,38,38,0.10)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <MapPin size={px(14)} color={colors.error} strokeWidth={2.4} />
            </View>
          </View>
          <View style={{ flex: 1, justifyContent: 'space-between', gap: px(14) }}>
            <View>
              <Text style={{ fontSize: px(10), color: colors.grey, fontWeight: typography.weights.semibold }}>
                Pickup
              </Text>
              <Text
                style={{
                  marginTop: px(2),
                  fontSize: px(13),
                  fontWeight: typography.weights.semibold,
                  color: colors.dark,
                  lineHeight: px(18),
                }}>
                {pickupCard.primary}
              </Text>
              {pickupCard.secondary ? (
                <Text style={{ marginTop: px(4), fontSize: px(12), color: colors.grey }}>
                  {pickupCard.secondary}
                </Text>
              ) : null}
            </View>
            <View>
              <Text style={{ fontSize: px(10), color: colors.grey, fontWeight: typography.weights.semibold }}>
                Drop-off
              </Text>
              <Text
                style={{
                  marginTop: px(2),
                  fontSize: px(13),
                  fontWeight: typography.weights.semibold,
                  color: colors.dark,
                  lineHeight: px(18),
                }}>
                {dropCard?.primary ?? formatLocationDisplay(booking.dropoff)}
              </Text>
              {dropCard?.secondary ? (
                <Text style={{ marginTop: px(4), fontSize: px(12), color: colors.grey }}>
                  {dropCard.secondary}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
        )}
        {booking.distanceKm ? (
          <Text style={{ fontSize: px(11), color: colors.grey, marginTop: px(8) }}>
            Distance · {booking.distanceKm.toFixed(1)} km
          </Text>
        ) : null}
      </View>

      {/* Partner */}
      <View
        style={[
          styles.card,
          shadows.cardSoft,
          { borderRadius: px(12), padding: px(12), marginBottom: px(8) },
        ]}>
        <Text
          style={{
            fontSize: px(13),
            fontWeight: typography.weights.bold,
            color: colors.dark,
            marginBottom: px(8),
          }}>
          {partnerTitle}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(10) }}>
          <DriverAvatar size={px(40)} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                fontSize: px(14),
                fontWeight: typography.weights.bold,
                color: colors.dark,
              }}
              numberOfLines={2}>
              {partnerDisplayName}
            </Text>
            <Text style={{ fontSize: px(11), color: colors.grey, marginTop: px(2) }} numberOfLines={2}>
              {[booking.driver?.experience, booking.assignedFleetVehicleLabel]
                .filter(Boolean)
                .join(' · ') || presentation.dispatchHint}
            </Text>
          </View>
          <Pressable
            onPress={() => void Linking.openURL(`tel:${callPhone}`)}
            style={{
              width: px(40),
              height: px(40),
              borderRadius: px(20),
              borderWidth: 1.5,
              borderColor: colors.border,
              backgroundColor: 'rgba(245,158,11,0.10)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityRole="button"
            accessibilityLabel="Call driver">
            <Phone size={px(16)} color={LOCATION_ACCENT} strokeWidth={2.3} />
          </Pressable>
        </View>
      </View>

      {/* Fare */}
      <View
        style={[
          styles.card,
          shadows.cardSoft,
          { borderRadius: px(12), padding: px(12), marginBottom: px(12) },
        ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(6), marginBottom: px(4) }}>
          <IndianRupee size={px(14)} color={colors.dark} />
          <Text style={{ fontSize: px(13), fontWeight: typography.weights.bold, color: colors.dark }}>
            Fare summary
          </Text>
        </View>
        <DetailRow label="Estimated fare" value={`₹${total}`} px={px} />
        <DetailRow
          label="Advance paid"
          value={booking.advancePaid ? 'Yes' : 'Pending'}
          px={px}
        />
        <DetailRow
          label="Payment status"
          value={
            booking.paymentStatus?.replace(/_/g, ' ') ??
            (booking.advancePaid ? 'Advance paid' : 'Pending')
          }
          px={px}
        />
        <DetailRow
          label="Payment method"
          value={
            booking.invoice?.paymentMethod ??
            (booking.advancePaid ? 'UPI / wallet' : 'Not selected yet')
          }
          px={px}
          last
        />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingTop: px(8),
            marginTop: px(2),
          }}>
          <Text style={{ fontSize: px(13), fontWeight: typography.weights.bold, color: colors.dark }}>
            Total
          </Text>
          <Text
            style={{
              fontSize: px(16),
              fontWeight: typography.weights.extrabold,
              color: colors.dark,
            }}>
            ₹{total}
          </Text>
        </View>
      </View>

      {isCompleted ? (
        <GoldButton
          label={booking.rating ? 'Already Rated' : 'Rate Experience'}
          onPress={() =>
            navigation.navigate('TowingRate', {
              bookingId: booking.id,
              bookingType,
            })
          }
          style={{ width: '100%', marginBottom: px(8) }}
          height={px(48)}
          labelSize={px(15)}
          borderRadius={px(14)}
        />
      ) : isOngoing ? (
        <GoldButton
          label="Track live"
          onPress={() =>
            bookingType === 'driver'
              ? navigation.navigate('DriverTrack', trackParams)
              : navigation.navigate('TowingTrack', trackParams)
          }
          style={{ width: '100%', marginBottom: px(8) }}
          height={px(48)}
          labelSize={px(15)}
          borderRadius={px(14)}
        />
      ) : null}

      {canCancelBooking ? (
        <GoldButton
          label={policyLoading ? 'Checking policy...' : 'Cancel booking'}
          onPress={() => void openCancelModal()}
          style={{ width: '100%', marginBottom: px(8) }}
          height={px(48)}
          labelSize={px(15)}
          borderRadius={px(14)}
          disabled={policyLoading}
          variant="outline"
        />
      ) : null}

      <Pressable
        onPress={() => void Linking.openURL(`tel:${brand.phoneRaw}`)}
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: px(6),
          paddingVertical: px(12),
          marginTop: px(4),
        }}
        accessibilityRole="button"
        accessibilityLabel="Contact support">
        <Phone size={px(14)} color={colors.grey} strokeWidth={2.2} />
        <Text
          style={{
            fontSize: px(12),
            fontWeight: typography.weights.semibold,
            color: colors.grey,
          }}>
          Need help? Contact support
        </Text>
      </Pressable>

      <CancellationRefundPolicyModal
        visible={showCancelModal}
        policy={policy}
        isLoadingPolicy={policyLoading}
        isSubmitting={cancelSubmitting}
        bookingStatus={booking.unifiedStatus}
        cancelReason={cancelReason}
        onReasonChange={setCancelReason}
        onConfirmCancel={() => void confirmCancel()}
        onClose={() => setShowCancelModal(false)}
      />
    </ProfileSubScreenLayout>
  );
}

const styles = {
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
};
