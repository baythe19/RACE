import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import {
  Building2,
  Check,
  ChevronDown,
  CreditCard,
  FileText,
  MapPin,
  Pencil,
  ShieldCheck,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DriverRegistrationLayout from '../../../../components/partner/DriverRegistrationLayout';
import { usePartnerDialog } from '../../../../hooks/usePartnerDialog';
import { PartnerText } from '../../../../components/partner/PartnerText';
import { VENDOR_REGISTRATION_STEPS } from '../../../../constants/partnerRegistration';
import { getVendorDocumentTypeLabel } from '../../../../constants/partnerRegistrationDocuments';
import {
  getMissingRequiredDocuments,
  mapVendorTypeFromBusinessLabel,
  VENDOR_UI_TO_BACKEND_DOC,
} from '../../../../constants/backendRequiredDocuments';
import { useAppDispatch, useAppSelector } from '../../../../redux/hooks';
import { completeOnboarding, updateTokens, updateUser } from '../../../../redux/auth/authSlice';
import { finishPartnerSignup } from '../../../../redux/onboarding/onboardingSlice';
import { getApiErrorMessage } from '../../../../services/auth/useAuthMutations';
import { refreshAuthSession } from '../../../../services/authService';
import { saveTokens } from '../../../../services/api';
import { getVendorStatus, registerVendor, uploadVendorDocument } from '../../../../services/vendor/vendorApi';
import { usePartnerRegistrationStore } from '../../../../store/partnerRegistrationStore';
import type {
  PartnerRegistrationStackParamList,
  PartnerRootStackParamList,
} from '../../../../types/partnerNavigation';
import type { VendorType } from '../../../../types/vendor';
import { partnerRegistrationGoBack } from '../../../../utils/partnerRegistration';

type Props = NativeStackScreenProps<PartnerRegistrationStackParamList, 'VendorReview'>;

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.detailRow}>
      <PartnerText style={styles.detailLabel}>{label}</PartnerText>
      <PartnerText style={styles.detailValue}>{value?.trim() || 'Not provided'}</PartnerText>
    </View>
  );
}

function ReviewSection({
  title,
  summary,
  Icon,
  complete,
  expanded,
  onToggle,
  onEdit,
  children,
}: {
  title: string;
  summary: string;
  Icon: LucideIcon;
  complete: boolean;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Pressable
          onPress={onToggle}
          style={styles.sectionMain}
          accessibilityRole="button"
          accessibilityState={{ expanded }}>
          <View style={[styles.checkMark, complete ? styles.checkMarkComplete : styles.checkMarkPending]}>
            {complete ? <Check size={13} color="#15803D" strokeWidth={3} /> : null}
          </View>
          <View style={styles.sectionIcon}>
            <Icon size={16} color="#D97706" strokeWidth={2.2} />
          </View>
          <View style={styles.sectionCopy}>
            <PartnerText style={styles.sectionTitle}>{title}</PartnerText>
            <PartnerText style={styles.sectionSummary} numberOfLines={1}>{summary}</PartnerText>
          </View>
        </Pressable>
        <Pressable
          onPress={onEdit}
          style={styles.editButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={'Edit ' + title}>
          <Pencil size={12} color="#2563EB" />
          <PartnerText style={styles.editText}>Edit</PartnerText>
        </Pressable>
        <Pressable onPress={onToggle} style={styles.expandButton} hitSlop={8} accessibilityRole="button">
          <ChevronDown size={15} color="#6B7280" style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }} />
        </Pressable>
      </View>
      {expanded ? <View style={styles.sectionDetails}>{children}</View> : null}
    </View>
  );
}

