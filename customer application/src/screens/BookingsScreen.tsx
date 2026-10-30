import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ActiveBookingCard from '../components/bookings/ActiveBookingCard';
import BookingHistoryRow from '../components/bookings/BookingHistoryRow';
import AppScreenLayout from '../components/ui/AppScreenLayout';
import DataSkeleton from '../components/ui/DataSkeleton';
import EmptyState from '../components/ui/EmptyState';
import TabRootHeader from '../components/ui/TabRootHeader';
import { BOOKING_TABS, type BookingTabId } from '../constants/bookingsScreen';
import { useBookingsQuery } from '../services/bookings/useBookingQueries';
import { useNotificationsQuery } from '../services/profile/useProfileQueries';
import type { BookingsStackParamList, RootTabParamList } from '../types/navigation';
import {
  isBookingCompleted,
  isBookingOngoing,
  mapBookingToActiveCard,
  mapBookingToHistoryRow,
} from '../utils/bookingDisplay';
import { colors, typography } from '../theme';

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
  const { data: bookings = [], isPending, isLoading, refetch, isRefetching } = useBookingsQuery();
  const { data: notificationsData } = useNotificationsQuery();
  const unreadCount = notificationsData?.unreadCount ?? 0;

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

  const historyItems = useMemo(() => [...otherList, ...historyList], [otherList, historyList]);

  /** Filters already say Ongoing / Done / Towing / Driver — no redundant section titles. */
  const showOngoingCards =
    (activeTab === 'all' ||
      activeTab === 'ongoing' ||
      activeTab === 'towing' ||
      activeTab === 'driver') &&
    ongoingList.length > 0;

  const showHistoryCards =
    (activeTab === 'all' ||
      activeTab === 'completed' ||
      activeTab === 'towing' ||
      activeTab === 'driver') &&
    historyItems.length > 0;

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

  const hasVisibleBookings = showOngoingCards || showHistoryCards;
  const showBookingsSkeleton = isPending && bookings.length === 0;
  const showEmptyScene = !showBookingsSkeleton && !isRefetching && !hasVisibleBookings;

  /** On All: active trips exist but no past jobs — soft hint under the list. */
  const showPastEmptyHint =
    activeTab === 'all' &&
    showOngoingCards &&
    !showHistoryCards &&
    !isLoading &&
    !isPending &&
    !isRefetching;

  const emptyCopy = (() => {
    if (bookings.length === 0) {
      return {
        title: 'No bookings yet',
        subtitle: 'Book towing or a driver from Home. Active and past jobs will show up here.',
        actionLabel: 'Browse services',
      };
    }
    if (activeTab === 'ongoing') {
      return {
        title: 'No ongoing bookings',
        subtitle: 'Nothing in progress right now. Check All or Done for other requests.',
        actionLabel: undefined,
      };
    }
    if (activeTab === 'completed') {
      return {
        title: 'No completed bookings',
        subtitle: 'Finished jobs will appear here once a trip is done.',
        actionLabel: undefined,
      };
    }
    if (activeTab === 'towing' || activeTab === 'driver') {
      return {
        title: `No ${activeTab} bookings`,
        subtitle: 'Try All, or book this service from Home.',
        actionLabel: 'Browse services',
      };
    }
    return {
      title: 'No bookings to show',
      subtitle: 'Pull down to refresh, or book a service from Home.',
      actionLabel: 'Browse services',
    };
  })();

  const goHomeServices = () => {
    const tabNav = navigation.getParent();
    tabNav?.navigate('Home' as never);
  };

  return (
    <AppScreenLayout
      backgroundColor={colors.pageBg}
      horizontalPadding={px(14)}
      refreshing={isRefetching}
      onRefresh={() => {
        void refetch();
      }}
      contentStyle={
        showEmptyScene || showBookingsSkeleton ? styles.fillContent : undefined
      }
      header={
        <TabRootHeader
          title="Bookings"
          notificationCount={unreadCount}
          onBellPress={() => {
            const tabNav = navigation.getParent();
            if (tabNav) {
              (tabNav as { navigate: (name: string, params?: object) => void }).navigate('Profile', {
                screen: 'Notifications',
              });
            }
          }}
          onAvatarPress={() => {
            const tabNav = navigation.getParent();
            tabNav?.navigate('Profile' as never);
          }}
        />
      }>
      <View
        style={[
          styles.tabsRow,
          {
            marginTop: px(12),
            marginBottom: px(12),
            gap: px(6),
          },
        ]}>
        {BOOKING_TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tab,
                {
                  paddingVertical: px(5),
                  paddingHorizontal: px(12),
                  borderRadius: px(6),
                  borderColor: isActive ? colors.primary : colors.border,
                  backgroundColor: isActive ? colors.primary : '#FFFFFF',
                },
              ]}>
              <Text
                style={{
                  fontSize: px(11),
                  fontWeight: typography.weights.bold,
                  color: isActive ? colors.dark : colors.grey,
                }}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {showBookingsSkeleton ? (
        <View style={styles.centeredFill}>
          <DataSkeleton variant="bookings" testID="bookingsSkeleton" />
        </View>
      ) : null}

      {showEmptyScene ? (
        <EmptyState
          fill
          icon="file-tray-outline"
          title={emptyCopy.title}
          subtitle={emptyCopy.subtitle}
          actionLabel={emptyCopy.actionLabel}
          onAction={emptyCopy.actionLabel ? goHomeServices : undefined}
        />
      ) : null}

      {showOngoingCards
        ? ongoingList.map(booking => (
            <ActiveBookingCard
              key={booking.id}
              booking={booking}
              px={px}
              onTrack={() => openTrack(booking.id, booking.bookingType)}
              onPress={() => openDetail(booking.id, booking.bookingType)}
            />
          ))
        : null}

      {showHistoryCards
        ? historyItems.map(item => (
            <BookingHistoryRow
              key={item.id}
              item={item}
              px={px}
              onPress={() => openDetail(item.id, item.bookingType)}
            />
          ))
        : null}

      {showPastEmptyHint ? (
        <Text
          style={{
            marginTop: px(8),
            marginBottom: px(4),
            fontSize: px(12),
            color: colors.grey,
            textAlign: 'center',
          }}>
          No past bookings yet
        </Text>
      ) : null}
    </AppScreenLayout>
  );
}

const styles = StyleSheet.create({
  fillContent: {
    flexGrow: 1,
  },
  centeredFill: {
    flexGrow: 1,
    alignSelf: 'stretch',
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
});
