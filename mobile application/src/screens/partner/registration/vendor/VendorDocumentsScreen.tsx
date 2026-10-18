import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DriverRegistrationLayout from '../../../../components/partner/DriverRegistrationLayout';
import PartnerDocumentUploadList from '../../../../components/partner/PartnerDocumentUploadList';
import PartnerRegistrationStepCard from '../../../../components/partner/PartnerRegistrationStepCard';
import { PartnerText } from '../../../../components/partner/PartnerText';
import { VENDOR_REGISTRATION_STEPS } from '../../../../constants/partnerRegistration';
import { VENDOR_DOCUMENTS } from '../../../../constants/partnerRegistrationDocuments';
import {
  getMissingRequiredDocuments,
  mapVendorTypeFromBusinessLabel,
} from '../../../../constants/backendRequiredDocuments';
import { usePartnerRegistrationStore } from '../../../../store/partnerRegistrationStore';
import type { PartnerRegistrationStackParamList } from '../../../../types/partnerNavigation';
import { partnerRegistrationGoBack } from '../../../../utils/partnerRegistration';

type Props = NativeStackScreenProps<PartnerRegistrationStackParamList, 'VendorDocuments'>;

export default function VendorDocumentsScreen({ navigation, route }: Props) {
  const vendorBusiness = usePartnerRegistrationStore((s) => s.vendorBusiness);
  const vendorDocuments = usePartnerRegistrationStore((s) => s.vendorDocuments);
  const addVendorDocument = usePartnerRegistrationStore((s) => s.addVendorDocument);

  const uploadedIds = vendorDocuments.map((doc) => doc.id);
  const missingRequiredDocs = getMissingRequiredDocuments(
    mapVendorTypeFromBusinessLabel(vendorBusiness.businessType || 'towing company'),
    uploadedIds,
  );

  const handleBack = () => partnerRegistrationGoBack(navigation, 'VendorDocuments', route.params);

  const handleContinue = () => {
    navigation.navigate('VendorReview', route.params);
  };

  return (
    <DriverRegistrationLayout
      step={3}
      stepLabels={VENDOR_REGISTRATION_STEPS}
      title="Vendor registration"
      subtitle="Upload clear, readable files for verification."
      onBack={handleBack}
      onContinue={handleContinue}
      continueLabel="Continue">
      <PartnerRegistrationStepCard
        title="Documents for verification"
        subtitle="Upload clear photos or PDFs. Required items are marked."
        Icon={ShieldCheck}>
        <PartnerDocumentUploadList
          documents={VENDOR_DOCUMENTS}
          uploadedIds={uploadedIds}
          variant="card"
          compact
          hideTitle
          onUpload={(id, uri, name, mimeType) => {
            const label = VENDOR_DOCUMENTS.find((doc) => doc.id === id)?.label ?? id;
            addVendorDocument({ id, label, uri, name, mimeType });
          }}
        />
        <View style={[styles.documentProgress, missingRequiredDocs.length === 0 && styles.documentProgressReady]}>
          <ShieldCheck size={14} color={missingRequiredDocs.length === 0 ? '#15803D' : '#B45309'} strokeWidth={2.2} />
          <PartnerText style={styles.securityText}>
            {missingRequiredDocs.length === 0
              ? 'All required files are uploaded. Optional files can be added later.'
              : 'You can review now; upload the remaining required files before final submission.'}
          </PartnerText>
        </View>
        <View style={styles.securityNote}>
          <ShieldCheck size={14} color="#6B7280" strokeWidth={2.2} />
          <PartnerText style={styles.securityText}>
            Files are used only for partner verification.
          </PartnerText>
        </View>
      </PartnerRegistrationStepCard>
    </DriverRegistrationLayout>
  );
}

const styles = StyleSheet.create({
  documentProgress: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFFBEB',
  },
  documentProgressReady: { backgroundColor: '#F0FDF4' },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 8,
  },
  securityText: {
    flex: 1,
    color: '#6B7280',
    fontSize: 10.5,
    lineHeight: 15,
  },
});
