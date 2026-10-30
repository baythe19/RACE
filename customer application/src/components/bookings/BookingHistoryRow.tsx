import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { customerStatusChipTone } from '../../utils/bookingDisplay';
import { formatBookingDate, getBookingServiceIcon } from '../../constants/bookingsScreen';
import type { BookingHistoryItem } from '../../types/models';
import { colors, shadows, typography } from '../../theme';

type Props = {
  item: BookingHistoryItem;
  px: (n: number) => number;
  onPress?: () => void;
};

export default function BookingHistoryRow({ item, px, onPress }: Props) {
  const ServiceIcon = getBookingServiceIcon(item.service);
  const chip = customerStatusChipTone(item.status);

  return (
    <Pressable
      onPress={onPress}
      style={[
        shadows.cardSoft,
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: px(10),
          borderRadius: px(12),
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          padding: px(12),
          marginBottom: px(8),
        },
      ]}>
      <View
        style={{
          width: px(40),
          height: px(40),
          borderRadius: px(10),
          backgroundColor: '#F3F4F6',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
        <ServiceIcon size={px(18)} color={colors.dark} strokeWidth={2.2} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: px(14),
            fontWeight: typography.weights.bold,
            color: colors.dark,
            marginBottom: px(3),
          }}>
          {item.service}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontSize: px(11),
            color: colors.grey,
            marginBottom: px(2),
          }}>
          {formatBookingDate(item.date)}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: px(11), color: colors.grey }}>
          {item.location}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
        <View
          style={{
            paddingHorizontal: px(8),
            paddingVertical: px(3),
            borderRadius: px(10),
            backgroundColor: chip.bg,
            marginBottom: px(6),
            maxWidth: px(110),
          }}>
          <Text
            numberOfLines={2}
            style={{
              fontSize: px(9),
              fontWeight: typography.weights.bold,
              color: chip.fg,
              textAlign: 'right',
            }}>
            {item.status}
          </Text>
        </View>
        <Text
          style={{
            fontSize: px(14),
            fontWeight: typography.weights.bold,
            color: colors.dark,
            marginBottom: px(2),
          }}>
          ₹{item.amount}
        </Text>
        <ChevronRight size={px(16)} color={colors.grey} strokeWidth={2} />
      </View>
    </Pressable>
  );
}
