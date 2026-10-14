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
  /** Enlarges the padded source artwork inside the same header footprint. */
  cropZoom?: number;
}

export default function PartnerHeaderLogo({
  width = 114,
  style,
  showPartnerText = false,
  cropZoom = 1,
}: PartnerHeaderLogoProps) {
  // Ratio for splashHeader mark (484w x 300h)
  const logoHeight = Math.round(width * (108 / 180));
  const zoom = Math.max(1, cropZoom);
  const viewportHeight = Math.round(logoHeight * (zoom === 1 ? 1 : 1.2));
  const imageWidth = Math.round(width * zoom);
  const imageHeight = Math.round(logoHeight * zoom);

  return (
    <View style={[styles.container, style]}>
      <View style={{ width, height: viewportHeight, overflow: 'hidden' }}>
        <Image
          source={images.splashHeader}
          style={{
            width: imageWidth,
            height: imageHeight,
            position: 'absolute',
            left: Math.round((width - imageWidth) / 2),
            top: Math.round((viewportHeight - imageHeight) / 2),
          }}
          resizeMode="contain"
          accessibilityLabel="RACE"
        />
        {showPartnerText ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: width * 0.56,
              top: viewportHeight * 0.79,
              width: width * 0.44,
              height: viewportHeight * 0.17,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text
              style={{
                fontSize: Math.max(6, Math.round(width * 0.085)),
                lineHeight: Math.max(7, Math.round(width * 0.095)),
                fontWeight: '800',
                color: '#D97706',
                letterSpacing: Math.max(0.5, width * 0.01),
              }}>
              PARTNER
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
