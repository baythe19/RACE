import { PartnerText } from '../../../components/partner/PartnerText';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Truck, ChevronRight } from 'lucide-react-native';

import { useDriverJobsQuery, useRefreshDriverDataOnFocus } from '../../../services/driver/useDriverQueries';
import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';
import type { PartnerAccountStackParamList } from '../../../types/partnerNavigation';
import PartnerScreenLayout from '../../../components/partner/PartnerScreenLayout';
import { isCancelledBookingStatus, isClosedBookingStatus } from '../../../utils/driverBookingStatus';
import DriverDataSkeleton from '../../../components/partner/DriverDataSkeleton';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'PartnerTripHistory'>;

type StatusTab = 'All' | 'Completed' | 'Cancelled';

export default function PartnerTripHistoryScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<StatusTab>('All');
  const jobsQuery = useDriverJobsQuery();
  const { data: realJobs = [] } = jobsQuery;
  useRefreshDriverDataOnFocus(true);

  const tripList = useMemo(() => {
    if (realJobs.length > 0) {
      return realJobs.filter(job => isClosedBookingStatus(job.status)).map(job => {
        const d = new Date(job.createdAt);
        const dateStr = !isNaN(d.getTime())
          ? `${d.toLocaleDateString([], { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
          : 'Recent';
        return {
          id: job.id,
          bookingNumber: job.bookingNumber ? `#${job.bookingNumber}` : `#${job.id.slice(-6)}`,
          time: dateStr,
          fare: typeof (job.finalFare ?? job.estimatedFare) === 'number' ? `₹${Math.round(job.finalFare ?? job.estimatedFare ?? 0).toLocaleString('en-IN')}` : '₹—',
          status: isCancelledBookingStatus(job.status) ? 'Cancelled' : 'Completed',
        };
      });
    }
    return [];
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
              <PartnerText
                style={[
                  styles.tabText,
                  isSelected && styles.tabTextActive,
                ]}>
                {tab}
              </PartnerText>
            </Pressable>
          );
        })}
      </View>

      {/* Trip List */}
      {jobsQuery.isLoading && !jobsQuery.data ? (
        <DriverDataSkeleton variant="history" />
      ) : jobsQuery.isError && !jobsQuery.data ? (
        <Pressable onPress={() => void jobsQuery.refetch()} style={styles.emptyState} accessibilityRole="button">
          <PartnerText style={styles.emptyTitle}>Couldn’t load trips</PartnerText>
          <PartnerText style={styles.emptySubtitle}>Tap to retry.</PartnerText>
        </Pressable>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <PartnerText style={styles.emptyTitle}>No trips yet</PartnerText>
          <PartnerText style={styles.emptySubtitle}>Completed and cancelled jobs will appear here.</PartnerText>
        </View>
      ) : (
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
                <PartnerText style={styles.bookingNumber}>{trip.bookingNumber}</PartnerText>
                <PartnerText style={styles.timeText}>{trip.time}</PartnerText>
              </View>

              <View style={styles.fareCol}>
                <PartnerText style={styles.fareText}>{trip.fare}</PartnerText>
                <View
                  style={[
                    styles.statusPill,
                    isCancelled ? styles.statusPillRed : styles.statusPillGreen,
                  ]}>
                  <PartnerText
                    style={[
                      styles.statusText,
                      isCancelled ? styles.statusTextRed : styles.statusTextGreen,
                    ]}>
                    {trip.status}
                  </PartnerText>
                </View>
              </View>

              <ChevronRight size={16} color="#C4C7D0" strokeWidth={2.2} />
            </Pressable>
          );
        })}
      </View>
      )}
    </PartnerScreenLayout>
  );
}

const styles = StyleSheet.create({
  emptyState: { paddingVertical: 32, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: driverColors.ink },
  emptySubtitle: { fontSize: 12, color: driverColors.grey, textAlign: 'center' },
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
