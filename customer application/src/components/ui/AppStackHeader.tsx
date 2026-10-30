import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

import { useScreenPx } from '../../hooks/useScreenPx';
import { colors, typography } from '../../theme';

type Props = {
  title?: string;
  subtitle?: string;
  subtitleNumberOfLines?: number;
  onBack?: () => void;
  headerRight?: ReactNode;
  showBack?: boolean;
};

/**
 * Stack header used across Profile sub-screens (Personal Information,
 * My Vehicles, …). Styled to match the tab root headers (Bookings/Home):
 * same 18px extrabold title weight, 11px grey subtitle, left-aligned copy —
 * so moving between a tab page and a stack page feels like one system.
 */
export default function AppStackHeader({
  title,
  subtitle,
  subtitleNumberOfLines = 2,
  onBack,
  headerRight,
  showBack = true,
}: Props) {
  const px = useScreenPx();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.pageBg }]}>
      <View style={[styles.row, { paddingHorizontal: px(20), minHeight: px(52), paddingVertical: px(8) }]}>
        {showBack && onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            style={{
              width: px(40),
              height: px(40),
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: px(6),
            }}>
            <ArrowLeft size={px(22)} color={colors.dark} strokeWidth={2.4} />
          </Pressable>
        ) : (
          <View style={{ width: px(40) }} />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          {title ? (
            <Text
              numberOfLines={1}
              style={{
                fontSize: px(18),
                fontWeight: typography.weights.extrabold,
                color: colors.dark,
                lineHeight: px(22),
                letterSpacing: -0.3,
                textAlign: 'left',
              }}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text
              style={{
                marginTop: px(2),
                fontSize: px(11),
                color: colors.grey,
                lineHeight: px(15),
                textAlign: 'left',
              }}
              numberOfLines={subtitleNumberOfLines}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {headerRight ? (
          <View style={{ marginLeft: px(10), alignItems: 'flex-end' }}>{headerRight}</View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
