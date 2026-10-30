import { PartnerText, PartnerTextInput } from '../../../../components/partner/PartnerText';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert as SystemAlert, Animated, Easing, Image, Keyboard, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { usePartnerDialog } from '../../../../hooks/usePartnerDialog';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  AlertCircle,
  Calendar,
  Camera,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CreditCard,
  Eye,
  FileText,
  FileUp,
  Image as ImageIcon,
  Info,
  MapPin,
  Phone,
  Plus,
  Pencil,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  Upload,
  User,
  X,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DriverRegistrationLayout, {
  DriverRegScrollContext,
} from '../../../../components/partner/DriverRegistrationLayout';
import {
  CONDITIONAL_DOCUMENTS,
  CORE_REVIEW_DOCUMENTS,
  type DriverDocumentConfig,
  LATER_DOCUMENTS,
} from '../../../../constants/driverRegistrationDocuments';
import {
  defaultDriverPersonal,
  defaultDriverVehicle,
  usePartnerRegistrationStore,
} from '../../../../store/partnerRegistrationStore';
import { useQueryClient } from '@tanstack/react-query';
import {
  createVendorStaffDriver,
  sendVendorDriverOnboardingOtp,
  uploadVendorDriverDocument,
  verifyVendorDriverOnboardingOtp,
} from '../../../../services/vendor/vendorDriversApi';
import { vendorMembershipKeys } from '../../../../services/vendor/useVendorMembershipQueries';
import { useAppDispatch, useAppSelector } from '../../../../redux/hooks';
import { completeOnboarding, updateTokens, updateUser } from '../../../../redux/auth/authSlice';
import { finishPartnerSignup } from '../../../../redux/onboarding/onboardingSlice';
import { API_ENDPOINTS } from '../../../../config/api';
import {
  isUiTestPermissiveMode,
  UI_PREVIEW_MODE,
  UI_PREVIEW_MUTATIONS_ENABLED,
} from '../../../../constants/preview';
import { api, saveTokens } from '../../../../services/api';
import { getApiErrorMessage } from '../../../../services/auth/useAuthMutations';
import { refreshAuthSession } from '../../../../services/authService';
import type {
  PartnerRegistrationStackParamList,
  PartnerRootStackParamList,
} from '../../../../types/partnerNavigation';
import type { ApiSuccessResponse } from '../../../../types/auth';
import { partnerRegistrationGoBack } from '../../../../utils/partnerRegistration';
import { resolveIndianPincode, lookupPincodeOffline } from '../../../../utils/indianPincode';
import { reverseGeocodeToLocation } from '../../../../utils/googlePlaces';
import { getCurrentPositionWhenAllowed } from '../../../../utils/locationPermission';

type Props = NativeStackScreenProps<PartnerRegistrationStackParamList, any>;

function LicenceInput(
  props: React.ComponentProps<typeof PartnerTextInput>,
) {
  const { liftFocusedField } = React.useContext(DriverRegScrollContext);
  return (
    <PartnerTextInput
      {...props}
      onFocus={(event) => {
        props.onFocus?.(event);
        liftFocusedField();
      }}
    />
  );
}

function normalizeIndianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits.slice(0, 10);
}

