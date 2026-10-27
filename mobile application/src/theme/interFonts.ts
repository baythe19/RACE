import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { useFonts as useExpoFonts } from '@expo-google-fonts/inter/useFonts';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { typography } from './typography';

const interFontAssets = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
};

/** Load the single Partner product font family once at the app root. */
export function useInterFonts() {
  return useExpoFonts(interFontAssets);
}

/** Map React Native's existing weight styles to the matching static Inter face. */
export function interFontForWeight(weight?: TextStyle['fontWeight']): string {
  switch (String(weight ?? '400')) {
    case '500':
      return typography.fontFamily.inter.medium;
    case '600':
      return typography.fontFamily.inter.semibold;
    case '700':
      return typography.fontFamily.inter.bold;
    case '800':
    case '900':
      return typography.fontFamily.inter.extrabold;
    default:
      return typography.fontFamily.inter.regular;
  }
}

/**
 * Resolve an existing Text/TextInput style to a real static Inter face.
 * Static font files must use fontFamily names instead of relying on synthetic
 * fontWeight selection on iOS or Android.
 */
export function interTextStyle(style?: StyleProp<TextStyle>): TextStyle {
  const flattened = StyleSheet.flatten(style) as TextStyle | undefined;
  const existingFamily = flattened?.fontFamily;

  return {
    fontFamily:
      existingFamily && existingFamily !== typography.fontFamily.regular && existingFamily !== 'System'
        ? existingFamily
        : interFontForWeight(flattened?.fontWeight),
    fontWeight: undefined,
  };
}
