import { PartnerText, PartnerTextInput } from '../../components/partner/PartnerText';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ArrowLeft,
 Calendar,
  CheckCircle2,
  ClipboardList,
  MoreVertical,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../theme';
import AppScreenLayout from '../../components/ui/AppScreenLayout';
import { usePartnerDialog } from '../../hooks/usePartnerDialog';
import DriverDataSkeleton from '../../components/partner/DriverDataSkeleton';
import { useScreenPx } from '../../hooks/useScreenPx';
import type { VendorMembership } from '../../services/vendor/vendorMembershipApi';
import {
  useRevokeVendorDriverMembershipMutation,
  useVendorMembershipsQuery,
} from '../../services/vendor/useVendorMembershipQueries';
import { useVendorBookingsQuery } from '../../services/vendor/useVendorBookingsQueries';
import { jumpToPartnerJobsScreen } from '../../navigation/partnerNavigationRef';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import type {
  PartnerAccountStackParamList,
  PartnerDriversStackParamList,
  PartnerJobsStackParamList,
} from '../../types/partnerNavigation';

const PAGE_BG = '#FFFFFF';
const SUCCESS_GREEN = '#22C55E';
const INK = '#191919';
const MUTED = '#6B7280';
const AMBER = '#F9A602';

type MemberFilter = 'all' | 'ACTIVE' | 'BUSY' | 'PENDING';

type AssignStacks =
  | PartnerJobsStackParamList
  | PartnerDriversStackParamList
  | PartnerAccountStackParamList;

function driverTypeBadge(type?: string) {
  const lower = (type ?? '').toLowerCase();
  if (lower.includes('tow')) return { bg: '#EDE9FE', text: '#7C3AED', label: type ?? 'Tow Driver' };
  if (lower.includes('part')) return { bg: '#DBEAFE', text: '#1D4ED8', label: type ?? 'Part-Time' };
  return { bg: '#FFF3D6', text: '#B45309', label: type ?? 'Full-Time' };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
}

