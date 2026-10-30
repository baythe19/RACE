import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, Search } from 'lucide-react-native';

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
  /** When true, shows a search field (for long lists like Indian states). */
  searchable?: boolean;
  searchPlaceholder?: string;
}

export default function SelectOptionModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  searchable = false,
  searchPlaceholder = 'Search…',
}: SelectOptionModalProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {searchable ? (
            <View style={styles.searchWrap}>
              <Search size={16} color={colors.grey} strokeWidth={2.2} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor={colors.grey}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="words"
                clearButtonMode="while-editing"
              />
            </View>
          ) : null}
          <ScrollView style={searchable ? styles.scrollList : undefined} keyboardShouldPersistTaps="handled">
            <View style={styles.list}>
              {filtered.length === 0 ? (
                <Text style={styles.emptyHint}>No matches</Text>
              ) : null}
              {filtered.map(option => {
                const selected = option.value === selectedValue;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onSelect(option.value);
                      setQuery('');
                      onClose();
                    }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      selected && styles.optionSelected,
                      pressed && styles.optionPressed,
                    ]}>
                    <Text
                      style={[styles.optionLabel, selected && styles.optionLabelSelected]}
                      numberOfLines={2}>
                      {option.label}
                    </Text>
                    {selected ? <Check size={18} color={colors.primary} strokeWidth={2.6} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.optionPressed]}>
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
    maxHeight: '78%',
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    backgroundColor: colors.pageBg,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.dark,
    paddingVertical: 4,
  },
  scrollList: {
    maxHeight: 320,
  },
  list: {
    gap: 8,
  },
  emptyHint: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.grey,
    paddingVertical: 12,
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
    textAlign: 'left',
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
