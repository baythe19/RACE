import React, { useLayoutEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  /** Entry fade length. Keep short — modern apps ~180–220ms. */
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Opacity-only enter animation (no scale / translate).
 * Wrapper stays transparent so the previous screen (e.g. Splash under a
 * transparentModal) remains visible during the crossfade — no white flash.
 */
export default function SoftScreenFade({ children, duration = 200, style }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => {
    opacity.setValue(0);
    const anim = Animated.timing(opacity, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [duration, opacity]);

  return (
    <View style={styles.transparentRoot}>
      <Animated.View style={[styles.transparentRoot, style, { opacity }]}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  transparentRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
