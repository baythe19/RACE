import { PartnerText } from './PartnerText';
import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePartnerSelectStore } from '../../store/partnerSelectStore';
import { colors, radius, spacing, typography } from '../../theme';

export default function PartnerSelectSheet() {
  const insets = useSafeAreaInsets();
  const { visible, title, options, selectedValue, close, select } = usePartnerSelectStore();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityRole="button" accessibilityLabel="Close" />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <PartnerText style={styles.title}>{title}</PartnerText>
            <Pressable
              onPress={close}
              hitSlop={10}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Close">
              <X size={20} color={colors.grey} strokeWidth={2.5} />
            </Pressable>
          </View>

          <FlatList
            data={options}
            keyExtractor={(item) => item}
            showsVerticalScrollIndicator={false}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const selected = item === selectedValue;

              return (
                <Pressable
                  onPress={() => select(item)}
                  style={({ pressed }) => [
                    styles.option,
                    selected && styles.optionSelected,
                    pressed && styles.optionPressed,
                  ]}>
                  <PartnerText style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {item}
                  </PartnerText>
                  {selected ? <Check size={20} color={colors.primary} strokeWidth={2.5} /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(26, 26, 26, 0.45)',
  },
  sheet: {
    maxHeight: '72%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    flex: 1,
    color: colors.dark,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    paddingRight: spacing.md,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.lightGrey,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionSelected: {
    backgroundColor: colors.goldLight,
  },
  optionPressed: {
    backgroundColor: colors.lightGrey,
  },
  optionText: {
    flex: 1,
    color: colors.dark,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    paddingRight: spacing.md,
  },
  optionTextSelected: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  pressed: {
    opacity: 0.9,
  },
});
