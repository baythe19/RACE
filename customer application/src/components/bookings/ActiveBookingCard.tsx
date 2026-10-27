import React from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { Copy, MapPin, Phone, Star } from 'lucide-react-native';

import { images } from '../../assets';
import DriverAvatar from './DriverAvatar';
import TripOtpCard from '../booking/TripOtpCard';
import { getBookingServiceIcon } from '../../constants/bookingsScreen';
import { brand } from '../../theme/brand';
import type { ActiveBooking } from '../../types/models';
import { formatLocationDisplay } from '../../utils/readableAddress';
import { colors, typography } from '../../theme';

type Props = {
  booking: ActiveBooking;
  px: (n: number) => number;
  onTrack?: () => void;
  onPress?: () => void;
};

export default function ActiveBookingCard({ booking, px, onTrack, onPress }: Props) {
  const ServiceIcon = getBookingServiceIcon(booking.service);
  const mapW = px(86);
  const mapH = px(64);

  return (
    <Pressable onPress={onPress} style={{ marginBottom: px(12) }}>
    <View
      style={{
        borderRadius: px(16),
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: px(4),
        borderLeftColor: colors.primary,
        backgroundColor: colors.background,
        padding: px(12),
        overflow: 'hidden',
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: px(8),
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(5) }}>
          <Text
            style={{
              fontSize: px(12),
              fontWeight: typography.weights.bold,
              color: colors.dark,
            }}>
            {booking.displayId}
          </Text>
          <Copy size={px(13)} color={colors.grey} strokeWidth={2} />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: px(4),
            paddingHorizontal: px(8),
            paddingVertical: px(3),
            borderRadius: px(20),
            backgroundColor: '#E8F8EE',
          }}>
          <View
            style={{
              width: px(5),
              height: px(5),
              borderRadius: px(3),
              backgroundColor: colors.success,
            }}
          />
          <Text
            style={{
              fontSize: px(10),
              fontWeight: typography.weights.bold,
              color: colors.success,
            }}>
            {booking.status}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: px(8) }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: px(7),
              marginBottom: px(6),
            }}>
            <View
              style={{
                width: px(28),
                height: px(28),
                borderRadius: px(14),
                backgroundColor: colors.goldLight,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
              <ServiceIcon size={px(14)} color={colors.primary} strokeWidth={2.5} />
            </View>
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                fontSize: px(13),
                fontWeight: typography.weights.bold,
                color: colors.dark,
              }}>
              {booking.service}
            </Text>
          </View>

          <View style={{ gap: px(4) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(7) }}>
              <View
                style={{
                  width: px(6),
                  height: px(6),
                  borderRadius: px(3),
                  backgroundColor: colors.primary,
                  flexShrink: 0,
                }}
              />
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  fontSize: px(11),
                  color: colors.dark,
                  lineHeight: px(15),
                }}>
                {formatLocationDisplay(booking.pickup)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(7) }}>
              <MapPin size={px(12)} color={colors.error} style={{ flexShrink: 0 }} />
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  fontSize: px(11),
                  color: colors.dark,
                  lineHeight: px(15),
                }}>
                {formatLocationDisplay(booking.drop)}
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: px(8),
              marginTop: px(8),
            }}>
            <DriverAvatar size={px(34)} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(4) }}>
                {booking.driver.rating != null ? (
                  <>
                    <Star size={px(10)} color={colors.primary} fill={colors.primary} />
                    <Text
                      style={{
                        fontSize: px(11),
                        fontWeight: typography.weights.bold,
                        color: colors.dark,
                      }}>
                      {booking.driver.rating.toFixed(1)}
                    </Text>
                  </>
                ) : null}
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: px(12),
                    fontWeight: typography.weights.bold,
                    color: colors.dark,
                  }}>
                  {booking.driver.name}
                </Text>
              </View>
              <Text style={{ fontSize: px(10), color: colors.grey, marginTop: px(1) }}>
                {booking.driver.name === 'Finding a driver'
                  ? 'Driver assignment in progress'
                  : 'Your Driver'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ width: mapW, flexShrink: 0 }}>
          <View
            style={{
              width: mapW,
              height: mapH,
              borderRadius: px(8),
              overflow: 'hidden',
            }}>
            <Image
              source={images.booking.driverPickupMap}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
            <Image
              source={images.homePopularTowing}
              style={{
                position: 'absolute',
                right: px(-4),
                bottom: px(-6),
                width: px(52),
                height: px(32),
              }}
              resizeMode="contain"
            />
          </View>
          <Text style={{ fontSize: px(9), color: colors.grey, marginTop: px(3) }}>
            Est. Arrival
          </Text>
          <Text
            style={{
              fontSize: px(15),
              fontWeight: typography.weights.extrabold,
              color: colors.dark,
              lineHeight: px(18),
            }}>
            {booking.eta}
          </Text>
        </View>
      </View>

      {booking.tripStartOtp ? (
        <View style={{ marginBottom: px(10) }}>
          <TripOtpCard
            otp={booking.tripStartOtp}
            subtitle="Share this code with your driver when they arrive to start the trip."
          />
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: px(8), marginTop: px(10) }}>
        <Pressable
          onPress={() => void Linking.openURL(`tel:${brand.phoneRaw}`)}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: px(5),
            borderRadius: px(10),
            borderWidth: 1.5,
            borderColor: colors.primary,
            paddingVertical: px(10),
          }}>
          <Phone size={px(14)} color={colors.primary} strokeWidth={2.5} />
          <Text
            style={{
              fontSize: px(12),
              fontWeight: typography.weights.bold,
              color: colors.primary,
            }}>
            Call Driver
          </Text>
        </Pressable>
        <Pressable
          onPress={onTrack}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: px(5),
            borderRadius: px(10),
            backgroundColor: colors.primary,
            paddingVertical: px(10),
          }}>
          <MapPin size={px(14)} color={colors.dark} strokeWidth={2.5} />
          <Text
            style={{
              fontSize: px(12),
              fontWeight: typography.weights.bold,
              color: colors.dark,
            }}>
            Track Live
          </Text>
        </Pressable>
      </View>
    </View>
    </Pressable>
  );
}
