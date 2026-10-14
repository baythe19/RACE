import { PartnerText } from '../partner/PartnerText';
import React from 'react';
import { Pressable, View } from 'react-native';

import { colors, typography } from '../../theme';

type AuthMethod = 'sms' | 'email';

type Props = {
  value: AuthMethod;
  onChange: (value: AuthMethod) => void;
  px: (n: number) => number;
};

export default function AuthMethodTabs({ value, onChange, px }: Props) {
  const tabStyle = (active: boolean) => ({
    flex: 1,
    height: px(42),
    borderRadius: px(10),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: active ? colors.primary : 'transparent',
  });

  const labelStyle = (active: boolean) => ({
    fontSize: px(14),
    fontWeight: typography.weights.bold,
    color: active ? colors.background : colors.grey,
  });

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.lightGrey,
        borderRadius: px(12),
        padding: px(4),
        marginBottom: px(20),
      }}>
      <Pressable style={tabStyle(value === 'sms')} onPress={() => onChange('sms')}>
        <PartnerText style={labelStyle(value === 'sms')}>Phone</PartnerText>
      </Pressable>
      <Pressable style={tabStyle(value === 'email')} onPress={() => onChange('email')}>
        <PartnerText style={labelStyle(value === 'email')}>Email</PartnerText>
      </Pressable>
    </View>
  );
}
