import { PartnerText } from '../../../components/partner/PartnerText';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CheckCircle,
  FileText,
  ChevronRight,
  ShieldCheck,
  User,
  AlertCircle,
} from 'lucide-react-native';

import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';
import type { PartnerAccountStackParamList } from '../../../types/partnerNavigation';
import PartnerScreenLayout from '../../../components/partner/PartnerScreenLayout';
import { usePartnerDialog } from '../../../hooks/usePartnerDialog';
import PartnerUploadSheet from '../../../components/partner/dialogs/PartnerUploadSheet';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'PartnerDocuments'>;

type DocumentItem = {
  id: string;
  name: string;
  status: 'Approved' | 'Under Review' | 'Action Required';
  type: string;
  isOptional?: boolean;
};

const REQUIRED_DOCS: DocumentItem[] = [
  { id: 'dl', name: 'Driving License', status: 'Approved', type: 'license' },
  { id: 'aadhaar', name: 'Aadhaar Card', status: 'Approved', type: 'identity' },
  { id: 'pan', name: 'PAN Card', status: 'Approved', type: 'identity' },
  { id: 'photo', name: 'Profile Photo', status: 'Approved', type: 'photo' },
];

const OPTIONAL_DOCS: DocumentItem[] = [
  { id: 'police', name: 'Police Verification Record', status: 'Approved', type: 'identity', isOptional: true },
];

export default function PartnerDocumentsScreen({ navigation }: Props) {
  const { dialog: partnerDialog, showAlert } = usePartnerDialog();
  const [activeTab, setActiveTab] = useState<'required' | 'optional'>('required');
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [uploadSheetVisible, setUploadSheetVisible] = useState(false);

  const docs = activeTab === 'required' ? REQUIRED_DOCS : OPTIONAL_DOCS;

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
          <AlertCircle size={12} color="#D97706" strokeWidth={2.4} />
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
      <View style={styles.statusBanner}>
        <View style={styles.statusIconCircle}>
          <CheckCircle size={22} color={driverColors.green} strokeWidth={2.5} />
        </View>
        <View style={styles.statusTextCol}>
          <PartnerText style={styles.statusTitle}>All required documents approved</PartnerText>
          <PartnerText style={styles.statusSubtitle}>
            You are eligible to go online and accept jobs.
          </PartnerText>
        </View>
      </View>

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
            Required ({REQUIRED_DOCS.length})
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
            Optional ({OPTIONAL_DOCS.length})
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
          showAlert({ tone: 'info', title: 'Document Preview', message: `${selectedDoc?.name} is verified on file.` });
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
    backgroundColor: driverColors.greenCard,
    borderWidth: 1,
    borderColor: driverColors.greenCardBorder,
    borderRadius: driverRadius.card,
    padding: 16,
    marginBottom: 20,
  },
  statusIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: driverColors.greenPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTextCol: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  statusSubtitle: {
    fontSize: 12,
    color: '#047857',
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
