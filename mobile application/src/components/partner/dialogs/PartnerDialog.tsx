import { PartnerText } from '../PartnerText';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  KeyRound,
  Link2,
  Trash2,
  UserPlus,
  XCircle,
} from 'lucide-react-native';
import { driverColors, getPressableFeedback } from '../../../theme/driverUi';

export type PartnerDialogTone = 'success' | 'info' | 'warning' | 'error' | 'confirm';

interface PartnerDialogAction {
  label: string;
  onPress: () => void;
  /** Destructive actions render in red. */
  destructive?: boolean;
}

export interface PartnerDialogProps {
  visible: boolean;
  tone?: PartnerDialogTone;
  /** Optional lucide icon to override the tone default. */
  icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  message?: string;
  /** Primary action (right / bold). Defaults to a single "OK". */
  primaryAction?: PartnerDialogAction;
  /** Secondary action (left). Providing it turns the dialog into a confirm. */
  secondaryAction?: PartnerDialogAction;
  onClose?: () => void;
}

const TONES: Record<
  PartnerDialogTone,
  { iconBg: string; iconColor: string; defaultIcon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }> }
> = {
  success: { iconBg: '#ECFDF5', iconColor: '#059669', defaultIcon: CheckCircle2 },
  info: { iconBg: '#EEF2FF', iconColor: '#4F46E5', defaultIcon: Info },
  warning: { iconBg: '#FFF4E5', iconColor: '#D97706', defaultIcon: AlertTriangle },
  error: { iconBg: '#FEF2F2', iconColor: '#DC2626', defaultIcon: XCircle },
  confirm: { iconBg: '#FFF4E5', iconColor: '#D97706', defaultIcon: Trash2 },
};

/** Modern styled in-app dialog replacing plain system Alert.alert popups. */
export default function PartnerDialog({
  visible,
  tone = 'info',
  icon,
  title,
  message,
  primaryAction,
  secondaryAction,
  onClose,
}: PartnerDialogProps) {
  const toneStyle = TONES[tone] ?? TONES.info;
  const IconComp = icon ?? toneStyle.defaultIcon;
  const close = () => {
    onClose?.();
  };
  const primaryLabel = primaryAction?.label ?? 'OK';
  const onPrimary = () => {
    onClose?.();
    primaryAction?.onPress();
  };
  const onSecondary = () => {
    onClose?.();
    secondaryAction?.onPress();
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
          <View style={[styles.iconCircle, { backgroundColor: toneStyle.iconBg }]}>
            <IconComp size={26} color={toneStyle.iconColor} strokeWidth={2.3} />
          </View>

          <PartnerText style={styles.title}>{title}</PartnerText>
          {message ? <PartnerText style={styles.message}>{message}</PartnerText> : null}

          <View style={styles.actionsRow}>
            {secondaryAction ? (
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.secondaryButton,
                  getPressableFeedback(pressed),
                ]}
                onPress={onSecondary}
                accessibilityRole="button">
                <PartnerText style={styles.secondaryLabel}>{secondaryAction.label}</PartnerText>
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.primaryButton,
                secondaryAction?.destructive
                  ? styles.primaryButtonPlain
                  : null,
                getPressableFeedback(pressed),
              ]}
              onPress={onPrimary}
              accessibilityRole="button">
              <PartnerText
                style={[
                  styles.primaryLabel,
                  secondaryAction?.destructive ? styles.destructiveLabel : null,
                ]}>
                {primaryLabel}
              </PartnerText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Ready-made presets for the common vendor-driver flows. */
export const PartnerDialogPresets = {
  driverAdded: (name: string, loginId: string): Partial<PartnerDialogProps> => ({
    tone: 'success',
    icon: UserPlus,
    title: 'Driver added!',
    message: `${name.trim()} can now sign in with Login ID "${loginId.trim()}". Share the password securely — documents stay pending until admin approves.`,
    primaryAction: { label: 'Great', onPress: () => {} },
  }),
  driverAddedPartial: (name: string, failed: string[]): Partial<PartnerDialogProps> => ({
    tone: 'warning',
    icon: UserPlus,
    title: 'Driver added — uploads pending',
    message: `${name.trim()} was added, but ${failed.join(', ')} could not be uploaded and can be retried later.`,
    primaryAction: { label: 'Got it', onPress: () => {} },
  }),
  uploadsIncomplete: (): Partial<PartnerDialogProps> => ({
    tone: 'warning',
    icon: AlertTriangle,
    title: 'Uploads incomplete',
    message: 'The driver account is saved. Retry the failed document uploads to finish.',
    primaryAction: { label: 'OK', onPress: () => {} },
  }),
  requiredUploadFailed: (labels: string[]): Partial<PartnerDialogProps> => ({
    tone: 'error',
    icon: AlertTriangle,
    title: 'Required upload failed',
    message: `${labels.join(', ')} could not be uploaded. Your driver is pending verification. Tap Retry uploads to finish.`,
    primaryAction: { label: 'OK', onPress: () => {} },
  }),
  vehicleLinked: (reg: string): Partial<PartnerDialogProps> => ({
    tone: 'success',
    icon: Link2,
    title: 'Vehicle linked',
    message: `Driver is now linked to ${reg}.`,
    primaryAction: { label: 'Done', onPress: () => {} },
  }),
  vehicleUnlinked: (name: string): Partial<PartnerDialogProps> => ({
    tone: 'info',
    icon: Link2,
    title: 'Vehicle unlinked',
    message: `${name} is no longer linked to a vehicle.`,
    primaryAction: { label: 'Done', onPress: () => {} },
  }),
  removeDriver: (name: string, onRemove: () => void): Partial<PartnerDialogProps> => ({
    tone: 'confirm',
    icon: Trash2,
    title: 'Remove driver?',
    message: `Unlink ${name} from your vendor team? This cannot be undone from the app.`,
    primaryAction: { label: 'Remove', onPress: onRemove },
    secondaryAction: { label: 'Cancel', onPress: () => {} },
  }),
  passwordUpdated: (name: string): Partial<PartnerDialogProps> => ({
    tone: 'success',
    icon: KeyRound,
    title: 'Password updated',
    message: `Share the new password securely with ${name}. They can sign in with the same Login ID.`,
    primaryAction: { label: 'Done', onPress: () => {} },
  }),
  passwordTooShort: (): Partial<PartnerDialogProps> => ({
    tone: 'warning',
    icon: KeyRound,
    title: 'Too short',
    message: 'Password must be at least 6 characters.',
    primaryAction: { label: 'OK', onPress: () => {} },
  }),
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,18,25,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 330,
    backgroundColor: driverColors.white,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: driverColors.ink,
    textAlign: 'center',
  },
  message: {
    marginTop: 7,
    fontSize: 13.5,
    lineHeight: 20,
    color: driverColors.grey,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 20,
  },
  button: {
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#F59E0B',
  },
  primaryButtonPlain: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: driverColors.hairline,
  },
  primaryLabel: {
    fontSize: 14.5,
    fontWeight: '700',
    color: driverColors.white,
  },
  destructiveLabel: {
    color: '#DC2626',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: driverColors.light,
    borderWidth: 1,
    borderColor: driverColors.hairline,
  },
  secondaryLabel: {
    fontSize: 14.5,
    fontWeight: '700',
    color: driverColors.grey,
  },
});
