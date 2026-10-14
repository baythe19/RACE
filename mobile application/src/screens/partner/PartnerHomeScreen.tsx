import { PartnerText } from '../../components/partner/PartnerText';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Bell,
  Briefcase,
  ChevronRight,
  ClipboardList,
  CloudUpload,
  FileSearch,
  Landmark,
  ShieldCheck,
  Truck,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { openPartnerNotifications } from '../../navigation/partnerNavigationRef';

import AppScreenLayout from '../../components/ui/AppScreenLayout';
import { useAppSelector } from '../../redux/hooks';
import {
  useVendorBookingOffersQuery,
  useVendorFleetDriversQuery,
  useVendorFleetVehiclesQuery,
} from '../../services/vendor/useVendorBookingsQueries';
import { useVendorDashboardQuery, useVendorStatusQuery } from '../../services/vendor/useVendorMutations';
import type { PartnerTabParamList } from '../../types/partnerNavigation';
import type { VerificationStage, VendorProfileResponse } from '../../types/vendor';
import { formatReadableAddress } from '../../utils/readableAddress';
import { colors, layout, radius, shadows, spacing, typography } from '../../theme';

const PAGE_BG = '#FFFFFF';
const SUCCESS_GREEN = '#22C55E';
const INFO_BLUE = '#2563EB';
const PURPLE = '#7C3AED';

const STAGE_LABELS: Record<VerificationStage, string> = {
  submitted: 'Submitted',
  document_review: 'Document review',
  background_check: 'Background check',
  selfie_match: 'Selfie match',
  approved: 'Approved',
  rejected: 'Rejected',
};

function firstName(fullName?: string | null) {
  const name = (fullName ?? '').trim();
  if (!name) return 'Partner';
  return name.split(/\s+/)[0] ?? 'Partner';
}

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatInr(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatActivityTime(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(+date)) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  const wasYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (sameDay) return `Today, ${time}`;
  if (wasYesterday) return `Yesterday, ${time}`;
  return date.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function verificationCopy(vendor?: VendorProfileResponse | null) {
  if (!vendor) {
    return {
      title: 'Verification',
      badge: 'Pending',
      hint: 'Complete registration to start verification.',
      tone: 'pending' as const,
    };
  }
  if (vendor.status === 'approved' || vendor.verificationStage === 'approved') {
    return {
      title: 'Verification: Approved',
      badge: 'Completed',
      hint: 'Your partner account is active.',
      tone: 'completed' as const,
    };
  }
  if (vendor.status === 'rejected' || vendor.verificationStage === 'rejected') {
    return {
      title: 'Verification: Rejected',
      badge: 'Rejected',
      hint: vendor.reviewNotes || 'Contact support for next steps.',
      tone: 'rejected' as const,
    };
  }
  const stage = STAGE_LABELS[vendor.verificationStage] ?? 'In review';
  return {
    title: `Verification: ${stage}`,
    badge: 'In progress',
    hint: "We're reviewing your documents.",
    tone: 'progress' as const,
  };
}

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  at?: string;
  status: 'Completed' | 'In progress' | 'New';
  tone: 'green' | 'yellow' | 'blue' | 'purple';
  Icon: typeof CloudUpload;
};

