import React, { useMemo } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Bell, CheckCircle, IndianRupee, Star, Tag, Truck, type LucideIcon } from 'lucide-react-native';

import ProfileSubScreenLayout, { useProfilePx } from '../../components/profile/ProfileSubScreenLayout';
import DataSkeleton from '../../components/ui/DataSkeleton';
import { useAuthActions } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/api';
import {
  useMarkAllNotificationsReadMutation,
  useNotificationsQuery,
} from '../../services/profile/useProfileQueries';
import type { AppNotification } from '../../types/profile';
import { colors, typography } from '../../theme';

const ICONS: Record<string, LucideIcon> = {
  booking: Truck,
  payment: IndianRupee,
  offers: Tag,
  subscription: Star,
  general: Bell,
};

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

function NotificationCard({ item, px }: { item: AppNotification; px: (n: number) => number }) {
  const Icon = ICONS[item.category] ?? Bell;
  const unread = !item.read;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: px(10),
        borderRadius: px(12),
        borderWidth: 1,
        borderColor: unread ? '#FFE4A8' : colors.border,
        borderLeftWidth: unread ? px(4) : 1,
        borderLeftColor: unread ? colors.primary : colors.border,
        backgroundColor: unread ? '#FFFBF0' : colors.background,
        padding: px(12),
        marginBottom: px(10),
      }}>
      <View
        style={{
          width: px(38),
          height: px(38),
          borderRadius: px(19),
          backgroundColor: unread ? colors.goldLight : colors.lightGrey,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
        <Icon size={px(18)} color={unread ? colors.primary : colors.grey} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: px(8) }}>
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
        <Text style={{ fontSize: px(11), color: colors.grey, marginTop: px(4), lineHeight: px(15) }}>
          {item.body}
        </Text>
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const px = useProfilePx();
  const { logout } = useAuthActions();
  const { data, isLoading, isError, error, refetch } = useNotificationsQuery();
  const markAllRead = useMarkAllNotificationsReadMutation();

  const items = data?.notifications ?? [];
  const groups = useMemo(() => groupByDay(items), [items]);
  const errorMessage = isError ? getApiErrorMessage(error, 'Unable to load notifications') : '';
  const sessionExpired = /session expired|sign in again/i.test(errorMessage);

  const handleMarkAllRead = () => {
    if (markAllRead.isPending) return;
    markAllRead.mutate(undefined, {
      onError: err => {
        Alert.alert('Error', getApiErrorMessage(err, 'Unable to mark notifications as read'));
      },
    });
  };

  return (
    <ProfileSubScreenLayout
      title="Notifications"
      subtitle="Booking updates and trip alerts"
      headerRight={
        !isError && items.length > 0 ? (
          <Pressable onPress={handleMarkAllRead} hitSlop={8} disabled={markAllRead.isPending}>
            <Text
              style={{
                fontSize: px(12),
                fontWeight: typography.weights.bold,
                color: markAllRead.isPending ? colors.grey : colors.primary,
              }}>
              Mark all read
            </Text>
          </Pressable>
        ) : null
      }>
      {isLoading ? (
        <DataSkeleton variant="list" />
      ) : isError ? (
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
                  Alert.alert('Sign in', 'Please close and reopen the app, then log in again.');
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
      ) : items.length === 0 ? (
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
      ) : (
        <>
          {data?.unreadCount && data.unreadCount > 0 ? (
            <Text
              style={{
                fontSize: px(11),
                fontWeight: typography.weights.bold,
                color: colors.grey,
                letterSpacing: 0.6,
                marginBottom: px(10),
              }}>
              {data.unreadCount} UNREAD
            </Text>
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
                <NotificationCard key={item.id} item={item} px={px} />
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
                  marginTop: px(4),
                  marginBottom: px(8),
                }}>
                EARLIER
              </Text>
              {groups.earlier.map(item => (
                <NotificationCard key={item.id} item={item} px={px} />
              ))}
            </>
          ) : null}

          {data?.unreadCount === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: px(16), paddingBottom: px(8) }}>
              <CheckCircle size={px(28)} color={colors.success} />
              <Text style={{ marginTop: px(8), fontSize: px(13), color: colors.grey }}>
                You're all caught up!
              </Text>
            </View>
          ) : null}
        </>
      )}
    </ProfileSubScreenLayout>
  );
}
