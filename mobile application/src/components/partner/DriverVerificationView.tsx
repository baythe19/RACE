import { PartnerText } from './PartnerText';
/**
 * RACE Partner — Driver verification screen (board: "Your account is under verification").
 *
 * [SCREEN] Driver application review state.
 * [GOAL] Tell the driver exactly where their application is, and let them look at
 *        what they submitted without leaving the screen.
 * [PRIMARY_ACTION] View my application → expands the submitted details + documents.
 * [SECONDARY_ACTION] Go to Dashboard (Read only).
 * [STATES] pending (default) · approved · rejected · suspended · unknown (unreadable).
 * [DATA] 100% from `profile.driverProfile` — see utils/driverVerification.ts for how
 *        each step is derived. No fixed steps, no placeholder user or token.
 *
 * Shared by the post-registration confirmation screen and the main-app gate, so the
 * two entry points can never drift apart.
 *
 * Geometry is expressed against the 390 dp reference used by the rest of the driver
 * surface and converted with `useScreenPx()`.
 */

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { Check, ChevronDown, ChevronUp, Info, Pencil, RefreshCw, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PartnerHeaderLogo from './PartnerHeaderLogo';
import VerificationUnderReviewArtwork from './VerificationUnderReviewArtwork';
import { useScreenPx } from '../../hooks/useScreenPx';
import type {
  DriverVerificationStep,
  DriverVerificationSummary,
} from '../../utils/driverVerification';
import { documentStatusLabel } from '../../utils/driverVerification';
import {
  driverColors as C,
  driverMetrics as M,
  driverRadius as R,
  driverType as T,
} from '../../theme/driverUi';

/* Values measured off the board (see theme/driverUi.ts for the convention). */
const INK_TITLE = '#111827';
const SUBTITLE_GREY = '#6B7280';
const STEP_GREEN = C.green;
const STEP_AMBER = '#FB9E00';
const STEP_IDLE = '#C6CBD3';
const STEP_LINE_DONE = C.green;
const STEP_LINE_IDLE = '#CFD3D9';
const CARD_CREAM = '#FEF6E2';
const CARD_CREAM_INK = '#4A4436';
const LINK_BLUE = '#2563EB';

function verificationStatusCopy(state: DriverVerificationSummary['state']) {
  switch (state) {
    case 'approved':
      return {
        label: 'VERIFICATION APPROVED',
        backgroundColor: '#DCFCE7',
        borderColor: '#BBF7D0',
        color: '#15803D',
      };
    case 'rejected':
      return {
        label: 'ACTION NEEDED',
        backgroundColor: '#FEE2E2',
        borderColor: '#FECACA',
        color: '#B91C1C',
      };
    case 'suspended':
      return {
        label: 'ACCOUNT ON HOLD',
        backgroundColor: '#FEE2E2',
        borderColor: '#FECACA',
        color: '#B91C1C',
      };
    case 'unknown':
      return {
        label: 'STATUS UNAVAILABLE',
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
        color: '#4B5563',
      };
    default:
      return {
        label: 'VERIFICATION IN PROGRESS',
        backgroundColor: '#FEF3C7',
        borderColor: '#FDE68A',
        color: '#B45309',
      };
  }
}

function verificationSummary(state: DriverVerificationSummary['state']) {
  switch (state) {
    case 'approved':
      return 'Your documents are verified. Your roadside partner account is active and ready to receive jobs.';
    case 'rejected':
      return 'Some details need attention. Update the flagged information and resubmit your application.';
    case 'suspended':
      return 'Your account is on hold. Contact RACE support for the next steps before accepting jobs.';
    case 'unknown':
      return 'We could not read your application status right now. Refresh to check the RACE server again.';
    default:
      return 'Thank you for registering with RACE. Our compliance team is reviewing your profile, vehicle records, and uploaded documents.';
  }
}

type Props = {
  verification: DriverVerificationSummary;
  /** Secondary CTA. Omit to hide it (e.g. when there is nowhere to go). */
  onOpenDashboard?: () => void;
  /**
   * Primary CTA override. The registration flow passes this so "View my
   * application" still opens the editable review step; everywhere else the
   * button expands the submitted details inline (there is nothing to edit).
   */
  onOpenApplication?: () => void;
  onEditPrevious?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
};

function CircleContent({ state }: { state: DriverVerificationStep['state'] }) {
  const px = useScreenPx();
  if (state === 'rejected') {
    return <X size={px(11)} color={C.white} strokeWidth={3} />;
  }
  if (state === 'current') {
    return (
      <View
        style={{
          width: px(6),
          height: px(6),
          borderRadius: px(3),
          backgroundColor: C.white,
        }}
      />
    );
  }
  return <Check size={px(11)} color={C.white} strokeWidth={3} />;
}

function circleStyle(state: DriverVerificationStep['state']) {
  if (state === 'completed') return { backgroundColor: STEP_GREEN };
  if (state === 'current') return { backgroundColor: STEP_AMBER };
  if (state === 'rejected') return { backgroundColor: C.red };
  return { backgroundColor: STEP_IDLE };
}

function detailRow(
  label: string,
  value: string | undefined,
  px: (n: number) => number,
  key?: string,
) {
  if (!value) return null;
  return (
    <View key={key ?? label} style={styles.detailRow}>
      <PartnerText
        style={[
          T.meta,
          { fontSize: px(13), lineHeight: px(18), color: C.greySoft, flex: 1 },
        ]}>
        {label}
      </PartnerText>
      <PartnerText
        style={[
          T.meta,
          {
            fontSize: px(13),
            lineHeight: px(18),
            color: C.ink,
            fontWeight: '600',
            flexShrink: 1,
            textAlign: 'right',
          },
        ]}>
        {value}
      </PartnerText>
    </View>
  );
}

export default function DriverVerificationView({
  verification,
  onOpenDashboard,
  onOpenApplication,
  onEditPrevious,
  onRefresh,
  refreshing = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const px = useScreenPx();
  const [applicationOpen, setApplicationOpen] = useState(false);

  const handleEditPrevious = () => {
    if (onEditPrevious) {
      onEditPrevious();
    } else if (onOpenApplication) {
      onOpenApplication();
    }
  };

  const submittedLabel = useMemo(() => {
    if (!verification.submittedAt) return undefined;
    const date = new Date(verification.submittedAt);
    if (Number.isNaN(+date)) return undefined;
    return date.toLocaleString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [verification.submittedAt]);

  const { application } = verification;
  const statusCopy = verificationStatusCopy(verification.state);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top, px(4)),
            paddingBottom: px(4),
            borderBottomWidth: 1,
            borderBottomColor: '#F3F4F6',
            backgroundColor: C.white,
          },
        ]}>
        <PartnerHeaderLogo width={px(68)} />
      </View>

      <ScrollView
        style={styles.flex}
        bounces={applicationOpen}
        scrollEnabled={applicationOpen}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: px(M.pagePadding),
            paddingBottom: insets.bottom + px(16),
          },
        ]}>
        <View style={[styles.artWrap, { marginTop: px(4) }]}>
          <VerificationUnderReviewArtwork size={px(108)} />
        </View>

        {/* Status Pill Badge */}
        <View
          style={[
            styles.statusPillBadge,
            {
              marginTop: px(5),
              paddingHorizontal: px(8),
              paddingVertical: px(2),
              borderRadius: px(16),
              backgroundColor: statusCopy.backgroundColor,
              borderColor: statusCopy.borderColor,
            },
          ]}>
          <View style={[styles.pulsingDot, { backgroundColor: statusCopy.color }]} />
          <PartnerText style={[styles.statusPillText, { fontSize: px(9.5), color: statusCopy.color }]}>
            {statusCopy.label}
          </PartnerText>
        </View>

        {/* Highlighted Title */}
        <PartnerText
          style={[
            styles.title,
            {
              fontSize: px(16.5),
              lineHeight: px(22),
              marginTop: px(5),
              fontWeight: '800',
              color: '#0F172A',
            },
          ]}>
          {verification.title || 'Your account is under verification'}
        </PartnerText>

        {/* State-specific summary paragraph */}
        <PartnerText
          style={[
            styles.subtitle,
            {
              fontSize: px(11),
              lineHeight: px(15.5),
              marginTop: px(4),
              maxWidth: px(330),
              color: '#475569',
            },
          ]}>
          {verificationSummary(verification.state)}
        </PartnerText>

        {/* tracker ---------------------------------------------------------- */}
        <View style={[styles.tracker, { marginTop: px(8) }]}>
          {verification.steps.map((step, index) => {
            const isLast = index === verification.steps.length - 1;
            const lineDone = step.state === 'completed';

            let stepSubtext = '';
            if (step.id === 'submitted') stepSubtext = 'Personal, vehicle & document forms submitted';
            else if (step.id === 'under_review') stepSubtext = 'Compliance team actively checking records';
            else if (step.id === 'background_check') stepSubtext = 'Identity verification & police records';
            else if (step.id === 'approved') stepSubtext = 'Account activation & job dispatch access';

            return (
              <View
                key={step.id}
                style={[
                  styles.stepItemContainer,
                  !isLast && styles.stepItemUnderline,
                  { paddingBottom: isLast ? 0 : px(5), marginBottom: isLast ? 0 : px(5) },
                ]}>
                <View style={styles.stepRow}>
                  <View
                    style={[
                      styles.stepRail,
                      { width: px(22), marginLeft: px(4) },
                    ]}>
                    <View
                      style={[
                        styles.stepCircle,
                        circleStyle(step.state),
                        { width: px(20), height: px(20), borderRadius: px(10) },
                      ]}>
                      <CircleContent state={step.state} />
                    </View>
                    {!isLast ? (
                      <View
                        style={{
                          width: px(2),
                          height: px(13),
                          borderRadius: px(1),
                          backgroundColor: lineDone ? STEP_LINE_DONE : STEP_LINE_IDLE,
                          marginTop: px(2),
                        }}
                      />
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.stepCopy,
                      { marginLeft: px(10), flex: 1 },
                    ]}>
                    <View style={styles.stepTitleRow}>
                      <PartnerText
                        style={[
                          styles.stepLabelText,
                          {
                            fontSize: px(12),
                            lineHeight: px(16),
                            color: step.state === 'pending' ? '#6B7280' : '#0F172A',
                            fontWeight: step.state === 'current' ? '700' : '600',
                          },
                        ]}>
                        {step.label}
                      </PartnerText>
                      {step.state === 'completed' && (
                        <View style={styles.badgeDone}>
                          <PartnerText style={[styles.badgeDoneText, { fontSize: px(9.5) }]}>Done</PartnerText>
                        </View>
                      )}
                      {step.state === 'current' && (
                        <View style={styles.badgeCurrent}>
                          <PartnerText style={[styles.badgeCurrentText, { fontSize: px(9.5) }]}>In progress</PartnerText>
                        </View>
                      )}
                    </View>
                    {stepSubtext ? (
                      <PartnerText
                        style={[
                          styles.stepSubtext,
                          { fontSize: px(10), lineHeight: px(13.5), color: '#64748B', marginTop: px(1) },
                        ]}>
                        {stepSubtext}
                      </PartnerText>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* info callout ----------------------------------------------------- */}
        <View
          style={[
            styles.infoCard,
            {
              marginTop: px(6),
              borderRadius: px(8),
              paddingVertical: px(5),
              paddingHorizontal: px(10),
              borderWidth: 1,
              borderColor: '#FDE68A',
              backgroundColor: '#FEF3C7',
            },
          ]}>
          <Info size={px(13)} color="#B45309" strokeWidth={2.2} />
          <PartnerText
            style={[
              styles.infoCardText,
              {
                flex: 1,
                marginLeft: px(6),
                fontSize: px(10.5),
                lineHeight: px(14),
                color: '#92400E',
                fontWeight: '600',
              },
            ]}>
            {verification.decisionNote ?? verification.note}
          </PartnerText>
        </View>

        {/* application details (View my application) ------------------------ */}
        {applicationOpen ? (
          <View
            style={[
              styles.applicationCard,
              {
                marginTop: px(M.cardGap),
                borderRadius: px(R.innerCard),
                borderColor: C.hairline,
                padding: px(12),
              },
            ]}>
            <PartnerText style={[T.sectionTitle, { fontSize: px(15), lineHeight: px(20), color: C.ink }]}>
              My application
            </PartnerText>

            <View style={{ marginTop: px(8) }}>
              {detailRow('Driver ID', application.driverCode, px)}
              {detailRow('Driver type', application.driverType, px)}
              {detailRow('Licence number', application.licenseNo, px)}
              {detailRow('Operating city', application.city, px)}
              {detailRow('Vehicle', application.vehicleRegistration, px)}
              {detailRow('Submitted on', submittedLabel, px)}
              {detailRow('Added by', application.fleetSource === 'vendor' ? 'Vendor fleet' : application.fleetSource === 'admin' ? 'RACE admin' : undefined, px)}
              {detailRow(
                'Background check',
                application.backgroundCheck === 'VERIFIED'
                  ? 'Verified'
                  : application.backgroundCheck === 'REJECTED'
                    ? 'Rejected'
                    : 'Pending',
                px,
              )}
            </View>

            <PartnerText
              style={[
                T.cardTitle,
                {
                  fontSize: px(13.5),
                  lineHeight: px(18),
                  color: C.ink,
                  marginTop: px(10),
                },
              ]}>
              Documents
            </PartnerText>
            {application.documents.length === 0 ? (
              <PartnerText
                style={[
                  T.body,
                  {
                    fontSize: px(12),
                    lineHeight: px(17),
                    color: C.grey,
                    marginTop: px(4),
                  },
                ]}>
                Your documents were submitted for review.
              </PartnerText>
            ) : (
              <View style={{ marginTop: px(4) }}>
                {application.documents.map(doc => (
                  <View key={doc.type} style={[styles.documentRow, { paddingVertical: px(6) }]}>
                    <PartnerText
                      style={[
                        T.meta,
                        { fontSize: px(12.5), lineHeight: px(17), color: C.inkSoft, flex: 1 },
                      ]}>
                      {doc.label}
                    </PartnerText>
                    <PartnerText
                      style={[
                        T.pill,
                        {
                          fontSize: px(11),
                          lineHeight: px(15),
                          color:
                            doc.status === 'VERIFIED'
                              ? STEP_GREEN
                              : doc.status === 'REJECTED'
                                ? C.red
                                : STEP_AMBER,
                        },
                      ]}>
                      {documentStatusLabel(doc.status)}
                    </PartnerText>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* Actions Section -------------------------------------------------- */}
        <View style={[styles.actionsSection, { marginTop: px(10), width: '100%' }]}>
          {/* Primary CTA: Edit previous details */}
          {(onEditPrevious || onOpenApplication) && (
            <Pressable
              onPress={handleEditPrevious}
              accessibilityRole="button"
              accessibilityLabel="Edit your previous details"
              style={({ pressed }) => [
                styles.editPreviousCtaBtn,
                {
                  height: px(42),
                  borderRadius: px(10),
                },
                pressed && styles.pressed,
              ]}>
              <Pencil size={px(14)} color="#111827" strokeWidth={2.4} style={{ marginRight: px(7) }} />
              <PartnerText style={[styles.editPreviousCtaText, { fontSize: px(14) }]}>
                Edit your previous details
              </PartnerText>
            </Pressable>
          )}

          {/* Secondary Action: View/Hide details */}
          <Pressable
            onPress={() => setApplicationOpen(open => !open)}
            accessibilityRole="button"
            accessibilityLabel={applicationOpen ? 'Hide submitted details' : 'View submitted details'}
            style={({ pressed }) => [
              styles.viewDetailsToggleBtn,
              {
                height: px(36),
                borderRadius: px(8),
                marginTop: px(6),
              },
              pressed && styles.pressed,
            ]}>
            <PartnerText style={[styles.viewDetailsToggleText, { fontSize: px(12.5) }]}>
              {applicationOpen ? 'Hide submitted details' : 'View submitted details'}
            </PartnerText>
            {applicationOpen ? (
              <ChevronUp size={px(14)} color="#374151" strokeWidth={2.2} style={{ marginLeft: px(4) }} />
            ) : (
              <ChevronDown size={px(14)} color="#374151" strokeWidth={2.2} style={{ marginLeft: px(4) }} />
            )}
          </Pressable>

          {onOpenDashboard ? (
            <Pressable
              onPress={onOpenDashboard}
              accessibilityRole="button"
              accessibilityLabel={verification.isApproved ? 'Go to Dashboard' : 'Go to Dashboard (Read only)'}
              style={({ pressed }) => [
                styles.linkButton,
                { paddingVertical: px(4), marginTop: px(2) },
                pressed && styles.pressed,
              ]}>
              <PartnerText style={[T.link, { fontSize: px(13), lineHeight: px(18), color: LINK_BLUE }]}>
                {verification.isApproved ? 'Go to Dashboard' : 'Go to Dashboard (Read only)'}
              </PartnerText>
            </Pressable>
          ) : null}

          {onRefresh ? (
            <Pressable
              onPress={onRefresh}
              disabled={refreshing}
              style={({ pressed }) => [
                styles.refreshButton,
                { paddingVertical: px(4), marginTop: px(2) },
                pressed && styles.pressed,
              ]}>
              {refreshing ? (
                <ActivityIndicator size="small" color="#D97706" />
              ) : (
                <RefreshCw size={px(12)} color="#64748B" />
              )}
              <PartnerText style={[styles.refreshText, { fontSize: px(11.5), marginLeft: px(5) }]}>
                {refreshing ? 'Syncing with RACE server...' : 'Check status now'}
              </PartnerText>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.white },
  flex: { flex: 1 },
  topBar: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
  scrollContent: { alignItems: 'center' },
  artWrap: { alignItems: 'center', justifyContent: 'center' },
  statusPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
    marginRight: 6,
  },
  statusPillText: {
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.6,
  },
  title: {
    fontWeight: '800',
    color: INK_TITLE,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: { color: SUBTITLE_GREY, textAlign: 'center' },
  tracker: { width: '100%' },
  stepItemContainer: {
    width: '100%',
  },
  stepItemUnderline: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepRail: { alignItems: 'center' },
  stepCircle: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  stepCopy: { flex: 1, justifyContent: 'center' },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepLabelText: {
    fontWeight: '600',
    color: '#0F172A',
  },
  stepSubtext: {
    color: '#64748B',
  },
  badgeDone: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  badgeDoneText: {
    fontWeight: '700',
    color: '#15803D',
  },
  badgeCurrent: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  badgeCurrentText: {
    fontWeight: '700',
    color: '#B45309',
  },
  infoCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_CREAM,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CARD_CREAM,
  },
  infoCardText: {
    color: '#92400E',
    fontWeight: '600',
  },
  applicationCard: {
    width: '100%',
    backgroundColor: C.card,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
  },
  actionsSection: {
    width: '100%',
  },
  editPreviousCtaBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  editPreviousCtaText: {
    fontWeight: '700',
    color: '#111827',
  },
  viewDetailsToggleBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewDetailsToggleText: {
    fontWeight: '600',
    color: '#374151',
  },
  primaryButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.white,
    borderWidth: 1.5,
  },
  linkButton: { alignItems: 'center', justifyContent: 'center' },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: {
    fontWeight: '600',
    color: '#64748B',
  },
  pressed: { opacity: 0.85 },
});