export default function VendorReviewScreen({ navigation, route }: Props) {
  const { dialog: partnerDialog, showAlert } = usePartnerDialog();
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.user);
  const { vendorBusiness, vendorAddress, vendorDocuments } = usePartnerRegistrationStore();
  const [submitting, setSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const handleBack = () => partnerRegistrationGoBack(navigation, 'VendorReview', route.params);
  const uploadedDocs = vendorDocuments;
  const missingRequiredDocs = getMissingRequiredDocuments(
    mapVendorTypeFromBusinessLabel(vendorBusiness.businessType || 'towing company'),
    vendorDocuments.map((doc) => doc.id),
  );
  const formatMobile = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 10 ? '+91 ' + digits.slice(0, 5) + ' ' + digits.slice(5) : value || 'Not provided';
  };
  const toggleSection = (section: string) =>
    setExpandedSection((current) => current === section ? null : section);

  const submit = async () => {
    if (!termsAccepted || submitting) return;
    if (missingRequiredDocs.length > 0) {
      showAlert({
        tone: 'warning',
        title: 'Documents required',
        message: `Return to Documents and add ${missingRequiredDocs.join(' and ')} before submitting.`,
      });
      return;
    }
    setSubmitting(true);
    try {
      // Already submitted once? Re-open this screen (token refresh / retry)
      // must jump to the live application status instead of re-registering.
      try {
        const existing = await getVendorStatus();
        if (existing && !['draft', 'changes_requested'].includes(existing.status)) {
          dispatch(finishPartnerSignup());
          if (!authUser) {
            const token = 'mock-vendor-token';
            await saveTokens(token, token);
          }
          dispatch(
            completeOnboarding(
              authUser
                ? { ...authUser, role: 'vendor', isProfileCompleted: true }
                : {
                    id: 'vendor-existing',
                    mobileNumber: vendorBusiness.mobileNumber ?? '',
                    role: 'vendor',
                    fullName: vendorBusiness.ownerName || 'Vendor',
                    email: vendorBusiness.email,
                    isVerified: true,
                    isProfileCompleted: true,
                  },
            ),
          );
          const rootNavigation =
            navigation.getParent<NativeStackScreenProps<PartnerRootStackParamList>['navigation']>();
          const routeNames = rootNavigation?.getState()?.routeNames;
          if (routeNames?.includes('PartnerMain')) {
            rootNavigation?.reset({ index: 0, routes: [{ name: 'PartnerMain' }] });
          }
          return;
        }
      } catch {
        // No application yet (404) — continue with a fresh submit.
      }

      const address = [
        vendorAddress.addressLine1,
        vendorAddress.addressLine2,
        vendorAddress.city,
        vendorAddress.state,
        vendorAddress.pinCode,
      ].filter(Boolean).join(', ');

      const bankDetails =
        vendorBusiness.accountNumber && vendorBusiness.ifsc
          ? {
              accountHolderName: vendorBusiness.accountHolderName || vendorBusiness.ownerName || 'Vendor',
              accountNumber: vendorBusiness.accountNumber,
              ifsc: vendorBusiness.ifsc.toUpperCase(),
            }
          : undefined;

      await registerVendor({
        vendorType: mapVendorTypeFromBusinessLabel(
          vendorBusiness.businessType || 'towing company',
        ) as VendorType,
        businessName: vendorBusiness.businessName,
        ownerName: vendorBusiness.ownerName || authUser?.fullName || '',
        mobileNumber: vendorBusiness.mobileNumber || authUser?.mobileNumber || '',
        email: vendorBusiness.email || undefined,
        address: address || undefined,
        bankDetails,
        acceptTerms: termsAccepted,
      });

      try {
        const session = await refreshAuthSession();
        dispatch(updateTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken }));
        dispatch(updateUser(session.user));
      } catch {
        // Role middleware can resolve the saved vendor role when session refresh is unavailable.
      }

      for (const doc of vendorDocuments) {
        const documentType = VENDOR_UI_TO_BACKEND_DOC[doc.id] ?? 'other';
        try {
          await uploadVendorDocument(documentType, {
            uri: doc.uri,
            name: doc.name,
            mimeType: doc.mimeType ?? 'image/jpeg',
          });
        } catch (error) {
          console.warn('Vendor document upload can be retried from verification review.', error);
        }
      }

      dispatch(finishPartnerSignup());
      if (!authUser) {
        const token = 'mock-vendor-token';
        await saveTokens(token, token);
      }
      dispatch(
        completeOnboarding(
          authUser
            ? {
                ...authUser,
                role: 'vendor',
                fullName: vendorBusiness.ownerName || authUser.fullName,
                email: vendorBusiness.email || authUser.email,
                isProfileCompleted: true,
              }
            : {
                id: 'vendor-' + Date.now(),
                mobileNumber: vendorBusiness.mobileNumber,
                role: 'vendor',
                fullName: vendorBusiness.ownerName,
                email: vendorBusiness.email,
                isVerified: true,
                isProfileCompleted: true,
              },
        ),
      );

      const rootNavigation =
        navigation.getParent<NativeStackScreenProps<PartnerRootStackParamList>['navigation']>();
      const routeNames = rootNavigation?.getState()?.routeNames;
      if (routeNames?.includes('PartnerMain')) {
        rootNavigation?.reset({ index: 0, routes: [{ name: 'PartnerMain' }] });
      }
    } catch (error) {
      showAlert({
        tone: 'error',
        title: 'Submit failed',
        message: getApiErrorMessage(error, 'Could not submit vendor application'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const businessSummary = vendorBusiness.businessName || 'Business details';
  const addressSummary = [vendorAddress.city, vendorAddress.state].filter(Boolean).join(', ') || 'Business location';
  const documentSummary = missingRequiredDocs.length === 0
    ? uploadedDocs.length + ' file' + (uploadedDocs.length === 1 ? '' : 's') + ' uploaded'
    : 'Missing: ' + missingRequiredDocs.join(', ');

  return (
    <View style={{ flex: 1 }}>
    <DriverRegistrationLayout
      step={4}
      stepLabels={VENDOR_REGISTRATION_STEPS}
      title="Vendor registration"
      subtitle="Review your details before submitting."
      onBack={handleBack}
      onContinue={() => { void submit(); }}
      continueLabel="Submit application"
      continueDisabled={!termsAccepted || submitting || missingRequiredDocs.length > 0}
      continueLoading={submitting}>
      <View style={styles.readyBanner}>
        <View style={styles.readyIcon}><ShieldCheck size={17} color={missingRequiredDocs.length === 0 ? '#15803D' : '#B45309'} /></View>
        <View style={styles.readyCopy}>
          <PartnerText style={styles.readyTitle}>
            {missingRequiredDocs.length === 0 ? 'Ready to submit' : 'Required documents are missing'}
          </PartnerText>
          <PartnerText style={styles.readySubtitle}>
            {missingRequiredDocs.length === 0
              ? 'Review your business information and confirm to continue.'
              : 'Go back to Documents and upload each required file.'}
          </PartnerText>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <ReviewSection
          title="Business details"
          summary={businessSummary}
          Icon={Building2}
          complete={Boolean(vendorBusiness.businessName && vendorBusiness.ownerName && vendorBusiness.mobileNumber && vendorBusiness.businessType)}
          expanded={expandedSection === 'business'}
          onToggle={() => toggleSection('business')}
          onEdit={() => navigation.navigate('VendorBusinessInfo', route.params)}>
          <DetailRow label="Business name" value={vendorBusiness.businessName} />
          <DetailRow label="Owner name" value={vendorBusiness.ownerName} />
          <DetailRow label="Mobile number" value={formatMobile(vendorBusiness.mobileNumber)} />
          <DetailRow label="Email" value={vendorBusiness.email || 'Optional'} />
          <DetailRow label="Business type" value={vendorBusiness.businessType} />
        </ReviewSection>

        <ReviewSection
          title="Business address"
          summary={addressSummary}
          Icon={MapPin}
          complete={Boolean(vendorAddress.addressLine1 && vendorAddress.city && vendorAddress.state && vendorAddress.pinCode)}
          expanded={expandedSection === 'address'}
          onToggle={() => toggleSection('address')}
          onEdit={() => navigation.navigate('VendorBusinessAddress', route.params)}>
          <DetailRow label="Address" value={[vendorAddress.addressLine1, vendorAddress.addressLine2].filter(Boolean).join(', ')} />
          <DetailRow label="City and state" value={[vendorAddress.city, vendorAddress.state].filter(Boolean).join(', ')} />
          <DetailRow label="PIN code" value={vendorAddress.pinCode} />
          <DetailRow label="Landmark" value={vendorAddress.landmark || 'Optional'} />
          {vendorBusiness.accountNumber ? <DetailRow label="Payout account" value={'Ending in ' + vendorBusiness.accountNumber.slice(-4)} /> : null}
        </ReviewSection>

        <ReviewSection
          title="Documents"
          summary={documentSummary}
          Icon={FileText}
          complete={missingRequiredDocs.length === 0}
          expanded={expandedSection === 'documents'}
          onToggle={() => toggleSection('documents')}
          onEdit={() => navigation.navigate('VendorDocuments', route.params)}>
          {uploadedDocs.length === 0 ? (
            <PartnerText style={styles.documentName}>No documents added yet.</PartnerText>
          ) : (
            uploadedDocs.map((doc) => (
              <View key={doc.id} style={styles.documentRow}>
                <View style={[styles.documentStatus, styles.documentStatusUploaded]}>
                  <Check size={10} color="#15803D" strokeWidth={3} />
                </View>
                <PartnerText style={styles.documentName}>{getVendorDocumentTypeLabel(doc.id)}</PartnerText>
                <PartnerText style={[styles.documentState, styles.documentStateUploaded]}>
                  Uploaded
                </PartnerText>
              </View>
            ))
          )}
        </ReviewSection>

        {vendorBusiness.accountNumber ? (
          <View style={styles.payoutNote}>
            <CreditCard size={14} color="#6B7280" />
            <PartnerText style={styles.payoutText}>
              Payout account ending {vendorBusiness.accountNumber.slice(-4)} will be used for settlements.
            </PartnerText>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={() => setTermsAccepted((accepted) => !accepted)}
        style={styles.termsRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: termsAccepted }}>
        <View style={[styles.termsCheckbox, termsAccepted && styles.termsCheckboxChecked]}>
          {termsAccepted ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
        </View>
        <PartnerText style={styles.termsText}>
          I confirm that these details and documents are accurate and agree to the RACE Partner{' '}
          <PartnerText
            style={styles.termsLink}
            onPress={() => void Linking.openURL('https://www.raceservice.in/terms.html')}>
            Terms and Verification Policy
          </PartnerText>
          .
        </PartnerText>
      </Pressable>
    </DriverRegistrationLayout>
    {partnerDialog}
    </View>
  );
}

const styles = StyleSheet.create({
  readyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
  },
  readyIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#DCFCE7' },
  readyCopy: { flex: 1 },
  readyTitle: { color: '#166534', fontSize: 13.5, fontWeight: '800' },
  readySubtitle: { marginTop: 2, color: '#4B5563', fontSize: 12, lineHeight: 16 },
  summaryCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  section: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sectionHeader: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  sectionMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkMark: { width: 21, height: 21, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  checkMarkComplete: { backgroundColor: '#DCFCE7' },
  checkMarkPending: { backgroundColor: '#FEF3C7' },
  sectionIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#FEF3C7' },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { color: '#111827', fontSize: 14, fontWeight: '800' },
  sectionSummary: { marginTop: 2, color: '#6B7280', fontSize: 11.5, lineHeight: 15 },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 999,
    backgroundColor: '#F0F9FF',
  },
  editText: { color: '#2563EB', fontSize: 11.5, fontWeight: '700' },
  expandButton: { width: 28, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#F3F4F6' },
  sectionDetails: { paddingHorizontal: 34, paddingBottom: 12 },
  detailRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailLabel: { color: '#6B7280', fontSize: 11, fontWeight: '500' },
  detailValue: { marginTop: 2, color: '#111827', fontSize: 12.5, fontWeight: '600', lineHeight: 17 },
  documentRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  documentStatus: { width: 19, height: 19, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB' },
  documentStatusUploaded: { borderColor: '#BBF7D0', backgroundColor: '#DCFCE7' },
  documentName: { flex: 1, color: '#374151', fontSize: 12.5 },
  documentState: { color: '#B45309', fontSize: 11, fontWeight: '600' },
  documentStateUploaded: { color: '#15803D' },
  payoutNote: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, marginTop: 2 },
  payoutText: { flex: 1, color: '#6B7280', fontSize: 11.5, lineHeight: 16 },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
  },
  termsCheckbox: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  termsCheckboxChecked: { borderColor: '#F59E0B', backgroundColor: '#F59E0B' },
  termsText: { flex: 1, color: '#374151', fontSize: 11.5, lineHeight: 16 },
  termsLink: { color: '#D97706', fontWeight: '700', textDecorationLine: 'underline' },
});
