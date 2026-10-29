import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import { DRIVER_TYPES } from '../../../constants/driverBooking';
import { useDriverBooking } from '../../../context/DriverBookingContext';
import type { HomeStackParamList } from '../../../types/navigation';
import type { DriverTypeId } from '../../../types/driverBooking';
import { colors, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'DriverSelectType'>;

function DriverTypeCard({
  label,
  price,
  image,
  isSelected,
  onPress,
  t,
}: {
  label: string;
  price: string;
  image: number;
  isSelected: boolean;
  onPress: () => void;
  t: ReturnType<typeof useBookingTheme>['t'];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: t.cardRadius,
        borderWidth: isSelected ? 2 : 1,
        borderColor: isSelected ? colors.primary : colors.border,
        backgroundColor: isSelected ? colors.goldLight : colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: t.px(20),
        paddingHorizontal: t.px(10),
        gap: t.px(10),
      }}>
      <Image
        source={image}
        style={{ width: t.px(32), height: t.px(32) }}
        resizeMode="contain"
      />
      <Text
        style={{
          fontSize: t.labelBold,
          fontWeight: typography.weights.bold,
          color: colors.dark,
          textAlign: 'center',
        }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: t.label,
          fontWeight: typography.weights.semibold,
          color: isSelected ? colors.primary : colors.grey,
          textAlign: 'center',
        }}>
        {price}
      </Text>
    </Pressable>
  );
}

export default function DriverSelectTypeScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, updateBooking } = useDriverBooking();
  const [selected, setSelected] = useState<DriverTypeId>(booking.driverType);

  const rows = [DRIVER_TYPES.slice(0, 2), DRIVER_TYPES.slice(2, 4)];

  return (
    <TowingBookingLayout
      title="Select Driver Type"
      step={1}
      onBack={() => goBackWithinStack(navigation)}
      onContinue={() => {
        updateBooking({ driverType: selected });
        navigation.navigate('DriverDateTime');
      }}>
      <View style={{ flex: 1, gap: t.gridGap }}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={{ flex: 1, flexDirection: 'row', gap: t.gridGap }}>
            {row.map(type => (
              <DriverTypeCard
                key={type.id}
                label={type.label}
                price={type.price}
                image={type.image}
                isSelected={selected === type.id}
                onPress={() => setSelected(type.id)}
                t={t}
              />
            ))}
          </View>
        ))}
      </View>
    </TowingBookingLayout>
  );
}
