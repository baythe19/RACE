import React from 'react';
import { Text, View } from 'react-native';

import type { BookingTheme } from './bookingTheme';
import { colors, typography } from '../../theme';

type Props = {
  title: string;
  hint: string;
  t: BookingTheme;
  topGap?: number;
};

/** Compact two-line section label (form-style, matches towing wizard). */
export default function FormSectionLabel({ title, hint, t, topGap = 0 }: Props) {
  return (
    <View style={{ marginTop: t.px(topGap), marginBottom: t.px(6) }}>
      <Text
        style={{
          fontSize: t.px(13),
          fontWeight: typography.weights.extrabold,
          color: colors.dark,
          lineHeight: t.px(17),
        }}>
        {title}
      </Text>
      <Text
        style={{
          fontSize: t.px(12),
          color: colors.grey,
          marginTop: t.px(3),
          lineHeight: t.px(16),
        }}>
        {hint}
      </Text>
    </View>
  );
}
