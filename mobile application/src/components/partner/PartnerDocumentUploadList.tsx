import { PartnerText } from './PartnerText';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, InteractionManager, Linking, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Check, CloudUpload, FileText, MoreHorizontal, type LucideIcon } from 'lucide-react-native';
import PartnerUploadSheet from './dialogs/PartnerUploadSheet';
import { colors, radius, spacing, typography } from '../../theme';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']);
const SUCCESS_GREEN = '#22C55E';

export interface PartnerDocumentFieldConfig {
  id: string;
  label: string;
  hint?: string;
  required: boolean;
  Icon: LucideIcon;
  alternatives?: Array<{ id: string; label: string }>;
}

export interface PartnerDocumentSelection {
  id: string;
  uri: string;
  name: string;
  mimeType?: string;
}

export type PartnerDocumentUploadState = {
  status: 'uploading' | 'uploaded' | 'error';
  progress?: number;
};

interface PartnerDocumentUploadListProps {
  documents: PartnerDocumentFieldConfig[];
  uploadedIds: string[];
  onUpload: (id: string, uri: string, name: string, mimeType?: string) => void;
  selectedFiles?: PartnerDocumentSelection[];
  uploadStates?: Record<string, PartnerDocumentUploadState>;
  disabled?: boolean;
  variant?: 'default' | 'card';
  hideTitle?: boolean;
  compact?: boolean;
}

type PickerSource = 'gallery' | 'camera' | 'files';

