import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { colors, typography } from '../../theme';

export interface AppActionSheetOption {
  key: string;
  label: string;
  /** Small description under the label. */
  hint?: string;
  Icon?: LucideIcon;
  danger?: boolean;
  onPress: () => void;
}

export interface AppActionSheetProps {
  visible: boolean;
  title: string;
  message?: string;
  options: AppActionSheetOption[];
  /** Standard trailing cancel row. */
  onCancel: () => void;
  cancelLabel?: string;
}

/** Bottom action sheet replacing native `Alert.alert` option menus. */
export default function AppActionSheet({
  visible,
  title,
  message,
  options,
  onCancel,
  cancelLabel = 'Cancel',
}: AppActionSheetProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onCancel} accessibilityLabel="Close sheet">
        <Pressable
          style={styles.sheet}
          onPress={e => e.stopPropagation()}
          accessibilityViewIsModal>
          <View style={styles.grabber} />
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.optionsGap}>
            {options.map(option => {
              const Icon = option.Icon;
              return (
                <Pressable
                  key={option.key}
                  accessibilityRole="button"
                  onPress={option.onPress}
                  style={({ pressed }) => [
                    styles.option,
                    option.danger ? styles.optionDanger : null,
                    pressed && styles.pressed,
                  ]}>
                  {Icon ? (
                    <View
                      style={[
                        styles.iconWrap,
                        option.danger ? styles.iconWrapDanger : null,
                      ]}>
                      <Icon
                        size={18}
                        color={option.danger ? colors.error : colors.primaryDark}
                        strokeWidth={2.2}
                      />
                    </View>
                  ) : null}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[
                        styles.optionLabel,
                        option.danger ? styles.optionLabelDanger : null,
                      ]}>
                      {option.label}
                    </Text>
                    {option.hint ? (
                      <Text style={styles.optionHint}>{option.hint}</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}>
            <Text style={styles.cancelLabel}>{cancelLabel}</Text>
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
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 26,
    borderWidth: 1,
    borderColor: colors.border,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  title: {
    fontSize: 16.5,
    fontWeight: typography.weights.extrabold,
    color: colors.dark,
    textAlign: 'center',
  },
  message: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: colors.grey,
    textAlign: 'center',
  },
  optionsGap: {
    marginTop: 16,
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBg,
    paddingHorizontal: 14,
  },
  optionDanger: {
    borderColor: 'rgba(220,38,38,0.35)',
    backgroundColor: '#FEF5F5',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDanger: {
    backgroundColor: '#FDECEC',
  },
  optionLabel: {
    fontSize: 14.5,
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  optionLabelDanger: {
    color: colors.error,
  },
  optionHint: {
    marginTop: 1,
    fontSize: 12,
    color: colors.grey,
    lineHeight: 17,
  },
  cancelBtn: {
    marginTop: 12,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelLabel: {
    fontSize: 14.5,
    fontWeight: typography.weights.bold,
    color: colors.grey,
  },
  pressed: {
    opacity: 0.88,
  },
});
