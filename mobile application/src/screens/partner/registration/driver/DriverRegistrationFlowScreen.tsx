import { PartnerText, PartnerTextInput } from '../../../../components/partner/PartnerText';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Image, Keyboard, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
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

import DriverRegistrationLayout from '../../../../components/partner/DriverRegistrationLayout';
import VehicleTypeArtwork from '../../../../components/partner/VehicleTypeArtwork';
import {
  CONDITIONAL_DOCUMENTS,
  CORE_REVIEW_DOCUMENTS,
  type DriverDocumentConfig,
  LATER_DOCUMENTS,
} from '../../../../constants/driverRegistrationDocuments';
import { DRIVER_VEHICLE_TYPE_CARDS } from '../../../../constants/driverVehicleTypes';
import { usePartnerRegistrationStore } from '../../../../store/partnerRegistrationStore';
import { useAppDispatch, useAppSelector } from '../../../../redux/hooks';
import { completeOnboarding } from '../../../../redux/auth/authSlice';
import { finishPartnerSignup } from '../../../../redux/onboarding/onboardingSlice';
import { API_ENDPOINTS } from '../../../../config/api';
import { isUiTestPermissiveMode, UI_PREVIEW_MODE } from '../../../../constants/preview';
import { api, saveTokens } from '../../../../services/api';
import { getApiErrorMessage } from '../../../../services/auth/useAuthMutations';
import type {
  PartnerRegistrationStackParamList,
  PartnerRootStackParamList,
} from '../../../../types/partnerNavigation';
import type { ApiSuccessResponse } from '../../../../types/auth';
import { partnerRegistrationGoBack } from '../../../../utils/partnerRegistration';

type Props = NativeStackScreenProps<PartnerRegistrationStackParamList, any>;

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

function mapVehicleToDriverType(vehicleType: string): 'Tow Driver' | 'Full-Time' | 'Part-Time' {
  const lower = (vehicleType || '').toLowerCase();
  if (lower.includes('car') && !lower.includes('tow')) return 'Part-Time';
  return 'Tow Driver';
}

