import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Briefcase,
  Camera,
  Check,
  ChevronDown,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DriverRegistrationLayout from '../../../../components/partner/DriverRegistrationLayout';
import PartnerDocumentUploadList from '../../../../components/partner/PartnerDocumentUploadList';
import PartnerRegistrationStepCard from '../../../../components/partner/PartnerRegistrationStepCard';
import { PartnerText } from '../../../../components/partner/PartnerText';
import { VENDOR_REGISTRATION_STEPS } from '../../../../constants/partnerRegistration';
import {
  VENDOR_BUSINESS_DOCUMENTS,
  VENDOR_IDENTITY_DOCUMENTS,
  getVendorDocumentTypeLabel,
  isSameDocId,
} from '../../../../constants/partnerRegistrationDocuments';
import { usePartnerRegistrationStore } from '../../../../store/partnerRegistrationStore';
import type { PartnerRegistrationStackParamList } from '../../../../types/partnerNavigation';
import { partnerRegistrationGoBack } from '../../../../utils/partnerRegistration';

type Props = NativeStackScreenProps<PartnerRegistrationStackParamList, 'VendorDocuments'>;

type DocBucket = 'identity' | 'business';

const AMBER = '#F9A602';
const INK = '#191919';
const MUTED = '#6B7280';

const BUCKET_META: Record<
  DocBucket,
  { title: string; short: string; hint: string; Icon: typeof UserRound }
> = {
  identity: {
    title: 'Identity proof',
    short: 'Identity',
    hint: 'Proof of the owner or authorised person',
    Icon: UserRound,
  },
  business: {
    title: 'Business identity proof',
    short: 'Business',
    hint: 'Proof that the business is registered',
    Icon: Briefcase,
  },
};

