import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Globe } from 'lucide-react-native';
import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';

interface PartnerLanguageSheetProps {
  visible: boolean;
  selectedLanguage: string;
  onSelect: (lang: string) => void;
  onClose: () => void;
}

const LANGUAGES = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'hi', label: 'Hindi', native: 'हिंदी' },
  { id: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ' },
];

export default function PartnerLanguageSheet({
  visible,
  selectedLanguage,
  onSelect,
  onClose,
}: PartnerLanguageSheetProps) {
  const [current, setCurrent] = useState(selectedLanguage || 'en');

  const handleDone = () => {
    onSelect(current);
    onClose();
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.handleBar} />
          
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Globe size={20} color={driverColors.amber} strokeWidth={2.2} />
            </View>
            <Text style={styles.title}>Select Language</Text>
          </View>

          <View style={styles.optionsList}>
            {LANGUAGES.map(lang => {
              const isSelected = current === lang.id;
              return (
                <Pressable
                  key={lang.id}
                  style={({ pressed }) => [
                    styles.optionRow,
                    isSelected && styles.optionRowActive,
                    getPressableFeedback(pressed),
                  ]}
                  onPress={() => setCurrent(lang.id)}>
                  <View style={styles.labelCol}>
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelActive,
                      ]}>
                      {lang.native}
                    </Text>
                    <Text style={styles.optionSub}>{lang.label}</Text>
                  </View>

                  <View
                    style={[
                      styles.radioOuter,
                      isSelected && styles.radioOuterActive,
                    ]}>
                    {isSelected ? <View style={styles.radioInner} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.doneButton,
              getPressableFeedback(pressed),
            ]}
            onPress={handleDone}>
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: driverColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E4E8',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: driverColors.amberTileSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: driverColors.ink,
  },
  optionsList: {
    gap: 10,
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: driverRadius.innerCard,
    borderWidth: 1,
    borderColor: driverColors.hairline,
    backgroundColor: driverColors.card,
  },
  optionRowActive: {
    borderColor: driverColors.amber,
    backgroundColor: '#FFFDF5',
  },
  labelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: driverColors.ink,
  },
  optionLabelActive: {
    color: driverColors.ink,
  },
  optionSub: {
    fontSize: 13,
    color: driverColors.grey,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D0D4DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: driverColors.amber,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: driverColors.amber,
  },
  doneButton: {
    height: 48,
    borderRadius: driverRadius.button,
    backgroundColor: driverColors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: driverColors.white,
  },
});
