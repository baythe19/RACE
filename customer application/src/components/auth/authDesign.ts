export const AUTH_DESIGN_WIDTH = 390;
export const AUTH_DESIGN_HEIGHT = 844;
export const AUTH_HERO_RATIO = 0.38;

export const AUTH_COLORS = {
  background: '#FFFEFC',
  ink: '#17191E',
  secondary: '#777783',
  muted: '#8D8C98',
  orange: '#F3A200',
  border: '#E7E7E9',
  divider: '#F3F1ED',
};

/** OTP backend only accepts Indian 10-digit mobiles. Other codes stay in the menu as soon. */
export const AUTH_COUNTRY_CODES = [
  { name: 'India', code: '+91', supported: true },
  { name: 'UAE', code: '+971', supported: false },
  { name: 'United States', code: '+1', supported: false },
  { name: 'United Kingdom', code: '+44', supported: false },
] as const;