export default function PartnerDocumentUploadList({
  documents, uploadedIds, onUpload, selectedFiles, uploadStates = {}, disabled = false,
  variant = 'default', hideTitle = false, compact = false,
}: PartnerDocumentUploadListProps) {
  const { dialog: partnerDialog, showAlert } = usePartnerDialog();
  const [altDialog, setAltDialog] = useState<{
    title: string;
    options: Array<{ label: string; onPress: () => void }>;
  } | null>(null);
  const [activeDoc, setActiveDoc] = useState<PartnerDocumentFieldConfig | null>(null);
  const [preview, setPreview] = useState<PartnerDocumentSelection | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const pickerBusy = useRef(false);
  const mounted = useRef(true);
  const pendingAction = useRef<(() => void) | null>(null);
  const flushAction = useCallback(() => {
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; pendingAction.current = null; };
  }, []);
  useEffect(() => {
    if (activeDoc || Platform.OS === 'ios') return;
    const task = InteractionManager.runAfterInteractions(flushAction);
    return () => task.cancel();
  }, [activeDoc, flushAction]);

  const selectedFor = (doc: PartnerDocumentFieldConfig) => selectedFiles?.find(file =>
    file.id === doc.id || doc.alternatives?.some(option => option.id === file.id),
  );
  const showPreview = (file: PartnerDocumentSelection) => {
    setPreviewError(false);
    setPreviewLoading(file.mimeType !== 'application/pdf' && !/\.pdf$/i.test(file.name));
    setPreview(file);
  };
  const pick = async (doc: PartnerDocumentFieldConfig, source: PickerSource) => {
    if (pickerBusy.current || disabled) return;
    pickerBusy.current = true;
    setPickingId(doc.id);
    try {
      const file = await pickFile(source, doc.id);
      if (file && mounted.current) onUpload(doc.id, file.uri, file.name, file.mimeType);
    } catch (error) {
      if (!mounted.current) return;
      const raw = error instanceof Error ? error.message : 'Please try again.';
      if (raw.startsWith('CAMERA_SETTINGS::')) {
        showAlert({
          tone: 'warning',
          title: 'Camera permission required',
          message: raw.replace('CAMERA_SETTINGS::', ''),
          primaryAction: {
            label: 'Open Settings',
            onPress: () => void Linking.openSettings().catch(() => showAlert({
              tone: 'error',
              title: 'Could not open Settings',
              message: 'Open your device settings to allow camera access.',
            })),
          },
          secondaryAction: { label: 'Close', onPress: () => {} },
        });
      } else {
        showAlert({
          tone: 'error',
          title: 'Could not select document',
          message: raw,
        });
      }
    } finally {
      pickerBusy.current = false;
      if (mounted.current) setPickingId(null);
    }
  };
  const chooseSource = (source: PickerSource) => {
    if (!activeDoc) return;
    const doc = activeDoc;
    pendingAction.current = () => {
      if (doc.alternatives?.length) {
        setAltDialog({
          title: doc.label,
          options: doc.alternatives.map(option => ({
            label: option.label,
            onPress: () => void pick({ ...doc, ...option, alternatives: undefined }, source),
          })),
        });
      } else void pick(doc, source);
    };
  };
  const busy = disabled || pickingId !== null;
  const isPdf = preview?.mimeType === 'application/pdf' || Boolean(preview && /\.pdf$/i.test(preview.name));

  return (
    <View>
      {variant === 'default' && !hideTitle ? <PartnerText style={styles.listTitle}>Required Documents</PartnerText> : null}
      <View style={variant === 'card' ? styles.cardList : undefined}>
        {documents.map(doc => {
          const file = selectedFor(doc);
          const state = file ? uploadStates[file.id] : undefined;
          const legacyUploaded = selectedFiles === undefined && (uploadedIds.includes(doc.id) || Boolean(doc.alternatives?.some(option => uploadedIds.includes(option.id))));
          const uploaded = state?.status === 'uploaded' || legacyUploaded;
          const uploading = state?.status === 'uploading';
          const Icon = doc.Icon;
          const statusText = uploading ? `Uploading${state.progress === undefined ? '...' : ` ${state.progress}%`}`
            : state?.status === 'error' ? 'Upload failed'
            : uploaded ? 'Uploaded'
            : file ? 'Selected - ready to upload'
            : doc.required ? 'Not uploaded' : 'Optional';
          return (
            <View key={doc.id} style={variant === 'card' ? [styles.cardRow, compact && styles.compactCardRow] : styles.row}>
              <View style={variant === 'card' ? [styles.cardIconWrap, compact && styles.compactIconWrap, uploaded && styles.cardIconWrapDone] : styles.iconWrap}>
                <Icon size={18} color={variant === 'card' ? uploaded ? SUCCESS_GREEN : colors.primary : colors.partnerRed} strokeWidth={2.2} />
              </View>
              <View style={variant === 'card' ? styles.cardCopy : styles.copy}>
                <PartnerText
                  numberOfLines={variant === 'card' && compact ? 2 : undefined}
                  ellipsizeMode="tail"
                  style={variant === 'card' ? [styles.cardTitle, compact && styles.compactCardTitle] : styles.docTitle}>
                  {doc.label}{variant === 'card' && doc.required && !compact ? <PartnerText style={styles.required}> *</PartnerText> : null}
                </PartnerText>
                {variant === 'card' && compact ? (
                  <PartnerText
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    style={[
                      styles.compactCardMeta,
                      state?.status === 'error' && { color: colors.error },
                    ]}>
                    {state?.status === 'error'
                      ? 'Upload failed. Tap Upload to try again.'
                      : doc.hint || (doc.required ? 'Required for verification.' : 'Optional document.')}
                  </PartnerText>
                ) : doc.hint ? (
                  <PartnerText style={styles.docHint}>{doc.hint}</PartnerText>
                ) : null}
                {variant === 'card' && compact ? null : variant === 'card' || selectedFiles !== undefined ? (
                  <PartnerText style={[styles.compactDocStatus, state?.status === 'error' && { color: colors.error }]}>{statusText}</PartnerText>
                ) : (
                  <View style={[styles.badge, doc.required ? styles.badgeRequired : styles.badgeOptional]}>
                    <PartnerText style={[styles.badgeText, doc.required ? styles.badgeTextRequired : styles.badgeTextOptional]}>{doc.required ? 'Required' : 'Optional'}</PartnerText>
                  </View>
                )}
                {file ? <PartnerText numberOfLines={1} style={styles.compactDocStatus}>{file.name}</PartnerText> : null}
                {uploading && state.progress !== undefined ? (
                  <View style={styles.uploadProgressTrack}>
                    <View style={[styles.uploadProgressFill, { width: `${state.progress}%` }]} />
                  </View>
                ) : null}
              </View>
              <Pressable
                testID={`document-${doc.id}-action`}
                disabled={busy || uploading}
                accessibilityRole="button"
                accessibilityLabel={file ? `Preview ${doc.label}` : `Upload ${doc.label}`}
                onPress={() => file ? showPreview(file) : setActiveDoc(doc)}
                style={({ pressed }) => [variant === 'card' ? [styles.uploadPill, compact && styles.compactUploadPill] : [styles.uploadBtn, uploaded && styles.uploadBtnDone], pressed && styles.pressed, (busy || uploading) && { opacity: 0.6 }]}>
                {uploading || pickingId === doc.id ? <ActivityIndicator size="small" color={colors.dark} /> :
                  uploaded ? <Check size={14} color={colors.dark} /> : <CloudUpload size={14} color={colors.dark} />}
                <PartnerText style={variant === 'card' ? styles.uploadPillLabel : [styles.uploadLabel, uploaded && styles.uploadLabelDone]}>{uploading ? 'Uploading' : file ? 'View' : uploaded ? 'Uploaded' : 'Upload'}</PartnerText>
              </Pressable>
              {variant === 'card' ? <Pressable
                testID={`document-${doc.id}-options`}
                disabled={busy || uploading}
                accessibilityRole="button"
                accessibilityLabel={`${doc.label} options`}
                onPress={() => setActiveDoc(doc)} hitSlop={8} style={styles.moreBtn}>
                <MoreHorizontal size={18} color={colors.grey} />
              </Pressable> : null}
            </View>
          );
        })}
      </View>
      {variant === 'default' ? <View style={styles.infoBox}>
        <PartnerText style={styles.infoText}>Use clear, readable JPG, PNG or PDF files (maximum 5MB each).</PartnerText>
      </View> : null}
      <PartnerUploadSheet
        visible={Boolean(activeDoc)}
        onClose={() => setActiveDoc(null)}
        onDismiss={flushAction}
        onTakePhoto={() => chooseSource('camera')}
        onPickGallery={() => chooseSource('gallery')}
        onPickFile={() => chooseSource('files')}
        hasExistingPreview={Boolean(activeDoc && selectedFor(activeDoc))}
        onPreview={() => {
          const file = activeDoc && selectedFor(activeDoc);
          if (file) pendingAction.current = () => showPreview(file);
        }}
      />
      <Modal visible={Boolean(preview)} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={styles.previewOverlay}>
          <View style={styles.previewCard}>
            <PartnerText style={styles.cardTitle}>Document preview</PartnerText>
            <PartnerText numberOfLines={2} style={styles.previewName}>{preview?.name}</PartnerText>
            {isPdf ? <View style={styles.pdfPreview}>
              <FileText size={44} color={colors.primary} />
              <PartnerText style={styles.infoText}>PDF document</PartnerText>
              <Pressable style={styles.uploadPill} onPress={() => {
                if (preview) void Linking.openURL(preview.uri).catch(() => showAlert({
                  tone: 'error',
                  title: 'Could not open PDF',
                  message: 'A PDF viewer is required to open this file on your device.',
                }));
              }}><PartnerText style={styles.uploadPillLabel}>Open PDF</PartnerText></Pressable>
            </View> : preview ? <View style={styles.imagePreview}>
              <Image source={{ uri: preview.uri }} style={styles.previewImage} resizeMode="contain"
                onLoadEnd={() => setPreviewLoading(false)} onError={() => { setPreviewError(true); setPreviewLoading(false); }} />
              {previewLoading ? <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.primary} /> : null}
              {previewError ? <PartnerText style={styles.previewError}>Image could not be displayed. Select it again.</PartnerText> : null}
            </View> : null}
            <Pressable testID="document-preview-close" accessibilityRole="button" onPress={() => setPreview(null)} style={styles.previewClose}>
              <PartnerText style={styles.uploadPillLabel}>Close preview</PartnerText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Document-type chooser (replaces system Alert options) */}
      <Modal transparent animationType="fade" visible={Boolean(altDialog)} onRequestClose={() => setAltDialog(null)}>
        <Pressable style={styles.altOverlay} onPress={() => setAltDialog(null)}>
          <Pressable style={styles.altSheet} onPress={e => e.stopPropagation()}>
            <PartnerText style={styles.altTitle}>{altDialog?.title ?? ''}</PartnerText>
            <PartnerText style={styles.altSubtitle}>Choose the document type.</PartnerText>
            {altDialog?.options.map(option => (
              <Pressable
                key={option.label}
                accessibilityRole="button"
                onPress={() => {
                  setAltDialog(null);
                  option.onPress();
                }}
                style={({ pressed }) => [styles.altOption, pressed && styles.altOptionPressed]}>
                <PartnerText style={styles.altOptionText}>{option.label}</PartnerText>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => setAltDialog(null)}
              style={({ pressed }) => [styles.altOption, styles.altClose, pressed && styles.altOptionPressed]}>
              <PartnerText style={styles.altCloseText}>Cancel</PartnerText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      {partnerDialog}
    </View>
  );
}

