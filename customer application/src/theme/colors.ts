import sharedColors from '../data/colors.json';
import type { CategoryId, CategoryTheme } from '../types/models';

const categoryThemes: Record<CategoryId, CategoryTheme> = {
  towing: {
    background: sharedColors.goldLight,
    accent: sharedColors.primary,
    iconBackground: sharedColors.dark,
  },
  driver: {
    background: '#E6FAFC',
    accent: '#00BAC6',
    iconBackground: '#004E72',
  },
  roadside: {
    background: '#FFF4E5',
    accent: '#F4A115',
    iconBackground: sharedColors.dark,
  },
  future: {
    background: sharedColors.lightGrey,
    accent: sharedColors.grey,
    iconBackground: '#333333',
  },
};

export const colors = {
  primary: sharedColors.primary,
  background: sharedColors.background,
  pageBg: (sharedColors as { pageBg?: string }).pageBg ?? sharedColors.background,
  dark: sharedColors.dark,
  grey: sharedColors.grey,
  lightGrey: sharedColors.lightGrey,
  border: sharedColors.border,
  success: sharedColors.success,
  error: sharedColors.error,
  cardBg: sharedColors.cardBg,
  goldLight: sharedColors.goldLight,

  // Legacy aliases used across existing screens
  textDark: sharedColors.dark,
  text: sharedColors.grey,
  subtext: sharedColors.grey,
  textLight: '#FFFFFF',
  textMuted: '#999999',
  // Screens must feel flat white — no grey page wash behind content.
  backgroundSoft: (sharedColors as { pageBg?: string }).pageBg ?? sharedColors.background,
  backgroundMuted: sharedColors.background,
  surface: sharedColors.cardBg,
  surfaceDark: sharedColors.dark,
  surfaceDarker: '#111111',
  borderLight: sharedColors.border,
  card: sharedColors.cardBg,
  glass: {
    background: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.18)',
  },
  primaryDark: '#D99400',
  secondary: '#00BAC6',
  accentOrange: '#F4A115',
  accentRed: sharedColors.error,
  warning: '#F4A115',
  partnerRed: sharedColors.primary,
  partnerRedLight: sharedColors.goldLight,
  partnerOrangeLight: sharedColors.goldLight,
  overlay: 'rgba(26, 26, 26, 0.92)',
  shadow: 'rgba(0, 0, 0, 0.12)',

  categories: categoryThemes,
};

export function getCategoryTheme(categoryId: string): CategoryTheme {
  return (
    colors.categories[categoryId as CategoryId] ?? colors.categories.future
  );
}
