import { PartnerText } from '../partner/PartnerText';
import React from 'react';
import { View } from 'react-native';

import GoogleIcon from '../auth/GoogleIcon';
import { typography } from '../../theme';

type Props = {
  size?: number;
};

export default function GooglePayIcon({ size = 32 }: Props) {
  const gSize = Math.round(size * 0.72);
  const paySize = Math.round(size * 0.42);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Math.round(size * 0.06) }}>
      <GoogleIcon size={gSize} />
      <PartnerText
        style={{
          fontSize: paySize,
          fontWeight: typography.weights.medium,
          color: '#5F6368',
          letterSpacing: -0.3,
        }}>
        Pay
      </PartnerText>
    </View>
  );
}
