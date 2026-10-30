import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  Info,
  LogOut,
  ShieldQuestion,
  Trash2,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';

import { colors, typography } from '../../theme';

export type AppDialogTone = 'success' | 'info' | 'warning' | 'error' | 'danger' | 'confirm';

export interface AppDialogAction {
  label: string;
  onPress?: () => void;
  /** Destructive actions render red text / red solid button. */
  destructive?: boolean;
}

export interface AppDialogProps {
  visible: boolean;
  tone?: AppDialogTone;
  /** Optional lucide icon to override the tone default. */
  icon?: LucideIcon;
  title: string;
  message?: string;
  /** Primary action (bold). Defaults to a single "OK". */
  primaryAction?: AppDialogAction;
  /** Secondary action (left). Providing it turns the dialog into a confirm. */
  secondaryAction?: AppDialogAction;
  onClose: () => void;
}

const TONES: Record<
  AppDialogTone,
  {
    iconBg: string;
    iconColor: string;
    defaultIcon: LucideIcon;
  }
> = {
  success: { iconBg: '#E8F8EE', iconColor: colors.success, defaultIcon: CheckCircle2 },
  info: { iconBg: colors.goldLight, iconColor: colors.primaryDark, defaultIcon: Info },
  warning: { iconBg: '#FFF4E5', iconColor: '#D97706', defaultIcon: AlertTriangle },
  error: { iconBg: '#FDECEC', iconColor: colors.error, defaultIcon: XCircle },
  danger: { iconBg: '#FDECEC', iconColor: colors.error, defaultIcon: Trash2 },
  confirm: { iconBg: '#FFF4E5', iconColor: '#D97706', defaultIcon: ShieldQuestion },
};

export const AppDialogIcons = { Camera, Gallery: ImageIcon, Logout: LogOut };

/** Branded in-app dialog replacing native `Alert.alert` popups. */
export default function AppDialog({
  visible,
  tone = 'info',
  icon,
  title,
  message,
  primaryAction,
  secondaryAction,
  onClose,
}: AppDialogProps) {
  const toneStyle = TONES[tone] ?? TONES.info;
  const Icon = icon ?? toneStyle.defaultIcon;

  const primaryLabel = primaryAction?.label ?? 'OK';
  const onPrimary = () => {
    onClose();
    primaryAction?.onPress?.();
  };
  const onSecondary = () => {
    onClose();
    secondaryAction?.onPress?.();
  };

  const primaryDestructive = primaryAction?.destructive === true;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Close dialog">
        <Pressable
          style={styles.card}
          onPress={e => e.stopPropagation()}
          accessibilityViewIsModal>
          <View style={[styles.iconWrap, { backgroundColor: toneStyle.iconBg }]}>
            <Icon size={26} color={toneStyle.iconColor} strokeWidth={2.3} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actionsRow}>
            {secondaryAction ? (
              <Pressable
                accessibilityRole="button"
                onPress={onSecondary}
                style={({ pressed }) => [
                  styles.button,
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.secondaryLabel}>{secondaryAction.label}</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={onPrimary}
              style={({ pressed }) => [
                styles.button,
                primaryDestructive ? styles.destructiveButton : styles.primaryButton,
                !secondaryAction && styles.singleButton,
                pressed && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.primaryLabel,
                  primaryDestructive ? styles.destructiveLabel : null,
                ]}>
                {primaryLabel}
              </Text>
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
    backgroundColor: 'rgba(15,18,25,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 330,
    backgroundColor: colors.background,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17.5,
    fontWeight: typography.weights.extrabold,
    color: colors.dark,
    textAlign: 'center',
  },
  message: {
    marginTop: 7,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.grey,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 20,
  },
  button: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleButton: {
    flex: 1,
    alignSelf: 'stretch',
    width: '100%',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  destructiveButton: {
    backgroundColor: colors.error,
  },
  pressed: {
    opacity: 0.88,
  },
  primaryLabel: {
    fontSize: 14.5,
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  destructiveLabel: {
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryLabel: {
    fontSize: 14.5,
    fontWeight: typography.weights.bold,
    color: colors.grey,
  },
});
