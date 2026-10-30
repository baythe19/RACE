import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, CheckCircle2, Info, LogIn, type LucideIcon } from 'lucide-react-native';

import { colors, typography } from '../../theme';

export type SosDialogVariant = 'info' | 'success' | 'error' | 'signIn';

export type SosAppDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  variant?: SosDialogVariant;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onClose: () => void;
};

const ICONS: Record<SosDialogVariant, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
  signIn: LogIn,
};

const ICON_BG: Record<SosDialogVariant, string> = {
  info: colors.goldLight,
  success: '#E8F8EE',
  error: '#FDECEC',
  signIn: '#FFF8E7',
};

const ICON_COLOR: Record<SosDialogVariant, string> = {
  info: colors.primaryDark,
  success: colors.success,
  error: colors.error,
  signIn: colors.primaryDark,
};

/** Branded SOS dialogs — not React Native `Alert.alert`. */
export default function SosAppDialog({
  visible,
  title,
  message,
  variant = 'info',
  primaryLabel = 'Got it',
  onPrimary,
  secondaryLabel,
  onSecondary,
  onClose,
}: SosAppDialogProps) {
  const Icon = ICONS[variant];

  const handlePrimary = () => {
    onPrimary?.();
    onClose();
  };

  const handleSecondary = () => {
    onSecondary?.();
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Close dialog">
        <Pressable style={styles.card} onPress={e => e.stopPropagation()} accessibilityViewIsModal>
          <View style={[styles.iconWrap, { backgroundColor: ICON_BG[variant] }]}>
            <Icon size={26} color={ICON_COLOR[variant]} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={handlePrimary}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}>
            <Text style={styles.primaryLabel}>{primaryLabel}</Text>
          </Pressable>
          {secondaryLabel ? (
            <Pressable
              accessibilityRole="button"
              onPress={handleSecondary}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
              <Text style={styles.secondaryLabel}>{secondaryLabel}</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.cardBg,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: typography.weights.extrabold,
    color: colors.dark,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.grey,
    textAlign: 'center',
    marginBottom: 18,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  secondaryBtn: {
    marginTop: 10,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    color: colors.grey,
  },
  pressed: {
    opacity: 0.88,
  },
});