function buildActivity(args: {
  vendor?: VendorProfileResponse | null;
  drivers: Array<{ id: string; name: string }>;
}): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const entry of args.vendor?.statusHistory ?? []) {
    const stage = entry.status as VerificationStage;
    const isReview = stage === 'document_review';
    items.push({
      id: `hist-${entry.status}-${entry.changedAt}`,
      title: isReview
        ? 'Document review started'
        : stage === 'submitted'
          ? 'Document submitted'
          : STAGE_LABELS[stage] ?? entry.status.replace(/_/g, ' '),
      description:
        entry.note ||
        (isReview
          ? 'Our team has started reviewing your documents'
          : stage === 'submitted'
            ? 'Registration submitted successfully'
            : 'Status updated'),
      at: entry.changedAt,
      status: stage === 'approved' || stage === 'submitted' ? 'Completed' : 'In progress',
      tone: stage === 'submitted' || stage === 'approved' ? 'green' : 'yellow',
      Icon: isReview ? FileSearch : CloudUpload,
    });
  }

  for (const doc of args.vendor?.documents ?? []) {
    items.push({
      id: `doc-${doc.id}`,
      title: 'Document submitted',
      description: `${doc.documentType.replace(/_/g, ' ')} uploaded successfully`,
      at: doc.uploadedAt,
      status: 'Completed',
      tone: 'green',
      Icon: CloudUpload,
    });
  }

  for (const driver of args.drivers.slice(0, 2)) {
    items.push({
      id: `driver-${driver.id}`,
      title: 'Driver added',
      description: `${driver.name} has been added to your vendor team`,
      status: 'Completed',
      tone: 'purple',
      Icon: Users,
    });
  }

  return items
    .sort((a, b) => +new Date(b.at ?? 0) - +new Date(a.at ?? 0))
    .slice(0, 4);
}

function QuickAction({
  title,
  subtitle,
  Icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  Icon: typeof ClipboardList;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={title}>
      <View style={styles.actionIcon}>
        <Icon size={18} color={colors.primaryDark} strokeWidth={2.2} />
      </View>
      <View style={styles.actionCopy}>
        <PartnerText style={styles.actionTitle}>{title}</PartnerText>
        <PartnerText style={styles.actionSubtitle}>{subtitle}</PartnerText>
      </View>
      <ChevronRight size={18} color={colors.grey} strokeWidth={2.2} />
    </Pressable>
  );
}

function statusPill(status: ActivityItem['status']) {
  if (status === 'Completed') {
    return { wrap: styles.pillCompleted, text: styles.pillCompletedText };
  }
  if (status === 'In progress') {
    return { wrap: styles.pillProgress, text: styles.pillProgressText };
  }
  return { wrap: styles.pillNew, text: styles.pillNewText };
}

function activityTone(tone: ActivityItem['tone']) {
  if (tone === 'green') return { bg: '#DCFCE7', color: SUCCESS_GREEN };
  if (tone === 'yellow') return { bg: colors.goldLight, color: colors.primaryDark };
  if (tone === 'blue') return { bg: '#DBEAFE', color: INFO_BLUE };
  return { bg: '#EDE9FE', color: PURPLE };
}