export default function VendorDriverMembershipsScreen() {
  const px = useScreenPx();
  const { dialog: partnerDialog, showAlert } = usePartnerDialog();
  const navigation = useNavigation<NavigationProp<AssignStacks>>();

  const { data: members = [], isLoading, isError, refetch, isRefetching } = useVendorMembershipsQuery();
  const revoke = useRevokeVendorDriverMembershipMutation();
  const { data: vendorBookings = [] } = useVendorBookingsQuery(true);

  /** Multiple open jobs: vendor picks which job to assign the driver to. */
  const [assignPickerVisible, setAssignPickerVisible] = useState(false);
  const [assignPickerDriver, setAssignPickerDriver] = useState<{ driverId: string; driverName: string } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemberFilter>('all');
  const [menuMember, setMenuMember] = useState<VendorMembership | null>(null);
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
    setMenuMember(null);
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
  const busyMembers = activeMembers.filter(m => m.driver?.isBusy);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = members.filter(member => {
      const isPending = member.status === 'PENDING';
      if (statusFilter === 'PENDING' && !isPending) return false;
      if (statusFilter === 'ACTIVE' && (isPending || member.driver?.isBusy)) return false;
      if (statusFilter === 'BUSY' && (isPending || !member.driver?.isBusy)) return false;
      if (!q) return true;
      const haystack = [
        member.driver?.name,
        member.driver?.phone,
        member.driver?.driverCode,
        member.driver?.city,
        member.driver?.driverType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
    // Pending first (needs action), then alphabetical by name.
    return [...list].sort((a, b) => {
      const aPending = a.status === 'PENDING' ? 0 : 1;
      const bPending = b.status === 'PENDING' ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return (a.driver?.name ?? '').localeCompare(b.driver?.name ?? '');
    });
  }, [members, search, statusFilter]);

  const stats = useMemo(
    () => ({ total: members.length, active: activeMembers.length, busy: busyMembers.length, pending: pendingMembers.length }),
    [members.length, activeMembers.length, busyMembers.length, pendingMembers.length],
  );

  return (
    <View style={{ flex: 1 }}>
    <AppScreenLayout
      backgroundColor={PAGE_BG}
      keyboardAvoiding
      growContent
      refreshing={isRefetching}
      onRefresh={() => {
        void refetch();
      }}
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
                  Onboard staff drivers, assign jobs, keep the fleet moving
                </PartnerText>
              ) : null}
            </View>
            <View style={styles.headerRightActions}>
              <Pressable
                testID="vendorDriversAddBtn"
                accessibilityRole="button"
                accessibilityLabel="Add driver"
                onPress={openAddDriverFlow}
                style={({ pressed }) => [styles.registerBtn, pressed && styles.pressed]}>
                <Plus size={15} color={colors.dark} strokeWidth={2.8} />
                <PartnerText style={styles.registerLabel}>Add driver</PartnerText>
              </Pressable>
            </View>
          </View>
        </View>
      }>
      {isLoading ? (
        <DriverDataSkeleton variant="vehicles" />
      ) : (
        <View style={styles.content}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statTop}>
                <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
                  <UserRound size={16} color="#2563EB" strokeWidth={2.2} />
                </View>
                <PartnerText style={styles.statLabel} numberOfLines={1}>Total</PartnerText>
              </View>
              <PartnerText style={styles.statValue}>{String(stats.total)}</PartnerText>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statTop}>
                <View style={[styles.statIcon, { backgroundColor: '#DCFCE7' }]}>
                  <CheckCircle2 size={16} color={SUCCESS_GREEN} strokeWidth={2.2} />
                </View>
                <PartnerText style={styles.statLabel} numberOfLines={1}>Available</PartnerText>
              </View>
              <PartnerText style={styles.statValue}>{String(stats.active - stats.busy)}</PartnerText>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statTop}>
                <View style={[styles.statIcon, { backgroundColor: colors.goldLight }]}>
                  <ClipboardList size={16} color={colors.primaryDark} strokeWidth={2.2} />
                </View>
                <PartnerText style={styles.statLabel} numberOfLines={1}>On duty</PartnerText>
              </View>
              <PartnerText style={styles.statValue}>{String(stats.busy)}</PartnerText>
            </View>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Search size={16} color={colors.grey} strokeWidth={2.2} />
              <PartnerTextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name, phone or code"
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
              />
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.filterRow}>
            {([
              ['all', 'All'],
              ['ACTIVE', 'Available'],
              ['BUSY', 'On duty'],
              ['PENDING', 'Pending'],
            ] as Array<[MemberFilter, string]>).map(([key, label]) => (
              <Pressable
                key={key}
                onPress={() => setStatusFilter(key)}
                style={[styles.filterPill, statusFilter === key && styles.filterPillActive]}>
                <PartnerText style={[styles.filterText, statusFilter === key && styles.filterTextActive]}>
                  {label}
                </PartnerText>
              </Pressable>
            ))}
          </ScrollView>

          {isError ? (
            <View style={styles.empty}>
              <PartnerText style={styles.emptySubtitle}>
                Fleet list could not load. Pull down to retry.
              </PartnerText>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.iconWrap}>
                <UserRound size={30} color={AMBER} strokeWidth={2} />
              </View>
              <PartnerText style={styles.emptyTitle}>
                {members.length === 0 ? 'No Drivers in your fleet yet' : 'No drivers match this filter'}
              </PartnerText>
              <PartnerText style={styles.emptySubtitle}>
                {members.length === 0
                  ? 'Tap + Add driver to onboard staff drivers with verified phone OTP into your fleet.'
                  : 'Try a different search or filter.'}
              </PartnerText>
            </View>
          ) : (
            filtered.map(member => {
              const driver = member.driver;
              const pending = member.status === 'PENDING';
              const badge = driverTypeBadge(driver?.driverType);
              const busy = Boolean(driver?.isBusy);
              return (
                <View key={member.id} style={styles.vehicleCard}>
                  <View style={styles.vehicleTop}>
                    <View style={styles.thumb}>
                      <PartnerText style={styles.thumbInitials}>
                        {initials(driver?.name ?? 'DR')}
                      </PartnerText>
                    </View>
                    <View style={styles.vehicleMain}>
                      <View style={styles.plateRow}>
                        <PartnerText style={styles.plate} numberOfLines={1}>
                          {driver?.name ?? 'Staff Driver'}
                        </PartnerText>
                        {driver?.driverCode ? (
                          <View style={styles.codeBadge}>
                            <PartnerText style={styles.codeBadgeText}>{driver.driverCode}</PartnerText>
                          </View>
                        ) : null}
                      </View>
                      <PartnerText style={styles.modelLine} numberOfLines={1}>
                        {driver?.phone ?? 'Fleet Driver'}
                      </PartnerText>
                      <View style={styles.specRow}>
                        <Calendar size={12} color={colors.grey} strokeWidth={2.2} />
                        <PartnerText style={styles.specText}>
                          {driver?.city ? driver.city : (member.acceptedAt ? 'Joined ' + new Date(member.acceptedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—')}
                        </PartnerText>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => setMenuMember(member)}
                      hitSlop={10}
                      style={styles.menuBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Driver options">
                      <MoreVertical size={18} color={colors.grey} strokeWidth={2.2} />
                    </Pressable>
                  </View>

                  <View style={styles.vehicleBottom}>
                    <View style={styles.driverBlock}>
                      <View style={[styles.miniAvatar, pending && styles.miniAvatarPending]}>
                        {pending ? (
                          <ShieldCheck size={14} color="#B45309" strokeWidth={2.2} />
                        ) : (
                          <UserRound size={14} color={colors.dark} strokeWidth={2.2} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <PartnerText style={styles.driverName}>
                          {pending ? 'Invitation pending' : busy ? 'On another job' : 'Ready for jobs'}
                        </PartnerText>
                        <PartnerText style={styles.driverPhone}>
                          {pending
                            ? 'Waiting for driver to accept'
                            : busy
                              ? 'Finish or reassign before this driver gets new work'
                              : driver?.driverType ?? 'Full-Time'}
                        </PartnerText>
                      </View>
                    </View>

                    <View style={styles.statusBlock}>
                      <View
                        style={[
                          styles.statusPill,
                          !pending && !busy && styles.statusPillActive,
                          busy && styles.statusPillService,
                        ]}>
                        <PartnerText
                          style={[
                            styles.statusPillText,
                            !pending && !busy && { color: '#15803D' },
                            busy && { color: '#B45309' },
                          ]}>
                          {pending ? 'Pending' : busy ? 'On duty' : 'Available'}
                        </PartnerText>
                      </View>
                    </View>
                  </View>

                  {/* Driver type badge row keeps vehicles-style type identity */}
                  <View style={styles.typeRow}>
                    <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
                      <PartnerText style={[styles.typeBadgeText, { color: badge.text }]}>
                        {badge.label}
                      </PartnerText>
                    </View>
                    {!pending && driver?.phone ? (
                      <Pressable
                        onPress={() => void Linking.openURL(`tel:${driver.phone}`)}
                        hitSlop={8}
                        style={styles.callBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Call driver">
                        <Phone size={13} color={colors.primaryDark} strokeWidth={2.3} />
                        <PartnerText style={styles.callBtnText}>Call</PartnerText>
                      </Pressable>
                    ) : null}
                    {!pending ? (
                      <Pressable
                        onPress={() => openAssignForMember(member)}
                        hitSlop={8}
                        style={styles.callBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Assign driver to a job">
                        <ClipboardList size={13} color={colors.primaryDark} strokeWidth={2.3} />
                        <PartnerText style={styles.callBtnText}>Assign job</PartnerText>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}

        </View>
      )}

      {/* Driver options bottom sheet — same pattern as Vehicles ⋮ menu */}
      <Modal
        visible={Boolean(menuMember)}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuMember(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMenuMember(null)}>
          <View style={styles.sheet}>
            <PartnerText style={styles.sheetTitle}>
              {menuMember?.driver?.name ?? 'Driver'}
            </PartnerText>
            {menuMember && !menuMember.driver?.isBusy && menuMember.status === 'ACTIVE' ? (
              <Pressable
                style={styles.sheetItem}
                onPress={() => {
                  const current = menuMember;
                  setMenuMember(null);
                  openAssignForMember(current);
                }}>
                <PartnerText style={[styles.sheetItemText, { color: colors.primaryDark }]}>
                  Assign to job
                </PartnerText>
              </Pressable>
            ) : null}
            {menuMember?.driver?.phone ? (
              <Pressable
                style={styles.sheetItem}
                onPress={() => {
                  setMenuMember(null);
                  void Linking.openURL(`tel:${menuMember.driver?.phone}`);
                }}>
                <PartnerText style={styles.sheetItemText}>Call driver</PartnerText>
              </Pressable>
            ) : null}
            {menuMember ? (
              <Pressable
                style={styles.sheetItem}
                onPress={() => confirmRemove(menuMember)}>
                <PartnerText style={[styles.sheetItemText, { color: colors.error }]}>
                  {menuMember.status === 'PENDING' ? 'Cancel invitation' : 'Remove from fleet'}
                </PartnerText>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Modal>

      {/* Job picker sheet — multiple open jobs, vendor chooses (no auto-select) */}
      <Modal transparent animationType="slide" visible={assignPickerVisible} onRequestClose={() => setAssignPickerVisible(false)}>
        <Pressable style={memberMenuStyles.overlay} onPress={() => setAssignPickerVisible(false)}>
          <Pressable style={[memberMenuStyles.sheet, { paddingBottom: px(14) }]} onPress={e => e.stopPropagation()}>
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

    </AppScreenLayout>
    {partnerDialog}
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

const styles = StyleSheet.create({
  headerPad: {
    paddingHorizontal: 12,
    paddingTop: spacing.xs,
    paddingBottom: 10,
    backgroundColor: PAGE_BG,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: 0,
    position: 'relative',
  },
  listBackButton: {
    width: 36,
    alignItems: 'flex-start',
    paddingLeft: 6,
  },
  title: {
    textAlign: 'left',
    fontSize: 18,
    fontWeight: typography.weights.extrabold,
    color: colors.dark,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: colors.dark,
    fontSize: 19,
    fontWeight: typography.weights.extrabold,
  },
  statLabel: {
    color: colors.grey,
    fontWeight: typography.weights.semibold,
    fontSize: 10.5,
  },
  searchRow: {},
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    color: colors.dark,
    fontSize: typography.sizes.sm,
    paddingVertical: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: PAGE_BG,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  filterTextActive: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.lg,
  },
  emptySubtitle: {
    marginTop: spacing.sm,
    color: colors.grey,
    textAlign: 'center',
    lineHeight: 20,
  },
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  vehicleTop: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  thumb: {
    width: 64,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#FFF7E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbInitials: {
    color: '#B45309',
    fontWeight: typography.weights.extrabold,
    fontSize: 16,
  },
  vehicleMain: { flex: 1 },
  plateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  plate: {
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
    fontSize: typography.sizes.lg,
    flexShrink: 1,
  },
  codeBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  codeBadgeText: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  modelLine: {
    marginTop: 4,
    color: colors.grey,
    fontSize: typography.sizes.sm,
  },
  specRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specText: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  menuBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  driverBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  miniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarPending: {
    backgroundColor: '#FEF3C7',
  },
  driverName: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  driverPhone: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    marginTop: 1,
  },
  statusBlock: {
    alignItems: 'flex-end',
  },
  statusPill: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#F5F6F8',
  },
  statusPillActive: {
    backgroundColor: '#DCFCE7',
  },
  statusPillService: {
    backgroundColor: '#FEF3C7',
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: typography.weights.bold,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
  },
  callBtnText: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: 4,
  },
  sheetTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.lg,
    marginBottom: spacing.sm,
  },
  sheetItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetItemText: {
    color: colors.dark,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.md,
  },
  pressed: { opacity: 0.92 },
});
