import { PartnerText, PartnerTextInput } from '../../components/partner/PartnerText';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  BadgeCheck,
  Calendar,
  CheckCircle2,
  ChevronDown,
  FileStack,
  IdCard,
  KeyRound,
  Lock,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Star,
  Truck,
  User,
  Users,
  UserCog,
  XCircle,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import FormField from '../../components/auth/FormField';
import PartnerDocumentUploadList, {
  type PartnerDocumentFieldConfig,
} from '../../components/partner/PartnerDocumentUploadList';
import AppScreenLayout from '../../components/ui/AppScreenLayout';
import { useAppSelector } from '../../redux/hooks';
import { getApiErrorMessage } from '../../services/auth/useAuthMutations';
import {
  uploadVendorDriverDocument,
  type FleetDriver,
} from '../../services/vendor/vendorDriversApi';
import {
  useCreateVendorDriverMutation,
  useRemoveVendorDriverMutation,
  useVendorDriversQuery,
} from '../../services/vendor/useVendorDriversQueries';
import {
  useLinkVendorDriverVehicleMutation,
  useVendorFleetVehiclesQuery,
} from '../../services/vendor/useVendorBookingsQueries';
import { useVendorStatusQuery } from '../../services/vendor/useVendorMutations';
import type { PartnerAccountStackParamList } from '../../types/partnerNavigation';
import { PARTNER_WAITING_ADMIN_APPROVAL } from '../../constants/partnerCopy';
import { colors, radius, shadows, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'VendorDrivers'>;

const PAGE_BG = '#F7F7F5';
const SUCCESS_GREEN = '#22C55E';
const INFO_BLUE = '#2563EB';
const ON_JOB_ORANGE = '#EA580C';
const PAGE_SIZE = 5;

const DRIVER_TYPES = ['Tow Driver', 'Full-Time', 'Part-Time'] as const;

const VENDOR_DRIVER_DOCUMENTS: PartnerDocumentFieldConfig[] = [
  { id: 'driving_license', label: 'Driving License', required: true, Icon: IdCard },
  { id: 'aadhaar', label: 'Aadhaar Card', required: true, Icon: IdCard },
  { id: 'police_verification', label: 'Police Verification', required: true, Icon: BadgeCheck },
  {
    id: 'medical_certificate',
    label: 'Medical Fitness Certificate',
    required: true,
    Icon: FileStack,
  },
];

type StatusFilter = 'all' | 'active' | 'on_job' | 'pending' | 'inactive';
type SortKey = 'newest' | 'name' | 'rating';

function isValidIndianMobile(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}

function normalizeReg(value?: string) {
  return (value ?? '').replace(/\s+/g, '').toUpperCase();
}

function formatPlate(reg?: string) {
  if (!reg) return '';
  const clean = normalizeReg(reg);
  const match = clean.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$/);
  if (!match) return reg.toUpperCase();
  return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone;
}

function driverUiStatus(driver: FleetDriver): {
  key: 'active' | 'on_job' | 'inactive' | 'pending';
  label: string;
  sub: string;
  badgeBg: string;
  badgeText: string;
  dot: string;
} {
  if (driver.isBusy) {
    return {
      key: 'on_job',
      label: 'On job',
      sub: 'En route to job',
      badgeBg: '#FFEDD5',
      badgeText: ON_JOB_ORANGE,
      dot: colors.primary,
    };
  }

  const status = String(driver.status).toUpperCase();
  // A vendor-created driver is created PENDING in production: they cannot claim
  // jobs until an admin approves, so they must not read as "Active".
  if (status === 'PENDING') {
    return {
      key: 'pending',
      label: 'Pending',
      sub: 'Awaiting approval',
      badgeBg: colors.goldLight,
      badgeText: colors.primaryDark,
      dot: colors.primary,
    };
  }
  const blocked = ['INACTIVE', 'SUSPENDED', 'REJECTED'].includes(status);
  if (!driver.isAvailable || blocked) {
    return {
      key: 'inactive',
      label: 'Inactive',
      sub: 'Not in service',
      badgeBg: '#FEE2E2',
      badgeText: colors.error,
      dot: colors.error,
    };
  }

  return {
    key: 'active',
    label: 'Active',
    sub: 'Available',
    badgeBg: '#DCFCE7',
    badgeText: SUCCESS_GREEN,
    dot: SUCCESS_GREEN,
  };
}

