import { PartnerText, PartnerTextInput } from '../../components/partner/PartnerText';
import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  ArrowLeft,
  BadgeCheck,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  FileStack,
  IdCard,
  KeyRound,
  Lock,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Truck,
  User,
  Users,
  UserCog,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FormField from '../../components/auth/FormField';
import PartnerDocumentUploadList, {
  type PartnerDocumentFieldConfig,
  type PartnerDocumentUploadState,
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
  useResetVendorDriverPasswordMutation,
  useVendorDriversQuery,
} from '../../services/vendor/useVendorDriversQueries';
import {
  useLinkVendorDriverVehicleMutation,
  useVendorFleetVehiclesQuery,
} from '../../services/vendor/useVendorBookingsQueries';
import { useVendorStatusQuery } from '../../services/vendor/useVendorMutations';
import type { PartnerAccountStackParamList } from '../../types/partnerNavigation';
import { PARTNER_WAITING_ADMIN_APPROVAL } from '../../constants/partnerCopy';
import { colors, radius, spacing, typography } from '../../theme';

type Props = { navigation?: any; route?: any };

const PAGE_BG = '#FFFFFF';
const SUCCESS_GREEN = '#22C55E';
const INFO_BLUE = '#2563EB';

const DRIVER_TYPES = ['Tow Driver', 'Full-Time', 'Part-Time'] as const;

const VENDOR_DRIVER_DOCUMENTS: PartnerDocumentFieldConfig[] = [
  { id: 'driving_license', label: 'Driving License', required: true, Icon: IdCard },
  {
    id: 'government_id',
    label: 'Government ID (Aadhaar / PAN)',
    required: true,
    Icon: IdCard,
    alternatives: [{ id: 'aadhaar', label: 'Aadhaar Card' }, { id: 'pan', label: 'PAN Card' }],
  },
  { id: 'police_verification', label: 'Police Verification', required: false, Icon: BadgeCheck },
  {
    id: 'medical_certificate',
    label: 'Medical Fitness Certificate',
    required: false,
    Icon: FileStack,
  },
];
const REQUIRED_DRIVER_DOCUMENTS = VENDOR_DRIVER_DOCUMENTS.filter(document => document.required);
const OPTIONAL_DRIVER_DOCUMENTS = VENDOR_DRIVER_DOCUMENTS.filter(document => !document.required);

function documentLabelFor(id: string) {
  return VENDOR_DRIVER_DOCUMENTS.find(document => document.id === id)?.label ??
    VENDOR_DRIVER_DOCUMENTS.flatMap(document => document.alternatives ?? []).find(document => document.id === id)?.label ?? id;
}

type StatusFilter = 'all' | 'active' | 'on_job' | 'pending' | 'inactive';

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
      badgeBg: '#E8F1FF',
      badgeText: INFO_BLUE,
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
    label: 'Available',
    sub: 'Available',
    badgeBg: '#DCFCE7',
    badgeText: SUCCESS_GREEN,
    dot: SUCCESS_GREEN,
  };
}