export default function VendorDocumentsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const vendorDocuments = usePartnerRegistrationStore((s) => s.vendorDocuments);
  const addVendorDocument = usePartnerRegistrationStore((s) => s.addVendorDocument);
  const removeVendorDocument = usePartnerRegistrationStore((s) => s.removeVendorDocument);

  const [sheetBucket, setSheetBucket] = useState<DocBucket | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<
    { uri: string; name: string; mimeType?: string } | null
  >(null);

  const storedByBucket = useMemo(() => {
    const identity = vendorDocuments.filter((d) =>
      VENDOR_IDENTITY_DOCUMENTS.some((c) => isSameDocId(d.id, c.id)),
    );
    const business = vendorDocuments.filter((d) =>
      VENDOR_BUSINESS_DOCUMENTS.some((c) => isSameDocId(d.id, c.id)),
    );
    return { identity, business };
  }, [vendorDocuments]);

  const missing = [
    storedByBucket.identity.length === 0 ? 'Identity proof' : null,
    storedByBucket.business.length === 0 ? 'Business identity proof' : null,
  ].filter(Boolean) as string[];

  const options = sheetBucket === 'business' ? VENDOR_BUSINESS_DOCUMENTS : VENDOR_IDENTITY_DOCUMENTS;
  const selectedDoc = options.find((doc) => doc.id === selectedType) ?? null;

  const handleBack = () => partnerRegistrationGoBack(navigation, 'VendorDocuments', route.params);

  const handleContinue = () => {
    if (missing.length > 0) {
      Alert.alert(
        'Add at least one document',
        `Upload one identity proof and one business identity proof before continuing.\n\nMissing: ${missing.join(', ')}.`,
      );
      return;
    }
    navigation.navigate('VendorReview', route.params);
  };

  const openSheet = (bucket: DocBucket) => {
    setSheetBucket(bucket);
    setSelectedType(null);
    setPendingFile(null);
    setDropdownOpen(true);
  };

  const closeSheet = () => {
    setSheetBucket(null);
    setSelectedType(null);
    setPendingFile(null);
    setDropdownOpen(false);
  };

  const saveDocument = () => {
    if (!selectedDoc || !pendingFile) return;
    addVendorDocument({
      id: selectedDoc.id,
      label: selectedDoc.label,
      uri: pendingFile.uri,
      name: pendingFile.name,
      mimeType: pendingFile.mimeType,
    });
    closeSheet();
  };

  const replaceDoc = (bucket: DocBucket) => {
    Alert.alert(
      'Replace document?',
      'This will open the document picker. Your current file stays until you pick a new one.',
      [
        { text: 'Keep', style: 'cancel' },
        { text: 'Choose new', onPress: () => openSheet(bucket) },
      ],
    );
  };

  const removeDoc = (id: string) => {
    Alert.alert('Remove document?', 'You can upload another proof from this category.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeVendorDocument(id) },
    ]);
  };

  const ready = missing.length === 0;

  return (
    <DriverRegistrationLayout
      step={3}
      stepLabels={VENDOR_REGISTRATION_STEPS}
      title="Vendor registration"
      subtitle="Upload your proof documents for verification."
      onBack={handleBack}
      onContinue={handleContinue}
      continueLabel="Continue">
      <PartnerRegistrationStepCard
        title="Choose & upload documents"
        subtitle="Pick one from each category. Both are required."
        Icon={ShieldCheck}>
        {(['identity', 'business'] as DocBucket[]).map((bucket) => {
          const meta = BUCKET_META[bucket];
          const docs = storedByBucket[bucket];
          const Icon = meta.Icon;
          const added = docs.length > 0;
          return (
            <View
              key={bucket}
              style={[styles.bucketCard, added && styles.bucketCardDone]}>
              <View style={styles.bucketHead}>
                <View style={[styles.bucketIcon, added && styles.bucketIconDone]}>
                  <Icon size={17} color={added ? '#15803D' : INK} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <PartnerText style={styles.bucketTitle}>{meta.title}</PartnerText>
                  <PartnerText style={styles.bucketSub} numberOfLines={1}>
                    {meta.hint}
                  </PartnerText>
                </View>
                <View
                  style={[
                    styles.bucketStatus,
                    { backgroundColor: added ? '#E9F8EF' : '#F3F4F6' },
                  ]}>
                  <PartnerText
                    style={[styles.bucketStatusText, { color: added ? '#13834C' : MUTED }]}>
                    {added ? 'Added' : 'Required'}
                  </PartnerText>
                </View>
              </View>

              {added ? (
                docs.map((doc) => (
                  <View key={doc.id} style={styles.docRow}>
                    <View style={styles.docCheck}>
                      <FileCheck2 size={15} color="#15803D" strokeWidth={2.4} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <PartnerText style={styles.docTitle} numberOfLines={1}>
                        {getVendorDocumentTypeLabel(doc.id)}
                      </PartnerText>
                      <PartnerText style={styles.docMeta} numberOfLines={1}>
                        {doc.name}
                      </PartnerText>
                    </View>
                    <Pressable
                      onPress={() => replaceDoc(bucket)}
                      hitSlop={6}
                      accessibilityRole="button"
                      style={styles.replaceBtn}>
                      <PartnerText style={styles.replaceText}>Replace</PartnerText>
                    </Pressable>
                    <Pressable
                      onPress={() => removeDoc(doc.id)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Remove document"
                      style={styles.trashBtn}>
                      <Trash2 size={15} color="#B42318" strokeWidth={2.2} />
                    </Pressable>
                  </View>
                ))
              ) : (
                <Pressable
                  onPress={() => openSheet(bucket)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}>
                  <FileText size={15} color={INK} strokeWidth={2.3} />
                  <PartnerText style={styles.addBtnText}>Choose & upload</PartnerText>
                </Pressable>
              )}
            </View>
          );
        })}

        {ready ? (
          <View style={styles.summaryReadyRow}>
            <FileCheck2 size={14} color="#15803D" strokeWidth={2.2} />
            <PartnerText style={styles.summaryReadyText}>
              Both categories added — you can continue.
            </PartnerText>
          </View>
        ) : null}
      </PartnerRegistrationStepCard>

      {sheetBucket ? (
        <Modal visible transparent animationType="fade" onRequestClose={closeSheet}>
          <View style={styles.modalRoot}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
            <View
              style={[
                styles.sheet,
                { maxHeight: Math.min(windowHeight * 0.86, 660), paddingBottom: Math.max(insets.bottom, 14) },
              ]}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHead}>
                <View style={{ flex: 1 }}>
                  <PartnerText style={styles.sheetTitle}>{BUCKET_META[sheetBucket].title}</PartnerText>
                  <PartnerText style={styles.sheetSub}>
                    Choose one document type, then upload a clear photo or PDF.
                  </PartnerText>
                </View>
                <Pressable onPress={closeSheet} hitSlop={10} style={styles.sheetClose}>
                  <X size={18} color={MUTED} strokeWidth={2.4} />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 10 }}>
                <Pressable
                  onPress={() => setDropdownOpen((v) => !v)}
                  style={[styles.select, dropdownOpen && styles.selectOpen]}>
                  <View style={{ flex: 1 }}>
                    <PartnerText style={styles.selectCaption}>DOCUMENT TYPE</PartnerText>
                    <PartnerText
                      numberOfLines={1}
                      style={[styles.selectText, !selectedDoc && { color: MUTED, fontWeight: '500' }]}>
                      {selectedDoc ? selectedDoc.label : 'Select document type'}
                    </PartnerText>
                  </View>
                  <View style={styles.selectChevron}>
                    <ChevronDown
                      size={16}
                      color={dropdownOpen ? INK : MUTED}
                      strokeWidth={2.6}
                      style={{ transform: [{ rotate: dropdownOpen ? '180deg' : '0deg' }] }}
                    />
                  </View>
                </Pressable>

                {dropdownOpen ? (
                  <View style={styles.dropdown}>
                    {options.map((doc, index) => {
                      const active = doc.id === selectedType;
                      return (
                        <Pressable
                          key={doc.id}
                          onPress={() => {
                            setSelectedType(doc.id);
                            setDropdownOpen(false);
                            setPendingFile(null);
                          }}
                          style={({ pressed }) => [
                            styles.dropdownRow,
                            index === options.length - 1 && { borderBottomWidth: 0 },
                            active && styles.dropdownRowActive,
                            pressed && { backgroundColor: '#F8FAFC' },
                          ]}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <PartnerText style={styles.dropdownLabel}>{doc.label}</PartnerText>
                            {doc.hint ? (
                              <PartnerText style={styles.dropdownHint} numberOfLines={1}>
                                {doc.hint}
                              </PartnerText>
                            ) : null}
                          </View>
                          <View style={[styles.radio, active && styles.radioActive]}>
                            {active ? <View style={styles.radioDot} /> : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                {/* Preview for the picked file */}
                {selectedDoc && pendingFile ? (
                  <View style={styles.fileCard}>
                    <View style={styles.fileIcon}>
                      {/\.pdf$/i.test(pendingFile.name) ? (
                        <FileText size={18} color={AMBER} strokeWidth={2.2} />
                      ) : (
                        <ImageIcon size={18} color={AMBER} strokeWidth={2.2} />
                      )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <PartnerText style={styles.fileName} numberOfLines={1}>
                        {pendingFile.name}
                      </PartnerText>
                      <PartnerText style={styles.fileMeta} numberOfLines={1}>
                        {selectedDoc.label} · ready to add
                      </PartnerText>
                    </View>
                    <Pressable onPress={() => setPendingFile(null)} hitSlop={8} style={styles.trashBtn}>
                      <Trash2 size={15} color="#B42318" strokeWidth={2.2} />
                    </Pressable>
                  </View>
                ) : null}

                {selectedDoc ? (
                  <View style={{ marginTop: 12 }}>
                    <PartnerText style={styles.uploadCaption}>
                      {pendingFile ? 'Change file' : 'Upload file'}
                    </PartnerText>
                    <PartnerDocumentUploadList
                      documents={[{ ...selectedDoc, required: true }]}
                      uploadedIds={[]}
                      variant="card"
                      compact
                      hideTitle
                      selectedFiles={
                        pendingFile
                          ? [{ id: selectedDoc.id, uri: pendingFile.uri, name: pendingFile.name }]
                          : []
                      }
                      onUpload={(_id, uri, name, mimeType) => {
                        setPendingFile({ uri, name, mimeType });
                      }}
                    />
                    <View style={styles.uploadHints}>
                      <Camera size={12} color={MUTED} strokeWidth={2.2} />
                      <PartnerText style={styles.uploadHintsText}>
                        Take a photo or pick JPG / PNG / PDF up to 5 MB
                      </PartnerText>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyHint}>
                    <ShieldCheck size={15} color={MUTED} strokeWidth={2.2} />
                    <PartnerText style={styles.emptyHintText}>
                      Select a document type to see the upload option.
                    </PartnerText>
                  </View>
                )}
              </ScrollView>

              <View style={styles.sheetActions}>
                <Pressable style={styles.cancelBtn} onPress={closeSheet}>
                  <PartnerText style={styles.cancelText}>Cancel</PartnerText>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.saveBtn,
                    !(selectedDoc && pendingFile) && styles.saveBtnDisabled,
                    pressed && { opacity: 0.9 },
                  ]}
                  disabled={!selectedDoc || !pendingFile}
                  onPress={saveDocument}>
                  <Check size={16} color={INK} strokeWidth={2.8} />
                  <PartnerText style={styles.saveText}>Add document</PartnerText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </DriverRegistrationLayout>
  );
}

const styles = StyleSheet.create({
  bucketCard: {
    borderWidth: 1,
    borderColor: '#E9EAEC',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  bucketCardDone: { borderColor: '#BBF7D0', backgroundColor: '#FCFEFD' },
  bucketHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  bucketIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#FFF5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bucketIconDone: { backgroundColor: '#DCFCE7' },
  bucketTitle: { color: INK, fontSize: 13.5, fontWeight: '700' },
  bucketSub: { color: MUTED, fontSize: 10.5, marginTop: 2 },
  bucketStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  bucketStatusText: { fontSize: 10, fontWeight: '600' },

  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 9,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  docCheck: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: { color: INK, fontSize: 12.5, fontWeight: '700' },
  docMeta: { color: MUTED, fontSize: 10.5, marginTop: 1 },
  replaceBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  replaceText: { color: '#2563EB', fontSize: 10.5, fontWeight: '800' },
  trashBtn: { padding: 4 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 11,
    height: 44,
    borderRadius: 11,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#F5C26B',
    backgroundColor: '#FFFAF0',
  },
  addBtnText: { color: INK, fontSize: 12.5, fontWeight: '700' },

  summaryReadyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  summaryReadyText: { color: '#15803D', fontSize: 11, fontWeight: '600' },

  modalRoot: { flex: 1, backgroundColor: 'rgba(10,14,20,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 10,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  sheetTitle: { color: INK, fontSize: 17, fontWeight: '800' },
  sheetSub: { color: MUTED, fontSize: 11.5, marginTop: 3, lineHeight: 16 },
  sheetClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  select: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectOpen: { borderColor: AMBER, backgroundColor: '#FFFFFF' },
  selectCaption: { color: MUTED, fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  selectText: { color: INK, fontSize: 13.5, fontWeight: '700', marginTop: 2 },
  selectChevron: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2F6',
  },

  dropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E9EAEC',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEEEEE',
  },
  dropdownRowActive: { backgroundColor: '#F0FDF4' },
  dropdownLabel: { color: INK, fontSize: 13, fontWeight: '700' },
  dropdownHint: { color: MUTED, fontSize: 10.5, marginTop: 1 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  radioActive: { borderColor: '#22C55E' },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#22C55E' },

  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 10,
    padding: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    backgroundColor: '#F0FDF4',
  },
  fileIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: { color: INK, fontSize: 12, fontWeight: '700' },
  fileMeta: { color: MUTED, fontSize: 10, marginTop: 1 },
  uploadCaption: { color: MUTED, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4, marginBottom: 6 },
  uploadHints: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  uploadHintsText: { color: MUTED, fontSize: 10.5, flex: 1 },
  emptyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  emptyHintText: { color: MUTED, fontSize: 11, flex: 1 },

  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: INK, fontSize: 13.5, fontWeight: '700' },
  saveBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 12,
    backgroundColor: AMBER,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { color: INK, fontSize: 13.5, fontWeight: '800' },
});
