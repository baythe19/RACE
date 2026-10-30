import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import {
  Bell,
  CheckCircle,
  IndianRupee,
  Star,
  Tag,
  Truck,
  X,
  type LucideIcon,
} from 'lucide-react-native';

import ProfileSubScreenLayout, { useProfilePx } from '../../components/profile/ProfileSubScreenLayout';
import DataSkeleton from '../../components/ui/DataSkeleton';
import { useAuthActions } from '../../hooks/useAuth';
import { useAppDialog } from '../../hooks/useAppDialog';
import { openBookingDetailFromAnywhere } from '../../navigation/customerNavigationRef';
import { getApiErrorMessage } from '../../services/api';
import {
  useDeleteAllNotificationsMutation,
  useDeleteNotificationMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  useNotificationPrefsQuery,
  useUpdateNotificationPrefMutation,
} from '../../services/profile/useProfileQueries';
import type { AppNotification } from '../../types/profile';
import type { ServiceBookingTypeParam } from '../../types/navigation';
import { colors, typography } from '../../theme';

const ICONS: Record<string, LucideIcon> = {
  booking: Truck,
  payment: IndianRupee,
  offers: Tag,
  subscription: Star,
  general: Bell,
};

type CategoryFilter = 'All' | 'Bookings' | 'Payments' | 'Offers' | 'Account';

const FILTERS: CategoryFilter[] = ['All', 'Bookings', 'Payments', 'Offers', 'Account'];

const FILTER_CATEGORIES: Record<Exclude<CategoryFilter, 'All'>, string[]> = {
  Bookings: ['booking'],
  Payments: ['payment'],
  Offers: ['offers'],
  Account: ['subscription', 'general'],
};

const FILTER_ACTIVE = {
  bg: colors.primary,
  text: colors.dark,
} as const;

function matchesFilter(item: AppNotification, filter: CategoryFilter): boolean {
  if (filter === 'All') return true;
  return FILTER_CATEGORIES[filter].includes(item.category);
}

function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${Math.max(1, diffMins)} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function groupByDay(items: AppNotification[]) {
  const today: AppNotification[] = [];
  const earlier: AppNotification[] = [];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  items.forEach(item => {
    const created = new Date(item.createdAt);
    if (created >= startOfToday) {
      today.push(item);
    } else {
      earlier.push(item);
    }
  });

  return { today, earlier };
}

/** Booking notifications deep-link to the booking; metadata comes from backend. */
function parseBookingRef(item: AppNotification): { id: string; type: ServiceBookingTypeParam } | null {
  const meta = item.metadata;
  const bookingId = meta?.bookingId;
  if (!bookingId) return null;
  const raw = (meta?.bookingType ?? '').toLowerCase();
  const type: ServiceBookingTypeParam | null =
    raw === 'driver' || raw.includes('driver')
      ? 'driver'
      : raw === 'towing' || raw.includes('tow')
        ? 'towing'
        : null;
  if (!type) return null;
  return { id: bookingId, type };
}

interface NotificationsScreenProps {
  /** Injected by QA navigator / storybook previews. */
  onPressNotification?: (item: AppNotification) => void;
}

