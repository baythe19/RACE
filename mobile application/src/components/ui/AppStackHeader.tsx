import { PartnerText } from '../partner/PartnerText';
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
    <View style={styles.wrap}>
      <View style={[styles.row, { paddingHorizontal: px(20), minHeight: px(44) }]}>
        {showBack && onBack ? (
          <Pressable onPress={onBack} hitSlop={10} style={{ width: px(32) }}>
            <ArrowLeft size={px(22)} color={colors.dark} strokeWidth={2.5} />
          </Pressable>
        ) : (
          <View style={{ width: px(32) }} />
        )}
        {title ? (
          <PartnerText
            numberOfLines={1}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: px(17),
              fontWeight: typography.weights.bold,
              color: colors.dark,
            }}>
            {title}
          </PartnerText>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {headerRight ? (
          <View style={{ minWidth: px(72), alignItems: 'flex-end' }}>{headerRight}</View>
        ) : (
          <View style={{ width: px(32) }} />
        )}
      </View>
      {subtitle ? (
        <PartnerText
          style={{
            textAlign: 'center',
            fontSize: px(12),
            color: colors.grey,
            marginBottom: px(12),
            paddingHorizontal: px(20),
          }}>
          {subtitle}
        </PartnerText>
      ) : (
        <View style={{ height: px(12) }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
