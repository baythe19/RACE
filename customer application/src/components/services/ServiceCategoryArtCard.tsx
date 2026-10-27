import React, { useState } from 'react';
import { Image, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { ServiceCategoryCard } from '../../constants/serviceCategoryCards';
import { typography } from '../../theme';

const REF_W = 390;

type Props = {
  card: ServiceCategoryCard;
  footer?: React.ReactNode;
};

/** Same artwork card used on Services and on each service detail screen. */
export default function ServiceCategoryArtCard({ card, footer }: Props) {
  const { width } = useWindowDimensions();
  const px = (n: number) => Math.round(n * (width / REF_W));
  const cardHeight = px(148);
  const [cardWidth, setCardWidth] = useState(() => Math.max(0, Math.round(width - px(28))));
  const artWidth = cardWidth > 0 ? Math.round(cardWidth * 0.58) : 0;

  return (
    <View>
    <View
      onLayout={event => {
        const nextWidth = Math.round(event.nativeEvent.layout.width);
        if (nextWidth > 0 && nextWidth !== cardWidth) setCardWidth(nextWidth);
      }}
      style={{
        width: '100%',
        height: cardHeight,
        borderRadius: px(20),
        overflow: 'hidden',
        backgroundColor: card.cardBg,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
      }}>
      {artWidth > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: artWidth,
            overflow: 'hidden',
          }}>
          <Image
            source={card.image}
            style={{ width: artWidth, height: cardHeight }}
            resizeMode="cover"
          />
          <LinearGradient
            colors={card.fogColors}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: Math.round(artWidth * 0.4),
            }}
          />
        </View>
      ) : null}

      <View
        style={{
          flex: 1,
          paddingLeft: px(16),
          paddingRight: px(6),
          justifyContent: 'center',
          maxWidth: '54%',
          zIndex: 2,
        }}>
        <Text
          style={{
            fontSize: px(18),
            fontWeight: typography.weights.extrabold,
            color: '#111827',
            marginBottom: px(2),
            letterSpacing: -0.3,
          }}>
          {card.title}
        </Text>
        <Text
          style={{
            fontSize: px(12.5),
            color: card.subtitleColor,
            fontWeight: '600',
            lineHeight: px(17),
          }}>
          {card.subtitle}
        </Text>
      </View>
    </View>
    {footer ? <View style={{ marginTop: px(8) }}>{footer}</View> : null}
    </View>
  );
}
