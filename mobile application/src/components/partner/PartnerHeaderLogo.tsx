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
  cropZoom?: number;
  maskColor?: string;
}

export default function PartnerHeaderLogo({
  width = 92,
  style,
  showPartnerText = true,
  cropZoom = showPartnerText ? 1.55 : 1.25,
  maskColor = '#FFFFFF',
}: PartnerHeaderLogoProps) {
  // The supplied transparent brand asset still contains the legacy SERVICE
  // wordmark. Crop it in the shared header and use the app's PARTNER label so
  // every partner screen gets the same clean lock-up.
  const imageWidth = Math.round(width * cropZoom);
  const imageHeight = Math.round(imageWidth * (230 / 480));
  const containerHeight = Math.round(width * (showPartnerText ? 0.68 : 0.58));
  const legacyMarkTop = Math.round(imageHeight * 0.6);
  const legacyMarkHeight = Math.max(8, Math.round(imageHeight * 0.18));

  return (
    <View style={[styles.container, { width, height: containerHeight }, style]}>
      <Image
        source={images.logoTransparent}
        style={{
          position: 'absolute',
          width: imageWidth,
          height: imageHeight,
          left: Math.round((width - imageWidth) / 2),
          top: 0,
        }}
        resizeMode="contain"
        accessibilityLabel="RACE Partner"
      />
      <View
        pointerEvents="none"
        style={[
          styles.legacyMarkMask,
          {
            top: legacyMarkTop,
            height: legacyMarkHeight,
            backgroundColor: maskColor,
          },
        ]}>
        {showPartnerText ? <Text style={styles.partnerLabel}>PARTNER</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  legacyMarkMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerLabel: {
    color: '#D97706',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2.1,
    lineHeight: 10,
  },
});
