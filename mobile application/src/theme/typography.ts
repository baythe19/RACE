import { colors } from './colors';

type FontSizeKey = keyof typeof typography.sizes;

export const typography = {
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    bold: 'Inter_700Bold',
    inter: {
      regular: 'Inter_400Regular',
      medium: 'Inter_500Medium',
      semibold: 'Inter_600SemiBold',
      bold: 'Inter_700Bold',
      extrabold: 'Inter_800ExtraBold',
    },
  },
  sizes: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    hero: 28,
    display: 32,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  lineHeights: {
    tight: 18,
    normal: 22,
    relaxed: 26,
  },
};

export const textStyles = {
  heading: {
    fontWeight: typography.weights.extrabold,
    color: colors.dark,
  },
  subheading: {
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  body: {
    fontWeight: typography.weights.regular,
    color: colors.grey,
  },
  label: {
    fontWeight: typography.weights.semibold,
    color: colors.dark,
  },
} as const;

export function headingStyle(size: FontSizeKey = 'xl') {
  return {
    fontSize: typography.sizes[size],
    fontWeight: typography.weights.extrabold,
    color: colors.dark,
  };
}

export function bodyStyle(size: FontSizeKey = 'md') {
  return {
    fontSize: typography.sizes[size],
    fontWeight: typography.weights.regular,
    color: colors.grey,
    lineHeight: typography.lineHeights.normal,
  };
}

export function labelStyle(size: FontSizeKey = 'sm') {
  return {
    fontSize: typography.sizes[size],
    fontWeight: typography.weights.semibold,
    color: colors.dark,
  };
}
