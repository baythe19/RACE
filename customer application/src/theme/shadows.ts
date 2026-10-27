import { Platform, type ViewStyle } from 'react-native';

export const shadows = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
    },
    android: {
      elevation: 1,
    },
    default: {},
  }),
  subtle: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.02,
      shadowRadius: 4,
    },
    android: {
      elevation: 0.5,
    },
    default: {},
  }),
  // Extremely light card shadow. Use on service cards so they read as
  // bordered surfaces rather than floating boxes.
  cardSoft: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.025,
      shadowRadius: 3,
    },
    android: {
      elevation: 0.6,
    },
    default: {},
  }),
  fab: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#E53935',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
} as const;
