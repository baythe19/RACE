import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

import { useScreenPx } from '../../hooks/useScreenPx';
import { colors, typography } from '../../theme';

type Props = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  headerRight?: ReactNode;
  showBack?: boolean;
};

export default function AppStackHeader({
  title,
  subtitle,
  onBack,
  headerRight,
  showBack = true,
}: Props) {
  const px = useScreenPx();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.pageBg }]}>
      <View style={[styles.row, { paddingHorizontal: px(20), minHeight: px(44), paddingBottom: subtitle ? px(2) : px(10) }]}>
        {showBack && onBack ? (
          <Pressable onPress={onBack} hitSlop={10} style={{ width: px(40), height: px(40), alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={px(22)} color={colors.dark} strokeWidth={2.4} />
          </Pressable>
        ) : (
          <View style={{ width: px(40) }} />
        )}
        {title ? (
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: px(18),
              fontWeight: typography.weights.extrabold,
              color: colors.dark,
              lineHeight: px(22),
            }}>
            {title}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {headerRight ? (
          <View style={{ minWidth: px(72), alignItems: 'flex-end' }}>{headerRight}</View>
        ) : (
          <View style={{ width: px(40) }} />
        )}
      </View>
      {subtitle ? (
        <Text
          style={{
            textAlign: 'center',
            fontSize: px(11),
            color: colors.grey,
            lineHeight: px(16),
            marginBottom: px(10),
            paddingHorizontal: px(20),
          }}>
          {subtitle}
        </Text>
      ) : null}
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
