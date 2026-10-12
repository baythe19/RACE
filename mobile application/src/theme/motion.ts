/**
 * RACE Partner App — Motion & Interaction Standard Tokens
 *
 * Implements RACE_MOTION_INTERACTION_STANDARD.md Section 3:
 *
 * | Token               | Target     | Purpose                                |
 * |---------------------|------------|----------------------------------------|
 * | tapFeedback         | 80–120 ms  | Touch response (scale ~0.98 / opacity) |
 * | microTransition     | 120–180 ms | Icon / toggle / status pill change     |
 * | contentTransition   | 160–220 ms | Card expand / inline notice change     |
 * | screenTransition    | ~200–300 ms| Native stack screen push/pop           |
 * | sheetTransition     | ~220–300 ms| Bottom sheet settle / modal backdrop   |
 * | successEmphasis     | ~180–260 ms| Success checkmark pulse (once)         |
 */

import { Easing, type StyleProp, type ViewStyle } from 'react-native';

export const motionTokens = {
  duration: {
    tapFeedback: 100,
    microTransition: 150,
    contentTransition: 200,
    screenTransition: 280,
    sheetTransition: 260,
    successEmphasis: 220,
  },
  scale: {
    pressed: 0.98,
    cardPressed: 0.985,
    idle: 1.0,
  },
  opacity: {
    pressed: 0.85,
    faintPressed: 0.92,
    disabled: 0.45,
    idle: 1.0,
  },
  easing: {
    standard: Easing.bezier(0.2, 0, 0, 1),
    decelerate: Easing.out(Easing.ease),
    accelerate: Easing.in(Easing.ease),
    springConfig: {
      damping: 18,
      stiffness: 160,
      mass: 0.9,
    },
  },
} as const;

/**
 * Standard pressable helper for subtle touch feedback across cards & buttons.
 * Guarantees consistent feel across Android and iOS mid-range & high-end devices.
 */
export function getPressableFeedback(
  pressed: boolean,
  options?: {
    scale?: number;
    opacity?: number;
    extraStyle?: StyleProp<ViewStyle>;
  },
): StyleProp<ViewStyle> {
  if (!pressed) return options?.extraStyle;

  return [
    {
      opacity: options?.opacity ?? motionTokens.opacity.pressed,
      transform: [{ scale: options?.scale ?? motionTokens.scale.pressed }],
    },
    options?.extraStyle,
  ];
}
