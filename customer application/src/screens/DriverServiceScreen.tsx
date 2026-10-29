import React from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  ArrowRight,
  Calendar,
  Car,
  Moon,
  Phone,
  User,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import ServiceCategoryArtCard from '../components/services/ServiceCategoryArtCard';
import ServiceOptionInfoIcon, {
  showServiceHeaderInfo,
} from '../components/services/ServiceOptionInfoIcon';
import ServiceNavHeader from '../components/services/ServiceNavHeader';
import { getServiceCategoryCard } from '../constants/serviceCategoryCards';
import { useDriverBooking } from '../context/DriverBookingContext';
import { useCatalogStore } from '../store/catalogStore';
import { brand } from '../theme/brand';
import type { HomeStackParamList } from '../types/navigation';
import type { DriverTypeId } from '../types/driverBooking';
import { colors, shadows, typography } from '../theme';
import { goBackWithinStack } from '../navigation/goBackWithinStack';
import { getDriverTypeBookingDefaults, getDriverServiceFlow } from '../utils/driverServiceFlow';

const REF_W = 390;

type Props = NativeStackScreenProps<HomeStackParamList, 'DriverService'>;

const DRIVER_OPTIONS = [
  {
    id: 'part_time' as DriverTypeId,
    title: 'Part-Time Driver',
    subtitle: 'Hourly · your vehicle',
    price: 'From ₹199 / hr',
    Icon: User,
  },
  {
    id: 'full_time' as DriverTypeId,
    title: 'Full-Time Driver',
    subtitle: 'Full day hire',
    price: 'From ₹999 / day',
    Icon: Calendar,
  },
  {
    id: 'outstation' as DriverTypeId,
    title: 'Outstation Driver',
    subtitle: 'Pickup to destination',
    price: 'From ₹1,499 / trip',
    Icon: Car,
  },
  {
    id: 'night' as DriverTypeId,
    title: 'Night Driver',
    subtitle: 'Evening & overnight',
    price: 'From ₹299 / night',
    Icon: Moon,
  },
];

export default function DriverServiceScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const s = width / REF_W;
  const px = (n: number) => Math.round(n * s);
  const insets = useSafeAreaInsets();
  const heroCard = getServiceCategoryCard('driver');

  const { updateBooking, resetBooking } = useDriverBooking();
  const apiBrand = useCatalogStore(state => state.brand);

  const handleBook = (driverType: DriverTypeId) => {
    resetBooking();
    updateBooking({
      driverType,
      ...getDriverTypeBookingDefaults(driverType),
    });
    navigation.navigate('DriverDateTime');
  };

  const callSupport = () => {
    const phone = apiBrand?.phoneRaw ?? brand.phoneRaw;
    void Linking.openURL(`tel:${phone}`);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ServiceNavHeader
        title="Driver Service"
        onBack={() => goBackWithinStack(navigation)}
        onInfoPress={() =>
          showServiceHeaderInfo(
            'How driver booking works',
            getDriverServiceFlow('part_time').headerInfoBody,
          )
        }
      />

      <ScrollView
        style={{ backgroundColor: colors.pageBg }}
        contentContainerStyle={{
          paddingHorizontal: px(14),
          paddingTop: px(12),
          paddingBottom: px(100),
          gap: px(12),
        }}
        showsVerticalScrollIndicator={false}>
        <ServiceCategoryArtCard card={heroCard} />

        <View style={{ gap: px(10) }}>
          {DRIVER_OPTIONS.map(opt => (
            <View
              key={opt.id}
              style={[
                shadows.cardSoft,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.background,
                  borderRadius: px(16),
                  padding: px(14),
                  borderWidth: 1,
                  borderColor: '#F0EFEA',
                  gap: px(12),
                },
              ]}>
              <View
                style={{
                  width: px(44),
                  height: px(44),
                  borderRadius: px(22),
                  backgroundColor: colors.goldLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <opt.Icon size={px(20)} color={colors.primary} strokeWidth={2.6} />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text
                    style={{
                      flexShrink: 1,
                      fontSize: px(14),
                      lineHeight: px(18),
                      fontWeight: typography.weights.bold,
                      color: colors.dark,
                    }}>
                    {opt.title}
                  </Text>
                  <ServiceOptionInfoIcon
                    alertTitle={opt.title}
                    alertBody={getDriverServiceFlow(opt.id).tierInfoBody}
                  />
                </View>
                <Text
                  style={{
                    fontSize: px(11),
                    color: colors.grey,
                    marginTop: px(2),
                  }}>
                  {opt.subtitle}
                </Text>
                <Text
                  style={{
                    fontSize: px(12),
                    fontWeight: typography.weights.bold,
                    color: colors.primary,
                    marginTop: px(3),
                  }}>
                  {opt.price}
                </Text>
              </View>

              <Pressable
                onPress={() => handleBook(opt.id)}
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: px(14),
                  height: px(32),
                  borderRadius: px(8),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text
                  style={{
                    fontSize: px(12),
                    fontWeight: typography.weights.bold,
                    color: colors.dark,
                  }}>
                  Book Now
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: px(20),
          paddingTop: px(10),
          paddingBottom: Math.max(insets.bottom, px(12)),
          flexDirection: 'row',
          gap: px(12),
        }}>
        <Pressable
          onPress={callSupport}
          style={{
            flex: 1,
            height: px(46),
            borderRadius: px(14),
            borderWidth: 1.5,
            borderColor: colors.primary,
            backgroundColor: colors.background,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: px(6),
          }}>
          <Phone size={px(16)} color={colors.primary} strokeWidth={2.4} />
          <Text
            style={{
              fontSize: px(14),
              fontWeight: typography.weights.bold,
              color: colors.dark,
            }}>
            Call Now
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleBook('part_time')}
          style={{
            flex: 1.5,
            height: px(46),
            borderRadius: px(14),
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: px(8),
          }}>
          <Text
            style={{
              fontSize: px(14),
              fontWeight: typography.weights.bold,
              color: colors.dark,
            }}>
            Book Driver
          </Text>
          <ArrowRight size={px(16)} color={colors.dark} strokeWidth={2.5} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
