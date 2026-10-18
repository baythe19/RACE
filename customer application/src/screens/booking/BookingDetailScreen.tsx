import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import StatusChip from '../../components/ui/StatusChip';
import PrimaryButton from '../../components/ui/PrimaryButton';
import Screen, { Card, ScreenContent } from '../../components/ui/Screen';
import { useFinalPayment } from '../../hooks/useFinalPayment';
import { useBookingQuery } from '../../services/bookings/useBookingQueries';
import { formatLocationDisplay } from '../../utils/readableAddress';
import type { BookingsStackParamList } from '../../types/navigation';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<BookingsStackParamList, 'BookingDetail'>;

export default function BookingDetailScreen({ navigation, route }: Props) {
  const booking = useBookingQuery(route.params.bookingId, route.params.bookingType);
  const { payRemaining, isPaying } = useFinalPayment();

  if (!booking) {
    return (
      <Screen>
        <SafeAreaView style={styles.safe}>
          <Text style={styles.missing}>Booking not found</Text>
        </SafeAreaView>
      </Screen>
    );
  }

  const isTrackable = ['ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'SERVICE_STARTED'].includes(
    booking.status,
  );
  const canRate =
    (booking.status === 'SERVICE_COMPLETED' || booking.unifiedStatus === 'COMPLETED') &&
    !booking.rating;
  const needsFinalPayment =
    booking.advancePaid &&
    !booking.remainingPaid &&
    (booking.remainingAmount ?? 0) > 0 &&
    (booking.status === 'SERVICE_COMPLETED' ||
      booking.unifiedStatus === 'COMPLETED' ||
      booking.unifiedStatus === 'RATED');

  const handlePayRemaining = async () => {
    const bookingType = booking.bookingType ?? 'towing';
    const ok = await payRemaining(booking.id, bookingType);
    if (ok) Alert.alert('Payment successful', 'Remaining balance has been paid.');
  };

  return (
    <Screen>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ScreenContent>
            <View style={styles.header}>
              <Text style={styles.id}>#{booking.bookingNumber}</Text>
              <StatusChip status={booking.status} />
            </View>
            <Text style={styles.service}>{booking.serviceLabel}</Text>

            <Card>
              <DetailRow icon="car" label="Vehicle" value={booking.vehicleLabel ?? booking.vehicleNumber} />
              <DetailRow icon="location" label="Pickup" value={formatLocationDisplay(booking.pickup)} />
              {booking.dropoff ? (
                <DetailRow icon="navigate" label="Drop" value={formatLocationDisplay(booking.dropoff)} />
              ) : null}
              {booking.distanceKm ? (
                <DetailRow icon="speedometer" label="Distance" value={`${booking.distanceKm} km`} />
              ) : null}
            </Card>

            {booking.driver ? (
              <Card style={styles.driverCard}>
                <Text style={styles.sectionTitle}>Driver</Text>
                <Text style={styles.driverName}>{booking.driver.name}</Text>
                <Text style={styles.driverMeta}>
                  ★ {booking.driver.rating} · {booking.driver.experience}
                </Text>
                <View style={styles.driverActions}>
                  <PrimaryButton
                    label="Call"
                    onPress={() => Linking.openURL(`tel:${booking.driver!.phone}`)}
                    variant="outline"
                  />
                </View>
              </Card>
            ) : null}

            {booking.invoice ? (
              <Card>
                <Text style={styles.sectionTitle}>Payment Summary</Text>
                <InvoiceRow label="Base fare" value={booking.invoice.baseFare} />
                {booking.invoice.distanceCharge ? (
                  <InvoiceRow label="Distance" value={booking.invoice.distanceCharge} />
                ) : null}
                {booking.invoice.platformFee ? (
                  <InvoiceRow label="Platform fee" value={booking.invoice.platformFee} />
                ) : null}
                <View style={styles.divider} />
                <InvoiceRow label="Total" value={booking.invoice.total} bold />
              </Card>
            ) : null}

            <Card>
              <Text style={styles.sectionTitle}>Timeline</Text>
              {booking.timeline.map((event) => (
                <View key={event.status} style={styles.timelineRow}>
                  <Ionicons
                    name={event.completed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={event.completed ? colors.success : colors.textMuted}
                  />
                  <Text style={[styles.timelineText, !event.completed && styles.timelinePending]}>
                    {event.label}
                  </Text>
                </View>
              ))}
            </Card>

            {isTrackable ? (
              <PrimaryButton
                label="Track Live"
                onPress={() => navigation.navigate('LiveTracking', { bookingId: booking.id, bookingType: booking.bookingType ?? 'towing' })}
              />
            ) : null}
            {canRate && !booking.rating ? (
              <PrimaryButton
                label="Rate Experience"
                onPress={() =>
                  navigation.navigate('RatingReview', {
                    bookingId: booking.id,
                    bookingType: booking.bookingType ?? 'towing',
                  })
                }
              />
            ) : null}
            {needsFinalPayment ? (
              <PrimaryButton
                label={
                  isPaying
                    ? 'Processing payment...'
                    : `Pay remaining ₹${booking.remainingAmount?.toLocaleString('en-IN') ?? ''}`
                }
                onPress={() => void handlePayRemaining()}
                disabled={isPaying}
              />
            ) : null}
            <PrimaryButton
              label="Book Again"
              onPress={() => {
                const bookingType = booking.bookingType ?? 'towing';
                const categoryId = booking.categoryId ?? bookingType;
                const targetScreen =
                  bookingType === 'driver' || categoryId === 'driver'
                    ? 'DriverService'
                    : categoryId === 'roadside'
                      ? 'RoadsideAssistance'
                      : 'TowingService';
                navigation.getParent()?.navigate('Home', { screen: targetScreen });
              }}
              variant="outline"
            />
          </ScreenContent>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={detailStyles.row}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={detailStyles.value}>{value}</Text>
    </View>
  );
}

function InvoiceRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={detailStyles.row}>
      <Text style={[detailStyles.label, bold && detailStyles.bold]}>{label}</Text>
      <Text style={[detailStyles.value, bold && detailStyles.boldTotal]}>₹{value}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  label: { color: colors.textMuted, flex: 1 },
  value: { color: colors.textDark, fontWeight: typography.weights.semibold },
  bold: { fontWeight: typography.weights.bold, color: colors.textDark },
  boldTotal: { fontSize: typography.sizes.xl, color: colors.primary },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  missing: { textAlign: 'center', marginTop: 40, color: colors.textMuted },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  id: { color: colors.textMuted, fontWeight: typography.weights.semibold },
  service: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.textDark, marginBottom: spacing.lg },
  sectionTitle: { fontWeight: typography.weights.bold, color: colors.textDark, marginBottom: spacing.md, fontSize: typography.sizes.lg },
  driverCard: { marginTop: spacing.md },
  driverName: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.textDark },
  driverMeta: { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
  driverActions: { flexDirection: 'row', gap: spacing.md },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  timelineText: { color: colors.textDark },
  timelinePending: { color: colors.textMuted },
});
