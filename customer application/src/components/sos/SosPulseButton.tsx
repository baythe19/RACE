import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, Text, View } from 'react-native';

import { SOS_COLORS } from '../../constants/sosTheme';
import { typography } from '../../theme';

type Props = {
  px: (n: number) => number;
  onPress?: () => void;
};

/**
 * Soft SOS pulse — urgency without flashy strobe.
 * Rings breathe slowly; Reduce Motion keeps a static ring.
 */
export default function SosPulseButton({ px, onPress }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      pulse.setValue(0.45);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  const rings = reduceMotion ? [2] : [3, 2, 1];

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        height: px(156),
        marginBottom: px(4),
      }}>
      {rings.map((ring, index) => {
        const size = px(72 + ring * 18);
        const opacity = pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.1 + index * 0.04, 0.32 - index * 0.06],
        });
        return (
          <Animated.View
            key={ring}
            pointerEvents="none"
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
          accessibilityRole="button"
          accessibilityLabel="Send SOS alert"
          accessibilityHint="Sends an emergency alert with your live location to your contact"
          onPress={onPress}
          disabled={!onPress}
          style={({ pressed }) => ({
            opacity: pressed ? 0.9 : 1,
            width: px(82),
            height: px(82),
            borderRadius: px(41),
            backgroundColor: SOS_COLORS.red,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: SOS_COLORS.red,
            shadowOpacity: 0.32,
            shadowRadius: px(16),
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          })}>
          <Text
            style={{
              color: SOS_COLORS.white,
              fontSize: px(22),
              fontWeight: typography.weights.extrabold,
              letterSpacing: 1.4,
            }}>
            SOS
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: px(9.5), marginTop: px(2) }}>
            tap to alert
          </Text>
        </Pressable>
    </View>
  );
}
