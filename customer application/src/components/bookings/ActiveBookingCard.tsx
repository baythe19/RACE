import React from 'react';
import { Clipboard, Linking, Pressable, Text, View } from 'react-native';
import { Copy, MapPin, Phone } from 'lucide-react-native';

import DriverAvatar from './DriverAvatar';
import TripOtpCard from '../booking/TripOtpCard';
import { getBookingServiceIcon } from '../../constants/bookingsScreen';
import { brand } from '../../theme/brand';
import type { ActiveBooking } from '../../types/models';
import { getAppDialog } from '../../utils/alertBus';
import { formatLocationDisplay } from '../../utils/readableAddress';
import { colors, shadows, typography } from '../../theme';

type Props = {
  booking: ActiveBooking;
  px: (n: number) => number;
  onTrack?: () => void;
  onPress?: () => void;
};

export default function ActiveBookingCard({ booking, px, onTrack, onPress }: Props) {
  const ServiceIcon = getBookingServiceIcon(booking.service);
  const callPhone = booking.driver.phone?.trim() || brand.phoneRaw;

  const copyBookingId = () => {
    const raw = booking.displayId.replace(/^#/, '');
    Clipboard.setString(raw);
    getAppDialog().showDialog({
      tone: 'success',
      title: 'Copied',
      message: raw,
      primaryLabel: 'OK',
    });
  };

  return (
    <Pressable onPress={onPress} style={{ marginBottom: px(10) }}>
      <View
        style={[
          shadows.cardSoft,
          {
            borderRadius: px(14),
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
            padding: px(12),
          },
        ]}>
        {/* ID + status + ETA */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: px(8),
            gap: px(8),
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(5), flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{
                fontSize: px(11),
                fontWeight: typography.weights.bold,
                color: colors.dark,
              }}>
              {booking.displayId}
            </Text>
            <Pressable
              onPress={copyBookingId}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Copy booking ID">
              <Copy size={px(12)} color={colors.grey} strokeWidth={2} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(6) }}>
            {booking.eta && booking.eta !== 'Updating' ? (
              <Text
                style={{
                  fontSize: px(11),
                  fontWeight: typography.weights.semibold,
                  color: colors.grey,
                }}>
                {booking.eta}
              </Text>
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: px(4),
                paddingHorizontal: px(8),
                paddingVertical: px(3),
                borderRadius: px(8),
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
        </View>

        {/* Service */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: px(8),
            marginBottom: px(8),
          }}>
          <View
            style={{
              width: px(28),
              height: px(28),
              borderRadius: px(8),
              backgroundColor: '#F3F4F6',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <ServiceIcon size={px(14)} color={colors.dark} strokeWidth={2.2} />
          </View>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: px(14),
              fontWeight: typography.weights.bold,
              color: colors.dark,
            }}>
            {booking.service}
          </Text>
        </View>

        {/* Route */}
        <View style={{ gap: px(5), marginBottom: px(8) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(8) }}>
            <View
              style={{
                width: px(6),
                height: px(6),
                borderRadius: px(3),
                backgroundColor: colors.dark,
              }}
            />
            <Text numberOfLines={1} style={{ flex: 1, fontSize: px(12), color: colors.dark }}>
              {formatLocationDisplay(booking.pickup)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(8) }}>
            <MapPin size={px(12)} color={colors.error} />
            <Text numberOfLines={1} style={{ flex: 1, fontSize: px(12), color: colors.dark }}>
              {formatLocationDisplay(booking.drop)}
            </Text>
          </View>
        </View>

        {/* Driver — name only (no rating on list cards) */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: px(8),
            marginBottom: booking.tripStartOtp ? px(8) : 0,
          }}>
          <DriverAvatar size={px(28)} />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: px(12),
              fontWeight: typography.weights.semibold,
              color: colors.dark,
            }}>
            {booking.driver.name}
          </Text>
        </View>

        {booking.tripStartOtp ? (
          <TripOtpCard
            otp={booking.tripStartOtp}
            compact
            subtitle="Share at pickup to start."
          />
        ) : null}

        <View style={{ flexDirection: 'row', gap: px(8), marginTop: px(10) }}>
          <Pressable
            onPress={() => void Linking.openURL(`tel:${callPhone}`)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: px(5),
              borderRadius: px(10),
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.background,
              paddingVertical: px(9),
            }}>
            <Phone size={px(14)} color={colors.dark} strokeWidth={2.2} />
            <Text
              style={{
                fontSize: px(12),
                fontWeight: typography.weights.bold,
                color: colors.dark,
              }}>
              Call
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
              paddingVertical: px(9),
            }}>
            <MapPin size={px(14)} color={colors.dark} strokeWidth={2.2} />
            <Text
              style={{
                fontSize: px(12),
                fontWeight: typography.weights.bold,
                color: colors.dark,
              }}>
              Track
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
