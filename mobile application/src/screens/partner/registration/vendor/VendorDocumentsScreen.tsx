import React, { useMemo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { FileCheck2, ShieldCheck } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DriverRegistrationLayout from '../../../../components/partner/DriverRegistrationLayout';
import PartnerDocumentUploadList from '../../../../components/partner/PartnerDocumentUploadList';
import PartnerRegistrationStepCard from '../../../../components/partner/PartnerRegistrationStepCard';
import { VENDOR_REGISTRATION_STEPS } from '../../../../constants/partnerRegistration';
import {
  VENDOR_CORE_DOCUMENTS,
  VENDOR_OPTIONAL_DOCUMENTS,
  getVendorDocumentTypeLabel,
  isSameDocId,
} from '../../../../constants/partnerRegistrationDocuments';
import { usePartnerRegistrationStore } from '../../../../store/partnerRegistrationStore';
import type { PartnerRegistrationStackParamList } from '../../../../types/partnerNavigation';
import { partnerRegistrationGoBack } from '../../../../utils/partnerRegistration';

type Props = NativeStackScreenProps<PartnerRegistrationStackParamList, 'VendorDocuments'>;

export default function VendorDocumentsScreen({ navigation, route }: Props) {
  const vendorDocuments = usePartnerRegistrationStore((s) => s.vendorDocuments);
  const addVendorDocument = usePartnerRegistrationStore((s) => s.addVendorDocument);

  const uploadedIds = useMemo(() => vendorDocuments.map((d) => d.id), [vendorDocuments]);

  const missingCoreDocs = useMemo(() => {
    return VENDOR_CORE_DOCUMENTS.filter(
      (doc) => !vendorDocuments.some((vd) => isSameDocId(vd.id, doc.id)),
    );
  }, [vendorDocuments]);

  const isAllCoreComplete = missingCoreDocs.length === 0;

  const handleBack = () => partnerRegistrationGoBack(navigation, 'VendorDocuments', route.params);

  const handleContinue = () => {
    if (!isAllCoreComplete) {
      Alert.alert(
        'Required documents needed',
        `Please upload the following required documents before proceeding:\n\n• ${missingCoreDocs
          .map((d) => d.label)
          .join('\n• ')}`,
      );
      return;
    }
    navigation.navigate('VendorReview', route.params);
  };

  const handleUpload = (id: string, uri: string, name: string, mimeType?: string) => {
    addVendorDocument({
      id,
      label: getVendorDocumentTypeLabel(id),
      uri,
      name,
      mimeType,
    });
  };

  return (
    <DriverRegistrationLayout
      step={3}
      stepLabels={VENDOR_REGISTRATION_STEPS}
      title="Vendor documents"
      subtitle="Upload your required business & identity documents for verification."
      onBack={handleBack}
      onContinue={handleContinue}
      continueLabel="Continue">
      {/* 1. Core Required Documents: Aadhaar, PAN, Business Reg, GST */}
      <PartnerRegistrationStepCard
        title="Required documents"
        subtitle="All 4 documents are required for vendor compliance."
        Icon={ShieldCheck}>
        <View style={styles.sectionWrap}>
          <PartnerDocumentUploadList
            documents={VENDOR_CORE_DOCUMENTS}
            uploadedIds={uploadedIds}
            selectedFiles={vendorDocuments}
            onUpload={handleUpload}
            variant="default"
            hideTitle
          />
        </View>
      </PartnerRegistrationStepCard>

      {/* 2. Optional Documents for Faster Review: MSME, Cancelled Cheque */}
      <PartnerRegistrationStepCard
        title="Optional documents"
        subtitle="Upload optional certificates for faster verification & instant payout setup."
        Icon={FileCheck2}>
        <View style={styles.sectionWrap}>
          <PartnerDocumentUploadList
            documents={VENDOR_OPTIONAL_DOCUMENTS}
            uploadedIds={uploadedIds}
            selectedFiles={vendorDocuments}
            onUpload={handleUpload}
            variant="default"
            hideTitle
          />
        </View>
      </PartnerRegistrationStepCard>
    </DriverRegistrationLayout>
  );
}

const styles = StyleSheet.create({
  sectionWrap: {
    marginBottom: 8,
  },
});
