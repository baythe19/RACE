import { PartnerText, PartnerTextInput } from '../../components/partner/PartnerText';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle2,
  MoreVertical,
  Plus,
  Search,
  User,
  Wrench,
} from 'lucide-react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppScreenLayout from '../../components/ui/AppScreenLayout';
import { usePartnerDialog } from '../../hooks/usePartnerDialog';
import DriverDataSkeleton from '../../components/partner/DriverDataSkeleton';
import VendorVehicleImage from '../../components/partner/VendorVehicleImage';
import { getApiErrorMessage } from '../../services/auth/useAuthMutations';
import { useVendorStatusQuery } from '../../services/vendor/useVendorMutations';
import type { FleetVehicle, FleetVehicleStatus } from '../../services/vendor/vendorVehiclesApi';
import {
  useRemoveVendorVehicleMutation,
  useUpdateVendorVehicleMutation,
  useVendorBookingsQuery,
  useVendorFleetVehiclesQuery,
} from '../../services/vendor/useVendorBookingsQueries';
import type {
  PartnerJobsStackParamList,
} from '../../types/partnerNavigation';
import { colors, radius, spacing, typography } from '../../theme';

const PAGE_BG = '#FFFFFF';
const SUCCESS_GREEN = '#22C55E';
type StatusFilter = 'all' | FleetVehicleStatus;

function normalizeReg(value?: string) {
  return (value ?? '').replace(/[\s-]+/g, '').toUpperCase();
}

function formatPlate(reg: string) {
  const clean = normalizeReg(reg);
  // OD02AT1234 → OD 02 AT 1234
  const match = clean.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$/);
  if (!match) return reg.toUpperCase();
  return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
}

function typeBadge(type: string) {
  const lower = type.toLowerCase();
  if (lower.includes('truck')) return { bg: '#EDE9FE', text: '#7C3AED', label: type };
  if (lower.includes('jump')) return { bg: '#FFEDD5', text: '#C2410C', label: type };
  if (lower.includes('car') || lower.includes('wheel')) {
    return { bg: '#DBEAFE', text: '#1D4ED8', label: type };
  }
  return { bg: colors.goldLight, text: colors.primaryDark, label: type };
}

function artworkForVehicleType(type: string): 'flatbed' | 'wheel_lift' | 'heavy_tow' | 'other' {
  const label = (type ?? '').toLowerCase();
  if (label.includes('flatbed') || label.includes('flat')) return 'flatbed';
  if (label.includes('wheel')) return 'wheel_lift';
  if (label.includes('heavy') || label.includes('recovery') || label.includes('truck'))
    return 'heavy_tow';
  return 'other';
}

function statusMeta(status: string, driverBusy?: boolean) {
  if (status === 'UNDER_MAINTENANCE') {
    return {
      key: 'service' as const,
      label: 'Under maintenance',
      sub: 'Not assignable',
      color: colors.primaryDark,
    };
  }
  if (status === 'INACTIVE') {
    return {
      key: 'inactive' as const,
      label: 'Inactive',
      sub: 'Not in use',
      color: colors.error,
    };
  }
  return {
    key: 'active' as const,
    label: 'Active',
    sub: driverBusy ? 'On duty' : 'Available',
    color: SUCCESS_GREEN,
  };
}

