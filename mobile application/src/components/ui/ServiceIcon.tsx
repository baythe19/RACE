import { PartnerText } from '../partner/PartnerText';
import React from 'react';
import { Image, StyleSheet } from 'react-native';

import { categoryIcons } from '../../assets';
import type { CategoryId } from '../../types/models';

interface ServiceIconProps {
  categoryId: string;
  emoji: string;
  size?: number;
}

export default function ServiceIcon({
  categoryId,
  emoji,
  size = 28,
}: ServiceIconProps) {
  const iconSource = categoryIcons[categoryId as CategoryId];

  if (iconSource) {
    return (
      <Image
        source={iconSource}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    );
  }

  return <PartnerText style={[styles.emoji, { fontSize: size * 0.85 }]}>{emoji}</PartnerText>;
}

const styles = StyleSheet.create({
  emoji: {
    textAlign: 'center',
  },
});
