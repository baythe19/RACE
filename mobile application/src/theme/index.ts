export { colors, getCategoryTheme } from './colors';
export { typography, headingStyle, bodyStyle, labelStyle, textStyles } from './typography';
export { spacing, radius, layout } from './spacing';
export { brand } from './brand';
export { shadows } from './shadows';
export { motionTokens, getPressableFeedback } from './motion';
export { useInterFonts, interFontForWeight, interTextStyle } from './interFonts';

import { colors } from './colors';
import { typography } from './typography';
import { spacing, radius, layout } from './spacing';
import { brand } from './brand';

const theme = {
  colors,
  typography,
  spacing,
  radius,
  layout,
  brand,
};

export default theme;
