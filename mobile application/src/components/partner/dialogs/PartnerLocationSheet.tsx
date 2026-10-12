import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MapPin } from 'lucide-react-native';
import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';

interface PartnerLocationSheetProps {
  visible: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

export default function PartnerLocationSheet({
  visible,
  onAllow,
  onDeny,
}: PartnerLocationSheetProps) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onDeny}>
      <Pressable style={styles.overlay} onPress={onDeny}>
        <Pressable style={styles.dialogCard} onPress={e => e.stopPropagation()}>
          <View style={styles.iconCircle}>
            <MapPin size={30} color={driverColors.red} strokeWidth={2.4} />
          </View>

          <Text style={styles.title}>Allow location access?</Text>
          <Text style={styles.subtitle}>
            We need your location to show nearby jobs, route you accurately to customers, and provide live navigation.
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                getPressableFeedback(pressed),
              ]}
              onPress={onDeny}>
              <Text style={styles.secondaryButtonText}>Not now</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                getPressableFeedback(pressed),
              ]}
              onPress={onAllow}>
              <Text style={styles.primaryButtonText}>Allow</Text>
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
    width: 64,
    height: 64,
    borderRadius: 32,
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
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
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
  primaryButton: {
    flex: 1,
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
