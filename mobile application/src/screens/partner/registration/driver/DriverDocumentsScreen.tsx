import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Camera,
  Check,
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
  Sparkles,
  Trash2,
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
  const driverVehicle = usePartnerRegistrationStore((s) => s.driverVehicle);

  const isFromReview = Boolean(route.params?.fromReview);

  const [activeDocForUpload, setActiveDocForUpload] = useState<DriverDocumentConfig | null>(null);
  const [previewDocData, setPreviewDocData] = useState<{ title: string; uri: string; name: string } | null>(
    null,
  );
  const [showLaterSection, setShowLaterSection] = useState(false);

  const handleBack = () =>
    partnerRegistrationGoBack(navigation, 'DriverDocuments', route.params);

  const isDocUploaded = (docId: string) =>
    driverDocuments.some((d) => d.id === docId);

  const getUploadedDoc = (docId: string) =>
    driverDocuments.find((d) => d.id === docId);

  const handleAttachMock = (doc: DriverDocumentConfig) => {
    addDriverDocument({
      id: doc.id,
      label: doc.title,
      uri: `https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&q=80&sig=${doc.id}`,
      name: `${doc.id}_verified.jpg`,
      mimeType: 'image/jpeg',
    });
    setActiveDocForUpload(null);
  };

  const handleAutoFillAllCore = () => {
    CORE_REVIEW_DOCUMENTS.forEach((doc) => {
      addDriverDocument({
        id: doc.id,
        label: doc.title,
        uri: `https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&q=80&sig=${doc.id}`,
        name: `${doc.id}_verified.jpg`,
        mimeType: 'image/jpeg',
      });
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

  const coreUploadedCount = CORE_REVIEW_DOCUMENTS.filter((d) => isDocUploaded(d.id)).length;

  return (
    <DriverRegistrationLayout
      step={3}
      title="Driver registration"
      subtitle="Upload clear, readable photos or PDFs."
      onBack={handleBack}
      onContinue={handleContinue}
      continueLabel={isFromReview ? 'Save & Return to Review →' : 'Continue →'}>
      {/* Top Header Card */}
      <View style={[styles.card, styles.headerCard, { padding: px(16), marginBottom: px(16) }]}>
        <View style={styles.headerRow}>
          <View style={[styles.headerIconBox, { width: px(40), height: px(40), borderRadius: px(10) }]}>
            <FileText size={px(20)} color="#D97706" strokeWidth={2.4} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { fontSize: px(16) }]}>Documents for verification</Text>
            <Text style={[styles.headerSubtitle, { fontSize: px(13) }]}>
              Review takes 2-4 hours. You can complete later items after approval.
            </Text>
          </View>
        </View>

        {/* Demo Auto-Fill Shortcut */}
        <Pressable
          onPress={handleAutoFillAllCore}
          style={({ pressed }) => [
            styles.demoFillBtn,
            { marginTop: px(12), paddingVertical: px(8), paddingHorizontal: px(12) },
            pressed && styles.pressed,
          ]}>
          <Sparkles size={px(15)} color="#D97706" />
          <Text style={[styles.demoFillText, { fontSize: px(12) }]}>
            Auto-fill all 6 required documents (Instant Demo)
          </Text>
        </Pressable>
      </View>

      {/* Group 1: Needed for review (6 core documents) */}
      <View style={[styles.sectionContainer, { marginBottom: px(20) }]}>
        <View style={[styles.sectionHeaderRow, { marginBottom: px(12) }]}>
          <View style={styles.sectionHeaderTitleRow}>
            <Text style={[styles.sectionTitle, { fontSize: px(15) }]}>Needed for review</Text>
            <View style={styles.countBadge}>
              <Text style={[styles.countBadgeText, { fontSize: px(11) }]}>
                {coreUploadedCount}/6 Complete
              </Text>
            </View>
          </View>
          <Text style={[styles.sectionHint, { fontSize: px(12) }]}>
            Required before your profile goes live
          </Text>
        </View>

        {CORE_REVIEW_DOCUMENTS.map((doc) => {
          const uploaded = isDocUploaded(doc.id);
          const uploadedData = getUploadedDoc(doc.id);
          const Icon = doc.Icon;

          return (
            <View
              key={doc.id}
              style={[
                styles.docCard,
                { padding: px(14), marginBottom: px(10), borderRadius: px(12) },
                uploaded && styles.docCardUploaded,
              ]}>
              <View style={styles.docCardMainRow}>
                <View
                  style={[
                    styles.docIconBox,
                    {
                      width: px(38),
                      height: px(38),
                      borderRadius: px(10),
                      backgroundColor: uploaded ? '#DCFCE7' : '#FEF3C7',
                    },
                  ]}>
                  {uploaded ? (
                    <Check size={px(18)} color="#15803D" strokeWidth={2.8} />
                  ) : (
                    <Icon size={px(18)} color="#D97706" strokeWidth={2.2} />
                  )}
                </View>

                <View style={styles.docTextWrap}>
                  <View style={styles.docTitleRow}>
                    <Text style={[styles.docTitle, { fontSize: px(14) }]}>{doc.title}</Text>
                    {uploaded ? (
                      <View style={styles.statusPillUploaded}>
                        <Check size={px(11)} color="#15803D" strokeWidth={3} />
                        <Text style={[styles.statusPillTextUploaded, { fontSize: px(11) }]}>
                          Uploaded
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.statusPillRequired}>
                        <Text style={[styles.statusPillTextRequired, { fontSize: px(11) }]}>
                          Required
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.docSubtitle, { fontSize: px(12), marginTop: px(2) }]}>
                    {uploaded ? uploadedData?.name || `${doc.id}_verified.jpg` : doc.subtitle}
                  </Text>
                </View>
              </View>

              {/* Action Button Row */}
              <View style={[styles.docActionRow, { marginTop: px(10) }]}>
                {uploaded ? (
                  <>
                    <Pressable
                      onPress={() =>
                        uploadedData &&
                        setPreviewDocData({
                          title: doc.title,
                          uri: uploadedData.uri,
                          name: uploadedData.name,
                        })
                      }
                      style={({ pressed }) => [
                        styles.previewBtn,
                        { paddingVertical: px(6), paddingHorizontal: px(10) },
                        pressed && styles.pressed,
                      ]}>
                      <Eye size={px(12)} color="#2563EB" />
                      <Text style={[styles.previewBtnText, { fontSize: px(12) }]}>View</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setActiveDocForUpload(doc)}
                      style={({ pressed }) => [
                        styles.replaceBtn,
                        { paddingVertical: px(6), paddingHorizontal: px(10) },
                        pressed && styles.pressed,
                      ]}>
                      <RefreshCw size={px(12)} color="#4B5563" />
                      <Text style={[styles.replaceBtnText, { fontSize: px(12) }]}>Replace</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => removeDriverDocument(doc.id)}
                      hitSlop={10}
                      style={styles.trashBtn}>
                      <Trash2 size={px(16)} color="#EF4444" />
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    onPress={() => setActiveDocForUpload(doc)}
                    style={({ pressed }) => [
                      styles.uploadTriggerBtn,
                      { paddingVertical: px(8), paddingHorizontal: px(14) },
                      pressed && styles.pressed,
                    ]}>
                    <Plus size={px(14)} color="#D97706" strokeWidth={2.5} />
                    <Text style={[styles.uploadTriggerText, { fontSize: px(13) }]}>Upload</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Group 2: Only when applicable (Conditional) */}
      <View style={[styles.sectionContainer, { marginBottom: px(20) }]}>
        <View style={[styles.sectionHeaderRow, { marginBottom: px(12) }]}>
          <View style={styles.sectionHeaderTitleRow}>
            <Text style={[styles.sectionTitle, { fontSize: px(15) }]}>Only when applicable</Text>
            <View style={[styles.countBadge, { backgroundColor: '#F3F4F6' }]}>
              <Text style={[styles.countBadgeText, { color: '#4B5563', fontSize: px(11) }]}>
                Conditional
              </Text>
            </View>
          </View>
          <Text style={[styles.sectionHint, { fontSize: px(12) }]}>
            Upload if applicable to your vehicle or permit status
          </Text>
        </View>

        {CONDITIONAL_DOCUMENTS.map((doc) => {
          const uploaded = isDocUploaded(doc.id);
          const uploadedData = getUploadedDoc(doc.id);
          const Icon = doc.Icon;
          const isNocNeeded =
            doc.id === 'owner_noc' && driverVehicle.registeredTo === 'someone_else';

          return (
            <View
              key={doc.id}
              style={[
                styles.docCard,
                { padding: px(14), marginBottom: px(10), borderRadius: px(12) },
                isNocNeeded && styles.docCardHighlighted,
                uploaded && styles.docCardUploaded,
              ]}>
              <View style={styles.docCardMainRow}>
                <View
                  style={[
                    styles.docIconBox,
                    {
                      width: px(38),
                      height: px(38),
                      borderRadius: px(10),
                      backgroundColor: uploaded ? '#DCFCE7' : isNocNeeded ? '#FEF3C7' : '#F3F4F6',
                    },
                  ]}>
                  {uploaded ? (
                    <Check size={px(18)} color="#15803D" strokeWidth={2.8} />
                  ) : (
                    <Icon
                      size={px(18)}
                      color={isNocNeeded ? '#D97706' : '#6B7280'}
                      strokeWidth={2.2}
                    />
                  )}
                </View>

                <View style={styles.docTextWrap}>
                  <View style={styles.docTitleRow}>
                    <Text style={[styles.docTitle, { fontSize: px(14) }]}>{doc.title}</Text>
                    {uploaded ? (
                      <View style={styles.statusPillUploaded}>
                        <Check size={px(11)} color="#15803D" strokeWidth={3} />
                        <Text style={[styles.statusPillTextUploaded, { fontSize: px(11) }]}>
                          Uploaded
                        </Text>
                      </View>
                    ) : isNocNeeded ? (
                      <View style={styles.statusPillRequired}>
                        <Text style={[styles.statusPillTextRequired, { fontSize: px(11) }]}>
                          Needed for NOC
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.statusPillRequired, { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }]}>
                        <Text style={[styles.statusPillTextRequired, { color: '#6B7280', fontSize: px(11) }]}>
                          Optional
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.docSubtitle, { fontSize: px(12), marginTop: px(2) }]}>
                    {uploaded ? uploadedData?.name : doc.subtitle}
                  </Text>
                </View>
              </View>

              <View style={[styles.docActionRow, { marginTop: px(10) }]}>
                {uploaded ? (
                  <>
                    <Pressable
                      onPress={() =>
                        uploadedData &&
                        setPreviewDocData({
                          title: doc.title,
                          uri: uploadedData.uri,
                          name: uploadedData.name,
                        })
                      }
                      style={({ pressed }) => [
                        styles.previewBtn,
                        { paddingVertical: px(6), paddingHorizontal: px(10) },
                        pressed && styles.pressed,
                      ]}>
                      <Eye size={px(12)} color="#2563EB" />
                      <Text style={[styles.previewBtnText, { fontSize: px(12) }]}>View</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setActiveDocForUpload(doc)}
                      style={({ pressed }) => [
                        styles.replaceBtn,
                        { paddingVertical: px(6), paddingHorizontal: px(10) },
                        pressed && styles.pressed,
                      ]}>
                      <RefreshCw size={px(12)} color="#4B5563" />
                      <Text style={[styles.replaceBtnText, { fontSize: px(12) }]}>Replace</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => removeDriverDocument(doc.id)}
                      hitSlop={10}
                      style={styles.trashBtn}>
                      <Trash2 size={px(16)} color="#EF4444" />
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    onPress={() => setActiveDocForUpload(doc)}
                    style={({ pressed }) => [
                      styles.uploadTriggerBtnNeutral,
                      { paddingVertical: px(8), paddingHorizontal: px(14) },
                      pressed && styles.pressed,
                    ]}>
                    <Plus size={px(14)} color="#4B5563" strokeWidth={2.5} />
                    <Text style={[styles.uploadTriggerTextNeutral, { fontSize: px(13) }]}>
                      Upload
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Group 3: Before first payout & Additional checks (Collapsible) */}
      <View style={[styles.card, { padding: px(16), marginBottom: px(20) }]}>
        <Pressable
          onPress={() => setShowLaterSection(!showLaterSection)}
          style={styles.collapsibleHeader}>
          <View style={styles.collapsibleTitleRow}>
            <Text style={[styles.sectionTitle, { fontSize: px(15) }]}>
              Before first payout & Additional checks
            </Text>
            <View style={[styles.countBadge, { backgroundColor: '#EFF6FF' }]}>
              <Text style={[styles.countBadgeText, { color: '#2563EB', fontSize: px(11) }]}>
                Can do later
              </Text>
            </View>
          </View>
          {showLaterSection ? (
            <ChevronUp size={px(20)} color="#6B7280" />
          ) : (
            <ChevronDown size={px(20)} color="#6B7280" />
          )}
        </Pressable>

        {showLaterSection ? (
          <View style={{ marginTop: px(14) }}>
            {LATER_DOCUMENTS.map((doc) => {
              const uploaded = isDocUploaded(doc.id);
              const uploadedData = getUploadedDoc(doc.id);
              const Icon = doc.Icon;

              return (
                <View
                  key={doc.id}
                  style={[
                    styles.docCard,
                    { padding: px(12), marginBottom: px(10), borderRadius: px(10) },
                    uploaded && styles.docCardUploaded,
                  ]}>
                  <View style={styles.docCardMainRow}>
                    <View
                      style={[
                        styles.docIconBox,
                        {
                          width: px(34),
                          height: px(34),
                          borderRadius: px(8),
                          backgroundColor: uploaded ? '#DCFCE7' : '#EFF6FF',
                        },
                      ]}>
                      {uploaded ? (
                        <Check size={px(16)} color="#15803D" strokeWidth={2.8} />
                      ) : (
                        <Icon size={px(16)} color="#2563EB" strokeWidth={2.2} />
                      )}
                    </View>
                    <View style={styles.docTextWrap}>
                      <Text style={[styles.docTitle, { fontSize: px(13) }]}>{doc.title}</Text>
                      <Text style={[styles.docSubtitle, { fontSize: px(11), marginTop: px(2) }]}>
                        {uploaded ? uploadedData?.name : doc.subtitle}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.docActionRow, { marginTop: px(8) }]}>
                    <Pressable
                      onPress={() => setActiveDocForUpload(doc)}
                      style={styles.uploadTriggerBtnNeutral}>
                      <Text style={[styles.uploadTriggerTextNeutral, { fontSize: px(12) }]}>
                        {uploaded ? 'Update' : 'Add now (Optional)'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* Bottom Privacy/Security Note */}
      <View style={[styles.securityNote, { padding: px(14), marginBottom: px(20), borderRadius: px(12) }]}>
        <Lock size={px(16)} color="#6B7280" strokeWidth={2} style={{ marginRight: px(8) }} />
        <Text style={[styles.securityNoteText, { fontSize: px(12) }]}>
          Your documents are encrypted and only accessible by RACE verification team.
        </Text>
      </View>

      {/* Upload Action Sheet Modal */}
      <Modal visible={!!activeDocForUpload} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setActiveDocForUpload(null)}>
          <Pressable
            style={[styles.modalSheet, { paddingBottom: px(28) }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { fontSize: px(16) }]}>
                  Upload {activeDocForUpload?.title}
                </Text>
                <Text style={[styles.sheetSubtitle, { fontSize: px(12) }]}>
                  Choose photo or document file
                </Text>
              </View>
              <Pressable hitSlop={12} onPress={() => setActiveDocForUpload(null)}>
                <X size={px(20)} color="#4B5563" />
              </Pressable>
            </View>

            {/* Option 1: Camera */}
            <Pressable
              onPress={() => activeDocForUpload && handleAttachMock(activeDocForUpload)}
              style={({ pressed }) => [
                styles.uploadOptionRow,
                { paddingVertical: px(12) },
                pressed && styles.pressed,
              ]}>
              <View style={[styles.uploadOptionIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Camera size={px(20)} color="#D97706" />
              </View>
              <View style={styles.uploadOptionTextWrap}>
                <Text style={[styles.uploadOptionTitle, { fontSize: px(14) }]}>Take photo</Text>
                <Text style={[styles.uploadOptionSubtitle, { fontSize: px(12) }]}>
                  Use device camera for clear photo
                </Text>
              </View>
              <ChevronRight size={px(18)} color="#9CA3AF" />
            </Pressable>

            {/* Option 2: Gallery */}
            <Pressable
              onPress={() => activeDocForUpload && handleAttachMock(activeDocForUpload)}
              style={({ pressed }) => [
                styles.uploadOptionRow,
                { paddingVertical: px(12) },
                pressed && styles.pressed,
              ]}>
              <View style={[styles.uploadOptionIconBox, { backgroundColor: '#EFF6FF' }]}>
                <ImageIcon size={px(20)} color="#2563EB" />
              </View>
              <View style={styles.uploadOptionTextWrap}>
                <Text style={[styles.uploadOptionTitle, { fontSize: px(14) }]}>
                  Choose from gallery
                </Text>
                <Text style={[styles.uploadOptionSubtitle, { fontSize: px(12) }]}>
                  JPG or PNG from your photos
                </Text>
              </View>
              <ChevronRight size={px(18)} color="#9CA3AF" />
            </Pressable>

            {/* Option 3: Document File */}
            <Pressable
              onPress={() => activeDocForUpload && handleAttachMock(activeDocForUpload)}
              style={({ pressed }) => [
                styles.uploadOptionRow,
                { paddingVertical: px(12) },
                pressed && styles.pressed,
              ]}>
              <View style={[styles.uploadOptionIconBox, { backgroundColor: '#F3F4F6' }]}>
                <FileUp size={px(20)} color="#4B5563" />
              </View>
              <View style={styles.uploadOptionTextWrap}>
                <Text style={[styles.uploadOptionTitle, { fontSize: px(14) }]}>
                  Select PDF document
                </Text>
                <Text style={[styles.uploadOptionSubtitle, { fontSize: px(12) }]}>
                  Files up to 10 MB
                </Text>
              </View>
              <ChevronRight size={px(18)} color="#9CA3AF" />
            </Pressable>

            {/* Option 4: Instant Sample Document */}
            <Pressable
              onPress={() => activeDocForUpload && handleAttachMock(activeDocForUpload)}
              style={({ pressed }) => [
                styles.uploadOptionRow,
                styles.sampleOptionRow,
                { paddingVertical: px(12), marginTop: px(8), borderRadius: px(12) },
                pressed && styles.pressed,
              ]}>
              <View style={[styles.uploadOptionIconBox, { backgroundColor: '#DCFCE7' }]}>
                <Sparkles size={px(20)} color="#15803D" />
              </View>
              <View style={styles.uploadOptionTextWrap}>
                <Text style={[styles.uploadOptionTitle, { color: '#166534', fontSize: px(14) }]}>
                  Use verified sample document
                </Text>
                <Text style={[styles.uploadOptionSubtitle, { color: '#15803D', fontSize: px(12) }]}>
                  Instantly fills sample document for testing
                </Text>
              </View>
              <Check size={px(18)} color="#15803D" strokeWidth={2.5} />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Document Preview Modal */}
      <Modal visible={!!previewDocData} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setPreviewDocData(null)}>
          <Pressable
            style={[styles.modalSheet, { paddingBottom: px(28), maxHeight: px(520) }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { fontSize: px(16) }]}>
                  {previewDocData?.title}
                </Text>
                <Text style={[styles.sheetSubtitle, { fontSize: px(12) }]}>
                  {previewDocData?.name}
                </Text>
              </View>
              <Pressable hitSlop={12} onPress={() => setPreviewDocData(null)}>
                <X size={px(20)} color="#4B5563" />
              </Pressable>
            </View>

            {previewDocData?.uri ? (
              <View style={[styles.previewImageContainer, { height: px(280), marginVertical: px(14) }]}>
                <Image
                  source={{ uri: previewDocData.uri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              </View>
            ) : null}

            <Pressable
              onPress={() => setPreviewDocData(null)}
              style={[styles.closePreviewBtn, { height: px(44) }]}>
              <Text style={styles.closePreviewBtnText}>Close Preview</Text>
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
    borderRadius: 16,
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
  headerCard: {
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBox: {
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  headerSubtitle: {
    color: '#6B7280',
    lineHeight: 18,
  },
  demoFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
  },
  demoFillText: {
    color: '#B45309',
    fontWeight: '700',
  },
  sectionContainer: {
    width: '100%',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  sectionHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  countBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  countBadgeText: {
    color: '#B45309',
    fontWeight: '700',
  },
  sectionHint: {
    color: '#6B7280',
  },
  docCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  docCardUploaded: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  docCardHighlighted: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  docCardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  docTextWrap: {
    flex: 1,
  },
  docTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docTitle: {
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  docSubtitle: {
    color: '#6B7280',
  },
  statusPillUploaded: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 4,
  },
  statusPillTextUploaded: {
    color: '#15803D',
    fontWeight: '700',
  },
  statusPillRequired: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusPillTextRequired: {
    color: '#B45309',
    fontWeight: '700',
  },
  docActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 4,
  },
  previewBtnText: {
    color: '#2563EB',
    fontWeight: '600',
  },
  uploadTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 4,
  },
  uploadTriggerText: {
    color: '#D97706',
    fontWeight: '700',
  },
  uploadTriggerBtnNeutral: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 4,
  },
  uploadTriggerTextNeutral: {
    color: '#4B5563',
    fontWeight: '600',
  },
  replaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  replaceBtnText: {
    color: '#374151',
    fontWeight: '600',
  },
  trashBtn: {
    padding: 6,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapsibleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  securityNoteText: {
    color: '#6B7280',
    flex: 1,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  uploadOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  uploadOptionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  uploadOptionTextWrap: {
    flex: 1,
  },
  uploadOptionTitle: {
    fontWeight: '700',
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
  previewImageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  closePreviewBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePreviewBtnText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.85,
  },
});
