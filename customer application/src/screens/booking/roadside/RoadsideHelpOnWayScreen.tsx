import React from 'react';
import { Linking, Pressable, Share, Text, View } from 'react-native';
import { Check, MapPin, Phone, ShieldCheck, Star, Wrench } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import DriverAvatar from '../../../components/bookings/DriverAvatar';
import {
  ROADSIDE_ACCENT,
  ROADSIDE_ACCENT_LIGHT,
  ROADSIDE_MECHANIC,
  ROADSIDE_TRACK_ETA_MINUTES,
} from '../../../constants/roadsideBooking';
import { brand } from '../../../theme/brand';
import type { HomeStackParamList } from '../../../types/navigation';
import { colors, shadows, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'RoadsideHelpOnWay'>;

const TRACK_STEPS = [
  { id: 'dispatched', label: 'Dispatched', done: true, active: false },
  { id: 'on_route', label: 'On the way', done: false, active: true },
  { id: 'arrived', label: 'Arrived', done: false, active: false },
] as const;

export default function RoadsideHelpOnWayScreen({ navigation }: Props) {
  const { t } = useBookingTheme();

  const goBookings = () => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('Bookings' as never);
    } else {
      navigation.navigate('HomeMain' as never);
    }
  };

  const callSupport = () => {
    void Linking.openURL(`tel:${brand.phoneRaw}`);
  };

  const shareLocation = async () => {
    try {
      await Share.share({
        message: `RACE roadside help: ${ROADSIDE_MECHANIC.name} is on the way. ETA ~${ROADSIDE_TRACK_ETA_MINUTES} min. Helpline: ${brand.phone}`,
        title: 'RACE roadside help',
      });
    } catch {
      // dismissed
    }
  };

  return (
    <TowingBookingLayout
      title="Help is on the way"
      step={0}
      showStep={false}
      accentColor={ROADSIDE_ACCENT}
      scrollable
      onBack={() => goBackWithinStack(navigation)}
      buttonLabel="View in Bookings"
      onContinue={goBookings}
      secondaryLabel="Call support"
      onSecondary={callSupport}
      secondaryVariant="outline">
      <View style={{ gap: t.px(14), paddingBottom: t.px(8) }}>
        {/* Success hero — matches towing confirmed rhythm */}
        <View
          style={[
            {
              borderRadius: t.cardRadius,
              backgroundColor: ROADSIDE_ACCENT_LIGHT,
              borderWidth: 1,
              borderColor: '#FDE8C4',
              alignItems: 'center',
              paddingHorizontal: t.px(18),
              paddingTop: t.px(20),
              paddingBottom: t.px(18),
            },
            shadows.cardSoft,
          ]}>
          <View
            style={{
              width: t.px(64),
              height: t.px(64),
              borderRadius: t.px(32),
              backgroundColor: ROADSIDE_ACCENT,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Wrench size={t.px(30)} color={colors.background} strokeWidth={2.2} />
          </View>
          <Text
            style={{
              marginTop: t.px(12),
              fontSize: t.px(19),
              fontWeight: typography.weights.extrabold,
              color: colors.dark,
              textAlign: 'center',
            }}>
            Partner assigned
          </Text>
          <Text
            style={{
              marginTop: t.px(4),
              fontSize: t.body,
              color: colors.grey,
              textAlign: 'center',
              lineHeight: t.px(20),
              paddingHorizontal: t.px(8),
            }}>
            A verified mechanic is heading to your breakdown spot.
          </Text>
          <View
            style={{
              marginTop: t.px(14),
              paddingHorizontal: t.px(14),
              paddingVertical: t.px(8),
              borderRadius: t.px(999),
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: ROADSIDE_ACCENT,
            }}>
            <Text
              style={{
                fontSize: t.body,
                fontWeight: typography.weights.semibold,
                color: colors.dark,
                textAlign: 'center',
              }}>
              ETA{' '}
              <Text style={{ color: ROADSIDE_ACCENT, fontWeight: typography.weights.extrabold }}>
                ~{ROADSIDE_TRACK_ETA_MINUTES} min
              </Text>
            </Text>
          </View>
        </View>

        {/* Partner card */}
        <View
          style={[
            {
              borderRadius: t.cardRadius,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.background,
              padding: t.px(14),
            },
            shadows.cardSoft,
          ]}>
          <Text
            style={{
              fontSize: t.caption,
              fontWeight: typography.weights.semibold,
              color: colors.grey,
              marginBottom: t.px(10),
            }}>
            Your mechanic
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.px(12) }}>
            <DriverAvatar
              size={t.px(52)}
              accentColor={ROADSIDE_ACCENT}
              borderColor={ROADSIDE_ACCENT}
              role="mechanic"
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  fontSize: t.bodyLarge,
                  fontWeight: typography.weights.semibold,
                  color: colors.dark,
                }}>
                {ROADSIDE_MECHANIC.name}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: t.px(8),
                  marginTop: t.px(6),
                }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.px(4),
                    paddingHorizontal: t.px(8),
                    paddingVertical: t.px(3),
                    borderRadius: t.px(12),
                    backgroundColor: ROADSIDE_ACCENT_LIGHT,
                  }}>
                  <ShieldCheck size={t.px(12)} color={ROADSIDE_ACCENT} strokeWidth={2.2} />
                  <Text
                    style={{
                      fontSize: t.px(11),
                      fontWeight: typography.weights.semibold,
                      color: ROADSIDE_ACCENT,
                    }}>
                    Verified
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.px(3) }}>
                  <Star size={t.px(12)} color="#F59E0B" fill="#F59E0B" />
                  <Text
                    style={{
                      fontSize: t.px(12),
                      fontWeight: typography.weights.semibold,
                      color: colors.grey,
                    }}>
                    {ROADSIDE_MECHANIC.rating}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Live status */}
        <View
          style={{
            borderRadius: t.cardRadius,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
            paddingHorizontal: t.px(12),
            paddingVertical: t.px(14),
          }}>
          <Text
            style={{
              fontSize: t.caption,
              fontWeight: typography.weights.semibold,
              color: colors.grey,
              marginBottom: t.px(14),
            }}>
            Live status
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            {TRACK_STEPS.map((step, index) => {
              const dotColor = step.done
                ? colors.success
                : step.active
                  ? ROADSIDE_ACCENT
                  : colors.border;
              const lineDone = index > 0 && (step.done || step.active || TRACK_STEPS[index - 1]?.done);

              return (
                <View key={step.id} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                    {index > 0 ? (
                      <View
                        style={{
                          flex: 1,
                          height: 2,
                          backgroundColor: lineDone ? colors.success : colors.border,
                          marginRight: t.px(4),
                        }}
                      />
                    ) : (
                      <View style={{ flex: 1 }} />
                    )}
                    <View
                      style={{
                        width: t.px(28),
                        height: t.px(28),
                        borderRadius: t.px(14),
                        backgroundColor: step.done || step.active ? dotColor : colors.pageBg,
                        borderWidth: step.done || step.active ? 0 : 1.5,
                        borderColor: colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      {step.done ? (
                        <Check size={t.px(14)} color={colors.background} strokeWidth={2.8} />
                      ) : step.active ? (
                        <View
                          style={{
                            width: t.px(8),
                            height: t.px(8),
                            borderRadius: t.px(4),
                            backgroundColor: colors.background,
                          }}
                        />
                      ) : null}
                    </View>
                    {index < TRACK_STEPS.length - 1 ? (
                      <View
                        style={{
                          flex: 1,
                          height: 2,
                          backgroundColor:
                            step.done || step.active ? colors.success : colors.border,
                          marginLeft: t.px(4),
                        }}
                      />
                    ) : (
                      <View style={{ flex: 1 }} />
                    )}
                  </View>
                  <Text
                    numberOfLines={2}
                    style={{
                      marginTop: t.px(8),
                      fontSize: t.px(10),
                      fontWeight: step.active ? typography.weights.semibold : typography.weights.medium,
                      color: step.active ? ROADSIDE_ACCENT : colors.grey,
                      textAlign: 'center',
                      lineHeight: t.px(13),
                      paddingHorizontal: t.px(2),
                    }}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', gap: t.px(10) }}>
          <Pressable
            onPress={callSupport}
            style={({ pressed }) => [
              shadows.subtle,
              {
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: t.px(8),
                minHeight: t.px(48),
                borderRadius: t.px(14),
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                opacity: pressed ? 0.9 : 1,
              },
            ]}>
            <Phone size={t.px(18)} color={colors.dark} strokeWidth={2} />
            <Text
              style={{
                fontSize: t.px(13),
                fontWeight: typography.weights.semibold,
                color: colors.dark,
              }}>
              Call
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void shareLocation()}
            style={({ pressed }) => [
              shadows.subtle,
              {
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: t.px(8),
                minHeight: t.px(48),
                borderRadius: t.px(14),
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                opacity: pressed ? 0.9 : 1,
              },
            ]}>
            <MapPin size={t.px(18)} color={colors.dark} strokeWidth={2} />
            <Text
              style={{
                fontSize: t.px(13),
                fontWeight: typography.weights.semibold,
                color: colors.dark,
              }}>
              Share
            </Text>
          </Pressable>
        </View>

        <Text
          style={{
            fontSize: t.caption,
            color: colors.grey,
            textAlign: 'center',
            lineHeight: t.px(17),
            paddingHorizontal: t.px(4),
          }}>
          Track updates and chat with your partner from the Bookings tab once the trip starts.
        </Text>
      </View>
    </TowingBookingLayout>
  );
}
