import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Truck,
  CreditCard,
  Building,
  CheckCircle,
} from 'lucide-react-native';

import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';
import type { PartnerAccountStackParamList } from '../../../types/partnerNavigation';
import PartnerScreenLayout from '../../../components/partner/PartnerScreenLayout';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'PartnerEarnings'>;

const WEEK_DATA = [
  { day: 'Mon', amount: 800, heightPct: 0.35 },
  { day: 'Tue', amount: 1100, heightPct: 0.45 },
  { day: 'Wed', amount: 950, heightPct: 0.4 },
  { day: 'Thu', amount: 1400, heightPct: 0.58 },
  { day: 'Fri', amount: 1250, heightPct: 0.52 },
  { day: 'Sat', amount: 2400, heightPct: 1.0, isHighlight: true },
  { day: 'Sun', amount: 1550, heightPct: 0.65 },
];

const RECENT_TRIPS = [
  { id: '1', bookingNumber: '#TOW-10048', time: '12 Oct, 5:24 pm', fare: '₹1,650', status: 'Completed' },
  { id: '2', bookingNumber: '#TOW-10047', time: '12 Oct, 1:10 pm', fare: '₹1,200', status: 'Completed' },
  { id: '3', bookingNumber: '#TOW-10046', time: '11 Oct, 8:40 pm', fare: '₹1,850', status: 'Completed' },
];

const RECENT_PAYOUTS = [
  { id: 'p1', amount: '₹3,200', date: 'Paid to Bank • 12 Oct 2026', status: 'Completed' },
  { id: 'p2', amount: '₹2,850', date: 'Paid to Bank • 5 Oct 2026', status: 'Completed' },
  { id: 'p3', amount: '₹3,100', date: 'Paid to Bank • 28 Sep 2026', status: 'Completed' },
];

