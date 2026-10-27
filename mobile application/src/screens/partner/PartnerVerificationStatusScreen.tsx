import { PartnerText } from '../../components/partner/PartnerText';
import React, { useMemo } from 'react';
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
  Check,
  Clock,
  FileText,
  ShieldCheck,
  Truck,
  XCircle,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DriverDataSkeleton from '../../components/partner/DriverDataSkeleton';
import { useVendorStatusQuery } from '../../services/vendor/useVendorMutations';
import type { PartnerAccountStackParamList } from '../../types/partnerNavigation';
import type { VendorProfileResponse } from '../../types/vendor';
import { brand } from '../../theme';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'VendorVerificationStatus'>;

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
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Short, neutral label for any status string the backend writes. */
function labelForStatus(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draft',
    pending: 'Submitted',
    under_review: 'Under review',
    approved: 'Approved',
    rejected: 'Rejected',
    changes_requested: 'Changes requested',
    submitted: 'Application submitted',
    document_review: 'Document review',
    background_check: 'Verification',
    selfie_match: 'Verification',
  };
  return map[status] ?? status.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

type TimelineStep = {
  key: string;
  label: string;
  at?: string;
  done: boolean;
  failed?: boolean;
};

/**
 * Derive the timeline from what the backend ACTUALLY records:
 * pending/submitted → document_review → approved | rejected.
 * No invented stages — a pending application shows "Under review" only.
 */
function buildTimeline(vendor: VendorProfileResponse): TimelineStep[] {
  const history = vendor.statusHistory ?? [];
  const at = (status: string) =>
    history
      .filter(item => item.status === status)
      .map(item => item.changedAt)
      .sort((a, b) => +new Date(b) - +new Date(a))[0];

  const rejected = vendor.status === 'rejected';
  const approved = vendor.status === 'approved';

  const submittedAt = vendor.submittedAt ?? at('pending') ?? at('submitted');
  const reviewDoneAt = at('approved') ?? at('rejected');

  return [
    {
      key: 'submitted',
      label: 'Application submitted',
      at: submittedAt,
      done: Boolean(submittedAt),
    },
    {
      key: 'document_review',
      label: 'Document review',
      at: reviewDoneAt,
      done: Boolean(reviewDoneAt) || approved || rejected,
    },
    {
      key: 'decision',
      label: rejected ? labelForStatus('rejected') : labelForStatus('approved'),
      at: vendor.approvedAt ?? reviewDoneAt,
      done: approved || rejected,
      failed: rejected,
    },
  ];
}

function referenceId(vendor: VendorProfileResponse) {
  const suffix = vendor.id.replace(/\D/g, '').slice(-5) || vendor.id.slice(-5).toUpperCase();
  return `RACE-VEN-${suffix}`;
}

