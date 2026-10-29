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
  BatteryCharging,
  Disc,
  Fuel,
  Phone,
  Wrench,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import ServiceCategoryArtCard from '../components/services/ServiceCategoryArtCard';
import ServiceOptionInfoIcon, {
  showServiceHeaderInfo,
} from '../components/services/ServiceOptionInfoIcon';
import ServiceNavHeader from '../components/services/ServiceNavHeader';
import {
  ROADSIDE_SERVICE_HEADER_INFO,
  ROADSIDE_TIER_INFO,
} from '../constants/serviceLandingInfo';
import { getServiceCategoryCard } from '../constants/serviceCategoryCards';
import { useCatalogStore } from '../store/catalogStore';
import { useRoadsideAvailabilityQuery } from '../services/bookings/useServiceBookingMutations';
import { brand } from '../theme/brand';
import type { HomeStackParamList } from '../types/navigation';
import { colors, shadows, typography } from '../theme';
import { goBackWithinStack } from '../navigation/goBackWithinStack';
import {
  getRoadsideServiceLabel,
  getRoadsideServicePrice,
} from '../constants/roadsideBooking';
import {
  openRoadsideLocation,
  roadsideCatalogIdToServiceId,
} from '../utils/roadsideBookingFlow';

const REF_W = 390;

type Props = NativeStackScreenProps<HomeStackParamList, 'RoadsideAssistance'>;

const ROADSIDE_OPTIONS = [
  {
    id: 'flat_tyre' as const,
    slug: 'roadside_flat_tyre',
    title: getRoadsideServiceLabel('flat_tyre'),
    price: getRoadsideServicePrice('flat_tyre'),
    Icon: Disc,
  },
  {
    id: 'battery_jumpstart' as const,
    slug: 'roadside_battery_jump',
    title: getRoadsideServiceLabel('battery'),
    price: getRoadsideServicePrice('battery'),
    Icon: BatteryCharging,
  },
  {
    id: 'fuel_delivery' as const,
    slug: 'roadside_fuel_delivery',
    title: getRoadsideServiceLabel('fuel'),
    price: getRoadsideServicePrice('fuel'),
    Icon: Fuel,
  },
  {
    id: 'minor_repair' as const,
    slug: 'roadside_minor_repair',
    title: getRoadsideServiceLabel('minor_repairs'),
    price: getRoadsideServicePrice('minor_repairs'),
    Icon: Wrench,
  },
];

export default function RoadsideAssistanceScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const s = width / REF_W;
  const px = (n: number) => Math.round(n * s);
  const insets = useSafeAreaInsets();
  const heroCard = getServiceCategoryCard('roadside');

  const apiBrand = useCatalogStore(state => state.brand);
  const { data: availability } = useRoadsideAvailabilityQuery();

  const availabilityBySlug = React.useMemo(() => {
    const map = new Map<string, boolean>();
    availability?.items.forEach(item => {
      map.set(item.serviceType, item.available);
    });
    return map;
  }, [availability]);

  const bookableCount = ROADSIDE_OPTIONS.filter(
    opt => availabilityBySlug.get(opt.slug) !== false,
  ).length;

  const startRoadside = (catalogId: (typeof ROADSIDE_OPTIONS)[number]['id']) => {
    const serviceId = roadsideCatalogIdToServiceId(catalogId);
    if (!serviceId) return;
    const slug = ROADSIDE_OPTIONS.find(o => o.id === catalogId)?.slug;
    if (slug && availabilityBySlug.get(slug) === false) return;
    openRoadsideLocation(navigation, serviceId);
  };

  const bookFirstAvailable = () => {
    const first = ROADSIDE_OPTIONS.find(opt => availabilityBySlug.get(opt.slug) !== false);
    if (first) {
      startRoadside(first.id);
    }
  };

  const callSupport = () => {
    const phone = apiBrand?.phoneRaw ?? brand.phoneRaw;
    void Linking.openURL(`tel:${phone}`);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ServiceNavHeader
        title="Roadside Assistance"
        onBack={() => goBackWithinStack(navigation)}
        onInfoPress={() =>
          showServiceHeaderInfo('How roadside works', ROADSIDE_SERVICE_HEADER_INFO)
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
        <Text
          style={{
            marginTop: -px(4),
            fontSize: px(12),
            lineHeight: px(17),
            color: colors.grey,
            textAlign: 'center',
            fontWeight: typography.weights.medium,
          }}>
          On-spot help · Prices shown only for services you can book today
        </Text>
        {bookableCount === 0 ? (
          <Text
            style={{
              fontSize: px(12),
              lineHeight: px(17),
              color: colors.grey,
              textAlign: 'center',
              fontWeight: typography.weights.medium,
            }}>
            Tyre, battery, fuel & repairs are coming soon. Instant towing is available from Home →
            Towing.
          </Text>
        ) : null}

        {/* Roadside Options List */}
        <View style={{ gap: px(10) }}>
          {ROADSIDE_OPTIONS.map(opt => {
            const comingSoon = availabilityBySlug.get(opt.slug) === false;
            return (
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
                  opacity: comingSoon ? 0.72 : 1,
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
                    alertBody={ROADSIDE_TIER_INFO[opt.id]}
                  />
                </View>
                <Text
                  style={{
                    fontSize: px(12),
                    fontWeight: typography.weights.bold,
                    color: comingSoon ? colors.grey : colors.primary,
                    marginTop: px(3),
                  }}>
                  {comingSoon ? 'Coming soon' : `From ₹${opt.price}`}
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  if (!comingSoon) startRoadside(opt.id);
                }}
                disabled={comingSoon}
                style={{
                  backgroundColor: comingSoon ? colors.border : colors.primary,
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
                    color: comingSoon ? colors.grey : colors.dark,
                  }}>
                  {comingSoon ? 'Soon' : 'Book Now'}
                </Text>
              </Pressable>
            </View>
          );
          })}
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
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
          onPress={() => bookFirstAvailable()}
          disabled={bookableCount === 0}
          style={{
            flex: 1.5,
            height: px(46),
            borderRadius: px(14),
            backgroundColor: bookableCount === 0 ? colors.border : colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: px(8),
          }}>
          <Text
            style={{
              fontSize: px(14),
              fontWeight: typography.weights.bold,
              color: bookableCount === 0 ? colors.grey : colors.dark,
            }}>
            {bookableCount === 0 ? 'Services coming soon' : 'Book Service'}
          </Text>
          {bookableCount === 0 ? null : (
            <ArrowRight size={px(16)} color={colors.dark} strokeWidth={2.5} />
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