export default function PartnerEarningsScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<'earnings' | 'payouts'>('earnings');

  return (
    <PartnerScreenLayout
      title="Earnings"
      onBack={() => navigation.goBack()}>
      {/* Top Segmented Controls */}
      <View style={styles.segmentContainer}>
        <Pressable
          style={[styles.segmentTab, activeTab === 'earnings' && styles.segmentTabActive]}
          onPress={() => setActiveTab('earnings')}>
          <Text
            style={[
              styles.segmentText,
              activeTab === 'earnings' && styles.segmentTextActive,
            ]}>
            Earnings
          </Text>
        </Pressable>

        <Pressable
          style={[styles.segmentTab, activeTab === 'payouts' && styles.segmentTabActive]}
          onPress={() => setActiveTab('payouts')}>
          <Text
            style={[
              styles.segmentText,
              activeTab === 'payouts' && styles.segmentTextActive,
            ]}>
            Payouts
          </Text>
        </Pressable>
      </View>

      {activeTab === 'earnings' ? (
        <>
          {/* Total Earnings Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <Text style={styles.heroLabel}>Total Earnings (This Week)</Text>
              <View style={styles.periodPill}>
                <Text style={styles.periodText}>This Week</Text>
                <ChevronDown size={14} color={driverColors.ink} />
              </View>
            </View>

            <Text style={styles.heroAmount}>₹8,450</Text>

            <View style={styles.trendRow}>
              <TrendingUp size={14} color={driverColors.green} strokeWidth={2.4} />
              <Text style={styles.trendText}>+12% from last week</Text>
            </View>

            {/* Bar Chart */}
            <View style={styles.chartContainer}>
              <View style={styles.chartBarsRow}>
                {WEEK_DATA.map(item => (
                  <View key={item.day} style={styles.barCol}>
                    {item.isHighlight ? (
                      <View style={styles.tooltipPill}>
                        <Text style={styles.tooltipText}>₹{item.amount}</Text>
                      </View>
                    ) : null}
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { height: `${item.heightPct * 100}%` },
                          item.isHighlight && styles.barFillHighlight,
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.barLabel,
                        item.isHighlight && styles.barLabelHighlight,
                      ]}>
                      {item.day}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Metrics Strip */}
            <View style={styles.metricsStrip}>
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>18</Text>
                <Text style={styles.metricCap}>Trips Completed</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>32 h</Text>
                <Text style={styles.metricCap}>Online Time</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>₹468</Text>
                <Text style={styles.metricCap}>Avg. per trip</Text>
              </View>
            </View>
          </View>

          {/* Recent Trips Section */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Trips</Text>
            <Pressable
              hitSlop={8}
              onPress={() => navigation.navigate('PartnerTripHistory')}>
              <Text style={styles.viewAllText}>View all</Text>
            </Pressable>
          </View>

          <View style={styles.tripList}>
            {RECENT_TRIPS.map(trip => (
              <Pressable
                key={trip.id}
                style={({ pressed }) => [
                  styles.tripRow,
                  getPressableFeedback(pressed),
                ]}
                onPress={() => navigation.navigate('PartnerTripHistory')}>
                <View style={styles.tripIconCircle}>
                  <Truck size={18} color="#0284C7" strokeWidth={2.2} />
                </View>

                <View style={styles.tripMetaCol}>
                  <Text style={styles.tripNumber}>{trip.bookingNumber}</Text>
                  <Text style={styles.tripTime}>{trip.time}</Text>
                </View>

                <View style={styles.tripFareCol}>
                  <Text style={styles.tripFare}>{trip.fare}</Text>
                  <View style={styles.completedPill}>
                    <Text style={styles.completedText}>{trip.status}</Text>
                  </View>
                </View>

                <ChevronRight size={16} color="#C4C7D0" strokeWidth={2.2} />
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <>
          {/* Payouts Tab View */}
          <View style={styles.bankCard}>
            <View style={styles.bankTopRow}>
              <View style={styles.bankIconCircle}>
                <Building size={20} color={driverColors.amber} strokeWidth={2.2} />
              </View>
              <View style={styles.bankTextCol}>
                <Text style={styles.bankName}>State Bank of India</Text>
                <Text style={styles.bankAcc}>•••• •••• 7890 • IFSC: SBIN0001234</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <CheckCircle size={12} color={driverColors.green} strokeWidth={2.4} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.editBankBtn,
                getPressableFeedback(pressed),
              ]}
              onPress={() => navigation.navigate('PartnerBankDetails')}>
              <CreditCard size={14} color={driverColors.amber} strokeWidth={2.2} />
              <Text style={styles.editBankText}>Manage Bank Details</Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: 12 }]}>
            Recent Payouts
          </Text>

          <View style={styles.tripList}>
            {RECENT_PAYOUTS.map(p => (
              <View key={p.id} style={styles.payoutRow}>
                <View style={styles.payoutIconCircle}>
                  <CreditCard size={18} color="#059669" strokeWidth={2.2} />
                </View>

                <View style={styles.tripMetaCol}>
                  <Text style={styles.payoutAmount}>{p.amount}</Text>
                  <Text style={styles.tripTime}>{p.date}</Text>
                </View>

                <View style={styles.completedPill}>
                  <Text style={styles.completedText}>{p.status}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </PartnerScreenLayout>
  );
}

const styles = StyleSheet.create({
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: driverColors.light,
    borderRadius: driverRadius.pill,
    padding: 4,
    marginBottom: 16,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: driverRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentTabActive: {
    backgroundColor: driverColors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: driverColors.grey,
  },
  segmentTextActive: {
    fontWeight: '800',
    color: driverColors.ink,
  },
  heroCard: {
    backgroundColor: '#FEF8E8',
    borderRadius: driverRadius.card,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FEEFC8',
    marginBottom: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: driverColors.grey,
  },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: driverColors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: driverRadius.pill,
    borderWidth: 1,
    borderColor: '#FEEFC8',
  },
  periodText: {
    fontSize: 11,
    fontWeight: '700',
    color: driverColors.ink,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: driverColors.ink,
    marginTop: 6,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    marginBottom: 16,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
    color: driverColors.green,
  },
  chartContainer: {
    height: 120,
    marginVertical: 10,
    justifyContent: 'flex-end',
  },
  chartBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  tooltipPill: {
    position: 'absolute',
    top: 0,
    backgroundColor: driverColors.ink,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 10,
  },
  tooltipText: {
    color: driverColors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  barTrack: {
    width: 14,
    height: 80,
    backgroundColor: '#F1EDE2',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#FECF66',
    borderRadius: 7,
  },
  barFillHighlight: {
    backgroundColor: driverColors.amber,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: driverColors.grey,
    marginTop: 6,
  },
  barLabelHighlight: {
    color: driverColors.ink,
    fontWeight: '800',
  },
  metricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.innerCard,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginTop: 14,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: driverColors.ink,
  },
  metricCap: {
    fontSize: 11,
    color: driverColors.grey,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: driverColors.hairline,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: driverColors.ink,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: driverColors.amberText,
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
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tripMetaCol: {
    flex: 1,
  },
  tripNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: driverColors.ink,
  },
  tripTime: {
    fontSize: 12,
    color: driverColors.grey,
    marginTop: 2,
  },
  tripFareCol: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  tripFare: {
    fontSize: 14,
    fontWeight: '800',
    color: driverColors.ink,
  },
  completedPill: {
    backgroundColor: driverColors.greenPill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  completedText: {
    fontSize: 10,
    fontWeight: '700',
    color: driverColors.green,
  },
  bankCard: {
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: driverColors.hairline,
  },
  bankTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  bankIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: driverColors.amberTileSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bankTextCol: {
    flex: 1,
  },
  bankName: {
    fontSize: 15,
    fontWeight: '800',
    color: driverColors.ink,
  },
  bankAcc: {
    fontSize: 12,
    color: driverColors.grey,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: driverColors.greenPill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: driverColors.green,
  },
  editBankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFDF5',
    borderWidth: 1,
    borderColor: driverColors.amberBorder,
    borderRadius: driverRadius.button,
    paddingVertical: 10,
  },
  editBankText: {
    fontSize: 13,
    fontWeight: '700',
    color: driverColors.amberText,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: driverColors.hairline,
  },
  payoutIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: driverColors.greenPill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  payoutAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: driverColors.ink,
  },
});
