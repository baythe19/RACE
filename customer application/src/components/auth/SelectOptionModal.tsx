import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { colors, typography } from '../../theme';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectOptionModalProps {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

/**
 * Centered option-picker dialog used for Gender, Relationship and similar
 * short lists. Replaces alert-based pickers — keeps keyboard closed and gives
 * a real dropdown feel consistent with the DOB calendar dialog.
 */
export default function SelectOptionModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: SelectOptionModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.list}>
            {options.map(option => {
              const selected = option.value === selectedValue;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.optionRow,
                    selected && styles.optionSelected,
                    pressed && styles.optionPressed,
                  ]}>
                  <Text
                    style={[
                      styles.optionLabel,
                      selected && styles.optionLabelSelected,
                    ]}>
                    {option.label}
                  </Text>
                  {selected ? (
                    <Check size={18} color={colors.primary} strokeWidth={2.6} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.cancelBtn, pressed && styles.optionPressed]}>
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: typography.weights.extrabold,
    color: colors.dark,
    textAlign: 'center',
    marginBottom: 14,
  },
  list: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: '#FEF3D8',
    borderColor: colors.primary,
  },
  optionPressed: {
    opacity: 0.75,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    color: colors.dark,
    textAlign: 'center',
    flex: 1,
  },
  optionLabelSelected: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  cancelBtn: {
    marginTop: 10,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    color: colors.grey,
  },
});
