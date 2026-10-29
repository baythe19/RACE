import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { BookingTheme } from './bookingTheme';
import { colors, typography } from '../../theme';

const PICKUP_GREEN = '#10B981';

type Props = {
  label?: string;
  value: string;
  placeholder?: string;
  onPress: () => void;
  t: BookingTheme;
};

/** One-row pickup field — same pattern as towing pickup & drop card (pickup only). */
export default function SinglePickupLocationCard({
  label = 'Pickup',
  value,
  placeholder = 'Enter pickup location',
  onPress,
  t,
}: Props) {
  const hasValue = value.trim().length > 0 && value !== placeholder;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hasValue ? `${label} ${value}` : placeholder}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: t.px(56),
          borderRadius: t.cardRadius,
          borderWidth: 1,
          borderColor: hasValue ? PICKUP_GREEN : colors.border,
          backgroundColor: colors.background,
          paddingHorizontal: t.px(14),
          paddingVertical: t.px(10),
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <View
        style={{
          width: t.px(12),
          height: t.px(12),
          borderRadius: t.px(6),
          backgroundColor: PICKUP_GREEN,
          borderWidth: 2,
          borderColor: '#D1FAE5',
        }}
      />
      <View style={{ flex: 1, marginLeft: t.px(12), minWidth: 0 }}>
        <Text
          style={{
            fontSize: t.px(11),
            fontWeight: typography.weights.semibold,
            color: colors.grey,
            marginBottom: t.px(2),
          }}>
          {label}
        </Text>
        <Text
          style={{
            fontSize: t.body,
            fontWeight: typography.weights.semibold,
            color: hasValue ? colors.dark : colors.grey,
            lineHeight: t.px(20),
          }}
          numberOfLines={2}>
          {hasValue ? value : placeholder}
        </Text>
      </View>
    </Pressable>
  );
}
