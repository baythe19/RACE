import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Truck, ChevronRight } from 'lucide-react-native';

import { useDriverJobsQuery } from '../../../services/driver/useDriverQueries';
import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';
import type { PartnerAccountStackParamList } from '../../../types/partnerNavigation';
import PartnerScreenLayout from '../../../components/partner/PartnerScreenLayout';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'PartnerTripHistory'>;

type StatusTab = 'All' | 'Completed' | 'Cancelled';

const HISTORY_DATA = [
  { id: '1', bookingNumber: '#TOW-10048', time: '12 Oct, 5:24 pm', fare: '₹1,650', status: 'Completed' },
  { id: '2', bookingNumber: '#TOW-10047', time: '12 Oct, 1:10 pm', fare: '₹1,200', status: 'Completed' },
  { id: '3', bookingNumber: '#TOW-10046', time: '11 Oct, 8:40 pm', fare: '₹1,850', status: 'Completed' },
  { id: '4', bookingNumber: '#TOW-10045', time: '11 Oct, 12:15 pm', fare: '₹1,400', status: 'Completed' },
  { id: '5', bookingNumber: '#TOW-10044', time: '10 Oct, 6:22 pm', fare: '₹1,200', status: 'Cancelled' },
];

export default function PartnerTripHistoryScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<StatusTab>('All');
  const { data: realJobs = [] } = useDriverJobsQuery();

  const tripList = useMemo(() => {
    if (realJobs.length > 0) {
      return realJobs.map(job => {
        const d = new Date(job.createdAt);
        const dateStr = !isNaN(d.getTime())
          ? `${d.toLocaleDateString([], { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
          : 'Recent';
        return {
          id: job.id,
          bookingNumber: job.bookingNumber ? `#${job.bookingNumber}` : `#${job.id.slice(-6)}`,
          time: dateStr,
          fare: typeof job.estimatedFare === 'number' ? `₹${Math.round(job.estimatedFare).toLocaleString('en-IN')}` : '₹—',
          status: job.status === 'COMPLETED' ? 'Completed' : job.status === 'CANCELLED' ? 'Cancelled' : 'Completed',
        };
      });
    }
    return HISTORY_DATA;
  }, [realJobs]);

  const filtered = tripList.filter(item => {
    if (activeTab === 'All') return true;
    return item.status === activeTab;
  });

  return (
    <PartnerScreenLayout
      title="Trip History"
      onBack={() => navigation.goBack()}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['All', 'Completed', 'Cancelled'] as StatusTab[]).map(tab => {
          const isSelected = activeTab === tab;
          return (
            <Pressable
              key={tab}
              style={[styles.tabButton, isSelected && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}>
              <Text
                style={[
                  styles.tabText,
                  isSelected && styles.tabTextActive,
                ]}>
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Trip List */}
      <View style={styles.tripList}>
        {filtered.map(trip => {
          const isCancelled = trip.status === 'Cancelled';
          return (
            <Pressable
              key={trip.id}
              style={({ pressed }) => [
                styles.tripRow,
                getPressableFeedback(pressed),
              ]}
              onPress={() => {
                // Return to jobs or navigate to job detail
              }}>
              <View
                style={[
                  styles.tripIconCircle,
                  isCancelled ? styles.iconCircleRed : styles.iconCircleBlue,
                ]}>
                <Truck
                  size={18}
                  color={isCancelled ? driverColors.red : '#0284C7'}
                  strokeWidth={2.2}
                />
              </View>

              <View style={styles.metaCol}>
                <Text style={styles.bookingNumber}>{trip.bookingNumber}</Text>
                <Text style={styles.timeText}>{trip.time}</Text>
              </View>

              <View style={styles.fareCol}>
                <Text style={styles.fareText}>{trip.fare}</Text>
                <View
                  style={[
                    styles.statusPill,
                    isCancelled ? styles.statusPillRed : styles.statusPillGreen,
                  ]}>
                  <Text
                    style={[
                      styles.statusText,
                      isCancelled ? styles.statusTextRed : styles.statusTextGreen,
                    ]}>
                    {trip.status}
                  </Text>
                </View>
              </View>

              <ChevronRight size={16} color="#C4C7D0" strokeWidth={2.2} />
            </Pressable>
          );
        })}
      </View>
    </PartnerScreenLayout>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: driverColors.light,
    borderRadius: driverRadius.pill,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: driverRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: driverColors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: driverColors.grey,
  },
  tabTextActive: {
    fontWeight: '800',
    color: driverColors.ink,
  },
  tripList: {
    gap: 10,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: driverColors.hairline,
  },
  tripIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconCircleBlue: {
    backgroundColor: '#F0F9FF',
  },
  iconCircleRed: {
    backgroundColor: driverColors.redPill,
  },
  metaCol: {
    flex: 1,
  },
  bookingNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: driverColors.ink,
  },
  timeText: {
    fontSize: 12,
    color: driverColors.grey,
    marginTop: 2,
  },
  fareCol: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  fareText: {
    fontSize: 14,
    fontWeight: '800',
    color: driverColors.ink,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  statusPillGreen: {
    backgroundColor: driverColors.greenPill,
  },
  statusPillRed: {
    backgroundColor: driverColors.redPill,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextGreen: {
    color: driverColors.green,
  },
  statusTextRed: {
    color: driverColors.red,
  },
});