function isVerified(driver: FleetDriver) {
  return String(driver.status).toUpperCase() === 'APPROVED';
}

export default function VendorDriversScreen({}: Props) {
  const user = useAppSelector(state => state.auth.user);
  const isVendor = user?.role === 'vendor';
  const { data: vendor, isLoading: vendorLoading } = useVendorStatusQuery(isVendor);
  const isApproved = vendor?.status === 'approved';

  const { data: drivers = [], isLoading, isRefetching, refetch } = useVendorDriversQuery(isVendor);
  const { data: vehicles = [] } = useVendorFleetVehiclesQuery(isVendor, false);
  const createMutation = useCreateVendorDriverMutation();
  const removeMutation = useRemoveVendorDriverMutation();
  const linkDriverMutation = useLinkVendorDriverVehicleMutation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [city, setCity] = useState('Bhubaneswar');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [driverType, setDriverType] = useState<(typeof DRIVER_TYPES)[number]>('Tow Driver');
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [driverDocuments, setDriverDocuments] = useState<
    Array<{ id: string; label: string; uri: string; name: string; mimeType?: string }>
  >([]);
  const [docUploadFailures, setDocUploadFailures] = useState<string[]>([]);
  const [newVehicleReg, setNewVehicleReg] = useState<string | null>(null);
  const [linkTarget, setLinkTarget] = useState<FleetDriver | null>(null);

  const linkableVehicles = vehicles.filter(v => v.status === 'ACTIVE');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);
  const [menuDriver, setMenuDriver] = useState<FleetDriver | null>(null);

  const phoneDigits = phone.replace(/\D/g, '');

  const vehicleByReg = useMemo(() => {
    const map = new Map<string, { model: string; type: string }>();
    for (const vehicle of vehicles) {
      map.set(normalizeReg(vehicle.registrationNo), {
        model: vehicle.model,
        type: vehicle.type,
      });
    }
    return map;
  }, [vehicles]);

  const stats = useMemo(() => {
    let active = 0;
    let onJob = 0;
    let inactive = 0;
    let pending = 0;
    for (const driver of drivers) {
      const status = driverUiStatus(driver).key;
      if (status === 'on_job') onJob += 1;
      else if (status === 'pending') pending += 1;
      else if (status === 'inactive') inactive += 1;
      else active += 1;
    }
    return { total: drivers.length, active, onJob, inactive, pending };
  }, [drivers]);

  const locationOptions = useMemo(() => {
    const set = new Set(drivers.map(d => d.city).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [drivers]);

  const typeOptions = useMemo(() => {
    const set = new Set(drivers.map(d => d.driverType).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [drivers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = drivers.filter(driver => {
      const ui = driverUiStatus(driver);
      if (statusFilter !== 'all' && ui.key !== statusFilter) return false;
      if (locationFilter !== 'all' && driver.city !== locationFilter) return false;
      if (typeFilter !== 'all' && driver.driverType !== typeFilter) return false;
      if (!q) return true;
      return (
        driver.name.toLowerCase().includes(q) ||
        driver.phone.includes(q) ||
        (driver.loginId ?? '').toLowerCase().includes(q) ||
        driver.licenseNo.toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      return b.id.localeCompare(a.id);
    });

    return list;
  }, [drivers, search, statusFilter, locationFilter, typeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const showingFrom = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(currentPage * PAGE_SIZE, filtered.length);

  const validate = () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Enter driver full name';
    if (!isValidIndianMobile(phoneDigits)) {
      next.phone =
        phoneDigits.length === 0
          ? 'Enter mobile number'
          : phoneDigits.length < 10
            ? `Enter ${10 - phoneDigits.length} more digit(s)`
            : 'Mobile must start with 6, 7, 8, or 9';
    }
    if (licenseNo.trim().length < 4) next.licenseNo = 'Enter a valid license number';
    if (!/^[a-zA-Z0-9._-]{4,40}$/.test(loginId.trim())) {
      next.loginId = 'Login ID: 4–40 chars (letters, numbers, . _ -)';
    }
    if (password.length < 6) next.password = 'Password must be at least 6 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onToggleForm = () => {
    if (!isApproved) {
      Alert.alert('Approval required', PARTNER_WAITING_ADMIN_APPROVAL);
      return;
    }
    if (showForm) {
      setShowForm(false);
      setFormStep(1);
      resetForm();
    } else {
      setShowForm(true);
      setFormStep(1);
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setLicenseNo('');
    setCity('Bhubaneswar');
    setLoginId('');
    setPassword('');
    setDriverType('Tow Driver');
    setNewVehicleReg(null);
    setDriverDocuments([]);
    setDocUploadFailures([]);
    setErrors({});
  };

  const submitCreate = async () => {
    if (!isApproved) {
      Alert.alert('Approval required', PARTNER_WAITING_ADMIN_APPROVAL);
      return;
    }
    if (!validate() || Object.values(errors).some(Boolean)) {
      setFormStep(1);
      return;
    }
    const missingRequired = VENDOR_DRIVER_DOCUMENTS.filter(
      doc => doc.required && !driverDocuments.some(d => d.id === doc.id),
    );
    if (missingRequired.length > 0) {
      Alert.alert(
        'Documents missing',
        `Upload required document(s): ${missingRequired.map(doc => doc.label).join(', ')}`,
      );
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        name: name.trim(),
        phone: phoneDigits,
        licenseNo: licenseNo.trim(),
        driverType,
        city: city.trim() || 'Bhubaneswar',
        loginId: loginId.trim(),
        password,
        vehicleRegistration: newVehicleReg ?? undefined,
      });

      const failedDocs: string[] = [];
      for (const doc of driverDocuments) {
        try {
          await uploadVendorDriverDocument(created.id, doc.id, {
            uri: doc.uri,
            name: doc.name,
            mimeType: doc.mimeType ?? 'image/jpeg',
          });
        } catch {
          // Keep the driver; the failed upload can be re-attempted.
          failedDocs.push(doc.label);
        }
      }
      setDocUploadFailures(failedDocs);

      Alert.alert(
        failedDocs.length ? 'Driver added — some documents failed' : 'Vendor driver added',
        failedDocs.length
          ? `${name.trim()} was added, but ${failedDocs.join(', ')} could not be uploaded and can be retried later.`
          : `${name.trim()} can sign in with Login ID “${loginId.trim()}”. Share the password securely. Documents stay pending until admin approves.`,
      );
      resetForm();
      setShowForm(false);
      setFormStep(1);
      setPage(1);
    } catch (error) {
      Alert.alert('Could not add', getApiErrorMessage(error, 'Add driver failed'));
    }
  };

  const onLinkVehicle = async (reg: string | null) => {
    if (!linkTarget) return;
    try {
      await linkDriverMutation.mutateAsync({
        driverId: linkTarget.id,
        vehicleRegistration: reg,
      });
      setLinkTarget(null);
      await refetch();
      Alert.alert(
        reg ? 'Vehicle linked' : 'Vehicle unlinked',
        reg ? `Linked to ${reg}.` : `${linkTarget.name} is no longer linked to a vehicle.`,
      );
    } catch (error) {
      Alert.alert('Link failed', getApiErrorMessage(error, 'Please try again'));
    }
  };

  const onRemove = (driver: FleetDriver) => {
    setMenuDriver(null);
    Alert.alert('Remove driver?', `Unlink ${driver.name} from your vendor team?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void removeMutation.mutateAsync(driver.id).catch(error => {
            Alert.alert('Remove failed', getApiErrorMessage(error, 'Could not remove'));
          });
        },
      },
    ]);
  };

  const cycleStatusFilter = () => {
    const order: StatusFilter[] = ['all', 'active', 'on_job', 'pending', 'inactive'];
    setStatusFilter(order[(order.indexOf(statusFilter) + 1) % order.length] ?? 'all');
    setPage(1);
  };

  const cycleLocationFilter = () => {
    const idx = locationOptions.indexOf(locationFilter);
    setLocationFilter(locationOptions[(idx + 1) % locationOptions.length] ?? 'all');
    setPage(1);
  };

  const cycleTypeFilter = () => {
    const idx = typeOptions.indexOf(typeFilter);
    setTypeFilter(typeOptions[(idx + 1) % typeOptions.length] ?? 'all');
    setPage(1);
  };

  const cycleSort = () => {
    const order: SortKey[] = ['newest', 'name', 'rating'];
    setSortBy(order[(order.indexOf(sortBy) + 1) % order.length] ?? 'newest');
    setPage(1);
  };

  const statusFilterLabel =
    statusFilter === 'all'
      ? 'All status'
      : statusFilter === 'active'
        ? 'Active'
        : statusFilter === 'on_job'
          ? 'On job'
          : statusFilter === 'pending'
            ? 'Pending'
            : 'Inactive';

  const sortLabel =
    sortBy === 'newest' ? 'Newest' : sortBy === 'name' ? 'Name' : 'Rating';

  if (!isVendor) {
    return (
      <AppScreenLayout
        backgroundColor={PAGE_BG}
        scrollable={false}
        header={
          <View style={styles.headerPad}>
            <PartnerText style={styles.title}>Vendor drivers</PartnerText>
          </View>
        }>
        <View style={styles.pendingBanner}>
          <PartnerText style={styles.pendingText}>
            Vendor driver management is available after signing in as a vendor.
          </PartnerText>
        </View>
      </AppScreenLayout>
    );
  }

  return (
    <AppScreenLayout
      backgroundColor={PAGE_BG}
      keyboardAvoiding
      scrollable
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      header={
        <View style={styles.headerPad}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <PartnerText style={styles.title}>Vendor drivers</PartnerText>
              <PartnerText style={styles.subtitle}>
                Manage your vendor drivers and keep your team ready for every call.
              </PartnerText>
            </View>
            <Pressable
              onPress={onToggleForm}
              style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}>
              <Plus size={16} color={colors.dark} strokeWidth={2.6} />
              <PartnerText style={styles.addLabel}>{showForm ? 'Close' : 'Add Driver'}</PartnerText>
            </Pressable>
          </View>
        </View>
      }>
      <View style={styles.content}>
        {!vendorLoading && !isApproved ? (
          <View style={styles.pendingBanner}>
            <PartnerText style={styles.pendingText}>{PARTNER_WAITING_ADMIN_APPROVAL}</PartnerText>
          </View>
        ) : null}

        {showForm && isApproved ? (
          <View style={styles.formCard}>
            <View style={styles.stepHeaderRow}>
              <PartnerText style={styles.formTitle}>
                {formStep === 1 ? 'Driver details & credentials' : 'Documents & vehicle'}
              </PartnerText>
              <PartnerText style={styles.stepPill}>Step {formStep} of 2</PartnerText>
            </View>

            {formStep === 1 ? (
              <>
                <FormField
                  variant="outlined"
                  label="Full name"
                  required
                  Icon={User}
                  value={name}
                  onChangeText={text => {
                    setName(text);
                    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                  }}
                  placeholder="e.g. Rakesh Behera"
                  error={errors.name}
                />
                <FormField
                  variant="outlined"
                  label="Mobile"
                  required
                  Icon={Phone}
                  value={phone}
                  onChangeText={text => {
                    setPhone(text.replace(/\D/g, '').slice(0, 10));
                    if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                  }}
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  error={errors.phone}
                />
                <FormField
                  variant="outlined"
                  label="License no"
                  required
                  Icon={IdCard}
                  value={licenseNo}
                  onChangeText={text => {
                    setLicenseNo(text);
                    if (errors.licenseNo) setErrors(prev => ({ ...prev, licenseNo: '' }));
                  }}
                  placeholder="e.g. OD1420200012345"
                  autoCapitalize="characters"
                  error={errors.licenseNo}
                />
                <FormField
                  variant="outlined"
                  label="Location"
                  optional
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g. Bhubaneswar"
                />
                <FormField
                  variant="outlined"
                  label="Login ID"
                  required
                  Icon={KeyRound}
                  value={loginId}
                  onChangeText={text => {
                    setLoginId(text.replace(/\s/g, ''));
                    if (errors.loginId) setErrors(prev => ({ ...prev, loginId: '' }));
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="e.g. driver.odisha01"
                  error={errors.loginId}
                />
                <FormField
                  variant="outlined"
                  label="Password"
                  required
                  Icon={Lock}
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                  }}
                  secureTextEntry
                  placeholder="Min. 6 characters"
                  error={errors.password}
                />
                <PartnerText style={styles.helperText}>
                  Share this Login ID and password with the driver so they can sign in as a Vendor
                  driver.
                </PartnerText>

                <PartnerText style={styles.typeLabel}>Driver type</PartnerText>
                <View style={styles.typeRow}>
                  {DRIVER_TYPES.map(type => (
                    <Pressable
                      key={type}
                      onPress={() => setDriverType(type)}
                      style={[styles.typeChip, driverType === type && styles.typeChipActive]}>
                      <PartnerText
                        style={[
                          styles.typeChipText,
                          driverType === type && styles.typeChipTextActive,
                        ]}>
                        {type}
                      </PartnerText>
                    </Pressable>
                  ))}
                </View>

                {(() => {
                  const stepErrors = Object.values(errors).filter(Boolean);
                  return stepErrors.length > 0 ? (
                    <View style={styles.errorBanner}>
                      <PartnerText style={styles.errorBannerText}>
                        {stepErrors.length > 1
                          ? `${stepErrors[0]} (+${stepErrors.length - 1} more field(s) need attention)`
                          : stepErrors[0]}
                      </PartnerText>
                    </View>
                  ) : null;
                })()}

                <Pressable
                  onPress={() => {
                    if (!validate()) return;
                    setErrors({});
                    setFormStep(2);
                  }}
                  style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}>
                  <PartnerText style={styles.saveLabel}>Continue to documents</PartnerText>
                </Pressable>
              </>
            ) : (
              <>
                <PartnerText style={styles.sectionTitle}>Fleet vehicle (optional)</PartnerText>
                <View style={styles.typeRow}>
                  {linkableVehicles.map(vehicle => (
                    <Pressable
                      key={vehicle.id}
                      onPress={() => setNewVehicleReg(vehicle.registrationNo)}
                      style={[
                        styles.typeChip,
                        newVehicleReg === vehicle.registrationNo && styles.typeChipActive,
                      ]}>
                      <PartnerText
                        style={[
                          styles.typeChipText,
                          newVehicleReg === vehicle.registrationNo && styles.typeChipTextActive,
                        ]}>
                        {formatPlate(vehicle.registrationNo)}
                      </PartnerText>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={() => setNewVehicleReg(null)}
                    style={[styles.typeChip, !newVehicleReg && styles.typeChipActive]}>
                    <PartnerText style={[styles.typeChipText, !newVehicleReg && styles.typeChipTextActive]}>
                      No vehicle
                    </PartnerText>
                  </Pressable>
                </View>
                {linkableVehicles.length === 0 ? (
                  <PartnerText style={styles.helperText}>
                    You have no active fleet vehicles — you can link one later from this driver's
                    menu.
                  </PartnerText>
                ) : null}

                <PartnerText style={styles.sectionTitle}>Documents</PartnerText>
                <PartnerText style={styles.helperText}>
                  Upload documents. Status stays pending until admin approves.
                </PartnerText>
                <PartnerDocumentUploadList
                  documents={VENDOR_DRIVER_DOCUMENTS}
                  uploadedIds={driverDocuments.map(d => d.id)}
                  onUpload={(id, uri, fileName, mimeType) => {
                    const label = VENDOR_DRIVER_DOCUMENTS.find(doc => doc.id === id)?.label ?? id;
                    const entry = { id, label, uri, name: fileName, mimeType };
                    setDriverDocuments(prev => [...prev.filter(d => d.id !== id), entry]);
                    setDocUploadFailures(prev => prev.filter(f => f !== label));
                  }}
                />

                <Pressable
                  onPress={() => setFormStep(1)}
                  hitSlop={6}
                  style={styles.backStepLink}>
                  <PartnerText style={styles.backStepText}>← Back to details</PartnerText>
                </Pressable>

                {(() => {
                  const missingRequired = VENDOR_DRIVER_DOCUMENTS.filter(
                    doc => doc.required && !driverDocuments.some(d => d.id === doc.id),
                  ).map(doc => doc.label);
                  if (missingRequired.length === 0) return null;
                  return (
                    <View style={styles.errorBanner}>
                      <PartnerText style={styles.errorBannerText}>
                        {`Upload required document${missingRequired.length > 1 ? 's' : ''}: ${missingRequired.join(', ')}`}
                      </PartnerText>
                    </View>
                  );
                })()}

                <Pressable
                  onPress={() => void submitCreate()}
                  disabled={createMutation.isPending}
                  style={({ pressed }) => [
                    styles.saveBtn,
                    pressed && styles.pressed,
                    createMutation.isPending && styles.disabled,
                  ]}>
                  <PartnerText style={styles.saveLabel}>
                    {createMutation.isPending ? 'Saving…' : 'Save vendor driver'}
                  </PartnerText>
                </Pressable>
              </>
            )}
          </View>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
              <Users size={16} color={INFO_BLUE} strokeWidth={2.2} />
            </View>
            <PartnerText style={styles.statValue}>{String(stats.total)}</PartnerText>
            <PartnerText style={styles.statLabel}>Total drivers</PartnerText>
            <PartnerText style={styles.statHint}>Across all locations</PartnerText>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#DCFCE7' }]}>
              <CheckCircle2 size={16} color={SUCCESS_GREEN} strokeWidth={2.2} />
            </View>
            <PartnerText style={styles.statValue}>{String(stats.active)}</PartnerText>
            <PartnerText style={styles.statLabel}>Active</PartnerText>
            <PartnerText style={styles.statHint}>On duty and available</PartnerText>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.goldLight }]}>
              <UserCog size={16} color={colors.primaryDark} strokeWidth={2.2} />
            </View>
            <PartnerText style={styles.statValue}>{String(stats.onJob)}</PartnerText>
            <PartnerText style={styles.statLabel}>On job</PartnerText>
            <PartnerText style={styles.statHint}>Currently assigned</PartnerText>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.goldLight }]}>
              <Users size={16} color={colors.primaryDark} strokeWidth={2.2} />
            </View>
            <PartnerText style={styles.statValue}>{String(stats.pending)}</PartnerText>
            <PartnerText style={styles.statLabel}>Pending</PartnerText>
            <PartnerText style={styles.statHint}>Awaiting admin approval</PartnerText>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
              <XCircle size={16} color={colors.error} strokeWidth={2.2} />
            </View>
            <PartnerText style={styles.statValue}>{String(stats.inactive)}</PartnerText>
            <PartnerText style={styles.statLabel}>Inactive</PartnerText>
            <PartnerText style={styles.statHint}>Not in service</PartnerText>
          </View>
        </ScrollView>

        <View style={styles.searchBox}>
          <Search size={16} color={colors.grey} strokeWidth={2.2} />
          <PartnerTextInput
            value={search}
            onChangeText={text => {
              setSearch(text);
              setPage(1);
            }}
            placeholder="Search by name or phone"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.filterRow}>
          <Pressable onPress={cycleStatusFilter} style={styles.filterPill}>
            <PartnerText style={styles.filterText}>{statusFilterLabel}</PartnerText>
            <ChevronDown size={14} color={colors.grey} strokeWidth={2.4} />
          </Pressable>
          <Pressable onPress={cycleLocationFilter} style={styles.filterPill}>
            <PartnerText style={styles.filterText}>
              {locationFilter === 'all' ? 'All locations' : locationFilter}
            </PartnerText>
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

        {isLoading || vendorLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : pageItems.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.iconWrap}>
              <Users size={36} color={colors.primary} strokeWidth={2} />
            </View>
            <PartnerText style={styles.emptyTitle}>No vendor drivers yet</PartnerText>
            <PartnerText style={styles.emptySubtitle}>
              Add drivers to your vendor team so you can assign them to vehicles and jobs.
            </PartnerText>
          </View>
        ) : (
          pageItems.map(driver => {
            const ui = driverUiStatus(driver);
            const vehicle = vehicleByReg.get(normalizeReg(driver.vehicleRegistration));
            const plate = formatPlate(driver.vehicleRegistration);
            return (
              <View key={driver.id} style={styles.driverCard}>
                <View style={styles.driverTop}>
                  <View style={styles.avatarWrap}>
                    <View style={styles.avatar}>
                      <PartnerText style={styles.avatarText}>
                        {driver.name.charAt(0).toUpperCase()}
                      </PartnerText>
                    </View>
                    <View style={[styles.statusDot, { backgroundColor: ui.dot }]} />
                  </View>

                  <View style={styles.driverMain}>
                    <View style={styles.nameRow}>
                      <PartnerText style={styles.driverName} numberOfLines={1}>
                        {driver.name}
                      </PartnerText>
                      {isVerified(driver) ? (
                        <BadgeCheck size={16} color={INFO_BLUE} strokeWidth={2.2} />
                      ) : null}
                    </View>
                    <View style={styles.metaRow}>
                      <Phone size={12} color={colors.grey} strokeWidth={2.2} />
                      <PartnerText style={styles.metaText}>{formatPhone(driver.phone)}</PartnerText>
                    </View>
                    <PartnerText style={styles.dlText}>DL: {driver.licenseNo || '—'}</PartnerText>
                  </View>

                  <Pressable
                    onPress={() => setMenuDriver(driver)}
                    hitSlop={10}
                    style={styles.menuBtn}>
                    <MoreVertical size={18} color={colors.grey} strokeWidth={2.2} />
                  </Pressable>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <Star size={13} color={colors.primary} strokeWidth={2.2} fill={colors.primary} />
                    <PartnerText style={styles.metricText}>
                      {(driver.rating || 0).toFixed(1)} Rating
                    </PartnerText>
                  </View>
                  <View style={styles.metric}>
                    <PartnerText style={styles.metricText}>{driver.driverType}</PartnerText>
                  </View>
                  {driver.loginId ? (
                    <View style={styles.metric}>
                      <KeyRound size={12} color={colors.grey} strokeWidth={2.2} />
                      <PartnerText style={styles.metricText}>{driver.loginId}</PartnerText>
                    </View>
                  ) : null}
                  {driver.city ? (
                    <View style={styles.metric}>
                      <Calendar size={12} color={colors.grey} strokeWidth={2.2} />
                      <PartnerText style={styles.metricText}>{driver.city}</PartnerText>
                    </View>
                  ) : null}
                </View>

                <View style={styles.driverBottom}>
                  <View style={styles.vehicleBlock}>
                    <Truck size={16} color={colors.grey} strokeWidth={2.2} />
                    <View style={{ flex: 1 }}>
                      {plate ? (
                        <>
                          <PartnerText style={styles.vehiclePlate}>{plate}</PartnerText>
                          <PartnerText style={styles.vehicleModel}>
                            {vehicle
                              ? `${vehicle.model} · ${vehicle.type}`
                              : driver.driverType}
                          </PartnerText>
                        </>
                      ) : (
                        <PartnerText style={styles.vehicleEmpty}>— Not assigned</PartnerText>
                      )}
                    </View>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: ui.badgeBg }]}>
                    <PartnerText style={[styles.statusLabel, { color: ui.badgeText }]}>{ui.label}</PartnerText>
                    <PartnerText style={styles.statusSub}>{ui.sub}</PartnerText>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {filtered.length > 0 ? (
          <View style={styles.pagination}>
            <PartnerText style={styles.pageMeta}>
              Showing {showingFrom} to {showingTo} of {filtered.length} drivers
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
                style={[styles.pageBtn, currentPage >= totalPages && styles.pageBtnDisabled]}>
                <PartnerText style={styles.pageBtnText}>›</PartnerText>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <Modal
        visible={Boolean(menuDriver)}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuDriver(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMenuDriver(null)}>
          <View style={styles.sheet}>
            <PartnerText style={styles.sheetTitle}>{menuDriver?.name ?? 'Driver'}</PartnerText>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                const driver = menuDriver;
                setMenuDriver(null);
                if (driver) {
                  Alert.alert(
                    driver.name,
                    `${formatPhone(driver.phone)}\nDL: ${driver.licenseNo || '—'}\nStatus: ${driverUiStatus(driver).label}`,
                  );
                }
              }}>
              <PartnerText style={styles.sheetItemText}>View details</PartnerText>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                setLinkTarget(menuDriver);
                setMenuDriver(null);
              }}
              disabled={!menuDriver}>
              <PartnerText style={[styles.sheetItemText, { color: colors.primaryDark }]}>
                Assign vehicle
              </PartnerText>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() => menuDriver && onRemove(menuDriver)}>
              <PartnerText style={[styles.sheetItemText, { color: colors.error }]}>
                Unlink driver
              </PartnerText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={Boolean(linkTarget)}
        transparent
        animationType="slide"
        onRequestClose={() => setLinkTarget(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setLinkTarget(null)}>
          <Pressable style={styles.linkSheet} onPress={e => e.stopPropagation()}>
            <PartnerText style={styles.sheetTitle}>
              Link vehicle{linkTarget ? ` · ${linkTarget.name}` : ''}
            </PartnerText>
            <PartnerText style={styles.assignHint}>
              Choose one of your active fleet vehicles for this driver.
            </PartnerText>
            <ScrollView style={{ maxHeight: 320 }}>
              {linkableVehicles.map(vehicle => (
                <Pressable
                  key={vehicle.id}
                  style={styles.driverPick}
                  onPress={() => void onLinkVehicle(vehicle.registrationNo)}
                  disabled={linkDriverMutation.isPending}>
                  <Truck size={16} color={colors.primaryDark} strokeWidth={2.2} />
                  <View style={{ flex: 1 }}>
                    <PartnerText style={styles.vehiclePlate}>{formatPlate(vehicle.registrationNo)}</PartnerText>
                    <PartnerText style={styles.vehicleModel}>
                      {vehicle.model} · {vehicle.type}
                    </PartnerText>
                  </View>
                  <PartnerText style={styles.assignLink}>Link</PartnerText>
                </Pressable>
              ))}
              {linkableVehicles.length === 0 ? (
                <View style={{ paddingVertical: spacing.md }}>
                  <PartnerText style={styles.helperText}>
                    No active fleet vehicles. Add and activate a vehicle first.
                  </PartnerText>
                </View>
              ) : null}
            </ScrollView>
            {linkTarget?.vehicleRegistration ? (
              <Pressable
                onPress={() => void onLinkVehicle(null)}
                disabled={linkDriverMutation.isPending}
                style={styles.addDriverLink}>
                <PartnerText style={[styles.assignLink, { color: colors.error }]}>
                  Unlink from {formatPlate(linkTarget.vehicleRegistration)}
                </PartnerText>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </AppScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerPad: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addLabel: {
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
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  formTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.lg,
    marginBottom: spacing.xs,
  },
  typeLabel: {
    color: colors.dark,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.lightGrey,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: {
    backgroundColor: colors.goldLight,
    borderColor: colors.primary,
  },
  typeChipText: {
    color: colors.dark,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.xs,
  },
  typeChipTextActive: { color: colors.primaryDark },
  sectionTitle: {
    color: colors.dark,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
    marginTop: spacing.md,
  },
  helperText: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    lineHeight: typography.lineHeights.relaxed,
  },
  saveBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  errorBannerText: {
    color: '#B91C1C',
    fontSize: typography.sizes.xs,
    lineHeight: typography.lineHeights.relaxed,
    fontWeight: typography.weights.semibold,
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
    width: 140,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.card,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    color: colors.dark,
    fontSize: 22,
    fontWeight: typography.weights.extrabold,
  },
  statLabel: {
    marginTop: 2,
    color: colors.dark,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  statHint: {
    marginTop: 2,
    color: colors.grey,
    fontSize: 11,
    lineHeight: 14,
  },
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
  driverCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  driverTop: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  avatarWrap: {
    width: 52,
    height: 52,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.lg,
  },
  statusDot: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.background,
  },
  driverMain: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  driverName: {
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
    fontSize: typography.sizes.md,
    flexShrink: 1,
  },
  metaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
  },
  dlText: {
    marginTop: 2,
    color: colors.grey,
    fontSize: typography.sizes.xs,
  },
  menuBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    color: colors.dark,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  driverBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  vehicleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  vehiclePlate: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  vehicleModel: {
    marginTop: 1,
    color: colors.grey,
    fontSize: typography.sizes.xs,
  },
  vehicleEmpty: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'flex-end',
    minWidth: 88,
  },
  statusLabel: {
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  statusSub: {
    marginTop: 2,
    color: colors.grey,
    fontSize: 10,
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
  sheetTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.lg,
    marginBottom: spacing.sm,
  },
  linkSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  stepPill: {
    color: colors.primaryDark,
    backgroundColor: colors.goldLight,
    fontSize: 10,
    fontWeight: typography.weights.bold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  backStepLink: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  backStepText: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
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
  assignLink: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  addDriverLink: {
    alignItems: 'center',
    paddingTop: spacing.lg,
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
