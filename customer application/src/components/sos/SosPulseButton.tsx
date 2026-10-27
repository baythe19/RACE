import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import { SOS_COLORS } from '../../constants/sosTheme';
import { typography } from '../../theme';

type Props = {
  px: (n: number) => number;
  onPress?: () => void;
};

/**
 * The single red SOS pulse. Kept as the one intentionally loud element of the
 * redesigned light screen — emergency identity is preserved, everything else
 * around it now follows the app's light design language.
 */
export default function SosPulseButton({ px, onPress }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const onPressIn = () => {
    Animated.spring(pressScale, { toValue: 0.92, useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true }).start();
  };

  const rings = [4, 3, 2, 1];

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        height: px(148),
        marginBottom: px(6),
      }}>
      {rings.map((ring, index) => {
        const size = px(68 + ring * 20);
        const opacity = pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.10 + index * 0.06, 0.38 - index * 0.06],
        });
        return (
          <Animated.View
            key={ring}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 1.5,
              borderColor: SOS_COLORS.red,
              opacity,
            }}
          />
        );
      })}
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{
          width: px(78),
          height: px(78),
          borderRadius: px(39),
          backgroundColor: SOS_COLORS.red,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: SOS_COLORS.red,
          shadowOpacity: 0.45,
          shadowRadius: px(14),
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
          transform: [{ scale: pressScale }],
        }}>
        <Text
          style={{
            color: SOS_COLORS.white,
            fontSize: px(23),
            fontWeight: typography.weights.extrabold,
            letterSpacing: 1.2,
          }}>
          SOS
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: px(9), marginTop: px(2) }}>
          tap to alert
        </Text>
      </Pressable>
    </View>
  );
}