function NotificationCard({
  item,
  px,
  onPress,
  onDismiss,
  dismissing,
}: {
  item: AppNotification;
  px: (n: number) => number;
  onPress: (item: AppNotification) => void;
  onDismiss: (item: AppNotification) => void;
  dismissing?: boolean;
}) {
  const Icon = ICONS[item.category] ?? Bell;
  const unread = !item.read;

  return (
    <View style={{ position: 'relative', marginBottom: px(10) }}>
      <Pressable
        onPress={() => onPress(item)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: px(10),
          borderRadius: px(14),
          borderWidth: 1,
          borderColor: unread ? '#F4E8C8' : colors.border,
          backgroundColor: unread ? '#FFFBF2' : '#FFFFFF',
          padding: px(14),
          paddingRight: px(36),
          opacity: pressed ? 0.9 : 1,
        })}>
        <View
          style={{
            width: px(40),
            height: px(40),
            borderRadius: px(20),
            backgroundColor: unread ? colors.goldLight : colors.lightGrey,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
          <Icon size={px(18)} color={unread ? colors.primary : colors.grey} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: px(8) }}>
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                fontSize: px(13),
                fontWeight: typography.weights.bold,
                color: colors.dark,
              }}>
              {item.title}
            </Text>
            <Text style={{ fontSize: px(10), color: colors.grey, flexShrink: 0 }}>
              {formatNotificationTime(item.createdAt)}
            </Text>
          </View>
          <Text
            numberOfLines={2}
            style={{ fontSize: px(11), color: colors.grey, marginTop: px(4), lineHeight: px(15) }}>
            {item.body}
          </Text>
        </View>
        {unread ? (
          <View
            style={{
              width: px(8),
              height: px(8),
              borderRadius: px(4),
              backgroundColor: colors.primary,
              marginTop: px(6),
              marginLeft: px(2),
              flexShrink: 0,
            }}
          />
        ) : null}
      </Pressable>
      <Pressable
        onPress={() => onDismiss(item)}
        disabled={dismissing}
        hitSlop={10}
        style={{
          position: 'absolute',
          top: px(10),
          right: px(10),
          width: px(28),
          height: px(28),
          alignItems: 'center',
          justifyContent: 'center',
          opacity: dismissing ? 0.4 : 1,
        }}>
        <X size={px(16)} color={colors.grey} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