function normalizeDobForApi(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const displayMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const year = isoMatch ? Number(isoMatch[1]) : displayMatch ? Number(displayMatch[3]) : NaN;
  const month = isoMatch ? Number(isoMatch[2]) : displayMatch ? Number(displayMatch[2]) : NaN;
  const day = isoMatch ? Number(isoMatch[3]) : displayMatch ? Number(displayMatch[1]) : NaN;
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return undefined;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return undefined;
  }
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`;
}

const REF_W = 390;

const OD_CITIES = [
  'Bhubaneswar',
  'Cuttack',
  'Puri',
  'Rourkela',
  'Berhampur',
  'Sambalpur',
  'Balasore',
  'Baripada',
  'Bhadrak',
  'Jharsuguda',
  'Angul',
  'Dhenkanal',
  'Jeypore',
  'Kendujhar',
];

const POPULAR_VEHICLE_MODELS = [
  'Tata 407 Recovery Spec',
  'Ashok Leyland Ecomet Tow',
  'Mahindra Bolero Pik-Up Recovery',
  'Eicher Pro 2049 Tow Truck',
  'Isuzu D-Max Flatbed',
  'Force Motors Recovery Van',
  'Maruti Suzuki Super Carry Tow',
  'BharatBenz 1217C Commercial',
  'Other / Custom Vehicle Model',
];

const QUICK_YEARS = [
  1980, 1985, 1988, 1990, 1992, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001,
  2002, 2003, 2004, 2005, 2006,
];
const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getDaysInMonth(year: number, month1Indexed: number): number {
  return new Date(year, month1Indexed, 0).getDate();
}

function getFirstDayOfWeek(year: number, month1Indexed: number): number {
  return new Date(year, month1Indexed - 1, 1).getDay();
}


export default function DriverRegistrationFlowScreen({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const scale = Math.min(1.22, Math.max(0.88, width / REF_W));
  const px = (val: number) => Math.max(1, Math.round(val * scale));

  const { dialog: partnerDialog, showAlert } = usePartnerDialog();

  const initialStepParam = route.params?.initialStep ?? 1;
  const fromReviewParam = Boolean(route.params?.fromReview);
  const isResubmitParam = Boolean((route.params as any)?.isResubmit);
  /** Vendor fleet “Add driver” reuses this screen. Submit must not switch the vendor session. */
  const vendorStaffOnboarding = Boolean((route.params as { vendorStaffOnboarding?: boolean } | undefined)?.vendorStaffOnboarding);
  const queryClient = useQueryClient();
  const [staffPhoneVerified, setStaffPhoneVerified] = useState(false);
  const [staffProofToken, setStaffProofToken] = useState('');
  const [staffOtpSent, setStaffOtpSent] = useState(false);
  const [staffOtp, setStaffOtp] = useState('');
  const [staffDevOtp, setStaffDevOtp] = useState('');
  const [staffOtpBusy, setStaffOtpBusy] = useState(false);

  /** Step-1 inline validationErrors — red outline + red helper text under each field. */
  const [personalErrors, setPersonalErrors] = useState<Record<string, string>>({});
  const clearPersonalError = (key: string) =>
    setPersonalErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));

  // Flow Step State (1: Personal & Driver Details, 2: Documents, 3: Review)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(
    initialStepParam >= 1 && initialStepParam <= 3 ? (initialStepParam as any) : 1,
  );
  const [returnToReviewAfterEdit, setReturnToReviewAfterEdit] = useState(fromReviewParam);
  const [isResubmitApplication, setIsResubmitApplication] = useState(isResubmitParam);
  const [editSectionModalVisible, setEditSectionModalVisible] = useState(false);

  // Animation Values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Sync route param initialStep if passed from navigation
  useEffect(() => {
    if (
      route.params?.initialStep &&
      route.params.initialStep >= 1 &&
      route.params.initialStep <= 3 &&
      route.params.initialStep !== currentStep
    ) {
      setCurrentStep(route.params.initialStep as 1 | 2 | 3);
    }
  }, [route.params?.initialStep]);

  // Clean, seamless step transition: dismiss keyboard and update step directly without jumpy translation
  const animateToStep = (newStep: 1 | 2 | 3, _direction: 'forward' | 'backward') => {
    Keyboard.dismiss();
    setCurrentStep(newStep);
  };

  // Smooth fade-in for the newly mounted step with zero flash of previous step
  useEffect(() => {
    slideAnim.setValue(0);
    fadeAnim.setValue(0.75);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [currentStep]);

  // Redux & Store
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.user);
  const { driverPersonal, driverVehicle, driverDocuments } = usePartnerRegistrationStore();
  const setDriverPersonal = usePartnerRegistrationStore((s) => s.setDriverPersonal);
  const [licenceFocused, setLicenceFocused] = useState(false);
  const setDriverVehicle = usePartnerRegistrationStore((s) => s.setDriverVehicle);
  const addDriverDocument = usePartnerRegistrationStore((s) => s.addDriverDocument);
  const removeDriverDocument = usePartnerRegistrationStore((s) => s.removeDriverDocument);

  useEffect(() => {
    if (!vendorStaffOnboarding) return;
    const snap = usePartnerRegistrationStore.getState();
    const previous = {
      driverPersonal: snap.driverPersonal,
      driverVehicle: snap.driverVehicle,
      driverDocuments: snap.driverDocuments,
    };
    usePartnerRegistrationStore.setState({
      driverPersonal: { ...defaultDriverPersonal },
      driverVehicle: { ...defaultDriverVehicle },
      driverDocuments: [],
    });
    return () => {
      usePartnerRegistrationStore.setState(previous);
    };
  }, [vendorStaffOnboarding]);

  // -------------------------------------------------------------
  // Step 1: Personal Info States
  // -------------------------------------------------------------
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [emergencyOpen, setEmergencyOpen] = useState(
    Boolean(driverPersonal.emergencyContactName || driverPersonal.emergencyContactNumber),
  );

  // Interactive DOB Calendar Modal States
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [calendarYear, setCalendarYear] = useState<number>(1995);
  const [calendarMonth, setCalendarMonth] = useState<number>(5);
  const [calendarDay, setCalendarDay] = useState<number>(15);
  const [modalInputDay, setModalInputDay] = useState('15');
  const [modalInputMonth, setModalInputMonth] = useState('05');
  const [modalInputYear, setModalInputYear] = useState('1995');

  const filteredCities = OD_CITIES.filter((c) =>
    c.toLowerCase().includes(citySearch.toLowerCase()),
  );

  const openCalendarModal = () => {
    let y = 1995;
    let m = 5;
    let d = 15;
    const parts = (driverPersonal.dateOfBirth || '').split(/[\/\-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10) || 1995;
        m = parseInt(parts[1], 10) || 5;
        d = parseInt(parts[2], 10) || 15;
      } else {
        d = parseInt(parts[0], 10) || 15;
        m = parseInt(parts[1], 10) || 5;
        y = parseInt(parts[2], 10) || 1995;
      }
    }
    setCalendarYear(y);
    setCalendarMonth(m);
    setCalendarDay(d);
    setModalInputDay(String(d).padStart(2, '0'));
    setModalInputMonth(String(m).padStart(2, '0'));
    setModalInputYear(String(y));
    setCalendarModalVisible(true);
  };

  const confirmCalendarSelection = () => {
    let day = parseInt(modalInputDay, 10) || calendarDay;
    let month = parseInt(modalInputMonth, 10) || calendarMonth;
    let year = parseInt(modalInputYear, 10) || calendarYear;
    if (month < 1) month = 1;
    if (month > 12) month = 12;
    const maxDays = getDaysInMonth(year, month);
    if (day < 1) day = 1;
    if (day > maxDays) day = maxDays;
    const formatted = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    setDriverPersonal({ dateOfBirth: formatted });
    setCalendarModalVisible(false);
  };

  // Step 2 stores the Driver's work type and personal driving licence only.
  const DRIVER_SERVICE_TYPES = ['Tow Driver', 'Full-Time', 'Part-Time'] as const;

  // -------------------------------------------------------------
  // Step 3: Document Verification States
  // -------------------------------------------------------------
  const [activeDocForUpload, setActiveDocForUpload] = useState<DriverDocumentConfig | null>(null);
  const [previewDocData, setPreviewDocData] = useState<{
    title: string;
    uri: string;
    name: string;
    mimeType?: string;
  } | null>(null);
  const [expandedLater1, setExpandedLater1] = useState(false);
  const [expandedLater2, setExpandedLater2] = useState(false);

  const [uploadProgressState, setUploadProgressState] = useState<{
    doc: DriverDocumentConfig;
    sourceLabel: string;
    progress: number;
    statusText: string;
    isComplete: boolean;
  } | null>(null);

  const isDocUploaded = (docId: string) => driverDocuments.some((d) => d.id === docId);
  const getUploadedDoc = (docId: string) => driverDocuments.find((d) => d.id === docId);

  const startAnimatedUpload = async (
    doc: DriverDocumentConfig,
    sourceLabel: string,
    realFile?: { uri: string; name: string; mimeType: string },
  ) => {
    setActiveDocForUpload(null);
    setUploadProgressState({
      doc,
      sourceLabel,
      progress: 8,
      statusText: 'Preparing secure upload...',
      isComplete: false,
    });

    try {
      if (!realFile) throw new Error('Choose a document before uploading.');

      // Vendor is still logged in. Driver upload API would reject this token.
      // Keep the file locally and attach it after the staff driver account exists.
      if (vendorStaffOnboarding) {
        addDriverDocument({
          id: doc.id,
          label: doc.title,
          uri: realFile.uri,
          name: realFile.name,
          mimeType: realFile.mimeType,
        });
        setUploadProgressState(prev =>
          prev ? { ...prev, progress: 100, statusText: 'Saved. It uploads when you submit.', isComplete: true } : null,
        );
        setTimeout(() => setUploadProgressState(null), 700);
        return;
      }

      const isPreviewSample =
        sourceLabel === 'Sample' && UI_PREVIEW_MODE && isUiTestPermissiveMode();
      let remoteUrl = '';

      if (isPreviewSample) {
        remoteUrl = realFile.uri;
      } else {
        if (/^https?:\/\//i.test(realFile.uri)) {
          throw new Error('Sample files are available only in preview mode. Select a real document.');
        }
        const formData = new FormData();
        formData.append('documentType', doc.id);
        formData.append('file', {
          uri: realFile.uri,
          name: realFile.name,
          type: realFile.mimeType,
        } as unknown as Blob);
        setUploadProgressState(prev =>
          prev ? { ...prev, progress: 12, statusText: 'Uploading document securely...' } : null,
        );
        const { data } = await api.post<ApiSuccessResponse<{ fileUrl: string }>>(
          API_ENDPOINTS.driverUploadDocument,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: event => {
              const ratio = event.total ? event.loaded / event.total : 0;
              const progress = Math.min(90, Math.max(12, Math.round(ratio * 90)));
              setUploadProgressState(prev =>
                prev ? { ...prev, progress, statusText: 'Uploading document securely...' } : null,
              );
            },
          },
        );
        remoteUrl = data.data.fileUrl;
        if (!remoteUrl) throw new Error('The server did not return a stored document URL.');
      }

      addDriverDocument({
        id: doc.id,
        label: doc.title,
        uri: realFile.uri,
        remoteUrl,
        name: realFile.name,
        mimeType: realFile.mimeType,
      });
      setUploadProgressState(prev =>
        prev ? { ...prev, progress: 100, statusText: 'Uploaded and saved securely.', isComplete: true } : null,
      );
      setTimeout(() => setUploadProgressState(null), 700);
    } catch (error) {
      setUploadProgressState(null);
      showAlert({
        tone: 'error',
        title: 'Document upload failed',
        message: getApiErrorMessage(error, 'The document was not saved. Check your connection and try again.'),
      });
    }
  };

  // -------------------------------------------------------------
  // Native Android & Device Permission Handlers for Document Upload
  // -------------------------------------------------------------
  const handlePickFromCamera = async (doc: DriverDocumentConfig) => {
    try {
      const current = await ImagePicker.getCameraPermissionsAsync();
      let granted = current.granted;

      if (!granted) {
        if (!current.canAskAgain && current.status === ImagePicker.PermissionStatus.DENIED) {
          showAlert({
            tone: 'warning',
            title: 'Camera Permission Required',
            message: 'Camera access is disabled for RACE Partner. To take clear photos of your documents (e.g. Driving License, RC, Insurance) for quick verification, please enable camera access in your device settings.',
            primaryAction: { label: 'Open Settings', onPress: () => { Linking.openSettings().catch(() => {}); } },
            secondaryAction: { label: 'Cancel', onPress: () => {} },
          });
          return;
        }

        const requested = await ImagePicker.requestCameraPermissionsAsync();
        granted = requested.granted;

        if (!granted) {
          showAlert({
            tone: 'warning',
            title: 'Camera Permission Needed',
            message: 'Camera access is required to take photos of your official documents for verification.',
            primaryAction: { label: 'Try Again', onPress: () => { void handlePickFromCamera(doc); } },
            secondaryAction: { label: 'Cancel', onPress: () => {} },
          });
          return;
        }
      }

      setActiveDocForUpload(null);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const capturedName = asset.fileName || `${doc.id}_photo_${Date.now()}.jpg`;

      startAnimatedUpload(doc, 'Camera', {
        uri: asset.uri,
        name: capturedName,
        mimeType: asset.mimeType || 'image/jpeg',
      });
    } catch (err: any) {
      console.warn('[CameraPicker] Error launching camera:', err);
      showAlert({
        tone: 'error',
        title: 'Camera Error',
        message: 'Could not access the camera. You can also select a photo from your gallery or upload a PDF document.',
      });
    }
  };

  const handlePickFromGallery = async (doc: DriverDocumentConfig) => {
    try {
      const current = await ImagePicker.getMediaLibraryPermissionsAsync();
      let granted = current.granted;

      if (!granted) {
        if (!current.canAskAgain && current.status === ImagePicker.PermissionStatus.DENIED) {
          showAlert({
            tone: 'warning',
            title: 'Photo Library Permission Required',
            message: 'Photo library access is disabled for RACE Partner. To select your document photos from your device, please allow photos access in your device settings.',
            primaryAction: { label: 'Open Settings', onPress: () => { Linking.openSettings().catch(() => {}); } },
            secondaryAction: { label: 'Cancel', onPress: () => {} },
          });
          return;
        }

        const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
        granted = requested.granted;

        if (!granted) {
          showAlert({
            tone: 'warning',
            title: 'Gallery Permission Needed',
            message: 'Photo library access is needed to select and upload document photos.',
            primaryAction: { label: 'Try Again', onPress: () => { void handlePickFromGallery(doc); } },
            secondaryAction: { label: 'Cancel', onPress: () => {} },
          });
          return;
        }
      }

      setActiveDocForUpload(null);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const selectedName = asset.fileName || `${doc.id}_gallery_${Date.now()}.jpg`;

      startAnimatedUpload(doc, 'Gallery', {
        uri: asset.uri,
        name: selectedName,
        mimeType: asset.mimeType || 'image/jpeg',
      });
    } catch (err: any) {
      console.warn('[GalleryPicker] Error launching gallery:', err);
      showAlert({
        tone: 'error',
        title: 'Gallery Error',
        message: 'Could not open gallery. Please try again or select a PDF document.',
      });
    }
  };

  const handlePickFromFiles = async (doc: DriverDocumentConfig) => {
    try {
      setActiveDocForUpload(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const maxBytes = 10 * 1024 * 1024; // 10MB
      if (asset.size && asset.size > maxBytes) {
        showAlert({
          tone: 'warning',
          title: 'File Too Large',
          message: 'The selected file exceeds 10 MB. Please choose a smaller photo or compressed PDF.',
        });
        return;
      }

      startAnimatedUpload(doc, 'Files', {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || 'application/pdf',
      });
    } catch (err: any) {
      console.warn('[FilePicker] Error selecting document:', err);
      showAlert({
        tone: 'error',
        title: 'File Picker Error',
        message: 'Could not open document picker. Please try taking a photo with the camera or choosing from gallery.',
      });
    }
  };

  const handlePickSample = (doc: DriverDocumentConfig) => {
    setActiveDocForUpload(null);
    startAnimatedUpload(doc, 'Sample', {
      uri: `https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&q=80&sig=${doc.id}`,
      name: `${doc.id}_verified_sample.jpg`,
      mimeType: 'image/jpeg',
    });
  };

  const coreUploadedCount = CORE_REVIEW_DOCUMENTS.filter((d) => isDocUploaded(d.id)).length;
  const missingCoreDocs = CORE_REVIEW_DOCUMENTS.filter((d) => !isDocUploaded(d.id));
  const isAllCoreComplete = coreUploadedCount === CORE_REVIEW_DOCUMENTS.length;

  // -------------------------------------------------------------
  // Step 4: Review States
  // -------------------------------------------------------------
  const [confirmAgreed, setConfirmAgreed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Each review section opens on its own. Several can stay open together.
  const [reviewExpanded, setReviewExpanded] = useState<{
    personal: boolean;
    driverDetails: boolean;
    documents: boolean;
  }>({ personal: false, driverDetails: false, documents: false });

  const toggleReviewSection = (key: 'personal' | 'driverDetails' | 'documents') =>
    setReviewExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  // -------------------------------------------------------------
  // Unified Flow Navigation Handlers (3 Steps: Details -> Docs -> Review)
  // -------------------------------------------------------------
  const handleFlowBack = () => {
    if (returnToReviewAfterEdit) {
      setReturnToReviewAfterEdit(false);
      animateToStep(3, 'backward');
      return;
    }

    if (currentStep === 1) {
      if (vendorStaffOnboarding && navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
      partnerRegistrationGoBack(navigation, 'DriverPersonalInfo', {
        role: route.params?.role || 'driver',
        mobileNumber: route.params?.mobileNumber,
      });
    } else if (currentStep === 2) {
      animateToStep(1, 'backward');
    } else if (currentStep === 3) {
      animateToStep(2, 'backward');
    }
  };

  const validatePersonalStep = () => {
    const name = driverPersonal.fullName.trim();
    const mobile = normalizeIndianPhone(driverPersonal.mobileNumber);
    const next: Record<string, string> = {};
    if (name.length < 2) {
      next.fullName = 'Enter your full name as it appears on your driving licence';
    }
    if (mobile.length !== 10) {
      next.mobileNumber = 'Enter the 10-digit verified mobile number';
    }
    if (vendorStaffOnboarding && !staffPhoneVerified && mobile.length === 10) {
      next.mobileNumber = "Send the OTP and verify this driver's mobile number";
    }
    if (!normalizeDobForApi(driverPersonal.dateOfBirth)) {
      next.dateOfBirth = 'Enter a valid date in DD/MM/YYYY format';
    }
    if (driverPersonal.address.trim().length < 5) {
      next.address = 'Enter your current address';
    }
    if (!driverPersonal.city?.trim()) {
      next.city = 'Select your operating city';
    }
    const dlNumber = (driverPersonal.licenseNumber || driverVehicle.licenseNumber || '').trim();
    if (dlNumber.length < 4) {
      next.licenseNumber = 'Enter your driving licence number';
    }
    setPersonalErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateDocumentsStep = () => {
    if (missingCoreDocs.length === 0) return true;
    showAlert({
      tone: 'warning',
      title: 'Documents required',
      message: `Upload ${missingCoreDocs.map(doc => doc.title).join(', ')} before continuing.`,
    });
    return false;
  };

  const handleFlowContinue = () => {
    const permissivePreview = UI_PREVIEW_MODE && isUiTestPermissiveMode();
    if (!permissivePreview) {
      if (currentStep === 1 && !validatePersonalStep()) return;
      if (currentStep === 2 && !validateDocumentsStep()) return;
    }

    if (returnToReviewAfterEdit) {
      setReturnToReviewAfterEdit(false);
      animateToStep(3, 'forward');
      return;
    }

    if (currentStep === 1) {
      const selectedType = vendorStaffOnboarding ? 'Full-Time' : driverPersonal.driverType || 'Full-Time';
      const dlNumber = (driverPersonal.licenseNumber || driverVehicle.licenseNumber || '').trim() || (permissivePreview ? 'OD-0220190012345' : '');
      setDriverPersonal({
        fullName: driverPersonal.fullName.trim() || (permissivePreview ? 'Rajesh Kumar' : ''),
        dateOfBirth:
          driverPersonal.dateOfBirth.trim() || (permissivePreview ? '15/05/1992' : ''),
        address:
          driverPersonal.address.trim() ||
          (permissivePreview ? 'Plot 42, Saheed Nagar, Janpath Road' : ''),
        city: driverPersonal.city?.trim() || (permissivePreview ? 'Bhubaneswar' : undefined),
        state: driverPersonal.state?.trim() || (permissivePreview ? 'Odisha' : undefined),
        pincode: driverPersonal.pincode?.trim() || (permissivePreview ? '751007' : undefined),
        licenseNumber: dlNumber,
        driverType: selectedType,
      });
      setDriverVehicle({
        vehicleType: selectedType,
        licenseNumber: dlNumber,
        vehicleNumber: '',
        rcNumber: '',
        vehicleModel: '',
        insuranceProvider: '',
        insurancePolicyNumber: '',
        registeredTo: undefined,
      });
      animateToStep(2, 'forward');
    } else if (currentStep === 2) {
      if (permissivePreview && missingCoreDocs.length > 0) {
        missingCoreDocs.forEach(doc => {
          addDriverDocument({
            id: doc.id,
            label: doc.title,
            uri: `https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&q=80&sig=${doc.id}`,
            name: `${doc.id}_verified.jpg`,
            mimeType: 'image/jpeg',
          });
        });
      }
      animateToStep(3, 'forward');
    } else if (currentStep === 3) {
      void handleSubmit();
    }
  };

  const submitVendorStaffDriver = async () => {
    setSubmitting(true);
    try {
      const phone = normalizeIndianPhone(driverPersonal.mobileNumber);
      let proofToken = staffProofToken;
      if (!proofToken && UI_PREVIEW_MUTATIONS_ENABLED) {
        const verified = await verifyVendorDriverOnboardingOtp(phone || '9876543210', staffOtp || '123456');
        proofToken = verified.onboardingProofToken || verified.proofToken;
      }
      if (!proofToken) {
        throw new Error('Verify the driver mobile number before submitting.');
      }

      const driverType = 'Full-Time' as const;

      const created = await createVendorStaffDriver({
        phone,
        name: driverPersonal.fullName.trim(),
        licenseNo: (driverPersonal.licenseNumber || driverVehicle.licenseNumber).trim(),
        driverType,
        onboardingProofToken: proofToken,
        city: driverPersonal.city?.trim() || undefined,
        state: driverPersonal.state?.trim() || undefined,
        email: driverPersonal.email.trim() || undefined,
        dateOfBirth: normalizeDobForApi(driverPersonal.dateOfBirth),
        experienceYears: driverPersonal.yearsOfExperience
          ? Number(driverPersonal.yearsOfExperience)
          : undefined,
      });

      const vendorDocType: Record<string, string> = {
        driving_license: 'driving_license',
        profile_photo: 'profile_photo',
        aadhaar_card: 'aadhaar',
        pan_card: 'pan_card',
      };
      if (created?.id) {
        for (const doc of driverDocuments) {
          if (!doc.uri || /^https?:\/\//i.test(doc.uri)) continue;
          try {
            await uploadVendorDriverDocument(created.id, vendorDocType[doc.id] ?? doc.id, {
              uri: doc.uri,
              name: doc.name || `${doc.id}.jpg`,
              mimeType: doc.mimeType || 'image/jpeg',
            });
          } catch (uploadError) {
            console.warn('Staff document upload failed:', doc.id, uploadError);
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: vendorMembershipKeys.vendor });
      showAlert({
        tone: 'success',
        title: 'Driver added',
        message: `${driverPersonal.fullName.trim()} is on your fleet. Documents stay in review until admin approves them.`,
        primaryAction: {
          label: 'Done',
          onPress: () => {
            if (navigation.canGoBack()) navigation.goBack();
          },
        },
      });
    } catch (error) {
      showAlert({
        tone: 'error',
        title: 'Could not add driver',
        message: getApiErrorMessage(error, 'Check the details and try again.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (vendorStaffOnboarding) {
      await submitVendorStaffDriver();
      return;
    }
    setSubmitting(true);
    try {
      const emergencyContact = driverPersonal.emergencyContactNumber
        ? {
            name: driverPersonal.emergencyContactName || 'Emergency Contact',
            mobileNumber: driverPersonal.emergencyContactNumber,
            relationship: 'Contact',
          }
        : undefined;

      const documentsPayload = driverDocuments.map((doc) => {
        const url = doc.remoteUrl || (UI_PREVIEW_MODE && /^https?:\/\//i.test(doc.uri) ? doc.uri : '');
        if (!url) throw new Error(`${doc.label} has not finished uploading. Upload it again before submitting.`);
        return { type: doc.id, url, status: 'PENDING' as const };
      });


      const payload = {
        fullName: driverPersonal.fullName.trim(),
        email: driverPersonal.email.trim() || undefined,
        address: driverPersonal.address.trim() || undefined,
        city: driverPersonal.city?.trim() || undefined,
        state: driverPersonal.state?.trim() || undefined,
        pincode: driverPersonal.pincode?.trim() || undefined,
        dateOfBirth: normalizeDobForApi(driverPersonal.dateOfBirth),
        emergencyContact,
        licenseNo: (driverPersonal.licenseNumber || driverVehicle.licenseNumber).trim(),
        driverType: (driverPersonal.driverType || driverVehicle.vehicleType || 'Full-Time').trim() as 'Tow Driver' | 'Full-Time' | 'Part-Time',
        documents: documentsPayload,
        experienceYears: driverPersonal.yearsOfExperience
          ? Number(driverPersonal.yearsOfExperience)
          : undefined,
        languages: driverPersonal.languages
          ? driverPersonal.languages
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      };

      let registeredName = payload.fullName;

      try {
        const { data } = await api.post<
          ApiSuccessResponse<{
            id: string;
            role: string;
            fullName?: string;
            status: string;
            isProfileCompleted: boolean;
          }>
        >(API_ENDPOINTS.driverRegister ?? '/api/v1/driver/register', payload);

        if (data?.data?.fullName) {
          registeredName = data.data.fullName;
        }
      } catch (err) {
        if (!UI_PREVIEW_MUTATIONS_ENABLED) throw err;
        console.warn('Driver self registration API fallback:', err);
      }

      dispatch(finishPartnerSignup());

      if (!authUser) {
        if (!UI_PREVIEW_MUTATIONS_ENABLED) {
          throw new Error('Your session expired. Log in with OTP and submit again.');
        }
        const token = 'mock-driver-token';
        await saveTokens(token, token);
      } else {
        try {
          const session = await refreshAuthSession();
          dispatch(updateTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken }));
          dispatch(updateUser(session.user));
        } catch {
          // Registration succeeded; verification screen can poll status with existing tokens.
        }
      }

      dispatch(
        completeOnboarding(
          authUser
            ? {
                ...authUser,
                role: 'driver',
                fullName: registeredName,
                email: driverPersonal.email || authUser.email,
                isProfileCompleted: true,
              }
            : {
                id: `driver-${Date.now()}`,
                mobileNumber: driverPersonal.mobileNumber || '9876543210',
                role: 'driver',
                fullName: registeredName,
                email: driverPersonal.email || 'rajesh.driver@gmail.com',
                isVerified: true,
                isProfileCompleted: true,
              },
        ),
      );

      navigation.navigate('DriverVerificationPending', {
        role: 'driver',
        mobileNumber: driverPersonal.mobileNumber,
      });
    } catch (error) {
      showAlert({
        tone: 'error',
        title: 'Submission notice',
        message: getApiErrorMessage(error, 'Please check your connection and submit again.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getContinueLabel = () => {
    if (returnToReviewAfterEdit) return 'Save & Return';
    if (currentStep === 3) {
      if (submitting) return 'Submitting...';
      return isResubmitApplication ? 'Re-submit application' : 'Submit application';
    }
    return 'Continue';
  };

  // -------------------------------------------------------------
  // Render Step 1: Personal & Driver Details (Unified 3-Step Flow)
  // -------------------------------------------------------------
  const offerLiveLocation = async () => {
    const pos = await getCurrentPositionWhenAllowed();
    if (!pos) return;
    try {
      const place = await reverseGeocodeToLocation(pos.coords.latitude, pos.coords.longitude);
      const pin = (place.pincode || '').replace(/\D/g, '').slice(0, 6);
      setDriverPersonal({
        ...(place.address ? { address: place.address.slice(0, 120) } : {}),
        ...(pin ? { pincode: pin } : {}),
        ...(place.city ? { city: place.city } : {}),
        ...(place.state ? { state: place.state } : {}),
      });
    } catch {
      // GPS or geocode unavailable — user fills address and PIN by hand.
    }
  };

  const renderStep1PersonalInfo = () => (
    <View>
      {/* Card 1: Personal Information */}
      <View style={[styles.card, { padding: px(14), marginBottom: px(12) }]}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.headerIconBox, { width: px(34), height: px(34), borderRadius: px(8) }]}>
            <User size={px(17)} color="#D97706" strokeWidth={2.4} />
          </View>
          <View style={styles.headerTextWrap}>
            <PartnerText style={[styles.cardHeaderTitle, { fontSize: px(14.5) }]}>Personal information</PartnerText>
            <PartnerText style={[styles.cardHeaderSubtitle, { fontSize: px(11.5) }]}>
              Enter your details as they appear on official IDs.
            </PartnerText>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Full Name */}
        <View style={[styles.inputGroup, { marginBottom: px(12) }]}>
          <View style={styles.inputLabelRow}>
            <PartnerText style={[styles.inputLabel, { fontSize: px(12) }]}>
              Full name <PartnerText style={styles.requiredAsterisk}>*</PartnerText>
            </PartnerText>
            {driverPersonal.fullName.length >= 25 ? (
              <PartnerText style={[styles.charCountText, { fontSize: px(10.5) }]}>
                {driverPersonal.fullName.length}/40
              </PartnerText>
            ) : null}
          </View>
          <View style={[styles.inputContainer, personalErrors.fullName && styles.inputContainerError, { height: px(44), paddingHorizontal: px(10) }]}>
            <User size={px(16)} color={personalErrors.fullName ? '#DC2626' : '#9CA3AF'} strokeWidth={2} style={styles.leftInputIcon} />
            <PartnerTextInput
              style={[styles.textInput, { fontSize: px(13.5), flex: 1 }]}
              placeholder="Enter full name (as on DL)"
              placeholderTextColor="#9CA3AF"
              value={driverPersonal.fullName}
              maxLength={40}
              autoCapitalize="words"
              autoCorrect={false}
              onChangeText={(text) => {
                const sanitized = text.replace(/[^a-zA-Z\s.-]/g, '');
                setDriverPersonal({ fullName: sanitized });
                clearPersonalError('fullName');
              }}
            />
          </View>
          {personalErrors.fullName ? (
            <PartnerText style={[styles.errorText, { fontSize: px(11) }]}>{personalErrors.fullName}</PartnerText>
          ) : null}
        </View>

        {/* Mobile Number. Self-registration is locked after login OTP.
            Vendor staff onboarding types the new driver's number, then the same Verified lock. */}
        <View style={[styles.inputGroup, { marginBottom: px(12) }]}>
          <PartnerText style={[styles.inputLabel, { fontSize: px(12) }]}>
            Mobile number <PartnerText style={styles.requiredAsterisk}>*</PartnerText>
          </PartnerText>
          <View
            style={[
              styles.inputContainer,
              !vendorStaffOnboarding || staffPhoneVerified ? styles.lockedInputContainer : null,
              personalErrors.mobileNumber && (vendorStaffOnboarding ? styles.inputContainerError : null),
              { height: px(44), paddingHorizontal: px(10) },
            ]}>
            <Phone size={px(16)} color="#6B7280" strokeWidth={2} style={styles.leftInputIcon} />
            <PartnerText style={[styles.countryPrefix, { fontSize: px(13.5) }]}>+91</PartnerText>
            <PartnerTextInput
              style={[
                styles.textInput,
                !vendorStaffOnboarding || staffPhoneVerified ? styles.lockedTextInput : null,
                { fontSize: px(13.5), flex: 1 },
              ]}
              editable={vendorStaffOnboarding && !staffPhoneVerified}
              keyboardType="number-pad"
              maxLength={10}
              placeholder={vendorStaffOnboarding ? '10-digit mobile number' : undefined}
              placeholderTextColor="#9CA3AF"
              value={
                vendorStaffOnboarding
                  ? driverPersonal.mobileNumber
                  : driverPersonal.mobileNumber || '9876543210'
              }
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, '').slice(0, 10);
                setDriverPersonal({ mobileNumber: digits });
                if (staffPhoneVerified || staffProofToken) {
                  setStaffPhoneVerified(false);
                  setStaffProofToken('');
                  setStaffOtpSent(false);
                  setStaffOtp('');
                }
              }}
            />
            {vendorStaffOnboarding && !staffPhoneVerified ? (
              <Pressable
                disabled={staffOtpBusy}
                onPress={() => {
                  void (async () => {
                    const phone = normalizeIndianPhone(driverPersonal.mobileNumber);
                    if (phone.length !== 10) {
                      showAlert({
                        tone: 'warning',
                        title: 'Mobile number required',
                        message: 'Enter the driver’s 10-digit mobile number first.',
                      });
                      return;
                    }
                    setStaffOtpBusy(true);
                    try {
                      const sent = await sendVendorDriverOnboardingOtp(
                        phone,
                        driverPersonal.fullName.trim() || undefined,
                      );
                      setStaffOtpSent(true);
                      setStaffDevOtp(sent.devOtp ?? '');
                    } catch (error) {
                      showAlert({
                        tone: 'error',
                        title: 'Could not send OTP',
                        message: getApiErrorMessage(error, 'Try again in a moment.'),
                      });
                    } finally {
                      setStaffOtpBusy(false);
                    }
                  })();
                }}
                style={[styles.verifiedBadge, { backgroundColor: '#FEF3C7' }]}>
                <PartnerText style={[styles.verifiedText, { fontSize: px(10.5), color: '#B45309' }]}>
                  {staffOtpBusy ? 'Sending' : 'Verify'}
                </PartnerText>
              </Pressable>
            ) : (
              <View style={styles.verifiedBadge}>
                <Check size={px(11)} color="#15803D" strokeWidth={3} />
                <PartnerText style={[styles.verifiedText, { fontSize: px(10.5) }]}>Verified</PartnerText>
              </View>
            )}
          </View>
          {vendorStaffOnboarding && staffOtpSent && !staffPhoneVerified ? (
            <View style={{ marginTop: px(8), gap: px(8) }}>
              <PartnerTextInput
                keyboardType="number-pad"
                maxLength={6}
                value={staffOtp}
                placeholder="Enter OTP"
                placeholderTextColor="#9CA3AF"
                onChangeText={(text) => setStaffOtp(text.replace(/\D/g, '').slice(0, 6))}
                style={[
                  styles.inputContainer,
                  {
                    height: px(44),
                    paddingHorizontal: px(12),
                    fontSize: px(14),
                    letterSpacing: 4,
                    fontWeight: '700',
                  },
                ]}
              />
              {staffDevOtp ? (
                <PartnerText style={{ fontSize: px(11), color: '#6B7280' }}>
                  Dev code {staffDevOtp}
                </PartnerText>
              ) : null}
              <Pressable
                disabled={staffOtpBusy}
                onPress={() => {
                  void (async () => {
                    const phone = normalizeIndianPhone(driverPersonal.mobileNumber);
                    if (staffOtp.length < 4) {
                      showAlert({
                        tone: 'warning',
                        title: 'OTP required',
                        message: 'Enter the code sent to the driver.',
                      });
                      return;
                    }
                    setStaffOtpBusy(true);
                    try {
                      const verified = await verifyVendorDriverOnboardingOtp(phone, staffOtp);
                      setStaffProofToken(verified.onboardingProofToken || verified.proofToken);
                      setStaffPhoneVerified(true);
                    } catch (error) {
                      showAlert({
                        tone: 'error',
                        title: 'OTP not confirmed',
                        message: getApiErrorMessage(error, 'Check the code and try again.'),
                      });
                    } finally {
                      setStaffOtpBusy(false);
                    }
                  })();
                }}
                style={{
                  height: px(40),
                  borderRadius: px(10),
                  backgroundColor: '#F9A602',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <PartnerText style={{ fontWeight: '700', color: '#191919', fontSize: px(13) }}>
                  {staffOtpBusy ? 'Checking…' : 'Confirm OTP'}
                </PartnerText>
              </Pressable>
            </View>
          ) : null}
          {vendorStaffOnboarding && personalErrors.mobileNumber ? (
            <PartnerText style={[styles.errorText, { fontSize: px(11) }]}>{personalErrors.mobileNumber}</PartnerText>
          ) : null}
        </View>

        {/* Date of Birth (DD/MM/YYYY) */}
        <View style={[styles.inputGroup, { marginBottom: px(12) }]}>
          <PartnerText style={[styles.inputLabel, { fontSize: px(12) }]}>
            Date of birth <PartnerText style={styles.requiredAsterisk}>*</PartnerText>{' '}
            <PartnerText style={[styles.optionalText, { fontSize: px(11) }]}>[DD/MM/YYYY]</PartnerText>
          </PartnerText>
          <View style={[styles.inputContainer, personalErrors.dateOfBirth && styles.inputContainerError, { height: px(44), paddingHorizontal: px(10) }]}>
            <Calendar size={px(16)} color={personalErrors.dateOfBirth ? '#DC2626' : '#9CA3AF'} strokeWidth={2} style={styles.leftInputIcon} />
            <PartnerTextInput
              style={[styles.textInput, { fontSize: px(13.5), fontWeight: '600', flex: 1 }]}
              placeholder="15/05/1995"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={10}
              value={driverPersonal.dateOfBirth}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, '');
                let formatted = cleaned;
                if (cleaned.length > 2 && cleaned.length <= 4) {
                  formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
                } else if (cleaned.length > 4) {
                  formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
                }
                setDriverPersonal({ dateOfBirth: formatted });
                clearPersonalError('dateOfBirth');
              }}
            />
            <Pressable hitSlop={10} onPress={openCalendarModal} style={styles.calendarIconButton}>
              <Calendar size={px(18)} color="#D97706" strokeWidth={2.4} />
            </Pressable>
          </View>
          {personalErrors.dateOfBirth ? (
            <PartnerText style={[styles.errorText, { fontSize: px(11) }]}>{personalErrors.dateOfBirth}</PartnerText>
          ) : null}
        </View>

        {/* Current Address */}
        <View style={[styles.inputGroup, { marginBottom: px(12) }]}>
          <View style={styles.inputLabelRow}>
            <PartnerText style={[styles.inputLabel, { fontSize: px(12) }]}>
              Current address <PartnerText style={styles.requiredAsterisk}>*</PartnerText>
            </PartnerText>
            <PartnerText style={[styles.charCountText, { fontSize: px(10.5) }]}>
              {driverPersonal.address.length}/120
            </PartnerText>
          </View>
          <View style={[styles.inputContainer, personalErrors.address && styles.inputContainerError, { height: px(44), paddingHorizontal: px(10) }]}>
            <MapPin size={px(16)} color={personalErrors.address ? '#DC2626' : '#9CA3AF'} strokeWidth={2} style={styles.leftInputIcon} />
            <PartnerTextInput
              style={[styles.textInput, { fontSize: px(13.5), flex: 1 }]}
              placeholder="House, street, landmark, area"
              placeholderTextColor="#9CA3AF"
              maxLength={120}
              value={driverPersonal.address}
              onFocus={() => {
                void offerLiveLocation();
              }}
              onChangeText={(address) => {
                setDriverPersonal({ address });
                clearPersonalError('address');
              }}
            />
          </View>
          {personalErrors.address ? (
            <PartnerText style={[styles.errorText, { fontSize: px(11) }]}>{personalErrors.address}</PartnerText>
          ) : null}
        </View>

        {/* Pincode & State Auto-fill */}
        <View style={[styles.inputGroup, { marginBottom: px(12) }]}>
          <PartnerText style={[styles.inputLabel, { fontSize: px(12) }]}>
            PIN code <PartnerText style={styles.requiredAsterisk}>*</PartnerText>
          </PartnerText>
          <View style={[styles.inputContainer, { height: px(44), paddingHorizontal: px(10) }]}>
            <MapPin size={px(16)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
            <PartnerTextInput
              style={[styles.textInput, { fontSize: px(13.5), fontWeight: '600', flex: 1 }]}
              placeholder="Enter 6-digit PIN code (e.g. 751001)"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={6}
              value={driverPersonal.pincode}
              onChangeText={async (text) => {
                const clean = text.replace(/[^0-9]/g, '').slice(0, 6);
                setDriverPersonal({ pincode: clean });
                if (clean.length >= 3) {
                  const off = lookupPincodeOffline(clean);
                  if (off) {
                    setDriverPersonal({
                      city: off.city || driverPersonal.city,
                      state: off.state || driverPersonal.state,
                    });
                  }
                }
                if (clean.length === 6) {
                  const res = await resolveIndianPincode(clean);
                  if (res) {
                    setDriverPersonal({
                      city: res.city || driverPersonal.city,
                      state: res.state || driverPersonal.state,
                    });
                  }
                }
              }}
            />
          </View>
        </View>

        {/* Operating City & State Display */}
        <View style={[styles.inputGroup, { marginBottom: px(12) }]}>
          <PartnerText style={[styles.inputLabel, { fontSize: px(12) }]}>
            Operating city <PartnerText style={styles.requiredAsterisk}>*</PartnerText>
          </PartnerText>
          <Pressable
            onPress={() => { setCityModalVisible(true); clearPersonalError('city'); }}
            style={[styles.inputContainer, personalErrors.city && styles.inputContainerError, { height: px(44), paddingHorizontal: px(10) }]}>
            <MapPin size={px(16)} color={personalErrors.city ? '#DC2626' : '#9CA3AF'} strokeWidth={2} style={styles.leftInputIcon} />
            <PartnerText
              style={[
                styles.textValue,
                { fontSize: px(13.5) },
                !driverPersonal.city && styles.textPlaceholder,
              ]}>
              {driverPersonal.city ? `${driverPersonal.city}${driverPersonal.state ? `, ${driverPersonal.state}` : ''}` : 'Select city'}
            </PartnerText>
            <ChevronDown size={px(18)} color="#6B7280" strokeWidth={2} />
          </Pressable>
          {personalErrors.city ? (
            <PartnerText style={[styles.errorText, { fontSize: px(11) }]}>{personalErrors.city}</PartnerText>
          ) : null}
        </View>

        {/* Emergency Contact — inline fields, no sheet */}
        <View style={[styles.alertBanner, { padding: px(10), borderRadius: px(8) }]}>
          <Pressable
            onPress={() => setEmergencyOpen((open) => !open)}
            style={styles.alertContentRow}>
            <View style={[styles.alertIconCircle, { width: px(24), height: px(24), borderRadius: px(12) }]}>
              <Phone size={px(13)} color="#D97706" />
            </View>
            <View style={styles.alertTextWrap}>
              <PartnerText style={[styles.alertTitle, { fontSize: px(12) }]}>Emergency contact</PartnerText>
              <PartnerText numberOfLines={1} style={[styles.alertSubtitle, { fontSize: px(10.5) }]}>
                {driverPersonal.emergencyContactNumber
                  ? `${driverPersonal.emergencyContactName || 'Contact'}: +91 ${driverPersonal.emergencyContactNumber}`
                  : 'Recommended for safety'}
              </PartnerText>
            </View>
            <View style={styles.alertActionBtn}>
              <PartnerText style={[styles.alertActionText, { fontSize: px(11.5) }]}>
                {emergencyOpen ? 'Hide' : driverPersonal.emergencyContactNumber ? 'Edit' : '+ Add'}
              </PartnerText>
            </View>
          </Pressable>
          {emergencyOpen ? (
            <View style={{ marginTop: px(10), gap: px(8) }}>
              <View>
                <PartnerText style={[styles.inputLabel, { fontSize: px(12), marginBottom: px(4) }]}>
                  Contact name
                </PartnerText>
                <View style={[styles.inputContainer, { height: px(44), paddingHorizontal: px(10), backgroundColor: '#FFFFFF' }]}>
                  <User size={px(16)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
                  <PartnerTextInput
                    style={[styles.textInput, { fontSize: px(13.5), flex: 1 }]}
                    placeholder="Name (e.g. brother)"
                    placeholderTextColor="#9CA3AF"
                    maxLength={35}
                    autoCapitalize="words"
                    value={driverPersonal.emergencyContactName ?? ''}
                    onChangeText={(text) =>
                      setDriverPersonal({
                        emergencyContactName: text.replace(/[^a-zA-Z\s.-]/g, ''),
                      })
                    }
                  />
                </View>
              </View>
              <View>
                <PartnerText style={[styles.inputLabel, { fontSize: px(12), marginBottom: px(4) }]}>
                  Mobile number
                </PartnerText>
                <View style={[styles.inputContainer, { height: px(44), paddingHorizontal: px(10), backgroundColor: '#FFFFFF' }]}>
                  <PartnerText style={[styles.countryPrefix, { fontSize: px(13.5) }]}>+91</PartnerText>
                  <PartnerTextInput
                    style={[styles.textInput, { fontSize: px(13.5), flex: 1 }]}
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholder="10-digit number"
                    placeholderTextColor="#9CA3AF"
                    value={driverPersonal.emergencyContactNumber ?? ''}
                    onChangeText={(emergencyContactNumber) =>
                      setDriverPersonal({
                        emergencyContactNumber: emergencyContactNumber.replace(/[^0-9]/g, '').slice(0, 10),
                      })
                    }
                  />
                </View>
              </View>
            </View>
          ) : null}
        </View>

        <View style={[styles.cardDivider, { marginTop: px(4), marginBottom: px(12) }]} />

        {/* Work type is a choice only for a driver who registers themselves.
            A vendor-added driver is always full-time fleet staff. */}
        {vendorStaffOnboarding ? null : (
        <View style={[styles.inputGroup, { marginBottom: px(14) }]}>
          <View style={styles.inputLabelRow}>
            <PartnerText style={[styles.inputLabel, { fontSize: px(12) }]}>
              Employment / work type <PartnerText style={styles.requiredAsterisk}>*</PartnerText>
            </PartnerText>
          </View>

          <View style={{ gap: px(8), marginTop: px(4) }}>
            {/* Card 1: Full-Time Partner Driver */}
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: (driverPersonal.driverType || 'Full-Time') === 'Full-Time' }}
              onPress={() => {
                setDriverPersonal({ driverType: 'Full-Time' });
                setDriverVehicle({ vehicleType: 'Full-Time' });
              }}
              style={({ pressed }) => [
                styles.choiceCard,
                (driverPersonal.driverType || 'Full-Time') === 'Full-Time' && styles.choiceCardSelected,
                pressed && styles.pressed,
              ]}>
              <View style={styles.choiceHeaderRow}>
                <View style={[styles.choiceRadioCircle, (driverPersonal.driverType || 'Full-Time') === 'Full-Time' && styles.choiceRadioSelected]}>
                  {(driverPersonal.driverType || 'Full-Time') === 'Full-Time' && (
                    <View style={styles.choiceRadioInnerDot} />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: px(8) }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <PartnerText style={[styles.choiceTitle, { fontSize: px(13.5) }]}>
                      Full-Time Partner Driver
                    </PartnerText>
                    <View style={[styles.badgeSoftAmber, { paddingHorizontal: px(6), paddingVertical: px(2), borderRadius: px(4) }]}>
                      <PartnerText style={[styles.badgeSoftAmberText, { fontSize: px(9.5) }]}>
                        High Earning
                      </PartnerText>
                    </View>
                  </View>
                  <PartnerText style={[styles.choiceDesc, { fontSize: px(11), marginTop: px(2) }]}>
                    Vendor fleet · fixed daily & trip pay
                  </PartnerText>
                </View>
              </View>
            </Pressable>

            {/* Card 2: Part-Time Flexible Driver */}
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: driverPersonal.driverType === 'Part-Time' }}
              onPress={() => {
                setDriverPersonal({ driverType: 'Part-Time' });
                setDriverVehicle({ vehicleType: 'Part-Time' });
              }}
              style={({ pressed }) => [
                styles.choiceCard,
                driverPersonal.driverType === 'Part-Time' && styles.choiceCardSelected,
                pressed && styles.pressed,
              ]}>
              <View style={styles.choiceHeaderRow}>
                <View style={[styles.choiceRadioCircle, driverPersonal.driverType === 'Part-Time' && styles.choiceRadioSelected]}>
                  {driverPersonal.driverType === 'Part-Time' && (
                    <View style={styles.choiceRadioInnerDot} />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: px(8) }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <PartnerText style={[styles.choiceTitle, { fontSize: px(13.5) }]}>
                      Part-Time Flexible Driver
                    </PartnerText>
                    <View style={[styles.badgeSoftBlue, { paddingHorizontal: px(6), paddingVertical: px(2), borderRadius: px(4) }]}>
                      <PartnerText style={[styles.badgeSoftBlueText, { fontSize: px(9.5) }]}>
                        Flexible Hours
                      </PartnerText>
                    </View>
                  </View>
                  <PartnerText style={[styles.choiceDesc, { fontSize: px(11), marginTop: px(2) }]}>
                    On-demand hours · direct customer gigs
                  </PartnerText>
                </View>
              </View>
            </Pressable>
          </View>
        </View>
        )}

        {/* Driving Licence Number */}
        <View style={[styles.inputGroup, { marginBottom: px(12) }]}>
          <View style={styles.inputLabelRow}>
            <PartnerText style={[styles.inputLabel, { fontSize: px(12) }]}>
              Driving licence number <PartnerText style={styles.requiredAsterisk}>*</PartnerText>
            </PartnerText>
            <PartnerText
              style={[
                styles.charCountText,
                {
                  fontSize: px(11),
                  fontWeight: '600',
                  color:
                    (driverPersonal.licenseNumber || driverVehicle.licenseNumber).length >= 10
                      ? '#059669'
                      : '#9CA3AF',
                },
              ]}>
              [{(driverPersonal.licenseNumber || driverVehicle.licenseNumber).length}/18]
            </PartnerText>
          </View>
          <View
            style={[
              styles.inputContainer,
              personalErrors.licenseNumber && styles.inputContainerError,
              { height: px(48), paddingHorizontal: px(12) },
              licenceFocused && styles.inputContainerFocused,
            ]}>
            <FileText
              size={px(18)}
              color={personalErrors.licenseNumber ? '#DC2626' : licenceFocused ? '#D97706' : '#9CA3AF'}
              strokeWidth={2.2}
              style={styles.leftInputIcon}
            />
            <LicenceInput
              style={[
                styles.textInput,
                {
                  fontSize: px(13.5),
                  fontWeight: '700',
                  color: '#111827',
                  letterSpacing: 0.6,
                  flex: 1,
                  paddingVertical: 0,
                  includeFontPadding: false,
                  textAlignVertical: 'center',
                },
              ]}
              placeholder="DL number e.g. OD-0220190012"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={18}
              numberOfLines={1}
              scrollEnabled={false}
              allowFontScaling={false}
              value={driverPersonal.licenseNumber || driverVehicle.licenseNumber}
              onFocus={() => setLicenceFocused(true)}
              onBlur={() => setLicenceFocused(false)}
              onChangeText={(text) => {
                const val = text.replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
                setDriverPersonal({ licenseNumber: val });
                setDriverVehicle({ licenseNumber: val });
                clearPersonalError('licenseNumber');
              }}
            />
          </View>
          {personalErrors.licenseNumber ? (
            <PartnerText style={[styles.errorText, { fontSize: px(11) }]}>{personalErrors.licenseNumber}</PartnerText>
          ) : null}
        </View>

        {/* Driving Experience Chips */}
        <View style={[styles.inputGroup, { marginBottom: px(12) }]}>
          <PartnerText style={[styles.inputLabel, { fontSize: px(12), marginBottom: px(6) }]}>
            Commercial driving experience <PartnerText style={[styles.optionalText, { fontSize: px(11) }]}>[Years]</PartnerText>
          </PartnerText>
          <View style={{ flexDirection: 'row', gap: px(8) }}>
            {['1-2 yrs', '3-5 yrs', '5-10 yrs', '10+ yrs'].map((exp) => {
              const isSelected =
                driverPersonal.yearsOfExperience === exp ||
                (!driverPersonal.yearsOfExperience && exp === '3-5 yrs');
              return (
                <Pressable
                  key={exp}
                  onPress={() => setDriverPersonal({ yearsOfExperience: exp })}
                  style={[styles.expChip, isSelected && styles.expChipSelected]}>
                  <PartnerText style={[styles.expChipText, isSelected && styles.expChipTextSelected]}>
                    {exp}
                  </PartnerText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Zero Vehicle Ownership Notice */}
        <View style={[styles.blueNoticeBanner, { paddingVertical: px(9), paddingHorizontal: px(10), borderRadius: px(8), marginTop: px(4) }]}>
          <View style={styles.noticeBannerRow}>
            <Info size={px(15)} color="#2563EB" />
            <PartnerText style={[styles.noticeBannerText, { fontSize: px(11), flex: 1 }]}>
              No vehicle needed. Vendors supply tow trucks; customers supply driver-hire cars.
            </PartnerText>
          </View>
        </View>
      </View>
      {licenceFocused ? <View style={{ height: px(280) }} /> : null}
    </View>
  );

  const renderDocRow = (doc: DriverDocumentConfig, isConditional: boolean = false) => {
    const uploaded = isDocUploaded(doc.id);
    const uploadedData = getUploadedDoc(doc.id);
    const Icon = doc.Icon;

    return (
      <View
        key={doc.id}
        style={[
          styles.docRow,
          {
            paddingVertical: px(7),
            paddingHorizontal: px(10),
            marginBottom: px(6),
            borderRadius: px(8),
          },
          uploaded && styles.docRowUploaded,
        ]}>
        <View
          style={[
            styles.docIconBox,
            {
              width: px(32),
              height: px(32),
              borderRadius: px(6),
              backgroundColor: uploaded ? '#DCFCE7' : doc.iconBg || '#FEF3C7',
            },
          ]}>
          {uploaded ? (
            <Check size={px(16)} color="#15803D" strokeWidth={2.8} />
          ) : (
            <Icon size={px(16)} color={doc.iconColor || '#D97706'} strokeWidth={2.2} />
          )}
        </View>

        <View style={styles.docTextWrap}>
          <PartnerText numberOfLines={1} style={[styles.docTitle, { fontSize: px(12.5) }]}>
            {doc.title}
          </PartnerText>
          {uploaded ? (
            <PartnerText numberOfLines={1} style={[styles.docSubtitleUploaded, { fontSize: px(10.5) }]}>
              {uploadedData?.name || `${doc.id}_verified.jpg`}
            </PartnerText>
          ) : doc.id === 'government_photo_id' ? (
            <PartnerText numberOfLines={1} style={[styles.docSubtitle, { fontSize: px(10) }]}>
              Aadhaar or another accepted ID
            </PartnerText>
          ) : doc.id === 'owner_noc' ? (
            <PartnerText numberOfLines={1} style={[styles.docSubtitle, { fontSize: px(10) }]}>
              Only when vehicle is registered to someone else
            </PartnerText>
          ) : null}
        </View>

        <View style={styles.badgeWrap}>
          {uploaded ? (
            <View style={styles.badgeUploaded}>
              <PartnerText style={[styles.badgeUploadedText, { fontSize: px(10.5) }]}>Uploaded</PartnerText>
            </View>
          ) : isConditional ? (
            <View style={styles.badgeConditional}>
              <PartnerText style={[styles.badgeConditionalText, { fontSize: px(10.5) }]}>Conditional</PartnerText>
            </View>
          ) : (
            <View style={styles.badgeRequired}>
              <PartnerText style={[styles.badgeRequiredText, { fontSize: px(10.5) }]}>Required</PartnerText>
            </View>
          )}
        </View>

        <View style={styles.docActionWrap}>
          {uploaded ? (
            <View style={styles.actionButtonGroup}>
              <Pressable
                hitSlop={6}
                onPress={() =>
                  uploadedData &&
                  setPreviewDocData({
                    title: doc.title,
                    uri: uploadedData.uri,
                    name: uploadedData.name,
                    mimeType: uploadedData.mimeType,
                  })
                }
                style={({ pressed }) => [
                  styles.iconActionBtn,
                  { backgroundColor: '#EFF6FF' },
                  pressed && styles.pressed,
                ]}>
                <Eye size={px(12)} color="#2563EB" />
              </Pressable>

              <Pressable
                hitSlop={6}
                onPress={() => setActiveDocForUpload(doc)}
                style={({ pressed }) => [
                  styles.iconActionBtn,
                  { backgroundColor: '#F3F4F6' },
                  pressed && styles.pressed,
                ]}>
                <RefreshCw size={px(12)} color="#4B5563" />
              </Pressable>

              <Pressable
                hitSlop={6}
                onPress={() => removeDriverDocument(doc.id)}
                style={({ pressed }) => [
                  styles.iconActionBtn,
                  { backgroundColor: '#FEF2F2' },
                  pressed && styles.pressed,
                ]}>
                <Trash2 size={px(12)} color="#EF4444" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              hitSlop={8}
              onPress={() => setActiveDocForUpload(doc)}
              style={({ pressed }) => [
                styles.uploadBtn,
                { height: px(28), paddingHorizontal: px(8), borderRadius: px(6) },
                pressed && styles.pressed,
              ]}>
              <Upload size={px(12)} color="#374151" strokeWidth={2.4} />
              <PartnerText style={[styles.uploadBtnText, { fontSize: px(11) }]}>Upload</PartnerText>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const renderStep3Documents = () => (
    <View>
      <View style={[styles.card, { padding: px(12), marginBottom: px(10) }]}>
        {/* Card Header Row */}
        <View style={styles.cardHeaderRow}>
          <View style={[styles.headerIconBox, { width: px(34), height: px(34), borderRadius: px(8) }]}>
            <FileText size={px(17)} color="#D97706" strokeWidth={2.4} />
          </View>
          <View style={styles.headerTextWrap}>
            <PartnerText style={[styles.cardHeaderTitle, { fontSize: px(14.5) }]}>
              Documents for verification
            </PartnerText>
            <PartnerText numberOfLines={1} style={[styles.cardHeaderSubtitle, { fontSize: px(11.5) }]}>
              Upload clear, readable photos or PDFs.
            </PartnerText>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Section 1: Needed for review */}
        <View style={[styles.sectionContainer, { marginBottom: px(8) }]}>
          <PartnerText style={[styles.sectionTitle, { fontSize: px(13), marginBottom: px(6) }]}>
            Needed for review
          </PartnerText>

          {CORE_REVIEW_DOCUMENTS.map((doc) => renderDocRow(doc, false))}
        </View>

        {CONDITIONAL_DOCUMENTS.length > 0 ? (
          <View style={[styles.sectionContainer, { marginBottom: px(8) }]}>
            <PartnerText style={[styles.sectionTitle, { fontSize: px(13), marginBottom: px(6) }]}>
              Only when applicable
            </PartnerText>
            {CONDITIONAL_DOCUMENTS.map((doc) => renderDocRow(doc, true))}
          </View>
        ) : (
          <View
            style={[
              styles.blueNoticeBanner,
              { marginBottom: px(8), paddingVertical: px(9), paddingHorizontal: px(10), borderRadius: px(8) },
            ]}>
            <View style={styles.noticeBannerRow}>
              <Info size={px(15)} color="#2563EB" />
              <PartnerText style={[styles.noticeBannerText, { fontSize: px(11) }]}>
                A Driver account does not need vehicle registration papers. Towing Vendors add and verify fleet vehicles separately.
              </PartnerText>
            </View>
          </View>
        )}

        {/* Collapsible 1: Payout details */}
        <Pressable
          onPress={() => setExpandedLater1(!expandedLater1)}
          style={({ pressed }) => [
            styles.collapsibleRow,
            { paddingVertical: px(8), paddingHorizontal: px(10), borderRadius: px(8) },
            pressed && styles.pressed,
          ]}>
          <PartnerText numberOfLines={1} style={[styles.collapsibleRowTitle, { fontSize: px(12) }]}>
            Before first payout — PAN and bank details
          </PartnerText>
          <View style={styles.badgeLater}>
            <PartnerText style={[styles.badgeLaterText, { fontSize: px(10.5) }]}>Later</PartnerText>
          </View>
          {expandedLater1 ? (
            <ChevronUp size={px(16)} color="#6B7280" />
          ) : (
            <ChevronDown size={px(16)} color="#6B7280" />
          )}
        </Pressable>
        {expandedLater1 ? (
          <View style={{ marginTop: px(4), marginBottom: px(6) }}>
            {renderDocRow(LATER_DOCUMENTS[0], true)}
          </View>
        ) : null}

        {/* Collapsible 2: Additional checks */}
        <Pressable
          onPress={() => setExpandedLater2(!expandedLater2)}
          style={({ pressed }) => [
            styles.collapsibleRow,
            { paddingVertical: px(8), paddingHorizontal: px(10), borderRadius: px(8), marginTop: px(6) },
            pressed && styles.pressed,
          ]}>
          <PartnerText numberOfLines={1} style={[styles.collapsibleRowTitle, { fontSize: px(12) }]}>
            Additional checks — Police verification / medical fitness
          </PartnerText>
          <View style={styles.badgeLater}>
            <PartnerText style={[styles.badgeLaterText, { fontSize: px(10.5) }]}>If requested</PartnerText>
          </View>
          {expandedLater2 ? (
            <ChevronUp size={px(16)} color="#6B7280" />
          ) : (
            <ChevronDown size={px(16)} color="#6B7280" />
          )}
        </Pressable>
        {expandedLater2 ? (
          <View style={{ marginTop: px(4) }}>
            {renderDocRow(LATER_DOCUMENTS[1], true)}
          </View>
        ) : null}
      </View>

      {/* Bottom Security Note */}
      <View style={[styles.securityNoteRow, { marginBottom: px(12) }]}>
        <ShieldCheck size={px(15)} color="#D97706" strokeWidth={2.2} style={{ marginRight: px(6) }} />
        <PartnerText style={[styles.securityNoteText, { fontSize: px(11.5) }]}>
          We only use your documents for partner verification.
        </PartnerText>
      </View>
    </View>
  );

  // -------------------------------------------------------------
  // Render Step 4: Review
  // -------------------------------------------------------------
  const renderStep4Review = () => (
    <View style={styles.step4Container}>
      {/* Compact Dynamic Status Banner */}
      {isResubmitApplication ? (
        <View
          style={[
            styles.statusSuccessCard,
            { paddingVertical: px(6), paddingHorizontal: px(10), marginBottom: px(8), borderRadius: px(8) },
          ]}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.successIconCircle,
                { width: px(22), height: px(22), borderRadius: px(11) },
              ]}>
              <CheckCircle2 size={px(14)} color="#15803D" strokeWidth={2.4} />
            </View>
            <View style={styles.statusTextWrap}>
              <PartnerText style={[styles.statusSuccessTitle, { fontSize: px(12) }]}>Re-submission mode</PartnerText>
              <PartnerText style={[styles.statusSuccessSubtitle, { fontSize: px(10.5) }]}>
                Review your updated details below and tap Re-submit.
              </PartnerText>
            </View>
          </View>
        </View>
      ) : isAllCoreComplete ? (
        <View
          style={[
            styles.statusSuccessCard,
            { paddingVertical: px(6), paddingHorizontal: px(10), marginBottom: px(8), borderRadius: px(8) },
          ]}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.successIconCircle,
                { width: px(22), height: px(22), borderRadius: px(11) },
              ]}>
              <CheckCircle2 size={px(14)} color="#15803D" strokeWidth={2.4} />
            </View>
            <View style={styles.statusTextWrap}>
              <PartnerText style={[styles.statusSuccessTitle, { fontSize: px(12) }]}>Ready to submit</PartnerText>
              <PartnerText style={[styles.statusSuccessSubtitle, { fontSize: px(10.5) }]}>
                All required information and documents are complete.
              </PartnerText>
            </View>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.statusWarningCard,
            { paddingVertical: px(6), paddingHorizontal: px(10), marginBottom: px(8), borderRadius: px(8) },
          ]}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.warningIconCircle,
                { width: px(22), height: px(22), borderRadius: px(11) },
              ]}>
              <AlertCircle size={px(14)} color="#D97706" strokeWidth={2.4} />
            </View>
            <View style={styles.statusTextWrap}>
              <PartnerText style={[styles.statusWarningTitle, { fontSize: px(12) }]}>
                {coreUploadedCount} of {CORE_REVIEW_DOCUMENTS.length} review items complete
              </PartnerText>
              <PartnerText style={[styles.statusWarningSubtitle, { fontSize: px(10.5) }]}>
                {missingCoreDocs.length} pending document{missingCoreDocs.length > 1 ? 's' : ''}.
              </PartnerText>
            </View>
            <Pressable
              hitSlop={8}
              onPress={() => {
                setReturnToReviewAfterEdit(true);
                animateToStep(3, 'backward');
              }}
              style={[styles.statusRightActionBtn, { paddingVertical: px(3), paddingHorizontal: px(7) }]}>
              <PartnerText style={[styles.statusRightActionText, { fontSize: px(10.5) }]}>+ Add →</PartnerText>
            </Pressable>
          </View>
        </View>
      )}

      {/* Unified Compact Review Card (3 sections matching Board 1 Screen 4) */}
      <View style={[styles.summaryCard, { padding: px(10), marginBottom: px(8), borderRadius: px(12) }]}>
        {/* Section 1: Personal Details */}
        <View style={[styles.summarySectionCol, !reviewExpanded.personal && styles.summarySectionClosed]}>
          <Pressable onPress={() => toggleReviewSection('personal')} style={styles.summarySectionHeader}>
            <View style={styles.summarySectionLeft}>
              <View style={[styles.headerCheckBadge, { width: px(18), height: px(18), borderRadius: px(9) }]}>
                <Check size={px(11)} color="#15803D" strokeWidth={3} />
              </View>
              <View style={[styles.sectionIconWrap, { width: px(28), height: px(28), borderRadius: px(6) }]}>
                <User size={px(15)} color="#D97706" />
              </View>
              <View style={styles.summaryTitleRow}>
                <PartnerText style={[styles.summaryTitle, { fontSize: px(13) }]}>Personal details</PartnerText>
                <View style={[styles.checkedPill, { paddingHorizontal: px(5), paddingVertical: px(1), borderRadius: px(4) }]}>
                  <PartnerText style={[styles.checkedPillText, { fontSize: px(9.5) }]}>Checked</PartnerText>
                </View>
              </View>
            </View>
            <View style={styles.summarySectionRight}>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  setReturnToReviewAfterEdit(true);
                  animateToStep(1, 'backward');
                }}
                style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.8 }]}>
                <PartnerText style={[styles.editText, { fontSize: px(12) }]}>Edit</PartnerText>
                <ChevronRight size={px(13)} color="#2563EB" />
              </Pressable>
              <View style={styles.sectionDropdownBtn}>
                {reviewExpanded.personal ? (
                  <ChevronUp size={px(16)} color="#374151" strokeWidth={2.4} />
                ) : (
                  <ChevronDown size={px(16)} color="#374151" strokeWidth={2.4} />
                )}
              </View>
            </View>
          </Pressable>

          {reviewExpanded.personal && (
            <View style={[styles.reviewDetailsBox, { paddingHorizontal: px(10), paddingVertical: px(4), marginTop: px(8), borderRadius: px(8) }]}>
              {[
                ['Name', driverPersonal.fullName || '—'],
                ['Mobile', driverPersonal.mobileNumber ? `+91 ${driverPersonal.mobileNumber}` : '—'],
                ['Date of birth', driverPersonal.dateOfBirth || '—'],
                ['City', [driverPersonal.city, driverPersonal.state].filter(Boolean).join(', ') || '—'],
                ['PIN code', driverPersonal.pincode || '—'],
                ['Address', driverPersonal.address || '—'],
              ].map(([label, value]) => (
                <View key={label} style={styles.reviewFieldRow}>
                  <PartnerText style={[styles.reviewFieldLabel, { fontSize: px(12) }]}>{label}</PartnerText>
                  <PartnerText style={[styles.reviewFieldValue, { fontSize: px(12.5) }]}>{value}</PartnerText>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.cardDividerCompact, { marginVertical: px(7) }]} />

        {/* Section 2: Driver Details */}
        <View style={[styles.summarySectionCol, !reviewExpanded.driverDetails && styles.summarySectionClosed]}>
          <Pressable onPress={() => toggleReviewSection('driverDetails')} style={styles.summarySectionHeader}>
            <View style={styles.summarySectionLeft}>
              <View style={[styles.headerCheckBadge, { width: px(18), height: px(18), borderRadius: px(9) }]}>
                <Check size={px(11)} color="#15803D" strokeWidth={3} />
              </View>
              <View style={[styles.sectionIconWrap, { width: px(28), height: px(28), borderRadius: px(6) }]}>
                <User size={px(15)} color="#D97706" />
              </View>
              <View style={styles.summaryTitleRow}>
                <PartnerText style={[styles.summaryTitle, { fontSize: px(13) }]}>Driver details</PartnerText>
                <View style={[styles.checkedPill, { paddingHorizontal: px(5), paddingVertical: px(1), borderRadius: px(4) }]}>
                  <PartnerText style={[styles.checkedPillText, { fontSize: px(9.5) }]}>Checked</PartnerText>
                </View>
              </View>
            </View>
            <View style={styles.summarySectionRight}>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  setReturnToReviewAfterEdit(true);
                  animateToStep(1, 'backward');
                }}
                style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.8 }]}>
                  <PartnerText style={[styles.editText, { fontSize: px(12) }]}>Edit</PartnerText>
                  <ChevronRight size={px(13)} color="#2563EB" />
              </Pressable>
              <View style={styles.sectionDropdownBtn}>
                {reviewExpanded.driverDetails ? (
                  <ChevronUp size={px(16)} color="#374151" strokeWidth={2.4} />
                ) : (
                  <ChevronDown size={px(16)} color="#374151" strokeWidth={2.4} />
                )}
              </View>
            </View>
          </Pressable>

          {reviewExpanded.driverDetails && (
            <View style={[styles.reviewDetailsBox, { paddingHorizontal: px(10), paddingVertical: px(4), marginTop: px(8), borderRadius: px(8) }]}>
              {[
                ...(vendorStaffOnboarding
                  ? []
                  : [['Work type', driverPersonal.driverType || 'Full-Time'] as [string, string]]),
                ['Licence number', driverPersonal.licenseNumber || driverVehicle.licenseNumber || '—'],
                ['Experience', driverPersonal.yearsOfExperience || '—'],
              ].map(([label, value]) => (
                <View key={label} style={styles.reviewFieldRow}>
                  <PartnerText style={[styles.reviewFieldLabel, { fontSize: px(12) }]}>{label}</PartnerText>
                  <PartnerText style={[styles.reviewFieldValue, { fontSize: px(12.5) }]}>{value}</PartnerText>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.cardDividerCompact, { marginVertical: px(7) }]} />

        {/* Section 3: Documents */}
        <View style={[styles.summarySectionCol, !reviewExpanded.documents && styles.summarySectionClosed]}>
          <Pressable onPress={() => toggleReviewSection('documents')} style={styles.summarySectionHeader}>
            <View style={styles.summarySectionLeft}>
              <View
                style={[
                  styles.headerCheckBadge,
                  { width: px(18), height: px(18), borderRadius: px(9) },
                  !isAllCoreComplete && { backgroundColor: '#FEF3C7' },
                ]}>
                {isAllCoreComplete ? (
                  <Check size={px(11)} color="#15803D" strokeWidth={3} />
                ) : (
                  <PartnerText style={{ fontSize: px(9.5), fontWeight: '700', color: '#D97706' }}>!</PartnerText>
                )}
              </View>
              <View style={[styles.sectionIconWrap, { width: px(28), height: px(28), borderRadius: px(6) }]}>
                <FileText size={px(15)} color="#D97706" />
              </View>
              <View style={styles.summaryTitleRow}>
                <PartnerText style={[styles.summaryTitle, { fontSize: px(13) }]}>Documents</PartnerText>
                <View
                  style={[
                    styles.checkedPill,
                    { paddingHorizontal: px(5), paddingVertical: px(1), borderRadius: px(4) },
                    !isAllCoreComplete && { backgroundColor: '#FEF3C7' },
                  ]}>
                  <PartnerText
                    style={[
                      styles.checkedPillText,
                      { fontSize: px(9.5) },
                      !isAllCoreComplete && { color: '#B45309' },
                    ]}>
                    {coreUploadedCount}/{CORE_REVIEW_DOCUMENTS.length} Checked
                  </PartnerText>
                </View>
              </View>
            </View>
            <View style={styles.summarySectionRight}>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  setReturnToReviewAfterEdit(true);
                  animateToStep(2, 'backward');
                }}
                style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.8 }]}>
                <PartnerText style={[styles.editText, { fontSize: px(12) }]}>Edit</PartnerText>
                <ChevronRight size={px(13)} color="#2563EB" />
              </Pressable>
              <View style={styles.sectionDropdownBtn}>
                {reviewExpanded.documents ? (
                  <ChevronUp size={px(16)} color="#374151" strokeWidth={2.4} />
                ) : (
                  <ChevronDown size={px(16)} color="#374151" strokeWidth={2.4} />
                )}
              </View>
            </View>
          </Pressable>

          {reviewExpanded.documents && (
            <View style={[styles.reviewDetailsBox, { paddingHorizontal: px(10), paddingVertical: px(4), marginTop: px(8), borderRadius: px(8) }]}>
              {CORE_REVIEW_DOCUMENTS.map((doc) => {
                const uploaded = isDocUploaded(doc.id);
                return (
                  <View key={doc.id} style={styles.reviewFieldRow}>
                    <PartnerText style={[styles.reviewFieldLabel, { fontSize: px(12), width: undefined, flex: 1 }]}>
                      {doc.title}
                    </PartnerText>
                    <PartnerText
                      style={[
                        styles.reviewFieldValue,
                        { fontSize: px(12.5), flex: 0, color: uploaded ? '#047857' : '#B45309' },
                      ]}>
                      {uploaded ? 'Uploaded' : 'Pending'}
                    </PartnerText>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* Blue Informational Banner */}
      <View
        style={[
          styles.blueNoticeBanner,
          { paddingVertical: px(6), paddingHorizontal: px(10), marginBottom: px(8), borderRadius: px(8) },
        ]}>
        <View style={styles.noticeBannerRow}>
          <View
            style={[
              styles.noticeIconBox,
              { width: px(20), height: px(20), borderRadius: px(10) },
            ]}>
            <Info size={px(12)} color="#2563EB" strokeWidth={2.2} />
          </View>
          <PartnerText style={[styles.noticeBannerText, { fontSize: px(10.5), flex: 1 }]}>
            Verification typically takes 2 to 4 hours after submission.
          </PartnerText>
        </View>
      </View>

      {/* Confirmation Checkbox */}
      <Pressable
        onPress={() => setConfirmAgreed(!confirmAgreed)}
        style={[styles.checkboxContainer, { marginBottom: px(6) }]}>
        <View
          style={[
            styles.checkboxBox,
            { width: px(17), height: px(17), borderRadius: px(4) },
            confirmAgreed && styles.checkboxBoxChecked,
          ]}>
          {confirmAgreed ? <Check size={px(11)} color="#FFFFFF" strokeWidth={3} /> : null}
        </View>
        <PartnerText style={[styles.checkboxLabel, { fontSize: px(11) }]}>
          I confirm all details are genuine and agree to RACE{' '}
          <PartnerText
            style={styles.linkText}
            onPress={() => void Linking.openURL('https://www.raceservice.in/terms.html')}>
            Terms
          </PartnerText>{' '}
          &{' '}
          <PartnerText
            style={styles.linkText}
            onPress={() => void Linking.openURL('https://www.raceservice.in/terms.html')}>
            Privacy
          </PartnerText>
          .
        </PartnerText>
      </Pressable>
    </View>
  );

  return (
    <DriverRegistrationLayout
      step={currentStep}
      title="Driver registration"
      onBack={handleFlowBack}
      onContinue={handleFlowContinue}
      continueLabel={getContinueLabel()}
      continueDisabled={currentStep === 3 ? !confirmAgreed || submitting : false}
      continueLoading={currentStep === 3 ? submitting : false}
      showFooter={true}>
      {partnerDialog}
      {/* Animated Sliding Container: only form cards slide smoothly! */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        }}>
        {currentStep === 1 && renderStep1PersonalInfo()}
        {currentStep === 2 && renderStep3Documents()}
        {currentStep === 3 && renderStep4Review()}
      </Animated.View>

      {/* ----------------- MODALS ----------------- */}

      {/* Interactive DOB Floating Calendar Modal (Step 1) */}
      <Modal visible={calendarModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setCalendarModalVisible(false)}>
          <Pressable
            style={[styles.calendarModalBox, { padding: px(14), borderRadius: px(14) }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <PartnerText style={[styles.sheetTitle, { fontSize: px(15) }]}>Select Date of Birth</PartnerText>
              <Pressable hitSlop={12} onPress={() => setCalendarModalVisible(false)}>
                <X size={px(18)} color="#4B5563" />
              </Pressable>
            </View>

            {/* Quick Year Scroll Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.yearScrollContent}>
              {QUICK_YEARS.map((y) => {
                const isYearActive = calendarYear === y;
                return (
                  <Pressable
                    key={y}
                    onPress={() => {
                      setCalendarYear(y);
                      setModalInputYear(String(y));
                    }}
                    style={[styles.yearChip, isYearActive && styles.yearChipActive]}>
                    <PartnerText style={[styles.yearChipText, isYearActive && styles.yearChipTextActive]}>
                      {y}
                    </PartnerText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Month Header Navigation: < Month YYYY > */}
            <View style={[styles.monthNavRow, { marginBottom: px(6) }]}>
              <Pressable
                onPress={() => {
                  if (calendarMonth === 1) {
                    setCalendarMonth(12);
                    setCalendarYear((y) => y - 1);
                    setModalInputYear(String(calendarYear - 1));
                    setModalInputMonth('12');
                  } else {
                    const nextM = calendarMonth - 1;
                    setCalendarMonth(nextM);
                    setModalInputMonth(String(nextM).padStart(2, '0'));
                  }
                }}
                hitSlop={10}
                style={styles.navArrowBtn}>
                <ChevronLeft size={px(18)} color="#111827" strokeWidth={2.4} />
              </Pressable>

              <PartnerText style={[styles.monthNavTitle, { fontSize: px(13.5) }]}>
                {FULL_MONTH_NAMES[calendarMonth - 1]} {calendarYear}
              </PartnerText>

              <Pressable
                onPress={() => {
                  if (calendarMonth === 12) {
                    setCalendarMonth(1);
                    setCalendarYear((y) => y + 1);
                    setModalInputYear(String(calendarYear + 1));
                    setModalInputMonth('01');
                  } else {
                    const nextM = calendarMonth + 1;
                    setCalendarMonth(nextM);
                    setModalInputMonth(String(nextM).padStart(2, '0'));
                  }
                }}
                hitSlop={10}
                style={styles.navArrowBtn}>
                <ChevronRight size={px(18)} color="#111827" strokeWidth={2.4} />
              </Pressable>
            </View>

            {/* Weekday Row */}
            <View style={styles.weekdayRow}>
              {WEEKDAY_HEADERS.map((w) => (
                <PartnerText key={w} style={styles.weekdayText}>
                  {w}
                </PartnerText>
              ))}
            </View>

            {/* Calendar Day Grid */}
            <View style={styles.dayGridWrap}>
              {Array.from({ length: getFirstDayOfWeek(calendarYear, calendarMonth) }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.dayCellEmpty} />
              ))}
              {Array.from({ length: getDaysInMonth(calendarYear, calendarMonth) }).map((_, i) => {
                const dayNum = i + 1;
                const isSelected = calendarDay === dayNum;
                return (
                  <Pressable
                    key={`day-${dayNum}`}
                    onPress={() => {
                      setCalendarDay(dayNum);
                      setModalInputDay(String(dayNum).padStart(2, '0'));
                    }}
                    style={[styles.dayCell, isSelected && styles.dayCellSelected]}>
                    <PartnerText style={[styles.dayCellText, isSelected && styles.dayCellTextSelected]}>
                      {dayNum}
                    </PartnerText>
                  </Pressable>
                );
              })}
            </View>

            {/* Manual Direct Input Fields */}
            <View style={[styles.modalManualRow, { marginVertical: px(8) }]}>
              <View style={styles.manualInputGroup}>
                <PartnerText style={styles.manualInputLabel}>Day (DD)</PartnerText>
                <PartnerTextInput
                  style={styles.manualInputField}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={modalInputDay}
                  onChangeText={(v) => {
                    setModalInputDay(v);
                    const d = parseInt(v, 10);
                    if (d >= 1 && d <= 31) setCalendarDay(d);
                  }}
                />
              </View>
              <PartnerText style={styles.manualDivider}>/</PartnerText>
              <View style={styles.manualInputGroup}>
                <PartnerText style={styles.manualInputLabel}>Month (MM)</PartnerText>
                <PartnerTextInput
                  style={styles.manualInputField}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={modalInputMonth}
                  onChangeText={(v) => {
                    setModalInputMonth(v);
                    const m = parseInt(v, 10);
                    if (m >= 1 && m <= 12) setCalendarMonth(m);
                  }}
                />
              </View>
              <PartnerText style={styles.manualDivider}>/</PartnerText>
              <View style={[styles.manualInputGroup, { flex: 1.4 }]}>
                <PartnerText style={styles.manualInputLabel}>Year (YYYY)</PartnerText>
                <PartnerTextInput
                  style={styles.manualInputField}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={modalInputYear}
                  onChangeText={(v) => {
                    setModalInputYear(v);
                    const y = parseInt(v, 10);
                    if (y >= 1950 && y <= 2010) setCalendarYear(y);
                  }}
                />
              </View>
            </View>

            <Pressable
              onPress={confirmCalendarSelection}
              style={[styles.primaryModalBtn, { height: px(40), borderRadius: px(8) }]}>
              <PartnerText style={[styles.primaryModalBtnText, { fontSize: px(13.5) }]}>Set Date of Birth</PartnerText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* City Selector Modal (Step 1) */}
      <Modal visible={cityModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setCityModalVisible(false)}>
          <Pressable
            style={[styles.modalSheet, { maxHeight: px(450), borderTopLeftRadius: px(16), borderTopRightRadius: px(16) }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <PartnerText style={[styles.sheetTitle, { fontSize: px(15) }]}>Select Operating City</PartnerText>
              <Pressable hitSlop={12} onPress={() => setCityModalVisible(false)}>
                <X size={px(18)} color="#4B5563" />
              </Pressable>
            </View>
            <View style={[styles.modalSearchContainer, { height: px(40), marginBottom: px(10) }]}>
              <Search size={px(16)} color="#9CA3AF" style={{ marginRight: px(6) }} />
              <PartnerTextInput
                style={[styles.modalSearchInput, { fontSize: px(13) }]}
                placeholder="Search city..."
                placeholderTextColor="#9CA3AF"
                value={citySearch}
                onChangeText={setCitySearch}
              />
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredCities.map((c) => {
                const isSelected = driverPersonal.city === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => {
                      setDriverPersonal({ city: c });
                      setCityModalVisible(false);
                      setCitySearch('');
                    }}
                    style={({ pressed }) => [
                      styles.cityRow,
                      { paddingVertical: px(10) },
                      isSelected && styles.cityRowSelected,
                      pressed && styles.pressed,
                    ]}>
                    <PartnerText
                      style={[
                        styles.cityText,
                        { fontSize: px(13) },
                        isSelected && styles.cityTextSelected,
                      ]}>
                      {c}
                    </PartnerText>
                    {isSelected ? <Check size={px(16)} color="#D97706" strokeWidth={2.5} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>




      {/* Upload Action Sheet Modal (Step 3) */}
      <Modal visible={!!activeDocForUpload} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setActiveDocForUpload(null)}>
          <Pressable
            style={[styles.modalSheet, { paddingBottom: px(28), borderRadius: px(16) }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View>
                <PartnerText style={[styles.sheetTitle, { fontSize: px(15) }]}>
                  Upload {activeDocForUpload?.title}
                </PartnerText>
                <PartnerText style={[styles.sheetSubtitle, { fontSize: px(11.5) }]}>
                  Choose photo or document file
                </PartnerText>
              </View>
              <Pressable hitSlop={12} onPress={() => setActiveDocForUpload(null)}>
                <X size={px(18)} color="#4B5563" />
              </Pressable>
            </View>

            {/* Android Permission & Privacy Assurance Banner */}
            <View style={styles.permissionInfoBanner}>
              <ShieldCheck size={px(14)} color="#059669" />
              <PartnerText style={styles.permissionInfoText}>
                Android permissions are requested only to capture and verify official documents securely.
              </PartnerText>
            </View>

            {/* Option 1: Camera */}
            <Pressable
              onPress={() => activeDocForUpload && handlePickFromCamera(activeDocForUpload)}
              style={({ pressed }) => [styles.uploadOptionRow, { paddingVertical: px(10) }, pressed && styles.pressed]}>
              <View style={[styles.uploadOptionIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Camera size={px(18)} color="#D97706" />
              </View>
              <View style={styles.uploadOptionTextWrap}>
                <PartnerText style={[styles.uploadOptionTitle, { fontSize: px(13) }]}>Take photo</PartnerText>
                <PartnerText style={[styles.uploadOptionSubtitle, { fontSize: px(11) }]}>
                  Camera • Photo capture with auto-crop
                </PartnerText>
              </View>
              <ChevronRight size={px(16)} color="#9CA3AF" />
            </Pressable>

            {/* Option 2: Gallery */}
            <Pressable
              onPress={() => activeDocForUpload && handlePickFromGallery(activeDocForUpload)}
              style={({ pressed }) => [styles.uploadOptionRow, { paddingVertical: px(10) }, pressed && styles.pressed]}>
              <View style={[styles.uploadOptionIconBox, { backgroundColor: '#EFF6FF' }]}>
                <ImageIcon size={px(18)} color="#2563EB" />
              </View>
              <View style={styles.uploadOptionTextWrap}>
                <PartnerText style={[styles.uploadOptionTitle, { fontSize: px(13) }]}>Choose from gallery</PartnerText>
                <PartnerText style={[styles.uploadOptionSubtitle, { fontSize: px(11) }]}>
                  Photos • JPG or PNG from gallery
                </PartnerText>
              </View>
              <ChevronRight size={px(16)} color="#9CA3AF" />
            </Pressable>

            {/* Option 3: Document File */}
            <Pressable
              onPress={() => activeDocForUpload && handlePickFromFiles(activeDocForUpload)}
              style={({ pressed }) => [styles.uploadOptionRow, { paddingVertical: px(10) }, pressed && styles.pressed]}>
              <View style={[styles.uploadOptionIconBox, { backgroundColor: '#F3F4F6' }]}>
                <FileUp size={px(18)} color="#4B5563" />
              </View>
              <View style={styles.uploadOptionTextWrap}>
                <PartnerText style={[styles.uploadOptionTitle, { fontSize: px(13) }]}>Select PDF document</PartnerText>
                <PartnerText style={[styles.uploadOptionSubtitle, { fontSize: px(11) }]}>
                  Files • PDF files up to 10 MB
                </PartnerText>
              </View>
              <ChevronRight size={px(16)} color="#9CA3AF" />
            </Pressable>

            {UI_PREVIEW_MODE && isUiTestPermissiveMode() ? (
              <Pressable
                onPress={() => activeDocForUpload && handlePickSample(activeDocForUpload)}
                style={({ pressed }) => [
                  styles.uploadOptionRow,
                  styles.sampleOptionRow,
                  { paddingVertical: px(10), marginTop: px(8), borderRadius: px(8) },
                  pressed && styles.pressed,
                ]}>
                <View style={[styles.uploadOptionIconBox, { backgroundColor: '#DCFCE7' }]}>
                  <Sparkles size={px(18)} color="#15803D" />
                </View>
                <View style={styles.uploadOptionTextWrap}>
                  <PartnerText style={[styles.uploadOptionTitle, { color: '#166534', fontSize: px(13) }]}>
                    Use verified sample document
                  </PartnerText>
                  <PartnerText style={[styles.uploadOptionSubtitle, { color: '#15803D', fontSize: px(11) }]}>
                    Fast testing & QA preview
                  </PartnerText>
                </View>
                <Check size={px(16)} color="#15803D" strokeWidth={2.5} />
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Upload Progress Animation Modal (Step 3) */}
      <Modal visible={!!uploadProgressState} transparent animationType="fade">
        <View style={styles.progressModalOverlay}>
          <View style={[styles.progressModalBox, { padding: px(18), borderRadius: px(12) }]}>
            {uploadProgressState?.isComplete ? (
              <View style={styles.progressSuccessCircle}>
                <CheckCircle2 size={px(40)} color="#15803D" strokeWidth={2.4} />
              </View>
            ) : (
              <View style={styles.progressSpinnerWrap}>
                <ActivityIndicator size="large" color="#D97706" />
              </View>
            )}

            <PartnerText style={[styles.progressDocTitle, { fontSize: px(14.5) }]}>
              {uploadProgressState?.doc.title}
            </PartnerText>

            <PartnerText style={[styles.progressStatusText, { fontSize: px(11.5) }]}>
              {uploadProgressState?.statusText}
            </PartnerText>

            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${uploadProgressState?.progress || 0}%`,
                    backgroundColor: uploadProgressState?.isComplete ? '#15803D' : '#D97706',
                  },
                ]}
              />
            </View>

            <PartnerText style={[styles.progressPercentText, { fontSize: px(10.5) }]}>
              {uploadProgressState?.progress}%
            </PartnerText>
          </View>
        </View>
      </Modal>

      {/* Preview Modal (Step 3) */}
      <Modal visible={!!previewDocData} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setPreviewDocData(null)}>
          <Pressable
            style={[styles.modalSheet, { paddingBottom: px(24), maxHeight: px(500), borderRadius: px(16) }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View>
                <PartnerText style={[styles.sheetTitle, { fontSize: px(15) }]}>
                  {previewDocData?.title}
                </PartnerText>
                <PartnerText style={[styles.sheetSubtitle, { fontSize: px(11) }]}>
                  {previewDocData?.name}
                </PartnerText>
              </View>
              <Pressable hitSlop={12} onPress={() => setPreviewDocData(null)}>
                <X size={px(18)} color="#4B5563" />
              </Pressable>
            </View>

            {previewDocData?.uri ? (
              previewDocData.mimeType === 'application/pdf' ||
              previewDocData.name?.toLowerCase().endsWith('.pdf') ? (
                <View style={[styles.pdfPreviewContainer, { height: px(200), marginVertical: px(10) }]}>
                  <FileText size={px(54)} color="#EF4444" />
                  <PartnerText style={[styles.pdfFileName, { fontSize: px(13) }]} numberOfLines={2}>
                    {previewDocData.name}
                  </PartnerText>
                  <View style={styles.pdfVerifiedBadge}>
                    <ShieldCheck size={px(12)} color="#15803D" />
                    <PartnerText style={[styles.pdfVerifiedText, { fontSize: px(11) }]}>
                      PDF Document Ready & Verified
                    </PartnerText>
                  </View>
                </View>
              ) : (
                <View style={[styles.previewImageContainer, { height: px(250), marginVertical: px(10) }]}>
                  <Image source={{ uri: previewDocData.uri }} style={styles.previewImage} resizeMode="cover" />
                </View>
              )
            ) : null}

            <Pressable
              onPress={() => setPreviewDocData(null)}
              style={[styles.closePreviewBtn, { height: px(40), borderRadius: px(8) }]}>
              <PartnerText style={styles.closePreviewBtnText}>Close Preview</PartnerText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Previous Details Modal Picker */}
      <Modal visible={editSectionModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setEditSectionModalVisible(false)}>
          <Pressable
            style={[styles.editPickerModalBox, { padding: px(16), borderRadius: px(16) }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View>
                <PartnerText style={[styles.sheetTitle, { fontSize: px(15) }]}>Edit previous details</PartnerText>
                <PartnerText style={[styles.sheetSubtitle, { fontSize: px(11.5), color: '#6B7280' }]}>
                  Select a section to modify before submission
                </PartnerText>
              </View>
              <Pressable hitSlop={12} onPress={() => setEditSectionModalVisible(false)}>
                <X size={px(18)} color="#4B5563" />
              </Pressable>
            </View>

            <View style={{ marginTop: px(10) }}>
              {/* Option 1: Personal & Driver Details */}
              <Pressable
                onPress={() => {
                  setEditSectionModalVisible(false);
                  setReturnToReviewAfterEdit(true);
                  animateToStep(1, 'backward');
                }}
                style={({ pressed }) => [styles.pickerOptionCard, pressed && styles.pressed]}>
                <View style={[styles.pickerIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <User size={px(18)} color="#D97706" />
                </View>
                <View style={styles.pickerTextWrap}>
                  <PartnerText style={[styles.pickerTitle, { fontSize: px(13.5) }]}>1. Personal & Driver details</PartnerText>
                  <PartnerText style={[styles.pickerSubtitle, { fontSize: px(11) }]}>
                    Name, DOB, address, DL number & work preference
                  </PartnerText>
                </View>
                <ChevronRight size={px(16)} color="#9CA3AF" />
              </Pressable>

              {/* Option 2: Documents */}
              <Pressable
                onPress={() => {
                  setEditSectionModalVisible(false);
                  setReturnToReviewAfterEdit(true);
                  animateToStep(2, 'backward');
                }}
                style={({ pressed }) => [styles.pickerOptionCard, pressed && styles.pressed]}>
                <View style={[styles.pickerIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <FileText size={px(18)} color="#D97706" />
                </View>
                <View style={styles.pickerTextWrap}>
                  <PartnerText style={[styles.pickerTitle, { fontSize: px(13.5) }]}>2. Uploaded documents</PartnerText>
                  <PartnerText style={[styles.pickerSubtitle, { fontSize: px(11) }]}>
                    Driving licence, profile photo, Aadhaar card, PAN card
                  </PartnerText>
                </View>
                <ChevronRight size={px(16)} color="#9CA3AF" />
              </Pressable>
            </View>

            <Pressable
              onPress={() => setEditSectionModalVisible(false)}
              style={[styles.pickerCancelBtn, { marginTop: px(12), paddingVertical: px(10), borderRadius: px(10) }]}>
              <PartnerText style={[styles.pickerCancelText, { fontSize: px(13) }]}>Cancel</PartnerText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </DriverRegistrationLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 0,
    shadowOpacity: 0,
    shadowColor: 'transparent',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardHeaderTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  cardHeaderSubtitle: {
    color: '#6B7280',
    marginTop: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
  },
  headerIconBox: {
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTextWrap: {
    flex: 1,
  },
  inputGroup: {
    width: '100%',
  },
  inputLabel: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  requiredAsterisk: {
    color: '#DC2626',
    fontWeight: '700',
  },
  optionalText: {
    fontWeight: '400',
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputContainerError: {
    borderColor: '#EF4444',
    borderWidth: 1.4,
    backgroundColor: '#FFF7F7',
  },
  errorText: {
    color: '#DC2626',
    marginTop: 5,
    fontSize: 11,
    lineHeight: 15,
  },
  inputContainerFocused: {
    borderColor: '#D97706',
    backgroundColor: '#FFFDF5',
  },
  lockedInputContainer: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  lockedTextInput: {
    color: '#374151',
    fontWeight: '600',
  },
  addressInputContainer: {
    alignItems: 'flex-start',
  },
  leftInputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: '#111827',
    paddingVertical: 0,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  textValue: {
    flex: 1,
    color: '#111827',
    fontWeight: '500',
  },
  textPlaceholder: {
    color: '#9CA3AF',
  },
  calendarIconButton: {
    padding: 6,
  },
  multilineInput: {
    textAlignVertical: 'top',
    height: '100%',
  },
  countryPrefix: {
    color: '#374151',
    fontWeight: '600',
    marginRight: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 4,
  },
  verifiedText: {
    color: '#15803D',
    fontWeight: '700',
  },
  alertBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  alertContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIconCircle: {
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  alertTextWrap: {
    flex: 1,
    marginRight: 6,
  },
  alertTitle: {
    fontWeight: '600',
    color: '#92400E',
  },
  alertSubtitle: {
    color: '#B45309',
    marginTop: 1,
  },
  alertActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  alertActionText: {
    color: '#D97706',
    fontWeight: '700',
  },
  // Step 2 Vehicle Cards
  vehicleRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  vehicleCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  vehicleCardSelected: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  vehicleCardIdle: {
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  artworkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  vehicleCardLabel: {
    fontWeight: '700',
    textAlign: 'center',
  },
  vehicleCardLabelSelected: {
    color: '#B45309',
  },
  vehicleCardLabelIdle: {
    color: '#374151',
  },
  radioGroup: {
    gap: 4,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  radioCircleActive: {
    borderColor: '#D97706',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D97706',
  },
  radioTextWrap: {
    flex: 1,
  },
  radioLabel: {
    fontWeight: '600',
    color: '#1F2937',
  },
  radioSubLabel: {
    color: '#6B7280',
    marginTop: 1,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginTop: 2,
  },
  noticeIconCircle: {
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeText: {
    flex: 1,
    color: '#334155',
    fontWeight: '500',
    lineHeight: 15,
  },
  // Step 3 Document Rows
  sectionContainer: {
    width: '100%',
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  docRowUploaded: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  docIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  docTextWrap: {
    flex: 1,
    marginRight: 6,
  },
  docTitle: {
    fontWeight: '600',
    color: '#111827',
  },
  docSubtitle: {
    color: '#6B7280',
    marginTop: 1,
  },
  docSubtitleUploaded: {
    color: '#15803D',
    fontWeight: '500',
    marginTop: 1,
  },
  badgeWrap: {
    marginRight: 6,
  },
  badgeRequired: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  badgeRequiredText: {
    color: '#B45309',
    fontWeight: '600',
  },
  badgeUploaded: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  badgeUploadedText: {
    color: '#15803D',
    fontWeight: '600',
  },
  badgeConditional: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  badgeConditionalText: {
    color: '#2563EB',
    fontWeight: '600',
  },
  badgeLater: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
    marginRight: 6,
  },
  badgeLaterText: {
    color: '#2563EB',
    fontWeight: '600',
  },
  docActionWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    gap: 4,
  },
  uploadBtnText: {
    color: '#374151',
    fontWeight: '600',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsibleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  collapsibleRowTitle: {
    fontWeight: '500',
    color: '#374151',
    flex: 1,
    marginRight: 6,
  },
  securityNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityNoteText: {
    color: '#6B7280',
    fontWeight: '500',
  },
  // Step 4 Review
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 0,
    shadowOpacity: 0,
    shadowColor: 'transparent',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerCheckBadge: {
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  checkedPill: {
    backgroundColor: '#DCFCE7',
    marginLeft: 6,
  },
  checkedPillText: {
    color: '#15803D',
    fontWeight: '700',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  editText: {
    color: '#2563EB',
    fontWeight: '600',
  },
  statusRightActionBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  statusRightActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  detailLabel: {
    color: '#6B7280',
    fontWeight: '500',
    flexShrink: 0,
    maxWidth: '45%',
  },
  detailValue: {
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  charCountText: {
    color: '#9CA3AF',
    fontWeight: '500',
  },
  docsSummaryText: {
    color: '#374151',
    fontWeight: '600',
  },
  docsList: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 3,
  },
  docSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docCheckCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  docSummaryName: {
    flex: 1,
    color: '#111827',
    fontWeight: '500',
  },
  docSummaryNameMissing: {
    color: '#9CA3AF',
  },
  docSummaryStatus: {
    fontWeight: '700',
  },
  docRightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docChangeActionText: {
    color: '#2563EB',
    fontWeight: '600',
  },
  docAddActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 2,
  },
  docAddActionText: {
    color: '#B45309',
    fontWeight: '700',
  },
  docStatusGreen: {
    color: '#15803D',
  },
  docStatusAmber: {
    color: '#D97706',
  },
  statusSuccessCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statusWarningCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successIconCircle: {
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  warningIconCircle: {
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statusTextWrap: {
    flex: 1,
  },
  statusSuccessTitle: {
    fontWeight: '700',
    color: '#166534',
  },
  statusSuccessSubtitle: {
    color: '#15803D',
    marginTop: 1,
  },
  statusWarningTitle: {
    fontWeight: '700',
    color: '#92400E',
  },
  statusWarningSubtitle: {
    color: '#B45309',
    marginTop: 1,
  },
  missingChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  missingChip: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  missingChipText: {
    color: '#B45309',
    fontWeight: '600',
  },
  blueNoticeBanner: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  noticeBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noticeIconBox: {
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  noticeBannerText: {
    flex: 1,
    color: '#1E40AF',
    lineHeight: 16,
    fontWeight: '500',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkboxBox: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxBoxChecked: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  checkboxLabel: {
    flex: 1,
    color: '#4B5563',
    lineHeight: 16,
  },
  linkText: {
    color: '#2563EB',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  saveLaterLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  saveLaterText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  // Modal Common
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  sheetSubtitle: {
    color: '#6B7280',
    marginTop: 1,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
  },
  modalSearchInput: {
    flex: 1,
    color: '#111827',
    paddingVertical: 0,
  },
  modalApplyBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },
  modalApplyText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  labelWithActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  browseDropdownLink: {
    color: '#D97706',
    fontWeight: '700',
  },
  dropdownChevronBtn: {
    paddingLeft: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cityRowSelected: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    borderRadius: 6,
    borderBottomColor: 'transparent',
  },
  cityText: {
    color: '#374151',
    fontWeight: '500',
  },
  cityTextSelected: {
    color: '#D97706',
    fontWeight: '700',
  },
  dobHint: {
    color: '#6B7280',
  },
  simpleInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    color: '#111827',
  },
  primaryModalBtn: {
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryModalBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Floating Calendar Modal
  calendarModalBox: {
    width: '92%',
    alignSelf: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
    backgroundColor: '#FFFFFF',
  },
  yearScrollContent: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
    marginBottom: 6,
  },
  yearChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  yearChipActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  yearChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  yearChipTextActive: {
    color: '#FFFFFF',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navArrowBtn: {
    padding: 4,
  },
  monthNavTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    width: 32,
    textAlign: 'center',
  },
  dayGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 32,
  },
  dayCellSelected: {
    backgroundColor: '#F59E0B',
  },
  dayCellText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937',
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalManualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  manualInputGroup: {
    flex: 1,
  },
  manualInputLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  manualInputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    height: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  manualDivider: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 10,
  },
  // Upload Sheet
  permissionInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
    gap: 8,
  },
  permissionInfoText: {
    flex: 1,
    fontSize: 11,
    color: '#166534',
    lineHeight: 15,
  },
  uploadOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  uploadOptionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  uploadOptionTextWrap: {
    flex: 1,
  },
  uploadOptionTitle: {
    fontWeight: '600',
    color: '#111827',
  },
  uploadOptionSubtitle: {
    color: '#6B7280',
    marginTop: 1,
  },
  sampleOptionRow: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  // Progress Modal
  progressModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  progressModalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  progressSpinnerWrap: {
    marginBottom: 12,
  },
  progressSuccessCircle: {
    marginBottom: 12,
  },
  progressDocTitle: {
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 3,
  },
  progressStatusText: {
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 14,
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercentText: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  // Preview Modal
  previewImageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  pdfPreviewContainer: {
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  pdfFileName: {
    fontWeight: '700',
    color: '#991B1B',
    textAlign: 'center',
  },
  pdfVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pdfVerifiedText: {
    color: '#15803D',
    fontWeight: '600',
  },
  closePreviewBtn: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePreviewBtnText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13,
  },
  step4Container: {
    width: '100%',
  },
  summarySectionCol: {
    paddingVertical: 4,
  },
  summarySectionClosed: {
    paddingVertical: 10,
    minHeight: 52,
    justifyContent: 'center',
  },
  summarySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summarySectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  summarySectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  summarySectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionDropdownBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  reviewFieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  reviewFieldLabel: {
    width: 108,
    color: '#6B7280',
    fontWeight: '500',
  },
  reviewFieldValue: {
    flex: 1,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'right',
  },
  sectionIconWrap: {
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  summaryTextGroup: {
    flex: 1,
  },
  summaryTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  summaryTitle: {
    flexShrink: 1,
    fontWeight: '700',
    color: '#111827',
  },
  summarySubtitle: {
    color: '#6B7280',
    marginTop: 1,
  },
  reviewDetailsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  reviewPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 1.5,
  },
  reviewPointDot: {
    backgroundColor: '#D97706',
    marginRight: 6,
  },
  reviewPointText: {
    color: '#4B5563',
    fontWeight: '500',
    flex: 1,
  },
  reviewPointBold: {
    color: '#111827',
    fontWeight: '700',
  },
  reviewDocTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 1,
    marginBottom: 2,
  },
  docReviewTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  docReviewTagText: {
    color: '#065F46',
    fontWeight: '600',
  },
  cardDividerCompact: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  editPreviousBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  editPreviousLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editPreviousLabel: {
    fontWeight: '700',
    color: '#92400E',
  },
  editPreviousRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  editPreviousActionText: {
    color: '#B45309',
    fontWeight: '600',
  },
  editPickerModalBox: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 360,
  },
  pickerOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  pickerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pickerTextWrap: {
    flex: 1,
    marginRight: 6,
  },
  pickerTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  pickerSubtitle: {
    color: '#6B7280',
    marginTop: 2,
  },
  pickerCancelBtn: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCancelText: {
    color: '#374151',
    fontWeight: '600',
  },
  choiceCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 0,
  },
  choiceCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#F0F7FF',
  },
  choiceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  choiceRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  choiceRadioSelected: {
    borderColor: '#2563EB',
  },
  choiceRadioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  choiceTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  choiceDesc: {
    color: '#6B7280',
    lineHeight: 16,
  },
  choicePerk: {
    color: '#059669',
    fontWeight: '600',
  },
  badgeSoftAmber: {
    backgroundColor: '#FEF3C7',
  },
  badgeSoftAmberText: {
    color: '#B45309',
    fontWeight: '700',
  },
  badgeSoftBlue: {
    backgroundColor: '#DBEAFE',
  },
  badgeSoftBlueText: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  expChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expChipSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  expChipText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 12,
  },
  expChipTextSelected: {
    color: '#2563EB',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
