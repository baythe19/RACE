import { PartnerText } from '../../../components/partner/PartnerText';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CheckCircle,
  FileText,
  ChevronRight,
  ShieldCheck,
  User,
  AlertCircle,
  Clock,
} from 'lucide-react-native';

import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';
import type { PartnerAccountStackParamList } from '../../../types/partnerNavigation';
import PartnerScreenLayout from '../../../components/partner/PartnerScreenLayout';
import { usePartnerDialog } from '../../../hooks/usePartnerDialog';
import PartnerUploadSheet from '../../../components/partner/dialogs/PartnerUploadSheet';
import { useProfileStore } from '../../../store/profileStore';
import { useAuthStore } from '../../../store/authStore';
import type { Profile } from '../../../types/models';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'PartnerDocuments'>;

type DocumentItem = {
  id: string;
  name: string;
  status: 'Approved' | 'Under Review' | 'Action Required';
  type: string;
  isOptional?: boolean;
};

const BASE_DRIVER_REQUIRED: Omit<DocumentItem, 'status'>[] = [
  { id: 'dl', name: 'Driving License', type: 'license' },
  { id: 'aadhaar', name: 'Aadhaar Card', type: 'identity' },
  { id: 'pan', name: 'PAN Card', type: 'identity' },
  { id: 'photo', name: 'Profile Photo', type: 'photo' },
];

const BASE_DRIVER_OPTIONAL: Omit<DocumentItem, 'status'>[] = [
  { id: 'police', name: 'Police Verification Record', type: 'identity', isOptional: true },
];

const BASE_VENDOR_REQUIRED: Omit<DocumentItem, 'status'>[] = [
  { id: 'business_reg', name: 'Business Registration / Trade License', type: 'identity' },
  { id: 'aadhaar', name: 'Owner Aadhaar Card', type: 'identity' },
  { id: 'pan', name: 'Business / Owner PAN Card', type: 'identity' },
  { id: 'gst', name: 'GST Registration Certificate', type: 'identity' },
];

const BASE_VENDOR_OPTIONAL: Omit<DocumentItem, 'status'>[] = [
  { id: 'msme', name: 'MSME Certificate', type: 'identity', isOptional: true },
  { id: 'cheque', name: 'Cancelled Cheque / Bank Proof', type: 'identity', isOptional: true },
];

function resolveDocumentStatus(
  docId: string,
  isOptional: boolean,
  profile: Profile | null,
  isVendor: boolean,
): DocumentItem['status'] {
  if (profile?.reviewStatus === 'VERIFIED' || profile?.isVerified) return 'Approved';

  if (!isVendor) {
    if (profile?.driverProfile?.status === 'APPROVED') return 'Approved';

    if (docId === 'police') {
      const pStatus = profile?.driverProfile?.policeVerificationStatus;
      if (pStatus === 'VERIFIED') return 'Approved';
      if (pStatus === 'PENDING') return 'Under Review';
      if (pStatus === 'REJECTED') return 'Action Required';
    }

    const driverDocs = profile?.driverProfile?.documents ?? [];
    const matched = driverDocs.find((d) => {
      const typeLower = (d.type || '').toLowerCase();
      if (docId === 'dl') return typeLower === 'dl' || typeLower.includes('license');
      if (docId === 'photo') return typeLower === 'photo' || typeLower === 'selfie';
      if (docId === 'police') return typeLower.includes('police');
      return typeLower === docId;
    });

    if (matched) {
      if (matched.status === 'VERIFIED') return 'Approved';
      if (matched.status === 'PENDING') return 'Under Review';
      if (matched.status === 'REJECTED') return 'Action Required';
    }

    return isOptional ? 'Under Review' : 'Action Required';
  } else {
    return isOptional ? 'Under Review' : 'Action Required';
  }
}

