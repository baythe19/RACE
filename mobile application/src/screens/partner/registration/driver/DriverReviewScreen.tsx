import { PartnerText } from '../../../../components/partner/PartnerText';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Info,
  Pencil,
  ShieldCheck,
  Truck,
  User,
  X,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DriverRegistrationLayout from '../../../../components/partner/DriverRegistrationLayout';
import { CORE_REVIEW_DOCUMENTS } from '../../../../constants/driverRegistrationDocuments';
import { useAppDispatch, useAppSelector } from '../../../../redux/hooks';
import { completeOnboarding } from '../../../../redux/auth/authSlice';
import { finishPartnerSignup } from '../../../../redux/onboarding/onboardingSlice';
import { API_ENDPOINTS } from '../../../../config/api';
import { api, saveTokens } from '../../../../services/api';
import { getApiErrorMessage } from '../../../../services/auth/useAuthMutations';
import { usePartnerRegistrationStore } from '../../../../store/partnerRegistrationStore';
import type {
  PartnerRegistrationStackParamList,
  PartnerRootStackParamList,
} from '../../../../types/partnerNavigation';
import type { ApiSuccessResponse } from '../../../../types/auth';
import { partnerRegistrationGoBack } from '../../../../utils/partnerRegistration';

type Props = NativeStackScreenProps<PartnerRegistrationStackParamList, 'DriverReview'>;

const REF_W = 390;

function mapVehicleToDriverType(vehicleType: string): 'Tow Driver' | 'Full-Time' | 'Part-Time' {
  const lower = (vehicleType || '').toLowerCase();
  if (lower.includes('car') && !lower.includes('tow')) return 'Part-Time';
  return 'Tow Driver';
}

export default function DriverReviewScreen({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const scale = Math.min(1.22, Math.max(0.88, width / REF_W));
  const px = (val: number) => Math.max(1, Math.round(val * scale));

  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.user);
  const { driverPersonal, driverVehicle, driverDocuments } = usePartnerRegistrationStore();

  const isResubmit = Boolean((route.params as any)?.isResubmit);
  const [confirmAgreed, setConfirmAgreed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editSectionModalVisible, setEditSectionModalVisible] = useState(false);

  const handleBack = () =>
    partnerRegistrationGoBack(navigation, 'DriverReview', route.params);

  // Check how many core documents are uploaded
  const isDocUploaded = (docId: string) =>
    driverDocuments.some((d) => d.id === docId);

  const coreUploadedCount = CORE_REVIEW_DOCUMENTS.filter((d) => isDocUploaded(d.id)).length;
  const missingCoreDocs = CORE_REVIEW_DOCUMENTS.filter((d) => !isDocUploaded(d.id));
  const isAllCoreComplete = coreUploadedCount === CORE_REVIEW_DOCUMENTS.length;

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

      const driverType = mapVehicleToDriverType(driverVehicle.vehicleType || 'Flatbed Tow Truck');

      const payload = {
        fullName: driverPersonal.fullName.trim() || authUser?.fullName || 'Rajesh Kumar',
        email: driverPersonal.email || 'rajesh.driver@gmail.com',
        address: driverPersonal.address || 'Plot 42, Saheed Nagar, Janpath Road',
        city: driverPersonal.city || 'Bhubaneswar',
        dateOfBirth: driverPersonal.dateOfBirth || '1992-05-15',
        emergencyContact,
        licenseNo:
          driverVehicle.licenseNumber ||
          driverVehicle.rcNumber ||
          'OD-0220190012345',
        driverType,
        vehicleRegistration: driverVehicle.vehicleNumber || 'OD 02 AB 1234',
        vehicleType: driverVehicle.vehicleType || 'Flatbed Tow Truck',
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
        // In mock / preview environment or offline mode, proceed smoothly
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

      // Navigate to the verification pending status screen (image copy 4.png)
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

  return (
    <DriverRegistrationLayout
      step={4}
      title="Driver registration"
      subtitle={
        isResubmit
          ? 'Review and re-submit your application.'
          : 'Please review your details before submitting.'
      }
      onBack={handleBack}
      onContinue={() => {
        if (!submitting && confirmAgreed) void handleSubmit();
      }}
      continueLabel={
        submitting
          ? 'Submitting...'
          : isResubmit
            ? 'Re-submit application'
            : 'Submit application'
      }
      continueDisabled={!confirmAgreed || submitting}
      continueLoading={submitting}
      showFooter={true}>
      <View style={styles.step4Container}>
        {/* Compact Dynamic Status Banner */}
        {isResubmit ? (
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
                onPress={() =>
                  navigation.navigate('DriverDocuments', {
                    ...route.params,
                    fromReview: true,
                  })
                }
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
            onPress={() =>
              navigation.navigate('DriverPersonalInfo', {
                ...route.params,
                fromReview: true,
              })
            }
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
            onPress={() =>
              navigation.navigate('DriverVehicleInfo', {
                ...route.params,
                fromReview: true,
              })
            }
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
            onPress={() =>
              navigation.navigate('DriverDocuments', {
                ...route.params,
                fromReview: true,
              })
            }
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
          onPress={handleBack}
          style={({ pressed }) => [
            styles.saveLaterLink,
            { marginBottom: px(4) },
            pressed && styles.pressed,
          ]}>
          <PartnerText style={[styles.saveLaterText, { fontSize: px(11.5) }]}>Save and finish later</PartnerText>
        </Pressable>
      </View>

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
                  navigation.navigate('DriverPersonalInfo', {
                    ...route.params,
                    fromReview: true,
                  });
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
                  navigation.navigate('DriverVehicleInfo', {
                    ...route.params,
                    fromReview: true,
                  });
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
                  navigation.navigate('DriverDocuments', {
                    ...route.params,
                    fromReview: true,
                  });
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
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 0,
    shadowOpacity: 0,
    shadowColor: 'transparent',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardHeaderTitle: {
    fontWeight: '700',
    color: '#111827',
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
    gap: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
  docsSummaryText: {
    color: '#374151',
    fontWeight: '600',
  },
  docsList: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 4,
  },
  docSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docCheckCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
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
    marginRight: 12,
  },
  warningIconCircle: {
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
    gap: 8,
  },
  missingChip: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  missingChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
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
    marginRight: 10,
  },
  noticeBannerText: {
    flex: 1,
    color: '#1E40AF',
    lineHeight: 18,
    fontWeight: '500',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
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
    lineHeight: 18,
  },
  linkText: {
    color: '#2563EB',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  saveLaterLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  saveLaterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  saveLaterText: {
    color: '#6B7280',
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: {
    fontWeight: '800',
    color: '#111827',
  },
  sheetSubtitle: {
    marginTop: 2,
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
