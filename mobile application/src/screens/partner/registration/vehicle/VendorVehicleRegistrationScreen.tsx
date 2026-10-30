import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  FileStack,
  IdCard,
  Info,
  Shield,
  User,
  X,
} from 'lucide-react-native';

import FormField from '../../../../components/auth/FormField';
import DatePickerModal from '../../../../components/common/DatePickerModal';
import PartnerDocumentUploadList, {
  type PartnerDocumentFieldConfig,
  type PartnerDocumentSelection,
  type PartnerDocumentUploadState,
} from '../../../../components/partner/PartnerDocumentUploadList';
import VendorVehicleImage from '../../../../components/partner/VendorVehicleImage';
import { PartnerText } from '../../../../components/partner/PartnerText';
import AppScreenLayout from '../../../../components/ui/AppScreenLayout';
import { usePartnerDialog } from '../../../../hooks/usePartnerDialog';
import { getApiErrorMessage } from '../../../../services/auth/useAuthMutations';
import {
  useCreateVendorVehicleMutation,
  useLinkVendorDriverVehicleMutation,
  useUploadVendorVehicleDocumentMutation,
  useUpdateVendorVehicleMutation,
  useVendorFleetDriversQuery,
  useVendorFleetVehiclesQuery,
} from '../../../../services/vendor/useVendorBookingsQueries';
import { useVendorStatusQuery } from '../../../../services/vendor/useVendorMutations';
import type { FleetVehicle, VendorVehicleDocumentType } from '../../../../services/vendor/vendorVehiclesApi';
import type {
  PartnerAccountStackParamList,
  PartnerDriversStackParamList,
  PartnerJobsStackParamList,
} from '../../../../types/partnerNavigation';
import { colors, radius, spacing, typography } from '../../../../theme';

const VEHICLE_TYPES = [
  'Flatbed Tow Truck',
  'Wheel-lift Tow Truck',
  'Heavy Tow Truck',
  'Other',
] as const;

const THIS_YEAR = new Date().getFullYear();
const VEHICLE_MODEL_SUGGESTIONS: Record<(typeof VEHICLE_TYPES)[number], string[]> = {
  'Flatbed Tow Truck': ['Tata 407 Recovery', 'Mahindra Bolero Pickup', 'Ashok Leyland Dost'],
  'Wheel-lift Tow Truck': ['Mahindra Bolero Maxi Truck', 'Tata 407 Recovery', 'Force Traveller'],
  'Heavy Tow Truck': ['Eicher Pro 2049', 'Tata 609', 'Ashok Leyland Partner'],
  Other: ['Tata Ace', 'Mahindra Bolero', 'Other'],
};

const VEHICLE_DOCUMENTS: PartnerDocumentFieldConfig[] = [
  { id: 'vehicle_rc', label: 'Registration Certificate (RC)', required: true, Icon: IdCard },
  { id: 'vehicle_insurance', label: 'Vehicle insurance', required: true, Icon: Shield },
  { id: 'fitness_certificate', label: 'Fitness certificate', required: false, Icon: FileStack },
  { id: 'puc', label: 'Pollution certificate (PUC)', required: false, Icon: FileStack },
  { id: 'commercial_permit', label: 'Commercial permit', required: false, Icon: BadgeCheck },
  { id: 'vehicle_photo', label: 'Vehicle photo', required: false, Icon: Car },
];
const REQUIRED_VEHICLE_DOCUMENTS = VEHICLE_DOCUMENTS.filter(document => document.required);
const OPTIONAL_VEHICLE_DOCUMENTS = VEHICLE_DOCUMENTS.filter(document => !document.required);

type FormStep = 'vehicle' | 'registration';
type NavigationParams = PartnerAccountStackParamList & PartnerJobsStackParamList & PartnerDriversStackParamList;

function normalizeReg(value?: string) {
  return (value ?? '').replace(/[\s-]+/g, '').toUpperCase();
}

function matchVehicleType(value: string) {
  return (
    VEHICLE_TYPES.find(item => item.toLowerCase() === value.toLowerCase()) ??
    VEHICLE_TYPES.find(item => value.toLowerCase().includes(item.split(' ')[0].toLowerCase())) ??
    'Other'
  );
}

function readNoteValue(note: string | undefined, key: string) {
  const prefix = `${key.toLowerCase()}:`;
  return (
    note
      ?.split('·')
      .map(part => part.trim())
      .find(part => part.toLowerCase().startsWith(prefix))
      ?.slice(prefix.length)
      .trim() ?? ''
  );
}

