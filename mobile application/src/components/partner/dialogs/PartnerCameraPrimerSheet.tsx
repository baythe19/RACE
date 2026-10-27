import { PartnerText } from '../PartnerText';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Camera, ShieldCheck } from 'lucide-react-native';
import { colors } from '../../../theme';

interface PartnerCameraPrimerSheetProps {
  visible: boolean;
  /** What the camera will be used for, e.g. "Upload Driving licence". */
  forLabel?: string;
  onAllow: () => void;
  onClose: () => void;
}

/**
 * Branded pre-permission sheet shown BEFORE the OS camera permission dialog.
 * The OS dialog itself cannot be styled (Android/iOS security model) — this
 * primer sets context so the system prompt feels intentional, and gives the
 * user a clean deny path in-app.
 */
export default function PartnerCameraPrimerSheet({
  visible,
  forLabel,
  onAllow,
  onClose,
}: PartnerCameraPrimerSheetProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Camera size={26} color={colors.primaryDark} strokeWidth={2.1} />
          </View>
          <PartnerText style={styles.title}>Allow camera access?</PartnerText>
          <PartnerText style={styles.body}>
            RACE Partner uses the camera only to photograph your documents
            {forLabel ? ` — ${forLabel}` : ''}. Photos are uploaded securely for
            verification and are never shared.
          </PartnerText>
          <View style={styles.privacyRow}>
            <ShieldCheck size={15} color="#059669" strokeWidth={2.2} />
            <PartnerText style={styles.privacyText}>Used only for document uploads</PartnerText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue to system camera permission"
            onPress={onAllow}
            style={({ pressed }) => [styles.allowButton, pressed && styles.pressed]}>
            <PartnerText style={styles.allowText}>Continue</PartnerText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.notNowButton, pressed && styles.pressed]}>
            <PartnerText style={styles.notNowText}>Not now</PartnerText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,18,25,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 14,
    alignItems: 'center',
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.dark,
    textAlign: 'center',
  },
  body: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: colors.grey,
    textAlign: 'center',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 16,
  },
  privacyText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#059669',
  },
  allowButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allowText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark,
  },
  notNowButton: {
    width: '100%',
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  notNowText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.grey,
  },
  pressed: {
    opacity: 0.85,
  },
});
