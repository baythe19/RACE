import React, { useMemo, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import { ROADSIDE_ACCENT, ROADSIDE_ACCENT_LIGHT, ROADSIDE_SERVICES } from '../../../constants/roadsideBooking';
import { useRoadsideBooking } from '../../../context/RoadsideBookingContext';
import { useAppDialog } from '../../../hooks/useAppDialog';
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
      disabled={comingSoon}
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
        opacity: comingSoon ? 0.65 : 1,
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
  const { dialog, showDialog } = useAppDialog();
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

  const isSelectedComingSoon =
    availabilityBySlug.get(roadsideServiceIdToSlug(selected)) === false;

  return (
    <TowingBookingLayout
      title="Select Service"
      step={0}
      showStep={false}
      accentColor={ROADSIDE_ACCENT}
      onBack={() => goBackWithinStack(navigation)}
      onContinue={() => {
        if (isSelectedComingSoon) {
          showDialog({
            tone: 'info',
            title: 'Coming soon',
            message:
              'This roadside service is not available yet. Choose another option or use Towing from Home.',
            primaryLabel: 'Got it',
          });
          return;
        }
        updateBooking({ serviceId: selected });
        navigation.navigate('RoadsideLocation');
      }}
      continueDisabled={isSelectedComingSoon}>
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
                onPress={() => {
                  const slug = roadsideServiceIdToSlug(service.id);
                  if (availabilityBySlug.get(slug) === false) {
                    showDialog({
                      tone: 'info',
                      title: 'Coming soon',
                      message: `${service.label} is not bookable yet.`,
                      primaryLabel: 'Got it',
                    });
                    return;
                  }
                  setSelected(service.id);
                }}
                t={t}
              />
            ))}
          </View>
        ))}
      </View>
    </TowingBookingLayout>
  );
}
