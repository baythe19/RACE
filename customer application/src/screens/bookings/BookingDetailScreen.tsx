import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Calendar,
  Car,
  Clock,
  IndianRupee,
  MapPin,
  Star,
  Truck,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';

import DriverAvatar from '../../components/bookings/DriverAvatar';
import TripOtpCard from '../../components/booking/TripOtpCard';
import CancellationRefundPolicyModal from '../../components/booking/CancellationRefundPolicyModal';
import ProfileSubScreenLayout from '../../components/profile/ProfileSubScreenLayout';
import GoldButton from '../../components/auth/GoldButton';
import { useBookingQuery } from '../../services/bookings/useBookingQueries';
import {
  cancelServiceBooking,
  getServiceBookingCancelPreview,
} from '../../services/bookings/serviceBookingApi';
import { brand } from '../../theme/brand';
import type { BookingsStackParamList } from '../../types/navigation';
import {
  formatBookingDisplayId,
  formatUnifiedStatusLabel,
  isBookingCompleted,
  isBookingOngoing,
  resolveBookingType,
} from '../../utils/bookingDisplay';
import { formatLocationDisplay } from '../../utils/readableAddress';
import { colors, shadows, typography } from '../../theme';

const REF_W = 390;

type Props = NativeStackScreenProps<BookingsStackParamList, 'BookingDetail'>;