export default function PartnerVerificationStatusScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { data: vendor, isLoading, refetch, isRefetching } = useVendorStatusQuery();

  const timeline = useMemo(() => (vendor ? buildTimeline(vendor) : []), [vendor]);

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

  const rejected = vendor.status === 'rejected';
  const approved = !rejected && vendor.status === 'approved';
  const refId = referenceId(vendor);
  const statusNote = rejected ? vendor.reviewNotes : undefined;

  const businessRows = [
    { label: 'Business', value: vendor.businessName },
    { label: 'Owner', value: vendor.ownerName },
    { label: 'Type', value: vendor.vendorType?.replace(/_/g, ' ') },
  ].filter(row => Boolean(row.value));

  const vehicle = vendor.towVehicle;
  const documents = (vendor.documents ?? []).slice(0, 6);

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

      <ScrollView
        style={styles.scroll}
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}>
        {/* Current status — headline */}
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
              <PartnerText style={styles.stageEyebrow}>
                {approved
                  ? 'Verified partner'
                  : rejected
                    ? 'Application rejected'
                    : 'Verification in progress'}
              </PartnerText>
              <PartnerText style={styles.stageTitle}>
                {approved ? 'Approved' : rejected ? 'Rejected' : 'Under review'}
              </PartnerText>
            </View>
            <View style={styles.refPill}>
              <PartnerText style={styles.refText}>{refId}</PartnerText>
            </View>
          </View>

          <PartnerText style={styles.stageNote}>
            {statusNote
              ? statusNote
              : approved
                ? 'Aap ab jobs accept kar sakte ho.'
                : rejected
                  ? 'Support se contact karo next steps ke liye.'
                  : 'Aapke documents review ho rahe hain. Update jaldi milega.'}
          </PartnerText>
        </View>

        {/* Timeline — only real backend stages */}
        <View style={styles.card}>
          {timeline.map((step, index) => (
            <View key={step.key} style={styles.timelineRow}>
              <View style={styles.timelineRail}>
                <View
                  style={[
                    styles.timelineDot,
                    (step.done || step.failed) &&
                      (step.failed ? styles.timelineDotFailed : styles.timelineDotDone),
                  ]}>
                  {step.failed ? (
                    <XCircle size={12} color="#FFFFFF" strokeWidth={2.6} />
                  ) : step.done ? (
                    <Check size={12} color="#FFFFFF" strokeWidth={3} />
                  ) : (
                    <PartnerText style={styles.timelineNum}>{index + 1}</PartnerText>
                  )}
                </View>
                {index < timeline.length - 1 ? (
                  <View style={[styles.timelineLine, step.done && styles.timelineLineDone]} />
                ) : null}
              </View>
              <View style={styles.timelineContent}>
                <PartnerText
                  style={[
                    styles.timelineLabel,
                    !step.done && !step.failed && styles.timelineLabelPending,
                  ]}>
                  {step.label}
                </PartnerText>
                <PartnerText style={styles.timelineWhen}>
                  {step.at ? formatDateTime(step.at) : step.failed ? '—' : 'Pending'}
                </PartnerText>
              </View>
            </View>
          ))}
        </View>

        {/* Application details — real stored data */}
        {businessRows.length > 0 ? (
          <View style={styles.card}>
            <PartnerText style={styles.sectionHeading}>Application details</PartnerText>
            <View style={styles.detailList}>
              {businessRows.map(row => (
                <View key={row.label} style={styles.detailRow}>
                  <PartnerText style={styles.detailLabel}>{row.label}</PartnerText>
                  <PartnerText style={styles.detailValue} numberOfLines={2}>
                    {row.value}
                  </PartnerText>
                </View>
              ))}
            </View>

            {vehicle?.registrationNumber ? (
              <View style={styles.vehicleRow}>
                <View style={styles.vehicleIcon}>
                  <Truck size={16} color={colors.primaryDark} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <PartnerText style={styles.vehicleTitle}>{vehicle.registrationNumber}</PartnerText>
                  {vehicle.vehicleType ? (
                    <PartnerText style={styles.vehicleMeta} numberOfLines={1}>
                      {vehicle.vehicleType.replace(/_/g, ' ')}
                    </PartnerText>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Documents — real upload/review state only */}
        {documents.length > 0 ? (
          <View style={styles.card}>
            <PartnerText style={styles.sectionHeading}>
              Documents · {documents.length} uploaded
            </PartnerText>
            <View style={styles.detailList}>
              {documents.map(doc => (
                <View key={doc.id} style={styles.docRow}>
                  <View style={styles.docIcon}>
                    <FileText size={14} color={colors.grey} strokeWidth={2.2} />
                  </View>
                  <PartnerText style={styles.docName} numberOfLines={1}>
                    {doc.documentType.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                  </PartnerText>
                  <PartnerText
                    style={[
                      styles.docState,
                      doc.verificationStatus === 'approved' && styles.docStateVerified,
                      doc.verificationStatus === 'rejected' && styles.docStateRejected,
                    ]}>
                    {doc.verificationStatus === 'approved'
                      ? 'Verified'
                      : doc.verificationStatus === 'rejected'
                        ? 'Rejected'
                        : 'Uploaded'}
                  </PartnerText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <PartnerText style={styles.submittedLine}>
          Submitted {formatDateTime(vendor.submittedAt || vendor.createdAt) || '—'}
        </PartnerText>

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

        <Pressable
          onPress={() => void Linking.openURL(`tel:${brand.phoneRaw}`)}
          style={({ pressed }) => [styles.supportRow, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Call support">
          <ShieldCheck size={15} color={colors.primaryDark} strokeWidth={2.2} />
          <PartnerText style={styles.supportText}>Help chahiye? Call {brand.phone}</PartnerText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
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
    paddingTop: spacing.xs,
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  /* Status card */
  stageCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: '#FFFDF6',
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stageCardApproved: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  stageCardRejected: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  stageHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stageIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  stageCopy: {
    flex: 1,
    minWidth: 0,
  },
  stageEyebrow: {
    color: colors.grey,
    fontSize: 11,
    fontWeight: typography.weights.semibold,
  },
  stageTitle: {
    color: colors.dark,
    fontSize: 20,
    fontWeight: typography.weights.extrabold,
    marginTop: 1,
  },
  refPill: {
    backgroundColor: colors.goldLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  refText: {
    color: colors.primaryDark,
    fontSize: 10.5,
    fontWeight: typography.weights.bold,
  },
  stageNote: {
    color: colors.grey,
    fontSize: 13,
    lineHeight: 18,
  },

  /* Generic card + sections */
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeading: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.sm,
  },

  /* Timeline */
  timelineRow: {
    flexDirection: 'row',
    minHeight: 52,
  },
  timelineRail: {
    width: 26,
    alignItems: 'center',
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: SUCCESS_GREEN,
    borderColor: SUCCESS_GREEN,
  },
  timelineDotFailed: {
    backgroundColor: DANGER_RED,
    borderColor: DANGER_RED,
  },
  timelineNum: {
    color: colors.grey,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  timelineLineDone: {
    backgroundColor: SUCCESS_GREEN,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.md,
    marginLeft: spacing.sm,
  },
  timelineLabel: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  timelineLabelPending: {
    color: colors.grey,
    fontWeight: typography.weights.semibold,
  },
  timelineWhen: {
    marginTop: 2,
    color: colors.grey,
    fontSize: typography.sizes.xs,
  },

  /* Application details */
  detailList: {},
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    minWidth: 72,
  },
  detailValue: {
    flex: 1,
    color: colors.dark,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textAlign: 'right',
    lineHeight: 17,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
  },
  vehicleIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  vehicleMeta: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    marginTop: 1,
  },

  /* Documents */
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  docIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docName: {
    flex: 1,
    color: colors.dark,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  docState: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  docStateVerified: {
    color: '#15803D',
  },
  docStateRejected: {
    color: DANGER_RED,
  },

  submittedLine: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  refreshBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  refreshLabel: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },

  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  supportText: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  pressed: { opacity: 0.9 },
});
