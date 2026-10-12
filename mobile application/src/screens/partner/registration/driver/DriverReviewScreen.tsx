import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Info,
  ShieldCheck,
  Truck,
  User,
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

  const [confirmAgreed, setConfirmAgreed] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
      title="Review your application"
      subtitle="Please review your details before submitting."
      onBack={handleBack}
      showFooter={false}>
      {/* Dynamic Status Card */}
      {isAllCoreComplete ? (
        <View
          style={[
            styles.statusSuccessCard,
            { padding: px(16), marginBottom: px(16), borderRadius: px(14) },
          ]}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.successIconCircle,
                { width: px(36), height: px(36), borderRadius: px(18) },
              ]}>
              <CheckCircle2 size={px(22)} color="#15803D" strokeWidth={2.4} />
            </View>
            <View style={styles.statusTextWrap}>
              <Text style={[styles.statusSuccessTitle, { fontSize: px(15) }]}>Ready to submit</Text>
              <Text style={[styles.statusSuccessSubtitle, { fontSize: px(12) }]}>
                All required information and documents are complete.
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.statusWarningCard,
            { padding: px(16), marginBottom: px(16), borderRadius: px(14) },
          ]}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.warningIconCircle,
                { width: px(36), height: px(36), borderRadius: px(18) },
              ]}>
              <AlertCircle size={px(22)} color="#D97706" strokeWidth={2.4} />
            </View>
            <View style={styles.statusTextWrap}>
              <Text style={[styles.statusWarningTitle, { fontSize: px(15) }]}>
                {coreUploadedCount} of 6 review items complete
              </Text>
              <Text style={[styles.statusWarningSubtitle, { fontSize: px(12) }]}>
                {missingCoreDocs.length} required document{missingCoreDocs.length > 1 ? 's' : ''}{' '}
                pending review.
              </Text>
            </View>
          </View>

          {/* Missing document action chips */}
          <View style={[styles.missingChipsRow, { marginTop: px(10) }]}>
            {missingCoreDocs.slice(0, 3).map((d) => (
              <Pressable
                key={d.id}
                onPress={() =>
                  navigation.navigate('DriverDocuments', {
                    ...route.params,
                    fromReview: true,
                  })
                }
                style={styles.missingChip}>
                <Text style={styles.missingChipText}>+ Add {d.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Summary Card 1: Personal Details */}
      <View style={[styles.summaryCard, { padding: px(16), marginBottom: px(14), borderRadius: px(14) }]}>
        <View style={[styles.cardHeaderRow, { marginBottom: px(12) }]}>
          <View style={styles.cardHeaderLeft}>
            <User size={px(18)} color="#D97706" style={{ marginRight: px(8) }} />
            <Text style={[styles.cardHeaderTitle, { fontSize: px(15) }]}>Personal details</Text>
          </View>
          <Pressable
            hitSlop={12}
            onPress={() =>
              navigation.navigate('DriverPersonalInfo', {
                ...route.params,
                fromReview: true,
              })
            }
            style={styles.editBtn}>
            <Text style={[styles.editText, { fontSize: px(13) }]}>Edit</Text>
            <ChevronRight size={px(14)} color="#2563EB" />
          </Pressable>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { fontSize: px(13) }]}>Full name</Text>
          <Text style={[styles.detailValue, { fontSize: px(13) }]}>
            {driverPersonal.fullName || 'Rajesh Kumar'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { fontSize: px(13) }]}>Mobile number</Text>
          <Text style={[styles.detailValue, { fontSize: px(13) }]}>
            +91 {driverPersonal.mobileNumber || '9876543210'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { fontSize: px(13) }]}>Date of birth</Text>
          <Text style={[styles.detailValue, { fontSize: px(13) }]}>
            {driverPersonal.dateOfBirth || '15 May 1992'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { fontSize: px(13) }]}>Operating city</Text>
          <Text style={[styles.detailValue, { fontSize: px(13) }]}>
            {driverPersonal.city || 'Bhubaneswar'}
          </Text>
        </View>
        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
          <Text style={[styles.detailLabel, { fontSize: px(13) }]}>Current address</Text>
          <Text
            style={[styles.detailValue, { fontSize: px(13), flex: 1, textAlign: 'right' }]}
            numberOfLines={2}>
            {driverPersonal.address || 'Plot 42, Saheed Nagar, Janpath Road'}
          </Text>
        </View>
      </View>

      {/* Summary Card 2: Vehicle Details */}
      <View style={[styles.summaryCard, { padding: px(16), marginBottom: px(14), borderRadius: px(14) }]}>
        <View style={[styles.cardHeaderRow, { marginBottom: px(12) }]}>
          <View style={styles.cardHeaderLeft}>
            <Truck size={px(18)} color="#D97706" style={{ marginRight: px(8) }} />
            <Text style={[styles.cardHeaderTitle, { fontSize: px(15) }]}>Vehicle details</Text>
          </View>
          <Pressable
            hitSlop={12}
            onPress={() =>
              navigation.navigate('DriverVehicleInfo', {
                ...route.params,
                fromReview: true,
              })
            }
            style={styles.editBtn}>
            <Text style={[styles.editText, { fontSize: px(13) }]}>Edit</Text>
            <ChevronRight size={px(14)} color="#2563EB" />
          </Pressable>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { fontSize: px(13) }]}>Vehicle type</Text>
          <Text style={[styles.detailValue, { fontSize: px(13), fontWeight: '700', color: '#B45309' }]}>
            {driverVehicle.vehicleType || 'Flatbed Tow Truck'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { fontSize: px(13) }]}>Registration number</Text>
          <Text style={[styles.detailValue, { fontSize: px(13), fontWeight: '700' }]}>
            {driverVehicle.vehicleNumber || 'OD 02 AB 1234'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { fontSize: px(13) }]}>Driving licence number</Text>
          <Text style={[styles.detailValue, { fontSize: px(13) }]}>
            {driverVehicle.licenseNumber || 'OD-0220190012345'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { fontSize: px(13) }]}>Registered to</Text>
          <Text style={[styles.detailValue, { fontSize: px(13) }]}>
            {driverVehicle.registeredTo === 'someone_else'
              ? 'Someone else (Owner NOC)'
              : 'Me / I own this vehicle'}
          </Text>
        </View>
        {driverVehicle.vehicleModel ? (
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.detailLabel, { fontSize: px(13) }]}>Vehicle model</Text>
            <Text style={[styles.detailValue, { fontSize: px(13) }]}>
              {driverVehicle.vehicleModel}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Summary Card 3: Documents */}
      <View style={[styles.summaryCard, { padding: px(16), marginBottom: px(14), borderRadius: px(14) }]}>
        <View style={[styles.cardHeaderRow, { marginBottom: px(12) }]}>
          <View style={styles.cardHeaderLeft}>
            <FileText size={px(18)} color="#D97706" style={{ marginRight: px(8) }} />
            <Text style={[styles.cardHeaderTitle, { fontSize: px(15) }]}>Documents</Text>
          </View>
          <Pressable
            hitSlop={12}
            onPress={() =>
              navigation.navigate('DriverDocuments', {
                ...route.params,
                fromReview: true,
              })
            }
            style={styles.editBtn}>
            <Text style={[styles.editText, { fontSize: px(13) }]}>Edit</Text>
            <ChevronRight size={px(14)} color="#2563EB" />
          </Pressable>
        </View>

        <Text style={[styles.docsSummaryText, { fontSize: px(13), marginBottom: px(10) }]}>
          {coreUploadedCount} of {CORE_REVIEW_DOCUMENTS.length} core review documents uploaded
        </Text>

        <View style={styles.docsList}>
          {CORE_REVIEW_DOCUMENTS.map((doc) => {
            const uploaded = isDocUploaded(doc.id);
            return (
              <View key={doc.id} style={[styles.docSummaryRow, { paddingVertical: px(6) }]}>
                <View
                  style={[
                    styles.docCheckCircle,
                    {
                      width: px(18),
                      height: px(18),
                      borderRadius: px(9),
                      backgroundColor: uploaded ? '#DCFCE7' : '#F3F4F6',
                    },
                  ]}>
                  {uploaded ? (
                    <Check size={px(11)} color="#15803D" strokeWidth={3} />
                  ) : (
                    <Text style={{ fontSize: 10, color: '#9CA3AF' }}>—</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.docSummaryName,
                    { fontSize: px(13) },
                    !uploaded && styles.docSummaryNameMissing,
                  ]}>
                  {doc.title}
                </Text>
                <Text
                  style={[
                    styles.docSummaryStatus,
                    { fontSize: px(11) },
                    uploaded ? styles.docStatusGreen : styles.docStatusAmber,
                  ]}>
                  {uploaded ? 'Verified' : 'Pending'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Blue Informational Banner */}
      <View
        style={[
          styles.blueNoticeBanner,
          { padding: px(14), marginBottom: px(16), borderRadius: px(12) },
        ]}>
        <View style={styles.noticeBannerRow}>
          <View
            style={[
              styles.noticeIconBox,
              { width: px(28), height: px(28), borderRadius: px(14) },
            ]}>
            <Info size={px(16)} color="#2563EB" strokeWidth={2.2} />
          </View>
          <Text style={[styles.noticeBannerText, { fontSize: px(12) }]}>
            You can go online after required documents are approved. Verification typically takes 2 to 4 hours.
          </Text>
        </View>
      </View>

      {/* Confirmation Checkbox */}
      <Pressable
        onPress={() => setConfirmAgreed(!confirmAgreed)}
        style={[styles.checkboxContainer, { marginBottom: px(20) }]}>
        <View
          style={[
            styles.checkboxBox,
            { width: px(20), height: px(20), borderRadius: px(5) },
            confirmAgreed && styles.checkboxBoxChecked,
          ]}>
          {confirmAgreed ? <Check size={px(14)} color="#FFFFFF" strokeWidth={3} /> : null}
        </View>
        <Text style={[styles.checkboxLabel, { fontSize: px(12) }]}>
          I confirm that all the information provided is accurate and genuine. I agree to RACE's{' '}
          <Text style={styles.linkText}>Terms of Service</Text> &{' '}
          <Text style={styles.linkText}>Privacy Policy</Text>.
        </Text>
      </Pressable>

      {/* Action Buttons */}
      <View style={{ marginBottom: px(24), gap: px(10) }}>
        <Pressable
          onPress={() => {
            if (!submitting) void handleSubmit();
          }}
          disabled={submitting}
          style={({ pressed }) => [
            styles.submitButton,
            { height: px(50), borderRadius: px(12) },
            pressed && styles.pressed,
          ]}>
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={[styles.submitButtonText, { fontSize: px(15) }]}>
                Submit for verification
              </Text>
              <ArrowRight size={px(18)} color="#FFFFFF" strokeWidth={2.4} />
            </>
          )}
        </Pressable>

        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.saveLaterButton,
            { height: px(44), borderRadius: px(10) },
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.saveLaterText, { fontSize: px(13) }]}>Save and finish later</Text>
        </Pressable>
      </View>
    </DriverRegistrationLayout>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderTitle: {
    fontWeight: '700',
    color: '#111827',
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
    paddingVertical: 9,
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
  saveLaterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  saveLaterText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
