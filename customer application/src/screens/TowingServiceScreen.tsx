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
  AlertTriangle,
  ArrowRight,
  Calendar,
  Car,
  Clock,
  Phone,
  Shield,
  ShieldCheck,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import ServiceCategoryArtCard from '../components/services/ServiceCategoryArtCard';
import ServiceNavHeader from '../components/services/ServiceNavHeader';
import { getServiceCategoryCard } from '../constants/serviceCategoryCards';
import { useTowingBooking } from '../context/TowingBookingContext';
import { useCatalogStore } from '../store/catalogStore';
import { brand } from '../theme/brand';
import type { HomeStackParamList } from '../types/navigation';
import type { TowingServiceModeId } from '../types/towingBooking';
import { colors, shadows, typography } from '../theme';

const REF_W = 390;

type Props = NativeStackScreenProps<HomeStackParamList, 'TowingService'>;

const TOWING_OPTIONS = [
  {
    id: 'instant' as TowingServiceModeId,
    title: 'Instant Towing',
    subtitle: 'Dispatched immediately',
    price: 'From ₹499',
    Icon: Car,
  },
  {
    id: 'scheduled' as TowingServiceModeId,
    title: 'Scheduled Towing',
    subtitle: 'Book in advance',
    price: 'From ₹399',
    Icon: Calendar,
  },
  {
    id: 'emergency' as TowingServiceModeId,
    title: 'Emergency Towing',
    subtitle: 'Priority response',
    price: 'From ₹699',
    Icon: AlertTriangle,
  },
];

export default function TowingServiceScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const s = width / REF_W;
  const px = (n: number) => Math.round(n * s);
  const insets = useSafeAreaInsets();
  const heroCard = getServiceCategoryCard('towing');

  const { updateBooking } = useTowingBooking();
  const apiBrand = useCatalogStore(state => state.brand);

  const bookTowing = (serviceMode: TowingServiceModeId) => {
    updateBooking({ serviceMode });
    navigation.navigate('TowingChooseVehicle');
  };

  const callSupport = () => {
    const phone = apiBrand?.phoneRaw ?? brand.phoneRaw;
    void Linking.openURL(`tel:${phone}`);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ServiceNavHeader title="Towing Service" onBack={() => navigation.goBack()} />

      <ScrollView
        style={{ backgroundColor: colors.pageBg }}
        contentContainerStyle={{
          paddingHorizontal: px(14),
          paddingTop: px(12),
          paddingBottom: px(100),
          gap: px(12),
        }}
        showsVerticalScrollIndicator={false}>
        <View style={{ marginBottom: px(4) }}>
          <ServiceCategoryArtCard card={heroCard} />

          {/* Quick Trust Bar — attached to the bottom of the hero card */}
          <View
            style={[
              shadows.cardSoft,
              {
                marginHorizontal: px(10),
                marginTop: -px(24),
                flexDirection: 'row',
                justifyContent: 'space-between',
                backgroundColor: colors.background,
                borderRadius: px(16),
                paddingVertical: px(14),
                paddingHorizontal: px(10),
                borderWidth: 1,
                borderColor: '#F0EFEA',
              },
            ]}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Clock size={px(18)} color={colors.primary} strokeWidth={2.5} />
              <Text
                style={{
                  marginTop: px(4),
                  fontSize: px(11),
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                  textAlign: 'center',
                }}>
                30 min{'\n'}
                <Text style={{ fontWeight: typography.weights.regular, color: colors.grey }}>
                  arrival
                </Text>
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#EEEEEE', marginVertical: px(4) }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <ShieldCheck size={px(18)} color={colors.primary} strokeWidth={2.5} />
              <Text
                style={{
                  marginTop: px(4),
                  fontSize: px(11),
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                  textAlign: 'center',
                }}>
                Verified{'\n'}
                <Text style={{ fontWeight: typography.weights.regular, color: colors.grey }}>
                  drivers
                </Text>
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#EEEEEE', marginVertical: px(4) }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Shield size={px(18)} color={colors.primary} strokeWidth={2.5} />
              <Text
                style={{
                  marginTop: px(4),
                  fontSize: px(11),
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                  textAlign: 'center',
                }}>
                Safe &{'\n'}
                <Text style={{ fontWeight: typography.weights.regular, color: colors.grey }}>
                  insured
                </Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Towing Options List */}
        <View style={{ gap: px(10) }}>
          {TOWING_OPTIONS.map(opt => (
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
                onPress={() => bookTowing(opt.id)}
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
          onPress={() => bookTowing('instant')}
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
            Book Towing
          </Text>
          <ArrowRight size={px(16)} color={colors.dark} strokeWidth={2.5} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
