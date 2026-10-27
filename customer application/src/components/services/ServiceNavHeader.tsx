import React from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

import { typography } from '../../theme';

const REF_W = 390;

type Props = {
  title: string;
  onBack: () => void;
  subtitle?: string;
};

/** Shared top bar for Services and each service detail screen. */
export default function ServiceNavHeader({ title, onBack, subtitle }: Props) {
  const { width } = useWindowDimensions();
  const px = (n: number) => Math.round(n * (width / REF_W));

  return (
    <View
      style={{
        paddingHorizontal: px(12),
        paddingTop: px(2),
        paddingBottom: px(6),
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: px(40),
        }}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={{
            width: px(36),
            height: px(36),
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <ArrowLeft size={px(22)} color="#111827" strokeWidth={2} />
        </Pressable>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            paddingRight: px(36),
          }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: px(17),
              lineHeight: px(22),
              fontWeight: typography.weights.semibold,
              color: '#111827',
              textAlign: 'center',
            }}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{
                marginTop: px(1),
                fontSize: px(12.5),
                lineHeight: px(17),
                color: '#6B7280',
                fontWeight: typography.weights.regular,
                textAlign: 'center',
              }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
