import { PartnerText } from '../../components/partner/PartnerText';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  CloudUpload,
  FileSearch,
  Headphones,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { brand } from '../../theme';
import { useVendorStatusQuery } from '../../services/vendor/useVendorMutations';
import type { PartnerAccountStackParamList } from '../../types/partnerNavigation';
import type { VerificationStage, VendorProfileResponse } from '../../types/vendor';
import { colors, layout, radius, shadows, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'VendorVerificationStatus'>;

const REF_W = 390;
const PAGE_BG = '#F7F7F5';
const SUCCESS_GREEN = '#22C55E';

const STAGES: Array<{
  key: VerificationStage;
  label: string;
  activeHint: string;
}> = [
  {
    key: 'submitted',
    label: 'Submitted',
    activeHint: 'Your registration was received successfully.',
  },
  {
    key: 'document_review',
    label: 'Document review',
    activeHint: 'Our team is reviewing your documents. This usually takes up to 24 hours.',
  },
  {
    key: 'background_check',
    label: 'Background check',
    activeHint: 'We are running background verification for your business.',
  },
  {
    key: 'selfie_match',
    label: 'Selfie match',
    activeHint: 'Matching your profile photo with submitted ID documents.',
  },
  {
    key: 'approved',
    label: 'Approved',
    activeHint: 'Your partner account is approved and ready for jobs.',
  },
];

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

function stageIndex(stage: VerificationStage) {
  if (stage === 'rejected') return 0;
  const idx = STAGES.findIndex(s => s.key === stage);
  return idx >= 0 ? idx : 0;
}

function stageStatus(
  index: number,
  current: number,
  rejected: boolean,
): 'completed' | 'in_progress' | 'pending' {
  if (rejected) {
    return index === 0 ? 'completed' : 'pending';
  }
  if (index < current) return 'completed';
  if (index === current) {
    if (STAGES[current]?.key === 'approved') return 'completed';
    return 'in_progress';
  }
  return 'pending';
}

type HistoryItem = {
  id: string;
  title: string;
  description: string;
  at?: string;
  tone: 'green' | 'yellow' | 'blue' | 'grey';
  Icon: typeof CloudUpload;
};

function buildHistory(vendor: VendorProfileResponse): HistoryItem[] {
  const fromApi = (vendor.statusHistory ?? [])
    .slice()
    .sort((a, b) => +new Date(b.changedAt) - +new Date(a.changedAt))
    .map((item, index) => {
      const stage = STAGES.find(s => s.key === item.status);
      const title =
        item.status === 'document_review'
          ? 'Document review started'
          : stage?.label ?? item.status.replace(/_/g, ' ');
      return {
        id: `hist-${index}-${item.status}`,
        title,
        description: item.note || stage?.activeHint || 'Status updated.',
        at: item.changedAt,
        tone:
          item.status === 'approved' || item.status === 'submitted'
            ? ('green' as const)
            : item.status === 'document_review'
              ? ('yellow' as const)
              : ('grey' as const),
        Icon:
          item.status === 'submitted'
            ? CloudUpload
            : item.status === 'document_review'
              ? FileSearch
              : item.status === 'approved'
                ? ShieldCheck
                : Send,
      };
    });

  if (fromApi.length > 0) return fromApi;

  const submittedAt = vendor.submittedAt || vendor.createdAt;
  return [
    {
      id: 'fallback-submitted',
      title: 'Submitted',
      description: 'Your registration has been submitted successfully.',
      at: submittedAt,
      tone: 'green',
      Icon: CloudUpload,
    },
    {
      id: 'fallback-review',
      title: 'Document review started',
      description: 'Our team has started reviewing your documents.',
      at: submittedAt,
      tone: 'yellow',
      Icon: FileSearch,
    },
    {
      id: 'fallback-request',
      title: 'Document request',
      description: 'We may reach out if any document needs clarification.',
      at: submittedAt,
      tone: 'blue',
      Icon: MessageCircle,
    },
    {
      id: 'fallback-received',
      title: 'Registration received',
      description: 'Thank you for registering with RACE Partner.',
      at: submittedAt,
      tone: 'grey',
      Icon: Send,
    },
  ];
}

function badgeStyles(status: 'completed' | 'in_progress' | 'pending') {
  if (status === 'completed') {
    return { wrap: styles.badgeCompleted, text: styles.badgeCompletedText, label: 'Completed' };
  }
  if (status === 'in_progress') {
    return { wrap: styles.badgeProgress, text: styles.badgeProgressText, label: 'In progress' };
  }
  return { wrap: styles.badgePending, text: styles.badgePendingText, label: 'Pending' };
}

function historyTone(tone: HistoryItem['tone']) {
  if (tone === 'green') return { bg: '#DCFCE7', color: SUCCESS_GREEN };
  if (tone === 'yellow') return { bg: colors.goldLight, color: colors.primaryDark };
  if (tone === 'blue') return { bg: '#DBEAFE', color: '#2563EB' };
  return { bg: colors.lightGrey, color: colors.grey };
}

export default function PartnerVerificationStatusScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / REF_W;
  const px = (value: number) => Math.max(1, Math.round(value * scale));

  const { data: vendor, isLoading, refetch, isRefetching } = useVendorStatusQuery();
  const [historyExpanded, setHistoryExpanded] = useState(true);

  const history = useMemo(() => (vendor ? buildHistory(vendor) : []), [vendor]);
  const visibleHistory = historyExpanded ? history : history.slice(0, 2);

  if (isLoading) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={PAGE_BG} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={PAGE_BG} />
        <View style={[styles.topBar, { paddingHorizontal: px(layout.screenPadding) }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <ArrowLeft size={22} color={colors.dark} strokeWidth={2.5} />
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
  const current = stageIndex(vendor.verificationStage);
  const currentStageMeta =
    STAGES.find(s => s.key === vendor.verificationStage) ?? STAGES[Math.min(current, STAGES.length - 1)];
  const submittedLabel = formatDateTime(vendor.submittedAt || vendor.createdAt);
  const refId = referenceId(vendor);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={PAGE_BG} />

      <View style={[styles.topBar, { paddingHorizontal: px(layout.screenPadding) }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={({ pressed }) => [styles.backChip, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <ArrowLeft size={18} color={colors.dark} strokeWidth={2.5} />
          <PartnerText style={styles.backLabel}>Back</PartnerText>
        </Pressable>

        <View style={styles.brandBlock}>
          <PartnerText style={[styles.brandRace, { fontSize: px(16), lineHeight: px(20) }]}>RACE</PartnerText>
          <PartnerText style={[styles.brandPartner, { fontSize: px(10), lineHeight: px(13) }]}>
            PARTNER
          </PartnerText>
        </View>

        <View style={styles.backChipSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: px(layout.screenPadding),
            paddingBottom: insets.bottom + px(spacing.xl),
          },
        ]}>
        <PartnerText style={[styles.pageTitle, { fontSize: px(26), lineHeight: px(32) }]}>
          Verification status
        </PartnerText>
        <PartnerText style={[styles.pageSubtitle, { fontSize: px(14), lineHeight: px(21), marginTop: px(6) }]}>
          Track your registration progress. We'll notify you as you move forward.
        </PartnerText>

        <View style={[styles.stageCard, { marginTop: px(spacing.xl), borderRadius: px(16) }]}>
          <View style={styles.stageIcon}>
            <ShieldCheck size={28} color={colors.primary} strokeWidth={2.2} />
          </View>
          <View style={styles.stageCopy}>
            <PartnerText style={styles.stageEyebrow}>Current stage</PartnerText>
            <PartnerText style={[styles.stageTitle, { fontSize: px(20) }]}>
              {rejected ? 'Rejected' : currentStageMeta.label}
            </PartnerText>
            <PartnerText style={styles.stageHint}>
              {rejected
                ? vendor.reviewNotes || 'Contact RACE support if you need help.'
                : currentStageMeta.activeHint}
            </PartnerText>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Calendar size={13} color={colors.grey} strokeWidth={2.2} />
                <PartnerText style={styles.metaText}>Submitted on: {submittedLabel || '—'}</PartnerText>
              </View>
              <View style={styles.refPill}>
                <PartnerText style={styles.refText}>{refId}</PartnerText>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.timelineCard, { marginTop: px(spacing.lg), borderRadius: px(16) }]}>
          {STAGES.map((stage, index) => {
            const status = stageStatus(index, current, rejected);
            const badge = badgeStyles(status);
            const historyItem = vendor.statusHistory?.find(h => h.status === stage.key);
            const when =
              status === 'pending'
                ? 'Pending'
                : formatDateTime(historyItem?.changedAt) ||
                  (index === 0 ? submittedLabel : status === 'in_progress' ? submittedLabel : 'Pending');

            return (
              <View key={stage.key} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View
                    style={[
                      styles.timelineDot,
                      status === 'completed' && styles.timelineDotDone,
                      status === 'in_progress' && styles.timelineDotActive,
                    ]}>
                    {status === 'completed' ? (
                      <Check size={12} color="#FFFFFF" strokeWidth={3} />
                    ) : (
                      <PartnerText
                        style={[
                          styles.timelineNum,
                          status === 'in_progress' && styles.timelineNumActive,
                        ]}>
                        {index + 1}
                      </PartnerText>
                    )}
                  </View>
                  {index < STAGES.length - 1 ? (
                    <View
                      style={[
                        styles.timelineLine,
                        status === 'completed' && styles.timelineLineDone,
                      ]}
                    />
                  ) : null}
                </View>

                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <View style={{ flex: 1 }}>
                      <PartnerText style={styles.timelineLabel}>{stage.label}</PartnerText>
                      <PartnerText style={styles.timelineWhen}>{when || 'Pending'}</PartnerText>
                    </View>
                    <View style={badge.wrap}>
                      <PartnerText style={badge.text}>{badge.label}</PartnerText>
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

        <View style={[styles.historyCard, { marginTop: px(spacing.lg), borderRadius: px(16) }]}>
          <View style={styles.historyHeader}>
            <PartnerText style={[styles.sectionHeading, styles.historyHeading]}>History</PartnerText>
            <View style={styles.filterPill}>
              <Calendar size={13} color={colors.grey} strokeWidth={2.2} />
              <PartnerText style={styles.filterText}>All events</PartnerText>
              <ChevronDown size={14} color={colors.grey} strokeWidth={2.4} />
            </View>
          </View>

          {visibleHistory.map(item => {
            const tone = historyTone(item.tone);
            const Icon = item.Icon;
            return (
              <View key={item.id} style={styles.historyRow}>
                <View style={[styles.historyIcon, { backgroundColor: tone.bg }]}>
                  <Icon size={16} color={tone.color} strokeWidth={2.2} />
                </View>
                <View style={styles.historyCopy}>
                  <PartnerText style={styles.historyTitle}>{item.title}</PartnerText>
                  <PartnerText style={styles.historyDesc}>{item.description}</PartnerText>
                  <PartnerText style={styles.historyTime}>{formatDateTime(item.at) || '—'}</PartnerText>
                </View>
              </View>
            );
          })}

          {history.length > 2 ? (
            <Pressable
              onPress={() => setHistoryExpanded(v => !v)}
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

        {vendor.reviewNotes ? (
          <View style={[styles.notesCard, { marginTop: px(spacing.lg), borderRadius: px(14) }]}>
            <PartnerText style={styles.sectionHeading}>Admin notes</PartnerText>
            <PartnerText style={styles.notesText}>{vendor.reviewNotes}</PartnerText>
          </View>
        ) : null}

        <Pressable
          onPress={() => void refetch()}
          style={({ pressed }) => [
            styles.refreshBtn,
            { marginTop: px(spacing.lg), minHeight: px(48), borderRadius: px(12) },
            pressed && styles.pressed,
          ]}>
          <PartnerText style={styles.refreshLabel}>
            {isRefetching ? 'Refreshing…' : 'Refresh status'}
          </PartnerText>
        </Pressable>

        <View style={[styles.supportBar, { marginTop: px(spacing.lg), borderRadius: px(14) }]}>
          <View style={styles.supportLeft}>
            <Headphones size={18} color={colors.primaryDark} strokeWidth={2.2} />
            <PartnerText style={styles.supportCopy}>Need help? Our support team is here for you.</PartnerText>
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
    paddingHorizontal: spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minWidth: 72,
  },
  backChipSpacer: {
    minWidth: 72,
  },
  backLabel: {
    color: colors.dark,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  brandBlock: { alignItems: 'center' },
  brandRace: {
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  brandPartner: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.6,
  },
  topTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.lg,
  },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  pageTitle: {
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
    marginTop: spacing.sm,
  },
  pageSubtitle: {
    color: colors.grey,
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
    textAlign: 'center',
    lineHeight: 20,
  },
  stageCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.goldLight,
    borderWidth: 1,
    borderColor: '#F5D98A',
    padding: spacing.lg,
    ...shadows.card,
  },
  stageIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageCopy: { flex: 1 },
  stageEyebrow: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stageTitle: {
    marginTop: 2,
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
  },
  stageHint: {
    marginTop: spacing.xs,
    color: colors.grey,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  metaRow: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
  },
  refPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  refText: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  timelineCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.card,
  },
  sectionHeading: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.lg,
    marginBottom: spacing.md,
  },
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
    backgroundColor: colors.background,
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
    minHeight: 28,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  timelineLineDone: {
    backgroundColor: SUCCESS_GREEN,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  timelineLabel: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  timelineWhen: {
    marginTop: 2,
    color: colors.grey,
    fontSize: typography.sizes.sm,
  },
  badgeCompleted: {
    backgroundColor: '#DCFCE7',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeCompletedText: {
    color: SUCCESS_GREEN,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  badgeProgress: {
    backgroundColor: colors.goldLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeProgressText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  badgePending: {
    backgroundColor: colors.lightGrey,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgePendingText: {
    color: colors.grey,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  notifyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.lightGrey,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  notifyText: {
    flex: 1,
    color: colors.grey,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  historyCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.card,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  historyHeading: {
    marginBottom: 0,
  },
  filterPill: {
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
  filterText: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  historyRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCopy: { flex: 1 },
  historyTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  historyDesc: {
    marginTop: 2,
    color: colors.grey,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  historyTime: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
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
  notesCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.card,
  },
  notesText: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  refreshBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  refreshLabel: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
  },
  supportBar: {
    backgroundColor: colors.goldLight,
    borderWidth: 1,
    borderColor: '#F5D98A',
    padding: spacing.lg,
    gap: spacing.md,
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