/** User types DD/MM/YYYY; returns true when the masked input is a real date. */
function isValidDdMmYyyy(value: string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
  const [day, month, year] = value.split('/').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function ddMmYyyyToApi(value: string) {
  const [day, month, year] = value.split('/');
  return `${year}-${month}-${day}`;
}

/** Mask input as DD/MM/YYYY while typing */
function maskDate(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function VendorVehicleRegistrationScreen() {
  const { dialog: partnerDialog, showAlert } = usePartnerDialog();
  const navigation = useNavigation<NavigationProp<NavigationParams>>();
  const route = useRoute<RouteProp<PartnerAccountStackParamList, 'VendorVehicleRegistration'>>();
  const vehicleId = route.params?.vehicleId;

  const { isLoading: vendorLoading } = useVendorStatusQuery(true);
  const {
    data: vehicles = [],
    isLoading: vehiclesLoading,
  } = useVendorFleetVehiclesQuery(true, false);
  const { data: drivers = [], refetch: refetchDrivers } = useVendorFleetDriversQuery(true);
  const createMutation = useCreateVendorVehicleMutation();
  const updateMutation = useUpdateVendorVehicleMutation();
  const linkDriverMutation = useLinkVendorDriverVehicleMutation();
  const uploadDocumentMutation = useUploadVendorVehicleDocumentMutation();

  const editingVehicle = useMemo(
    () => (vehicleId ? vehicles.find(vehicle => vehicle.id === vehicleId) : undefined),
    [vehicleId, vehicles],
  );
  const [initializedVehicleId, setInitializedVehicleId] = useState<string | undefined>();
  const [step, setStep] = useState<FormStep>('vehicle');
  const [registrationNo, setRegistrationNo] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [type, setType] = useState<(typeof VEHICLE_TYPES)[number]>('Flatbed Tow Truck');
  const [assignedDriverId, setAssignedDriverId] = useState<string | null>(null);
  const [originalAssignedDriverId, setOriginalAssignedDriverId] = useState<string | null>(null);
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [rcNumber, setRcNumber] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [expiryPickerVisible, setExpiryPickerVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [vehicleDocuments, setVehicleDocuments] = useState<PartnerDocumentSelection[]>([]);
  const [documentUploadStates, setDocumentUploadStates] = useState<Record<string, PartnerDocumentUploadState>>({});
  const [createdVehicleId, setCreatedVehicleId] = useState<string | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!vehicleId || !editingVehicle || initializedVehicleId === vehicleId) return;
    setRegistrationNo(editingVehicle.registrationNo);
    setModel(editingVehicle.model);
    setYear(editingVehicle.year ? String(editingVehicle.year) : '');
    setType(matchVehicleType(editingVehicle.type));
    const linkedDriver = drivers.find(
      driver => normalizeReg(driver.vehicleRegistration) === normalizeReg(editingVehicle.registrationNo),
    );
    setAssignedDriverId(linkedDriver?.id ?? null);
    setOriginalAssignedDriverId(linkedDriver?.id ?? null);
    setRcNumber(readNoteValue(editingVehicle.maintenanceNote, 'RC'));
    setInsuranceProvider(readNoteValue(editingVehicle.maintenanceNote, 'Insurer'));
    setInsurancePolicyNumber(readNoteValue(editingVehicle.maintenanceNote, 'Policy'));
    const apiExpiry = editingVehicle.insuranceExpiry?.slice(0, 10) ?? '';
    // API date is YYYY-MM-DD; the form shows DD/MM/YYYY
    const [ey, em, ed] = apiExpiry.split('-');
    setInsuranceExpiry(ey && em && ed ? `${ed}/${em}/${ey}` : '');
    const existingDocuments = (editingVehicle.documents ?? []).map(document => ({
      id: document.type as VendorVehicleDocumentType,
      uri: document.url,
      name: document.fileName,
      mimeType: /\.pdf($|\?)/i.test(document.fileName || document.url) ? 'application/pdf' : 'image/jpeg',
    }));
    setVehicleDocuments(existingDocuments);
    setDocumentUploadStates(Object.fromEntries(
      existingDocuments.map(document => {
        const status = editingVehicle.documents?.find(item => item.type === document.id)?.status;
        return [document.id, { status: status === 'REJECTED' ? 'error' : 'uploaded', progress: 100 }];
      }),
    ));
    setInitializedVehicleId(vehicleId);
  }, [drivers, editingVehicle, initializedVehicleId, vehicleId]);

  const assignedDriverName = drivers.find(driver => driver.id === assignedDriverId)?.name ?? '';
  /** RACE policy: vehicles older than 15 years are not allowed on the platform. */
  const OLDEST_VEHICLE_YEAR = THIS_YEAR - 15;
  const yearOptions = useMemo(
    () => Array.from({ length: THIS_YEAR - OLDEST_VEHICLE_YEAR + 1 }, (_, index) => String(THIS_YEAR - index)),
    [],
  );
  const availableDrivers = drivers.filter(
    driver =>
      !normalizeReg(driver.vehicleRegistration) ||
      normalizeReg(driver.vehicleRegistration) === normalizeReg(registrationNo),
  );
  const saving = isSaving || createMutation.isPending || updateMutation.isPending || linkDriverMutation.isPending || uploadDocumentMutation.isPending;

  const selectVehicleDocument = (id: string, uri: string, name: string, mimeType?: string) => {
    setVehicleDocuments(previous => [...previous.filter(document => document.id !== id), { id, uri, name, mimeType }]);
    setDocumentUploadStates(previous => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
    setSubmitError('');
  };

  const validateVehicle = () => {
    const next: Record<string, string> = {};
    const registration = registrationNo.trim();
    if (registration.length < 4 || registration.length > 20) {
      next.registrationNo = 'Enter a valid vehicle registration number (4–20 characters)';
    } else if (
      vehicles.some(
        vehicle => vehicle.id !== vehicleId && vehicle.id !== createdVehicleId && normalizeReg(vehicle.registrationNo) === normalizeReg(registration),
      )
    ) {
      next.registrationNo = 'This registration number is already in your fleet';
    }
    if (!model.trim()) next.model = 'Enter vehicle make and model';
    if (model.trim() && model.trim().length < 2) {
      next.model = 'Model name looks too short';
    }
    if (year && (!/^\d{4}$/.test(year) || Number(year) < OLDEST_VEHICLE_YEAR || Number(year) > THIS_YEAR)) {
      next.year = `Vehicle must be ${THIS_YEAR - OLDEST_VEHICLE_YEAR} years old or newer (year ${OLDEST_VEHICLE_YEAR} onwards)`;
    }
    setErrors(current => ({
      ...current,
      registrationNo: next.registrationNo ?? '',
      model: next.model ?? '',
      year: next.year ?? '',
    }));
    setSubmitError('');
    return Object.keys(next).length === 0;
  };

  const validateRegistration = () => {
    const next: Record<string, string> = {};
    if (insuranceExpiry && !isValidDdMmYyyy(insuranceExpiry)) {
      next.insuranceExpiry = 'Enter a real date in DD/MM/YYYY format (e.g. 31/03/2027)';
    }
    setErrors(current => ({ ...current, insuranceExpiry: next.insuranceExpiry ?? '' }));
    return Object.keys(next).length === 0;
  };

  const back = () => {
    Keyboard.dismiss();
    if (step === 'registration') {
      setStep('vehicle');
      return;
    }
    navigation.goBack();
  };

  const continueToRegistration = () => {
    Keyboard.dismiss();
    if (!validateVehicle()) return;
    setErrors(current => ({ ...current, insuranceExpiry: '' }));
    setStep('registration');
  };

  const insuranceMeta = () => {
    const parts: string[] = [];
    if (rcNumber.trim()) parts.push(`RC: ${rcNumber.trim().toUpperCase()}`);
    if (insuranceProvider.trim()) parts.push(`Insurer: ${insuranceProvider.trim()}`);
    if (insurancePolicyNumber.trim()) parts.push(`Policy: ${insurancePolicyNumber.trim()}`);
    return parts.join(' · ');
  };

  const saveVehicle = async () => {
    if (savingRef.current) return;
    if (!validateVehicle() || !validateRegistration()) return;
    const missingDocuments = REQUIRED_VEHICLE_DOCUMENTS.filter(
      document => !vehicleDocuments.some(file => file.id === document.id),
    );
    if (missingDocuments.length) {
      setSubmitError(`Upload ${missingDocuments.map(document => document.label).join(' and ')} to continue.`);
      return;
    }
    Keyboard.dismiss();
    savingRef.current = true;
    setIsSaving(true);
    setSubmitError('');

    try {
      let savedVehicleId = editingVehicle?.id ?? createdVehicleId;
      if (editingVehicle) {
        await updateMutation.mutateAsync({
          vehicleId: editingVehicle.id,
          payload: {
            type,
            model: model.trim(),
            year: year ? Number(year) : null,
            insuranceExpiry: insuranceExpiry ? ddMmYyyyToApi(insuranceExpiry) : null,
            maintenanceNote: insuranceMeta(),
          },
        });
      } else if (!savedVehicleId) {
        const registration = registrationNo.trim().toUpperCase();
        const created = await createMutation.mutateAsync({
          registrationNo: registration,
          type,
          model: model.trim(),
          year: year ? Number(year) : undefined,
          status: 'INACTIVE',
          rcNumber: rcNumber.trim().toUpperCase() || undefined,
          insuranceProvider: insuranceProvider.trim() || undefined,
          insurancePolicyNumber: insurancePolicyNumber.trim() || undefined,
          insuranceExpiry: insuranceExpiry ? ddMmYyyyToApi(insuranceExpiry) : undefined,
        });
        savedVehicleId = created.id;
        setCreatedVehicleId(created.id);
      }

      if (!savedVehicleId) throw new Error('Vehicle was saved, but its ID could not be read. Reopen the fleet list and edit the vehicle to continue.');

      const failedDocuments: string[] = [];
      for (const document of vehicleDocuments) {
        if (documentUploadStates[document.id]?.status === 'uploaded') continue;
        setDocumentUploadStates(previous => ({ ...previous, [document.id]: { status: 'uploading' } }));
        try {
          await uploadDocumentMutation.mutateAsync({
            vehicleId: savedVehicleId,
            documentType: document.id as VendorVehicleDocumentType,
            file: { uri: document.uri, name: document.name, mimeType: document.mimeType ?? 'image/jpeg' },
            onProgress: (loaded, total) => setDocumentUploadStates(previous => ({
              ...previous,
              [document.id]: {
                status: 'uploading',
                progress: total && total > 0 ? Math.min(100, Math.round(loaded * 100 / total)) : undefined,
              },
            })),
          });
          setDocumentUploadStates(previous => ({ ...previous, [document.id]: { status: 'uploaded', progress: 100 } }));
        } catch {
          failedDocuments.push(document.id);
          setDocumentUploadStates(previous => ({ ...previous, [document.id]: { status: 'error' } }));
        }
      }
      if (failedDocuments.length) {
        setSubmitError(`Vehicle details are saved. ${failedDocuments.length} document upload${failedDocuments.length === 1 ? '' : 's'} failed; retry to finish.`);
        return;
      }
      if (!editingVehicle) {
        await updateMutation.mutateAsync({ vehicleId: savedVehicleId, payload: { status: 'ACTIVE' } });
      }
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'Please check the details and try again.'));
      return;
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }

    let driverLinkFailed = false;
    const registration = registrationNo.trim().toUpperCase();
    if (editingVehicle && originalAssignedDriverId !== assignedDriverId) {
      try {
        if (assignedDriverId) {
          await linkDriverMutation.mutateAsync({ driverId: assignedDriverId, vehicleRegistration: registration });
        }
        if (originalAssignedDriverId) {
          await linkDriverMutation.mutateAsync({ driverId: originalAssignedDriverId, vehicleRegistration: '' });
        }
      } catch {
        driverLinkFailed = true;
      }
    } else if (!editingVehicle && assignedDriverId) {
      try {
        await linkDriverMutation.mutateAsync({ driverId: assignedDriverId, vehicleRegistration: registration });
      } catch {
        driverLinkFailed = true;
      }
    }
    if (assignedDriverId !== originalAssignedDriverId) await refetchDrivers();

    navigation.goBack();
    showAlert({
      tone: 'success',
      title: editingVehicle || createdVehicleId ? 'Vehicle updated' : 'Vehicle added',
      message: driverLinkFailed
        ? 'Vehicle details were saved, but the driver assignment could not be updated. Review the assignment on the fleet card.'
        : editingVehicle || createdVehicleId
          ? 'Vehicle details were saved.'
          : 'The vehicle is ready to assign to jobs.',
    });
  };

  const ready = !vehicleId || initializedVehicleId === vehicleId;
  if (vendorLoading || (vehicleId && (vehiclesLoading || !ready))) {
    return (
      <AppScreenLayout backgroundColor={PAGE_BG}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      </AppScreenLayout>
    );
  }

  if (vehicleId && !editingVehicle) {
    return (
      <AppScreenLayout
        backgroundColor={PAGE_BG}
        header={<View style={styles.header}><PartnerText style={styles.title}>Vehicle not found</PartnerText></View>}
        footer={
          <View style={styles.footer}>
            <Pressable onPress={() => navigation.goBack()} style={styles.secondaryButton}>
              <PartnerText style={styles.secondaryLabel}>Back to vehicles</PartnerText>
            </Pressable>
          </View>
        }>
        <PartnerText style={styles.emptyText}>This vehicle is no longer in your fleet.</PartnerText>
      </AppScreenLayout>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <AppScreenLayout
      backgroundColor={PAGE_BG}
      keyboardAvoiding
      keyboardDismissMode="on-drag"
      edges={['top', 'bottom']}
      horizontalPadding={12}
      header={
        <View style={styles.header}>
          <Pressable onPress={back} hitSlop={10} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back">
            <ArrowLeft size={20} color={colors.dark} strokeWidth={2.3} />
          </Pressable>
          <View style={styles.headerCopy}>
            <PartnerText style={styles.title}>{editingVehicle ? 'Edit vehicle' : 'Add vehicle'}</PartnerText>
            <PartnerText style={styles.subtitle}>{editingVehicle ? 'Update this vehicle in your fleet.' : 'Register a new vehicle to your fleet'}</PartnerText>
          </View>
        </View>
      }
      footer={
        <View style={styles.footer}>
          <Pressable
            onPress={back}
            disabled={saving}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, saving && styles.disabled]}>
            <PartnerText style={styles.secondaryLabel}>{step === 'vehicle' ? 'Back to vehicles' : 'Back'}</PartnerText>
          </Pressable>
          <Pressable
            onPress={step === 'vehicle' ? continueToRegistration : () => void saveVehicle()}
            disabled={saving}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, saving && styles.disabled]}>
            {saving ? <ActivityIndicator size="small" color={colors.dark} /> : null}
            <PartnerText style={styles.primaryLabel}>
              {saving ? 'Saving…' : step === 'vehicle' ? 'Continue' : createdVehicleId ? 'Retry uploads' : editingVehicle ? 'Save changes' : 'Save vehicle'}
            </PartnerText>
          </Pressable>
        </View>
      }>
      <View style={styles.content}>
        <View
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityLabel="Add vehicle step"
          accessibilityValue={{ min: 1, max: 2, now: step === 'vehicle' ? 1 : 2 }}>
          <View style={styles.progressRail} />
          <View style={[styles.progressFill, step === 'registration' && styles.progressComplete]} />
          <View style={styles.progressStep}>
            {step === 'registration' ? <Check size={14} color={colors.dark} strokeWidth={3} /> :
              <PartnerText style={styles.progressStepText}>1</PartnerText>}
          </View>
          <View style={styles.progressStepEndWrap}>
            <View style={[styles.progressStep, styles.progressStepEnd, step === 'registration' && styles.progressStepDone]}>
              <PartnerText style={styles.progressStepText}>2</PartnerText>
            </View>
          </View>
        </View>

        {step === 'vehicle' ? (
          <View style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}><Car size={18} color={colors.primaryDark} strokeWidth={2.3} /></View>
              <View style={styles.sectionCopy}>
                <PartnerText style={styles.sectionTitle}>Vehicle details</PartnerText>
                <PartnerText style={styles.sectionSubtitle}>Enter the details shown on the vehicle papers.</PartnerText>
              </View>
            </View>

            <PartnerText style={styles.fieldLabel}>Vehicle type <PartnerText style={styles.required}>*</PartnerText></PartnerText>
            <View style={styles.typeGrid}>
              {VEHICLE_TYPES.map(item => {
                const active = type === item;
                const artwork = item.toLowerCase().includes('flat')
                  ? 'flatbed'
                  : item.toLowerCase().includes('wheel')
                    ? 'wheel_lift'
                    : item.toLowerCase().includes('truck') || item.toLowerCase().includes('heavy')
                      ? 'heavy_tow'
                      : 'other';
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    onPress={() => setType(item)}
                    style={({ pressed }) => [styles.typeCard, active && styles.typeCardActive, pressed && styles.pressed]}>
                    <VendorVehicleImage type={artwork} size={42} />
                    <PartnerText numberOfLines={2} style={[styles.typeCardText, active && styles.typeCardTextActive]}>{item}</PartnerText>
                  </Pressable>
                );
              })}
            </View>

            <FormField
              testID="vehicleRegInput"
              label="Registration number"
              required
              value={registrationNo}
              onChangeText={text => setRegistrationNo(text.toUpperCase().replace(/[^A-Z0-9 -]/g, '').slice(0, 20))}
              editable={!editingVehicle}
              autoCapitalize="characters"
              autoCorrect={false}
              error={errors.registrationNo}
              placeholder="e.g. OD02TW1001"
              Icon={Car}
              variant="outlined"
              returnKeyType="next"
            />
            <FormField
              testID="vehicleModelInput"
              label="Make & model"
              required
              value={model}
              onChangeText={text => setModel(text.slice(0, 80))}
              error={errors.model}
              placeholder="e.g. Tata 407, Mahindra Bolero"
              Icon={Car}
              variant="outlined"
              returnKeyType="next"
            />
            <View style={styles.suggestionBlock}>
              <PartnerText style={styles.suggestionLabel}>Common for this vehicle type</PartnerText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.suggestionRow}>
                {VEHICLE_MODEL_SUGGESTIONS[type].map(suggestion => (
                  <Pressable
                    key={suggestion}
                    onPress={() => setModel(suggestion)}
                    style={({ pressed }) => [styles.suggestionChip, model === suggestion && styles.suggestionChipActive, pressed && styles.pressed]}>
                    <PartnerText style={[styles.suggestionText, model === suggestion && styles.suggestionTextActive]}>{suggestion}</PartnerText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <FormField
              testID="vehicleYearInput"
              label="Manufacturing year"
              optional
              value={year}
              editable={false}
              onPress={() => setYearPickerOpen(true)}
              error={errors.year}
              placeholder="Choose a year"
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
              onPress={() => setDriverPickerOpen(true)}
              rightElement={<ChevronDown size={16} color={colors.grey} strokeWidth={2.2} />}
            />
          </View>
        ) : (
          <View style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}><Shield size={18} color={colors.primaryDark} strokeWidth={2.3} /></View>
              <View style={styles.sectionCopy}>
                <PartnerText style={styles.sectionTitle}>Registration & documents</PartnerText>
                <PartnerText style={styles.sectionSubtitle}>Add the vehicle details and upload clear documents for review.</PartnerText>
              </View>
            </View>
            <View style={styles.documentGroup}>
              <PartnerText style={styles.documentGroupTitle}>Required for vehicle registration</PartnerText>
              <PartnerText style={styles.documentGroupHint}>Upload the RC and current insurance. JPG, PNG or PDF up to 5 MB.</PartnerText>
              <PartnerDocumentUploadList
                variant="card"
                compact
                hideTitle
                documents={REQUIRED_VEHICLE_DOCUMENTS}
                uploadedIds={vehicleDocuments.map(document => document.id)}
                selectedFiles={vehicleDocuments}
                uploadStates={documentUploadStates}
                disabled={saving}
                onUpload={selectVehicleDocument}
              />
            </View>
            <FormField
              label="RC number"
              optional
              value={rcNumber}
              onChangeText={text => setRcNumber(text.toUpperCase().slice(0, 40))}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="Enter RC number"
              Icon={Car}
              variant="outlined"
              returnKeyType="next"
            />
            <FormField
              label="Insurance provider"
              optional
              value={insuranceProvider}
              onChangeText={text => setInsuranceProvider(text.slice(0, 80))}
              placeholder="e.g. ICICI Lombard"
              Icon={Shield}
              variant="outlined"
              returnKeyType="next"
            />
            <FormField
              label="Policy number"
              optional
              value={insurancePolicyNumber}
              onChangeText={text => setInsurancePolicyNumber(text.slice(0, 80))}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="Enter policy number"
              Icon={Info}
              variant="outlined"
              returnKeyType="next"
            />
            <Pressable onPress={() => setExpiryPickerVisible(true)}>
              <FormField
                label="Insurance expiry"
                optional
                value={insuranceExpiry}
                onChangeText={text => setInsuranceExpiry(maskDate(text))}
                keyboardType="number-pad"
                error={errors.insuranceExpiry}
                placeholder="DD/MM/YYYY"
                Icon={Calendar}
                variant="outlined"
              />
            </Pressable>
            <View style={styles.optionalDocumentGroup}>
              <PartnerText style={styles.documentGroupTitle}>Additional vehicle documents</PartnerText>
              <PartnerText style={styles.documentGroupHint}>Add fitness, PUC, permit, or a vehicle photo when applicable.</PartnerText>
              <PartnerDocumentUploadList
                variant="card"
                compact
                hideTitle
                documents={OPTIONAL_VEHICLE_DOCUMENTS}
                uploadedIds={vehicleDocuments.map(document => document.id)}
                selectedFiles={vehicleDocuments}
                uploadStates={documentUploadStates}
                disabled={saving}
                onUpload={selectVehicleDocument}
              />
            </View>
            <View style={styles.infoBanner}>
              <Info size={16} color={colors.primaryDark} strokeWidth={2.2} />
              <PartnerText style={styles.infoText}>Uploads show progress and can be retried without creating a duplicate vehicle.</PartnerText>
            </View>
          </View>
        )}
        {submitError ? <PartnerText accessibilityRole="alert" style={styles.errorBanner}>{submitError}</PartnerText> : null}
      </View>

      <Modal
        visible={yearPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setYearPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setYearPickerOpen(false)}>
          <Pressable style={styles.driverSheet} onPress={event => event.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View>
                <PartnerText style={styles.sheetTitle}>Manufacturing year</PartnerText>
                <PartnerText style={styles.documentGroupHint}>
                  Vehicles older than {THIS_YEAR - OLDEST_VEHICLE_YEAR} years ({OLDEST_VEHICLE_YEAR} se pehle) are not allowed.
                </PartnerText>
              </View>
              <Pressable hitSlop={8} onPress={() => setYearPickerOpen(false)} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close year picker">
                <X size={18} color={colors.grey} strokeWidth={2.3} />
              </Pressable>
            </View>
            <ScrollView style={styles.yearList} contentContainerStyle={styles.yearGrid} showsVerticalScrollIndicator={false}>
              {yearOptions.map(option => {
                const selected = option === year;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => { setYear(option); setYearPickerOpen(false); setErrors(current => ({ ...current, year: '' })); }}
                    style={({ pressed }) => [styles.yearOption, selected && styles.yearOptionActive, pressed && styles.pressed]}>
                    <PartnerText style={[styles.yearOptionText, selected && styles.yearOptionTextActive]}>{option}</PartnerText>
                  </Pressable>
                );
              })}
            </ScrollView>
            {year ? (
              <Pressable style={styles.clearYearButton} onPress={() => { setYear(''); setYearPickerOpen(false); }}>
                <PartnerText style={styles.clearDriverLabel}>Clear year</PartnerText>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={driverPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDriverPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDriverPickerOpen(false)}>
          <Pressable style={styles.driverSheet} onPress={event => event.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <PartnerText style={styles.sheetTitle}>Select driver</PartnerText>
              <Pressable hitSlop={8} onPress={() => setDriverPickerOpen(false)} style={styles.closeButton}>
                <X size={18} color={colors.grey} strokeWidth={2.3} />
              </Pressable>
            </View>
            <ScrollView style={styles.driverList} keyboardShouldPersistTaps="handled">
              {availableDrivers.length === 0 ? (
                <PartnerText style={styles.emptyText}>
                  {drivers.length === 0
                    ? 'No drivers are registered yet.'
                    : 'All drivers are linked to another vehicle. Unassign one before continuing.'}
                </PartnerText>
              ) : (
                availableDrivers.map(driver => {
                  const active = driver.id === assignedDriverId;
                  return (
                    <Pressable
                      key={driver.id}
                      style={styles.driverRow}
                      onPress={() => {
                        setAssignedDriverId(active ? null : driver.id);
                        setDriverPickerOpen(false);
                      }}>
                      <View style={styles.driverAvatar}><PartnerText style={styles.driverInitial}>{driver.name.charAt(0).toUpperCase()}</PartnerText></View>
                      <View style={styles.driverCopy}>
                        <PartnerText style={styles.driverName}>{driver.name}</PartnerText>
                        <PartnerText style={styles.driverPhone}>{driver.phone}</PartnerText>
                      </View>
                      {active ? <CheckCircle2 size={19} color={SUCCESS_GREEN} strokeWidth={2.3} /> : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
            <Pressable
              style={styles.clearDriverButton}
              onPress={() => { setAssignedDriverId(null); setDriverPickerOpen(false); }}>
              <PartnerText style={styles.clearDriverLabel}>Leave unassigned</PartnerText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <DatePickerModal
        visible={expiryPickerVisible}
        value={insuranceExpiry}
        title="Insurance expiry"
        fallbackDate={new Date()}
        onConfirm={value => {
          setInsuranceExpiry(value);
          setErrors(current => ({ ...current, insuranceExpiry: '' }));
        }}
        onClose={() => setExpiryPickerVisible(false)}
      />
    </AppScreenLayout>
    {partnerDialog}
    </View>
  );
}

const PAGE_BG = '#FFFFFF';
const SUCCESS_GREEN = '#22C55E';

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: 16, paddingTop: spacing.xs, paddingBottom: spacing.sm, backgroundColor: PAGE_BG },
  backButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  title: { color: colors.dark, fontSize: typography.sizes.lg, fontWeight: typography.weights.extrabold, textAlign: 'center' },
  subtitle: { marginTop: 2, color: colors.grey, fontSize: typography.sizes.xs, textAlign: 'center' },
  content: { gap: spacing.md, paddingBottom: spacing.xl },
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
  progressCaption: { alignSelf: 'center', marginTop: -spacing.sm, marginBottom: spacing.sm, color: colors.grey, fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
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
  progressStepEndWrap: {
    position: 'absolute',
    right: 0,
  },
  progressStepEnd: {
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
  progressNode: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  progressNodeActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  progressNumber: { color: colors.grey, fontWeight: typography.weights.bold, fontSize: typography.sizes.sm },
  progressNumberActive: { color: colors.dark },
  progressLine: { height: 2, flex: 1, backgroundColor: colors.border, marginHorizontal: 8 },
  progressLineDone: { backgroundColor: colors.primary },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  progressLabel: { color: colors.grey, fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
  progressLabelActive: { color: colors.primaryDark },
  formCard: { backgroundColor: colors.background, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  sectionIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.goldLight, alignItems: 'center', justifyContent: 'center' },
  sectionCopy: { flex: 1 },
  sectionTitle: { color: colors.dark, fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
  sectionSubtitle: { color: colors.grey, fontSize: typography.sizes.xs, marginTop: 2, lineHeight: 16 },
  fieldLabel: { color: colors.dark, fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, marginBottom: -spacing.xs },
  required: { color: colors.error },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeCard: { flexGrow: 1, flexBasis: '22%', minWidth: 68, minHeight: 84, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, paddingVertical: spacing.sm, gap: 5 },
  typeCardActive: { borderColor: colors.primary, backgroundColor: '#FFFBEB' },
  typeCardText: { color: colors.grey, fontSize: 10, lineHeight: 12, textAlign: 'center', fontWeight: typography.weights.semibold },
  typeCardTextActive: { color: colors.primaryDark, fontWeight: typography.weights.bold },
  suggestionBlock: { marginTop: -spacing.sm, marginBottom: spacing.xs },
  suggestionLabel: { color: colors.grey, fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, marginBottom: spacing.xs },
  suggestionRow: { flexDirection: 'row', gap: spacing.xs, paddingRight: spacing.xs },
  suggestionChip: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  suggestionChipActive: { borderColor: colors.primary, backgroundColor: colors.goldLight },
  suggestionText: { color: colors.grey, fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
  suggestionTextActive: { color: colors.primaryDark },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: '#EFF6FF', borderRadius: 10, padding: spacing.sm + 2 },
  infoText: { flex: 1, color: '#1E40AF', fontSize: typography.sizes.xs, lineHeight: 17 },
  errorBanner: { color: colors.error, backgroundColor: '#FEF2F2', borderRadius: 10, padding: spacing.md, lineHeight: 19 },
  documentGroup: { gap: spacing.sm, borderRadius: 12, backgroundColor: '#FFFAEB', padding: spacing.md },
  optionalDocumentGroup: { gap: spacing.sm, borderRadius: 12, backgroundColor: '#F3F6FB', padding: spacing.md },
  documentGroupTitle: { color: colors.dark, fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  documentGroupHint: { color: colors.grey, fontSize: typography.sizes.xs, lineHeight: 17 },
  footer: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: 12, paddingTop: spacing.sm, paddingBottom: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.background },
  secondaryButton: { flex: 1, minHeight: 50, borderRadius: radius.button, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  secondaryLabel: { color: colors.dark, fontWeight: typography.weights.bold, fontSize: typography.sizes.sm },
  primaryButton: { flex: 1.5, minHeight: 50, borderRadius: radius.button, backgroundColor: colors.primary, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  primaryLabel: { color: colors.dark, fontWeight: typography.weights.bold, fontSize: typography.sizes.sm },
  disabled: { opacity: 0.58 },
  pressed: { opacity: 0.82 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  driverSheet: { maxHeight: '78%', backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sheetTitle: { color: colors.dark, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  closeButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lightGrey },
  driverList: { flexGrow: 0, maxHeight: 360 },
  yearList: { flexGrow: 0, maxHeight: 390 },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm, paddingBottom: spacing.sm },
  yearOption: { width: '23%', minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  yearOptionActive: { borderColor: colors.primary, backgroundColor: colors.goldLight },
  yearOptionText: { color: colors.dark, fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  yearOptionTextActive: { color: colors.primaryDark, fontWeight: typography.weights.bold },
  clearYearButton: { alignItems: 'center', paddingTop: spacing.md },
  driverRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  driverAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.goldLight, alignItems: 'center', justifyContent: 'center' },
  driverInitial: { color: colors.primaryDark, fontWeight: typography.weights.bold },
  driverCopy: { flex: 1 },
  driverName: { color: colors.dark, fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  driverPhone: { color: colors.grey, fontSize: typography.sizes.xs, marginTop: 2 },
  emptyText: { color: colors.grey, fontSize: typography.sizes.sm, lineHeight: 20, paddingVertical: spacing.md },
  clearDriverButton: { alignItems: 'center', paddingTop: spacing.md },
  clearDriverLabel: { color: colors.primaryDark, fontWeight: typography.weights.bold, fontSize: typography.sizes.sm },
});
