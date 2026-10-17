import { PartnerText } from '../PartnerText';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Camera, Image as ImageIcon, Eye, FileText } from 'lucide-react-native';
import { driverColors, getPressableFeedback } from '../../../theme/driverUi';

interface PartnerUploadSheetProps {
  visible: boolean;
  onTakePhoto: () => void;
  onPickGallery: () => void;
  onPickFile?: () => void;
  onPreview?: () => void;
  onClose: () => void;
  onDismiss?: () => void;
  hasExistingPreview?: boolean;
  /** Small line under the title, e.g. the document being uploaded. */
  subtitle?: string;
}

/** Modern bottom-sheet picker for document uploads (camera / gallery / file / preview). */
export default function PartnerUploadSheet({
  visible,
  onTakePhoto,
  onPickGallery,
  onPickFile,
  onPreview,
  onClose,
  onDismiss,
  hasExistingPreview = false,
  subtitle,
}: PartnerUploadSheetProps) {
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onDismiss={onDismiss}
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.handleBar} />

          <PartnerText style={styles.sheetTitle}>Upload document</PartnerText>
          {subtitle ? <PartnerText style={styles.sheetSubtitle}>{subtitle}</PartnerText> : null}

          {/* Primary pair: camera + gallery side by side */}
          <View style={styles.gridRow}>
            <Pressable
              style={({ pressed }) => [styles.gridCard, getPressableFeedback(pressed)]}
              onPress={() => {
                onClose();
                onTakePhoto();
              }}
              accessibilityRole="button"
              accessibilityLabel="Take photo">
              <View style={[styles.gridIcon, { backgroundColor: '#EEF2FF' }]}>
                <Camera size={22} color="#4F46E5" strokeWidth={2.1} />
              </View>
              <PartnerText style={styles.gridTitle}>Camera</PartnerText>
              <PartnerText style={styles.gridSub}>Capture now</PartnerText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.gridCard, getPressableFeedback(pressed)]}
              onPress={() => {
                onClose();
                onPickGallery();
              }}
              accessibilityRole="button"
              accessibilityLabel="Choose from gallery">
              <View style={[styles.gridIcon, { backgroundColor: '#FFF4E5' }]}>
                <ImageIcon size={22} color="#D97706" strokeWidth={2.1} />
              </View>
              <PartnerText style={styles.gridTitle}>Gallery</PartnerText>
              <PartnerText style={styles.gridSub}>Pick a photo</PartnerText>
            </Pressable>
          </View>

          {/* Secondary options as comfortable rows */}
          {onPickFile ? (
            <Pressable
              style={({ pressed }) => [styles.optionRow, getPressableFeedback(pressed)]}
              onPress={() => {
                onClose();
                onPickFile();
              }}>
              <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
                <FileText size={18} color="#059669" strokeWidth={2.1} />
              </View>
              <View style={styles.optionCopy}>
                <PartnerText style={styles.optionText}>Browse files</PartnerText>
                <PartnerText style={styles.optionSub}>PDF or document</PartnerText>
              </View>
            </Pressable>
          ) : null}

          {hasExistingPreview && onPreview ? (
            <Pressable
              style={({ pressed }) => [styles.optionRow, getPressableFeedback(pressed)]}
              onPress={() => {
                onClose();
                onPreview();
              }}>
              <View style={[styles.iconCircle, { backgroundColor: '#F5F3FF' }]}>
                <Eye size={18} color="#7C3AED" strokeWidth={2.1} />
              </View>
              <View style={styles.optionCopy}>
                <PartnerText style={styles.optionText}>Preview current</PartnerText>
                <PartnerText style={styles.optionSub}>See what's on file</PartnerText>
              </View>
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.cancelButton, getPressableFeedback(pressed)]}
            onPress={onClose}>
            <PartnerText style={styles.cancelButtonText}>Cancel</PartnerText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,18,25,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: driverColors.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E4E8',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: driverColors.ink,
    textAlign: 'center',
  },
  sheetSubtitle: {
    marginTop: 3,
    marginBottom: 2,
    fontSize: 12.5,
    fontWeight: '500',
    color: driverColors.grey,
    textAlign: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 10,
  },
  gridCard: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: driverColors.light,
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.05)',
  },
  gridIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: driverColors.ink,
  },
  gridSub: {
    fontSize: 11,
    fontWeight: '500',
    color: driverColors.grey,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: driverColors.light,
    marginBottom: 8,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCopy: {
    flex: 1,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '700',
    color: driverColors.ink,
  },
  optionSub: {
    fontSize: 11.5,
    fontWeight: '500',
    color: driverColors.grey,
    marginTop: 1,
  },
  cancelButton: {
    height: 46,
    marginTop: 6,
    borderRadius: 14,
    backgroundColor: driverColors.card,
    borderWidth: 1,
    borderColor: driverColors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: driverColors.grey,
  },
});