export default function VendorDriversScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = useAppSelector(state => state.auth.user);
  const isVendor = user?.role === 'vendor';
  const { data: vendor, isLoading: vendorLoading } = useVendorStatusQuery(isVendor);
  const isApproved = vendor?.status === 'approved';

  const { data: drivers = [], isLoading, isRefetching, refetch } = useVendorDriversQuery(isVendor);
  const { data: vehicles = [] } = useVendorFleetVehiclesQuery(isVendor, false);
  const createMutation = useCreateVendorDriverMutation();
  const removeMutation = useRemoveVendorDriverMutation();
  const resetPasswordMutation = useResetVendorDriverPasswordMutation();
  const linkDriverMutation = useLinkVendorDriverVehicleMutation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [city, setCity] = useState('Bhubaneswar');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [driverType, setDriverType] = useState<(typeof DRIVER_TYPES)[number]>('Tow Driver');
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showVehicleOptions, setShowVehicleOptions] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [driverDocuments, setDriverDocuments] = useState<
    Array<{ id: string; label: string; uri: string; name: string; mimeType?: string }>
  >([]);
  const [docUploadFailures, setDocUploadFailures] = useState<string[]>([]);
  const [createdDriverId, setCreatedDriverId] = useState<string | null>(null);
  const [isSavingDriver, setIsSavingDriver] = useState(false);
  const [documentUploadStates, setDocumentUploadStates] = useState<Record<string, PartnerDocumentUploadState>>({});
  const driverDetailsLocked = isSavingDriver || createdDriverId !== null;
  const savingDriverRef = useRef(false);
  const [newVehicleReg, setNewVehicleReg] = useState<string | null>(null);
  const [linkTarget, setLinkTarget] = useState<FleetDriver | null>(null);

  const linkableVehicles = vehicles.filter(v => v.status === 'ACTIVE');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [menuDriver, setMenuDriver] = useState<FleetDriver | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<FleetDriver | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const phoneDigits = phone.replace(/\D/g, '');

  const selectDocument = (id: string, uri: string, fileName: string, mimeType?: string) => {
    const group = VENDOR_DRIVER_DOCUMENTS.find(document => document.id === id || document.alternatives?.some(option => option.id === id));
    const replacedIds = [id, ...(group?.alternatives?.map(option => option.id) ?? [])];
    const label = documentLabelFor(id);
    setDriverDocuments(previous => [...previous.filter(document => !replacedIds.includes(document.id)), { id, label, uri, name: fileName, mimeType }]);
    setDocumentUploadStates(previous => Object.fromEntries(Object.entries(previous).filter(([key]) => !replacedIds.includes(key))));
    setDocUploadFailures(previous => previous.filter(failed => !replacedIds.some(key => documentLabelFor(key) === failed)));
  };

  const generateLoginId = () => {
    const namePart = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.|\.$/g, '')
      .slice(0, 18);
    const cityPart = city.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'fleet';
    setLoginId(`${namePart || 'driver'}.${cityPart}${Math.floor(10 + Math.random() * 90)}`);
    setErrors(prev => ({ ...prev, loginId: '' }));
  };

  const continueToDocuments = () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Enter driver full name';
    if (!isValidIndianMobile(phoneDigits)) next.phone = 'Enter a valid 10-digit mobile';
    if (licenseNo.trim().length < 4) next.licenseNo = 'Enter a valid license number';
    if (!/^[a-zA-Z0-9._-]{4,40}$/.test(loginId.trim())) {
      next.loginId = 'Login ID: 4�40 chars (letters, numbers, . _ -)';
    }
    if (password.length < 6) next.password = 'Password must be at least 6 characters';
    setErrors(next);
    if (Object.keys(next).length === 0) {
      Keyboard.dismiss();
      setFormStep(2);
    }
  };

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = drivers.filter(driver => {
      const ui = driverUiStatus(driver);
      if (statusFilter !== 'all' && ui.key !== statusFilter) return false;
      if (!q) return true;
      return (
        driver.name.toLowerCase().includes(q) ||
        driver.phone.includes(q) ||
        normalizeReg(driver.vehicleRegistration).toLowerCase().includes(q.replace(/\s/g, '')) ||
        (driver.loginId ?? '').toLowerCase().includes(q) ||
        driver.licenseNo.toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => b.id.localeCompare(a.id));

    return list;
  }, [drivers, search, statusFilter]);

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
      next.loginId = 'Login ID: 4�40 chars (letters, numbers, . _ -)';
    }
    if (password.length < 6) next.password = 'Password must be at least 6 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onToggleForm = () => {
    if (savingDriverRef.current) return;
    if (!isApproved) {
      Alert.alert('Approval required', PARTNER_WAITING_ADMIN_APPROVAL);
      return;
    }
    if (showForm) {
      const leaveForm = () => {
        setShowForm(false);
        navigation.setParams({ fullScreen: false });
        setFormStep(1);
        resetForm();
      };
      if (createdDriverId && docUploadFailures.length) {
        Alert.alert('Leave unfinished uploads?', 'The driver account is already saved, but some documents have not uploaded.', [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', onPress: leaveForm },
        ]);
      } else leaveForm();
    } else {
      setShowForm(true);
      navigation.setParams({ fullScreen: true });
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
    setDocumentUploadStates({});
    setCreatedDriverId(null);
    setShowPassword(false);
    setShowVehicleOptions(false);
    setErrors({});
  };

  const submitCreate = async () => {
    if (savingDriverRef.current) return;
    if (!isApproved) {
      Alert.alert('Approval required', PARTNER_WAITING_ADMIN_APPROVAL);
      return;
    }
    if (!validate()) return;
    const missingDocuments = REQUIRED_DRIVER_DOCUMENTS.filter(
      document => !driverDocuments.some(file =>
        file.id === document.id || document.alternatives?.some(option => option.id === file.id),
      ),
    );
    if (missingDocuments.length) {
      Alert.alert(
        'Required documents missing',
        `Upload ${missingDocuments.map(document => document.label).join(' and ')} to continue.`,
      );
      return;
    }

    savingDriverRef.current = true;
    setIsSavingDriver(true);
    try {
      const created = createdDriverId
        ? { id: createdDriverId }
        : await createMutation.mutateAsync({
            name: name.trim(),
            phone: phoneDigits,
            licenseNo: licenseNo.trim(),
            driverType,
            city: city.trim() || 'Bhubaneswar',
            loginId: loginId.trim(),
            password,
            vehicleRegistration: newVehicleReg ?? undefined,
          });
      if (!createdDriverId) setCreatedDriverId(created.id);

      const failedDocs: string[] = [];
      for (const doc of driverDocuments) {
        if (documentUploadStates[doc.id]?.status === 'uploaded') continue;
        setDocumentUploadStates(previous => ({ ...previous, [doc.id]: { status: 'uploading' } }));
        try {
          await uploadVendorDriverDocument(created.id, doc.id, {
            uri: doc.uri,
            name: doc.name,
            mimeType: doc.mimeType ?? 'image/jpeg',
          }, (loaded, total) => {
            setDocumentUploadStates(previous => ({
              ...previous,
              [doc.id]: { status: 'uploading', progress: total && total > 0 ? Math.min(100, Math.round(loaded * 100 / total)) : undefined },
            }));
          });
          setDocumentUploadStates(previous => ({ ...previous, [doc.id]: { status: 'uploaded', progress: 100 } }));
        } catch {
          // Keep the driver; the failed upload can be re-attempted.
          failedDocs.push(doc.label);
          setDocumentUploadStates(previous => ({ ...previous, [doc.id]: { status: 'error' } }));
        }
      }
      setDocUploadFailures(failedDocs);

      const failedRequiredDocs = REQUIRED_DRIVER_DOCUMENTS.filter(document => {
        const selectedFiles = driverDocuments.filter(file =>
          file.id === document.id || document.alternatives?.some(option => option.id === file.id),
        );
        return selectedFiles.length > 0 && selectedFiles.every(file => failedDocs.includes(file.label));
      });
      if (failedRequiredDocs.length) {
        Alert.alert(
          'Required upload failed',
          `${failedRequiredDocs.map(document => document.label).join(', ')} could not be uploaded. Your driver is pending verification. Tap Retry uploads to finish.`,
        );
        return;
      }

      if (failedDocs.length) {
        Alert.alert('Uploads incomplete', 'The driver account is saved. Retry the failed document uploads to finish.');
        return;
      }

      Alert.alert(
        failedDocs.length ? 'Driver added � some documents failed' : 'Vendor driver added',
        failedDocs.length
          ? `${name.trim()} was added, but ${failedDocs.join(', ')} could not be uploaded and can be retried later.`
          : `${name.trim()} can sign in with Login ID �${loginId.trim()}�. Share the password securely. Documents stay pending until admin approves.`,
      );
      resetForm();
      setShowForm(false);
      navigation.setParams({ fullScreen: false });
      setFormStep(1);
    } catch (error) {
      Alert.alert('Could not add', getApiErrorMessage(error, 'Add driver failed'));
    } finally {
      savingDriverRef.current = false;
      setIsSavingDriver(false);
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

  const onResetPassword = (driver: FleetDriver) => {
    setMenuDriver(null);
    setNewPassword('');
    setPasswordTarget(driver);
  };

  const submitResetPassword = () => {
    const driver = passwordTarget;
    if (!driver) return;
    const trimmed = newPassword.trim();
    if (trimmed.length < 6) {
      Alert.alert('Too short', 'Password must be at least 6 characters.');
      return;
    }
    void resetPasswordMutation
      .mutateAsync({ driverId: driver.id, password: trimmed })
      .then(() => {
        setPasswordTarget(null);
        Alert.alert(
          'Password updated',
          'Share the new password securely with ' + driver.name + '. They can sign in with the same Login ID.',
        );
      })
      .catch(error => {
        Alert.alert('Reset failed', getApiErrorMessage(error, 'Could not reset password'));
      });
  };

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
      horizontalPadding={12}
      keyboardAvoiding={showForm}
      keyboardDismissMode="on-drag"
      scrollable
      footer={showForm ? (
        <View style={[styles.formFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            testID="vendorDriverBack"
            onPress={() => {
              Keyboard.dismiss();
              if (formStep === 2) setFormStep(1);
              else onToggleForm();
            }}
            disabled={isSavingDriver}
            style={styles.cancelButton}>
            <PartnerText style={styles.cancelLabel}>Back</PartnerText>
          </Pressable>
          <Pressable
            testID={formStep === 1 ? 'vendorDriverContinue' : 'vendorDriverSave'}
            onPress={formStep === 1 ? continueToDocuments : () => void submitCreate()}
            disabled={isSavingDriver}
            style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed, isSavingDriver && styles.disabled]}>
            {isSavingDriver ? (
              <ActivityIndicator size="small" color={colors.dark} />
            ) : (
              <PartnerText style={styles.saveLabel}>
                {formStep === 1 ? 'Continue to documents' : createdDriverId ? 'Retry uploads' : 'Save driver'}
              </PartnerText>
            )}
          </Pressable>
        </View>
      ) : null}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      header={
        <View style={styles.headerPad}>
          <View style={styles.titleRow}>
            {showForm || navigation?.canGoBack?.() ? (
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  if (showForm && formStep === 2) setFormStep(1);
                  else if (showForm) onToggleForm();
                  else if (navigation?.canGoBack?.()) navigation.goBack();
                }}
                disabled={isSavingDriver}
                hitSlop={10}
                style={styles.formBackButton}
                accessibilityRole="button"
                accessibilityLabel={showForm && formStep === 2 ? 'Back to driver details' : showForm ? 'Back to drivers' : 'Back'}>
                <ArrowLeft size={20} color={colors.dark} />
              </Pressable>
            ) : null}
            <View style={{ flex: 1 }}>
              <PartnerText style={[styles.title, (showForm || navigation?.canGoBack?.()) ? styles.titleWithBack : styles.titleRoot]}>
                {showForm ? 'Add driver' : 'Drivers'}
              </PartnerText>
              {showForm ? (
                <PartnerText style={styles.subtitle}>
                  {formStep === 1 ? 'Create an account for a driver in your fleet.' : 'Upload clear, readable files for review.'}
                </PartnerText>
              ) : null}
            </View>
            {!showForm ? (
              <View style={styles.headerRightActions}>
                <Pressable
                  testID="vendorDriversVehiclesBtn"
                  onPress={() => navigation?.navigate?.('VendorVehicles')}
                  style={({ pressed }) => [styles.headerVehicleBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="View vehicles">
                  <Car size={13} color="#92400E" strokeWidth={2.4} />
                  <PartnerText style={styles.headerVehicleLabel}>Vehicles</PartnerText>
                </Pressable>
                <Pressable
                  onPress={onToggleForm}
                  style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Add driver">
                  <Plus size={15} color={colors.dark} strokeWidth={2.6} />
                  <PartnerText style={styles.addLabel}>Add driver</PartnerText>
                </Pressable>
              </View>
            ) : <View style={{ width: 34 }} />}
          </View>
        </View>
      }>
      <View style={styles.content}>
        {!showForm && !vendorLoading && !isApproved ? (
          <View style={styles.pendingBanner}>
            <PartnerText style={styles.pendingText}>{PARTNER_WAITING_ADMIN_APPROVAL}</PartnerText>
          </View>
        ) : null}

        {showForm && isApproved ? (
          <View style={styles.formCard}>
            <View
              style={styles.progressTrack}
              accessibilityRole="progressbar"
              accessibilityLabel="Add driver step"
              accessibilityValue={{ min: 1, max: 2, now: formStep }}>
              <View style={styles.progressRail} />
              <View style={[styles.progressFill, formStep === 2 && styles.progressComplete]} />
              <View style={styles.progressStep}>
                {formStep === 2 ? <Check size={14} color={colors.dark} strokeWidth={3} /> :
                  <PartnerText style={styles.progressStepText}>1</PartnerText>}
              </View>
              <View style={[styles.progressStep, styles.progressStepEnd, formStep === 2 && styles.progressStepDone]}>
                <PartnerText style={styles.progressStepText}>2</PartnerText>
              </View>
            </View>

            {formStep === 1 ? (
              <>
                {createdDriverId ? <View style={styles.docInfoBanner}>
                  <PartnerText style={styles.docInfoText}>Driver account saved. Continue to documents to finish the uploads.</PartnerText>
                </View> : null}
                <FormField
                  compact scale={0.9}
                  editable={!driverDetailsLocked}
                  testID="vendorDriverFullName"
                  label="Full name"
                  autoCapitalize="words"
                  textContentType="name"
                  required
                  Icon={User}
                  value={name}
                  onChangeText={text => {
                    setName(text);
                    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                  }}
                  placeholder="Enter full name"
                  error={errors.name}
                />
                <FormField
                  compact scale={0.9}
                  editable={!driverDetailsLocked}
                  testID="vendorDriverMobile"
                  label="Mobile"
                  required
                  leftElement={<PartnerText style={styles.phonePrefix}>????  +91  ?</PartnerText>}
                  value={phone}
                  onChangeText={text => {
                    setPhone(text.replace(/\D/g, '').slice(0, 10));
                    if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                  }}
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholder="98765 43210"
                  error={errors.phone}
                />
                <FormField
                  compact scale={0.9}
                  editable={!driverDetailsLocked}
                  testID="vendorDriverLicence"
                  label="Driving licence number"
                  required
                  Icon={IdCard}
                  value={licenseNo}
                  onChangeText={text => {
                    setLicenseNo(text);
                    if (errors.licenseNo) setErrors(prev => ({ ...prev, licenseNo: '' }));
                  }}
                  placeholder="Enter DL number (e.g. OD01 20150012345)"
                  autoCapitalize="characters"
                  error={errors.licenseNo}
                />
                <PartnerText style={styles.typeLabel}>Driver type</PartnerText>
                <View style={styles.typeRow}>
                  {DRIVER_TYPES.map(type => (
                    <Pressable
                      key={type}
                      disabled={driverDetailsLocked}
                      onPress={() => setDriverType(type)}
                      style={[styles.typeChip, driverType === type && styles.typeChipActive]}>
                      <PartnerText
                        style={[styles.typeChipText, driverType === type && styles.typeChipTextActive]}>
                        {type}
                      </PartnerText>
                    </Pressable>
                  ))}
                </View>

                <PartnerText style={styles.typeLabel}>Assigned vehicle (Optional)</PartnerText>
                <Pressable
                  disabled={driverDetailsLocked}
                  onPress={() => setShowVehicleOptions(value => !value)}
                  style={styles.selectField}>
                  <Truck size={17} color={colors.grey} />
                  <PartnerText style={styles.selectText}>
                    {newVehicleReg ? formatPlate(newVehicleReg) : 'Not assigned yet'}
                  </PartnerText>
                  <ChevronDown size={17} color={colors.grey} />
                </Pressable>
                {showVehicleOptions && !driverDetailsLocked ? (
                  <View style={styles.vehicleOptions}>
                    <Pressable
                      onPress={() => {
                        setNewVehicleReg(null);
                        setShowVehicleOptions(false);
                      }}
                      style={styles.vehicleOption}>
                      <PartnerText style={styles.vehicleOptionText}>Not assigned yet</PartnerText>
                    </Pressable>
                    {linkableVehicles.map(vehicle => (
                      <Pressable
                        key={vehicle.id}
                        onPress={() => {
                          setNewVehicleReg(vehicle.registrationNo);
                          setShowVehicleOptions(false);
                        }}
                        style={styles.vehicleOption}>
                        <PartnerText style={styles.vehicleOptionText}>
                          {formatPlate(vehicle.registrationNo)} � {vehicle.model}
                        </PartnerText>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <FormField
                  compact scale={0.9}
                  editable={!driverDetailsLocked}
                  testID="vendorDriverLoginId"
                  label="Login ID"
                  required
                  Icon={KeyRound}
                  rightElement={(
                    <Pressable disabled={driverDetailsLocked} onPress={generateLoginId} style={styles.generateButton}>
                      <PartnerText style={styles.generateLabel}>Generate</PartnerText>
                    </Pressable>
                  )}
                  value={loginId}
                  onChangeText={text => {
                    setLoginId(text.replace(/\s/g, ''));
                    if (errors.loginId) setErrors(prev => ({ ...prev, loginId: '' }));
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="driver.odisha01"
                  error={errors.loginId}
                />
                <FormField
                  compact scale={0.9}
                  editable={!driverDetailsLocked}
                  testID="vendorDriverPassword"
                  label="Password"
                  required
                  Icon={Lock}
                  rightElement={(
                    <Pressable onPress={() => setShowPassword(value => !value)} hitSlop={8}>
                      {showPassword ? <EyeOff size={18} color={colors.grey} /> : <Eye size={18} color={colors.grey} />}
                    </Pressable>
                  )}
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={continueToDocuments}
                  placeholder="Minimum 6 characters"
                  error={errors.password}
                />
                <View style={styles.docInfoBanner}>
                  <PartnerText style={styles.docInfoText}>
                    Share this Login ID and password with the driver so they can sign in to the RACE Partner app.
                  </PartnerText>
                </View>
              </>
            ) : (
              <>
                <View style={styles.documentPolicyCard}>
                  <PartnerText style={styles.documentGroupTitle}>Required by policy</PartnerText>
                  <PartnerText style={styles.documentGroupHint}>These documents are required for driver verification.</PartnerText>
                  <PartnerDocumentUploadList
                    variant="card"
                    compact
                    hideTitle
                    documents={REQUIRED_DRIVER_DOCUMENTS}
                    uploadedIds={driverDocuments.map(d => d.id)}
                    selectedFiles={driverDocuments}
                    uploadStates={documentUploadStates}
                    disabled={isSavingDriver}
                    onUpload={selectDocument}
                  />
                </View>

                <View style={styles.optionalDocumentsCard}>
                  <PartnerText style={styles.documentGroupTitle}>Only if applicable</PartnerText>
                  <PartnerText style={styles.documentGroupHint}>These documents may be required based on service type or vehicle category.</PartnerText>
                  <PartnerDocumentUploadList
                    variant="card"
                    compact
                    hideTitle
                    documents={OPTIONAL_DRIVER_DOCUMENTS}
                    uploadedIds={driverDocuments.map(d => d.id)}
                    selectedFiles={driverDocuments}
                    uploadStates={documentUploadStates}
                    disabled={isSavingDriver}
                    onUpload={selectDocument}
                  />
                </View>

                <View style={styles.docInfoBanner}>
                  <PartnerText style={styles.docInfoText}>
                    {docUploadFailures.length
                      ? `Upload failed: ${docUploadFailures.join(', ')}. Please retry before saving.`
                      : 'Requirements depend on RACE verification rules and service type.'}
                  </PartnerText>
                </View>

              </>
            )}
          </View>
        ) : null}

        {!showForm ? (
          <>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
              <Users size={16} color={INFO_BLUE} strokeWidth={2.2} />
            </View>
            <PartnerText style={styles.statValue}>{String(stats.total)}</PartnerText>
            <PartnerText style={styles.statLabel}>All</PartnerText>
            <PartnerText style={styles.statHint}>Total drivers</PartnerText>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#DCFCE7' }]}>
              <CheckCircle2 size={16} color={SUCCESS_GREEN} strokeWidth={2.2} />
            </View>
            <PartnerText style={styles.statValue}>{String(stats.active)}</PartnerText>
            <PartnerText style={styles.statLabel}>Available</PartnerText>
            <PartnerText style={styles.statHint}>Ready for jobs</PartnerText>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.goldLight }]}>
              <UserCog size={16} color={colors.primaryDark} strokeWidth={2.2} />
            </View>
            <PartnerText style={styles.statValue}>{String(stats.onJob)}</PartnerText>
            <PartnerText style={styles.statLabel}>On job</PartnerText>
            <PartnerText style={styles.statHint}>Assigned now</PartnerText>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Search size={16} color={colors.grey} strokeWidth={2.2} />
          <PartnerTextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, mobile or vehicle"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {([
            ['all', `All (${stats.total})`],
            ['active', `Available (${stats.active})`],
            ['on_job', `On job (${stats.onJob})`],
            ['inactive', `Inactive (${stats.inactive})`],
            ...(stats.pending ? [['pending', `Pending (${stats.pending})`]] : []),
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

        {isLoading || vendorLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : filtered.length === 0 ? (
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
          filtered.map(driver => {
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
                      <View style={[styles.compactStatus, { backgroundColor: ui.badgeBg }]}>
                        <PartnerText style={[styles.compactStatusText, { color: ui.badgeText }]}>{ui.label}</PartnerText>
                      </View>
                    </View>
                    <View style={styles.metaRow}>
                      <Phone size={12} color={colors.grey} strokeWidth={2.2} />
                      <PartnerText style={styles.metaText}>{formatPhone(driver.phone)}</PartnerText>
                    </View>
                    <PartnerText style={styles.loginLine}>Login ID: {driver.loginId || '�'}</PartnerText>
                    <Pressable
                      onPress={() => setLinkTarget(driver)}
                      style={styles.compactVehicleBlock}
                      accessibilityRole="button"
                      accessibilityLabel={plate ? `Assigned vehicle ${plate}, tap to change` : 'No vehicle assigned, tap to assign vehicle'}>
                      <Truck size={14} color={plate ? '#D97706' : colors.grey} />
                      <View style={{ flex: 1 }}>
                        <PartnerText style={[styles.vehiclePlate, !plate && styles.vehiclePlateUnassigned]}>
                          {plate || 'Assign vehicle →'}
                        </PartnerText>
                        {plate ? (
                          <PartnerText style={styles.vehicleModel} numberOfLines={1}>
                            {vehicle ? `${vehicle.model} • ${vehicle.type}` : driver.driverType}
                          </PartnerText>
                        ) : null}
                      </View>
                    </Pressable>
                  </View>

                  <Pressable
                    onPress={() => setMenuDriver(driver)}
                    hitSlop={10}
                    style={styles.menuBtn}>
                    <MoreVertical size={18} color={colors.grey} strokeWidth={2.2} />
                  </Pressable>
                </View>

              </View>
            );
          })
        )}

          </>
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
                    `${formatPhone(driver.phone)}\nDL: ${driver.licenseNo || '�'}\nStatus: ${driverUiStatus(driver).label}`,
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
              onPress={() => menuDriver && onResetPassword(menuDriver)}>
              <PartnerText style={[styles.sheetItemText, { color: INFO_BLUE }]}>
                Reset password
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
        visible={Boolean(passwordTarget)}
        transparent
        animationType="slide"
        onRequestClose={() => setPasswordTarget(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPasswordTarget(null)}>
          <Pressable style={styles.linkSheet} onPress={e => e.stopPropagation()}>
            <PartnerText style={styles.sheetTitle}>
              Reset password
            </PartnerText>
            <PartnerText style={styles.assignHint}>
              {passwordTarget
                ? `Set a new Login-ID password for ${passwordTarget.name}. Minimum 6 characters. Share it securely with the driver.`
                : ''}
            </PartnerText>
            <FormField
              label="New password"
              required
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="off"
              placeholder="At least 6 characters"
            />
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
              <Pressable
                style={({ pressed }) => [
                  styles.sheetItem,
                  { flex: 1, alignItems: 'center', borderRadius: radius.md },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => setPasswordTarget(null)}>
                <PartnerText style={styles.sheetItemText}>Cancel</PartnerText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.sheetItem,
                  {
                    flex: 1,
                    alignItems: 'center',
                    borderRadius: radius.md,
                    backgroundColor: '#FDEFC8',
                  },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={submitResetPassword}
                disabled={resetPasswordMutation.isPending}>
                <PartnerText
                  style={[styles.sheetItemText, { color: colors.primaryDark, fontWeight: typography.weights.bold }]}>
                  {resetPasswordMutation.isPending ? 'Saving...' : 'Save password'}
                </PartnerText>
              </Pressable>
            </View>
          </Pressable>
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
              Link vehicle{linkTarget ? ` � ${linkTarget.name}` : ''}
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
                      {vehicle.model} � {vehicle.type}
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
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: PAGE_BG,
  },
  formBackButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
  },
  listBackButton: { width: 106, alignItems: 'flex-start', paddingLeft: 6 },
  formPageTitle: {
    textAlign: 'center',
    fontSize: typography.sizes.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: 0,
  },
  title: {
    color: colors.dark,
    fontSize: 18,
    fontWeight: typography.weights.extrabold,
    textAlign: 'center',
  },
  titleRoot: {
    textAlign: 'left',
    fontSize: 20,
    fontWeight: typography.weights.extrabold,
    color: colors.dark,
  },
  titleWithBack: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: typography.weights.extrabold,
    color: colors.dark,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerVehicleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  headerVehicleLabel: {
    color: '#92400E',
    fontWeight: typography.weights.bold,
    fontSize: 11,
    lineHeight: 14,
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.grey,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addLabel: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: 11,
    lineHeight: 14,
  },
  vehiclePlateUnassigned: {
    color: INFO_BLUE,
    fontWeight: '700',
  },
  content: {
    gap: 10,
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
    borderWidth: 0,
    padding: 0,
    gap: 0,
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
    fontSize: 11,
    marginTop: 2,
    marginBottom: 5,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 0,
    marginBottom: 12,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: spacing.sm,
    borderRadius: 9,
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
    flex: 1,
    marginTop: 0,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  cancelButton: {
    width: 90,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelLabel: { color: colors.dark, fontSize: 12, fontWeight: '600' },
  saveLabel: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  disabled: { opacity: 0.6 },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    height: 82,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    paddingLeft: 38,
  },
  statIcon: {
    position: 'absolute',
    top: 28,
    left: 10,
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  statValue: {
    color: colors.dark,
    marginTop: 13,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: typography.weights.extrabold,
  },
  statLabel: {
    position: 'absolute',
    top: 10,
    left: 38,
    color: colors.dark,
    fontWeight: typography.weights.semibold,
    fontSize: 11,
  },
  statHint: {
    marginTop: 2,
    color: colors.grey,
    fontSize: 9,
    lineHeight: 12,
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
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTextActive: {
    color: colors.dark,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    minHeight: 118,
    gap: 0,
  },
  driverTop: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  avatarWrap: {
    width: 46,
    height: 46,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
    fontSize: 13,
    flex: 1,
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
    fontSize: 11,
  },
  dlText: {
    marginTop: 2,
    color: colors.grey,
    fontSize: typography.sizes.xs,
  },
  menuBtn: {
    width: 22,
    height: 24,
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
    fontSize: 11,
  },
  vehicleModel: {
    marginTop: 1,
    color: colors.grey,
    fontSize: 10,
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
  progressTrack: {
    width: 144,
    alignSelf: 'center',
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16,
    position: 'relative',
  },
  progressRail: { position: 'absolute', left: 12, right: 12, height: 2, backgroundColor: '#E5E7EB' },
  progressFill: {
    position: 'absolute',
    left: 12,
    width: 60,
    height: 2,
    backgroundColor: colors.primary,
  },
  progressComplete: {
    width: 120,
  },
  progressStep: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStepEnd: {
    position: 'absolute',
    right: 0,
    backgroundColor: colors.lightGrey,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressStepDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  progressStepText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.dark,
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
  assignHint: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
  },
  phonePrefix: {
    paddingRight: spacing.sm,
    color: colors.dark,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  generateButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.goldLight,
  },
  generateLabel: {
    color: colors.primaryDark,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  selectField: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.lightGrey,
    marginBottom: spacing.md,
  },
  selectText: {
    flex: 1,
    color: colors.dark,
    fontSize: typography.sizes.sm,
  },
  vehicleOptions: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  vehicleOption: {
    minHeight: 42,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  vehicleOptionText: {
    color: colors.dark,
    fontSize: typography.sizes.sm,
  },
  documentPolicyCard: {
    backgroundColor: '#FFF8E8',
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  optionalDocumentsCard: {
    backgroundColor: '#F4F7FC',
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  documentGroupTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  documentGroupHint: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    lineHeight: 16,
  },
  docInfoBanner: {
    backgroundColor: '#EAF3FF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  docInfoText: {
    color: INFO_BLUE,
    fontSize: 10,
    lineHeight: 14,
  },
  loginLine: { color: colors.grey, fontSize: 10, marginTop: 3 },
  compactVehicleBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 7 },
  compactStatus: { borderRadius: 9, paddingHorizontal: 6, paddingVertical: 3 },
  compactStatusText: { fontSize: 9, fontWeight: '600' },
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