function DetailRow({
  label,
  value,
  px,
}: {
  label: string;
  value: string;
  px: (n: number) => number;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: px(10),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
      <Text style={{ fontSize: px(13), color: colors.grey }}>{label}</Text>
      <Text
        style={{
          fontSize: px(13),
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

export default function BookingDetailScreen({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const s = width / REF_W;
  const px = (n: number) => Math.round(n * s);
  const booking = useBookingQuery(route.params.bookingId, route.params.bookingType);
  const queryClient = useQueryClient();

  const isCompleted = booking ? isBookingCompleted(booking) : false;
  const isOngoing = booking ? isBookingOngoing(booking) : false;
  const bookingType = resolveBookingType(booking);
  const statusLabel = booking?.unifiedStatus
    ? formatUnifiedStatusLabel(booking.unifiedStatus)
    : booking?.status ?? 'Loading';
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
      <ProfileSubScreenLayout title="Booking Detail" onBack={() => navigation.goBack()}>
        <View style={{ alignItems: 'center', paddingVertical: px(40) }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </ProfileSubScreenLayout>
    );
  }

  const total = booking.invoice?.total ?? 0;
  const displayId = formatBookingDisplayId(booking.bookingNumber);
  const cancellableStatuses = [
    'PENDING',
    'CONFIRMED',
    'DRIVER_ASSIGNED',
    'DRIVER_EN_ROUTE',
    'DRIVER_ARRIVED',
  ];
  const canCancelBooking = cancellableStatuses.includes(booking.unifiedStatus ?? '');

  const openCancelModal = async () => {
    try {
      setPolicyLoading(true);
      const preview = await getServiceBookingCancelPreview(booking.id, bookingType);
      setPolicy(preview);
      setShowCancelModal(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch cancellation policy';
      Alert.alert('Unable to cancel now', message);
    } finally {
      setPolicyLoading(false);
    }
  };

  const confirmCancel = async () => {
    try {
      setCancelSubmitting(true);
      const result = await cancelServiceBooking(booking.id, bookingType, cancelReason);
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setShowCancelModal(false);
      setCancelReason('');
      Alert.alert(
        'Booking Cancelled',
        result.refundAmount > 0
          ? `Refund ₹${result.refundAmount} is pending. It has not been processed yet.`
          : 'No refund applicable for this cancellation.',
      );
      navigation.navigate('BookingsMain');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel booking';
      Alert.alert('Cancellation failed', message);
    } finally {
      setCancelSubmitting(false);
    }
  };

  return (
    <ProfileSubScreenLayout
      title="Booking Detail"
      subtitle={displayId}
      onBack={() => navigation.goBack()}
      headerRight={
        <View
          style={{
            paddingHorizontal: px(10),
            paddingVertical: px(5),
            borderRadius: px(12),
            backgroundColor: isCompleted ? '#E8F8EE' : colors.goldLight,
          }}>
          <Text
            style={{
              fontSize: px(11),
              fontWeight: typography.weights.bold,
              color: isCompleted ? colors.success : colors.primary,
            }}>
            {statusLabel}
          </Text>
        </View>
      }>
      {booking.tripStartOtp ? (
        <View style={{ marginBottom: px(14) }}>
          <TripOtpCard
            otp={booking.tripStartOtp}
            subtitle="Share this code with your driver when they arrive to start the trip."
          />
        </View>
      ) : null}

      <View style={[styles.card, { borderRadius: px(14), padding: px(14), marginBottom: px(14) }, shadows.card]}>
        <Text style={{ fontSize: px(16), fontWeight: typography.weights.bold, color: colors.dark, marginBottom: px(4) }}>
          {booking.serviceLabel}
        </Text>
        <Text style={{ fontSize: px(12), color: colors.grey, marginBottom: px(12) }}>
          {bookingType === 'driver' ? 'Driver hire' : 'Towing service'}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px(10) }}>
          {[
            { Icon: Calendar, text: new Date(booking.createdAt).toLocaleDateString('en-IN') },
            { Icon: Clock, text: booking.scheduledAt ? new Date(booking.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'ASAP' },
            { Icon: Car, text: booking.vehicleNumber || 'Registered vehicle' },
            { Icon: Truck, text: bookingType },
          ].map(row => (
            <View key={row.text} style={{ flexDirection: 'row', alignItems: 'center', gap: px(6), width: '47%' }}>
              <row.Icon size={px(14)} color={colors.primary} strokeWidth={2} />
              <Text style={{ fontSize: px(11), color: colors.dark, flex: 1 }} numberOfLines={1}>
                {row.text}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.card, { borderRadius: px(14), padding: px(14), marginBottom: px(14) }, shadows.card]}>
        <Text style={{ fontSize: px(14), fontWeight: typography.weights.bold, color: colors.dark, marginBottom: px(10) }}>
          Route
        </Text>
        <View style={{ flexDirection: 'row', gap: px(10) }}>
          <View style={{ alignItems: 'center', paddingTop: px(4) }}>
            <View style={{ width: px(8), height: px(8), borderRadius: px(4), backgroundColor: colors.primary }} />
            <View style={{ width: 1, flex: 1, backgroundColor: colors.border, marginVertical: px(4) }} />
            <MapPin size={px(14)} color={colors.error} />
          </View>
          <View style={{ flex: 1, gap: px(14) }}>
            <View>
              <Text style={{ fontSize: px(11), color: colors.grey }}>Pickup</Text>
              <Text style={{ fontSize: px(13), fontWeight: typography.weights.semibold, color: colors.dark }}>
                {formatLocationDisplay(booking.pickup)}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: px(11), color: colors.grey }}>Drop</Text>
              <Text style={{ fontSize: px(13), fontWeight: typography.weights.semibold, color: colors.dark }}>
                {booking.dropoff
                  ? formatLocationDisplay(booking.dropoff)
                  : 'On-site service'}
              </Text>
            </View>
          </View>
        </View>
        {booking.distanceKm ? (
          <Text style={{ fontSize: px(11), color: colors.grey, marginTop: px(10) }}>
            Distance: {booking.distanceKm.toFixed(1)} km
          </Text>
        ) : null}
      </View>

      <View style={[styles.card, { borderRadius: px(14), padding: px(14), marginBottom: px(14) }, shadows.card]}>
        <Text style={{ fontSize: px(14), fontWeight: typography.weights.bold, color: colors.dark, marginBottom: px(10) }}>
          Assigned partner
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(12) }}>
          <DriverAvatar size={px(48)} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: px(15), fontWeight: typography.weights.bold, color: colors.dark }}>
              {booking.driver?.name ?? 'Assigning soon'}
            </Text>
            {booking.driver?.rating != null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(4), marginTop: px(2) }}>
                <Star size={px(12)} color={colors.primary} fill={colors.primary} />
                <Text style={{ fontSize: px(12), color: colors.grey }}>
                  {booking.driver.rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
            {booking.driver?.experience ? (
              <Text style={{ fontSize: px(12), color: colors.grey, marginTop: px(2) }}>
                {booking.driver.experience}
              </Text>
            ) : null}
            {booking.assignedFleetVehicleLabel ? (
              <Text style={{ fontSize: px(12), color: colors.grey, marginTop: px(4) }}>
                Vehicle: {booking.assignedFleetVehicleLabel}
              </Text>
            ) : null}
            {booking.vendorId && !booking.driver?.name ? (
              <Text style={{ fontSize: px(12), color: colors.grey, marginTop: px(4) }}>
                Partner approved — assigning driver
                {booking.assignedFleetVehicleLabel
                  ? ` · ${booking.assignedFleetVehicleLabel}`
                  : ''}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={() =>
              void Linking.openURL(
                `tel:${booking.driver?.phone ? booking.driver.phone : brand.phoneRaw}`,
              )
            }
            style={{
              paddingHorizontal: px(12),
              paddingVertical: px(8),
              borderRadius: px(10),
              borderWidth: 1.5,
              borderColor: colors.primary,
            }}>
            <Text style={{ fontSize: px(11), fontWeight: typography.weights.bold, color: colors.primary }}>
              Call
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.card, { borderRadius: px(14), padding: px(14), marginBottom: px(20) }, shadows.card]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(8), marginBottom: px(10) }}>
          <IndianRupee size={px(16)} color={colors.primary} />
          <Text style={{ fontSize: px(14), fontWeight: typography.weights.bold, color: colors.dark }}>
            Payment Summary
          </Text>
        </View>
        <DetailRow label="Estimated Fare" value={`₹${total}`} px={px} />
        <DetailRow label="Advance Paid" value={booking.invoice?.paymentMethod ? 'Yes' : 'Pending'} px={px} />
        <DetailRow label="Payment Method" value={booking.invoice?.paymentMethod ?? 'UPI'} px={px} />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingTop: px(12),
            marginTop: px(4),
          }}>
          <Text style={{ fontSize: px(15), fontWeight: typography.weights.bold, color: colors.dark }}>Total</Text>
          <Text style={{ fontSize: px(20), fontWeight: typography.weights.extrabold, color: colors.primary }}>
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
          style={{ width: '100%', marginBottom: px(10) }}
          height={px(52)}
          labelSize={px(16)}
          borderRadius={px(14)}
        />
      ) : isOngoing ? (
        <GoldButton
          label="Track Live"
          onPress={() =>
            bookingType === 'driver'
              ? navigation.navigate('DriverTrack', trackParams)
              : navigation.navigate('TowingTrack', trackParams)
          }
          style={{ width: '100%', marginBottom: px(10) }}
          height={px(52)}
          labelSize={px(16)}
          borderRadius={px(14)}
        />
      ) : null}

      <Pressable
        onPress={() => void Linking.openURL(`tel:${brand.phoneRaw}`)}
        style={{ alignItems: 'center', paddingVertical: px(8) }}>
        <Text style={{ fontSize: px(13), fontWeight: typography.weights.semibold, color: colors.grey }}>
          Need help? Contact Support
        </Text>
      </Pressable>

      {canCancelBooking ? (
        <GoldButton
          label={policyLoading ? 'Checking policy...' : 'Cancel Booking'}
          onPress={() => void openCancelModal()}
          style={{ width: '100%', marginTop: px(10) }}
          height={px(52)}
          labelSize={px(16)}
          borderRadius={px(14)}
          disabled={policyLoading}
        />
      ) : null}

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
