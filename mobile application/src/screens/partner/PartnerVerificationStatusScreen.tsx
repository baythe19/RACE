import { PartnerText } from '../../components/partner/PartnerText';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  CloudUpload,
  FileSearch,
  Headphones,
  MessageCircle,
  Phone,
  ShieldCheck,
  XCircle,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import PartnerHeaderLogo from '../../components/partner/PartnerHeaderLogo';
import DriverDataSkeleton from '../../components/partner/DriverDataSkeleton';
import { brand } from '../../theme';
import { useVendorStatusQuery } from '../../services/vendor/useVendorMutations';
import type { PartnerAccountStackParamList } from '../../types/partnerNavigation';
import type { VerificationStage, VendorProfileResponse } from '../../types/vendor';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'VendorVerificationStatus'>;

/**
 * Real vendor verification pipeline (what the backend actually sets):
 *   submitted → document_review → approved | rejected
 * `background_check` / `selfie_match` exist in the shared type but no vendor
 * service ever writes them — showing them as permanently "Pending" rows was
 * misleading, so the timeline now derives from the live stage history.
 */
const STAGES: Array<{ key: VerificationStage; label: string; hint: string }> = [
  {
    key: 'submitted',
    label: 'Application submitted',
    hint: 'Your registration was received successfully.',
  },
  {
    key: 'document_review',
    label: 'Document review',
    hint: 'Our team is reviewing your documents. This usually takes up to 24 hours.',
  },
  {
    key: 'background_check',
    label: 'Background check',
    hint: 'Business and document verification completed.',
  },
  {
    key: 'approved',
    label: 'Approved',
    hint: 'Your partner account is approved and ready for jobs.',
  },
];

const PAGE_BG = '#FFFFFF';
const SUCCESS_GREEN = '#22C55E';
const DANGER_RED = '#EF4444';

function formatDateTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(+date)) return '';
  return date.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function referenceId(vendor: VendorProfileResponse) {
  const suffix = vendor.id.replace(/\D/g, '').slice(-5) || vendor.id.slice(-5).toUpperCase();
  return `RACE-VEN-${suffix}`;
}

/**
 * Map the backend stage onto the visible timeline. `background_check` and
 * `selfie_match` are treated as part of document review, since neither is ever
 * persisted by the vendor service.
 */
function timelineIndex(stage: VerificationStage): number {
  if (stage === 'submitted') return 0;
  if (stage === 'document_review' || stage === 'background_check' || stage === 'selfie_match') {
    return 1;
  }
  if (stage === 'approved') return 3;
  return 0;
}

type RowState = 'completed' | 'in_progress' | 'pending' | 'rejected';

function rowState(index: number, current: number, approved: boolean, rejected: boolean): RowState {
  if (rejected) {
    return index <= current ? 'completed' : 'pending';
  }
  if (approved) return 'completed';
  if (index < current) return 'completed';
  if (index === current) return 'in_progress';
  return 'pending';
}

type HistoryItem = {
  id: string;
  title: string;
  description: string;
  at?: string;
  tone: 'green' | 'yellow' | 'grey';
  Icon: typeof CloudUpload;
};

function buildHistory(vendor: VendorProfileResponse): HistoryItem[] {
  const stageLabel = (status: string) =>
    STAGES.find(stage => stage.key === status)?.label ??
    status.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

  return (vendor.statusHistory ?? [])
    .slice()
    .sort((a, b) => +new Date(b.changedAt) - +new Date(a.changedAt))
    .map((item, index) => ({
      id: `hist-${index}-${item.status}-${item.changedAt}`,
      title: stageLabel(item.status),
      description: item.note?.trim() || 'Status updated.',
      at: item.changedAt,
      tone:
        item.status === 'approved'
          ? ('green' as const)
          : item.status === 'rejected'
            ? ('grey' as const)
            : item.status === 'document_review' || item.status === 'pending'
              ? ('yellow' as const)
              : ('grey' as const),
      Icon:
        item.status === 'approved'
          ? BadgeCheck
          : item.status === 'submitted' || item.status === 'pending'
            ? CloudUpload
            : item.status === 'rejected'
              ? XCircle
              : FileSearch,
    }));
}

function historyTone(tone: HistoryItem['tone']) {
  if (tone === 'green') return { bg: '#DCFCE7', color: SUCCESS_GREEN };
  if (tone === 'yellow') return { bg: colors.goldLight, color: colors.primaryDark };
  return { bg: colors.lightGrey, color: colors.grey };
}

