import { PartnerText } from '../PartnerText';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';

interface PartnerSuccessDialogProps {
  visible: boolean;
  title?: string;
  message?: string;
  buttonLabel?: string;
  onDismiss: () => void;
}

export default function PartnerSuccessDialog({
  visible,
  title = 'Updated successfully!',
  message = 'Your changes have been saved.',
  buttonLabel = 'Done',
  onDismiss,
}: PartnerSuccessDialogProps) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.dialogCard} onPress={e => e.stopPropagation()}>
          <View style={styles.iconCircle}>
            <Check size={30} color={driverColors.green} strokeWidth={2.8} />
          </View>

          <PartnerText style={styles.title}>{title}</PartnerText>
          <PartnerText style={styles.subtitle}>{message}</PartnerText>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              getPressableFeedback(pressed),
            ]}
            onPress={onDismiss}>
            <PartnerText style={styles.primaryButtonText}>{buttonLabel}</PartnerText>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: driverColors.white,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: driverColors.greenPill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: driverColors.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: driverColors.grey,
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    width: '100%',
    height: 48,
    borderRadius: driverRadius.button,
    backgroundColor: driverColors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: driverColors.white,
  },
});