export default function PartnerDocumentsScreen({ navigation }: Props) {
  const { dialog: partnerDialog, showAlert } = usePartnerDialog();
  const [activeTab, setActiveTab] = useState<'required' | 'optional'>('required');
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [uploadSheetVisible, setUploadSheetVisible] = useState(false);

  const profile = useProfileStore((state) => state.profile);
  const fetchProfile = useProfileStore((state) => state.fetchProfile);
  const authUser = useAuthStore((state) => state.user);

  useEffect(() => {
    void fetchProfile().catch(() => {});
  }, [fetchProfile]);

  const isVendor = (profile?.role ?? authUser?.role) === 'vendor';

  const requiredDocs: DocumentItem[] = useMemo(() => {
    const base = isVendor ? BASE_VENDOR_REQUIRED : BASE_DRIVER_REQUIRED;
    return base.map((doc) => ({
      ...doc,
      status: resolveDocumentStatus(doc.id, false, profile, isVendor),
    }));
  }, [isVendor, profile]);

  const optionalDocs: DocumentItem[] = useMemo(() => {
    const base = isVendor ? BASE_VENDOR_OPTIONAL : BASE_DRIVER_OPTIONAL;
    return base.map((doc) => ({
      ...doc,
      status: resolveDocumentStatus(doc.id, true, profile, isVendor),
    }));
  }, [isVendor, profile]);

  const docs = activeTab === 'required' ? requiredDocs : optionalDocs;

  const overallStatus = useMemo<'approved' | 'under_review' | 'action_required'>(() => {
    const hasActionRequired = requiredDocs.some((d) => d.status === 'Action Required');
    if (hasActionRequired) return 'action_required';
    const hasUnderReview = requiredDocs.some((d) => d.status === 'Under Review');
    if (hasUnderReview) return 'under_review';
    return 'approved';
  }, [requiredDocs]);

  const handleDocPress = (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setUploadSheetVisible(true);
  };

  const getStatusBadge = (status: DocumentItem['status']) => {
    if (status === 'Approved') {
      return (
        <View style={styles.approvedBadge}>
          <CheckCircle size={12} color={driverColors.green} strokeWidth={2.4} />
          <PartnerText style={styles.approvedText}>Approved</PartnerText>
        </View>
      );
    }
    if (status === 'Under Review') {
      return (
        <View style={styles.reviewBadge}>
          <Clock size={12} color="#D97706" strokeWidth={2.4} />
          <PartnerText style={styles.reviewText}>Under Review</PartnerText>
        </View>
      );
    }
    return (
      <View style={styles.actionRequiredBadge}>
        <AlertCircle size={12} color={driverColors.red} strokeWidth={2.4} />
        <PartnerText style={styles.actionRequiredText}>Action Required</PartnerText>
      </View>
    );
  };

  return (
    <PartnerScreenLayout
      title="Documents"
      onBack={() => navigation.goBack()}>
      {/* Overall Status Banner */}
      {overallStatus === 'approved' && (
        <View style={[styles.statusBanner, styles.bannerApproved]}>
          <View style={[styles.statusIconCircle, styles.iconApproved]}>
            <CheckCircle size={22} color={driverColors.green} strokeWidth={2.5} />
          </View>
          <View style={styles.statusTextCol}>
            <PartnerText style={styles.statusTitleApproved}>All required documents approved</PartnerText>
            <PartnerText style={styles.statusSubtitleApproved}>
              You are eligible to go online and accept jobs.
            </PartnerText>
          </View>
        </View>
      )}

      {overallStatus === 'under_review' && (
        <View style={[styles.statusBanner, styles.bannerReview]}>
          <View style={[styles.statusIconCircle, styles.iconReview]}>
            <Clock size={22} color="#D97706" strokeWidth={2.5} />
          </View>
          <View style={styles.statusTextCol}>
            <PartnerText style={styles.statusTitleReview}>Documents Under Verification</PartnerText>
            <PartnerText style={styles.statusSubtitleReview}>
              Our compliance team is reviewing your documents. You can accept jobs in the meantime.
            </PartnerText>
          </View>
        </View>
      )}

      {overallStatus === 'action_required' && (
        <View style={[styles.statusBanner, styles.bannerAction]}>
          <View style={[styles.statusIconCircle, styles.iconAction]}>
            <AlertCircle size={22} color={driverColors.red} strokeWidth={2.5} />
          </View>
          <View style={styles.statusTextCol}>
            <PartnerText style={styles.statusTitleAction}>Action Required</PartnerText>
            <PartnerText style={styles.statusSubtitleAction}>
              Please upload missing or rejected documents to complete full compliance.
            </PartnerText>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tabButton, activeTab === 'required' && styles.tabButtonActive]}
          onPress={() => setActiveTab('required')}>
          <PartnerText
            style={[
              styles.tabText,
              activeTab === 'required' && styles.tabTextActive,
            ]}>
            Required
          </PartnerText>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'optional' && styles.tabButtonActive]}
          onPress={() => setActiveTab('optional')}>
          <PartnerText
            style={[
              styles.tabText,
              activeTab === 'optional' && styles.tabTextActive,
            ]}>
            Optional
          </PartnerText>
        </Pressable>
      </View>

      {/* Documents List */}
      <View style={styles.docList}>
        {docs.map(doc => (
          <Pressable
            key={doc.id}
            style={({ pressed }) => [
              styles.docRow,
              getPressableFeedback(pressed),
            ]}
            onPress={() => handleDocPress(doc)}>
            <View style={styles.docThumbnail}>
              {doc.type === 'photo' ? (
                <User size={20} color={driverColors.ink} strokeWidth={2.2} />
              ) : doc.type === 'license' ? (
                <ShieldCheck size={20} color={driverColors.amber} strokeWidth={2.2} />
              ) : (
                <FileText size={20} color={driverColors.blue} strokeWidth={2.2} />
              )}
            </View>

            <View style={styles.docDetailsCol}>
              <PartnerText style={styles.docName}>{doc.name}</PartnerText>
              <View style={styles.badgeWrapper}>{getStatusBadge(doc.status)}</View>
            </View>

            <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
          </Pressable>
        ))}
      </View>

      {/* Upload / Replace Action Sheet */}
      <PartnerUploadSheet
        visible={uploadSheetVisible}
        hasExistingPreview={true}
        subtitle={selectedDoc?.name}
        onTakePhoto={() => {
          setUploadSheetVisible(false);
          showAlert({ tone: 'success', title: 'Upload', message: `${selectedDoc?.name} photo updated.` });
        }}
        onPickGallery={() => {
          setUploadSheetVisible(false);
          showAlert({ tone: 'success', title: 'Upload', message: `${selectedDoc?.name} document file uploaded.` });
        }}
        onPreview={() => {
          setUploadSheetVisible(false);
          showAlert({ tone: 'info', title: 'Document Preview', message: `${selectedDoc?.name} is on file.` });
        }}
        onClose={() => setUploadSheetVisible(false)}
      />
      {partnerDialog}
    </PartnerScreenLayout>
  );
}

