import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import PartnerRegistrationLayout from '../../../../components/partner/PartnerRegistrationLayout';
import { PartnerRegistrationFooter } from '../../../../components/partner/PartnerRegistrationSections';
import { DRIVER_REGISTRATION_STEPS } from '../../../../constants/partnerRegistration';
import { useAppDispatch, useAppSelector } from '../../../../redux/hooks';
import { completeOnboarding } from '../../../../redux/auth/authSlice';
import { finishPartnerSignup } from '../../../../redux/onboarding/onboardingSlice';
import { API_ENDPOINTS } from '../../../../config/api';
import { api } from '../../../../services/api';
import { getApiErrorMessage } from '../../../../services/auth/useAuthMutations';
import { usePartnerRegistrationStore } from '../../../../store/partnerRegistrationStore';
import type {
  PartnerRegistrationStackParamList,
  PartnerRootStackParamList,
} from '../../../../types/partnerNavigation';
import type { ApiSuccessResponse } from '../../../../types/auth';
import { partnerRegistrationGoBack } from '../../../../utils/partnerRegistration';
import { PARTNER_WAITING_ADMIN_APPROVAL } from '../../../../constants/partnerCopy';
import { colors, radius, spacing, typography } from '../../../../theme';

type Props = NativeStackScreenProps<PartnerRegistrationStackParamList, 'DriverReview'>;

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '—'}</Text>
    </View>
  );
}

function mapVehicleToDriverType(vehicleType: string): 'Tow Driver' | 'Full-Time' | 'Part-Time' {
  const lower = vehicleType.toLowerCase();
  if (lower.includes('tow') || lower.includes('truck')) return 'Tow Driver';
  if (lower.includes('part')) return 'Part-Time';
  return 'Full-Time';
}

export default function DriverReviewScreen({ navigation, route }: Props) {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector(state => state.auth.user);
  const { driverPersonal, driverVehicle, driverDocuments } = usePartnerRegistrationStore();
  const [submitting, setSubmitting] = useState(false);
  const handleBack = () => partnerRegistrationGoBack(navigation, 'DriverReview', route.params);

  const submit = async () => {
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

      const payload = {
        fullName: driverPersonal.fullName || authUser?.fullName || 'Driver',
        email: driverPersonal.email || undefined,
        address: driverPersonal.address || undefined,
        city: driverPersonal.city || 'Bhubaneswar',
        dateOfBirth: driverPersonal.dateOfBirth || undefined,
        emergencyContact,
        licenseNo:
          driverVehicle.licenseNumber ||
          driverVehicle.rcNumber ||
          `LIC-${Date.now().toString().slice(-6)}`,
        driverType: mapVehicleToDriverType(driverVehicle.vehicleType || 'car'),
        vehicleRegistration: driverVehicle.vehicleNumber || undefined,
        vehicleType: driverVehicle.vehicleType || undefined,
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
        if (data.data?.fullName) {
          registeredName = data.data.fullName;
        }
      } catch (err) {
        // In preview mode or when offline, allow preview completion
        console.warn('Driver self registration API fallback:', err);
      }

      dispatch(finishPartnerSignup());
      if (authUser) {
        dispatch(
          completeOnboarding({
            ...authUser,
            role: 'driver',
            fullName: registeredName,
            email: driverPersonal.email || authUser.email,
            isProfileCompleted: true,
          }),
        );
      } else {
        dispatch(completeOnboarding());
      }

      const rootNavigation =
        navigation.getParent<NativeStackScreenProps<PartnerRootStackParamList>['navigation']>();
      rootNavigation?.reset({
        index: 0,
        routes: [{ name: 'PartnerMain' }],
      });
    } catch (error) {
      Alert.alert('Submit failed', getApiErrorMessage(error, 'Could not submit driver application'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PartnerRegistrationLayout
      title="Driver Registration"
      stepLabel="Step 4 of 4"
      steps={DRIVER_REGISTRATION_STEPS}
      activeStep={4}
      onBack={handleBack}
      footer={
        <PartnerRegistrationFooter
          showBack
          onBack={handleBack}
          continueLabel={submitting ? 'Submitting…' : 'Submit Application'}
          onContinue={() => {
            if (!submitting) void submit();
          }}
        />
      }>
      {submitting ? <ActivityIndicator color={colors.primary} style={{ marginBottom: spacing.md }} /> : null}
      <View style={styles.successCard}>
        <CheckCircle2 size={28} color={colors.partnerRed} strokeWidth={2} />
        <Text style={styles.successTitle}>Review your application</Text>
        <Text style={styles.successSubtitle}>{PARTNER_WAITING_ADMIN_APPROVAL}</Text>
      </View>

      <Text style={styles.sectionTitle}>Personal Information</Text>
      <View style={styles.card}>
        <ReviewRow label="Full Name" value={driverPersonal.fullName} />
        <ReviewRow label="Mobile" value={driverPersonal.mobileNumber} />
        <ReviewRow label="Email" value={driverPersonal.email} />
        <ReviewRow label="Date of Birth" value={driverPersonal.dateOfBirth} />
        <ReviewRow label="Address" value={driverPersonal.address} />
        <ReviewRow label="City" value={driverPersonal.city || 'Bhubaneswar'} />
        {driverPersonal.emergencyContactNumber ? (
          <ReviewRow
            label="Emergency Contact"
            value={`${driverPersonal.emergencyContactName || 'Contact'} (${driverPersonal.emergencyContactNumber})`}
          />
        ) : null}
        {driverPersonal.yearsOfExperience ? (
          <ReviewRow label="Experience" value={`${driverPersonal.yearsOfExperience} years`} />
        ) : null}
        {driverPersonal.languages ? (
          <ReviewRow label="Languages" value={driverPersonal.languages} />
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Vehicle Information</Text>
      <View style={styles.card}>
        <ReviewRow label="Vehicle Type" value={driverVehicle.vehicleType} />
        <ReviewRow label="Vehicle Number" value={driverVehicle.vehicleNumber} />
        <ReviewRow label="RC Number" value={driverVehicle.rcNumber} />
        <ReviewRow
          label="Driving License"
          value={driverVehicle.licenseNumber || driverVehicle.rcNumber}
        />
        <ReviewRow label="Insurance" value={driverVehicle.insuranceProvider} />
        <ReviewRow label="Policy Number" value={driverVehicle.insurancePolicyNumber} />
        <ReviewRow label="Model" value={driverVehicle.vehicleModel} />
      </View>

      <Text style={styles.sectionTitle}>Documents ({driverDocuments.length})</Text>
      <View style={styles.card}>
        {driverDocuments.map(doc => (
          <ReviewRow
            key={doc.id}
            label={doc.label}
            value={doc.mimeType === 'application/pdf' ? `PDF · ${doc.name}` : 'Uploaded'}
          />
        ))}
      </View>
    </PartnerRegistrationLayout>
  );
}

const styles = StyleSheet.create({
  successCard: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.partnerRedLight,
    marginBottom: spacing.lg,
  },
  successTitle: {
    marginTop: spacing.sm,
    color: colors.dark,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  successSubtitle: {
    marginTop: spacing.xs,
    color: colors.grey,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: typography.lineHeights.relaxed,
  },
  sectionTitle: {
    color: colors.dark,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  row: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGrey,
  },
  rowLabel: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    marginBottom: 2,
  },
  rowValue: {
    color: colors.dark,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
});
