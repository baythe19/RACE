import { PartnerText } from '../PartnerText';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';

interface PartnerLogoutDialogProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function PartnerLogoutDialog({
  visible,
  onCancel,
  onConfirm,
  isLoading = false,
}: PartnerLogoutDialogProps) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.dialogCard} onPress={e => e.stopPropagation()}>
          <View style={styles.iconCircle}>
            <LogOut size={26} color={driverColors.red} strokeWidth={2.2} />
          </View>

          <PartnerText style={styles.title}>Log out?</PartnerText>
          <PartnerText style={styles.subtitle}>
            You will be signed out from this device. Are you sure you want to proceed?
          </PartnerText>

          <View style={styles.buttonGroup}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                getPressableFeedback(pressed),
                isLoading && styles.disabledButton,
              ]}
              disabled={isLoading}
              onPress={onConfirm}>
              <PartnerText style={styles.primaryButtonText}>
                {isLoading ? 'Logging out...' : 'Log out'}
              </PartnerText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                getPressableFeedback(pressed),
              ]}
              disabled={isLoading}
              onPress={onCancel}>
              <PartnerText style={styles.secondaryButtonText}>Cancel</PartnerText>
            </Pressable>
          </View>
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: driverColors.redPill,
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
  buttonGroup: {
    width: '100%',
    gap: 10,
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
  secondaryButton: {
    width: '100%',
    height: 44,
    borderRadius: driverRadius.button,
    backgroundColor: driverColors.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: driverColors.inkSoft,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