export default function NotificationsScreen({ onPressNotification }: NotificationsScreenProps) {
  const px = useProfilePx();
  const { logout } = useAuthActions();
  const { dialog, showDialog } = useAppDialog();
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('All');
  const { data, isLoading, isError, error, refetch } = useNotificationsQuery();
  const markRead = useMarkNotificationReadMutation();
  const deleteAll = useDeleteAllNotificationsMutation();
  const deleteOne = useDeleteNotificationMutation();
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const { data: notificationPrefs } = useNotificationPrefsQuery();
  const updatePref = useUpdateNotificationPrefMutation();

  const pushPref = notificationPrefs?.find(p => p.id === 'push');
  const offersPref = notificationPrefs?.find(p => p.id === 'offers');

  const handlePrefToggle = (prefId: string, enabled: boolean) => {
    if (updatePref.isPending) return;
    updatePref.mutate({ prefId, enabled });
  };

  const alertPrefsCard = (
    <View
      style={{
        marginBottom: px(14),
        borderRadius: px(14),
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
        padding: px(14),
      }}>
      <Text
        style={{
          fontSize: px(13),
          fontWeight: typography.weights.bold,
          color: colors.dark,
          marginBottom: px(10),
        }}>
        Alert preferences
      </Text>
      {[
        {
          pref: pushPref,
          fallbackTitle: 'Push notifications',
          fallbackDescription: 'Receive alerts on your device',
        },
        {
          pref: offersPref,
          fallbackTitle: 'Offers & promotions',
          fallbackDescription: 'Discounts and seasonal deals',
        },
      ].map((row, index) => (
        <View
          key={row.pref?.id ?? row.fallbackTitle}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: px(10),
            paddingTop: index === 0 ? 0 : px(10),
            marginTop: index === 0 ? 0 : px(10),
            borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
          }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{ fontSize: px(13), fontWeight: typography.weights.bold, color: colors.dark }}>
              {row.pref?.title ?? row.fallbackTitle}
            </Text>
            <Text numberOfLines={2} style={{ fontSize: px(11), color: colors.grey, marginTop: px(2) }}>
              {row.pref?.description ?? row.fallbackDescription}
            </Text>
          </View>
          <Switch
            value={row.pref?.enabled ?? true}
            onValueChange={value => handlePrefToggle(row.pref?.id ?? (index === 0 ? 'push' : 'offers'), value)}
            disabled={updatePref.isPending}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      ))}
    </View>
  );

  const items = data?.notifications ?? [];
  const filtered = useMemo(() => items.filter(i => matchesFilter(i, activeFilter)), [items, activeFilter]);
  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const unreadCount = data?.unreadCount ?? 0;
  const errorMessage = isError ? getApiErrorMessage(error, 'Unable to load notifications') : '';
  const sessionExpired = /session expired|sign in again/i.test(errorMessage);

  const handlePress = (item: AppNotification) => {
    if (!item.read) markRead.mutate(item.id);
    if (onPressNotification) {
      onPressNotification(item);
      return;
    }
    const ref = parseBookingRef(item);
    if (ref) {
      // Booking rows jump straight to the booking detail.
      openBookingDetailFromAnywhere(ref.id, ref.type);
    }
  };

  const handleDismiss = (item: AppNotification) => {
    if (dismissingId === item.id) return;
    setDismissingId(item.id);
    deleteOne.mutate(item.id, {
      onSettled: () => setDismissingId(null),
    });
  };

  const handleClearAll = () => {
    if (deleteAll.isPending) return;
    showDialog({
      tone: 'danger',
      title: 'Clear all notifications',
      message: 'This permanently deletes every notification. This cannot be undone.',
      secondaryLabel: 'Cancel',
      primaryLabel: 'Clear all',
      destructive: true,
      onPrimary: () => {
        deleteAll.mutate(undefined, {
          onSuccess: () => setActiveFilter('All'),
          onError: (err: unknown) => {
            showDialog({
              tone: 'error',
              title: 'Error',
              message: getApiErrorMessage(err, 'Unable to clear notifications'),
              primaryLabel: 'OK',
            });
          },
        });
      },
    });
  };

  const filterRow = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      bounces={false}
      keyboardShouldPersistTaps="handled"
      style={{ marginBottom: px(16) }}
      contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: px(6), paddingRight: px(4) }}>
      {FILTERS.map(filter => {
        const isActive = activeFilter === filter;
        return (
          <Pressable
            key={filter}
            onPress={() => setActiveFilter(filter)}
            style={{
              flexShrink: 0,
              paddingHorizontal: px(12),
              paddingVertical: px(5),
              borderRadius: px(6),
              backgroundColor: isActive ? FILTER_ACTIVE.bg : '#FFFFFF',
              borderWidth: 1,
              borderColor: isActive ? FILTER_ACTIVE.bg : colors.border,
            }}>
            <Text
              style={{
                fontSize: px(11),
                fontWeight: typography.weights.bold,
                color: isActive ? FILTER_ACTIVE.text : colors.grey,
              }}>
              {filter}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  let mainContent: React.ReactNode;

  if (isLoading) {
    mainContent = <DataSkeleton variant="list" />;
  } else if (isError) {
    mainContent = (
      <View style={{ alignItems: 'center', paddingVertical: px(36), gap: px(12) }}>
        <View
          style={{
            width: px(56),
            height: px(56),
            borderRadius: px(28),
            backgroundColor: colors.goldLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Bell size={px(26)} color={colors.primary} strokeWidth={2} />
        </View>
        <Text
          style={{
            fontSize: px(16),
            fontWeight: typography.weights.bold,
            color: colors.dark,
          }}>
          {sessionExpired ? 'Session expired' : 'Couldn’t load notifications'}
        </Text>
        <Text
          style={{
            fontSize: px(13),
            color: colors.grey,
            textAlign: 'center',
            lineHeight: px(19),
            paddingHorizontal: px(12),
          }}>
          {errorMessage}
        </Text>
        {sessionExpired ? (
          <Pressable
            onPress={() => {
              void logout().catch(() => {
                showDialog({
                  tone: 'info',
                  title: 'Sign in',
                  message: 'Please close and reopen the app, then log in again.',
                  primaryLabel: 'OK',
                });
              });
            }}
            style={{
              marginTop: px(4),
              paddingHorizontal: px(20),
              paddingVertical: px(12),
              borderRadius: px(12),
              backgroundColor: colors.primary,
            }}>
            <Text style={{ fontSize: px(14), fontWeight: typography.weights.bold, color: colors.dark }}>
              Sign in again
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => void refetch()}>
            <Text style={{ fontSize: px(13), fontWeight: typography.weights.bold, color: colors.primary }}>
              Try again
            </Text>
          </Pressable>
        )}
      </View>
    );
  } else if (items.length === 0) {
    mainContent = (
      <View style={{ alignItems: 'center', paddingVertical: px(40) }}>
        <View
          style={{
            width: px(56),
            height: px(56),
            borderRadius: px(28),
            backgroundColor: colors.goldLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: px(4),
          }}>
          <Bell size={px(26)} color={colors.primary} strokeWidth={2} />
        </View>
        <Text style={{ marginTop: px(10), fontSize: px(15), fontWeight: typography.weights.bold, color: colors.dark }}>
          No notifications yet
        </Text>
        <Text style={{ marginTop: px(6), fontSize: px(12), color: colors.grey, textAlign: 'center' }}>
          Booking and payment updates will show up here.
        </Text>
      </View>
    );
  } else {
    mainContent = (
      <>
        {filterRow}
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: px(32) }}>
            <Bell size={px(24)} color={colors.grey} strokeWidth={1.8} />
            <Text style={{ marginTop: px(8), fontSize: px(12.5), color: colors.grey }}>
              {activeFilter === 'All'
                ? 'No notifications'
                : `No ${activeFilter.toLowerCase()} notifications`}
            </Text>
          </View>
        ) : null}
        {groups.today.length > 0 ? (
          <>
            <Text
              style={{
                fontSize: px(11),
                fontWeight: typography.weights.bold,
                color: colors.grey,
                letterSpacing: 0.8,
                marginBottom: px(8),
              }}>
              TODAY
            </Text>
            {groups.today.map(item => (
              <NotificationCard
                key={item.id}
                item={item}
                px={px}
                onPress={handlePress}
                onDismiss={handleDismiss}
                dismissing={dismissingId === item.id}
              />
            ))}
          </>
        ) : null}
        {groups.earlier.length > 0 ? (
          <>
            <Text
              style={{
                fontSize: px(11),
                fontWeight: typography.weights.bold,
                color: colors.grey,
                letterSpacing: 0.8,
                marginTop: groups.today.length > 0 ? px(8) : 0,
                marginBottom: px(8),
              }}>
              EARLIER
            </Text>
            {groups.earlier.map(item => (
              <NotificationCard
                key={item.id}
                item={item}
                px={px}
                onPress={handlePress}
                onDismiss={handleDismiss}
                dismissing={dismissingId === item.id}
              />
            ))}
          </>
        ) : null}
        {unreadCount === 0 && filtered.length > 0 ? (
          <View style={{ alignItems: 'center', paddingTop: px(16), paddingBottom: px(8) }}>
            <CheckCircle size={px(28)} color={colors.success} />
            <Text style={{ marginTop: px(8), fontSize: px(13), color: colors.grey }}>
              You're all caught up!
            </Text>
          </View>
        ) : null}
      </>
    );
  }

  return (
    <ProfileSubScreenLayout
      title="Notifications"
      headerRight={
        !isError && items.length > 0 ? (
          <Pressable onPress={handleClearAll} hitSlop={8} disabled={deleteAll.isPending}>
            <Text
              style={{
                fontSize: px(12),
                fontWeight: typography.weights.bold,
                color: deleteAll.isPending ? colors.grey : colors.error,
              }}>
              {deleteAll.isPending ? 'Clearing…' : 'Clear all'}
            </Text>
          </Pressable>
        ) : null
      }>
      {dialog}
      {alertPrefsCard}
      {mainContent}
    </ProfileSubScreenLayout>
  );
}