async function pickFile(source: PickerSource, id: string): Promise<{ uri: string; name: string; mimeType: string } | null> {
  let file: { uri: string; name: string; mimeType?: string | null; size?: number | null };
  if (source === 'files') {
    const result = await DocumentPicker.getDocumentAsync({ type: [...ALLOWED_MIME], copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets[0]) return null;
    const asset = result.assets[0];
    file = { uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size: asset.size };
  } else {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        throw new Error(
          permission.canAskAgain
            ? 'Allow camera access in Settings or choose a file instead.'
            : 'CAMERA_SETTINGS::Allow camera access in Settings or choose a file instead.',
        );
      }
    }
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync({ quality: 0.85 }) :
      await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return null;
    const asset = result.assets[0];
    file = { uri: asset.uri, name: asset.fileName ?? `${id}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg', size: asset.fileSize };
  }
  const mimeType = (file.mimeType ?? (/\.pdf$/i.test(file.name) ? 'application/pdf' : /\.png$/i.test(file.name) ? 'image/png' : /\.jpe?g$/i.test(file.name) ? 'image/jpeg' : '')).toLowerCase();
  if (!file.uri || !ALLOWED_MIME.has(mimeType)) throw new Error('Only JPG, PNG and PDF files are allowed.');
  if (file.size != null && (file.size <= 0 || file.size > MAX_BYTES)) throw new Error('Choose a non-empty file up to 5MB.');
  return { uri: file.uri, name: file.name, mimeType };
}

const styles = StyleSheet.create({
  altOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,18,25,0.45)',
    justifyContent: 'flex-end',
  },
  altSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingBottom: 12,
    alignItems: 'center',
  },
  altTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark,
    marginTop: 14,
  },
  altSubtitle: {
    fontSize: 12,
    color: colors.grey,
    marginTop: 2,
  },
  altOption: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F1F5F9',
  },
  altOptionPressed: {
    backgroundColor: '#F8FAFC',
  },
  altOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  altClose: {
    marginTop: 4,
  },
  altCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.grey,
  },
  listTitle: {
    color: colors.dark,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.partnerRedLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  docTitle: {
    color: colors.dark,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  docHint: {
    marginTop: 2,
    color: colors.grey,
    fontSize: typography.sizes.xs,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgeRequired: {
    backgroundColor: '#FFF0C2',
  },
  badgeOptional: {
    backgroundColor: colors.lightGrey,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  badgeTextRequired: {
    color: colors.partnerRed,
  },
  badgeTextOptional: {
    color: colors.grey,
  },
  uploadBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: 4,
  },
  uploadBtnDone: {
    borderColor: '#F5D98A',
    backgroundColor: colors.partnerRedLight,
  },
  uploadLabel: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  uploadLabelDone: {
    color: colors.partnerRed,
  },
  infoBox: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.partnerRedLight,
  },
  infoText: {
    color: colors.dark,
    fontSize: typography.sizes.sm,
    lineHeight: typography.lineHeights.relaxed,
  },
  cardList: {
    gap: spacing.sm,
  },
  compactCardRow: { gap: 7, paddingHorizontal: 8, paddingVertical: 8, minHeight: 58, borderRadius: 10 },
  compactIconWrap: { width: 30, height: 30, borderRadius: 8 },
  compactCardTitle: { fontSize: 11, lineHeight: 14 },
  compactCardMeta: {
    fontSize: 9,
    lineHeight: 13,
    color: colors.grey,
    marginTop: 3,
    minHeight: 26,
    maxHeight: 26,
  },
  compactDocStatus: { fontSize: 9, color: colors.grey, marginTop: 3 },
  compactUploadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    minWidth: 76,
    height: 32,
    paddingHorizontal: 10,
    paddingVertical: 0,
    borderRadius: 8,
    gap: 4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  cardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconWrapDone: {
    backgroundColor: '#DCFCE7',
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: colors.dark,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  required: {
    color: colors.error,
  },
  cardHint: {
    marginTop: 2,
    color: colors.grey,
    fontSize: typography.sizes.xs,
    lineHeight: 16,
  },
  uploadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  uploadPillLabel: {
    color: colors.dark,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  uploadedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  uploadedLabel: {
    color: SUCCESS_GREEN,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  moreBtn: {
    padding: 2,
  },
  uploadProgressTrack: { height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: '#E5E7EB', marginTop: 5 },
  uploadProgressFill: { height: 3, backgroundColor: colors.primary },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  previewCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, maxHeight: '85%', gap: 12 },
  previewName: { color: colors.grey, fontSize: 12 },
  imagePreview: { height: 300, justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: '100%', height: '100%' },
  previewError: { position: 'absolute', backgroundColor: '#FFFFFF', padding: 12, color: colors.error },
  pdfPreview: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 16 },
  previewClose: { minHeight: 44, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  pressed: {
    opacity: 0.9,
  },
});
