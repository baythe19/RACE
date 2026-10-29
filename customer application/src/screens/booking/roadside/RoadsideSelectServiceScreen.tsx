import React, { useMemo, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import { ROADSIDE_ACCENT, ROADSIDE_ACCENT_LIGHT, ROADSIDE_SERVICES } from '../../../constants/roadsideBooking';
import { useRoadsideBooking } from '../../../context/RoadsideBookingContext';
import { useRoadsideAvailabilityQuery } from '../../../services/bookings/useServiceBookingMutations';
import { roadsideServiceIdToSlug } from '../../../utils/roadsideServiceMap';
import type { HomeStackParamList } from '../../../types/navigation';
import type { RoadsideServiceId } from '../../../types/roadsideBooking';
import { colors, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'RoadsideSelectService'>;

function ServiceCard({
  label,
  price,
  image,
  isSelected,
  onPress,
  comingSoon,
  t,
}: {
  label: string;
  price: number;
  image: number;
  isSelected: boolean;
  onPress: () => void;
  comingSoon?: boolean;
  t: ReturnType<typeof useBookingTheme>['t'];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: t.cardRadius,
        borderWidth: isSelected ? 2 : 1,
        borderColor: isSelected ? ROADSIDE_ACCENT : colors.border,
        backgroundColor: isSelected ? ROADSIDE_ACCENT_LIGHT : colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: t.px(18),
        paddingHorizontal: t.px(8),
        gap: t.px(8),
      }}>
      <Image
        source={image}
        style={{ width: t.px(56), height: t.px(56) }}
        resizeMode="contain"
      />
      <Text
        style={{
          fontSize: t.caption,
          fontWeight: typography.weights.bold,
          color: colors.dark,
          textAlign: 'center',
          lineHeight: t.px(18),
        }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: t.caption,
          fontWeight: typography.weights.bold,
          color: comingSoon ? colors.grey : ROADSIDE_ACCENT,
        }}>
        {comingSoon ? 'Coming soon' : `From ₹${price}`}
      </Text>
    </Pressable>
  );
}

export default function RoadsideSelectServiceScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, updateBooking } = useRoadsideBooking();
  const { data: availability } = useRoadsideAvailabilityQuery();
  const [selected, setSelected] = useState<RoadsideServiceId>(booking.serviceId);

  const availabilityBySlug = useMemo(() => {
    const map = new Map<string, boolean>();
    availability?.items.forEach(item => {
      map.set(item.serviceType, item.available);
    });
    return map;
  }, [availability]);

  const rows = [ROADSIDE_SERVICES.slice(0, 2), ROADSIDE_SERVICES.slice(2, 4)];

  return (
    <TowingBookingLayout
      title="Select Service"
      step={1}
      accentColor={ROADSIDE_ACCENT}
      onBack={() => goBackWithinStack(navigation)}
      onContinue={() => {
        updateBooking({ serviceId: selected });
        navigation.navigate('RoadsideLocation');
      }}>
      <View style={{ flex: 1, gap: t.gridGap }}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={{ flex: 1, flexDirection: 'row', gap: t.gridGap }}>
            {row.map(service => (
              <ServiceCard
                key={service.id}
                label={service.label}
                price={service.price}
                image={service.image}
                isSelected={selected === service.id}
                comingSoon={availabilityBySlug.get(roadsideServiceIdToSlug(service.id)) === false}
                onPress={() => setSelected(service.id)}
                t={t}
              />
            ))}
          </View>
        ))}
      </View>
    </TowingBookingLayout>
  );
}
