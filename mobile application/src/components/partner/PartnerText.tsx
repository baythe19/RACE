import React, { forwardRef } from 'react';
import {
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';

import { interTextStyle } from '../../theme/interFonts';

export const PartnerText = forwardRef<Text, TextProps>(function PartnerText(
  { style, ...props },
  ref,
) {
  return <Text ref={ref} {...props} style={[style, interTextStyle(style)]} />;
});

export const PartnerTextInput = forwardRef<TextInput, TextInputProps>(function PartnerTextInput(
  { style, ...props },
  ref,
) {
  return <TextInput ref={ref} {...props} style={[style, interTextStyle(style as TextStyle)]} />;
});

PartnerText.displayName = 'PartnerText';
PartnerTextInput.displayName = 'PartnerTextInput';

export default PartnerText;
