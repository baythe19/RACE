import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import AuthToast from '../../components/auth/AuthToast';
import DocumentStatusChip from '../../components/vendor/DocumentStatusChip';
import GlassCard from '../../components/ui/GlassCard';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { getVendorConfig } from '../../data/vendorWizardConfig';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { completeOnboarding } from '../../redux/auth/authSlice';
import { finishPartnerSignup } from '../../redux/onboarding/onboardingSlice';
import { resetVendorWizard } from '../../redux/vendor/vendorOnboardingSlice';
import { getApiErrorMessage } from '../../services/api/apiClient';
import { useRegisterVendorMutation } from '../../services/vendor/useVendorMutations';
import type { VendorFlowParamList } from '../../types/navigation';
import type { UploadedDocument } from '../../types/vendor';
import { colors, spacing, typography } from '../../theme';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<VendorFlowParamList, 'VendorReview'>;

export default function ReviewSubmissionScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const draft = useAppSelector((state) => state.vendorOnboarding.draft);
  const partnerSignupRequired = useAppSelector((state) => state.onboarding.partnerSignupRequired);
  const registerMutation = useRegisterVendorMutation();
  const [error, setError] = React.useState('');

  const config = draft ? getVendorConfig(draft.vendorType) : undefined;

  const handleSubmit = async () => {
    if (!draft) return;
    setError('');

    try {
      await registerMutation.mutateAsync({
        vendorType: draft.vendorType,
        businessName: draft.businessName,
        ownerName: draft.ownerName,
        mobileNumber: draft.mobileNumber,
        email: draft.email,
        address: draft.address,
        towVehicle: draft.towVehicle,
        bankDetails: draft.bankDetails,
        driverProfile: draft.driverProfile,
        documents: draft.documents
          .filter((d: UploadedDocument) => d.fileUrl)
          .map((d: UploadedDocument) => ({
            documentType: d.documentType,
            fileUrl: d.fileUrl,
            fileName: d.fileName,
          })),
        acceptTerms: true,
      });
      dispatch(resetVendorWizard());
      navigation.replace('VendorVerificationStatus', { fromSignup: partnerSignupRequired });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to submit application'));
    }
  };

  if (!draft) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.title}>No application data</Text>
        <PrimaryButton label="Go Back" onPress={() => goBackWithinStack(navigation)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Review & Submit</Text>
        <Text style={styles.subtitle}>Verify everything before sending for approval</Text>

        <GlassCard>
          <Text style={styles.section}>Partner Type</Text>
          <Text style={styles.value}>{config?.title ?? draft.vendorType}</Text>

          <Text style={styles.section}>Contact</Text>
          <Text style={styles.value}>{draft.ownerName}</Text>
          <Text style={styles.valueMuted}>+91 {draft.mobileNumber}</Text>
          {draft.email ? <Text style={styles.valueMuted}>{draft.email}</Text> : null}

          {draft.businessName ? (
            <>
              <Text style={styles.section}>Business</Text>
              <Text style={styles.value}>{draft.businessName}</Text>
            </>
          ) : null}

          {draft.bankDetails ? (
            <>
              <Text style={styles.section}>Bank</Text>
              <Text style={styles.value}>{draft.bankDetails.accountHolderName}</Text>
              <Text style={styles.valueMuted}>****{draft.bankDetails.accountNumber.slice(-4)}</Text>
            </>
          ) : null}

          <Text style={styles.section}>Documents ({draft.documents.filter((d: UploadedDocument) => d.fileUrl).length})</Text>
          {draft.documents
            .filter((d: UploadedDocument) => d.fileUrl)
            .map((doc: UploadedDocument) => (
              <View key={doc.documentType} style={styles.docRow}>
                <Text style={styles.valueMuted}>{doc.documentType.replace(/_/g, ' ')}</Text>
                {doc.verificationStatus ? (
                  <DocumentStatusChip status={doc.verificationStatus} />
                ) : (
                  <DocumentStatusChip status="pending" />
                )}
              </View>
            ))}
        </GlassCard>

        <AuthToast message={error} />

        <PrimaryButton
          label={registerMutation.isPending ? 'Submitting...' : 'Submit for Verification'}
          onPress={() => void handleSubmit()}
          disabled={registerMutation.isPending}
        />
        <PrimaryButton label="Edit Application" variant="outline" onPress={() => goBackWithinStack(navigation)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surfaceDarker },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { color: colors.textLight, fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold },
  subtitle: { color: colors.subtext, marginBottom: spacing.lg, marginTop: spacing.xs },
  section: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    fontSize: typography.sizes.xs,
    letterSpacing: 1,
  },
  value: { color: colors.textLight, fontWeight: typography.weights.semibold },
  valueMuted: { color: colors.subtext, marginTop: 2, textTransform: 'capitalize' },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
});
