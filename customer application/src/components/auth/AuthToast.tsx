import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';

interface AuthToastProps {
  message: string;
  type?: 'error' | 'success';
}

export default function AuthToast({ message, type = 'error' }: AuthToastProps) {
  if (!message) {
    return null;
  }

  const isError = type === 'error';

  return (
    <View style={[styles.wrap, isError ? styles.error : styles.success]}>
      <Text style={[styles.text, isError ? styles.errorText : styles.successText]}>
        {message}
      </Text>
    </View>
  );
}

export function AuthLoadingOverlay({ visible, label = 'Please wait...' }: { visible: boolean; label?: string }) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.overlayCard}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.overlayText}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  error: {
    backgroundColor: 'rgba(231, 0, 62, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(231, 0, 62, 0.25)',
  },
  success: {
    backgroundColor: 'rgba(14, 160, 18, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(14, 160, 18, 0.25)',
  },
  text: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textAlign: 'left',
    lineHeight: 20,
  },
  errorText: {
    color: colors.accentRed,
  },
  successText: {
    color: colors.success,
  },
  overlayCard: {
    minWidth: 220,
    maxWidth: 280,
    paddingVertical: 28,
    paddingHorizontal: 22,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(23, 25, 30, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  overlayText: {
    marginTop: spacing.md,
    color: colors.dark,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
});
