import React from 'react';
import { Pressable, useWindowDimensions } from 'react-native';
import { Info } from 'lucide-react-native';

import { getAppDialog } from '../../utils/alertBus';

const REF_W = 390;

type Props = {
  alertTitle: string;
  alertBody: string;
  accessibilityLabel?: string;
};

/** Small ℹ beside a service tier title — tap shows the branded info dialog. */
export default function ServiceOptionInfoIcon({
  alertTitle,
  alertBody,
  accessibilityLabel,
}: Props) {
  const { width } = useWindowDimensions();
  const px = (n: number) => Math.round(n * (width / REF_W));

  return (
    <Pressable
      onPress={() =>
        getAppDialog().showDialog({
          tone: 'info',
          title: alertTitle,
          message: alertBody,
          primaryLabel: 'Got it',
        })
      }
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
  getAppDialog().showDialog({
    tone: 'info',
    title,
    message: body,
    primaryLabel: 'Got it',
  });
}
