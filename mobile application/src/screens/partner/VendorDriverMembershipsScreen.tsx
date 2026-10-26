import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  Info,
  Phone,
  Plus,
  ShieldCheck,
  Star,
  ClipboardList,
  MoreVertical,
  UserRound,
  UserRoundPlus,
  X,
} from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { jumpToPartnerJobsScreen } from '../../navigation/partnerNavigationRef';
import type {
  PartnerAccountStackParamList,
  PartnerDriversStackParamList,
  PartnerJobsStackParamList,
} from '../../types/partnerNavigation';
import { useVendorBookingsQuery } from '../../services/vendor/useVendorBookingsQueries';
import AppScreenLayout from '../../components/ui/AppScreenLayout';
import { PartnerText } from '../../components/partner/PartnerText';
import { useScreenPx } from '../../hooks/useScreenPx';
import { usePartnerDialog } from '../../hooks/usePartnerDialog';
import {
  useRevokeVendorDriverMembershipMutation,
  useVendorMembershipsQuery,
} from '../../services/vendor/useVendorMembershipQueries';
import type { VendorMembership } from '../../services/vendor/vendorMembershipApi';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

const AMBER = '#F9A602';
const INK = '#191919';
const MUTED = '#6B7280';
const GREEN = '#10B981';

function MemberCard({
  member,
  busy,
  onRemove,
  onAssign,
}: {
  member: VendorMembership;
  busy: boolean;
  onRemove: () => void;
  onAssign?: () => void;
}) {
  const px = useScreenPx();
  const pending = member.status === 'PENDING';
  const [menuVisible, setMenuVisible] = useState(false);

  const name = member.driver?.name ?? 'Driver';
  const menuOptions: Array<{
    key: string;
    label: string;
    destructive?: boolean;
    onPress: () => void;
  }> = [];
  if (!pending && member.driver?.phone) {
    menuOptions.push({
      key: 'call',
      label: 'Call driver',
      onPress: () => {
        setMenuVisible(false);
        void Linking.openURL(`tel:${member.driver?.phone}`);
      },
    });
  }
  if (!pending && onAssign) {
    menuOptions.push({
      key: 'assign',
      label: 'Assign to job',
      onPress: () => {
        setMenuVisible(false);
        onAssign();
      },
    });
  }
  menuOptions.push({
    key: 'remove',
    label: pending ? 'Cancel invitation' : 'Remove from fleet',
    destructive: true,
    onPress: () => {
      setMenuVisible(false);
      onRemove();
    },
  });

  const openMenu = () => setMenuVisible(true);

  return (
    <View style={[styles.card, { borderRadius: px(16), padding: px(14), marginBottom: px(10) }]}>
      <View style={styles.row}>
        <View style={[styles.avatar, { width: px(44), height: px(44), borderRadius: px(14) }]}>
          <UserRound size={px(22)} color={AMBER} />
        </View>
        <View style={styles.grow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(6) }}>
            <PartnerText style={[styles.name, { fontSize: px(15) }]}>
              {member.driver?.name ?? 'Staff Driver'}
            </PartnerText>
            {member.driver?.driverCode ? (
              <View style={[styles.codeBadge, { paddingHorizontal: px(6), paddingVertical: px(2), borderRadius: px(6) }]}>
                <PartnerText style={{ color: '#2563EB', fontSize: px(10), fontWeight: '700' }}>
                  {member.driver.driverCode}
                </PartnerText>
              </View>
            ) : null}
          </View>
          <PartnerText style={[styles.sub, { fontSize: px(12), marginTop: px(2) }]}>
            {member.driver?.phone ?? 'Fleet Driver'}
          </PartnerText>
          {member.driver?.driverType ? (
            <PartnerText style={[styles.sub, { fontSize: px(11), marginTop: px(3), color: '#4B5563' }]}>
              {member.driver.driverType + (member.driver.city ? ' · ' + member.driver.city : '')}
            </PartnerText>
          ) : null}
        </View>
        <View style={[styles.statusPill, { backgroundColor: pending ? '#FFF4D6' : '#E9F8EF' }]}>
          <PartnerText style={{ color: pending ? '#9A6700' : '#13834C', fontSize: px(11), fontWeight: '700' }}>
            {pending ? 'Pending' : 'Active'}
          </PartnerText>
        </View>
        <Pressable
          onPress={openMenu}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Driver options"
          style={{ padding: px(4), marginLeft: px(4) }}>
          <MoreVertical size={px(20)} color={MUTED} strokeWidth={2.2} />
        </Pressable>
      </View>
      {!pending && onAssign ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy || member.driver?.isBusy}
          onPress={onAssign}
          style={[
            styles.primaryButton,
            {
              flexDirection: 'row',
              marginTop: px(12),
              height: px(42),
              borderRadius: px(11),
              backgroundColor: member.driver?.isBusy ? '#E5E7EB' : AMBER,
              opacity: busy ? 0.7 : 1,
            },
          ]}>
          <ClipboardList size={px(16)} color={INK} strokeWidth={2.3} />
          <PartnerText style={{ color: INK, fontSize: px(13), fontWeight: '700', marginLeft: px(6) }}>
            {member.driver?.isBusy ? 'On another job' : 'Assign to open job'}
          </PartnerText>
        </Pressable>
      ) : null}

      {/* Driver options action sheet (replaces system Alert menu) */}
      <Modal transparent animationType="fade" visible={menuVisible} onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={memberMenuStyles.overlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={[memberMenuStyles.sheet, { paddingBottom: px(10) }]} onPress={e => e.stopPropagation()}>
            <View style={[memberMenuStyles.handle, { marginTop: px(10) }]} />
            <PartnerText style={[memberMenuStyles.title, { fontSize: px(15), marginTop: px(8) }]}>{name}</PartnerText>
            <PartnerText style={[memberMenuStyles.subtitle, { fontSize: px(12) }]}>
              {pending ? 'Pending fleet driver' : 'Fleet driver'}
            </PartnerText>
            {menuOptions.map(option => (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                onPress={option.onPress}
                style={({ pressed }) => [memberMenuStyles.option, pressed && memberMenuStyles.optionPressed]}>
                <PartnerText
                  style={[
                    memberMenuStyles.optionText,
                    { fontSize: px(14) },
                    option.destructive ? memberMenuStyles.optionDestructive : null,
                  ]}>
                  {option.label}
                </PartnerText>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => setMenuVisible(false)}
              style={({ pressed }) => [memberMenuStyles.closeButton, pressed && memberMenuStyles.optionPressed]}>
              <PartnerText style={[memberMenuStyles.closeText, { fontSize: px(14) }]}>Close</PartnerText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const memberMenuStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,18,25,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E4E8',
  },
  title: {
    fontWeight: '800',
    color: INK,
  },
  subtitle: {
    color: MUTED,
    marginTop: 2,
  },
  option: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F1F5F9',
  },
  optionPressed: {
    backgroundColor: '#F8FAFC',
  },
  optionText: {
    fontWeight: '600',
    color: INK,
  },
  optionDestructive: {
    color: '#DC2626',
  },
  closeButton: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  closeText: {
    fontWeight: '700',
    color: MUTED,
  },
});

