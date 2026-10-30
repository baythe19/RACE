export const BOOKING_REF_W = 390;

export function createBookingTheme(scale: number) {
  const px = (n: number) => Math.round(n * scale);

  return {
    px,
    stepCircle: px(44),
    stepNumber: px(18),
    screenTitle: px(18),
    sectionTitle: px(16),
    body: px(15),
    bodyLarge: px(16),
    label: px(15),
    labelBold: px(16),
    caption: px(13),
    cardRadius: px(14),
    inputRadius: px(12),
    buttonHeight: px(54),
    buttonLabel: px(17),
    cardPadding: px(20),
    rowPadding: px(14),
    iconSm: px(20),
    iconMd: px(22),
    checkSize: px(22),
    gridGap: px(14),
    contentTop: px(6),
    headerBottom: px(12),
    footerTop: px(16),
    footerBottom: px(20),
  };
}

export type BookingTheme = ReturnType<typeof createBookingTheme>;
