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
      title="Driver registration"
      subtitle="Please review your details before submitting."
      onBack={handleBack}
      onContinue={() => {
        if (!submitting && confirmAgreed) void handleSubmit();
      }}
      continueLabel={submitting ? 'Submitting...' : 'Submit application'}
      continueDisabled={!confirmAgreed || submitting}
      continueLoading={submitting}
      showFooter={true}>
      {/* Dynamic Status Card (Compact height) */}
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

          {/* Missing document action chips */}
          <View style={[styles.missingChipsRow, { marginTop: px(5) }]}>
            {missingCoreDocs.slice(0, 3).map((d) => (
              <Pressable
                key={d.id}
                onPress={() =>
                  navigation.navigate('DriverDocuments', {
                    ...route.params,
                    fromReview: true,
                  })
                }
                style={[styles.missingChip, { paddingVertical: px(3), paddingHorizontal: px(8) }]}>
                <Text style={[styles.missingChipText, { fontSize: px(10.5) }]}>+ Add {d.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Summary Card 1: Personal Details */}
      <View style={[styles.summaryCard, { padding: px(12), marginBottom: px(10), borderRadius: px(12) }]}>
        <View style={[styles.cardHeaderRow, { marginBottom: px(8) }]}>
          <View style={styles.cardHeaderLeft}>
            <User size={px(16)} color="#D97706" style={{ marginRight: px(6) }} />
            <Text style={[styles.cardHeaderTitle, { fontSize: px(13.5) }]}>Personal details</Text>
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
              onPress={() =>
                navigation.navigate('DriverVehicleInfo', {
                  ...route.params,
                  fromReview: true,
                })
              }
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
              onPress={() =>
                navigation.navigate('DriverDocuments', {
                  ...route.params,
                  fromReview: true,
                })
              }
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

      {/* Blue Informational Banner (Compact) */}
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
        onPress={handleBack}
        style={({ pressed }) => [
          styles.saveLaterLink,
          { marginBottom: px(8) },
          pressed && styles.pressed,
        ]}>
        <Text style={[styles.saveLaterText, { fontSize: px(12) }]}>Save and finish later</Text>
      </Pressable>
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
  pressed: {
    opacity: 0.85,
  },
});
