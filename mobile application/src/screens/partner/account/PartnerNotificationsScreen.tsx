import { PartnerText } from '../../../components/partner/PartnerText';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Truck,
  CheckCircle,
  Shield,
  CreditCard,
  AlertTriangle,
  FileText,
  Bell,
} from 'lucide-react-native';

import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';
import type { PartnerAccountStackParamList } from '../../../types/partnerNavigation';
import PartnerScreenLayout from '../../../components/partner/PartnerScreenLayout';
import {
  useNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '../../../services/useNotificationQueries';
import type { PartnerNotificationItem } from '../../../services/notificationService';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'PartnerNotifications'>;

type CategoryFilter = 'All' | 'Job Updates' | 'Drivers & Vehicles' | 'Account' | 'Earnings';

export default function PartnerNotificationsScreen({ navigation }: Props) {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('All');
  const { data, isLoading, refetch } = useNotificationsQuery();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();
  const markReadMutation = useMarkNotificationReadMutation();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? notifications.filter(n => !n.isRead).length;

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'All') return notifications;
    if (activeFilter === 'Job Updates') {
      return notifications.filter(
        n => n.type === 'JOB_OFFER' || n.type === 'BOOKING_UPDATE' || n.type === 'BOOKING_CONFIRMED' || n.type === 'BOOKING_COMPLETED',
      );
    }
    if (activeFilter === 'Drivers & Vehicles') {
      return notifications.filter(
        n =>
          n.type === 'DRIVER_ACTIVITY' ||
          n.type === 'VEHICLE_ACTIVITY' ||
          n.metadata?.entityType === 'driver' ||
          n.metadata?.entityType === 'vehicle' ||
          n.title?.toLowerCase().includes('driver') ||
          n.title?.toLowerCase().includes('vehicle') ||
          n.title?.toLowerCase().includes('assigned'),
      );
    }
    if (activeFilter === 'Account') {
      return notifications.filter(n => n.type === 'ACCOUNT' || n.type === 'SERVICE_RATING');
    }
    if (activeFilter === 'Earnings') {
      return notifications.filter(n => n.type === 'PAYMENT' || n.type === 'PAYMENT_SUCCESS');
    }
    return notifications;
  }, [notifications, activeFilter]);

  // Group into Today and Yesterday
  const { todayItems, yesterdayItems } = useMemo(() => {
    const now = new Date();
    const today: PartnerNotificationItem[] = [];
    const yesterday: PartnerNotificationItem[] = [];

    filteredNotifications.forEach(item => {
      const d = new Date(item.createdAt);
      const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
      if (diffHours < 24) {
        today.push(item);
      } else {
        yesterday.push(item);
      }
    });

    return { todayItems: today, yesterdayItems: yesterday };
  }, [filteredNotifications]);

  const handleItemPress = (item: PartnerNotificationItem) => {
    if (!item.isRead) {
      markReadMutation.mutate(item.id);
    }
    if (item.type === 'JOB_OFFER' || item.type === 'BOOKING_UPDATE') {
      navigation.navigate('PartnerTripHistory');
    } else if (item.type === 'ACCOUNT') {
      navigation.navigate('PartnerDocuments');
    } else if (item.type === 'PAYMENT') {
      navigation.navigate('PartnerEarnings');
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'JOB_OFFER':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#F0F9FF' }]}>
            <Truck size={18} color="#0284C7" strokeWidth={2.2} />
          </View>
        );
      case 'BOOKING_UPDATE':
        return (
          <View style={[styles.iconCircle, { backgroundColor: driverColors.greenPill }]}>
            <CheckCircle size={18} color={driverColors.green} strokeWidth={2.2} />
          </View>
        );
      case 'PAYMENT':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#F5F3FF' }]}>
            <CreditCard size={18} color="#7C3AED" strokeWidth={2.2} />
          </View>
        );
      case 'ACCOUNT':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#FFFBEB' }]}>
            <FileText size={18} color="#D97706" strokeWidth={2.2} />
          </View>
        );
      default:
        return (
          <View style={[styles.iconCircle, { backgroundColor: driverColors.light }]}>
            <Bell size={18} color={driverColors.ink} strokeWidth={2.2} />
          </View>
        );
    }
  };

  const renderNotificationRow = (item: PartnerNotificationItem) => {
    const formattedTime = new Date(item.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          styles.notifRow,
          !item.isRead && styles.notifRowUnread,
          getPressableFeedback(pressed),
        ]}
        onPress={() => handleItemPress(item)}>
        {renderIcon(item.type)}

        <View style={styles.textCol}>
          <View style={styles.rowTop}>
            <PartnerText style={styles.itemTitle}>{item.title}</PartnerText>
            <PartnerText style={styles.itemTime}>{formattedTime}</PartnerText>
          </View>
          <PartnerText style={styles.itemMessage} numberOfLines={2}>
            {item.message}
          </PartnerText>
        </View>

        {!item.isRead ? <View style={styles.unreadDot} /> : null}
      </Pressable>
    );
  };

  return (
    <PartnerScreenLayout
      title={unreadCount > 0 ? `Notifications (${unreadCount})` : 'Notifications'}
      onBack={() => navigation.goBack()}
      headerRight={
        <Pressable
          hitSlop={10}
          style={({ pressed }) => ({
            paddingVertical: 4,
            paddingHorizontal: 6,
            borderRadius: 6,
            backgroundColor: pressed ? '#FEF3C7' : 'transparent',
            flexShrink: 0,
          })}
          onPress={() => markAllReadMutation.mutate()}>
          <PartnerText style={styles.markReadText} numberOfLines={1}>
            Mark all read
          </PartnerText>
        </Pressable>
      }>
      {/* Category Filter Chips */}
      <View style={styles.filterRow}>
        {(['All', 'Job Updates', 'Drivers & Vehicles', 'Account', 'Earnings'] as CategoryFilter[]).map(cat => {
          const isSelected = activeFilter === cat;
          return (
            <Pressable
              key={cat}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              onPress={() => setActiveFilter(cat)}>
              <PartnerText
                style={[
                  styles.filterChipText,
                  isSelected && styles.filterChipTextActive,
                ]}>
                {cat}
              </PartnerText>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="small" color={driverColors.amber} />
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Bell size={40} color={driverColors.greySoft} strokeWidth={1.5} />
          <PartnerText style={styles.emptyTitle}>No notifications yet</PartnerText>
          <PartnerText style={styles.emptySubtitle}>
            You will see job updates, verification alerts, and payout notices here.
          </PartnerText>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {todayItems.length > 0 ? (
            <View style={styles.sectionBlock}>
              <PartnerText style={styles.sectionHeader}>Today</PartnerText>
              <View style={styles.itemsWrapper}>
                {todayItems.map(renderNotificationRow)}
              </View>
            </View>
          ) : null}

          {yesterdayItems.length > 0 ? (
            <View style={styles.sectionBlock}>
              <PartnerText style={styles.sectionHeader}>Yesterday</PartnerText>
              <View style={styles.itemsWrapper}>
                {yesterdayItems.map(renderNotificationRow)}
              </View>
            </View>
          ) : null}
        </View>
      )}
    </PartnerScreenLayout>
  );
}

const styles = StyleSheet.create({
  markReadText: {
    fontSize: 13,
    fontWeight: '700',
    color: driverColors.amberText,
    flexShrink: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: driverRadius.pill,
    backgroundColor: driverColors.light,
    borderWidth: 1,
    borderColor: driverColors.hairline,
  },
  filterChipActive: {
    backgroundColor: driverColors.amber,
    borderColor: driverColors.amber,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: driverColors.grey,
  },
  filterChipTextActive: {
    color: driverColors.white,
    fontWeight: '700',
  },
  loaderCenter: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: driverColors.ink,
  },
  emptySubtitle: {
    fontSize: 13,
    color: driverColors.grey,
    textAlign: 'center',
    lineHeight: 18,
  },
  listContainer: {
    gap: 20,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: driverColors.ink,
    marginBottom: 4,
  },
  itemsWrapper: {
    gap: 8,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: driverColors.hairline,
  },
  notifRowUnread: {
    backgroundColor: '#FFFDF9',
    borderColor: '#FEEFC8',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textCol: {
    flex: 1,
    marginRight: 6,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: driverColors.ink,
  },
  itemTime: {
    fontSize: 11,
    color: driverColors.greySoft,
  },
  itemMessage: {
    fontSize: 12,
    color: driverColors.grey,
    lineHeight: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0057FD',
    marginLeft: 4,
  },
});
