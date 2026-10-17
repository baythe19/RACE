import { PartnerText, PartnerTextInput } from '../../components/partner/PartnerText';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  Calendar,
  Car,
  CheckCircle2,
  ChevronDown,
  Info,
  MoreVertical,
  Plus,
  Search,
  Shield,
  User,
  Wrench,
  XCircle,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import FormField from '../../components/auth/FormField';
import AppScreenLayout from '../../components/ui/AppScreenLayout';
import VehicleTypeArtwork from '../../components/partner/VehicleTypeArtwork';
import { getApiErrorMessage } from '../../services/auth/useAuthMutations';
import { useVendorStatusQuery } from '../../services/vendor/useVendorMutations';
import type { FleetDriver } from '../../services/vendor/vendorDriversApi';
import type { FleetVehicle, FleetVehicleStatus } from '../../services/vendor/vendorVehiclesApi';
import {
  useCreateVendorVehicleMutation,
  useLinkVendorDriverVehicleMutation,
  useRemoveVendorVehicleMutation,
  useUpdateVendorVehicleMutation,
  useVendorFleetDriversQuery,
  useVendorFleetVehiclesQuery,
} from '../../services/vendor/useVendorBookingsQueries';
import { PARTNER_WAITING_ADMIN_APPROVAL } from '../../constants/partnerCopy';
import { colors, radius, spacing, typography } from '../../theme';

const PAGE_BG = '#F7F7F5';
const SUCCESS_GREEN = '#22C55E';
const INFO_BLUE = '#2563EB';
const PAGE_SIZE = 5;

const VEHICLE_TYPES = [
  'Flatbed Tow Truck',
  'Wheel-lift Tow Truck',
  'Heavy Tow Truck',
  'Other',
] as const;

type StatusFilter = 'all' | FleetVehicleStatus;
type SortKey = 'newest' | 'oldest' | 'reg';

