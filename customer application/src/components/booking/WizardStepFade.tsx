import React, { useEffect, useRef, type ReactNode } from 'react';
import { Animated } from 'react-native';

/** Soft content swap. Header and footer stay put; only this body eases in. */
export default function WizardStepFade({ children }: { children: ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const shift = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(shift, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, shift]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: shift }] }}>{children}</Animated.View>
  );
}