export default function VendorDriverMembershipsScreen() {
  const px = useScreenPx();
  const { dialog: partnerDialog, showAlert } = usePartnerDialog();
  const navigation = useNavigation<
    NavigationProp<
      PartnerJobsStackParamList | PartnerDriversStackParamList | PartnerAccountStackParamList
    >
  >();

  const { data: members = [], isLoading, isError, refetch, isRefetching } = useVendorMembershipsQuery();
  const revoke = useRevokeVendorDriverMembershipMutation();
  const { data: vendorBookings = [] } = useVendorBookingsQuery(true);

  /** Multiple open jobs: vendor picks which job to assign the driver to. */
  const [assignPickerVisible, setAssignPickerVisible] = useState(false);
  const [assignPickerDriver, setAssignPickerDriver] = useState<{ driverId: string; driverName: string } | null>(null);
  const assignPickerJobs = useMemo(
    () =>
      assignPickerDriver
        ? vendorBookings.filter(b => (b.status === 'REQUESTED' || b.status === 'CONFIRMED') && !b.driver)
        : [],
    [assignPickerDriver, vendorBookings],
  );

  /** + Add Driver → full driver registration flow (same 3 steps the driver
   * self-registration uses), launched from the vendor side. */
  const openAddDriverFlow = () => {
    navigation.navigate('VendorAddDriver');
  };

  const openAssignForMember = (member: VendorMembership) => {
    const driverId = member.driver?.id;
    if (!driverId) return;
    const openJobs = vendorBookings.filter(
      b => (b.status === 'REQUESTED' || b.status === 'CONFIRMED') && !b.driver,
    );
    if (openJobs.length === 0) {
      showAlert({
        tone: 'info',
        title: 'No open jobs',
        message: 'Go to Jobs → New leads and pick a customer request to assign this driver.',
        primaryAction: { label: 'Go to Jobs', onPress: () => jumpToPartnerJobsScreen('PartnerJobsList') },
        secondaryAction: { label: 'OK', onPress: () => {} },
      });
      return;
    }
    if (openJobs.length === 1) {
      jumpToAssignJob(openJobs[0]!, driverId);
      return;
    }
    // Multiple open jobs — the vendor picks which one (no auto-select).
    setAssignPickerDriver({ driverId, driverName: member.driver?.name ?? 'Driver' });
    setAssignPickerVisible(true);
  };

  const jumpToAssignJob = (
    job: (typeof vendorBookings)[number],
    driverId: string,
  ) => {
    navigation.navigate('VendorAssignJob', {
      bookingId: job.id,
      bookingType: job.bookingType,
      bookingNumber: job.bookingNumber,
      serviceLabel: job.serviceLabel,
      pickupAddress: job.pickup?.address,
      dropoffAddress: job.dropoff?.address ?? undefined,
      estimatedFare: job.estimatedFare,
      preferredDriverId: driverId,
    });
  };

  const confirmRemove = (member: VendorMembership) => {
    const isPending = member.status === 'PENDING';
    showAlert({
      tone: isPending ? 'warning' : 'error',
      title: isPending ? 'Cancel Invitation?' : 'Remove Driver?',
      message: isPending
        ? 'Withdraw the pending fleet invitation sent to this Driver?'
        : 'This ends ' + (member.driver?.name ?? 'this Driver') + '’s fleet connection.',
      primaryAction: {
        label: isPending ? 'Cancel Invitation' : 'Remove',
        onPress: () =>
          revoke.mutate(member.id, {
            onError: error =>
              showAlert({
                tone: 'error',
                title: isPending ? 'Could not cancel' : 'Could not remove Driver',
                message: error instanceof Error ? error.message : 'Please try again.',
              }),
          }),
      },
      secondaryAction: { label: 'Keep', onPress: () => {} },
    });
  };

  const activeMembers = members.filter(m => m.status === 'ACTIVE');
  const pendingMembers = members.filter(m => m.status === 'PENDING');

  return (
    <View style={{ flex: 1 }}>
    <AppScreenLayout
      header={
        <View style={styles.headerPad}>
          <View style={styles.titleRow}>
            {navigation.canGoBack() ? (
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={10}
                style={styles.listBackButton}
                accessibilityRole="button"
                accessibilityLabel="Back">
                <ArrowLeft size={20} color={colors.dark} strokeWidth={2.3} />
              </Pressable>
            ) : null}
            <View style={{ flex: 1 }}>
              <PartnerText style={styles.title}>Fleet Drivers</PartnerText>
              {!navigation.canGoBack() ? (
                <PartnerText style={styles.subtitle}>
                  {activeMembers.length} active driver{activeMembers.length === 1 ? '' : 's'} in your fleet
                </PartnerText>
              ) : null}
            </View>
            <View style={styles.headerRightActions}>
              <Pressable
                testID="vendorDriversAddBtn"
                accessibilityRole="button"
                accessibilityLabel="Add driver"
                onPress={openAddDriverFlow}
                style={({ pressed }) => [styles.registerBtn, pressed && { opacity: 0.88 }]}>
                <Plus size={15} color={colors.dark} strokeWidth={2.8} />
                <PartnerText style={styles.registerLabel}>Add driver</PartnerText>
              </Pressable>
            </View>
          </View>
        </View>
      }
      refreshing={isRefetching}
      onRefresh={() => {
        void refetch();
      }}
      contentStyle={{ paddingTop: px(12) }}>
      {/* Pending Drivers Section if any */}
      {pendingMembers.length > 0 ? (
        <View style={{ marginBottom: px(16) }}>
          <PartnerText style={[styles.sectionTitle, { fontSize: px(15), marginBottom: px(8) }]}>
            Pending Review Drivers · {pendingMembers.length}
          </PartnerText>
          {pendingMembers.map(member => (
            <MemberCard
              key={member.id}
              member={member}
              busy={revoke.isPending}
              onRemove={() => confirmRemove(member)}
            />
          ))}
        </View>
      ) : null}

      {/* Active Fleet Drivers List */}
      <PartnerText style={[styles.sectionTitle, { fontSize: px(15), marginBottom: px(10) }]}>
        Connected Fleet Drivers · {activeMembers.length}
      </PartnerText>

      {isLoading ? (
        <View style={{ paddingVertical: px(30) }}>
          <ActivityIndicator color={AMBER} />
        </View>
      ) : isError ? (
        <View style={[styles.empty, { padding: px(18), borderRadius: px(15) }]}>
          <PartnerText style={{ color: MUTED, textAlign: 'center', fontSize: px(13) }}>
            Fleet list could not load. Pull down to retry.
          </PartnerText>
        </View>
      ) : activeMembers.length ? (
        activeMembers.map(member => (
          <MemberCard
            key={member.id}
            member={member}
            busy={revoke.isPending}
            onRemove={() => confirmRemove(member)}
            onAssign={() => openAssignForMember(member)}
          />
        ))
      ) : (
        <View style={[styles.empty, { padding: px(24), borderRadius: px(16) }]}>
          <View style={[styles.avatar, { width: px(50), height: px(50), borderRadius: px(16), marginBottom: px(10) }]}>
            <UserRoundPlus size={px(24)} color={AMBER} />
          </View>
          <PartnerText style={{ color: INK, fontWeight: '800', fontSize: px(15) }}>
            No Drivers in your fleet yet
          </PartnerText>
          <PartnerText style={{ color: MUTED, fontSize: px(12.5), textAlign: 'center', marginTop: px(5), lineHeight: px(18) }}>
            Tap <PartnerText style={{ fontWeight: '700', color: INK }}>+ Add Driver</PartnerText> above to directly onboard staff drivers with verified phone OTP into your fleet.
          </PartnerText>
        </View>
      )}
    </AppScreenLayout>
    {partnerDialog}

    {/* Job picker sheet — multiple open jobs, vendor chooses (no auto-select) */}
    <Modal transparent animationType="slide" visible={assignPickerVisible} onRequestClose={() => setAssignPickerVisible(false)}>
      <Pressable style={memberMenuStyles.overlay} onPress={() => setAssignPickerVisible(false)}>
        <Pressable style={[memberMenuStyles.sheet, { paddingBottom: px(14) }]} onPress={e => e.stopPropagation()}>
          <View style={[memberMenuStyles.handle, { marginTop: px(10) }]} />
          <PartnerText style={[memberMenuStyles.title, { fontSize: px(16), marginTop: px(10) }]}>
            Assign {assignPickerDriver?.driverName ?? 'driver'} to which job?
          </PartnerText>
          <PartnerText style={[memberMenuStyles.subtitle, { fontSize: px(12), marginBottom: px(6) }]}>
            {assignPickerJobs.length} open job{assignPickerJobs.length === 1 ? '' : 's'} — tap to choose
          </PartnerText>
          <ScrollView style={{ maxHeight: px(380), width: '100%' }}>
            {assignPickerJobs.map(job => (
              <Pressable
                key={job.id}
                accessibilityRole="button"
                onPress={() => {
                  setAssignPickerVisible(false);
                  if (assignPickerDriver) jumpToAssignJob(job, assignPickerDriver.driverId);
                }}
                style={({ pressed }) => [memberMenuStyles.option, pressed && memberMenuStyles.optionPressed, { alignItems: 'flex-start' }]}>
                <PartnerText style={{ fontSize: px(13.5), fontWeight: '800', color: INK }}>
                  #{job.bookingNumber || job.id.slice(-6)} · {job.serviceLabel || (job.bookingType === 'towing' ? 'Towing' : 'Driver hire')}
                </PartnerText>
                <PartnerText style={{ fontSize: px(11.5), color: MUTED, marginTop: px(2) }} numberOfLines={1}>
                  {job.pickup?.address ?? 'Pickup'} → {job.dropoff?.address ?? 'Drop'}
                </PartnerText>
                {job.estimatedFare != null ? (
                  <PartnerText style={{ fontSize: px(11.5), color: '#D97706', fontWeight: '800', marginTop: px(2) }}>
                    ₹{job.estimatedFare.toLocaleString('en-IN')}
                  </PartnerText>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            onPress={() => setAssignPickerVisible(false)}
            style={({ pressed }) => [memberMenuStyles.closeButton, pressed && memberMenuStyles.optionPressed]}>
            <PartnerText style={[memberMenuStyles.closeText, { fontSize: px(14) }]}>Cancel</PartnerText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerPad: {
    paddingHorizontal: 12,
    paddingTop: spacing.xs,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  listBackButton: {
    width: 36,
    alignItems: 'flex-start',
    paddingLeft: 6,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    textAlign: 'left',
    fontSize: 18,
    fontWeight: typography.weights.extrabold,
    color: colors.dark,
  },
  subtitle: {
    marginTop: 2,
    color: colors.grey,
    fontSize: typography.sizes.xs,
    lineHeight: 16,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  registerLabel: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grow: { flex: 1 },
  avatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF7E5' },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EAEC' },
  name: { color: INK, fontWeight: '700' },
  sub: { color: MUTED, marginTop: 1 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 },
  codeBadge: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  sectionTitle: { color: INK, fontWeight: '800' },
  empty: { alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EAEC' },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  inputLabel: {
    color: INK,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    color: INK,
    paddingVertical: 0,
    minWidth: 0,
  },
  smallActionBtn: {
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineOtpBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  devOtpChip: {
    backgroundColor: '#DBEAFE',
    alignSelf: 'flex-start',
  },
  otpInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    textAlign: 'center',
    fontWeight: '700',
    color: INK,
    letterSpacing: 4,
  },
  verifyBtn: {
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  typePill: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
});
