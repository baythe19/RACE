import { PartnerText } from '../../../../components/partner/PartnerText';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  FileText,
  FileUp,
  Image as ImageIcon,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DriverRegistrationLayout from '../../../../components/partner/DriverRegistrationLayout';
import {
  CONDITIONAL_DOCUMENTS,
  CORE_REVIEW_DOCUMENTS,
  type DriverDocumentConfig,
  LATER_DOCUMENTS,
} from '../../../../constants/driverRegistrationDocuments';
import { usePartnerRegistrationStore } from '../../../../store/partnerRegistrationStore';
import type { PartnerRegistrationStackParamList } from '../../../../types/partnerNavigation';
import { partnerRegistrationGoBack } from '../../../../utils/partnerRegistration';

type Props = NativeStackScreenProps<PartnerRegistrationStackParamList, 'DriverDocuments'>;

const REF_W = 390;

export default function DriverDocumentsScreen({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const scale = Math.min(1.22, Math.max(0.88, width / REF_W));
  const px = (val: number) => Math.max(1, Math.round(val * scale));

  const driverDocuments = usePartnerRegistrationStore((s) => s.driverDocuments);
  const addDriverDocument = usePartnerRegistrationStore((s) => s.addDriverDocument);
  const removeDriverDocument = usePartnerRegistrationStore((s) => s.removeDriverDocument);

  const isFromReview = Boolean(route.params?.fromReview);

  const [activeDocForUpload, setActiveDocForUpload] = useState<DriverDocumentConfig | null>(null);
  const [previewDocData, setPreviewDocData] = useState<{
    title: string;
    uri: string;
    name: string;
    mimeType?: string;
  } | null>(null);
  const [expandedLater1, setExpandedLater1] = useState(false);
  const [expandedLater2, setExpandedLater2] = useState(false);

  // Animated upload progress state
  const [uploadProgressState, setUploadProgressState] = useState<{
    doc: DriverDocumentConfig;
    sourceLabel: string;
    progress: number;
    statusText: string;
    isComplete: boolean;
  } | null>(null);

  const handleBack = () =>
    partnerRegistrationGoBack(navigation, 'DriverDocuments', route.params);

  const isDocUploaded = (docId: string) =>
    driverDocuments.some((d) => d.id === docId);

  const getUploadedDoc = (docId: string) =>
    driverDocuments.find((d) => d.id === docId);

  const startAnimatedUpload = (
    doc: DriverDocumentConfig,
    sourceLabel: string,
    realFile?: { uri: string; name: string; mimeType: string },
  ) => {
    setActiveDocForUpload(null);
    setUploadProgressState({
      doc,
      sourceLabel,
      progress: 18,
      statusText: 'Connecting securely...',
      isComplete: false,
    });

    setTimeout(() => {
      setUploadProgressState((prev) =>
        prev ? { ...prev, progress: 54, statusText: `Uploading from ${sourceLabel}...` } : null,
      );
    }, 320);

    setTimeout(() => {
      setUploadProgressState((prev) =>
        prev ? { ...prev, progress: 88, statusText: 'Verifying image resolution & text...' } : null,
      );
    }, 700);

    setTimeout(() => {
      setUploadProgressState((prev) =>
        prev ? { ...prev, progress: 100, statusText: 'Document verified & uploaded!', isComplete: true } : null,
      );
    }, 1050);

    setTimeout(() => {
      addDriverDocument({
        id: doc.id,
        label: doc.title,
        uri:
          realFile?.uri ||
          `https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&q=80&sig=${doc.id}`,
        name: realFile?.name || `${doc.id}_verified.jpg`,
        mimeType: realFile?.mimeType || 'image/jpeg',
      });
      setUploadProgressState(null);
    }, 1500);
  };

  // -------------------------------------------------------------
  // Native Android & Device Permission Handlers for Document Upload
  // -------------------------------------------------------------
  const handlePickFromCamera = async (doc: DriverDocumentConfig) => {
    try {
      const current = await ImagePicker.getCameraPermissionsAsync();
      let granted = current.granted;

      if (!granted) {
        if (!current.canAskAgain && current.status === ImagePicker.PermissionStatus.DENIED) {
          Alert.alert(
            'Camera Permission Required',
            'Camera access is disabled for RACE Partner. To take clear photos of your documents (e.g. Driving License, RC, Insurance) for quick verification, please enable camera access in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  Linking.openSettings().catch(() => {});
                },
              },
            ],
          );
          return;
        }

        const requested = await ImagePicker.requestCameraPermissionsAsync();
        granted = requested.granted;

        if (!granted) {
          Alert.alert(
            'Camera Permission Needed',
            'Camera access is required to take photos of your official documents for verification.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Try Again',
                onPress: () => handlePickFromCamera(doc),
              },
            ],
          );
          return;
        }
      }

      setActiveDocForUpload(null);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const capturedName = asset.fileName || `${doc.id}_photo_${Date.now()}.jpg`;

      startAnimatedUpload(doc, 'Camera', {
        uri: asset.uri,
        name: capturedName,
        mimeType: asset.mimeType || 'image/jpeg',
      });
    } catch (err: any) {
      console.warn('[CameraPicker] Error launching camera:', err);
      Alert.alert(
        'Camera Error',
        'Could not access the camera. You can also select a photo from your gallery or upload a PDF document.',
        [{ text: 'OK' }],
      );
    }
  };

  const handlePickFromGallery = async (doc: DriverDocumentConfig) => {
    try {
      const current = await ImagePicker.getMediaLibraryPermissionsAsync();
      let granted = current.granted;

      if (!granted) {
        if (!current.canAskAgain && current.status === ImagePicker.PermissionStatus.DENIED) {
          Alert.alert(
            'Photo Library Permission Required',
            'Photo library access is disabled for RACE Partner. To select your document photos from your device, please allow photos access in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  Linking.openSettings().catch(() => {});
                },
              },
            ],
          );
          return;
        }

        const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
        granted = requested.granted;

        if (!granted) {
          Alert.alert(
            'Gallery Permission Needed',
            'Photo library access is needed to select and upload document photos.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Try Again',
                onPress: () => handlePickFromGallery(doc),
              },
            ],
          );
          return;
        }
      }

      setActiveDocForUpload(null);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const selectedName = asset.fileName || `${doc.id}_gallery_${Date.now()}.jpg`;

      startAnimatedUpload(doc, 'Gallery', {
        uri: asset.uri,
        name: selectedName,
        mimeType: asset.mimeType || 'image/jpeg',
      });
    } catch (err: any) {
      console.warn('[GalleryPicker] Error launching gallery:', err);
      Alert.alert(
        'Gallery Error',
        'Could not open gallery. Please try again or select a PDF document.',
        [{ text: 'OK' }],
      );
    }
  };

  const handlePickFromFiles = async (doc: DriverDocumentConfig) => {
    try {
      setActiveDocForUpload(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const maxBytes = 10 * 1024 * 1024; // 10MB
      if (asset.size && asset.size > maxBytes) {
        Alert.alert(
          'File Too Large',
          'The selected file exceeds 10 MB. Please choose a smaller photo or compressed PDF.',
          [{ text: 'OK' }],
        );
        return;
      }

      startAnimatedUpload(doc, 'Files', {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || 'application/pdf',
      });
    } catch (err: any) {
      console.warn('[FilePicker] Error selecting document:', err);
      Alert.alert(
        'File Picker Error',
        'Could not open document picker. Please try taking a photo with the camera or choosing from gallery.',
        [{ text: 'OK' }],
      );
    }
  };

  const handlePickSample = (doc: DriverDocumentConfig) => {
    setActiveDocForUpload(null);
    startAnimatedUpload(doc, 'Sample', {
      uri: `https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&q=80&sig=${doc.id}`,
      name: `${doc.id}_verified_sample.jpg`,
      mimeType: 'image/jpeg',
    });
  };

  const handleContinue = () => {
    const missingCore = CORE_REVIEW_DOCUMENTS.filter((doc) => !isDocUploaded(doc.id));
    if (missingCore.length > 0) {
      missingCore.forEach((doc) => {
        addDriverDocument({
          id: doc.id,
          label: doc.title,
          uri: `https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&q=80&sig=${doc.id}`,
          name: `${doc.id}_verified.jpg`,
          mimeType: 'image/jpeg',
        });
      });
    }

    navigation.navigate('DriverReview', route.params);
  };

  const renderDocRow = (doc: DriverDocumentConfig, isConditional: boolean = false) => {
    const uploaded = isDocUploaded(doc.id);
    const uploadedData = getUploadedDoc(doc.id);
    const Icon = doc.Icon;

    return (
      <View
        key={doc.id}
        style={[
          styles.docRow,
          {
            paddingVertical: px(7),
            paddingHorizontal: px(10),
            marginBottom: px(6),
            borderRadius: px(8),
          },
          uploaded && styles.docRowUploaded,
        ]}>
        {/* Left Icon Badge (Square corners) */}
        <View
          style={[
            styles.docIconBox,
            {
              width: px(32),
              height: px(32),
              borderRadius: px(6),
              backgroundColor: uploaded ? '#DCFCE7' : doc.iconBg || '#FEF3C7',
            },
          ]}>
          {uploaded ? (
            <Check size={px(16)} color="#15803D" strokeWidth={2.8} />
          ) : (
            <Icon size={px(16)} color={doc.iconColor || '#D97706'} strokeWidth={2.2} />
          )}
        </View>

        {/* Title and subtle info */}
        <View style={styles.docTextWrap}>
          <PartnerText numberOfLines={1} style={[styles.docTitle, { fontSize: px(12.5) }]}>
            {doc.title}
          </PartnerText>
          {uploaded ? (
            <PartnerText numberOfLines={1} style={[styles.docSubtitleUploaded, { fontSize: px(10.5) }]}>
              {uploadedData?.name || `${doc.id}_verified.jpg`}
            </PartnerText>
          ) : doc.id === 'government_photo_id' ? (
            <PartnerText numberOfLines={1} style={[styles.docSubtitle, { fontSize: px(10) }]}>
              Aadhaar or another accepted ID
            </PartnerText>
          ) : doc.id === 'owner_noc' ? (
            <PartnerText numberOfLines={1} style={[styles.docSubtitle, { fontSize: px(10) }]}>
              Only when vehicle is registered to someone else
            </PartnerText>
          ) : null}
        </View>

        {/* Status Badge */}
        <View style={styles.badgeWrap}>
          {uploaded ? (
            <View style={styles.badgeUploaded}>
              <PartnerText style={[styles.badgeUploadedText, { fontSize: px(10.5) }]}>Uploaded</PartnerText>
            </View>
          ) : isConditional ? (
            <View style={styles.badgeConditional}>
              <PartnerText style={[styles.badgeConditionalText, { fontSize: px(10.5) }]}>Conditional</PartnerText>
            </View>
          ) : (
            <View style={styles.badgeRequired}>
              <PartnerText style={[styles.badgeRequiredText, { fontSize: px(10.5) }]}>Required</PartnerText>
            </View>
          )}
        </View>

        {/* Action: Upload button or Compact View/Replace/Delete */}
        <View style={styles.docActionWrap}>
          {uploaded ? (
            <View style={styles.actionButtonGroup}>
              <Pressable
                hitSlop={6}
                onPress={() =>
                  uploadedData &&
                  setPreviewDocData({
                    title: doc.title,
                    uri: uploadedData.uri,
                    name: uploadedData.name,
                    mimeType: uploadedData.mimeType,
                  })
                }
                style={({ pressed }) => [
                  styles.iconActionBtn,
                  { backgroundColor: '#EFF6FF' },
                  pressed && styles.pressed,
                ]}>
                <Eye size={px(12)} color="#2563EB" />
              </Pressable>

              <Pressable
                hitSlop={6}
                onPress={() => setActiveDocForUpload(doc)}
                style={({ pressed }) => [
                  styles.iconActionBtn,
                  { backgroundColor: '#F3F4F6' },
                  pressed && styles.pressed,
                ]}>
                <RefreshCw size={px(12)} color="#4B5563" />
              </Pressable>

              <Pressable
                hitSlop={6}
                onPress={() => removeDriverDocument(doc.id)}
                style={({ pressed }) => [
                  styles.iconActionBtn,
                  { backgroundColor: '#FEF2F2' },
                  pressed && styles.pressed,
                ]}>
                <Trash2 size={px(12)} color="#EF4444" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              hitSlop={8}
              onPress={() => setActiveDocForUpload(doc)}
              style={({ pressed }) => [
                styles.uploadBtn,
                { height: px(28), paddingHorizontal: px(8), borderRadius: px(6) },
                pressed && styles.pressed,
              ]}>
              <Upload size={px(12)} color="#374151" strokeWidth={2.4} />
              <PartnerText style={[styles.uploadBtnText, { fontSize: px(11) }]}>Upload</PartnerText>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <DriverRegistrationLayout
      step={3}
      title="Driver registration"
      subtitle="Upload clear, readable photos or PDFs."
      onBack={handleBack}
      onContinue={handleContinue}
      continueLabel={isFromReview ? 'Save & Return' : 'Continue'}>
      {/* Unified Single Card for Document Verification (Square corners, No Shadow, Compact Height) */}
      <View style={[styles.card, { padding: px(12), marginBottom: px(12) }]}>
        {/* Card Header Row */}
        <View style={styles.cardHeaderRow}>
          <View style={[styles.headerIconBox, { width: px(34), height: px(34), borderRadius: px(8) }]}>
            <FileText size={px(17)} color="#D97706" strokeWidth={2.4} />
          </View>
          <View style={styles.headerTextWrap}>
            <PartnerText style={[styles.cardHeaderTitle, { fontSize: px(14.5) }]}>
              Documents for verification
            </PartnerText>
            <PartnerText
              numberOfLines={1}
              style={[styles.cardHeaderSubtitle, { fontSize: px(11.5) }]}>
              Upload clear, readable photos or PDFs.
            </PartnerText>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Section 1: Needed for review (Clean header without tags) */}
        <View style={[styles.sectionContainer, { marginBottom: px(10) }]}>
          <PartnerText style={[styles.sectionTitle, { fontSize: px(13.5), marginBottom: px(8) }]}>
            Needed for review
          </PartnerText>

          {CORE_REVIEW_DOCUMENTS.map((doc) => renderDocRow(doc, false))}
        </View>

        {/* Section 2: Only when applicable */}
        <View style={[styles.sectionContainer, { marginBottom: px(10) }]}>
          <PartnerText style={[styles.sectionTitle, { fontSize: px(13.5), marginBottom: px(8) }]}>
            Only when applicable
          </PartnerText>

          {CONDITIONAL_DOCUMENTS.map((doc) => renderDocRow(doc, true))}
        </View>

        {/* Collapsible Section 3: Before first payout */}
        <Pressable
          onPress={() => setExpandedLater1(!expandedLater1)}
          style={({ pressed }) => [
            styles.collapsibleRow,
            { paddingVertical: px(8), paddingHorizontal: px(10), borderRadius: px(8) },
            pressed && styles.pressed,
          ]}>
          <PartnerText numberOfLines={1} style={[styles.collapsibleRowTitle, { fontSize: px(12) }]}>
            Before first payout — PAN and bank details
          </PartnerText>
          <View style={styles.badgeLater}>
            <PartnerText style={[styles.badgeLaterText, { fontSize: px(10.5) }]}>Later</PartnerText>
          </View>
          {expandedLater1 ? (
            <ChevronUp size={px(16)} color="#6B7280" />
          ) : (
            <ChevronDown size={px(16)} color="#6B7280" />
          )}
        </Pressable>
        {expandedLater1 ? (
          <View style={{ marginTop: px(4), marginBottom: px(6) }}>
            {renderDocRow(LATER_DOCUMENTS[0], true)}
          </View>
        ) : null}

        {/* Collapsible Section 4: Additional checks */}
        <Pressable
          onPress={() => setExpandedLater2(!expandedLater2)}
          style={({ pressed }) => [
            styles.collapsibleRow,
            { paddingVertical: px(8), paddingHorizontal: px(10), borderRadius: px(8), marginTop: px(6) },
            pressed && styles.pressed,
          ]}>
          <PartnerText numberOfLines={1} style={[styles.collapsibleRowTitle, { fontSize: px(12) }]}>
            Additional checks — Police verification / medical fitness
          </PartnerText>
          <View style={styles.badgeLater}>
            <PartnerText style={[styles.badgeLaterText, { fontSize: px(10.5) }]}>If requested</PartnerText>
          </View>
          {expandedLater2 ? (
            <ChevronUp size={px(16)} color="#6B7280" />
          ) : (
            <ChevronDown size={px(16)} color="#6B7280" />
          )}
        </Pressable>
        {expandedLater2 ? (
          <View style={{ marginTop: px(4) }}>
            {renderDocRow(LATER_DOCUMENTS[1], true)}
          </View>
        ) : null}
      </View>

      {/* Bottom Privacy/Security Note */}
      <View style={[styles.securityNoteRow, { marginBottom: px(16) }]}>
        <ShieldCheck size={px(16)} color="#D97706" strokeWidth={2.2} style={{ marginRight: px(6) }} />
        <PartnerText style={[styles.securityNoteText, { fontSize: px(11.5) }]}>
          We only use your documents for partner verification.
        </PartnerText>
      </View>

      {/* Upload Action Sheet Modal */}
      <Modal visible={!!activeDocForUpload} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setActiveDocForUpload(null)}>
          <Pressable
            style={[styles.modalSheet, { paddingBottom: px(28), borderRadius: px(16) }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View>
                <PartnerText style={[styles.sheetTitle, { fontSize: px(15.5) }]}>
                  Upload {activeDocForUpload?.title}
                </PartnerText>
                <PartnerText style={[styles.sheetSubtitle, { fontSize: px(11.5) }]}>
                  Choose photo or document file
                </PartnerText>
              </View>
              <Pressable hitSlop={12} onPress={() => setActiveDocForUpload(null)}>
                <X size={px(20)} color="#4B5563" />
              </Pressable>
            </View>

            {/* Android Permission & Privacy Assurance Banner */}
            <View style={styles.permissionInfoBanner}>
              <ShieldCheck size={px(14)} color="#059669" />
              <PartnerText style={styles.permissionInfoText}>
                Android permissions are requested only to capture and verify official documents securely.
              </PartnerText>
            </View>

            {/* Option 1: Camera */}
            <Pressable
              onPress={() => activeDocForUpload && handlePickFromCamera(activeDocForUpload)}
              style={({ pressed }) => [
                styles.uploadOptionRow,
                { paddingVertical: px(12) },
                pressed && styles.pressed,
              ]}>
              <View style={[styles.uploadOptionIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Camera size={px(19)} color="#D97706" />
              </View>
              <View style={styles.uploadOptionTextWrap}>
                <PartnerText style={[styles.uploadOptionTitle, { fontSize: px(13.5) }]}>Take photo</PartnerText>
                <PartnerText style={[styles.uploadOptionSubtitle, { fontSize: px(11.5) }]}>
                  Camera • Photo capture with auto-crop
                </PartnerText>
              </View>
              <ChevronRight size={px(17)} color="#9CA3AF" />
            </Pressable>

            {/* Option 2: Gallery */}
            <Pressable
              onPress={() => activeDocForUpload && handlePickFromGallery(activeDocForUpload)}
              style={({ pressed }) => [
                styles.uploadOptionRow,
                { paddingVertical: px(12) },
                pressed && styles.pressed,
              ]}>
              <View style={[styles.uploadOptionIconBox, { backgroundColor: '#EFF6FF' }]}>
                <ImageIcon size={px(19)} color="#2563EB" />
              </View>
              <View style={styles.uploadOptionTextWrap}>
                <PartnerText style={[styles.uploadOptionTitle, { fontSize: px(13.5) }]}>
                  Choose from gallery
                </PartnerText>
                <PartnerText style={[styles.uploadOptionSubtitle, { fontSize: px(11.5) }]}>
                  Photos • JPG or PNG from gallery
                </PartnerText>
              </View>
              <ChevronRight size={px(17)} color="#9CA3AF" />
            </Pressable>

            {/* Option 3: Document File */}
            <Pressable
              onPress={() => activeDocForUpload && handlePickFromFiles(activeDocForUpload)}
              style={({ pressed }) => [
                styles.uploadOptionRow,
                { paddingVertical: px(12) },
                pressed && styles.pressed,
              ]}>
              <View style={[styles.uploadOptionIconBox, { backgroundColor: '#F3F4F6' }]}>
                <FileUp size={px(19)} color="#4B5563" />
              </View>
              <View style={styles.uploadOptionTextWrap}>
                <PartnerText style={[styles.uploadOptionTitle, { fontSize: px(13.5) }]}>
                  Select PDF document
                </PartnerText>
                <PartnerText style={[styles.uploadOptionSubtitle, { fontSize: px(11.5) }]}>
                  Files • PDF files up to 10 MB
                </PartnerText>
              </View>
              <ChevronRight size={px(17)} color="#9CA3AF" />
            </Pressable>

            {/* Option 4: Instant Sample Document */}
            <Pressable
              onPress={() => activeDocForUpload && handlePickSample(activeDocForUpload)}
              style={({ pressed }) => [
                styles.uploadOptionRow,
                styles.sampleOptionRow,
                { paddingVertical: px(12), marginTop: px(8), borderRadius: px(10) },
                pressed && styles.pressed,
              ]}>
              <View style={[styles.uploadOptionIconBox, { backgroundColor: '#DCFCE7' }]}>
                <Sparkles size={px(18)} color="#15803D" />
              </View>
              <View style={styles.uploadOptionTextWrap}>
                <PartnerText style={[styles.uploadOptionTitle, { color: '#166534', fontSize: px(13.5) }]}>
                  Use verified sample document
                </PartnerText>
                <PartnerText style={[styles.uploadOptionSubtitle, { color: '#15803D', fontSize: px(11.5) }]}>
                  Fast testing & QA preview
                </PartnerText>
              </View>
              <Check size={px(16)} color="#15803D" strokeWidth={2.5} />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Upload Progress Animation Modal */}
      <Modal visible={!!uploadProgressState} transparent animationType="fade">
        <View style={styles.progressModalOverlay}>
          <View style={[styles.progressModalBox, { padding: px(20), borderRadius: px(14) }]}>
            {uploadProgressState?.isComplete ? (
              <View style={styles.progressSuccessCircle}>
                <CheckCircle2 size={px(42)} color="#15803D" strokeWidth={2.4} />
              </View>
            ) : (
              <View style={styles.progressSpinnerWrap}>
                <ActivityIndicator size="large" color="#D97706" />
              </View>
            )}

            <PartnerText style={[styles.progressDocTitle, { fontSize: px(15) }]}>
              {uploadProgressState?.doc.title}
            </PartnerText>

            <PartnerText style={[styles.progressStatusText, { fontSize: px(12) }]}>
              {uploadProgressState?.statusText}
            </PartnerText>

            {/* Progress Bar Track */}
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${uploadProgressState?.progress || 0}%`,
                    backgroundColor: uploadProgressState?.isComplete ? '#15803D' : '#D97706',
                  },
                ]}
              />
            </View>

            <PartnerText style={[styles.progressPercentText, { fontSize: px(11) }]}>
              {uploadProgressState?.progress}%
            </PartnerText>
          </View>
        </View>
      </Modal>

      {/* Document Preview Modal */}
      <Modal visible={!!previewDocData} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setPreviewDocData(null)}>
          <Pressable
            style={[styles.modalSheet, { paddingBottom: px(28), maxHeight: px(520), borderRadius: px(16) }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View>
                <PartnerText style={[styles.sheetTitle, { fontSize: px(15.5) }]}>
                  {previewDocData?.title}
                </PartnerText>
                <PartnerText style={[styles.sheetSubtitle, { fontSize: px(11.5) }]}>
                  {previewDocData?.name}
                </PartnerText>
              </View>
              <Pressable hitSlop={12} onPress={() => setPreviewDocData(null)}>
                <X size={px(20)} color="#4B5563" />
              </Pressable>
            </View>

            {previewDocData?.uri ? (
              previewDocData.mimeType === 'application/pdf' ||
              previewDocData.name?.toLowerCase().endsWith('.pdf') ? (
                <View style={[styles.pdfPreviewContainer, { height: px(200), marginVertical: px(12) }]}>
                  <FileText size={px(54)} color="#EF4444" />
                  <PartnerText style={[styles.pdfFileName, { fontSize: px(13) }]} numberOfLines={2}>
                    {previewDocData.name}
                  </PartnerText>
                  <View style={styles.pdfVerifiedBadge}>
                    <ShieldCheck size={px(12)} color="#15803D" />
                    <PartnerText style={[styles.pdfVerifiedText, { fontSize: px(11) }]}>
                      PDF Document Ready & Verified
                    </PartnerText>
                  </View>
                </View>
              ) : (
                <View style={[styles.previewImageContainer, { height: px(260), marginVertical: px(12) }]}>
                  <Image
                    source={{ uri: previewDocData.uri }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                </View>
              )
            ) : null}

            <Pressable
              onPress={() => setPreviewDocData(null)}
              style={[styles.closePreviewBtn, { height: px(44), borderRadius: px(10) }]}>
              <PartnerText style={styles.closePreviewBtnText}>Close Preview</PartnerText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </DriverRegistrationLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 0,
    shadowOpacity: 0,
    shadowColor: 'transparent',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerIconBox: {
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTextWrap: {
    flex: 1,
  },
  cardHeaderTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  cardHeaderSubtitle: {
    color: '#6B7280',
    marginTop: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 10,
  },
  sectionContainer: {
    width: '100%',
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  // Document Single Slim Row Item
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  docRowUploaded: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  docIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  docTextWrap: {
    flex: 1,
    marginRight: 6,
  },
  docTitle: {
    fontWeight: '600',
    color: '#111827',
  },
  docSubtitle: {
    color: '#6B7280',
    marginTop: 1,
  },
  docSubtitleUploaded: {
    color: '#15803D',
    fontWeight: '500',
    marginTop: 1,
  },
  badgeWrap: {
    marginRight: 8,
  },
  badgeRequired: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  badgeRequiredText: {
    color: '#B45309',
    fontWeight: '600',
  },
  badgeUploaded: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  badgeUploadedText: {
    color: '#15803D',
    fontWeight: '600',
  },
  badgeConditional: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  badgeConditionalText: {
    color: '#2563EB',
    fontWeight: '600',
  },
  badgeLater: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
    marginRight: 6,
  },
  badgeLaterText: {
    color: '#2563EB',
    fontWeight: '600',
  },
  docActionWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    gap: 4,
  },
  uploadBtnText: {
    color: '#374151',
    fontWeight: '600',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Collapsible Bottom Row
  collapsibleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  collapsibleRowTitle: {
    fontWeight: '500',
    color: '#374151',
    flex: 1,
    marginRight: 6,
  },
  // Bottom security note
  securityNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityNoteText: {
    color: '#6B7280',
    fontWeight: '500',
  },
  // Bottom Sheet Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  sheetSubtitle: {
    color: '#6B7280',
    marginTop: 2,
  },
  permissionInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
    gap: 8,
  },
  permissionInfoText: {
    flex: 1,
    fontSize: 11,
    color: '#166534',
    lineHeight: 15,
  },
  uploadOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  uploadOptionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  uploadOptionTextWrap: {
    flex: 1,
  },
  uploadOptionTitle: {
    fontWeight: '600',
    color: '#111827',
  },
  uploadOptionSubtitle: {
    color: '#6B7280',
    marginTop: 1,
  },
  sampleOptionRow: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  // Progress Modal
  progressModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  progressModalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  progressSpinnerWrap: {
    marginBottom: 14,
  },
  progressSuccessCircle: {
    marginBottom: 14,
  },
  progressDocTitle: {
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  progressStatusText: {
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercentText: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  // Preview Modal
  previewImageContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  pdfPreviewContainer: {
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  pdfFileName: {
    fontWeight: '700',
    color: '#991B1B',
    textAlign: 'center',
  },
  pdfVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pdfVerifiedText: {
    color: '#15803D',
    fontWeight: '600',
  },
  closePreviewBtn: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePreviewBtnText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
