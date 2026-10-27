import { PartnerText } from './PartnerText';
import React from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { images } from '../../assets';

/** Native aspect ratio for logoTransparent (480x230) */
const LOGO_ASPECT = 480 / 230;

interface PartnerHeaderLogoProps {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  showPartnerText?: boolean;
  cropZoom?: number;
  maskColor?: string;
}

export default function PartnerHeaderLogo({
  width = 72,
  height,
  style,
  showPartnerText = false,
}: PartnerHeaderLogoProps) {
  const containerHeight = height ?? Math.max(16, Math.round(width / LOGO_ASPECT));

  return (
    <View style={[styles.container, { width, height: containerHeight }, style]}>
      <Image
        source={images.logoTransparent}
        style={styles.image}
        resizeMode="contain"
        accessibilityLabel="RACE Partner"
      />
      {showPartnerText ? (
        <View style={styles.partnerLabelWrap}>
          <PartnerText style={styles.partnerLabel}>PARTNER</PartnerText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  partnerLabelWrap: {
    position: 'absolute',
    bottom: -6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerLabel: {
    color: '#D97706',
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
});
