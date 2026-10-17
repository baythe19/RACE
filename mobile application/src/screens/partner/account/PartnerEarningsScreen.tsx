import { PartnerText } from '../../../components/partner/PartnerText';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Truck,
  CreditCard,
  Building,
  CheckCircle,
  Zap,
  ShieldCheck,
  Clock,
  AlertCircle,
} from 'lucide-react-native';

import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';
import type { PartnerAccountStackParamList } from '../../../types/partnerNavigation';
import PartnerScreenLayout from '../../../components/partner/PartnerScreenLayout';
import { usePartnerPayoutStore } from '../../../store/partnerPayoutStore';
import {
  usePayoutAccountQuery,
  useVendorEarningsQuery,
} from '../../../services/vendor/useVendorMutations';
import { colors } from '../../../theme';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'PartnerEarnings'>;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatInr(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function shortDay(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(+date)) return isoDate;
  return DAY_LABELS[date.getDay()];
}

export default function PartnerEarningsScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<'earnings' | 'payouts'>('earnings');
  const earnings = useVendorEarningsQuery(true);
  const payoutAccount = usePayoutAccountQuery(true);

  /* Backend-driven chart; falls back to an empty chart when no payments yet. */
  const daily = useMemo(() => earnings.data?.dailyEarnings ?? [], [earnings.data]);
  const chart = useMemo(() => {
    if (daily.length === 0) return [];
    const max = Math.max(...daily.map(day => day.amount), 1);
    return daily.map(entry => ({
      key: entry.date,
      label: shortDay(entry.date),
      amount: entry.amount,
      heightPct: Math.max(entry.amount / max, 0.08),
      isHighlight: entry.amount === max,
    }));
  }, [daily]);

  const weekTotal = earnings.data?.totals.week ?? 0;
  const payouts = useMemo(() => earnings.data?.payouts ?? [], [earnings.data]);

  const account = payoutAccount.data;
  const accountLoading = payoutAccount.isLoading;
  const verified = Boolean(account?.isVerified);
  const isUpi = (account?.payoutMethod ?? usePartnerPayoutStore.getState().payoutMethod) === 'upi';

  const recentPayouts = useMemo(
    () =>
      payouts.slice(0, 5).map(payout => ({
        id: payout.id,
        amount: formatInr(payout.amount),
        date: `Paid ${new Date(payout.paidAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}`,
        status: payout.status === 'COMPLETED' ? 'Completed' : payout.status,
      })),
    [payouts],
  );

  return (
    <PartnerScreenLayout title="Earnings" onBack={() => navigation.goBack()}>
      {/* Segment tabs */}
      <View style={styles.segmentContainer}>
        <Pressable
          style={[styles.segmentTab, activeTab === 'earnings' && styles.segmentTabActive]}
          onPress={() => setActiveTab('earnings')}>
          <PartnerText style={[styles.segmentText, activeTab === 'earnings' && styles.segmentTextActive]}>
            Earnings
          </PartnerText>
        </Pressable>
        <Pressable
          style={[styles.segmentTab, activeTab === 'payouts' && styles.segmentTabActive]}
          onPress={() => setActiveTab('payouts')}>
          <PartnerText style={[styles.segmentText, activeTab === 'payouts' && styles.segmentTextActive]}>
            Payouts
          </PartnerText>
        </Pressable>
      </View>

      {activeTab === 'payouts' ? (
        <PayoutsTabBody />
      ) : earnings.isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" color={driverColors.amber} />
        </View>
      ) : earnings.isError ? (
        <View style={styles.errorBox}>
          <AlertCircle size={16} color="#DC2626" strokeWidth={2.2} />
          <PartnerText style={styles.errorText}>
            Could not load your earnings. Pull down to retry.
          </PartnerText>
        </View>
      ) : (
        <>
          {/* ── Weekly total (real transactions) ── */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <PartnerText style={styles.heroLabel}>Total Earnings (This Week)</PartnerText>
              <View style={styles.periodPill}>
                <PartnerText style={styles.periodText}>This Week</PartnerText>
                <ChevronDown size={14} color={driverColors.ink} />
              </View>
            </View>

            <PartnerText style={styles.heroAmount}>{formatInr(weekTotal)}</PartnerText>

            {daily.length === 0 ? (
              <View style={styles.trendRow}>
                <Clock size={14} color={driverColors.grey} strokeWidth={2.4} />
                <PartnerText style={[styles.trendText, { color: driverColors.grey }]}>
                  No completed jobs this week yet
                </PartnerText>
              </View>
            ) : (
              <View style={styles.trendRow}>
                <TrendingUp size={14} color={driverColors.green} strokeWidth={2.4} />
                <PartnerText style={styles.trendText}>
                  {daily.length} earning day{daily.length === 1 ? '' : 's'} in the last 7 days
                </PartnerText>
              </View>
            )}

            {/* Bar chart from real daily payments */}
            {chart.length > 0 ? (
              <View style={styles.chartContainer}>
                <View style={styles.chartBarsRow}>
                  {chart.map(bar => (
                    <View key={bar.key} style={styles.barCol}>
                      {bar.isHighlight ? (
                        <View style={styles.tooltipPill}>
                          <PartnerText style={styles.tooltipText}>{formatInr(bar.amount)}</PartnerText>
                        </View>
                      ) : null}
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { height: `${bar.heightPct * 100}%` },
                            bar.isHighlight && styles.barFillHighlight,
                          ]}
                        />
                      </View>
                      <PartnerText
                        style={[styles.barLabel, bar.isHighlight && styles.barLabelHighlight]}>
                        {bar.label}
                      </PartnerText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Metrics strip — real totals */}
            <View style={styles.metricsStrip}>
              <View style={styles.metricItem}>
                <PartnerText style={styles.metricVal}>{formatInr(earnings.data?.totals.today ?? 0)}</PartnerText>
                <PartnerText style={styles.metricCap}>Today</PartnerText>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <PartnerText style={styles.metricVal}>{formatInr(earnings.data?.totals.month ?? 0)}</PartnerText>
                <PartnerText style={styles.metricCap}>This month</PartnerText>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <PartnerText style={styles.metricVal}>{formatInr(earnings.data?.totals.allTime ?? 0)}</PartnerText>
                <PartnerText style={styles.metricCap}>All time</PartnerText>
              </View>
            </View>
          </View>

          {/* ── Recent completed payments (real rows) ── */}
          <View style={styles.sectionHeaderRow}>
            <PartnerText style={styles.sectionTitle}>Recent Payments</PartnerText>
          </View>

          <View style={styles.tripList}>
            {(earnings.data?.dailyEarnings ?? []).length === 0 ? (
              <View style={styles.emptyInline}>
                <PartnerText style={styles.emptyText}>
                  Payments appear here after your first completed job.
                </PartnerText>
              </View>
            ) : (
              (earnings.data?.dailyEarnings ?? [])
                .slice()
                .reverse()
                .slice(0, 5)
                .map(day => (
                  <View key={day.date} style={styles.tripRow}>
                    <View style={styles.tripIconCircle}>
                      <Truck size={18} color="#0284C7" strokeWidth={2.2} />
                    </View>
                    <View style={styles.tripMetaCol}>
                      <PartnerText style={styles.tripNumber}>{formatInr(day.amount)}</PartnerText>
                      <PartnerText style={styles.tripTime}>
                        {new Date(`${day.date}T00:00:00`).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </PartnerText>
                    </View>
                    <View style={styles.completedPill}>
                      <PartnerText style={styles.completedText}>Paid</PartnerText>
                    </View>
                    <ChevronRight size={16} color="#C4C7D0" strokeWidth={2.2} />
                  </View>
                ))
            )}
          </View>
        </>
      )}
    </PartnerScreenLayout>
  );
}

/** Payouts tab body — real payout account + history. */
function PayoutsTabBody() {
  const navigation = useNavigation<NativeStackScreenProps<PartnerAccountStackParamList, 'PartnerEarnings'>['navigation']>();
  const payoutAccount = usePayoutAccountQuery(true);
  const earnings = useVendorEarningsQuery(true);
  const account = payoutAccount.data;
  const hiddenAccount = payoutAccount.isLoading;
  const verified = Boolean(account?.isVerified);
  const accountExists = Boolean(account);

  const recentPayouts = useMemo(
    () =>
      (earnings.data?.payouts ?? []).slice(0, 5).map(payout => ({
        id: payout.id,
        amount: formatInr(payout.amount),
        date: `Paid ${new Date(payout.paidAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}`,
        status: payout.status === 'COMPLETED' ? 'Completed' : payout.status,
      })),
    [earnings.data],
  );

  if (hiddenAccount) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="small" color={driverColors.amber} />
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Payout account card — real data, masked */}
      <View style={styles.bankCard}>
        <View style={styles.bankTopRow}>
          <View style={[styles.bankIconCircle, account?.payoutMethod === 'upi' && { backgroundColor: '#FEF3C7' }]}>
            {account?.payoutMethod === 'upi' ? (
              <Zap size={20} color="#D97706" strokeWidth={2.4} />
            ) : (
              <Building size={20} color={driverColors.amber} strokeWidth={2.2} />
            )}
          </View>
          <View style={styles.bankTextCol}>
            {accountExists && account ? (
              <>
                <PartnerText style={styles.bankName}>
                  {account.payoutMethod === 'upi'
                    ? `UPI · ${account.upiId ?? ''}`
                    : account.bankName || 'Bank account'}
                </PartnerText>
                <PartnerText style={styles.bankAcc}>
                  {account.payoutMethod === 'upi'
                    ? account.accountHolderName
                    : `${account.accountNumberMasked ?? ''} • IFSC: ${account.ifsc ?? ''}`}
                </PartnerText>
              </>
            ) : (
              <PartnerText style={styles.bankName}>No payout account yet</PartnerText>
            )}
          </View>
          <View style={[styles.verifiedBadge, !verified && { backgroundColor: '#FEF3C7' }]}>
            {verified ? (
              <CheckCircle size={12} color={driverColors.green} strokeWidth={2.4} />
            ) : (
              <Clock size={12} color={colors.primaryDark} strokeWidth={2.4} />
            )}
            <PartnerText
              style={[styles.verifiedText, !verified && { color: colors.primaryDark }]}>
              {verified ? 'Verified' : 'Pending'}
            </PartnerText>
          </View>
        </View>

        {!verified ? (
          <View style={styles.scheduleRow}>
            <ShieldCheck size={14} color={colors.grey} strokeWidth={2.2} />
            <PartnerText style={[styles.scheduleText, { color: colors.grey }]}>
              Payouts begin after our team verifies this account.
            </PartnerText>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.editBankBtn, getPressableFeedback(pressed)]}
          onPress={() => navigation.navigate('PartnerBankDetails')}>
          <CreditCard size={14} color={driverColors.amber} strokeWidth={2.2} />
          <PartnerText style={styles.editBankText}>
            {account ? 'Manage payout account' : 'Add payout account'}
          </PartnerText>
        </Pressable>
      </View>

      <PartnerText style={[styles.sectionTitle, { marginTop: 16, marginBottom: 12 }]}>
        Recent Payouts
      </PartnerText>

      <View style={styles.tripList}>
        {recentPayouts.length === 0 ? (
          <View style={styles.emptyInline}>
            <PartnerText style={styles.emptyText}>
              Payout history appears here once settlements start.
            </PartnerText>
          </View>
        ) : (
          recentPayouts.map(payout => (
            <View key={payout.id} style={styles.payoutRow}>
              <View style={styles.payoutIconCircle}>
                <CreditCard size={18} color="#059669" strokeWidth={2.2} />
              </View>
              <View style={styles.tripMetaCol}>
                <PartnerText style={styles.payoutAmount}>{payout.amount}</PartnerText>
                <PartnerText style={styles.tripTime}>{payout.date}</PartnerText>
              </View>
              <View style={styles.completedPill}>
                <PartnerText style={styles.completedText}>{payout.status}</PartnerText>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#DC2626',
  },
  emptyInline: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 12.5,
    color: driverColors.grey,
    textAlign: 'center',
    lineHeight: 18,
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
  },
  metricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: driverColors.ink,
  },
  metricCap: {
    fontSize: 10,
    color: driverColors.grey,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
  },
  chartBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flex: 1,
    gap: 6,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    height: '100%',
    justifyContent: 'flex-end',
  },
  tooltipPill: {
    position: 'absolute',
    top: -26,
    backgroundColor: driverColors.ink,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tooltipText: {
    fontSize: 10,
    fontWeight: '700',
    color: driverColors.white,
  },
  barTrack: {
    width: '100%',
    maxWidth: 26,
    height: 84,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: driverColors.amber,
    borderRadius: 6,
  },
  barFillHighlight: {
    backgroundColor: driverColors.ink,
  },
  barLabel: {
    fontSize: 10,
    color: driverColors.grey,
  },
  barLabelHighlight: {
    color: driverColors.ink,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: driverColors.ink,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  tripList: {
    gap: 8,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 10,
  },
  tripIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 11,
    color: driverColors.grey,
    marginTop: 2,
  },
  tripFareCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  tripFare: {
    fontSize: 14,
    fontWeight: '800',
    color: driverColors.ink,
  },
  completedPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
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
    borderColor: '#F1F5F9',
  },
  bankTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bankIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankTextCol: {
    flex: 1,
  },
  bankName: {
    fontSize: 14,
    fontWeight: '700',
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
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: driverColors.green,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  scheduleText: {
    fontSize: 11.5,
    color: driverColors.grey,
    flex: 1,
  },
  editBankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  editBankText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#92400E',
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 10,
  },
  payoutIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: driverColors.ink,
  },
});
