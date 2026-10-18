import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import BookingCard from '../../components/booking/BookingCard';
import EmptyState from '../../components/ui/EmptyState';
import Screen, { ScreenContent, SectionTitle } from '../../components/ui/Screen';
import { useBookingsQuery } from '../../services/bookings/useBookingQueries';
import type { Booking } from '../../types/booking';
import type { BookingsStackParamList } from '../../types/navigation';
import { isBookingCompleted, isBookingOngoing } from '../../utils/bookingDisplay';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<BookingsStackParamList, 'BookingsMain'>;

type Tab = 'all' | 'ongoing' | 'completed' | 'towing' | 'driver';

const TAB_LABELS: Record<Tab, string> = {
  all: 'All',
  ongoing: 'Ongoing',
  completed: 'Done',
  towing: 'Towing',
  driver: 'Driver',
};

export default function BookingsScreen({ navigation }: Props) {
  const { data: bookings = [], isLoading, isError, refetch } = useBookingsQuery();
  const [tab, setTab] = useState<Tab>('all');

  const filtered = useMemo(() => {
    if (tab === 'ongoing') return bookings.filter(isBookingOngoing);
    if (tab === 'completed') return bookings.filter(isBookingCompleted);
    if (tab === 'towing') return bookings.filter(b => (b.bookingType ?? 'towing') === 'towing');
    if (tab === 'driver') return bookings.filter(b => b.bookingType === 'driver');
    return bookings;
  }, [bookings, tab]);

  const activeBooking = useMemo(() => {
    if (tab === 'completed' || tab === 'towing' || tab === 'driver') return undefined;
    return bookings.find(isBookingOngoing);
  }, [bookings, tab]);

  return (
    <Screen>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ScreenContent>
            <Text style={styles.title}>Bookings</Text>
            <Text style={styles.subtitle}>Track and manage your service requests</Text>

            <View style={styles.tabs}>
              {(['all', 'ongoing', 'completed', 'towing', 'driver'] as Tab[]).map(t => (
                <Pressable
                  key={t}
                  style={[styles.tab, tab === t && styles.tabActive]}
                  onPress={() => setTab(t)}>
                  <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                    {TAB_LABELS[t]}
                  </Text>
                </Pressable>
              ))}
            </View>

            {activeBooking ? (
              <>
                <SectionTitle title="active" highlight="booking" />
                <BookingCard
                  booking={activeBooking}
                  onPress={() =>
                    navigation.navigate('LiveTracking', {
                      bookingId: activeBooking.id,
                      bookingType: activeBooking.bookingType,
                    })
                  }
                />
              </>
            ) : null}

            <SectionTitle title="booking" highlight="history" />

            {isLoading ? (
              <Text style={styles.loading}>Loading bookings...</Text>
            ) : isError ? (
              <View style={styles.errorWrap}>
                <Text style={styles.errorText}>Failed to load bookings. Pull to refresh.</Text>
                <Pressable style={styles.retryBtn} onPress={() => void refetch()}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon="calendar-outline"
                title="No bookings yet"
                subtitle="Book a towing, driver, or roadside service to get started."
                actionLabel="Browse Services"
                onAction={() => navigation.getParent()?.navigate('Home')}
              />
            ) : (
              filtered.map((booking: Booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  compact
                  onPress={() => navigation.navigate('BookingDetail', { bookingId: booking.id, bookingType: booking.bookingType })}
                />
              ))
            )}
          </ScreenContent>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  title: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.extrabold, color: colors.textDark },
  subtitle: { color: colors.textMuted, marginBottom: spacing.lg },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontWeight: typography.weights.semibold, color: colors.textMuted, fontSize: typography.sizes.sm },
  tabTextActive: { color: colors.textDark },
  loading: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
  errorWrap: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  errorText: { color: colors.error, textAlign: 'center' },
  retryBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  retryText: { color: colors.dark, fontWeight: typography.weights.bold },
});
