import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { images } from '../../assets';

interface PartnerHeaderLogoProps {
  width?: number;
  style?: StyleProp<ViewStyle>;
  showPartnerText?: boolean;
}

export default function PartnerHeaderLogo({
  width = 114,
  style,
  showPartnerText = false,
}: PartnerHeaderLogoProps) {
  // Ratio for splashHeader mark (484w x 300h)
  const logoHeight = Math.round(width * (108 / 180));

  return (
    <View style={[styles.container, style]}>
      <Image
        source={images.splashHeader}
        style={{ width, height: logoHeight }}
        resizeMode="contain"
        accessibilityLabel="RACE"
      />
      {showPartnerText ? (
        <Text style={[styles.partnerText, { fontSize: Math.max(8, Math.round(width * 0.075)) }]}>
          PARTNER
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerText: {
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 2.4,
    marginTop: -3,
    textAlign: 'center',
  },
});
