import React from 'react';
import {
  Image,
  type ImageStyle,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { images } from '../../assets';
import type { LogoSize } from '../../types/models';

const SIZES: Record<LogoSize, number> = {
  small: 32,
  medium: 56,
  large: 88,
};

interface BrandLogoProps {
  size?: LogoSize;
  style?: StyleProp<ViewStyle>;
}

export default function BrandLogo({ size = 'medium', style }: BrandLogoProps) {
  const dimension = SIZES[size] ?? SIZES.medium;

  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={images.logo}
        style={{
          width: dimension,
          height: dimension * (230 / 480),
        } as ImageStyle}
        resizeMode="contain"
        accessibilityLabel="RACE Service logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