export default function VendorVehiclesScreen() {
  const navigation = useNavigation<NavigationProp<PartnerJobsStackParamList>>();
  const insets = useSafeAreaInsets();
  const { dialog: partnerDialog, showAlert } = usePartnerDialog();
  const { data: vendor, isLoading: vendorLoading } = useVendorStatusQuery(true);

  const {
    data: vehicles = [],
    isLoading,
    isRefetching,
    refetch,
  } = useVendorFleetVehiclesQuery(true, false);
  const { data: activeBookings = [], refetch: refetchBookings } = useVendorBookingsQuery(true);

  const updateMutation = useUpdateVendorVehicleMutation();
  const removeMutation = useRemoveVendorVehicleMutation();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [menuVehicle, setMenuVehicle] = useState<FleetVehicle | null>(null);

  const activeAssignments = useMemo(() => {
    const active = new Map<string, (typeof activeBookings)[number]>();
    for (const booking of activeBookings) {
      if (
        booking.assignedFleetVehicleId &&
        ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(booking.status)
      ) {
        active.set(booking.assignedFleetVehicleId, booking);
      }
    }
    return active;
  }, [activeBookings]);

  const stats = useMemo(() => {
    const available = vehicles.filter(
      vehicle => vehicle.status === 'ACTIVE' && !activeAssignments.has(vehicle.id),
    ).length;
    const service = vehicles.filter(v => v.status === 'UNDER_MAINTENANCE').length;
    const inactive = vehicles.filter(v => v.status === 'INACTIVE').length;
    return { total: vehicles.length, available, service, inactive };
  }, [vehicles, activeAssignments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = vehicles.filter(v => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (!q) return true;
      return (
        v.registrationNo.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      const aTime = +new Date(a.createdAt ?? 0);
      const bTime = +new Date(b.createdAt ?? 0);
      return bTime - aTime;
    });

    return list;
  }, [vehicles, search, statusFilter]);

  const openForm = () => {
    navigation.navigate('VendorVehicleRegistration');
  };

  const startEdit = (vehicle: FleetVehicle) => {
    setMenuVehicle(null);
    navigation.navigate('VendorVehicleRegistration', { vehicleId: vehicle.id });
  };

  const setVehicleStatus = async (vehicle: FleetVehicle, status: FleetVehicleStatus) => {
    try {
      await updateMutation.mutateAsync({ vehicleId: vehicle.id, payload: { status } });
      setMenuVehicle(null);
    } catch (error) {
      showAlert({
        tone: 'error',
        title: 'Update failed',
        message: getApiErrorMessage(error, 'Please try again'),
      });
    }
  };

  const onRemove = (vehicle: FleetVehicle) => {
    setMenuVehicle(null);
    showAlert({
      tone: 'error',
      title: 'Remove vehicle?',
      message: `Remove ${formatPlate(vehicle.registrationNo)} from your vendor team?`,
      primaryAction: {
        label: 'Remove',
        onPress: () => {
          void (async () => {
            try {
              await removeMutation.mutateAsync(vehicle.id);
            } catch (error) {
              showAlert({
                tone: 'error',
                title: 'Remove failed',
                message: getApiErrorMessage(error, 'Please try again'),
              });
            }
          })();
        },
      },
      secondaryAction: { label: 'Cancel', onPress: () => {} },
    });
  };

  return (
    <View style={{ flex: 1 }}>
    <AppScreenLayout
      backgroundColor={PAGE_BG}
      keyboardAvoiding
      growContent
      refreshing={isRefetching}
      onRefresh={() => {
        void refetch();
        void refetchBookings();
      }}
      header={
        <View style={styles.headerPad}>
          <View style={styles.titleRow}>
            {navigation?.canGoBack?.() ? (
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
              <PartnerText style={styles.title}>
                Vehicles
              </PartnerText>
              {!navigation?.canGoBack?.() ? (
                <PartnerText style={styles.subtitle}>
                  Manage your fleet vehicles
                </PartnerText>
              ) : null}
            </View>
            <View style={styles.headerRightActions}>
              <Pressable
                testID="vendorVehiclesAddBtn"
                onPress={openForm}
                style={({ pressed }) => [styles.registerBtn, pressed && styles.pressed]}>
                <Plus size={15} color={colors.dark} strokeWidth={2.8} />
                <PartnerText style={styles.registerLabel}>Add vehicle</PartnerText>
              </Pressable>
            </View>
          </View>
        </View>
      }>
      {vendorLoading || isLoading ? (
        <DriverDataSkeleton variant="vehicles" />
      ) : (
        <View style={styles.content}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statTop}>
                <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
                  <Car size={16} color="#2563EB" strokeWidth={2.2} />
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
              <PartnerText style={styles.statValue}>{String(stats.available)}</PartnerText>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statTop}>
                <View style={[styles.statIcon, { backgroundColor: colors.goldLight }]}>
                  <Wrench size={16} color={colors.primaryDark} strokeWidth={2.2} />
                </View>
                <PartnerText style={styles.statLabel} numberOfLines={1}>In service</PartnerText>
              </View>
              <PartnerText style={styles.statValue}>{String(stats.service)}</PartnerText>
            </View>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Search size={16} color={colors.grey} strokeWidth={2.2} />
              <PartnerTextInput
                value={search}
                onChangeText={text => {
                  setSearch(text);
                }}
                placeholder="Search by vehicle number or type"
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
              />
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.filterRow}>
            {([
              ['all', 'All'],
              ['ACTIVE', 'Available'],
              ['UNDER_MAINTENANCE', 'In service'],
              ['INACTIVE', 'Inactive'],
            ] as Array<[StatusFilter, string]>).map(([key, label]) => (
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

          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.iconWrap}>
                <VendorVehicleImage type="flatbed" size={58} />
              </View>
              <PartnerText style={styles.emptyTitle}>No vendor vehicles yet</PartnerText>
              <PartnerText style={styles.emptySubtitle}>
                Register a tow vehicle so you can assign it with a driver when a job comes in.
              </PartnerText>
            </View>
          ) : (
            filtered.map(vehicle => {
              const assignedJob = activeAssignments.get(vehicle.id);
              const driver = assignedJob?.driver;
              const badge = typeBadge(vehicle.type);
              const status = statusMeta(vehicle.status, Boolean(assignedJob));
              return (
                <View key={vehicle.id} style={styles.vehicleCard}>
                  <View style={styles.vehicleTop}>
                    <View style={styles.thumb}>
                      <VendorVehicleImage type={artworkForVehicleType(vehicle.type)} size={58} />
                    </View>
                    <View style={styles.vehicleMain}>
                      <View style={styles.plateRow}>
                        <PartnerText style={styles.plate}>{formatPlate(vehicle.registrationNo)}</PartnerText>
                        <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
                          <PartnerText style={[styles.typeBadgeText, { color: badge.text }]}>
                            {badge.label}
                          </PartnerText>
                        </View>
                      </View>
                      <PartnerText style={styles.modelLine} numberOfLines={1}>
                        {vehicle.model}
                      </PartnerText>
                      <View style={styles.specRow}>
                        <Calendar size={12} color={colors.grey} strokeWidth={2.2} />
                        <PartnerText style={styles.specText}>
                          {vehicle.year ? String(vehicle.year) : '—'}
                        </PartnerText>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => setMenuVehicle(vehicle)}
                      hitSlop={10}
                      style={styles.menuBtn}>
                      <MoreVertical size={18} color={colors.grey} strokeWidth={2.2} />
                    </Pressable>
                  </View>

                  <View style={styles.vehicleBottom}>
                    <View style={styles.driverBlock}>
                      <View
                        style={[
                          styles.driverAvatar,
                          !driver && styles.driverAvatarEmpty,
                        ]}>
                        {driver ? (
                          <PartnerText style={styles.driverInitial}>
                            {driver.name.charAt(0).toUpperCase()}
                          </PartnerText>
                        ) : (
                          <User size={14} color={colors.grey} strokeWidth={2.2} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        {driver ? (
                          <>
                            <PartnerText style={styles.driverName}>{driver.name}</PartnerText>
                            <PartnerText style={styles.driverPhone}>{driver.phone}</PartnerText>
                          </>
                        ) : (
                          <>
                            <PartnerText style={styles.driverNameMuted}>Driver selected per job</PartnerText>
                            <PartnerText style={styles.driverPhone}>No permanent vehicle link</PartnerText>
                          </>
                        )}
                      </View>
                    </View>

                    <View style={styles.statusBlock}>
                      <View
                        style={[
                          styles.statusPill,
                          status.key === 'active' && styles.statusPillActive,
                          status.key === 'service' && styles.statusPillService,
                        ]}>
                        <PartnerText
                          style={[
                            styles.statusPillText,
                            status.key === 'active' && { color: '#15803D' },
                            status.key === 'service' && { color: '#B45309' },
                          ]}>
                          {status.key === 'active' ? status.sub : status.label}
                        </PartnerText>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}

        </View>
      )}

      <Modal
        visible={Boolean(menuVehicle)}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVehicle(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVehicle(null)}>
          <View style={styles.sheet}>
            <PartnerText style={styles.sheetTitle}>
              {menuVehicle ? formatPlate(menuVehicle.registrationNo) : 'Vehicle'}
            </PartnerText>
            {menuVehicle ? (
              <Pressable
                style={styles.sheetItem}
                onPress={() => startEdit(menuVehicle)}>
                <PartnerText style={[styles.sheetItemText, { color: colors.primaryDark }]}>
                  Edit details
                </PartnerText>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.sheetItem}
              onPress={() => menuVehicle && void setVehicleStatus(menuVehicle, 'ACTIVE')}>
              <PartnerText style={styles.sheetItemText}>Mark Active</PartnerText>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() =>
                menuVehicle && void setVehicleStatus(menuVehicle, 'UNDER_MAINTENANCE')
              }>
              <PartnerText style={styles.sheetItemText}>Mark Under maintenance</PartnerText>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() => menuVehicle && void setVehicleStatus(menuVehicle, 'INACTIVE')}>
              <PartnerText style={styles.sheetItemText}>Mark Inactive</PartnerText>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() => menuVehicle && onRemove(menuVehicle)}>
              <PartnerText style={[styles.sheetItemText, { color: colors.error }]}>Remove vehicle</PartnerText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>



    </AppScreenLayout>
    {partnerDialog}
    </View>
  );
}

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
  specDot: { color: colors.textMuted },
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
  driverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarEmpty: {
    backgroundColor: colors.lightGrey,
  },
  driverInitial: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  driverName: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  driverNameMuted: {
    color: colors.grey,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  driverPhone: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    marginTop: 1,
  },
  assignLink: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
    marginTop: 2,
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
  statusLabel: {
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  statusSub: {
    marginTop: 2,
    color: colors.grey,
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
  assignSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
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
  filterOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  filterOptionActive: { color: colors.primaryDark, fontWeight: typography.weights.bold },
  assignHint: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
  },
  driverPick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  addDriverLink: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  pressed: { opacity: 0.92 },
});
