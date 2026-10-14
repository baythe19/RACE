import { PartnerText } from '../PartnerText';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { MapPin, Camera, Image as ImageIcon, FileText } from 'lucide-react-native';
import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';

export type PermissionType = 'location' | 'camera' | 'photos' | 'documents';

interface PartnerPermissionDialogProps {
  visible: boolean;
  type?: PermissionType;
  title?: string;
  subtitle?: string;
  allowText?: string;
  denyText?: string;
  onAllow: () => void;
  onDeny: () => void;
}

const DEFAULT_CONFIGS: Record<
  PermissionType,
  {
    title: string;
    subtitle: string;
    icon: typeof MapPin;
    iconColor: string;
    iconBg: string;
  }
> = {
  location: {
    title: 'Allow location access?',
    subtitle:
      'We need your location to show nearby jobs, route you accurately to customers, and provide live navigation.',
    icon: MapPin,
    iconColor: driverColors.red,
    iconBg: driverColors.redPill,
  },
  camera: {
    title: 'Allow camera access?',
    subtitle:
      'We need access to your camera to capture your profile picture and vehicle inspection photos.',
    icon: Camera,
    iconColor: '#2563EB',
    iconBg: '#EFF6FF',
  },
  photos: {
    title: 'Allow photo library access?',
    subtitle:
      'We need access to your photos to upload profile images, vehicle photos, and verification documents.',
    icon: ImageIcon,
    iconColor: '#7C3AED',
    iconBg: '#F5F3FF',
  },
  documents: {
    title: 'Allow files & documents access?',
    subtitle:
      'We need access to your device storage to upload RC copies, driving licence, and insurance papers.',
    icon: FileText,
    iconColor: '#D97706',
    iconBg: '#FFFBEB',
  },
};

export default function PartnerPermissionDialog({
  visible,
  type = 'location',
  title,
  subtitle,
  allowText = 'Allow',
  denyText = 'Not now',
  onAllow,
  onDeny,
}: PartnerPermissionDialogProps) {
  const config = DEFAULT_CONFIGS[type];
  const IconComponent = config.icon;
  const displayTitle = title || config.title;
  const displaySubtitle = subtitle || config.subtitle;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onDeny}>
      <Pressable style={styles.overlay} onPress={onDeny}>
        <Pressable style={styles.dialogCard} onPress={e => e.stopPropagation()}>
          <View style={[styles.iconCircle, { backgroundColor: config.iconBg }]}>
            <IconComponent size={30} color={config.iconColor} strokeWidth={2.4} />
          </View>

          <PartnerText style={styles.title}>{displayTitle}</PartnerText>
          <PartnerText style={styles.subtitle}>{displaySubtitle}</PartnerText>

          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                getPressableFeedback(pressed),
              ]}
              onPress={onDeny}>
              <PartnerText style={styles.secondaryButtonText}>{denyText}</PartnerText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                getPressableFeedback(pressed),
              ]}
              onPress={onAllow}>
              <PartnerText style={styles.primaryButtonText}>{allowText}</PartnerText>
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
    fontSize: 14,
    fontWeight: '700',
    color: driverColors.ink,
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
    fontSize: 14,
    fontWeight: '800',
    color: driverColors.ink,
  },
});
