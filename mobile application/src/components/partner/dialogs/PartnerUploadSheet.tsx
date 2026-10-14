import { PartnerText } from '../PartnerText';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Camera, Image as ImageIcon, Eye } from 'lucide-react-native';
import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';

interface PartnerUploadSheetProps {
  visible: boolean;
  onTakePhoto: () => void;
  onPickGallery: () => void;
  onPreview?: () => void;
  onClose: () => void;
  hasExistingPreview?: boolean;
}

export default function PartnerUploadSheet({
  visible,
  onTakePhoto,
  onPickGallery,
  onPreview,
  onClose,
  hasExistingPreview = false,
}: PartnerUploadSheetProps) {
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.handleBar} />
          
          <PartnerText style={styles.sheetTitle}>Upload Document</PartnerText>

          <View style={styles.optionsList}>
            <Pressable
              style={({ pressed }) => [
                styles.optionRow,
                getPressableFeedback(pressed),
              ]}
              onPress={() => {
                onClose();
                onTakePhoto();
              }}>
              <View style={[styles.iconCircle, { backgroundColor: '#F0F9FF' }]}>
                <Camera size={20} color="#0284C7" strokeWidth={2.2} />
              </View>
              <PartnerText style={styles.optionText}>Take Photo</PartnerText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.optionRow,
                getPressableFeedback(pressed),
              ]}
              onPress={() => {
                onClose();
                onPickGallery();
              }}>
              <View style={[styles.iconCircle, { backgroundColor: '#F5F3FF' }]}>
                <ImageIcon size={20} color="#7C3AED" strokeWidth={2.2} />
              </View>
              <PartnerText style={styles.optionText}>Choose from Gallery</PartnerText>
            </Pressable>

            {hasExistingPreview && onPreview ? (
              <Pressable
                style={({ pressed }) => [
                  styles.optionRow,
                  getPressableFeedback(pressed),
                ]}
                onPress={() => {
                  onClose();
                  onPreview();
                }}>
                <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
                  <Eye size={20} color="#16A34A" strokeWidth={2.2} />
                </View>
                <PartnerText style={styles.optionText}>Preview Document</PartnerText>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              getPressableFeedback(pressed),
            ]}
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: driverColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E4E8',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: driverColors.ink,
    marginBottom: 16,
    textAlign: 'center',
  },
  optionsList: {
    gap: 8,
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: driverRadius.innerCard,
    backgroundColor: driverColors.light,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: driverColors.ink,
  },
  cancelButton: {
    height: 48,
    borderRadius: driverRadius.button,
    backgroundColor: driverColors.card,
    borderWidth: 1,
    borderColor: driverColors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: driverColors.grey,
  },
});
