import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackHeaderLeftProps } from '@react-navigation/native-stack';

import { colors } from '../../theme';

/**
 * Shared stack back arrow — plain chevron-style arrow, no outline button box,
 * matching the reference boards (bare arrow on the page background).
 */
export default function StackBackButton({ canGoBack }: NativeStackHeaderLeftProps) {
  const navigation = useNavigation();
  const allowBack = canGoBack || navigation.canGoBack();

  if (!allowBack) {
    return null;
  }

  return (
    <Pressable
      onPress={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }}
      hitSlop={12}
      style={styles.hit}
      accessibilityRole="button"
      accessibilityLabel="Go back">
      <ArrowLeft size={21} color={colors.dark} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    marginLeft: 2,
    paddingLeft: 8,
    paddingRight: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'flex-start',
    // No background, border, or rounded box — bare arrow like the boards.
  },
});