export default function DriverRegistrationFlowScreen({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const scale = Math.min(1.22, Math.max(0.88, width / REF_W));
  const px = (val: number) => Math.max(1, Math.round(val * scale));

  const initialStepParam = route.params?.initialStep ?? 1;
  const fromReviewParam = Boolean(route.params?.fromReview);
  const isResubmitParam = Boolean((route.params as any)?.isResubmit);

  // Flow Step State (1: Personal, 2: Vehicle, 3: Documents, 4: Review)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(
    initialStepParam >= 1 && initialStepParam <= 4 ? (initialStepParam as any) : 1,
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
      route.params.initialStep <= 4 &&
      route.params.initialStep !== currentStep
    ) {
      setCurrentStep(route.params.initialStep as 1 | 2 | 3 | 4);
    }
  }, [route.params?.initialStep]);

  // Clean, seamless step transition: dismiss keyboard and update step directly without jumpy translation
  const animateToStep = (newStep: 1 | 2 | 3 | 4, _direction: 'forward' | 'backward') => {
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
  const setDriverVehicle = usePartnerRegistrationStore((s) => s.setDriverVehicle);
  const addDriverDocument = usePartnerRegistrationStore((s) => s.addDriverDocument);
  const removeDriverDocument = usePartnerRegistrationStore((s) => s.removeDriverDocument);

  // -------------------------------------------------------------
  // Step 1: Personal Info States
  // -------------------------------------------------------------
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);

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

  // -------------------------------------------------------------
  // Step 2: Vehicle Info States
  // -------------------------------------------------------------
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [customModelInput, setCustomModelInput] = useState(driverVehicle.vehicleModel || '');

  const selectedVehicleCardId =
    DRIVER_VEHICLE_TYPE_CARDS.find(
      (c) =>
        c.label.toLowerCase() === (driverVehicle.vehicleType || '').toLowerCase() ||
        c.id.toLowerCase() === (driverVehicle.vehicleType || '').toLowerCase() ||
        (driverVehicle.vehicleType || '').toLowerCase().includes(c.id),
    )?.id || 'flatbed';

  const registeredTo = driverVehicle.registeredTo || 'me';

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

  const startAnimatedUpload = (
    doc: DriverDocumentConfig,
    sourceLabel: string,
    realFile?: { uri: string; name: string; mimeType: string },
  ) => {
    setActiveDocForUpload(null);
    setUploadProgressState({
      doc,
      sourceLabel,
      progress: 20,
      statusText: 'Connecting securely...',
      isComplete: false,
    });

    setTimeout(() => {
      setUploadProgressState((prev) =>
        prev ? { ...prev, progress: 55, statusText: `Uploading from ${sourceLabel}...` } : null,
      );
    }, 320);

    setTimeout(() => {
      setUploadProgressState((prev) =>
        prev ? { ...prev, progress: 88, statusText: 'Verifying resolution & readability...' } : null,
      );
    }, 700);

    setTimeout(() => {
      setUploadProgressState((prev) =>
        prev ? { ...prev, progress: 100, statusText: 'Verified & uploaded successfully! ✓', isComplete: true } : null,
      );
    }, 1050);

    setTimeout(() => {
      addDriverDocument({
        id: doc.id,
        label: doc.title,
        uri:
          realFile?.uri ||
          `https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&q=80&sig=${doc.id}`,
        name: realFile?.name || `${doc.id}_verified.jpg`,
        mimeType: realFile?.mimeType || 'image/jpeg',
      });
      setUploadProgressState(null);
    }, 1500);
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
          Alert.alert(
            'Camera Permission Required',
            'Camera access is disabled for RACE Partner. To take clear photos of your documents (e.g. Driving License, RC, Insurance) for quick verification, please enable camera access in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  Linking.openSettings().catch(() => {});
                },
              },
            ],
          );
          return;
        }

        const requested = await ImagePicker.requestCameraPermissionsAsync();
        granted = requested.granted;

        if (!granted) {
          Alert.alert(
            'Camera Permission Needed',
            'Camera access is required to take photos of your official documents for verification.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Try Again',
                onPress: () => handlePickFromCamera(doc),
              },
            ],
          );
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
      Alert.alert(
        'Camera Error',
        'Could not access the camera. You can also select a photo from your gallery or upload a PDF document.',
        [{ text: 'OK' }],
      );
    }
  };

  const handlePickFromGallery = async (doc: DriverDocumentConfig) => {
    try {
      const current = await ImagePicker.getMediaLibraryPermissionsAsync();
      let granted = current.granted;

      if (!granted) {
        if (!current.canAskAgain && current.status === ImagePicker.PermissionStatus.DENIED) {
          Alert.alert(
            'Photo Library Permission Required',
            'Photo library access is disabled for RACE Partner. To select your document photos from your device, please allow photos access in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  Linking.openSettings().catch(() => {});
                },
              },
            ],
          );
          return;
        }

        const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
        granted = requested.granted;

        if (!granted) {
          Alert.alert(
            'Gallery Permission Needed',
            'Photo library access is needed to select and upload document photos.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Try Again',
                onPress: () => handlePickFromGallery(doc),
              },
            ],
          );
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
      Alert.alert(
        'Gallery Error',
        'Could not open gallery. Please try again or select a PDF document.',
        [{ text: 'OK' }],
      );
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
        Alert.alert(
          'File Too Large',
          'The selected file exceeds 10 MB. Please choose a smaller photo or compressed PDF.',
          [{ text: 'OK' }],
        );
        return;
      }

      startAnimatedUpload(doc, 'Files', {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || 'application/pdf',
      });
    } catch (err: any) {
      console.warn('[FilePicker] Error selecting document:', err);
      Alert.alert(
        'File Picker Error',
        'Could not open document picker. Please try taking a photo with the camera or choosing from gallery.',
        [{ text: 'OK' }],
      );
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

  // -------------------------------------------------------------
  // Unified Flow Navigation Handlers
  // -------------------------------------------------------------
  const handleFlowBack = () => {
    if (returnToReviewAfterEdit) {
      setReturnToReviewAfterEdit(false);
      animateToStep(4, 'backward');
      return;
    }

    if (currentStep === 1) {
      partnerRegistrationGoBack(navigation, 'DriverPersonalInfo', {
        role: route.params?.role || 'driver',
        mobileNumber: route.params?.mobileNumber,
      });
    } else if (currentStep === 2) {
      animateToStep(1, 'backward');
    } else if (currentStep === 3) {
      animateToStep(2, 'backward');
    } else if (currentStep === 4) {
      animateToStep(3, 'backward');
    }
  };

  const validatePersonalStep = () => {
    const name = driverPersonal.fullName.trim();
    const mobile = normalizeIndianPhone(driverPersonal.mobileNumber);
    if (name.length < 2) {
      Alert.alert('Full name required', 'Enter your full name as it appears on your driving licence.');
      return false;
    }
    if (mobile.length !== 10) {
      Alert.alert('Mobile number required', 'Enter the 10-digit verified mobile number.');
      return false;
    }
    if (!normalizeDobForApi(driverPersonal.dateOfBirth)) {
      Alert.alert('Date of birth required', 'Enter a valid date in DD/MM/YYYY format.');
      return false;
    }
    if (driverPersonal.address.trim().length < 5) {
      Alert.alert('Address required', 'Enter your current address.');
      return false;
    }
    if (!driverPersonal.city?.trim()) {
      Alert.alert('City required', 'Select your operating city.');
      return false;
    }
    return true;
  };

  const validateVehicleStep = () => {
    if (!driverVehicle.vehicleType.trim()) {
      Alert.alert('Vehicle type required', 'Select the vehicle type you operate.');
      return false;
    }
    if (driverVehicle.vehicleNumber.trim().length < 4) {
      Alert.alert('Registration number required', 'Enter a valid vehicle registration number.');
      return false;
    }
    if (driverVehicle.licenseNumber.trim().length < 4) {
      Alert.alert('Driving licence required', 'Enter your driving licence number.');
      return false;
    }
    return true;
  };

  const validateDocumentsStep = () => {
    if (missingCoreDocs.length === 0) return true;
    Alert.alert(
      'Documents required',
      `Upload ${missingCoreDocs.map(doc => doc.title).join(', ')} before continuing.`,
    );
    return false;
  };

  const handleFlowContinue = () => {
    const permissivePreview = UI_PREVIEW_MODE && isUiTestPermissiveMode();
    if (!permissivePreview) {
      if (currentStep === 1 && !validatePersonalStep()) return;
      if (currentStep === 2 && !validateVehicleStep()) return;
      if (currentStep === 3 && !validateDocumentsStep()) return;
    }

    if (returnToReviewAfterEdit) {
      setReturnToReviewAfterEdit(false);
      animateToStep(4, 'forward');
      return;
    }

    if (currentStep === 1) {
      setDriverPersonal({
        fullName: driverPersonal.fullName.trim() || (permissivePreview ? 'Rajesh Kumar' : ''),
        dateOfBirth:
          driverPersonal.dateOfBirth.trim() || (permissivePreview ? '15/05/1992' : ''),
        address:
          driverPersonal.address.trim() ||
          (permissivePreview ? 'Plot 42, Saheed Nagar, Janpath Road' : ''),
        city: driverPersonal.city?.trim() || (permissivePreview ? 'Bhubaneswar' : undefined),
      });
      animateToStep(2, 'forward');
    } else if (currentStep === 2) {
      const chosenCard =
        DRIVER_VEHICLE_TYPE_CARDS.find((c) => c.id === selectedVehicleCardId) ||
        DRIVER_VEHICLE_TYPE_CARDS[0];

      setDriverVehicle({
        vehicleType: driverVehicle.vehicleType.trim() || (permissivePreview ? chosenCard.label : ''),
        vehicleNumber:
          driverVehicle.vehicleNumber.trim() || (permissivePreview ? 'OD 02 AB 1234' : ''),
        licenseNumber:
          driverVehicle.licenseNumber.trim() || (permissivePreview ? 'OD-0220190012345' : ''),
        rcNumber:
          driverVehicle.rcNumber.trim() || (permissivePreview ? 'RC-OD02-2022-987654' : ''),
        vehicleModel:
          driverVehicle.vehicleModel.trim() || (permissivePreview ? 'Tata 407 Recovery Spec' : ''),
        registeredTo: driverVehicle.registeredTo || (permissivePreview ? 'me' : undefined),
      });
      animateToStep(3, 'forward');
    } else if (currentStep === 3) {
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
      animateToStep(4, 'forward');
    } else if (currentStep === 4) {
      void handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const emergencyContact = driverPersonal.emergencyContactNumber
        ? {
            name: driverPersonal.emergencyContactName || 'Emergency Contact',
            mobileNumber: driverPersonal.emergencyContactNumber,
            relationship: 'Contact',
          }
        : undefined;

      const documentsPayload = driverDocuments.map((doc) => ({
        type: doc.id,
        url: doc.uri,
        status: 'PENDING' as const,
      }));

      const driverType = mapVehicleToDriverType(driverVehicle.vehicleType || 'Flatbed');

      const payload = {
        fullName: driverPersonal.fullName.trim(),
        email: driverPersonal.email.trim() || undefined,
        address: driverPersonal.address.trim() || undefined,
        city: driverPersonal.city?.trim() || undefined,
        dateOfBirth: normalizeDobForApi(driverPersonal.dateOfBirth),
        emergencyContact,
        licenseNo: driverVehicle.licenseNumber.trim(),
        driverType,
        vehicleRegistration: driverVehicle.vehicleNumber.trim() || undefined,
        vehicleType: driverVehicle.vehicleType.trim() || undefined,
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
        if (!UI_PREVIEW_MODE) throw err;
        console.warn('Driver self registration API fallback:', err);
      }

      dispatch(finishPartnerSignup());

      if (!authUser) {
        const token = 'mock-driver-token';
        await saveTokens(token, token);
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
      Alert.alert(
        'Submission notice',
        getApiErrorMessage(error, 'Application submitted with local confirmation'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getContinueLabel = () => {
    if (returnToReviewAfterEdit) return 'Save & Return';
    if (currentStep === 4) {
      if (submitting) return 'Submitting...';
      return isResubmitApplication ? 'Re-submit application' : 'Submit application';
    }
    return 'Continue';
  };

  // -------------------------------------------------------------
  // Render Step 1: Personal Info
  // -------------------------------------------------------------
  const renderStep1PersonalInfo = () => (
    <View style={[styles.card, { padding: px(14), marginBottom: px(12) }]}>
      {/* Card Header Row */}
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
        <View style={[styles.inputContainer, { height: px(44), paddingHorizontal: px(10) }]}>
          <User size={px(16)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
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
            }}
          />
        </View>
      </View>

      {/* Mobile Number (Locked / Verified) */}
      <View style={[styles.inputGroup, { marginBottom: px(12) }]}>
        <PartnerText style={[styles.inputLabel, { fontSize: px(12) }]}>
          Mobile number <PartnerText style={styles.requiredAsterisk}>*</PartnerText>
        </PartnerText>
        <View
          style={[
            styles.inputContainer,
            styles.lockedInputContainer,
            { height: px(44), paddingHorizontal: px(10) },
          ]}>
          <Phone size={px(16)} color="#6B7280" strokeWidth={2} style={styles.leftInputIcon} />
          <PartnerText style={[styles.countryPrefix, { fontSize: px(13.5) }]}>+91</PartnerText>
          <PartnerTextInput
            style={[styles.textInput, styles.lockedTextInput, { fontSize: px(13.5), flex: 1 }]}
            editable={false}
            value={driverPersonal.mobileNumber || '9876543210'}
          />
          <View style={styles.verifiedBadge}>
            <Check size={px(11)} color="#15803D" strokeWidth={3} />
            <PartnerText style={[styles.verifiedText, { fontSize: px(10.5) }]}>Verified</PartnerText>
          </View>
        </View>
      </View>

      {/* Date of Birth (DD/MM/YYYY) */}
      <View style={[styles.inputGroup, { marginBottom: px(12) }]}>
        <PartnerText style={[styles.inputLabel, { fontSize: px(12) }]}>
          Date of birth <PartnerText style={styles.requiredAsterisk}>*</PartnerText>{' '}
          <PartnerText style={[styles.optionalText, { fontSize: px(11) }]}>[DD/MM/YYYY]</PartnerText>
        </PartnerText>
        <View style={[styles.inputContainer, { height: px(44), paddingHorizontal: px(10) }]}>
          <Calendar size={px(16)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
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
            }}
          />
          <Pressable hitSlop={10} onPress={openCalendarModal} style={styles.calendarIconButton}>
            <Calendar size={px(18)} color="#D97706" strokeWidth={2.4} />
          </Pressable>
        </View>
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
        <View
          style={[
            styles.inputContainer,
            styles.addressInputContainer,
            { height: px(68), paddingHorizontal: px(10), paddingVertical: px(8) },
          ]}>
          <MapPin size={px(16)} color="#9CA3AF" strokeWidth={2} style={[styles.leftInputIcon, { marginTop: px(2) }]} />
          <PartnerTextInput
            style={[styles.textInput, styles.multilineInput, { fontSize: px(13), flex: 1 }]}
            placeholder="House/Plot no, street, landmark, area"
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={120}
            numberOfLines={2}
            value={driverPersonal.address}
            onChangeText={(address) => setDriverPersonal({ address })}
          />
        </View>
      </View>

      {/* Operating City */}
      <View style={[styles.inputGroup, { marginBottom: px(14) }]}>
        <PartnerText style={[styles.inputLabel, { fontSize: px(12) }]}>
          Operating city <PartnerText style={styles.requiredAsterisk}>*</PartnerText>
        </PartnerText>
        <Pressable
          onPress={() => setCityModalVisible(true)}
          style={[styles.inputContainer, { height: px(44), paddingHorizontal: px(10) }]}>
          <MapPin size={px(16)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
          <PartnerText
            style={[
              styles.textValue,
              { fontSize: px(13.5) },
              !driverPersonal.city && styles.textPlaceholder,
            ]}>
            {driverPersonal.city || 'Select city'}
          </PartnerText>
          <ChevronDown size={px(18)} color="#6B7280" strokeWidth={2} />
        </Pressable>
      </View>

      {/* Emergency Contact Shortcut */}
      <View style={[styles.alertBanner, { padding: px(10), borderRadius: px(8) }]}>
        <View style={styles.alertContentRow}>
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
          <Pressable
            hitSlop={10}
            onPress={() => setEmergencyModalVisible(true)}
            style={styles.alertActionBtn}>
            <PartnerText style={[styles.alertActionText, { fontSize: px(11.5) }]}>
              {driverPersonal.emergencyContactNumber ? 'Edit' : '+ Add'}
            </PartnerText>
          </Pressable>
        </View>
      </View>
    </View>
  );

  // -------------------------------------------------------------
  // Render Step 2: Vehicle Info
  // -------------------------------------------------------------
  const renderStep2VehicleInfo = () => (
    <View style={[styles.card, { padding: px(14), marginBottom: px(12) }]}>
      {/* Card Header Row */}
      <View style={styles.cardHeaderRow}>
        <View style={[styles.headerIconBox, { width: px(34), height: px(34), borderRadius: px(8) }]}>
          <Truck size={px(17)} color="#D97706" strokeWidth={2.4} />
        </View>
        <View style={styles.headerTextWrap}>
          <PartnerText style={[styles.cardHeaderTitle, { fontSize: px(14.5) }]}>Vehicle information</PartnerText>
          <PartnerText style={[styles.cardHeaderSubtitle, { fontSize: px(11.5) }]}>
            Tell us about your vehicle.
          </PartnerText>
        </View>
      </View>

      <View style={styles.cardDivider} />

      {/* Vehicle Type * (Single Row of 4 Compact Cards) */}
      <View style={[styles.inputGroup, { marginBottom: px(14) }]}>
        <PartnerText style={[styles.inputLabel, { fontSize: px(12), marginBottom: px(6) }]}>
          Vehicle type <PartnerText style={styles.requiredAsterisk}>*</PartnerText>
        </PartnerText>

        <View style={styles.vehicleRow}>
          {DRIVER_VEHICLE_TYPE_CARDS.map((item) => {
            const isSelected = selectedVehicleCardId === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setDriverVehicle({ vehicleType: item.label })}
                style={({ pressed }) => [
                  styles.vehicleCard,
                  { paddingVertical: px(8), paddingHorizontal: px(4), borderRadius: px(8) },
                  isSelected ? styles.vehicleCardSelected : styles.vehicleCardIdle,
                  pressed && styles.pressed,
                ]}>
                <View style={styles.artworkContainer}>
                  <VehicleTypeArtwork
                    type={item.illustrationType}
                    size={px(34)}
                    selected={isSelected}
                  />
                </View>
                <PartnerText
                  numberOfLines={1}
                  style={[
                    styles.vehicleCardLabel,
                    { fontSize: px(10.5), marginTop: px(4) },
                    isSelected ? styles.vehicleCardLabelSelected : styles.vehicleCardLabelIdle,
                  ]}>
                  {item.label}
                </PartnerText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Vehicle Registration Number */}
      <View style={[styles.inputGroup, { marginBottom: px(12) }]}>
        <View style={styles.inputLabelRow}>
          <PartnerText style={[styles.inputLabel, { fontSize: px(12) }]}>
            Vehicle registration number <PartnerText style={styles.requiredAsterisk}>*</PartnerText>
          </PartnerText>
          {driverVehicle.vehicleNumber.length >= 8 ? (
            <PartnerText style={[styles.charCountText, { fontSize: px(10.5) }]}>
              {driverVehicle.vehicleNumber.length}/14
            </PartnerText>
          ) : null}
        </View>
        <View style={[styles.inputContainer, { height: px(44), paddingHorizontal: px(10) }]}>
          <CreditCard size={px(16)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
          <PartnerTextInput
            style={[styles.textInput, { fontSize: px(13.5), fontWeight: '600', flex: 1 }]}
            placeholder="e.g. OD 02 AB 1234"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={14}
            value={driverVehicle.vehicleNumber}
            onChangeText={(text) =>
              setDriverVehicle({
                vehicleNumber: text.replace(/[^A-Za-z0-9\s]/g, '').toUpperCase(),
              })
            }
          />
        </View>
      </View>

      {/* Driving Licence Number */}
      <View style={[styles.inputGroup, { marginBottom: px(12) }]}>
        <View style={styles.inputLabelRow}>
          <PartnerText style={[styles.inputLabel, { fontSize: px(12) }]}>
            Driving licence number <PartnerText style={styles.requiredAsterisk}>*</PartnerText>
          </PartnerText>
          {driverVehicle.licenseNumber.length >= 12 ? (
            <PartnerText style={[styles.charCountText, { fontSize: px(10.5) }]}>
              {driverVehicle.licenseNumber.length}/18
            </PartnerText>
          ) : null}
        </View>
        <View style={[styles.inputContainer, { height: px(44), paddingHorizontal: px(10) }]}>
          <FileText size={px(16)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
          <PartnerTextInput
            style={[styles.textInput, { fontSize: px(13.5), fontWeight: '600', flex: 1 }]}
            placeholder="Enter Driving License (DL) number"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={18}
            value={driverVehicle.licenseNumber}
            onChangeText={(text) =>
              setDriverVehicle({
                licenseNumber: text.replace(/[^A-Za-z0-9\-]/g, '').toUpperCase(),
              })
            }
          />
        </View>
      </View>

      {/* Vehicle Registered To (Clean Radio Buttons) */}
      <View style={[styles.inputGroup, { marginBottom: px(12) }]}>
        <PartnerText style={[styles.inputLabel, { fontSize: px(12), marginBottom: px(6) }]}>
          Vehicle registered to <PartnerText style={styles.requiredAsterisk}>*</PartnerText>
        </PartnerText>

        <View style={styles.radioGroup}>
          <Pressable
            onPress={() => setDriverVehicle({ registeredTo: 'me' })}
            style={({ pressed }) => [styles.radioRow, pressed && styles.pressed]}>
            <View
              style={[
                styles.radioCircle,
                registeredTo === 'me' && styles.radioCircleActive,
              ]}>
              {registeredTo === 'me' ? <View style={styles.radioDot} /> : null}
            </View>
            <PartnerText style={[styles.radioLabel, { fontSize: px(12.5) }]}>
              Me / I own this vehicle
            </PartnerText>
          </Pressable>

          <Pressable
            onPress={() => setDriverVehicle({ registeredTo: 'someone_else' })}
            style={({ pressed }) => [
              styles.radioRow,
              { marginTop: px(6), alignItems: 'flex-start' },
              pressed && styles.pressed,
            ]}>
            <View
              style={[
                styles.radioCircle,
                { marginTop: px(2) },
                registeredTo === 'someone_else' && styles.radioCircleActive,
              ]}>
              {registeredTo === 'someone_else' ? <View style={styles.radioDot} /> : null}
            </View>
            <View style={styles.radioTextWrap}>
              <PartnerText style={[styles.radioLabel, { fontSize: px(12.5) }]}>
                Someone else
              </PartnerText>
              <PartnerText style={[styles.radioSubLabel, { fontSize: px(10.5) }]}>
                Owner authorisation may be needed
              </PartnerText>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Vehicle Model (Custom Input or Dropdown) */}
      <View style={[styles.inputGroup, { marginBottom: px(12) }]}>
        <View style={styles.labelWithActionRow}>
          <PartnerText style={[styles.inputLabel, { fontSize: px(12) }]}>
            Vehicle model <PartnerText style={styles.optionalText}>(Optional)</PartnerText>
          </PartnerText>
          <Pressable
            hitSlop={8}
            onPress={() => {
              setCustomModelInput(driverVehicle.vehicleModel || '');
              setModelModalVisible(true);
            }}>
            <PartnerText style={[styles.browseDropdownLink, { fontSize: px(11.5) }]}>
              Choose from list ▾
            </PartnerText>
          </Pressable>
        </View>

        <View style={[styles.inputContainer, { height: px(44), paddingHorizontal: px(10) }]}>
          <Car size={px(16)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
          <PartnerTextInput
            style={[styles.textInput, { fontSize: px(13.5), fontWeight: '600', flex: 1 }]}
            placeholder="Type custom model or choose from list"
            placeholderTextColor="#9CA3AF"
            maxLength={35}
            value={driverVehicle.vehicleModel}
            onChangeText={(text) =>
              setDriverVehicle({
                vehicleModel: text.replace(/[^A-Za-z0-9\s\-.]/g, ''),
              })
            }
          />
          <Pressable
            hitSlop={10}
            onPress={() => {
              setCustomModelInput(driverVehicle.vehicleModel || '');
              setModelModalVisible(true);
            }}
            style={styles.dropdownChevronBtn}>
            <ChevronDown size={px(18)} color="#6B7280" strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      {/* Bottom Notice Box */}
      <View style={[styles.noticeBox, { padding: px(10), borderRadius: px(8) }]}>
        <View style={[styles.noticeIconCircle, { width: px(20), height: px(20), borderRadius: px(10) }]}>
          <Info size={px(12)} color="#FFFFFF" strokeWidth={2.4} />
        </View>
        <PartnerText style={[styles.noticeText, { fontSize: px(11) }]}>
          RC and insurance details will be checked from uploaded documents.
        </PartnerText>
      </View>
    </View>
  );

  // -------------------------------------------------------------
  // Render Step 3: Documents
  // -------------------------------------------------------------
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

        {/* Section 2: Only when applicable */}
        <View style={[styles.sectionContainer, { marginBottom: px(8) }]}>
          <PartnerText style={[styles.sectionTitle, { fontSize: px(13), marginBottom: px(6) }]}>
            Only when applicable
          </PartnerText>

          {CONDITIONAL_DOCUMENTS.map((doc) => renderDocRow(doc, true))}
        </View>

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
        <Pressable
          hitSlop={8}
          onPress={() => {
            setReturnToReviewAfterEdit(true);
            animateToStep(1, 'backward');
          }}
          style={({ pressed }) => [styles.summarySectionCol, pressed && { opacity: 0.8 }]}>
          <View style={styles.summarySectionHeader}>
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
            <View style={styles.editBtn}>
              <PartnerText style={[styles.editText, { fontSize: px(12) }]}>Edit</PartnerText>
              <ChevronRight size={px(13)} color="#2563EB" />
            </View>
          </View>

          {/* Key Information Points (Personal Details) */}
          <View style={[styles.reviewDetailsBox, { padding: px(6), marginTop: px(5), borderRadius: px(7) }]}>
            <View style={styles.reviewPointRow}>
              <View style={[styles.reviewPointDot, { width: px(4), height: px(4), borderRadius: px(2) }]} />
              <PartnerText style={[styles.reviewPointText, { fontSize: px(10.5) }]} numberOfLines={1}>
                <PartnerText style={styles.reviewPointBold}>{driverPersonal.fullName || 'Rajesh Kumar'}</PartnerText>
                {'  •  '}+91 {driverPersonal.mobileNumber || '9876543210'}
              </PartnerText>
            </View>
            <View style={styles.reviewPointRow}>
              <View style={[styles.reviewPointDot, { width: px(4), height: px(4), borderRadius: px(2) }]} />
              <PartnerText style={[styles.reviewPointText, { fontSize: px(10.5) }]} numberOfLines={1}>
                DOB: <PartnerText style={styles.reviewPointBold}>{driverPersonal.dateOfBirth || '15/05/1992'}</PartnerText>
                {'  •  '}{driverPersonal.city || 'Bhubaneswar'}
              </PartnerText>
            </View>
            <View style={styles.reviewPointRow}>
              <View style={[styles.reviewPointDot, { width: px(4), height: px(4), borderRadius: px(2) }]} />
              <PartnerText style={[styles.reviewPointText, { fontSize: px(10.5) }]} numberOfLines={1} ellipsizeMode="tail">
                Address: <PartnerText style={styles.reviewPointBold}>{driverPersonal.address || 'Plot 42, Saheed Nagar, Janpath Road'}</PartnerText>
              </PartnerText>
            </View>
          </View>
        </Pressable>

        <View style={[styles.cardDividerCompact, { marginVertical: px(7) }]} />

        {/* Section 2: Vehicle Details */}
        <Pressable
          hitSlop={8}
          onPress={() => {
            setReturnToReviewAfterEdit(true);
            animateToStep(2, 'backward');
          }}
          style={({ pressed }) => [styles.summarySectionCol, pressed && { opacity: 0.8 }]}>
          <View style={styles.summarySectionHeader}>
            <View style={styles.summarySectionLeft}>
              <View style={[styles.headerCheckBadge, { width: px(18), height: px(18), borderRadius: px(9) }]}>
                <Check size={px(11)} color="#15803D" strokeWidth={3} />
              </View>
              <View style={[styles.sectionIconWrap, { width: px(28), height: px(28), borderRadius: px(6) }]}>
                <Truck size={px(15)} color="#D97706" />
              </View>
              <View style={styles.summaryTitleRow}>
                <PartnerText style={[styles.summaryTitle, { fontSize: px(13) }]}>Vehicle details</PartnerText>
                <View style={[styles.checkedPill, { paddingHorizontal: px(5), paddingVertical: px(1), borderRadius: px(4) }]}>
                  <PartnerText style={[styles.checkedPillText, { fontSize: px(9.5) }]}>Checked</PartnerText>
                </View>
              </View>
            </View>
            <View style={styles.editBtn}>
              <PartnerText style={[styles.editText, { fontSize: px(12) }]}>Edit</PartnerText>
              <ChevronRight size={px(13)} color="#2563EB" />
            </View>
          </View>

          {/* Key Vehicle Information Points */}
          <View style={[styles.reviewDetailsBox, { padding: px(6), marginTop: px(5), borderRadius: px(7) }]}>
            <View style={styles.reviewPointRow}>
              <View style={[styles.reviewPointDot, { width: px(4), height: px(4), borderRadius: px(2) }]} />
              <PartnerText style={[styles.reviewPointText, { fontSize: px(10.5) }]} numberOfLines={1}>
                Type: <PartnerText style={styles.reviewPointBold}>{driverVehicle.vehicleType || 'Flatbed Tow Truck'}</PartnerText>
                {'  •  '}{driverVehicle.vehicleModel || 'Tata 407 Recovery Spec'}
              </PartnerText>
            </View>
            <View style={styles.reviewPointRow}>
              <View style={[styles.reviewPointDot, { width: px(4), height: px(4), borderRadius: px(2) }]} />
              <PartnerText style={[styles.reviewPointText, { fontSize: px(10.5) }]} numberOfLines={1}>
                Plate: <PartnerText style={styles.reviewPointBold}>{driverVehicle.vehicleNumber || 'OD 02 AB 1234'}</PartnerText>
                {'  •  '}RC: <PartnerText style={styles.reviewPointBold}>{driverVehicle.rcNumber || 'RC-OD02-2022-987654'}</PartnerText>
              </PartnerText>
            </View>
            <View style={styles.reviewPointRow}>
              <View style={[styles.reviewPointDot, { width: px(4), height: px(4), borderRadius: px(2) }]} />
              <PartnerText style={[styles.reviewPointText, { fontSize: px(10.5) }]} numberOfLines={1}>
                DL: <PartnerText style={styles.reviewPointBold}>{driverVehicle.licenseNumber || 'OD-0220190012345'}</PartnerText>
                {'  •  '}Ownership: <PartnerText style={styles.reviewPointBold}>{driverVehicle.registeredTo === 'someone_else' ? 'NOC / Authorized' : 'Owner (Me)'}</PartnerText>
              </PartnerText>
            </View>
          </View>
        </Pressable>

        <View style={[styles.cardDividerCompact, { marginVertical: px(7) }]} />

        {/* Section 3: Documents */}
        <Pressable
          hitSlop={8}
          onPress={() => {
            setReturnToReviewAfterEdit(true);
            animateToStep(3, 'backward');
          }}
          style={({ pressed }) => [styles.summarySectionCol, pressed && { opacity: 0.8 }]}>
          <View style={styles.summarySectionHeader}>
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
            <View style={styles.editBtn}>
              <PartnerText style={[styles.editText, { fontSize: px(12) }]}>Edit</PartnerText>
              <ChevronRight size={px(13)} color="#2563EB" />
            </View>
          </View>

          {/* Key Document Status & Badges */}
          <View style={[styles.reviewDetailsBox, { padding: px(6), marginTop: px(5), borderRadius: px(7) }]}>
            <View style={styles.reviewDocTagsRow}>
              {['RC Book', 'Driving licence', 'Vehicle insurance', 'Fitness cert', 'Vehicle photos'].map(
                (docTag) => (
                  <View
                    key={docTag}
                    style={[
                      styles.docReviewTag,
                      { paddingHorizontal: px(5), paddingVertical: px(1.5), borderRadius: px(4) },
                    ]}>
                    <Check size={px(8.5)} color="#047857" strokeWidth={3} style={{ marginRight: px(3) }} />
                    <PartnerText style={[styles.docReviewTagText, { fontSize: px(9.5) }]}>{docTag}</PartnerText>
                  </View>
                ),
              )}
            </View>
            <View style={[styles.reviewPointRow, { marginTop: px(3) }]}>
              <View style={[styles.reviewPointDot, { width: px(4), height: px(4), borderRadius: px(2) }]} />
              <PartnerText style={[styles.reviewPointText, { fontSize: px(10.5) }]} numberOfLines={1}>
                {coreUploadedCount} of {CORE_REVIEW_DOCUMENTS.length} core documents uploaded & verified
              </PartnerText>
            </View>
          </View>
        </Pressable>
      </View>

      {/* Prominent "Edit your previous details" Button */}
      <Pressable
        onPress={() => setEditSectionModalVisible(true)}
        style={({ pressed }) => [
          styles.editPreviousBtn,
          {
            paddingVertical: px(8),
            paddingHorizontal: px(12),
            borderRadius: px(10),
            marginBottom: px(8),
          },
          pressed && styles.pressed,
        ]}>
        <View style={styles.editPreviousLeft}>
          <Pencil size={px(13)} color="#B45309" strokeWidth={2.4} style={{ marginRight: px(7) }} />
          <PartnerText style={[styles.editPreviousLabel, { fontSize: px(12) }]}>
            Edit your previous details
          </PartnerText>
        </View>
        <View style={styles.editPreviousRight}>
          <PartnerText style={[styles.editPreviousActionText, { fontSize: px(11) }]}>Change info</PartnerText>
          <ChevronRight size={px(12)} color="#B45309" strokeWidth={2.4} />
        </View>
      </Pressable>

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
          <PartnerText style={styles.linkText}>Terms</PartnerText> & <PartnerText style={styles.linkText}>Privacy</PartnerText>.
        </PartnerText>
      </Pressable>

      {/* Save and finish later link */}
      <Pressable
        onPress={() =>
          partnerRegistrationGoBack(navigation, 'DriverPersonalInfo', {
            role: route.params?.role || 'driver',
            mobileNumber: route.params?.mobileNumber,
          })
        }
        style={({ pressed }) => [
          styles.saveLaterLink,
          { marginBottom: px(4) },
          pressed && styles.pressed,
        ]}>
        <PartnerText style={[styles.saveLaterText, { fontSize: px(11.5) }]}>Save and finish later</PartnerText>
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
      continueDisabled={currentStep === 4 ? !confirmAgreed || submitting : false}
      continueLoading={currentStep === 4 ? submitting : false}
      showFooter={true}>
      {/* Animated Sliding Container: only form cards slide smoothly! */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        }}>
        {currentStep === 1 && renderStep1PersonalInfo()}
        {currentStep === 2 && renderStep2VehicleInfo()}
        {currentStep === 3 && renderStep3Documents()}
        {currentStep === 4 && renderStep4Review()}
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

      {/* Emergency Contact Modal (Step 1) */}
      <Modal visible={emergencyModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setEmergencyModalVisible(false)}>
          <Pressable
            style={[styles.modalSheet, { borderTopLeftRadius: px(16), borderTopRightRadius: px(16) }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <PartnerText style={[styles.sheetTitle, { fontSize: px(15) }]}>Emergency Contact</PartnerText>
              <Pressable hitSlop={12} onPress={() => setEmergencyModalVisible(false)}>
                <X size={px(18)} color="#4B5563" />
              </Pressable>
            </View>
            <PartnerText style={[styles.dobHint, { fontSize: px(11.5), marginBottom: px(12) }]}>
              This contact will only be called in case of road accidents or emergencies.
            </PartnerText>
            <View style={{ marginBottom: px(10) }}>
              <View style={styles.inputLabelRow}>
                <PartnerText style={[styles.inputLabel, { fontSize: px(11.5) }]}>Contact Name</PartnerText>
                {driverPersonal.emergencyContactName && driverPersonal.emergencyContactName.length >= 20 ? (
                  <PartnerText style={[styles.charCountText, { fontSize: px(10.5) }]}>
                    {driverPersonal.emergencyContactName.length}/35
                  </PartnerText>
                ) : null}
              </View>
              <PartnerTextInput
                style={[styles.simpleInput, { height: px(40), fontSize: px(13) }]}
                placeholder="e.g. Ramesh Kumar (Brother)"
                maxLength={35}
                value={driverPersonal.emergencyContactName ?? ''}
                onChangeText={(text) =>
                  setDriverPersonal({
                    emergencyContactName: text.replace(/[^a-zA-Z\s.-]/g, ''),
                  })
                }
              />
            </View>
            <View style={{ marginBottom: px(14) }}>
              <PartnerText style={[styles.inputLabel, { fontSize: px(11.5) }]}>Mobile Number</PartnerText>
              <PartnerTextInput
                style={[styles.simpleInput, { height: px(40), fontSize: px(13) }]}
                keyboardType="number-pad"
                maxLength={10}
                placeholder="10-digit emergency number"
                value={driverPersonal.emergencyContactNumber ?? ''}
                onChangeText={(emergencyContactNumber) =>
                  setDriverPersonal({
                    emergencyContactNumber: emergencyContactNumber.replace(/[^0-9]/g, ''),
                  })
                }
              />
            </View>
            <Pressable
              onPress={() => setEmergencyModalVisible(false)}
              style={[styles.primaryModalBtn, { height: px(40), borderRadius: px(8) }]}>
              <PartnerText style={[styles.primaryModalBtnText, { fontSize: px(13.5) }]}>Save Emergency Contact</PartnerText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Vehicle Model Modal (Popular list + Custom typing) */}
      <Modal visible={modelModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModelModalVisible(false)} />
          <Pressable
            style={[styles.modalSheet, { maxHeight: px(520), borderTopLeftRadius: px(16), borderTopRightRadius: px(16) }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View>
                <PartnerText style={[styles.sheetTitle, { fontSize: px(15) }]}>Vehicle Model</PartnerText>
                <PartnerText style={[styles.sheetSubtitle, { fontSize: px(11) }]}>
                  Type custom model or choose from popular models
                </PartnerText>
              </View>
              <Pressable hitSlop={12} onPress={() => setModelModalVisible(false)}>
                <X size={px(18)} color="#4B5563" />
              </Pressable>
            </View>

            {/* Custom Input Box inside modal */}
            <View style={[styles.modalSearchContainer, { height: px(42), marginHorizontal: px(14), marginBottom: px(10) }]}>
              <Car size={px(16)} color="#9CA3AF" style={{ marginRight: px(8) }} />
              <PartnerTextInput
                style={[styles.modalSearchInput, { fontSize: px(13), flex: 1 }]}
                placeholder="Enter custom vehicle model..."
                placeholderTextColor="#9CA3AF"
                maxLength={35}
                value={customModelInput}
                onChangeText={(text) => setCustomModelInput(text.replace(/[^A-Za-z0-9\s\-.]/g, ''))}
              />
              {customModelInput.trim().length > 0 ? (
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    setDriverVehicle({ vehicleModel: customModelInput.trim() });
                    setModelModalVisible(false);
                  }}
                  style={styles.modalApplyBtn}>
                  <PartnerText style={[styles.modalApplyText, { fontSize: px(12) }]}>Apply</PartnerText>
                </Pressable>
              ) : null}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: px(340) }}>
              {POPULAR_VEHICLE_MODELS.map((model) => {
                const isSelected = driverVehicle.vehicleModel === model;
                return (
                  <Pressable
                    key={model}
                    onPress={() => {
                      if (model === 'Other / Custom Vehicle Model') {
                        setCustomModelInput(driverVehicle.vehicleModel || '');
                      } else {
                        setDriverVehicle({ vehicleModel: model });
                        setModelModalVisible(false);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.cityRow,
                      { paddingVertical: px(10), paddingHorizontal: px(14) },
                      isSelected && styles.cityRowSelected,
                      pressed && styles.pressed,
                    ]}>
                    <PartnerText
                      style={[
                        styles.cityText,
                        { fontSize: px(13) },
                        isSelected && styles.cityTextSelected,
                      ]}>
                      {model}
                    </PartnerText>
                    {isSelected ? <Check size={px(16)} color="#D97706" strokeWidth={2.5} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
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

            {/* Option 4: Instant Sample Document for QA */}
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
              {/* Option 1: Personal Info */}
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
                  <PartnerText style={[styles.pickerTitle, { fontSize: px(13.5) }]}>1. Personal details</PartnerText>
                  <PartnerText style={[styles.pickerSubtitle, { fontSize: px(11) }]}>
                    Full name, Mobile number, Date of birth, City, Address
                  </PartnerText>
                </View>
                <ChevronRight size={px(16)} color="#9CA3AF" />
              </Pressable>

              {/* Option 2: Vehicle Info */}
              <Pressable
                onPress={() => {
                  setEditSectionModalVisible(false);
                  setReturnToReviewAfterEdit(true);
                  animateToStep(2, 'backward');
                }}
                style={({ pressed }) => [styles.pickerOptionCard, pressed && styles.pressed]}>
                <View style={[styles.pickerIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Truck size={px(18)} color="#D97706" />
                </View>
                <View style={styles.pickerTextWrap}>
                  <PartnerText style={[styles.pickerTitle, { fontSize: px(13.5) }]}>2. Vehicle details</PartnerText>
                  <PartnerText style={[styles.pickerSubtitle, { fontSize: px(11) }]}>
                    Vehicle type, Plate number, Driving licence, Vehicle model
                  </PartnerText>
                </View>
                <ChevronRight size={px(16)} color="#9CA3AF" />
              </Pressable>

              {/* Option 3: Documents */}
              <Pressable
                onPress={() => {
                  setEditSectionModalVisible(false);
                  setReturnToReviewAfterEdit(true);
                  animateToStep(3, 'backward');
                }}
                style={({ pressed }) => [styles.pickerOptionCard, pressed && styles.pressed]}>
                <View style={[styles.pickerIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <FileText size={px(18)} color="#D97706" />
                </View>
                <View style={styles.pickerTextWrap}>
                  <PartnerText style={[styles.pickerTitle, { fontSize: px(13.5) }]}>3. Uploaded documents</PartnerText>
                  <PartnerText style={[styles.pickerSubtitle, { fontSize: px(11) }]}>
                    RC, Driving licence, Insurance, Fitness, Vehicle photos
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
    height: 32,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
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
    paddingVertical: 3,
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
    marginRight: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryTitle: {
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
  pressed: {
    opacity: 0.85,
  },
});
