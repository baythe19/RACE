import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import LiveTripMap from '../../components/booking/LiveTripMap';
import PrimaryButton from '../../components/ui/PrimaryButton';
import Screen, { Card, ScreenContent } from '../../components/ui/Screen';
import { useAppDispatch } from '../../redux/hooks';
import { updateBookingStatus } from '../../redux/bookings/bookingsSlice';
import type { BookingStatus } from '../../types/booking';
import { useBookingQuery } from '../../services/bookings/useBookingQueries';
import { trackingService } from '../../services/tracking/trackingService';
import { formatLocationDisplay } from '../../utils/readableAddress';
import type { BookingsStackParamList } from '../../types/navigation';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<BookingsStackParamList, 'LiveTracking'>;

export default function LiveTrackingScreen({ navigation, route }: Props) {
  const dispatch = useAppDispatch();
  const booking = useBookingQuery(route.params.bookingId);
  const [eta, setEta] = useState<number | null>(booking?.etaMinutes ?? null);
  const [driverLocation, setDriverLocation] = useState<
    { latitude: number; longitude: number } | undefined
  >();

  useEffect(() => {
    if (!booking) return;
    trackingService.connect();
    const unsubscribe = trackingService.subscribe(booking.id, update => {
      if (update.etaMinutes != null) setEta(update.etaMinutes);
      if (update.driverLocation) {
        setDriverLocation({
          latitude: update.driverLocation.latitude,
          longitude: update.driverLocation.longitude,
        });
      }
      if (update.status) {
        dispatch(
          updateBookingStatus({
            id: booking.id,
            status: update.status as BookingStatus,
            ...(update.etaMinutes != null ? { etaMinutes: update.etaMinutes } : {}),
          }),
        );
      }
    });
    return () => {
      unsubscribe();
    };
  }, [booking, dispatch]);

  if (!booking) {
    return (
      <Screen>
        <SafeAreaView style={styles.safe}>
          <Text style={styles.missing}>Booking not found</Text>
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safe}>
        <View style={styles.map}>
          <LiveTripMap
            borderRadius={0}
            style={StyleSheet.absoluteFill}
            pickup={
              booking.pickup?.latitude != null && booking.pickup?.longitude != null
                ? {
                    latitude: booking.pickup.latitude,
                    longitude: booking.pickup.longitude,
                    label: formatLocationDisplay(booking.pickup),
                  }
                : null
            }
            dropoff={
              booking.dropoff?.latitude != null && booking.dropoff?.longitude != null
                ? {
                    latitude: booking.dropoff.latitude,
                    longitude: booking.dropoff.longitude,
                    label: formatLocationDisplay(booking.dropoff),
                  }
                : null
            }
            driver={
              driverLocation
                ? {
                    ...driverLocation,
                    label: booking.driver?.name || 'Partner',
                  }
                : null
            }
          />
          <View style={styles.mapOverlay}>
            <Text style={styles.mapTitle}>Live Tracking</Text>
            <Text style={styles.mapSub}>
              #{booking.bookingNumber} · {booking.serviceLabel}
            </Text>
          </View>
          <View style={styles.etaBubble}>
            <Text style={styles.etaText}>{eta == null ? 'ETA updating' : eta + ' min away'}</Text>
          </View>
        </View>

        <ScrollView style={styles.sheet}>
          <ScreenContent>
            <View style={styles.sheetHandle} />
            <Text style={styles.etaLarge}>{eta == null ? 'ETA updating' : eta + ' min away'}</Text>
            <Text style={styles.liveBadge}>
              {driverLocation ? '● Driver location live' : 'Waiting for driver location'}
            </Text>

            {booking.driver ? (
              <Card style={styles.driverCard}>
                <View style={styles.driverRow}>
                  <View>
                    <Text style={styles.driverName}>{booking.driver.name}</Text>
                    <Text style={styles.driverMeta}>★ {booking.driver.rating} · Verified</Text>
                    <Text style={styles.driverExp}>{booking.driver.experience}</Text>
                  </View>
                  <PrimaryButton
                    label="Call"
                    onPress={() => Linking.openURL(`tel:${booking.driver!.phone}`)}
                  />
                </View>
              </Card>
            ) : null}

            <View style={styles.tripRow}>
              <Text style={styles.tripPoint}>{formatLocationDisplay(booking.pickup)}</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
              <Text style={styles.tripPoint}>
                {booking.dropoff ? formatLocationDisplay(booking.dropoff) : 'On-site'}
              </Text>
            </View>

            <View style={styles.actions}>
              <PrimaryButton
                label="Call Driver"
                onPress={() => booking.driver && Linking.openURL(`tel:${booking.driver.phone}`)}
                variant="outline"
              />
              <PrimaryButton
                label="View Details"
                onPress={() => navigation.navigate('BookingDetail', { bookingId: booking.id })}
                variant="outline"
              />
            </View>

            {booking.status === 'SERVICE_COMPLETED' || booking.status === 'PAID' ? (
              <PrimaryButton
                label="Rate Experience"
                onPress={() =>
                  navigation.navigate('RatingReview', {
                    bookingId: booking.id,
                    bookingType: booking.bookingType,
                  })
                }
              />
            ) : null}
          </ScreenContent>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  missing: { textAlign: 'center', marginTop: 40, color: colors.textMuted },
  map: {
    height: '45%',
    backgroundColor: '#E8EEF2',
    position: 'relative',
    overflow: 'hidden',
  },
  mapOverlay: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mapTitle: {
    color: colors.textDark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  mapSub: {
    color: colors.textMuted,
    marginTop: 2,
    fontSize: typography.sizes.sm,
  },
  etaBubble: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    left: '30%',
    right: '30%',
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    zIndex: 2,
  },
  etaText: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  sheet: { flex: 1, backgroundColor: colors.background },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginVertical: spacing.md,
  },
  etaLarge: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.extrabold,
    color: colors.textDark,
  },
  liveBadge: {
    color: colors.success,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    fontWeight: typography.weights.semibold,
  },
  driverCard: { marginBottom: spacing.lg },
  driverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  driverName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textDark,
  },
  driverMeta: { color: colors.textMuted, marginTop: 2 },
  driverExp: { color: colors.textMuted, marginTop: 2 },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tripPoint: { flex: 1, color: colors.textDark, fontWeight: typography.weights.semibold },
  actions: { gap: spacing.sm, marginBottom: spacing.lg },
});
