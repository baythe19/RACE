import React from 'react';
import {
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Activity,
  Building2,
  FileCheck2,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import ServiceCategoryArtCard from '../components/services/ServiceCategoryArtCard';
import ServiceNavHeader from '../components/services/ServiceNavHeader';
import { getServiceCategoryCard } from '../constants/serviceCategoryCards';
import type { HomeStackParamList } from '../types/navigation';
import { colors, shadows, typography } from '../theme';

const REF_W = 390;

type Props = NativeStackScreenProps<HomeStackParamList, 'MoreServices'>;

const UPCOMING_SERVICES = [
  {
    id: 'car_wash',
    title: 'Car Wash',
    description: 'Professional cleaning at your doorstep',
    Icon: Sparkles,
  },
  {
    id: 'inspection',
    title: 'Vehicle Inspection',
    description: 'Pre-purchase & health checks',
    Icon: FileCheck2,
  },
  {
    id: 'insurance',
    title: 'Insurance Assistance',
    description: 'Claims, renewals & support',
    Icon: ShieldAlert,
  },
  {
    id: 'ev_charging',
    title: 'EV Charging Support',
    description: 'Mobile charging for EVs',
    Icon: Zap,
  },
  {
    id: 'ambulance',
    title: 'Ambulance Service',
    description: 'Emergency medical transport',
    Icon: Activity,
  },
  {
    id: 'corporate_fleet',
    title: 'Corporate Fleet',
    description: 'Fleet management & bulk solutions',
    Icon: Building2,
  },
];

export default function MoreServicesScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const s = width / REF_W;
  const px = (n: number) => Math.round(n * s);
  const heroCard = getServiceCategoryCard('future');

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ServiceNavHeader title="More Services" onBack={() => navigation.goBack()} />

      <ScrollView
        style={{ backgroundColor: colors.pageBg }}
        contentContainerStyle={{
          paddingHorizontal: px(14),
          paddingTop: px(12),
          paddingBottom: px(36),
          gap: px(10),
        }}
        showsVerticalScrollIndicator={false}>
        <ServiceCategoryArtCard card={heroCard} />

        {/* Upcoming Services List */}
        {UPCOMING_SERVICES.map(item => (
          <View
            key={item.id}
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
              <item.Icon size={px(20)} color={colors.primary} strokeWidth={2.6} />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: px(14),
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                }}>
                {item.title}
              </Text>
              <Text
                style={{
                  fontSize: px(11),
                  color: colors.grey,
                  marginTop: px(2),
                }}>
                {item.description}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: '#F3F4F6',
                paddingHorizontal: px(10),
                paddingVertical: px(4),
                borderRadius: px(8),
              }}>
              <Text
                style={{
                  fontSize: px(11),
                  fontWeight: typography.weights.semibold,
                  color: '#6B7280',
                }}>
                Soon
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
