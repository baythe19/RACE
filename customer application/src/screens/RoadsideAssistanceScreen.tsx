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
import ServiceNavHeader from '../components/services/ServiceNavHeader';
import { getServiceCategoryCard } from '../constants/serviceCategoryCards';
import { useCatalogStore } from '../store/catalogStore';
import { brand } from '../theme/brand';
import type { HomeStackParamList } from '../types/navigation';
import { colors, shadows, typography } from '../theme';

const REF_W = 390;

type Props = NativeStackScreenProps<HomeStackParamList, 'RoadsideAssistance'>;

const ROADSIDE_OPTIONS = [
  {
    id: 'flat_tyre',
    title: 'Flat Tyre Assistance',
    price: 'From ₹199',
    Icon: Disc,
  },
  {
    id: 'battery_jumpstart',
    title: 'Battery Jumpstart',
    price: 'From ₹199',
    Icon: BatteryCharging,
  },
  {
    id: 'fuel_delivery',
    title: 'Fuel Delivery',
    price: 'From ₹299',
    Icon: Fuel,
  },
  {
    id: 'minor_repair',
    title: 'Minor Mechanical Fix',
    price: 'From ₹399',
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

  const bookRoadside = () => {
    navigation.navigate('RoadsideSelectService');
  };

  const callSupport = () => {
    const phone = apiBrand?.phoneRaw ?? brand.phoneRaw;
    void Linking.openURL(`tel:${phone}`);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ServiceNavHeader title="Roadside Assistance" onBack={() => navigation.goBack()} />

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
          On-spot help · Fair upfront pricing
        </Text>

        {/* Roadside Options List */}
        <View style={{ gap: px(10) }}>
          {ROADSIDE_OPTIONS.map(opt => (
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

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: px(14),
                    fontWeight: typography.weights.bold,
                    color: colors.dark,
                  }}>
                  {opt.title}
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
                onPress={() => bookRoadside()}
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
          onPress={() => bookRoadside()}
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
            Book Service
          </Text>
          <ArrowRight size={px(16)} color={colors.dark} strokeWidth={2.5} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
