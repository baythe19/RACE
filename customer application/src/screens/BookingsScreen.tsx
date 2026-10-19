import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Headphones, Phone } from 'lucide-react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ActiveBookingCard from '../components/bookings/ActiveBookingCard';
import BookingHistoryRow from '../components/bookings/BookingHistoryRow';
import AppScreenLayout from '../components/ui/AppScreenLayout';
import TabRootHeader from '../components/ui/TabRootHeader';
import { BOOKING_TABS, type BookingTabId } from '../constants/bookingsScreen';
import { useBookingsQuery } from '../services/bookings/useBookingQueries';
import { brand } from '../theme/brand';
import type { BookingsStackParamList, RootTabParamList } from '../types/navigation';
import {
  isBookingCompleted,
  isBookingOngoing,
  mapBookingToActiveCard,
  mapBookingToHistoryRow,
} from '../utils/bookingDisplay';
import { colors, shadows, typography } from '../theme';

const REF_W = 390;

type BookingsNav = CompositeNavigationProp<
  NativeStackNavigationProp<BookingsStackParamList, 'BookingsMain'>,
  BottomTabNavigationProp<RootTabParamList>
>;

export default function BookingsScreen() {
  const navigation = useNavigation<BookingsNav>();
  const { width } = useWindowDimensions();
  const s = width / REF_W;
  const px = (n: number) => Math.round(n * s);
  const [activeTab, setActiveTab] = useState<BookingTabId>('all');
  const { data: bookings = [], isLoading, refetch, isRefetching } = useBookingsQuery();
  const [loadError, setLoadError] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      void refetch().then(result => {
        setLoadError(result.error ? 'Failed to load bookings. Pull to refresh.' : null);
      });
    }, [refetch]),
  );

  const typeFiltered = useMemo(() => {
    if (activeTab === 'towing') {
      return bookings.filter(b => (b.bookingType ?? 'towing') === 'towing');
    }
    if (activeTab === 'driver') {
      return bookings.filter(b => b.bookingType === 'driver');
    }
    return bookings;
  }, [activeTab, bookings]);

  const ongoingList = useMemo(
    () => typeFiltered.filter(isBookingOngoing).map(mapBookingToActiveCard),
    [typeFiltered],
  );

  const historyList = useMemo(
    () => typeFiltered.filter(isBookingCompleted).map(mapBookingToHistoryRow),
    [typeFiltered],
  );

  /** Catch bookings that are neither ongoing nor completed so they still appear. */
  const otherList = useMemo(
    () =>
      typeFiltered
        .filter(b => !isBookingOngoing(b) && !isBookingCompleted(b))
        .map(mapBookingToHistoryRow),
    [typeFiltered],
  );

  const showOngoing =
    activeTab === 'all' ||
    activeTab === 'ongoing' ||
    activeTab === 'towing' ||
    activeTab === 'driver';
  const showHistory =
    activeTab === 'all' ||
    activeTab === 'completed' ||
    activeTab === 'towing' ||
    activeTab === 'driver';

  const openTrack = (bookingId: string, bookingType: 'towing' | 'driver') => {
    if (bookingType === 'driver') {
      navigation.navigate('DriverTrack', { bookingId, bookingType, fromBookings: true });
      return;
    }
    navigation.navigate('TowingTrack', { bookingId, bookingType, fromBookings: true });
  };

  const openDetail = (bookingId: string, bookingType: 'towing' | 'driver') => {
    navigation.navigate('BookingDetail', { bookingId, bookingType });
  };

  const isEmpty =
    !isLoading &&
    !isRefetching &&
    !loadError && // UX fix: with a load error, show only the error card — the "No bookings yet" empty state must not appear alongside it.
    ongoingList.length === 0 &&
    historyList.length === 0 &&
    otherList.length === 0;

  return (
    <AppScreenLayout
      backgroundColor={colors.pageBg}
      refreshing={isRefetching}
      onRefresh={() => {
        void refetch().then(result => {
          setLoadError(result.error ? 'Failed to load bookings. Pull to refresh.' : null);
        });
      }}
      header={
        <TabRootHeader
          title="Bookings"
          subtitle="Track and manage your service requests"
          onAvatarPress={() => {
            const tabNav = navigation.getParent();
            tabNav?.navigate('Profile' as never);
          }}
        />
      }>
      <View style={[styles.tabsWrap, { marginTop: px(16), marginBottom: px(16), gap: px(8) }]}>
        {BOOKING_TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tab,
                {
                  paddingVertical: px(8),
                  paddingHorizontal: px(14),
                  borderRadius: px(20),
                  borderColor: isActive ? colors.primary : colors.border,
                  backgroundColor: isActive ? colors.primary : colors.background,
                },
              ]}>
              <Text
                style={{
                  fontSize: px(12),
                  fontWeight: typography.weights.bold,
                  color: isActive ? colors.dark : colors.grey,
                }}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading && bookings.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: px(32) }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ marginTop: px(10), fontSize: px(13), color: colors.grey }}>
            Loading bookings…
          </Text>
        </View>
      ) : null}

      {loadError ? (
        <View
          style={{
            borderRadius: px(12),
            borderWidth: 1,
            borderColor: colors.error,
            backgroundColor: '#FEE2E2',
            padding: px(12),
            marginBottom: px(12),
          }}>
          <Text
            style={{
              color: colors.error,
              fontSize: px(12),
              fontWeight: typography.weights.semibold,
              marginBottom: px(8),
            }}>
            {loadError}
          </Text>
          <Pressable onPress={() => void refetch()}>
            <Text style={{ color: colors.primaryDark, fontWeight: typography.weights.bold }}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : null}

      {isEmpty ? (
        <View
          style={[
            styles.emptyCard,
            shadows.card,
            { borderRadius: px(16), padding: px(24), marginBottom: px(16) },
          ]}>
          <Text
            style={{
              fontSize: px(16),
              fontWeight: typography.weights.bold,
              color: colors.dark,
              textAlign: 'center',
            }}>
            No bookings yet
          </Text>
          <Text
            style={{
              marginTop: px(8),
              fontSize: px(13),
              color: colors.grey,
              textAlign: 'center',
              lineHeight: px(18),
            }}>
            Book a towing or driver service from Home. Once a vendor assigns a partner, it will
            show here as active.
          </Text>
          <Pressable
            onPress={() => {
              const tabNav = navigation.getParent();
              tabNav?.navigate('Home' as never);
            }}
            style={{
              marginTop: px(16),
              alignSelf: 'center',
              backgroundColor: colors.primary,
              borderRadius: px(12),
              paddingHorizontal: px(18),
              paddingVertical: px(12),
            }}>
            <Text style={{ fontWeight: typography.weights.bold, color: colors.dark }}>
              Browse services
            </Text>
          </Pressable>
        </View>
      ) : null}

      {showOngoing && !isEmpty ? (
        <View style={{ marginBottom: px(8) }}>
          <Text
            style={{
              fontSize: px(16),
              fontWeight: typography.weights.bold,
              color: colors.dark,
              marginBottom: px(10),
            }}>
            {activeTab === 'ongoing' ? 'Ongoing bookings' : 'Active bookings'}
            {ongoingList.length > 0 ? ` (${ongoingList.length})` : ''}
          </Text>
          {ongoingList.length === 0 ? (
            <Text style={{ fontSize: px(13), color: colors.grey, marginBottom: px(12) }}>
              No ongoing bookings right now.
            </Text>
          ) : (
            ongoingList.map(booking => (
              <ActiveBookingCard
                key={booking.id}
                booking={booking}
                px={px}
                onTrack={() => openTrack(booking.id, booking.bookingType)}
                onPress={() => openDetail(booking.id, booking.bookingType)}
              />
            ))
          )}
        </View>
      ) : null}

      {showHistory && !isEmpty ? (
        <View>
          <Text
            style={{
              fontSize: px(16),
              fontWeight: typography.weights.bold,
              color: colors.dark,
              marginBottom: px(10),
            }}>
            Booking history
          </Text>

          {historyList.length === 0 && otherList.length === 0 ? (
            <Text style={{ fontSize: px(13), color: colors.grey, marginBottom: px(12) }}>
              Completed bookings will appear here.
            </Text>
          ) : (
            [...otherList, ...historyList].map(item => (
              <BookingHistoryRow
                key={item.id}
                item={item}
                px={px}
                onPress={() => openDetail(item.id, item.bookingType)}
              />
            ))
          )}
        </View>
      ) : null}

      <View
        style={[
          styles.supportCard,
          {
            marginTop: px(12),
            borderRadius: px(14),
            padding: px(14),
            gap: px(12),
          },
        ]}>
        <View
          style={{
            width: px(44),
            height: px(44),
            borderRadius: px(22),
            backgroundColor: colors.goldLight,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
          <Headphones size={px(20)} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontSize: px(14),
              fontWeight: typography.weights.bold,
              color: colors.dark,
              marginBottom: px(2),
            }}>
            Need help with a booking?
          </Text>
          <Text style={{ fontSize: px(12), color: colors.grey }}>Support team available 24/7.</Text>
        </View>
        <Pressable
          onPress={() => void Linking.openURL(`tel:${brand.phoneRaw}`)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: px(6),
            paddingHorizontal: px(12),
            paddingVertical: px(10),
            borderRadius: px(10),
            borderWidth: 1.5,
            borderColor: colors.primary,
            backgroundColor: colors.background,
            flexShrink: 0,
          }}>
          <Phone size={px(14)} color={colors.primary} strokeWidth={2.5} />
          <Text
            style={{
              fontSize: px(12),
              fontWeight: typography.weights.bold,
              color: colors.primaryDark,
            }}>
            Call
          </Text>
        </Pressable>
      </View>
    </AppScreenLayout>
  );
}

const styles = StyleSheet.create({
  tabsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
});