function normalizeReg(value?: string) {
  return (value ?? '').replace(/\s+/g, '').toUpperCase();
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

/** Same buckets as the Home leads card — picks the SVG truck artwork per vehicle type. */
function artworkForVehicleType(type: string): 'flatbed' | 'wheel_lift' | 'heavy_tow' | 'car' {
  const label = (type ?? '').toLowerCase();
  if (label.includes('flatbed') || label.includes('flat')) return 'flatbed';
  if (label.includes('wheel')) return 'wheel_lift';
  if (label.includes('heavy') || label.includes('recovery') || label.includes('truck'))
    return 'heavy_tow';
  return 'car';
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
  const navigation = useNavigation();
  const { data: vendor, isLoading: vendorLoading } = useVendorStatusQuery(true);
  const isApproved = vendor?.status === 'approved';

  const {
    data: vehicles = [],
    isLoading,
    isRefetching,
    refetch,
  } = useVendorFleetVehiclesQuery(true, false);
  const { data: drivers = [], refetch: refetchDrivers } = useVendorFleetDriversQuery(true);

  const createMutation = useCreateVendorVehicleMutation();
  const updateMutation = useUpdateVendorVehicleMutation();
  const removeMutation = useRemoveVendorVehicleMutation();
  const linkDriverMutation = useLinkVendorDriverVehicleMutation();

  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<FleetVehicle | null>(null);
  const [registrationNo, setRegistrationNo] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [type, setType] = useState<(typeof VEHICLE_TYPES)[number]>('Flatbed Tow Truck');
  const [assignedDriverId, setAssignedDriverId] = useState<string | null>(null);
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);
  const [rcNumber, setRcNumber] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);

  const [menuVehicle, setMenuVehicle] = useState<FleetVehicle | null>(null);
  const [assignVehicle, setAssignVehicle] = useState<FleetVehicle | null>(null);

  const driverByReg = useMemo(() => {
    const map = new Map<string, FleetDriver>();
    for (const driver of drivers) {
      const key = normalizeReg(driver.vehicleRegistration);
      if (key) map.set(key, driver);
    }
    return map;
  }, [drivers]);

  const stats = useMemo(() => {
    const active = vehicles.filter(v => v.status === 'ACTIVE').length;
    const service = vehicles.filter(v => v.status === 'UNDER_MAINTENANCE').length;
    const inactive = vehicles.filter(v => v.status === 'INACTIVE').length;
    return { total: vehicles.length, active, service, inactive };
  }, [vehicles]);

  const typeOptions = useMemo(() => {
    const set = new Set(vehicles.map(v => v.type).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [vehicles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = vehicles.filter(v => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (typeFilter !== 'all' && v.type !== typeFilter) return false;
      if (!q) return true;
      return (
        v.registrationNo.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'reg') return a.registrationNo.localeCompare(b.registrationNo);
      const aTime = +new Date(a.createdAt ?? 0);
      const bTime = +new Date(b.createdAt ?? 0);
      return sortBy === 'oldest' ? aTime - bTime : bTime - aTime;
    });

    return list;
  }, [vehicles, search, statusFilter, typeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const showingFrom = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(currentPage * PAGE_SIZE, filtered.length);

  const goDrivers = () => {
    const parent = navigation.getParent();
    if (parent) {
      (parent as any).navigate('PartnerAccount', { screen: 'VendorDrivers' });
      return;
    }
    navigation.navigate('VendorDrivers' as never);
  };

  const unassignedDrivers = useMemo(
    () => drivers.filter(d => !normalizeReg(d.vehicleRegistration)),
    [drivers],
  );

  const validate = () => {
    const next: Record<string, string> = {};
    if (registrationNo.trim().length < 4) next.registrationNo = 'Enter registration number';
    if (model.trim().length < 1) next.model = 'Enter vehicle model';
    if (year && (Number(year) < 1980 || Number(year) > 2100)) next.year = 'Enter a valid year';
    if (insuranceExpiry && !/^\d{4}-\d{2}-\d{2}$/.test(insuranceExpiry)) {
      next.insuranceExpiry = 'Use YYYY-MM-DD date';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const resetForm = () => {
    setRegistrationNo('');
    setModel('');
    setYear('');
    setType('Flatbed Tow Truck');
    setAssignedDriverId(null);
    setRcNumber('');
    setInsuranceProvider('');
    setInsurancePolicyNumber('');
    setInsuranceExpiry('');
    setErrors({});
  };

  const openDriverPicker = () => {
    if (!isApproved) {
      Alert.alert('Approval required', PARTNER_WAITING_ADMIN_APPROVAL);
      return;
    }
    setDriverPickerOpen(true);
  };

  const openForm = () => {
    if (!isApproved) {
      Alert.alert('Approval required', PARTNER_WAITING_ADMIN_APPROVAL);
      return;
    }
    setEditingVehicle(null);
    resetForm();
    setShowForm(true);
  };

  const onToggleForm = () => {
    if (!showForm) {
      openForm();
    } else if (showForm && editingVehicle) {
      setShowForm(false);
      setEditingVehicle(null);
      resetForm();
    } else {
      setShowForm(false);
      resetForm();
    }
  };

  const startEdit = (vehicle: FleetVehicle) => {
    if (!isApproved) {
      Alert.alert('Approval required', PARTNER_WAITING_ADMIN_APPROVAL);
      return;
    }
    setMenuVehicle(null);
    setShowForm(true);
    setEditingVehicle(vehicle);
    setRegistrationNo(vehicle.registrationNo);
    setModel(vehicle.model);
    setYear(vehicle.year ? String(vehicle.year) : '');
    const matched =
      VEHICLE_TYPES.find(t => t.toLowerCase() === vehicle.type.toLowerCase()) ??
      (VEHICLE_TYPES.find(t => vehicle.type.toLowerCase().includes(t.split(' ')[0].toLowerCase())) as
        | (typeof VEHICLE_TYPES)[number]
        | undefined);
    setType(matched ?? 'Other');
    const linkedDriver = drivers.find(
      d => normalizeReg(d.vehicleRegistration) === normalizeReg(vehicle.registrationNo),
    );
    setAssignedDriverId(linkedDriver?.id ?? null);
    setRcNumber('');
    setInsuranceProvider('');
    setInsurancePolicyNumber('');
    setInsuranceExpiry(vehicle.insuranceExpiry ? vehicle.insuranceExpiry.slice(0, 10) : '');
    setErrors({});
  };

  const insuranceMeta = () => {
    const parts: string[] = [];
    if (rcNumber.trim()) parts.push(`RC: ${rcNumber.trim().toUpperCase()}`);
    if (insuranceProvider.trim()) parts.push(`Insurer: ${insuranceProvider.trim()}`);
    if (insurancePolicyNumber.trim()) parts.push(`Policy: ${insurancePolicyNumber.trim()}`);
    return parts.join(' · ') || undefined;
  };

  const assignedDriverName = useMemo(() => {
    const driver = drivers.find(d => d.id === assignedDriverId);
    return driver?.name ?? '';
  }, [drivers, assignedDriverId]);

  const linkAssignedDriver = async (registrationNo: string) => {
    if (!assignedDriverId) return;
    try {
      await linkDriverMutation.mutateAsync({
        driverId: assignedDriverId,
        vehicleRegistration: registrationNo,
      });
      await refetchDrivers();
    } catch (error) {
      Alert.alert('Driver link failed', getApiErrorMessage(error, 'Please try again'));
    }
  };

  const submitCreate = async () => {
    if (!isApproved) {
      Alert.alert('Approval required', PARTNER_WAITING_ADMIN_APPROVAL);
      return;
    }
    if (!validate()) return;
    try {
      const registration = registrationNo.trim().toUpperCase();
      await createMutation.mutateAsync({
        registrationNo: registration,
        type,
        model: model.trim(),
        year: year ? Number(year) : undefined,
        status: 'ACTIVE',
        rcNumber: rcNumber.trim().toUpperCase() || undefined,
        insuranceProvider: insuranceProvider.trim() || undefined,
        insurancePolicyNumber: insurancePolicyNumber.trim() || undefined,
        insuranceExpiry: insuranceExpiry || undefined,
      });
      await linkAssignedDriver(registration);
      resetForm();
      setShowForm(false);
      setEditingVehicle(null);
      setPage(1);
      Alert.alert('Vehicle added', 'Vendor vehicle is ready to assign on jobs.');
    } catch (error) {
      Alert.alert('Could not add vehicle', getApiErrorMessage(error, 'Please try again'));
    }
  };

  const submitEdit = async () => {
    if (!editingVehicle) return;
    if (!validate()) return;
    try {
      await updateMutation.mutateAsync({
        vehicleId: editingVehicle.id,
        payload: {
          type,
          model: model.trim(),
          year: year ? Number(year) : undefined,
          insuranceExpiry: insuranceExpiry || undefined,
          maintenanceNote: insuranceMeta(),
        },
      });
      if (assignedDriverId) {
        await linkDriverMutation.mutateAsync({
          driverId: assignedDriverId,
          vehicleRegistration: editingVehicle.registrationNo,
        });
        await refetchDrivers();
      }
      resetForm();
      setShowForm(false);
      setEditingVehicle(null);
      Alert.alert('Vehicle updated', 'Vehicle details were saved.');
    } catch (error) {
      Alert.alert('Could not save', getApiErrorMessage(error, 'Please try again'));
    }
  };

  const setVehicleStatus = async (vehicle: FleetVehicle, status: FleetVehicleStatus) => {
    try {
      await updateMutation.mutateAsync({ vehicleId: vehicle.id, payload: { status } });
      setMenuVehicle(null);
    } catch (error) {
      Alert.alert('Update failed', getApiErrorMessage(error, 'Please try again'));
    }
  };

  const onRemove = (vehicle: FleetVehicle) => {
    setMenuVehicle(null);
    Alert.alert('Remove vehicle?', `Remove ${formatPlate(vehicle.registrationNo)} from your vendor team?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await removeMutation.mutateAsync(vehicle.id);
            } catch (error) {
              Alert.alert('Remove failed', getApiErrorMessage(error, 'Please try again'));
            }
          })();
        },
      },
    ]);
  };

  const onLinkDriver = async (driver: FleetDriver) => {
    if (!assignVehicle) return;
    try {
      await linkDriverMutation.mutateAsync({
        driverId: driver.id,
        vehicleRegistration: assignVehicle.registrationNo,
      });
      setAssignVehicle(null);
      await refetchDrivers();
      Alert.alert(
        'Driver linked',
        `${driver.name} is now linked to ${formatPlate(assignVehicle.registrationNo)}.`,
      );
    } catch (error) {
      Alert.alert('Link failed', getApiErrorMessage(error, 'Please try again'));
    }
  };

  const openAssign = (vehicle: FleetVehicle) => {
    if (!isApproved) {
      Alert.alert('Approval required', PARTNER_WAITING_ADMIN_APPROVAL);
      return;
    }
    if (drivers.length === 0) {
      Alert.alert('No drivers', 'Add a vendor driver first, then assign them to this vehicle.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add driver',
          onPress: () => goDrivers(),
        },
      ]);
      return;
    }
    setAssignVehicle(vehicle);
  };

  const cycleStatusFilter = () => {
    const order: StatusFilter[] = ['all', 'ACTIVE', 'UNDER_MAINTENANCE', 'INACTIVE'];
    const next = order[(order.indexOf(statusFilter) + 1) % order.length] ?? 'all';
    setStatusFilter(next);
    setPage(1);
  };

  const cycleTypeFilter = () => {
    const idx = typeOptions.indexOf(typeFilter);
    const next = typeOptions[(idx + 1) % typeOptions.length] ?? 'all';
    setTypeFilter(next);
    setPage(1);
  };

  const cycleSort = () => {
    const order: SortKey[] = ['newest', 'oldest', 'reg'];
    setSortBy(order[(order.indexOf(sortBy) + 1) % order.length] ?? 'newest');
    setPage(1);
  };

  const statusFilterLabel =
    statusFilter === 'all'
      ? 'All status'
      : statusFilter === 'ACTIVE'
        ? 'Active'
        : statusFilter === 'UNDER_MAINTENANCE'
          ? 'Under maintenance'
          : 'Inactive';

  const sortLabel =
    sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : 'Plate no.';

  return (
    <AppScreenLayout
      backgroundColor={PAGE_BG}
      keyboardAvoiding
      refreshing={isRefetching}
      onRefresh={() => {
        void refetch();
        void refetchDrivers();
      }}
      header={
        <View style={styles.headerPad}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <PartnerText style={styles.title}>Vehicles</PartnerText>
              <PartnerText style={styles.subtitle}>
                Manage your fleet vehicles
              </PartnerText>
            </View>
            <Pressable
              onPress={onToggleForm}
              style={({ pressed }) => [styles.registerBtn, pressed && styles.pressed]}>
              <Plus size={15} color={colors.dark} strokeWidth={2.8} />
              <PartnerText style={styles.registerLabel}>Add vehicle</PartnerText>
            </Pressable>
          </View>
        </View>
      }>
      {vendorLoading || isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : (
        <View style={styles.content}>
          {!isApproved ? (
            <View style={styles.pendingBanner}>
              <PartnerText style={styles.pendingText}>{PARTNER_WAITING_ADMIN_APPROVAL}</PartnerText>
            </View>
          ) : null}

          {showForm ? (
            <View style={styles.formCard}>
              <PartnerText style={styles.formTitle}>
                {editingVehicle ? 'Edit vehicle' : 'Add vehicle'}
              </PartnerText>
              <PartnerText style={styles.formSubtitle}>Register a new vehicle to your fleet</PartnerText>
              <FormField
                testID="vehicleRegInput"
                label="Registration number"
                required
                value={registrationNo}
                onChangeText={setRegistrationNo}
                editable={!editingVehicle}
                autoCapitalize="characters"
                error={errors.registrationNo}
                placeholder="e.g. OD02TW1001"
                Icon={Car}
                variant="outlined"
              />
              <PartnerText style={styles.typeLabel}>
                Vehicle type{' '}
                <PartnerText style={{ color: colors.error }}>*</PartnerText>
              </PartnerText>
              <View style={styles.typeGrid}>
                {VEHICLE_TYPES.map(item => {
                  const active = type === item;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => setType(item)}
                      style={[styles.typeCard, active && styles.typeCardActive]}>
                      <View style={[styles.typeArt, active && styles.typeArtActive]}>
                        <VehicleTypeArtwork
                          type={
                            item.toLowerCase().includes('flat')
                              ? 'flatbed'
                              : item.toLowerCase().includes('wheel')
                                ? 'wheel_lift'
                                : item.toLowerCase().includes('truck') || item.toLowerCase().includes('heavy')
                                  ? 'heavy_tow'
                                  : 'car'
                          }
                          size={44}
                        />
                      </View>
                      <PartnerText
                        style={[styles.typeCardText, active && styles.typeCardTextActive]}
                        numberOfLines={2}>
                        {item}
                      </PartnerText>
                    </Pressable>
                  );
                })}
              </View>
              <FormField
                testID="vehicleModelInput"
                label="Make & model"
                required
                value={model}
                onChangeText={setModel}
                error={errors.model}
                placeholder="e.g. Tata 407, Mahindra Bolero"
                Icon={Car}
                variant="outlined"
              />
              <FormField
                testID="vehicleYearInput"
                label="Manufacturing year"
                optional
                value={year}
                onChangeText={text => setYear(text.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                error={errors.year}
                placeholder="e.g. 2022"
                Icon={Calendar}
                variant="outlined"
                rightElement={<ChevronDown size={16} color={colors.grey} strokeWidth={2.2} />}
              />
              <FormField
                label="Assigned driver"
                optional
                value={assignedDriverName}
                editable={false}
                placeholder="Select driver"
                Icon={User}
                variant="outlined"
                onPress={openDriverPicker}
                rightElement={<ChevronDown size={16} color={colors.grey} strokeWidth={2.2} />}
              />
              <FormField
                label="Insurance expiry"
                optional
                value={insuranceExpiry}
                onChangeText={text => setInsuranceExpiry(text.replace(/[^0-9-]/g, '').slice(0, 10))}
                error={errors.insuranceExpiry}
                placeholder="Select expiry date"
                Icon={Shield}
                variant="outlined"
                rightElement={<Calendar size={16} color={colors.grey} strokeWidth={2.2} />}
              />
              <View style={styles.formInfoBanner}>
                <Info size={15} color={INFO_BLUE} strokeWidth={2.2} />
                <PartnerText style={styles.formInfoText}>
                  Required documents depend on vehicle type and verification rules. You can upload
                  them after saving the vehicle.
                </PartnerText>
              </View>
              <View style={styles.formFooterRow}>
                <Pressable
                  onPress={() => {
                    setShowForm(false);
                    setEditingVehicle(null);
                    resetForm();
                  }}
                  style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}>
                  <PartnerText style={styles.cancelLabel}>Cancel</PartnerText>
                </Pressable>
                <Pressable
                  onPress={() => (editingVehicle ? void submitEdit() : void submitCreate())}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  style={({ pressed }) => [
                    styles.saveBtn,
                    pressed && styles.pressed,
                    (createMutation.isPending || updateMutation.isPending) && styles.disabled,
                  ]}>
                  <PartnerText style={styles.saveLabel}>
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Saving…'
                      : editingVehicle
                        ? 'Save changes'
                        : 'Save vehicle'}
                  </PartnerText>
                </Pressable>
              </View>
            </View>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
                <VehicleTypeArtwork type="car" size={22} />
              </View>
              <PartnerText style={styles.statValue}>{String(stats.total)}</PartnerText>
              <PartnerText style={styles.statLabel} numberOfLines={1}>Total</PartnerText>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#DCFCE7' }]}>
                <CheckCircle2 size={17} color={SUCCESS_GREEN} strokeWidth={2.2} />
              </View>
              <PartnerText style={styles.statValue}>{String(stats.active)}</PartnerText>
              <PartnerText style={styles.statLabel} numberOfLines={1}>Available</PartnerText>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.goldLight }]}>
                <Wrench size={17} color={colors.primaryDark} strokeWidth={2.2} />
              </View>
              <PartnerText style={styles.statValue}>{String(stats.service)}</PartnerText>
              <PartnerText style={styles.statLabel} numberOfLines={1}>In service</PartnerText>
            </View>
          </ScrollView>

          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Search size={16} color={colors.grey} strokeWidth={2.2} />
              <PartnerTextInput
                value={search}
                onChangeText={text => {
                  setSearch(text);
                  setPage(1);
                }}
                placeholder="Search by vehicle number or type"
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
              />
            </View>
          </View>

          <View style={styles.filterRow}>
            <Pressable onPress={cycleStatusFilter} style={styles.filterPill}>
              <PartnerText style={styles.filterText}>{statusFilterLabel}</PartnerText>
              <ChevronDown size={14} color={colors.grey} strokeWidth={2.4} />
            </Pressable>
            <Pressable onPress={cycleTypeFilter} style={styles.filterPill}>
              <PartnerText style={styles.filterText}>
                {typeFilter === 'all' ? 'All vehicle types' : typeFilter}
              </PartnerText>
              <ChevronDown size={14} color={colors.grey} strokeWidth={2.4} />
            </Pressable>
            <Pressable onPress={cycleSort} style={styles.filterPill}>
              <PartnerText style={styles.filterText}>Sort: {sortLabel}</PartnerText>
              <ChevronDown size={14} color={colors.grey} strokeWidth={2.4} />
            </Pressable>
          </View>

          {pageItems.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.iconWrap}>
                <VehicleTypeArtwork type="flatbed" size={54} />
              </View>
              <PartnerText style={styles.emptyTitle}>No vendor vehicles yet</PartnerText>
              <PartnerText style={styles.emptySubtitle}>
                Register a tow vehicle so you can assign it with a driver when a job comes in.
              </PartnerText>
            </View>
          ) : (
            pageItems.map(vehicle => {
              const driver = driverByReg.get(normalizeReg(vehicle.registrationNo));
              const badge = typeBadge(vehicle.type);
              const status = statusMeta(vehicle.status, driver?.isBusy);
              return (
                <View key={vehicle.id} style={styles.vehicleCard}>
                  <View style={styles.vehicleTop}>
                    <View style={styles.thumb}>
                      <VehicleTypeArtwork type={artworkForVehicleType(vehicle.type)} size={56} />
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
                            <PartnerText style={styles.driverNameMuted}>Not assigned</PartnerText>
                            <Pressable onPress={() => openAssign(vehicle)} hitSlop={6}>
                              <PartnerText style={styles.assignLink}>Assign driver</PartnerText>
                            </Pressable>
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
                          {status.key === 'active' ? (driver ? 'On duty' : 'Available') : status.label}
                        </PartnerText>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {filtered.length > 0 ? (
            <View style={styles.pagination}>
              <PartnerText style={styles.pageMeta}>
                Showing {showingFrom} to {showingTo} of {filtered.length} vehicles
              </PartnerText>
              <View style={styles.pageControls}>
                <Pressable
                  disabled={currentPage <= 1}
                  onPress={() => setPage(p => Math.max(1, p - 1))}
                  style={[styles.pageBtn, currentPage <= 1 && styles.pageBtnDisabled]}>
                  <PartnerText style={styles.pageBtnText}>‹</PartnerText>
                </Pressable>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(0, 4)
                  .map(num => (
                    <Pressable
                      key={num}
                      onPress={() => setPage(num)}
                      style={[styles.pageBtn, num === currentPage && styles.pageBtnActive]}>
                      <PartnerText
                        style={[
                          styles.pageBtnText,
                          num === currentPage && styles.pageBtnTextActive,
                        ]}>
                        {String(num)}
                      </PartnerText>
                    </Pressable>
                  ))}
                <Pressable
                  disabled={currentPage >= totalPages}
                  onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={[
                    styles.pageBtn,
                    currentPage >= totalPages && styles.pageBtnDisabled,
                  ]}>
                  <PartnerText style={styles.pageBtnText}>›</PartnerText>
                </Pressable>
              </View>
            </View>
          ) : null}
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
            {!driverByReg.get(normalizeReg(menuVehicle?.registrationNo)) ? (
              <Pressable
                style={styles.sheetItem}
                onPress={() => {
                  const vehicle = menuVehicle;
                  setMenuVehicle(null);
                  if (vehicle) openAssign(vehicle);
                }}>
                <PartnerText style={[styles.sheetItemText, { color: colors.primaryDark }]}>
                  Assign driver
                </PartnerText>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.sheetItem}
              onPress={() => menuVehicle && onRemove(menuVehicle)}>
              <PartnerText style={[styles.sheetItemText, { color: colors.error }]}>Remove vehicle</PartnerText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={Boolean(assignVehicle)}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignVehicle(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAssignVehicle(null)}>
          <Pressable style={styles.assignSheet} onPress={e => e.stopPropagation()}>
            <PartnerText style={styles.sheetTitle}>
              Assign driver
              {assignVehicle ? ` · ${formatPlate(assignVehicle.registrationNo)}` : ''}
            </PartnerText>
            <PartnerText style={styles.assignHint}>
              Choose a vendor driver to link with this vehicle.
            </PartnerText>
            <ScrollView style={{ maxHeight: 320 }}>
              {(unassignedDrivers.length > 0 ? unassignedDrivers : drivers).map(driver => (
                <Pressable
                  key={driver.id}
                  style={styles.driverPick}
                  onPress={() => void onLinkDriver(driver)}
                  disabled={linkDriverMutation.isPending}>
                  <View style={styles.driverAvatar}>
                    <PartnerText style={styles.driverInitial}>{driver.name.charAt(0).toUpperCase()}</PartnerText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <PartnerText style={styles.driverName}>{driver.name}</PartnerText>
                    <PartnerText style={styles.driverPhone}>{driver.phone}</PartnerText>
                  </View>
                  <PartnerText style={styles.assignLink}>Assign</PartnerText>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => {
                setAssignVehicle(null);
                goDrivers();
              }}
              style={styles.addDriverLink}>
              <PartnerText style={styles.assignLink}>Manage drivers</PartnerText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={driverPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDriverPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDriverPickerOpen(false)}>
          <Pressable style={styles.assignSheet} onPress={e => e.stopPropagation()}>
            <PartnerText style={styles.sheetTitle}>Select driver</PartnerText>
            <PartnerText style={styles.assignHint}>
              Choose the fleet driver who will operate this vehicle.
            </PartnerText>
            <ScrollView style={{ maxHeight: 320 }}>
              {drivers.length === 0 ? (
                <PartnerText style={styles.assignHint}>No drivers yet — add one first.</PartnerText>
              ) : (
                drivers.map(driver => {
                  const active = driver.id === assignedDriverId;
                  return (
                    <Pressable
                      key={driver.id}
                      style={styles.driverPick}
                      onPress={() => {
                        setAssignedDriverId(driver.id);
                        setDriverPickerOpen(false);
                      }}>
                      <View style={styles.driverAvatar}>
                        <PartnerText style={styles.driverInitial}>
                          {driver.name.charAt(0).toUpperCase()}
                        </PartnerText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <PartnerText style={styles.driverName}>{driver.name}</PartnerText>
                        <PartnerText style={styles.driverPhone}>{driver.phone}</PartnerText>
                      </View>
                      {active ? <CheckCircle2 size={20} color={SUCCESS_GREEN} strokeWidth={2.2} /> : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
            <Pressable
              onPress={() => {
                setDriverPickerOpen(false);
                goDrivers();
              }}
              style={styles.addDriverLink}>
              <PartnerText style={styles.assignLink}>Manage drivers</PartnerText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </AppScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerPad: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: PAGE_BG,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  title: {
    color: colors.dark,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.extrabold,
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.grey,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
    paddingRight: spacing.sm,
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
  pendingBanner: {
    backgroundColor: colors.goldLight,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#F5D98A',
  },
  pendingText: {
    color: colors.primaryDark,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  formTitle: {
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
    fontSize: typography.sizes.xl + 2,
  },
  formSubtitle: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    marginTop: -spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  typeCard: {
    width: 78,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs + 2,
    paddingHorizontal: 4,
    gap: 4,
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFFBEB',
  },
  typeArt: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeArtActive: {},
  typeCardText: {
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: typography.weights.semibold,
    color: colors.grey,
    textAlign: 'center',
  },
  typeCardTextActive: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
  },
  typeLabel: {
    color: colors.dark,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
    marginBottom: 2,
  },
  formInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: spacing.sm + 2,
  },
  formInfoText: {
    flex: 1,
    color: '#1E40AF',
    fontSize: typography.sizes.xs,
    lineHeight: 16,
  },
  formFooterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  disabled: { opacity: 0.6 },
  statsRow: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  statCard: {
    width: 110,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 2,
  },
  statIcon: {
    width: 34,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs + 2,
  },
  statValue: {
    color: colors.dark,
    fontSize: 20,
    fontWeight: typography.weights.extrabold,
  },
  statLabel: {
    marginTop: 1,
    color: colors.grey,
    fontWeight: typography.weights.semibold,
    fontSize: 11,
  },
  statHint: {
    marginTop: 2,
    color: colors.grey,
    fontSize: 11,
    lineHeight: 14,
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
    flexWrap: 'wrap',
    gap: spacing.sm,
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
    backgroundColor: colors.background,
  },
  filterText: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  empty: {
    alignItems: 'center',
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
  pagination: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  pageMeta: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
  },
  pageControls: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  pageBtn: {
    minWidth: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pageBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  pageBtnTextActive: {
    color: colors.dark,
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
