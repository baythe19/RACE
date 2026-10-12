import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../../theme';

interface AuthToastProps {
  message: string;
  type?: 'error' | 'success' | 'info';
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  autoDismissMs?: number;
  position?: 'top' | 'inline';
}

export default function AuthToast({
  message,
  type = 'error',
  actionLabel,
  onAction,
  onDismiss,
  autoDismissMs = 6000,
  position = 'top',
}: AuthToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (message) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 75,
          friction: 11,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      if (autoDismissMs > 0 && onDismiss) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, autoDismissMs);
        return () => clearTimeout(timer);
      }
    } else {
      handleDismiss();
    }
  }, [message]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  if (!message) {
    return null;
  }

  const isError = type === 'error';
  const isSuccess = type === 'success';

  const iconColor = isError ? colors.accentRed : isSuccess ? colors.success : colors.primary;

  const content = (
    <View
      style={[
        styles.toastCard,
        isError ? styles.errorCard : isSuccess ? styles.successCard : styles.infoCard,
      ]}>
      <View style={styles.iconWrap}>
        {isError ? (
          <AlertCircle size={20} color={iconColor} strokeWidth={2.4} />
        ) : isSuccess ? (
          <CheckCircle2 size={20} color={iconColor} strokeWidth={2.4} />
        ) : (
          <Info size={20} color={iconColor} strokeWidth={2.4} />
        )}
      </View>

      <View style={styles.messageWrap}>
        <Text
          style={[
            styles.messageText,
            isError ? styles.errorText : isSuccess ? styles.successText : styles.infoText,
          ]}
          numberOfLines={2}>
          {message}
        </Text>
      </View>

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          accessibilityRole="button">
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}

      {onDismiss ? (
        <Pressable
          onPress={handleDismiss}
          hitSlop={10}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification">
          <X size={16} color={colors.grey} strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </View>
  );

  if (position === 'inline') {
    return (
      <View style={styles.inlineWrap}>
        {content}
      </View>
    );
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.topContainer,
        {
          top: Math.max(insets.top, 14) + spacing.xs,
          transform: [{ translateY }],
          opacity,
        },
      ]}>
      {content}
    </Animated.View>
  );
}

export function AuthLoadingOverlay({
  visible,
  label = 'Please wait...',
}: {
  visible: boolean;
  label?: string;
}) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.overlayText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topContainer: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
    elevation: 10,
    alignItems: 'center',
  },
  inlineWrap: {
    width: '100%',
    marginBottom: spacing.md,
  },
  toastCard: {
    width: '100%',
    maxWidth: 440,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1.5,
  },
  errorCard: {
    borderColor: 'rgba(231, 0, 62, 0.4)',
    backgroundColor: '#FFF7F8',
  },
  successCard: {
    borderColor: 'rgba(14, 160, 18, 0.4)',
    backgroundColor: '#F4FBF4',
  },
  infoCard: {
    borderColor: 'rgba(243, 162, 0, 0.4)',
    backgroundColor: '#FFFDF5',
  },
  iconWrap: {
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageWrap: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  messageText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    lineHeight: typography.lineHeights.normal,
  },
  errorText: {
    color: colors.accentRed,
  },
  successText: {
    color: colors.success,
  },
  infoText: {
    color: colors.dark,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    marginLeft: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    color: colors.dark,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  closeButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  overlayText: {
    marginTop: spacing.md,
    color: colors.textLight,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
});