export default function PartnerHomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<PartnerTabParamList>>();
  const user = useAppSelector(state => state.auth.user);
  const isVendor = true;

  const {
    data: vendor,
    isLoading: vendorLoading,
    isRefetching: vendorRefetching,
    refetch: refetchVendor,
  } = useVendorStatusQuery(isVendor);
  const { data: vendorDashboard, refetch: refetchDashboard } = useVendorDashboardQuery(isVendor);
  const { data: offers = [], refetch: refetchOffers } = useVendorBookingOffersQuery(isVendor);
  const { data: drivers = [], refetch: refetchDrivers } = useVendorFleetDriversQuery(isVendor);
  const { data: vehicles = [], refetch: refetchVehicles } = useVendorFleetVehiclesQuery(isVendor);

  const [refreshing, setRefreshing] = useState(false);

  const earningsToday = vendorDashboard?.earningsToday ?? 0;
  const earningsTotal = vendorDashboard?.earningsTotal ?? earningsToday;

  const openJobs = offers.filter(offer => !offer.vendorApproved).length;
  const awaitingClaimJobs = offers.length - openJobs;
  const onJobDrivers = drivers.filter(d => d.isBusy).length;
  const availableDrivers = drivers.filter(d => d.isAvailable && !d.isBusy).length;

  const activeVehicles = vehicles.filter(v => v.status === 'ACTIVE').length;

  const verification = verificationCopy(vendorLoading ? null : vendor);
  const activity = useMemo(
    () => buildActivity({ vendor, drivers }),
    [vendor, drivers],
  );

  const name = firstName(user?.fullName);
  const initial = name.charAt(0).toUpperCase() || 'V';

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchVendor(),
        refetchDashboard(),
        refetchOffers(),
        refetchDrivers(),
        refetchVehicles(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const goAccountScreen = (
    screen: 'VendorDrivers' | 'VendorVehicles' | 'VendorVerificationStatus' | 'PartnerBankDetails',
  ) => {
    navigation.navigate('PartnerAccount', { screen } as never);
  };

  return (
    <AppScreenLayout
      backgroundColor={PAGE_BG}
      refreshing={refreshing || vendorRefetching}
      onRefresh={() => void onRefresh()}
      header={
        <View style={styles.headerPad}>
          <View style={styles.headerTop}>
            <View>
              <PartnerText style={styles.brandRace}>RACE</PartnerText>
              <PartnerText style={styles.brandPartner}>PARTNER</PartnerText>
            </View>
            <View style={styles.headerRight}>
              <Pressable
                onPress={openPartnerNotifications}
                hitSlop={10}
                style={styles.bellBtn}
                accessibilityRole="button"
                accessibilityLabel="Notifications">
                <Bell size={19} color={colors.dark} strokeWidth={2.2} />
              </Pressable>
              <View style={styles.partnerPill}>
                <PartnerText style={styles.partnerPillText}>Vendor Fleet</PartnerText>
              </View>
              <View style={styles.avatarRow}>
                <View style={styles.avatar}>
                  <PartnerText style={styles.avatarText}>{initial}</PartnerText>
                </View>
                <PartnerText style={styles.avatarName} numberOfLines={1}>
                  {user?.fullName ?? 'Vendor'}
                </PartnerText>
              </View>
            </View>
          </View>

          <PartnerText style={styles.greeting}>
            {greetingForNow()}, {name} 👋
          </PartnerText>
          <PartnerText style={styles.subtitle}>Here's what's happening with your fleet today.</PartnerText>
        </View>
      }>
      {offers.length > 0 ? (
        <View style={styles.leadsBanner}>
          <View style={styles.leadsHeaderRow}>
            <View style={styles.leadsTitleGroup}>
              <View style={styles.pulseDot} />
              <PartnerText style={styles.leadsTitle}>
                Incoming leads ({offers.length})
              </PartnerText>
            </View>
            <Pressable onPress={() => navigation.navigate('PartnerJobs')}>
              <PartnerText style={styles.leadsViewAll}>View all</PartnerText>
            </Pressable>
          </View>
          {offers.slice(0, 2).map(lead => (
            <View key={lead.id} style={styles.leadCard}>
              <View style={styles.leadTopRow}>
                <View style={styles.leadBadge}>
                  <PartnerText style={styles.leadBadgeText}>
                    {lead.serviceLabel || (lead.bookingType === 'towing' ? 'Towing' : 'Driver')}
                  </PartnerText>
                </View>
                <PartnerText style={styles.leadFare}>
                  {typeof lead.estimatedFare === 'number' ? formatInr(lead.estimatedFare) : '₹—'}
                </PartnerText>
              </View>
              <PartnerText style={styles.leadNumber}>#{lead.bookingNumber || lead.id.slice(-6)}</PartnerText>
              <PartnerText style={styles.leadAddress} numberOfLines={1}>
                {formatReadableAddress(lead.pickup?.address || lead.pickup?.label) || 'Pickup nearby'}
              </PartnerText>
              <Pressable
                style={styles.assignCta}
                onPress={() => {
                  navigation.navigate('PartnerJobs', {
                    screen: 'VendorAssignJob',
                    params: {
                      bookingId: lead.id,
                      bookingType: lead.bookingType,
                      bookingNumber: lead.bookingNumber,
                      serviceLabel: lead.serviceLabel,
                      pickupAddress: lead.pickup?.address || lead.pickup?.label,
                      estimatedFare: lead.estimatedFare,
                    },
                  } as never);
                }}>
                <Truck size={15} color="#FFFFFF" strokeWidth={2.4} />
                <PartnerText style={styles.assignCtaText}>Assign vehicle</PartnerText>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.leadsEmptyCard}>
          <View style={styles.leadsEmptyIcon}>
            <ClipboardList size={18} color={colors.primaryDark} strokeWidth={2.2} />
          </View>
          <View style={styles.leadsEmptyCopy}>
            <PartnerText style={styles.leadsEmptyTitle}>No new booking leads</PartnerText>
            <PartnerText style={styles.leadsEmptySub}>
              Open customer requests will land here for your fleet.
            </PartnerText>
          </View>
          <Pressable onPress={() => navigation.navigate('PartnerJobs')} hitSlop={8}>
            <PartnerText style={styles.leadsViewAll}>View all</PartnerText>
          </Pressable>
        </View>
      )}

      <View style={styles.earningsCard}>
        <View style={styles.earningsHeader}>
          <View style={styles.earningsTitleRow}>
            <PartnerText style={styles.earningsTitle}>Earnings</PartnerText>
          </View>
        </View>
        <View style={styles.earningsRow}>
          <View style={styles.earningsCol}>
            <PartnerText style={styles.earningsValue}>{formatInr(earningsToday)}</PartnerText>
            <PartnerText style={styles.earningsColLabel}>Today (completed)</PartnerText>
          </View>
          <View style={styles.earningsDivider} />
          <View style={styles.earningsCol}>
            <PartnerText style={styles.earningsValue}>{formatInr(earningsTotal)}</PartnerText>
            <PartnerText style={styles.earningsColLabel}>All time</PartnerText>
          </View>
        </View>
      </View>

      <View style={styles.fleetCard}>
        <PartnerText style={styles.fleetTitle}>Fleet overview</PartnerText>
        <View style={styles.fleetMetricsRow}>
          <Pressable
            onPress={() => navigation.navigate('PartnerJobs')}
            style={styles.fleetMetricCol}
            accessibilityRole="button">
            <View style={[styles.fleetMetricIcon, { backgroundColor: '#DBEAFE' }]}>
              <Briefcase size={16} color={INFO_BLUE} strokeWidth={2.2} />
            </View>
            <PartnerText style={styles.fleetMetricValue}>{String(offers.length)}</PartnerText>
            <PartnerText style={styles.fleetMetricLabel}>
              {openJobs} open · {awaitingClaimJobs} awaiting
            </PartnerText>
          </Pressable>
          <View style={styles.fleetDivider} />
          <Pressable
            onPress={() => goAccountScreen('VendorDrivers')}
            style={styles.fleetMetricCol}
            accessibilityRole="button">
            <View style={[styles.fleetMetricIcon, { backgroundColor: '#DCFCE7' }]}>
              <Users size={16} color={SUCCESS_GREEN} strokeWidth={2.2} />
            </View>
            <PartnerText style={styles.fleetMetricValue}>{String(availableDrivers)}</PartnerText>
            <PartnerText style={styles.fleetMetricLabel}>
              of {drivers.length} available
            </PartnerText>
          </Pressable>
          <View style={styles.fleetDivider} />
          <Pressable
            onPress={() => goAccountScreen('VendorVehicles')}
            style={styles.fleetMetricCol}
            accessibilityRole="button">
            <View style={[styles.fleetMetricIcon, { backgroundColor: colors.goldLight }]}>
              <Truck size={16} color={colors.primaryDark} strokeWidth={2.2} />
            </View>
            <PartnerText style={styles.fleetMetricValue}>{String(activeVehicles)}</PartnerText>
            <PartnerText style={styles.fleetMetricLabel}>of {vehicles.length} active</PartnerText>
          </Pressable>
        </View>
      </View>

      <View style={styles.actionsGrid}>
        <QuickAction
          title="Manage drivers"
          subtitle={`${drivers.length} registered driver(s) · ${availableDrivers} available`}
          Icon={Users}
          onPress={() => goAccountScreen('VendorDrivers')}
        />
        <QuickAction
          title="Manage vehicles"
          subtitle={`${vehicles.length} vehicle(s) · ${activeVehicles} active`}
          Icon={Truck}
          onPress={() => goAccountScreen('VendorVehicles')}
        />
        <QuickAction
          title="Bank & payouts"
          subtitle="Manage settlement account & payout readiness"
          Icon={Landmark}
          onPress={() => goAccountScreen('PartnerBankDetails')}
        />
      </View>

      <View style={styles.statusStack}>
        <Pressable
          onPress={() => goAccountScreen('VendorVerificationStatus')}
          style={({ pressed }) => [styles.statusCard, pressed && styles.pressed]}>
          <View style={[styles.statusIcon, { backgroundColor: colors.goldLight }]}>
            <ShieldCheck size={18} color={colors.primaryDark} strokeWidth={2.2} />
          </View>
          <View style={styles.statusCopy}>
            <View style={styles.statusTitleRow}>
              <PartnerText style={styles.statusTitle} numberOfLines={1}>
                {verification.title}
              </PartnerText>
              <View
                style={[
                  styles.badge,
                  verification.tone === 'completed' && styles.badgeCompleted,
                  verification.tone === 'rejected' && styles.badgeRejected,
                  verification.tone === 'progress' && styles.badgeProgress,
                  verification.tone === 'pending' && styles.badgePending,
                ]}>
                <PartnerText
                  style={[
                    styles.badgeText,
                    verification.tone === 'completed' && styles.badgeCompletedText,
                    verification.tone === 'rejected' && styles.badgeRejectedText,
                    verification.tone === 'progress' && styles.badgeProgressText,
                    verification.tone === 'pending' && styles.badgePendingText,
                  ]}>
                  {verification.badge}
                </PartnerText>
              </View>
            </View>
            <PartnerText style={styles.statusHint}>{verification.hint}</PartnerText>
          </View>
        </Pressable>
      </View>

      <View style={styles.activityCard}>
        <View style={styles.activityHeader}>
          <PartnerText style={styles.activityTitle}>Recent activity</PartnerText>
          <Pressable onPress={() => navigation.navigate('PartnerJobs')} hitSlop={8}>
            <PartnerText style={styles.viewAll}>View all</PartnerText>
          </Pressable>
        </View>

        {activity.length === 0 ? (
          <PartnerText style={styles.emptyActivity}>No recent activity yet.</PartnerText>
        ) : (
          activity.map(item => {
            const tone = activityTone(item.tone);
            const pill = statusPill(item.status);
            const Icon = item.Icon;
            return (
              <View key={item.id} style={styles.activityRow}>
                <View style={[styles.activityIcon, { backgroundColor: tone.bg }]}>
                  <Icon size={16} color={tone.color} strokeWidth={2.2} />
                </View>
                <View style={styles.activityCopy}>
                  <PartnerText style={styles.activityItemTitle}>{item.title}</PartnerText>
                  <PartnerText style={styles.activityDesc} numberOfLines={2}>
                    {item.description}
                  </PartnerText>
                  <PartnerText style={styles.activityTime}>{formatActivityTime(item.at) || '—'}</PartnerText>
                </View>
                <View style={pill.wrap}>
                  <PartnerText style={pill.text}>{item.status}</PartnerText>
                </View>
              </View>
            );
          })
        )}
      </View>
    </AppScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerPad: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: PAGE_BG,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  brandRace: {
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
    fontSize: typography.sizes.md,
    letterSpacing: 0.4,
  },
  brandPartner: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerPill: {
    backgroundColor: colors.goldLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  partnerPillText: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 140,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  avatarName: {
    color: colors.dark,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
    flexShrink: 1,
  },
  greeting: {
    color: colors.dark,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.extrabold,
    marginTop: spacing.lg,
  },
  subtitle: {
    color: colors.grey,
    marginTop: spacing.xs,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  onlineCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  onlineCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.goldLight,
  },
  onlineLabel: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  onlineValue: {
    color: colors.grey,
    marginTop: 4,
    fontSize: typography.sizes.sm,
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.lightGrey,
  },
  onlinePillActive: {
    backgroundColor: colors.dark,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  onlineDot: {
    backgroundColor: colors.success,
  },
  onlinePillText: {
    color: colors.grey,
    fontWeight: typography.weights.semibold,
  },
  onlinePillTextActive: {
    color: colors.textLight,
  },
  earningsCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  earningsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  earningsTitle: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.lightGrey,
  },
  periodText: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  earningsValue: {
    marginTop: spacing.sm,
    color: colors.dark,
    fontSize: 32,
    fontWeight: typography.weights.extrabold,
  },
  earningsGrowth: {
    marginTop: 4,
    color: SUCCESS_GREEN,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  chartWrap: {
    marginTop: spacing.md,
  },
  actionsGrid: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.card,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: { flex: 1 },
  actionTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  actionSubtitle: {
    marginTop: 2,
    color: colors.grey,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  statusStack: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.card,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCopy: { flex: 1 },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusTitle: {
    flex: 1,
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  statusEyebrow: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  statusBig: {
    marginTop: 2,
    color: colors.dark,
    fontSize: 28,
    fontWeight: typography.weights.extrabold,
  },
  statusHint: {
    marginTop: 4,
    color: colors.grey,
    fontSize: typography.sizes.sm,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeProgress: { backgroundColor: colors.goldLight },
  badgeCompleted: { backgroundColor: '#DCFCE7' },
  badgeRejected: { backgroundColor: '#FEE2E2' },
  badgePending: { backgroundColor: colors.lightGrey },
  badgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  badgeProgressText: { color: colors.primaryDark },
  badgeCompletedText: { color: SUCCESS_GREEN },
  badgeRejectedText: { color: colors.error },
  badgePendingText: { color: colors.grey },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotText: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
  },
  dotSep: {
    color: colors.textMuted,
    marginHorizontal: 2,
  },
  activityCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  activityTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.lg,
  },
  viewAll: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  emptyActivity: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCopy: { flex: 1 },
  activityItemTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  activityDesc: {
    marginTop: 2,
    color: colors.grey,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  activityTime: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },
  pillCompleted: {
    backgroundColor: '#DCFCE7',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  pillCompletedText: {
    color: SUCCESS_GREEN,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  pillProgress: {
    backgroundColor: colors.goldLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  pillProgressText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  pillNew: {
    backgroundColor: '#DBEAFE',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  pillNewText: {
    color: INFO_BLUE,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  pressed: { opacity: 0.92 },
  leadsBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  leadsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  leadsTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  leadsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.dark,
  },
  leadsViewAll: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  leadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  leadTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leadBadge: {
    backgroundColor: colors.goldLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  leadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    textTransform: 'capitalize',
  },
  leadFare: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark,
  },
  leadNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.grey,
    marginTop: 4,
  },
  leadAddress: {
    fontSize: 13,
    color: colors.dark,
    marginTop: 4,
    fontWeight: '500',
  },
  assignCta: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.dark,
    borderRadius: 8,
    paddingVertical: 8,
  },
  assignCtaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  leadsEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  leadsEmptyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadsEmptyCopy: { flex: 1 },
  leadsEmptyTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  leadsEmptySub: {
    marginTop: 2,
    color: colors.grey,
    fontSize: typography.sizes.xs,
    lineHeight: 16,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  earningsCol: { flex: 1 },
  earningsColLabel: {
    marginTop: 4,
    color: colors.grey,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  earningsDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  fleetCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  fleetTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  fleetMetricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.md,
  },
  fleetMetricCol: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  fleetMetricIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fleetMetricValue: {
    color: colors.dark,
    fontSize: 24,
    fontWeight: typography.weights.extrabold,
  },
  fleetMetricLabel: {
    color: colors.grey,
    fontSize: 11,
    lineHeight: 14,
  },
  fleetDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
});
