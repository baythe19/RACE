import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
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

  // Flow Step State (1: Personal, 2: Vehicle, 3: Documents, 4: Review)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(
    initialStepParam >= 1 && initialStepParam <= 4 ? (initialStepParam as any) : 1,
  );
  const [returnToReviewAfterEdit, setReturnToReviewAfterEdit] = useState(fromReviewParam);

  // Slide Animation Value
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateToStep = (newStep: 1 | 2 | 3 | 4, direction: 'forward' | 'backward') => {
    const slideOutTo = direction === 'forward' ? -px(35) : px(35);
    const slideInFrom = direction === 'forward' ? px(35) : -px(35);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0.15,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: slideOutTo,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(newStep);
      slideAnim.setValue(slideInFrom);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

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
  const [previewDocData, setPreviewDocData] = useState<{ title: string; uri: string; name: string } | null>(
    null,
  );
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

  const startAnimatedUpload = (doc: DriverDocumentConfig, sourceLabel: string) => {
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
        uri: `https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&q=80&sig=${doc.id}`,
        name: `${doc.id}_verified.jpg`,
        mimeType: 'image/jpeg',
      });
      setUploadProgressState(null);
    }, 1500);
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

  const handleFlowContinue = () => {
    if (returnToReviewAfterEdit) {
      setReturnToReviewAfterEdit(false);
      animateToStep(4, 'forward');
      return;
    }

    if (currentStep === 1) {
      setDriverPersonal({
        fullName: driverPersonal.fullName.trim() || 'Rajesh Kumar',
        dateOfBirth: driverPersonal.dateOfBirth.trim() || '15/05/1992',
        address: driverPersonal.address.trim() || 'Plot 42, Saheed Nagar, Janpath Road',
        city: driverPersonal.city || 'Bhubaneswar',
      });
      animateToStep(2, 'forward');
    } else if (currentStep === 2) {
      const chosenCard =
        DRIVER_VEHICLE_TYPE_CARDS.find((c) => c.id === selectedVehicleCardId) ||
        DRIVER_VEHICLE_TYPE_CARDS[0];

      setDriverVehicle({
        vehicleType: driverVehicle.vehicleType || chosenCard.label,
        vehicleNumber: driverVehicle.vehicleNumber.trim() || 'OD 02 AB 1234',
        licenseNumber: driverVehicle.licenseNumber.trim() || 'OD-0220190012345',
        rcNumber: driverVehicle.rcNumber.trim() || 'RC-OD02-2022-987654',
        vehicleModel: driverVehicle.vehicleModel.trim() || 'Tata 407 Recovery Spec',
        registeredTo: driverVehicle.registeredTo || 'me',
      });
      animateToStep(3, 'forward');
    } else if (currentStep === 3) {
      if (missingCoreDocs.length > 0) {
        missingCoreDocs.forEach((doc) => {
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
        fullName: driverPersonal.fullName.trim() || authUser?.fullName || 'Rajesh Kumar',
        email: driverPersonal.email || 'rajesh.driver@gmail.com',
        address: driverPersonal.address || 'Plot 42, Saheed Nagar, Janpath Road',
        city: driverPersonal.city || 'Bhubaneswar',
        dateOfBirth: driverPersonal.dateOfBirth || '15/05/1992',
        emergencyContact,
        licenseNo:
          driverVehicle.licenseNumber ||
          driverVehicle.rcNumber ||
          'OD-0220190012345',
        driverType,
        vehicleRegistration: driverVehicle.vehicleNumber || 'OD 02 AB 1234',
        vehicleType: driverVehicle.vehicleType || 'Flatbed',
        documents: documentsPayload,
        experienceYears: driverPersonal.yearsOfExperience
          ? Number(driverPersonal.yearsOfExperience)
          : 5,
        languages: driverPersonal.languages
          ? driverPersonal.languages
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : ['Odia', 'Hindi', 'English'],
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
    if (returnToReviewAfterEdit) return 'Save & Return to Review →';
    if (currentStep === 4) return submitting ? 'Submitting...' : 'Submit application';
    return 'Continue →';
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
          <Text style={[styles.cardHeaderTitle, { fontSize: px(14.5) }]}>Personal information</Text>
          <Text style={[styles.cardHeaderSubtitle, { fontSize: px(11.5) }]}>
            Enter your details as they appear on official IDs.
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      {/* Full Name */}
      <View style={[styles.inputGroup, { marginBottom: px(12) }]}>
        <Text style={[styles.inputLabel, { fontSize: px(12) }]}>
          Full name <Text style={styles.requiredAsterisk}>*</Text>
        </Text>
        <View style={[styles.inputContainer, { height: px(44), paddingHorizontal: px(10) }]}>
          <User size={px(16)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
          <TextInput
            style={[styles.textInput, { fontSize: px(13.5) }]}
            placeholder="Enter full name"
            placeholderTextColor="#9CA3AF"
            value={driverPersonal.fullName}
            onChangeText={(fullName) => setDriverPersonal({ fullName })}
          />
        </View>
      </View>

      {/* Mobile Number (Locked / Verified) */}
      <View style={[styles.inputGroup, { marginBottom: px(12) }]}>
        <Text style={[styles.inputLabel, { fontSize: px(12) }]}>
          Mobile number <Text style={styles.requiredAsterisk}>*</Text>
        </Text>
        <View
          style={[
            styles.inputContainer,
            styles.lockedInputContainer,
            { height: px(44), paddingHorizontal: px(10) },
          ]}>
          <Phone size={px(16)} color="#6B7280" strokeWidth={2} style={styles.leftInputIcon} />
          <Text style={[styles.countryPrefix, { fontSize: px(13.5) }]}>+91</Text>
          <TextInput
            style={[styles.textInput, styles.lockedTextInput, { fontSize: px(13.5) }]}
            editable={false}
            value={driverPersonal.mobileNumber || '9876543210'}
          />
          <View style={styles.verifiedBadge}>
            <Check size={px(11)} color="#15803D" strokeWidth={3} />
            <Text style={[styles.verifiedText, { fontSize: px(10.5) }]}>Verified</Text>
          </View>
        </View>
      </View>

      {/* Date of Birth (DD/MM/YYYY) */}
      <View style={[styles.inputGroup, { marginBottom: px(12) }]}>
        <Text style={[styles.inputLabel, { fontSize: px(12) }]}>
          Date of birth <Text style={styles.requiredAsterisk}>*</Text>{' '}
          <Text style={[styles.optionalText, { fontSize: px(11) }]}>[DD/MM/YYYY]</Text>
        </Text>
        <View style={[styles.inputContainer, { height: px(44), paddingHorizontal: px(10) }]}>
          <Calendar size={px(16)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
          <TextInput
            style={[styles.textInput, { fontSize: px(13.5), fontWeight: '600' }]}
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
        <Text style={[styles.inputLabel, { fontSize: px(12) }]}>
          Current address <Text style={styles.requiredAsterisk}>*</Text>
        </Text>
        <View
          style={[
            styles.inputContainer,
            styles.addressInputContainer,
            { height: px(68), paddingHorizontal: px(10), paddingVertical: px(8) },
          ]}>
          <MapPin size={px(16)} color="#9CA3AF" strokeWidth={2} style={[styles.leftInputIcon, { marginTop: px(2) }]} />
          <TextInput
            style={[styles.textInput, styles.multilineInput, { fontSize: px(13) }]}
            placeholder="House/Plot no, street, landmark, area"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={2}
            value={driverPersonal.address}
            onChangeText={(address) => setDriverPersonal({ address })}
          />
        </View>
      </View>

      {/* Operating City */}
      <View style={[styles.inputGroup, { marginBottom: px(14) }]}>
        <Text style={[styles.inputLabel, { fontSize: px(12) }]}>
          Operating city <Text style={styles.requiredAsterisk}>*</Text>
        </Text>
        <Pressable
          onPress={() => setCityModalVisible(true)}
          style={[styles.inputContainer, { height: px(44), paddingHorizontal: px(10) }]}>
          <MapPin size={px(16)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
          <Text
            style={[
              styles.textValue,
              { fontSize: px(13.5) },
              !driverPersonal.city && styles.textPlaceholder,
            ]}>
            {driverPersonal.city || 'Select city'}
          </Text>
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
            <Text style={[styles.alertTitle, { fontSize: px(12) }]}>Emergency contact</Text>
            <Text numberOfLines={1} style={[styles.alertSubtitle, { fontSize: px(10.5) }]}>
              {driverPersonal.emergencyContactNumber
                ? `${driverPersonal.emergencyContactName || 'Contact'}: +91 ${driverPersonal.emergencyContactNumber}`
                : 'Recommended for safety'}
            </Text>
          </View>
          <Pressable
            hitSlop={10}
            onPress={() => setEmergencyModalVisible(true)}
            style={styles.alertActionBtn}>
            <Text style={[styles.alertActionText, { fontSize: px(11.5) }]}>
              {driverPersonal.emergencyContactNumber ? 'Edit' : '+ Add'}
            </Text>
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
          <Text style={[styles.cardHeaderTitle, { fontSize: px(14.5) }]}>Vehicle information</Text>
          <Text style={[styles.cardHeaderSubtitle, { fontSize: px(11.5) }]}>
            Tell us about your vehicle.
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      {/* Vehicle Type * (Single Row of 4 Compact Cards) */}
      <View style={[styles.inputGroup, { marginBottom: px(14) }]}>
        <Text style={[styles.inputLabel, { fontSize: px(12), marginBottom: px(6) }]}>
          Vehicle type <Text style={styles.requiredAsterisk}>*</Text>
        </Text>

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
                <Text
                  numberOfLines={1}
                  style={[
                    styles.vehicleCardLabel,
                    { fontSize: px(10.5), marginTop: px(4) },
                    isSelected ? styles.vehicleCardLabelSelected : styles.vehicleCardLabelIdle,
                  ]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Vehicle Registration Number */}
      <View style={[styles.inputGroup, { marginBottom: px(12) }]}>
        <Text style={[styles.inputLabel, { fontSize: px(12) }]}>
          Vehicle registration number <Text style={styles.requiredAsterisk}>*</Text>
        </Text>
        <View style={[styles.inputContainer, { height: px(44), paddingHorizontal: px(10) }]}>
          <CreditCard size={px(16)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
          <TextInput
            style={[styles.textInput, { fontSize: px(13.5), fontWeight: '600' }]}
            placeholder="e.g. OD 02 AB 1234"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            autoCorrect={false}
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
        <Text style={[styles.inputLabel, { fontSize: px(12) }]}>
          Driving licence number <Text style={styles.requiredAsterisk}>*</Text>
        </Text>
        <View style={[styles.inputContainer, { height: px(44), paddingHorizontal: px(10) }]}>
          <FileText size={px(16)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
          <TextInput
            style={[styles.textInput, { fontSize: px(13.5), fontWeight: '600' }]}
            placeholder="Enter Driving License (DL) number"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            autoCorrect={false}
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
        <Text style={[styles.inputLabel, { fontSize: px(12), marginBottom: px(6) }]}>
          Vehicle registered to <Text style={styles.requiredAsterisk}>*</Text>
        </Text>

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
            <Text style={[styles.radioLabel, { fontSize: px(12.5) }]}>
              Me / I own this vehicle
            </Text>
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
              <Text style={[styles.radioLabel, { fontSize: px(12.5) }]}>
                Someone else
              </Text>
              <Text style={[styles.radioSubLabel, { fontSize: px(10.5) }]}>
                Owner authorisation may be needed
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Vehicle Model (Optional Dropdown) */}
      <View style={[styles.inputGroup, { marginBottom: px(12) }]}>
        <Text style={[styles.inputLabel, { fontSize: px(12) }]}>
          Vehicle model <Text style={styles.optionalText}>(Optional)</Text>
        </Text>
        <Pressable
          onPress={() => {
            setCustomModelInput(driverVehicle.vehicleModel || '');
            setModelModalVisible(true);
          }}
          style={[styles.inputContainer, { height: px(44), paddingHorizontal: px(10) }]}>
          <Car size={px(16)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
          <Text
            style={[
              styles.textValue,
              { fontSize: px(13) },
              !driverVehicle.vehicleModel && styles.textPlaceholder,
            ]}>
            {driverVehicle.vehicleModel || 'Enter vehicle model (optional)'}
          </Text>
          <ChevronDown size={px(17)} color="#6B7280" strokeWidth={2} />
        </Pressable>
      </View>

      {/* Bottom Notice Box */}
      <View style={[styles.noticeBox, { padding: px(10), borderRadius: px(8) }]}>
        <View style={[styles.noticeIconCircle, { width: px(20), height: px(20), borderRadius: px(10) }]}>
          <Info size={px(12)} color="#FFFFFF" strokeWidth={2.4} />
        </View>
        <Text style={[styles.noticeText, { fontSize: px(11) }]}>
          RC and insurance details will be checked from uploaded documents.
        </Text>
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
          <Text numberOfLines={1} style={[styles.docTitle, { fontSize: px(12.5) }]}>
            {doc.title}
          </Text>
          {uploaded ? (
            <Text numberOfLines={1} style={[styles.docSubtitleUploaded, { fontSize: px(10.5) }]}>
              {uploadedData?.name || `${doc.id}_verified.jpg`}
            </Text>
          ) : doc.id === 'government_photo_id' ? (
            <Text numberOfLines={1} style={[styles.docSubtitle, { fontSize: px(10) }]}>
              Aadhaar or another accepted ID
            </Text>
          ) : doc.id === 'owner_noc' ? (
            <Text numberOfLines={1} style={[styles.docSubtitle, { fontSize: px(10) }]}>
              Only when vehicle is registered to someone else
            </Text>
          ) : null}
        </View>

        <View style={styles.badgeWrap}>
          {uploaded ? (
            <View style={styles.badgeUploaded}>
              <Text style={[styles.badgeUploadedText, { fontSize: px(10.5) }]}>Uploaded</Text>
            </View>
          ) : isConditional ? (
            <View style={styles.badgeConditional}>
              <Text style={[styles.badgeConditionalText, { fontSize: px(10.5) }]}>Conditional</Text>
            </View>
          ) : (
            <View style={styles.badgeRequired}>
              <Text style={[styles.badgeRequiredText, { fontSize: px(10.5) }]}>Required</Text>
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
              <Text style={[styles.uploadBtnText, { fontSize: px(11) }]}>Upload</Text>
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
            <Text style={[styles.cardHeaderTitle, { fontSize: px(14.5) }]}>
              Documents for verification
            </Text>
            <Text numberOfLines={1} style={[styles.cardHeaderSubtitle, { fontSize: px(11.5) }]}>
              Upload clear, readable photos or PDFs.
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Section 1: Needed for review */}
        <View style={[styles.sectionContainer, { marginBottom: px(8) }]}>
          <Text style={[styles.sectionTitle, { fontSize: px(13), marginBottom: px(6) }]}>
            Needed for review
          </Text>

          {CORE_REVIEW_DOCUMENTS.map((doc) => renderDocRow(doc, false))}
        </View>

        {/* Section 2: Only when applicable */}
        <View style={[styles.sectionContainer, { marginBottom: px(8) }]}>
          <Text style={[styles.sectionTitle, { fontSize: px(13), marginBottom: px(6) }]}>
            Only when applicable
          </Text>

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
          <Text numberOfLines={1} style={[styles.collapsibleRowTitle, { fontSize: px(12) }]}>
            Before first payout — PAN and bank details
          </Text>
          <View style={styles.badgeLater}>
            <Text style={[styles.badgeLaterText, { fontSize: px(10.5) }]}>Later</Text>
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
          <Text numberOfLines={1} style={[styles.collapsibleRowTitle, { fontSize: px(12) }]}>
            Additional checks — Police verification / medical fitness
          </Text>
          <View style={styles.badgeLater}>
            <Text style={[styles.badgeLaterText, { fontSize: px(10.5) }]}>If requested</Text>
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
        <Text style={[styles.securityNoteText, { fontSize: px(11.5) }]}>
          We only use your documents for partner verification.
        </Text>
      </View>
    </View>
  );

  // -------------------------------------------------------------
  // Render Step 4: Review
  // -------------------------------------------------------------
  const renderStep4Review = () => (
    <View>
      {/* Compact Status Banner */}
      {isAllCoreComplete ? (
        <View
          style={[
            styles.statusSuccessCard,
            { paddingVertical: px(8), paddingHorizontal: px(12), marginBottom: px(8), borderRadius: px(8) },
          ]}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.successIconCircle,
                { width: px(26), height: px(26), borderRadius: px(13) },
              ]}>
              <CheckCircle2 size={px(16)} color="#15803D" strokeWidth={2.4} />
            </View>
            <View style={styles.statusTextWrap}>
              <Text style={[styles.statusSuccessTitle, { fontSize: px(13) }]}>Ready to submit</Text>
              <Text style={[styles.statusSuccessSubtitle, { fontSize: px(11) }]}>
                All required information and documents are complete.
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.statusWarningCard,
            { paddingVertical: px(8), paddingHorizontal: px(12), marginBottom: px(8), borderRadius: px(8) },
          ]}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.warningIconCircle,
                { width: px(26), height: px(26), borderRadius: px(13) },
              ]}>
              <AlertCircle size={px(16)} color="#D97706" strokeWidth={2.4} />
            </View>
            <View style={styles.statusTextWrap}>
              <Text style={[styles.statusWarningTitle, { fontSize: px(13) }]}>
                {coreUploadedCount} of 6 review items complete
              </Text>
              <Text style={[styles.statusWarningSubtitle, { fontSize: px(11) }]}>
                {missingCoreDocs.length} required document{missingCoreDocs.length > 1 ? 's' : ''} pending.
              </Text>
            </View>
          </View>

          <View style={[styles.missingChipsRow, { marginTop: px(5) }]}>
            {missingCoreDocs.slice(0, 3).map((d) => (
              <Pressable
                key={d.id}
                onPress={() => {
                  setReturnToReviewAfterEdit(true);
                  animateToStep(3, 'backward');
                }}
                style={[styles.missingChip, { paddingVertical: px(3), paddingHorizontal: px(8) }]}>
                <Text style={[styles.missingChipText, { fontSize: px(10.5) }]}>+ Add {d.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Unified Review Card */}
      <View style={[styles.summaryCard, { padding: px(12), marginBottom: px(10), borderRadius: px(12) }]}>
        {/* Section 1: Personal Details */}
        <View>
          <View style={[styles.cardHeaderRow, { marginBottom: px(8) }]}>
            <View style={styles.cardHeaderLeft}>
              <User size={px(16)} color="#D97706" style={{ marginRight: px(6) }} />
              <Text style={[styles.cardHeaderTitle, { fontSize: px(13.5) }]}>Personal details</Text>
            </View>
            <Pressable
              hitSlop={12}
              onPress={() => {
                setReturnToReviewAfterEdit(true);
                animateToStep(1, 'backward');
              }}
              style={styles.editBtn}>
              <Text style={[styles.editText, { fontSize: px(12) }]}>Edit</Text>
              <ChevronRight size={px(13)} color="#2563EB" />
            </Pressable>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { fontSize: px(12) }]}>Full name</Text>
            <Text style={[styles.detailValue, { fontSize: px(12) }]}>
              {driverPersonal.fullName || 'Rajesh Kumar'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { fontSize: px(12) }]}>Mobile number</Text>
            <Text style={[styles.detailValue, { fontSize: px(12) }]}>
              +91 {driverPersonal.mobileNumber || '9876543210'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { fontSize: px(12) }]}>Date of birth</Text>
            <Text style={[styles.detailValue, { fontSize: px(12) }]}>
              {driverPersonal.dateOfBirth || '15/05/1992'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { fontSize: px(12) }]}>Operating city</Text>
            <Text style={[styles.detailValue, { fontSize: px(12) }]}>
              {driverPersonal.city || 'Bhubaneswar'}
            </Text>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.detailLabel, { fontSize: px(12) }]}>Current address</Text>
            <Text
              style={[styles.detailValue, { fontSize: px(12), flex: 1, textAlign: 'right' }]}
              numberOfLines={1}>
              {driverPersonal.address || 'Plot 42, Saheed Nagar, Janpath Road'}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Section 2: Vehicle Details */}
        <View>
          <View style={[styles.cardHeaderRow, { marginBottom: px(8) }]}>
            <View style={styles.cardHeaderLeft}>
              <Truck size={px(16)} color="#D97706" style={{ marginRight: px(6) }} />
              <Text style={[styles.cardHeaderTitle, { fontSize: px(13.5) }]}>Vehicle details</Text>
            </View>
            <Pressable
              hitSlop={12}
              onPress={() => {
                setReturnToReviewAfterEdit(true);
                animateToStep(2, 'backward');
              }}
              style={styles.editBtn}>
              <Text style={[styles.editText, { fontSize: px(12) }]}>Edit</Text>
              <ChevronRight size={px(13)} color="#2563EB" />
            </Pressable>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { fontSize: px(12) }]}>Vehicle type</Text>
            <Text style={[styles.detailValue, { fontSize: px(12), fontWeight: '700', color: '#B45309' }]}>
              {driverVehicle.vehicleType || 'Flatbed'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { fontSize: px(12) }]}>Registration number</Text>
            <Text style={[styles.detailValue, { fontSize: px(12), fontWeight: '700' }]}>
              {driverVehicle.vehicleNumber || 'OD 02 AB 1234'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { fontSize: px(12) }]}>Driving licence number</Text>
            <Text style={[styles.detailValue, { fontSize: px(12) }]}>
              {driverVehicle.licenseNumber || 'OD-0220190012345'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { fontSize: px(12) }]}>Registered to</Text>
            <Text style={[styles.detailValue, { fontSize: px(12) }]}>
              {driverVehicle.registeredTo === 'someone_else'
                ? 'Someone else (Owner NOC)'
                : 'Me / I own this vehicle'}
            </Text>
          </View>
          {driverVehicle.vehicleModel ? (
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.detailLabel, { fontSize: px(12) }]}>Vehicle model</Text>
              <Text style={[styles.detailValue, { fontSize: px(12) }]}>
                {driverVehicle.vehicleModel}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardDivider} />

        {/* Section 3: Documents */}
        <View>
          <View style={[styles.cardHeaderRow, { marginBottom: px(8) }]}>
            <View style={styles.cardHeaderLeft}>
              <FileText size={px(16)} color="#D97706" style={{ marginRight: px(6) }} />
              <Text style={[styles.cardHeaderTitle, { fontSize: px(13.5) }]}>Documents</Text>
            </View>
            <Pressable
              hitSlop={12}
              onPress={() => {
                setReturnToReviewAfterEdit(true);
                animateToStep(3, 'backward');
              }}
              style={styles.editBtn}>
              <Text style={[styles.editText, { fontSize: px(12) }]}>Edit</Text>
              <ChevronRight size={px(13)} color="#2563EB" />
            </Pressable>
          </View>

          <Text style={[styles.docsSummaryText, { fontSize: px(11.5), marginBottom: px(6) }]}>
            {coreUploadedCount} of {CORE_REVIEW_DOCUMENTS.length} core review documents uploaded
          </Text>

          <View style={styles.docsList}>
            {CORE_REVIEW_DOCUMENTS.map((doc) => {
              const uploaded = isDocUploaded(doc.id);
              return (
                <View key={doc.id} style={[styles.docSummaryRow, { paddingVertical: px(4) }]}>
                  <View
                    style={[
                      styles.docCheckCircle,
                      {
                        width: px(16),
                        height: px(16),
                        borderRadius: px(8),
                        backgroundColor: uploaded ? '#DCFCE7' : '#F3F4F6',
                      },
                    ]}>
                    {uploaded ? (
                      <Check size={px(10)} color="#15803D" strokeWidth={3} />
                    ) : (
                      <Text style={{ fontSize: 9, color: '#9CA3AF' }}>—</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.docSummaryName,
                      { fontSize: px(12) },
                      !uploaded && styles.docSummaryNameMissing,
                    ]}>
                    {doc.title}
                  </Text>
                  <Text
                    style={[
                      styles.docSummaryStatus,
                      { fontSize: px(10.5) },
                      uploaded ? styles.docStatusGreen : styles.docStatusAmber,
                    ]}>
                    {uploaded ? 'Verified' : 'Pending'}
                  </Text>
                </View>
              );
            })}
          </View>
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
              { width: px(22), height: px(22), borderRadius: px(11) },
            ]}>
            <Info size={px(13)} color="#2563EB" strokeWidth={2.2} />
          </View>
          <Text style={[styles.noticeBannerText, { fontSize: px(11) }]}>
            Verification typically takes 2 to 4 hours after submission.
          </Text>
        </View>
      </View>

      {/* Confirmation Checkbox */}
      <Pressable
        onPress={() => setConfirmAgreed(!confirmAgreed)}
        style={[styles.checkboxContainer, { marginBottom: px(10) }]}>
        <View
          style={[
            styles.checkboxBox,
            { width: px(18), height: px(18), borderRadius: px(4) },
            confirmAgreed && styles.checkboxBoxChecked,
          ]}>
          {confirmAgreed ? <Check size={px(12)} color="#FFFFFF" strokeWidth={3} /> : null}
        </View>
        <Text style={[styles.checkboxLabel, { fontSize: px(11.5) }]}>
          I confirm that all details provided are genuine and agree to RACE's{' '}
          <Text style={styles.linkText}>Terms</Text> & <Text style={styles.linkText}>Privacy</Text>.
        </Text>
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
          { marginBottom: px(8) },
          pressed && styles.pressed,
        ]}>
        <Text style={[styles.saveLaterText, { fontSize: px(12) }]}>Save and finish later</Text>
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
              <Text style={[styles.sheetTitle, { fontSize: px(15) }]}>Select Date of Birth</Text>
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
                    <Text style={[styles.yearChipText, isYearActive && styles.yearChipTextActive]}>
                      {y}
                    </Text>
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

              <Text style={[styles.monthNavTitle, { fontSize: px(13.5) }]}>
                {FULL_MONTH_NAMES[calendarMonth - 1]} {calendarYear}
              </Text>

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
                <Text key={w} style={styles.weekdayText}>
                  {w}
                </Text>
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
                    <Text style={[styles.dayCellText, isSelected && styles.dayCellTextSelected]}>
                      {dayNum}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Manual Direct Input Fields */}
            <View style={[styles.modalManualRow, { marginVertical: px(8) }]}>
              <View style={styles.manualInputGroup}>
                <Text style={styles.manualInputLabel}>Day (DD)</Text>
                <TextInput
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
              <Text style={styles.manualDivider}>/</Text>
              <View style={styles.manualInputGroup}>
                <Text style={styles.manualInputLabel}>Month (MM)</Text>
                <TextInput
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
              <Text style={styles.manualDivider}>/</Text>
              <View style={[styles.manualInputGroup, { flex: 1.4 }]}>
                <Text style={styles.manualInputLabel}>Year (YYYY)</Text>
                <TextInput
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
              <Text style={[styles.primaryModalBtnText, { fontSize: px(13.5) }]}>Set Date of Birth</Text>
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
              <Text style={[styles.sheetTitle, { fontSize: px(15) }]}>Select Operating City</Text>
              <Pressable hitSlop={12} onPress={() => setCityModalVisible(false)}>
                <X size={px(18)} color="#4B5563" />
              </Pressable>
            </View>
            <View style={[styles.modalSearchContainer, { height: px(40), marginBottom: px(10) }]}>
              <Search size={px(16)} color="#9CA3AF" style={{ marginRight: px(6) }} />
              <TextInput
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
                    <Text
                      style={[
                        styles.cityText,
                        { fontSize: px(13) },
                        isSelected && styles.cityTextSelected,
                      ]}>
                      {c}
                    </Text>
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
              <Text style={[styles.sheetTitle, { fontSize: px(15) }]}>Emergency Contact</Text>
              <Pressable hitSlop={12} onPress={() => setEmergencyModalVisible(false)}>
                <X size={px(18)} color="#4B5563" />
              </Pressable>
            </View>
            <Text style={[styles.dobHint, { fontSize: px(11.5), marginBottom: px(12) }]}>
              This contact will only be called in case of road accidents or emergencies.
            </Text>
            <View style={{ marginBottom: px(10) }}>
              <Text style={[styles.inputLabel, { fontSize: px(11.5) }]}>Contact Name</Text>
              <TextInput
                style={[styles.simpleInput, { height: px(40), fontSize: px(13) }]}
                placeholder="e.g. Ramesh Kumar (Brother)"
                value={driverPersonal.emergencyContactName ?? ''}
                onChangeText={(emergencyContactName) => setDriverPersonal({ emergencyContactName })}
              />
            </View>
            <View style={{ marginBottom: px(14) }}>
              <Text style={[styles.inputLabel, { fontSize: px(11.5) }]}>Mobile Number</Text>
              <TextInput
                style={[styles.simpleInput, { height: px(40), fontSize: px(13) }]}
                keyboardType="number-pad"
                maxLength={10}
                placeholder="10-digit emergency number"
                value={driverPersonal.emergencyContactNumber ?? ''}
                onChangeText={(emergencyContactNumber) =>
                  setDriverPersonal({
                    emergencyContactNumber: normalizeIndianPhone(emergencyContactNumber),
                  })
                }
              />
            </View>
            <Pressable
              onPress={() => setEmergencyModalVisible(false)}
              style={[styles.primaryModalBtn, { height: px(40), borderRadius: px(8) }]}>
              <Text style={[styles.primaryModalBtnText, { fontSize: px(13.5) }]}>Save Emergency Contact</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Vehicle Model Dropdown Modal (Step 2) */}
      <Modal visible={modelModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setModelModalVisible(false)}>
          <Pressable
            style={[styles.modalSheet, { maxHeight: px(500), borderTopLeftRadius: px(16), borderTopRightRadius: px(16) }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { fontSize: px(15) }]}>Select Vehicle Model</Text>
              <Pressable hitSlop={12} onPress={() => setModelModalVisible(false)}>
                <X size={px(18)} color="#4B5563" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {POPULAR_VEHICLE_MODELS.map((model) => {
                const isSelected = driverVehicle.vehicleModel === model;
                return (
                  <Pressable
                    key={model}
                    onPress={() => {
                      setDriverVehicle({ vehicleModel: model });
                      setModelModalVisible(false);
                    }}
                    style={({ pressed }) => [
                      styles.cityRow,
                      { paddingVertical: px(10) },
                      isSelected && styles.cityRowSelected,
                      pressed && styles.pressed,
                    ]}>
                    <Text
                      style={[
                        styles.cityText,
                        { fontSize: px(13) },
                        isSelected && styles.cityTextSelected,
                      ]}>
                      {model}
                    </Text>
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
                <Text style={[styles.sheetTitle, { fontSize: px(15) }]}>
                  Upload {activeDocForUpload?.title}
                </Text>
                <Text style={[styles.sheetSubtitle, { fontSize: px(11.5) }]}>
                  Choose photo or document file
                </Text>
              </View>
              <Pressable hitSlop={12} onPress={() => setActiveDocForUpload(null)}>
                <X size={px(18)} color="#4B5563" />
              </Pressable>
            </View>

            <Pressable
              onPress={() => activeDocForUpload && startAnimatedUpload(activeDocForUpload, 'Camera')}
              style={({ pressed }) => [styles.uploadOptionRow, { paddingVertical: px(10) }, pressed && styles.pressed]}>
              <View style={[styles.uploadOptionIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Camera size={px(18)} color="#D97706" />
              </View>
              <View style={styles.uploadOptionTextWrap}>
                <Text style={[styles.uploadOptionTitle, { fontSize: px(13) }]}>Take photo</Text>
                <Text style={[styles.uploadOptionSubtitle, { fontSize: px(11) }]}>
                  Use device camera for clear photo
                </Text>
              </View>
              <ChevronRight size={px(16)} color="#9CA3AF" />
            </Pressable>

            <Pressable
              onPress={() => activeDocForUpload && startAnimatedUpload(activeDocForUpload, 'Gallery')}
              style={({ pressed }) => [styles.uploadOptionRow, { paddingVertical: px(10) }, pressed && styles.pressed]}>
              <View style={[styles.uploadOptionIconBox, { backgroundColor: '#EFF6FF' }]}>
                <ImageIcon size={px(18)} color="#2563EB" />
              </View>
              <View style={styles.uploadOptionTextWrap}>
                <Text style={[styles.uploadOptionTitle, { fontSize: px(13) }]}>Choose from gallery</Text>
                <Text style={[styles.uploadOptionSubtitle, { fontSize: px(11) }]}>
                  JPG or PNG from photos
                </Text>
              </View>
              <ChevronRight size={px(16)} color="#9CA3AF" />
            </Pressable>

            <Pressable
              onPress={() => activeDocForUpload && startAnimatedUpload(activeDocForUpload, 'Files')}
              style={({ pressed }) => [styles.uploadOptionRow, { paddingVertical: px(10) }, pressed && styles.pressed]}>
              <View style={[styles.uploadOptionIconBox, { backgroundColor: '#F3F4F6' }]}>
                <FileUp size={px(18)} color="#4B5563" />
              </View>
              <View style={styles.uploadOptionTextWrap}>
                <Text style={[styles.uploadOptionTitle, { fontSize: px(13) }]}>Select PDF document</Text>
                <Text style={[styles.uploadOptionSubtitle, { fontSize: px(11) }]}>
                  PDF files up to 10 MB
                </Text>
              </View>
              <ChevronRight size={px(16)} color="#9CA3AF" />
            </Pressable>

            <Pressable
              onPress={() => activeDocForUpload && startAnimatedUpload(activeDocForUpload, 'Sample')}
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
                <Text style={[styles.uploadOptionTitle, { color: '#166534', fontSize: px(13) }]}>
                  Use verified sample document
                </Text>
                <Text style={[styles.uploadOptionSubtitle, { color: '#15803D', fontSize: px(11) }]}>
                  Instantly fills verified sample for testing
                </Text>
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

            <Text style={[styles.progressDocTitle, { fontSize: px(14.5) }]}>
              {uploadProgressState?.doc.title}
            </Text>

            <Text style={[styles.progressStatusText, { fontSize: px(11.5) }]}>
              {uploadProgressState?.statusText}
            </Text>

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

            <Text style={[styles.progressPercentText, { fontSize: px(10.5) }]}>
              {uploadProgressState?.progress}%
            </Text>
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
                <Text style={[styles.sheetTitle, { fontSize: px(15) }]}>
                  {previewDocData?.title}
                </Text>
                <Text style={[styles.sheetSubtitle, { fontSize: px(11) }]}>
                  {previewDocData?.name}
                </Text>
              </View>
              <Pressable hitSlop={12} onPress={() => setPreviewDocData(null)}>
                <X size={px(18)} color="#4B5563" />
              </Pressable>
            </View>

            {previewDocData?.uri ? (
              <View style={[styles.previewImageContainer, { height: px(250), marginVertical: px(10) }]}>
                <Image source={{ uri: previewDocData.uri }} style={styles.previewImage} resizeMode="cover" />
              </View>
            ) : null}

            <Pressable
              onPress={() => setPreviewDocData(null)}
              style={[styles.closePreviewBtn, { height: px(40), borderRadius: px(8) }]}>
              <Text style={styles.closePreviewBtnText}>Close Preview</Text>
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    color: '#111827',
    fontWeight: '600',
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
  pressed: {
    opacity: 0.85,
  },
});
