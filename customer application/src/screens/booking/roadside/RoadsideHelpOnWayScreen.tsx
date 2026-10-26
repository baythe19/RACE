import React from 'react';
import { Image, Linking, Pressable, Share, Text, View } from 'react-native';
import {
  Check,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Truck,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import DriverAvatar from '../../../components/bookings/DriverAvatar';
import { images } from '../../../assets';
import {
  ROADSIDE_ACCENT,
  ROADSIDE_ACCENT_LIGHT,
  ROADSIDE_MECHANIC,
  ROADSIDE_TRACK_ETA_MINUTES,
} from '../../../constants/roadsideBooking';
import { brand } from '../../../theme/brand';
import type { HomeStackParamList } from '../../../types/navigation';
import { colors, shadows, typography } from '../../../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'RoadsideHelpOnWay'>;

const TRACK_STEPS = [
  { id: 'dispatched', label: 'Dispatched', state: 'done' as const },
  { id: 'on_route', label: 'On Route', state: 'active' as const },
  { id: 'arrived', label: 'Arrived', state: 'pending' as const },
];

export default function RoadsideHelpOnWayScreen({ navigation }: Props) {
  const { t } = useBookingTheme();

  return (
    <TowingBookingLayout
      title="Help is on the way!"
      step={4}
      accentColor={ROADSIDE_ACCENT}
      hideFooter
      onBack={() => navigation.goBack()}>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: t.body,
            fontWeight: typography.weights.semibold,
            color: colors.grey,
            textAlign: 'center',
            marginBottom: t.px(16),
          }}>
          Mechanic dispatched to your location
        </Text>

        <View style={{ alignItems: 'center', marginBottom: t.px(18) }}>
          <View
            style={{
              width: t.px(150),
              height: t.px(150),
              borderRadius: t.px(75),
              borderWidth: 3,
              borderColor: ROADSIDE_ACCENT,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Image
              source={images.booking.roadsideHelpTruck}
              style={{ width: t.px(110), height: t.px(80) }}
              resizeMode="contain"
            />
          </View>
        </View>

        <View
          style={[
            {
              borderRadius: t.cardRadius,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.background,
              padding: t.cardPadding,
              marginBottom: t.px(16),
            },
            shadows.card,
          ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.px(12) }}>
            <DriverAvatar
              size={t.px(64)}
              accentColor={ROADSIDE_ACCENT}
              borderColor={ROADSIDE_ACCENT}
              role="mechanic"
            />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.px(6) }}>
                <Text
                  style={{
                    fontSize: t.labelBold,
                    fontWeight: typography.weights.bold,
                    color: colors.dark,
                  }}>
                  {ROADSIDE_MECHANIC.name}
                </Text>
                <Star size={t.px(14)} color={ROADSIDE_ACCENT} fill={ROADSIDE_ACCENT} />
                <Text
                  style={{
                    fontSize: t.body,
                    fontWeight: typography.weights.semibold,
                    color: colors.grey,
                  }}>
                  {ROADSIDE_MECHANIC.rating}
                </Text>
              </View>
              <View
                style={{
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.px(4),
                  marginTop: t.px(6),
                  paddingHorizontal: t.px(10),
                  paddingVertical: t.px(4),
                  borderRadius: t.px(14),
                  backgroundColor: ROADSIDE_ACCENT_LIGHT,
                }}>
                <ShieldCheck size={t.px(12)} color={ROADSIDE_ACCENT} />
                <Text
                  style={{
                    fontSize: t.caption,
                    fontWeight: typography.weights.bold,
                    color: ROADSIDE_ACCENT,
                  }}>
                  Verified Mechanic
                </Text>
              </View>
              <Text
                style={{
                  marginTop: t.px(8),
                  fontSize: t.caption,
                  fontWeight: typography.weights.semibold,
                  color: colors.grey,
                }}>
                ETA: {ROADSIDE_TRACK_ETA_MINUTES} min
              </Text>
            </View>
          </View>
        </View>

        <View style={{ alignItems: 'center', marginBottom: t.px(20) }}>
          <Text
            style={{
              fontSize: t.bodyLarge,
              fontWeight: typography.weights.semibold,
              color: colors.dark,
            }}>
            Arriving in
          </Text>
          <Text
            style={{
              fontSize: t.px(32),
              fontWeight: typography.weights.extrabold,
              color: ROADSIDE_ACCENT,
            }}>
            {ROADSIDE_TRACK_ETA_MINUTES} min
          </Text>
        </View>

        <View style={{ marginBottom: t.px(20) }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: t.px(4),
            }}>
            {TRACK_STEPS.map((step, index) => {
              const isDone = step.state === 'done';
              const isActive = step.state === 'active';
              const Icon =
                step.id === 'dispatched' ? Check : step.id === 'on_route' ? Truck : MapPin;

              return (
                <React.Fragment key={step.id}>
                  {index > 0 ? (
                    <View
                      style={{
                        flex: 1,
                        height: 2,
                        backgroundColor: index === 1 ? colors.success : colors.border,
                      }}
                    />
                  ) : null}
                  <View
                    style={{
                      width: t.px(36),
                      height: t.px(36),
                      borderRadius: t.px(18),
                      backgroundColor: isDone
                        ? colors.success
                        : isActive
                          ? ROADSIDE_ACCENT
                          : colors.lightGrey,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Icon
                      size={t.px(16)}
                      color={isDone || isActive ? colors.background : colors.grey}
                      strokeWidth={2.5}
                    />
                  </View>
                </React.Fragment>
              );
            })}
          </View>

          <View
            style={{
              flexDirection: 'row',
              marginTop: t.px(8),
            }}>
            {TRACK_STEPS.map(step => {
              const isActive = step.state === 'active';
              return (
                <Text
                  key={step.id}
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    fontSize: t.px(11),
                    fontWeight: typography.weights.bold,
                    color: isActive ? ROADSIDE_ACCENT : colors.dark,
                    textAlign: 'center',
                  }}>
                  {step.label}
                </Text>
              );
            })}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: t.px(10), marginTop: 'auto' }}>
          <Pressable
            onPress={() => void Linking.openURL(`tel:${brand.phoneRaw}`)}
            style={{
              flex: 1,
              minHeight: t.px(52),
              borderRadius: t.inputRadius,
              borderWidth: 1.5,
              borderColor: ROADSIDE_ACCENT,
              backgroundColor: colors.background,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: t.px(8),
              paddingVertical: t.px(10),
              gap: t.px(4),
            }}>
            <Phone size={t.px(18)} color={ROADSIDE_ACCENT} />
            <Text
              style={{
                fontSize: t.px(12),
                fontWeight: typography.weights.bold,
                color: ROADSIDE_ACCENT,
                textAlign: 'center',
              }}>
              Call Mechanic
            </Text>
          </Pressable>
          <Pressable
            onPress={async () => {
              try {
                await Share.share({
                  message: `RACE Roadside Assistance: A mechanic (${ROADSIDE_MECHANIC.name}) is on the way to my breakdown location. ETA: ~${ROADSIDE_TRACK_ETA_MINUTES} mins. Emergency Helpline: ${brand.phone}`,
                  title: 'RACE Live Roadside Help',
                });
              } catch {
                // share sheet closed
              }
            }}
            style={{
              flex: 1,
              minHeight: t.px(52),
              borderRadius: t.inputRadius,
              borderWidth: 1.5,
              borderColor: ROADSIDE_ACCENT,
              backgroundColor: colors.background,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: t.px(8),
              paddingVertical: t.px(10),
              gap: t.px(4),
            }}>
            <MapPin size={t.px(18)} color={ROADSIDE_ACCENT} />
            <Text
              numberOfLines={2}
              style={{
                fontSize: t.px(11),
                fontWeight: typography.weights.bold,
                color: ROADSIDE_ACCENT,
                textAlign: 'center',
                lineHeight: t.px(14),
              }}>
              Share Live Location
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => {
            const parent = navigation.getParent();
            if (parent) {
              parent.navigate('Bookings' as any);
            } else {
              navigation.navigate('HomeMain' as any);
            }
          }}
          style={{
            marginTop: t.px(12),
            width: '100%',
            height: t.px(48),
            borderRadius: t.inputRadius,
            backgroundColor: ROADSIDE_ACCENT,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text
            style={{
              fontSize: t.body,
              fontWeight: typography.weights.bold,
              color: colors.background,
            }}>
            Done · Go to Bookings
          </Text>
        </Pressable>
      </View>
    </TowingBookingLayout>
  );
}