export default function PartnerVerificationStatusScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { data: vendor, isLoading, refetch, isRefetching } = useVendorStatusQuery();
  const [historyExpanded, setHistoryExpanded] = useState(true);

  const history = useMemo(() => (vendor ? buildHistory(vendor) : []), [vendor]);
  const visibleHistory = historyExpanded ? history : history.slice(0, 3);

  if (isLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={PAGE_BG} />
        <DriverDataSkeleton variant="verification" />
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={PAGE_BG} />
        <View style={styles.topBar}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <ArrowLeft size={20} color={colors.dark} strokeWidth={2.3} />
          </Pressable>
          <PartnerText style={styles.topTitle}>Verification status</PartnerText>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centered}>
          <PartnerText style={styles.emptyTitle}>No application found</PartnerText>
          <PartnerText style={styles.emptySubtitle}>
            Complete vendor registration to track verification.
          </PartnerText>
        </View>
      </View>
    );
  }

  const rejected = vendor.verificationStage === 'rejected' || vendor.status === 'rejected';
  const approved = !rejected && vendor.status === 'approved' && vendor.verificationStage === 'approved';
  const current = timelineIndex(vendor.verificationStage);
  const submittedLabel = formatDateTime(vendor.submittedAt || vendor.createdAt);
  const refId = referenceId(vendor);
  const currentLabel = rejected
    ? 'Rejected'
    : approved
      ? 'Approved'
      : STAGES[Math.min(current, STAGES.length - 1)].label;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={PAGE_BG} />

      {/* Header — identical pattern to Home / Jobs / Drivers. */}
      <View style={styles.headerPad}>
        <View style={styles.titleRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={styles.listBackButton}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <ArrowLeft size={20} color={colors.dark} strokeWidth={2.3} />
          </Pressable>
          <View style={styles.headerCenter}>
            <PartnerHeaderLogo width={84} />
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}>
        <PartnerText style={styles.pageTitle}>Verification status</PartnerText>
        <PartnerText style={styles.pageSubtitle}>
          Track your registration progress. We'll notify you as you move forward.
        </PartnerText>

        {/* Current stage summary */}
        <View
          style={[
            styles.stageCard,
            approved && styles.stageCardApproved,
            rejected && styles.stageCardRejected,
          ]}>
          <View style={styles.stageHead}>
            <View
              style={[
                styles.stageIcon,
                approved && styles.stageIconApproved,
                rejected && styles.stageIconRejected,
              ]}>
              {rejected ? (
                <XCircle size={20} color={DANGER_RED} strokeWidth={2.2} />
              ) : approved ? (
                <BadgeCheck size={20} color="#15803D" strokeWidth={2.2} />
              ) : (
                <Clock size={20} color={colors.primaryDark} strokeWidth={2.2} />
              )}
            </View>
            <View style={styles.stageCopy}>
              <PartnerText style={styles.stageEyebrow}>Current stage</PartnerText>
              <PartnerText style={styles.stageTitle}>{currentLabel}</PartnerText>
            </View>
            <View
              style={[
                styles.stagePill,
                approved && styles.stagePillApproved,
                rejected && styles.stagePillRejected,
              ]}>
              <PartnerText
                style={[
                  styles.stagePillText,
                  approved && { color: '#15803D' },
                  rejected && { color: DANGER_RED },
                ]}>
                {rejected ? 'Action needed' : approved ? 'Completed' : 'In progress'}
              </PartnerText>
            </View>
          </View>

          <PartnerText style={styles.stageHint}>
            {rejected
              ? vendor.reviewNotes || 'Contact RACE support if you need help.'
              : STAGES[Math.min(current, STAGES.length - 1)].hint}
          </PartnerText>

          <View style={styles.stageFooter}>
            <View style={styles.metaItem}>
              <Calendar size={13} color={colors.grey} strokeWidth={2.2} />
              <PartnerText style={styles.metaText}>
                Submitted {submittedLabel || '—'}
              </PartnerText>
            </View>
            <View style={styles.refPill}>
              <PartnerText style={styles.refText}>{refId}</PartnerText>
            </View>
          </View>
        </View>

        {/* Progress timeline */}
        <View style={styles.card}>
          {STAGES.map((stage, index) => {
            const state = rowState(index, current, approved, rejected);
            const completed = state === 'completed';
            const active = state === 'in_progress';
            const historyItem = vendor.statusHistory?.find(item => item.status === stage.key);
            const when = completed
              ? formatDateTime(historyItem?.changedAt) ||
                (index === 0 ? submittedLabel : '')
              : active
                ? 'In progress'
                : 'Pending';

            return (
              <View key={stage.key} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View
                    style={[
                      styles.timelineDot,
                      completed && styles.timelineDotDone,
                      active && styles.timelineDotActive,
                    ]}>
                    {completed ? (
                      <Check size={12} color="#FFFFFF" strokeWidth={3} />
                    ) : (
                      <PartnerText style={[styles.timelineNum, active && styles.timelineNumActive]}>
                        {index + 1}
                      </PartnerText>
                    )}
                  </View>
                  {index < STAGES.length - 1 ? (
                    <View
                      style={[styles.timelineLine, completed && styles.timelineLineDone]}
                    />
                  ) : null}
                </View>

                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <View style={styles.timelineCopy}>
                      <PartnerText
                        style={[
                          styles.timelineLabel,
                          state === 'pending' && styles.timelineLabelPending,
                        ]}>
                        {stage.label}
                      </PartnerText>
                      <PartnerText style={styles.timelineWhen}>{when}</PartnerText>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        completed && styles.badgeCompleted,
                        active && styles.badgeProgress,
                      ]}>
                      <PartnerText
                        style={[
                          styles.badgeText,
                          completed && styles.badgeCompletedText,
                          active && styles.badgeProgressText,
                        ]}>
                        {completed ? 'Completed' : active ? 'In progress' : 'Pending'}
                      </PartnerText>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}

          <View style={styles.notifyBox}>
            <ShieldCheck size={14} color={colors.grey} strokeWidth={2.2} />
            <PartnerText style={styles.notifyText}>
              You'll be notified at each step via SMS and email.
            </PartnerText>
          </View>
        </View>

        {/* Activity history (no shadow — border only, per user) */}
        <View style={styles.card}>
          <View style={styles.historyHeader}>
            <PartnerText style={styles.sectionHeading}>History</PartnerText>
            <View style={styles.filterPill}>
              <Calendar size={13} color={colors.grey} strokeWidth={2.2} />
              <PartnerText style={styles.filterText}>All events</PartnerText>
            </View>
          </View>

          {visibleHistory.length === 0 ? (
            <PartnerText style={styles.emptyText}>No activity recorded yet.</PartnerText>
          ) : (
            visibleHistory.map(item => {
              const tone = historyTone(item.tone);
              const Icon = item.Icon;
              return (
                <View key={item.id} style={styles.historyRow}>
                  <View style={[styles.historyIcon, { backgroundColor: tone.bg }]}>
                    <Icon size={16} color={tone.color} strokeWidth={2.2} />
                  </View>
                  <View style={styles.historyCopy}>
                    <PartnerText style={styles.historyTitle}>{item.title}</PartnerText>
                    <PartnerText style={styles.historyDesc} numberOfLines={2}>
                      {item.description}
                    </PartnerText>
                    <PartnerText style={styles.historyTime}>
                      {formatDateTime(item.at) || '—'}
                    </PartnerText>
                  </View>
                </View>
              );
            })
          )}

          {history.length > 3 ? (
            <Pressable
              onPress={() => setHistoryExpanded(value => !value)}
              style={({ pressed }) => [styles.viewToggle, pressed && styles.pressed]}>
              <PartnerText style={styles.viewToggleText}>
                {historyExpanded ? 'View less' : 'View more'}
              </PartnerText>
              {historyExpanded ? (
                <ChevronUp size={16} color={colors.primaryDark} strokeWidth={2.4} />
              ) : (
                <ChevronDown size={16} color={colors.primaryDark} strokeWidth={2.4} />
              )}
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={() => void refetch()}
          disabled={isRefetching}
          style={({ pressed }) => [styles.refreshBtn, pressed && styles.pressed]}>
          {isRefetching ? (
            <ActivityIndicator size="small" color={colors.primaryDark} />
          ) : (
            <PartnerText style={styles.refreshLabel}>Refresh status</PartnerText>
          )}
        </Pressable>

        <View style={styles.supportBar}>
          <View style={styles.supportLeft}>
            <Headphones size={18} color={colors.primaryDark} strokeWidth={2.2} />
            <PartnerText style={styles.supportCopy}>
              Need help? Our support team is here for you.
            </PartnerText>
          </View>
          <View style={styles.supportActions}>
            <Pressable
              onPress={() => void Linking.openURL(`tel:${brand.phoneRaw}`)}
              style={({ pressed }) => [styles.supportLink, pressed && styles.pressed]}>
              <Phone size={14} color={colors.primaryDark} strokeWidth={2.4} />
              <PartnerText style={styles.supportLinkText}>{brand.phone}</PartnerText>
            </Pressable>
            <Pressable
              onPress={() => void Linking.openURL(`mailto:${brand.email}`)}
              style={({ pressed }) => [styles.supportLink, pressed && styles.pressed]}>
              <MessageCircle size={14} color={colors.primaryDark} strokeWidth={2.4} />
              <PartnerText style={styles.supportLinkText}>Chat with support</PartnerText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerPad: {
    paddingHorizontal: 16,
    paddingTop: spacing.xs,
    paddingBottom: 6,
    backgroundColor: PAGE_BG,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  listBackButton: {
    width: 44,
    alignItems: 'flex-start',
    paddingLeft: 2,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.lg,
  },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: spacing.sm,
  },
  pageTitle: {
    color: colors.dark,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.extrabold,
  },
  pageSubtitle: {
    marginTop: 4,
    color: colors.grey,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
    maxWidth: 340,
  },
  emptyTitle: {
    color: colors.dark,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: spacing.sm,
    color: colors.grey,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyText: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
    paddingVertical: spacing.sm,
  },

  /* Current stage card */
  stageCard: {
    marginTop: spacing.lg,
    borderRadius: 18,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F5D98A',
    padding: spacing.lg,
  },
  stageCardApproved: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  stageCardRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  stageHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageIconApproved: {
    backgroundColor: '#DCFCE7',
  },
  stageIconRejected: {
    backgroundColor: '#FEE2E2',
  },
  stageCopy: { flex: 1, minWidth: 0 },
  stageEyebrow: {
    color: colors.grey,
    fontSize: 10.5,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  stageTitle: {
    marginTop: 1,
    color: colors.dark,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.extrabold,
  },
  stagePill: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.goldLight,
  },
  stagePillApproved: {
    backgroundColor: '#DCFCE7',
  },
  stagePillRejected: {
    backgroundColor: '#FEE2E2',
  },
  stagePillText: {
    fontSize: 10.5,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
  stageHint: {
    marginTop: spacing.sm + 2,
    color: colors.grey,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  stageFooter: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  refPill: {
    backgroundColor: colors.primary,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  refText: {
    color: colors.dark,
    fontSize: 10.5,
    fontWeight: typography.weights.bold,
  },

  /* Cards — border only, no shadow (user rule) */
  card: {
    marginTop: spacing.md,
    backgroundColor: PAGE_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  sectionHeading: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },

  /* Timeline */
  timelineRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineRail: {
    width: 28,
    alignItems: 'center',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: PAGE_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: SUCCESS_GREEN,
    borderColor: SUCCESS_GREEN,
  },
  timelineDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timelineNum: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  timelineNumActive: {
    color: colors.dark,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 26,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  timelineLineDone: {
    backgroundColor: SUCCESS_GREEN,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingTop: 4,
  },
  timelineCopy: { flex: 1, minWidth: 0 },
  timelineLabel: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  timelineLabelPending: {
    color: colors.grey,
  },
  timelineWhen: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },
  badge: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.lightGrey,
  },
  badgeCompleted: {
    backgroundColor: '#DCFCE7',
  },
  badgeProgress: {
    backgroundColor: colors.goldLight,
  },
  badgeText: {
    color: colors.grey,
    fontSize: 10.5,
    fontWeight: typography.weights.bold,
  },
  badgeCompletedText: {
    color: '#15803D',
  },
  badgeProgressText: {
    color: colors.primaryDark,
  },
  notifyBox: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.lightGrey,
    borderRadius: 12,
    padding: spacing.sm + 2,
  },
  notifyText: {
    flex: 1,
    color: colors.grey,
    fontSize: typography.sizes.xs,
    lineHeight: 16,
  },

  /* History */
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 7,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    backgroundColor: PAGE_BG,
  },
  filterText: {
    color: colors.grey,
    fontSize: 10.5,
    fontWeight: typography.weights.semibold,
  },
  historyRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  historyIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCopy: { flex: 1, minWidth: 0 },
  historyTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  historyDesc: {
    marginTop: 2,
    color: colors.grey,
    fontSize: typography.sizes.xs,
    lineHeight: 17,
  },
  historyTime: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 10.5,
  },
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: spacing.xs,
  },
  viewToggleText: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },

  /* Footer actions */
  refreshBtn: {
    marginTop: spacing.md,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PAGE_BG,
  },
  refreshLabel: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  supportBar: {
    marginTop: spacing.md,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F5D98A',
    padding: spacing.md,
    gap: spacing.sm,
  },
  supportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  supportCopy: {
    flex: 1,
    color: colors.dark,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  supportActions: {
    gap: spacing.sm,
  },
  supportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  supportLinkText: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  pressed: { opacity: 0.9 },
});
