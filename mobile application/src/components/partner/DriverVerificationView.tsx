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
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Check, ChevronDown, ChevronUp, Info, X } from 'lucide-react-native';
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
  onRefresh?: () => void;
  refreshing?: boolean;
};

function CircleContent({ state }: { state: DriverVerificationStep['state'] }) {
  const px = useScreenPx();
  if (state === 'rejected') {
    return <X size={px(16)} color={C.white} strokeWidth={3} />;
  }
  if (state === 'current') {
    return (
      <View
        style={{
          width: px(8),
          height: px(8),
          borderRadius: px(4),
          backgroundColor: C.white,
        }}
      />
    );
  }
  return <Check size={px(15)} color={C.white} strokeWidth={3} />;
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
      <Text
        style={[
          T.meta,
          { fontSize: px(13), lineHeight: px(18), color: C.greySoft, flex: 1 },
        ]}>
        {label}
      </Text>
      <Text
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
      </Text>
    </View>
  );
}

export default function DriverVerificationView({
  verification,
  onOpenDashboard,
  onOpenApplication,
  onRefresh,
  refreshing = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const px = useScreenPx();
  const [applicationOpen, setApplicationOpen] = useState(false);
  const handlePrimaryAction = () => {
    if (onOpenApplication) {
      onOpenApplication();
      return;
    }
    setApplicationOpen(open => !open);
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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      <View style={[styles.topBar, { paddingTop: insets.top + px(6), paddingBottom: px(6) }]}>
        <PartnerHeaderLogo width={px(104)} />
      </View>

      <ScrollView
        style={styles.flex}
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: px(M.pagePadding),
            paddingBottom: insets.bottom + px(24),
          },
        ]}>
        <View style={[styles.artWrap, { marginTop: px(4) }]}>
          <VerificationUnderReviewArtwork size={px(148)} />
        </View>

        <Text
          style={[
            styles.title,
            { fontSize: px(21), lineHeight: px(29), marginTop: px(14) },
          ]}>
          {verification.title}
        </Text>
        <Text
          style={[
            styles.subtitle,
            {
              fontSize: px(14.5),
              lineHeight: px(23),
              marginTop: px(8),
              maxWidth: px(310),
            },
          ]}>
          {verification.subtitle}
        </Text>

        {/* tracker ---------------------------------------------------------- */}
        <View style={[styles.tracker, { marginTop: px(26) }]}>
          {verification.steps.map((step, index) => {
            const isLast = index === verification.steps.length - 1;
            const lineDone = step.state === 'completed';
            return (
              <View key={step.id} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepRail,
                    { width: px(30), marginLeft: px(12) },
                  ]}>
                  <View
                    style={[
                      styles.stepCircle,
                      circleStyle(step.state),
                      { width: px(30), height: px(30) },
                    ]}>
                    <CircleContent state={step.state} />
                  </View>
                  {!isLast ? (
                    <View
                      style={{
                        width: px(2.5),
                        height: px(18),
                        borderRadius: px(2),
                        backgroundColor: lineDone ? STEP_LINE_DONE : STEP_LINE_IDLE,
                      }}
                    />
                  ) : null}
                </View>
                <View
                  style={[
                    styles.stepCopy,
                    { marginLeft: px(14), paddingTop: px(5), paddingBottom: px(6) },
                  ]}>
                  <Text
                    style={[
                      T.cardTitle,
                      {
                        fontSize: px(15),
                        lineHeight: px(20),
                        color:
                          step.state === 'pending' ? SUBTITLE_GREY : INK_TITLE,
                        fontWeight: step.state === 'current' ? '700' : '600',
                      },
                    ]}>
                    {step.label}
                  </Text>
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
              marginTop: px(30),
              borderRadius: px(R.innerCard),
              paddingVertical: px(14),
              paddingHorizontal: px(14),
            },
          ]}>
          <Info size={px(20)} color={CARD_CREAM_INK} strokeWidth={2.2} />
          <Text
            style={[
              T.body,
              {
                flex: 1,
                marginLeft: px(10),
                fontSize: px(13.5),
                lineHeight: px(20),
                color: CARD_CREAM_INK,
                fontWeight: '600',
              },
            ]}>
            {verification.decisionNote ?? verification.note}
          </Text>
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
                padding: px(14),
              },
            ]}>
            <Text style={[T.sectionTitle, { fontSize: px(16), lineHeight: px(21), color: C.ink }]}>
              My application
            </Text>

            <View style={{ marginTop: px(10) }}>
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

            <Text
              style={[
                T.cardTitle,
                {
                  fontSize: px(14),
                  lineHeight: px(19),
                  color: C.ink,
                  marginTop: px(14),
                },
              ]}>
              Documents
            </Text>
            {application.documents.length === 0 ? (
              <Text
                style={[
                  T.body,
                  {
                    fontSize: px(13),
                    lineHeight: px(19),
                    color: C.grey,
                    marginTop: px(6),
                  },
                ]}>
                Your documents were submitted for review. Ask RACE support if you need to change
                one.
              </Text>
            ) : (
              <View style={{ marginTop: px(6) }}>
                {application.documents.map(doc => (
                  <View key={doc.type} style={[styles.documentRow, { paddingVertical: px(8) }]}>
                    <Text
                      style={[
                        T.meta,
                        { fontSize: px(13.5), lineHeight: px(19), color: C.inkSoft, flex: 1 },
                      ]}>
                      {doc.label}
                    </Text>
                    <Text
                      style={[
                        T.pill,
                        {
                          fontSize: px(12),
                          lineHeight: px(16),
                          color:
                            doc.status === 'VERIFIED'
                              ? STEP_GREEN
                              : doc.status === 'REJECTED'
                                ? C.red
                                : STEP_AMBER,
                        },
                      ]}>
                      {documentStatusLabel(doc.status)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* actions ---------------------------------------------------------- */}
        <Pressable
          onPress={handlePrimaryAction}
          accessibilityRole="button"
          accessibilityLabel={
            onOpenApplication
              ? 'View my application'
              : applicationOpen
                ? 'Hide my application'
                : 'View my application'
          }
          style={({ pressed }) => [
            styles.primaryButton,
            {
              height: px(50),
              borderRadius: px(R.button),
              borderColor: STEP_AMBER,
              marginTop: px(30),
            },
            pressed && styles.pressed,
          ]}>
          <Text style={[T.button, { fontSize: px(16), lineHeight: px(20), color: INK_TITLE }]}>
            {!onOpenApplication && applicationOpen ? 'Hide my application' : 'View my application'}
          </Text>
          {onOpenApplication ? null : applicationOpen ? (
            <ChevronUp size={px(18)} color={INK_TITLE} strokeWidth={2.4} />
          ) : (
            <ChevronDown size={px(18)} color={INK_TITLE} strokeWidth={2.4} />
          )}
        </Pressable>

        {onOpenDashboard ? (
          <Pressable
            onPress={onOpenDashboard}
            accessibilityRole="button"
            accessibilityLabel="Go to Dashboard (Read only)"
            style={({ pressed }) => [
              styles.linkButton,
              { paddingVertical: px(12), marginTop: px(6) },
              pressed && styles.pressed,
            ]}>
            <Text style={[T.link, { fontSize: px(15), lineHeight: px(20), color: LINK_BLUE }]}>
              Go to Dashboard (Read only)
            </Text>
          </Pressable>
        ) : null}

        {refreshing ? (
          <ActivityIndicator size="small" color={C.amber} style={{ marginTop: px(8) }} />
        ) : null}
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
  title: {
    fontWeight: '800',
    color: INK_TITLE,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: { color: SUBTITLE_GREY, textAlign: 'center' },
  tracker: { width: '100%' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepRail: { alignItems: 'center' },
  stepCircle: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  stepCopy: { flex: 1, justifyContent: 'center' },
  infoCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_CREAM,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CARD_CREAM,
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
  pressed: { opacity: 0.85 },
});