const styles = StyleSheet.create({
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: driverRadius.card,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  bannerApproved: {
    backgroundColor: driverColors.greenCard,
    borderColor: driverColors.greenCardBorder,
  },
  bannerReview: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  bannerAction: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconApproved: {
    backgroundColor: driverColors.greenPill,
  },
  iconReview: {
    backgroundColor: '#FEF3C7',
  },
  iconAction: {
    backgroundColor: '#FEE2E2',
  },
  statusTextCol: {
    flex: 1,
  },
  statusTitleApproved: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  statusSubtitleApproved: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  statusTitleReview: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  statusSubtitleReview: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  statusTitleAction: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
  },
  statusSubtitleAction: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 2,
    lineHeight: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: driverColors.light,
    borderRadius: driverRadius.pill,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: driverRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: driverColors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: driverColors.grey,
  },
  tabTextActive: {
    fontWeight: '800',
    color: driverColors.ink,
  },
  docList: {
    gap: 10,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: driverColors.hairline,
  },
  docThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: driverColors.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: driverColors.hairline,
  },
  docDetailsCol: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '700',
    color: driverColors.ink,
  },
  badgeWrapper: {
    marginTop: 4,
    flexDirection: 'row',
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: driverColors.greenPill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  approvedText: {
    fontSize: 11,
    fontWeight: '700',
    color: driverColors.green,
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  reviewText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  actionRequiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: driverColors.redPill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  actionRequiredText: {
    fontSize: 11,
    fontWeight: '700',
    color: driverColors.red,
  },
});
