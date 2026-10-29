import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';

import type { BookingTheme } from './bookingTheme';
import { colors, typography } from '../../theme';

const PICKUP_GREEN = '#10B981';
const PICKUP_GREEN_LIGHT = '#ECFDF5';

type Props = {
  label?: string;
  value: string;
  placeholder?: string;
  onPress: () => void;
  t: BookingTheme;
};

/** Roadside / single-point help location — clear pin + tap-to-edit. */
export default function SinglePickupLocationCard({
  label = 'You are here',
  value,
  placeholder = 'Search where you need help',
  onPress,
  t,
}: Props) {
  const hasValue = value.trim().length > 0 && value !== placeholder;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hasValue ? `${label}: ${value}` : placeholder}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: t.px(64),
          borderRadius: t.cardRadius,
          borderWidth: 1.5,
          borderColor: hasValue ? PICKUP_GREEN : colors.border,
          backgroundColor: colors.background,
          paddingHorizontal: t.px(14),
          paddingVertical: t.px(12),
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <View
        style={{
          width: t.px(40),
          height: t.px(40),
          borderRadius: t.px(20),
          backgroundColor: PICKUP_GREEN_LIGHT,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <MapPin size={t.px(20)} color={PICKUP_GREEN} strokeWidth={2.4} fill={PICKUP_GREEN} />
      </View>
      <View style={{ flex: 1, marginLeft: t.px(12), minWidth: 0 }}>
        <Text
          style={{
            fontSize: t.caption,
            fontWeight: typography.weights.bold,
            color: hasValue ? PICKUP_GREEN : colors.grey,
            marginBottom: t.px(3),
            letterSpacing: 0.2,
          }}>
          {label}
        </Text>
        <Text
          style={{
            fontSize: t.bodyLarge,
            fontWeight: typography.weights.bold,
            color: hasValue ? colors.dark : colors.grey,
            lineHeight: t.px(22),
          }}
          numberOfLines={2}>
          {hasValue ? value : placeholder}
        </Text>
      </View>
    </Pressable>
  );
}
