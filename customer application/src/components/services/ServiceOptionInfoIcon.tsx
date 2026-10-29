import React from 'react';
import { Alert, Pressable, useWindowDimensions } from 'react-native';
import { Info } from 'lucide-react-native';

const REF_W = 390;

type Props = {
  alertTitle: string;
  alertBody: string;
  accessibilityLabel?: string;
};

/** Small ℹ beside a service tier title — tap shows Alert with details. */
export default function ServiceOptionInfoIcon({
  alertTitle,
  alertBody,
  accessibilityLabel,
}: Props) {
  const { width } = useWindowDimensions();
  const px = (n: number) => Math.round(n * (width / REF_W));

  return (
    <Pressable
      onPress={() => Alert.alert(alertTitle, alertBody)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${alertTitle} details`}
      style={{
        marginLeft: px(3),
        width: px(16),
        height: px(18),
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Info size={px(13)} color="#9CA3AF" strokeWidth={2} />
    </Pressable>
  );
}

export function showServiceHeaderInfo(title: string, body: string) {
  Alert.alert(title, body);
}
