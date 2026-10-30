import React from 'react';
import { Clipboard, Linking, Pressable, Text, View } from 'react-native';
import { Copy, MapPin, Phone } from 'lucide-react-native';

import DriverAvatar from './DriverAvatar';
import TripOtpCard from '../booking/TripOtpCard';
import { getBookingServiceIcon } from '../../constants/bookingsScreen';
import { brand } from '../../theme/brand';
import type { ActiveBooking, ActiveBookingLocation } from '../../types/models';
import { getAppDialog } from '../../utils/alertBus';
import { colors, shadows, typography } from '../../theme';

type Props = {
  booking: ActiveBooking;
  px: (n: number) => number;
  onTrack?: () => void;
  onPress?: () => void;
};

function LocationLine({
  px,
  tag,
  loc,
}: {
  px: (n: number) => number;
  tag: string;
  loc: ActiveBookingLocation;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: px(6), flex: 1, minWidth: 0 }}>
      <Text
        style={{
          width: px(34),
          fontSize: px(10),
          fontWeight: typography.weights.semibold,
          color: colors.grey,
          paddingTop: px(1),
        }}>
        {tag}
      </Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={2}
          style={{
            fontSize: px(11.5),
            fontWeight: typography.weights.bold,
            color: colors.dark,
            lineHeight: px(15),
          }}>
          {loc.primary}
        </Text>
        {loc.secondary ? (
          <Text
            numberOfLines={1}
            style={{
              fontSize: px(10),
              color: colors.grey,
              marginTop: px(2),
            }}>
            {loc.secondary}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function ActiveBookingCard({ booking, px, onTrack, onPress }: Props) {
  const ServiceIcon = getBookingServiceIcon(booking.service);
  const callPhone = booking.driver.phone?.trim() || brand.phoneRaw;
  const showDrop = booking.drop != null;
  const searching =
    /finding|matching|confirmed · finding|awaiting/i.test(booking.status) ||
    /matching|must accept|pending/i.test(booking.driver.name);

  const statusBg = searching ? '#FFF7ED' : '#E8F8EE';
  const statusFg = searching ? '#C2410C' : colors.success;
  const statusDot = searching ? '#F97316' : colors.success;

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
    <Pressable onPress={onPress} style={{ marginBottom: px(8) }}>
      <View
        style={[
          shadows.cardSoft,
          {
            borderRadius: px(12),
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
            paddingHorizontal: px(10),
            paddingVertical: px(10),
          },
        ]}>
        {/* Service + status — one row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: px(8),
            marginBottom: px(6),
          }}>
          <View
            style={{
              width: px(26),
              height: px(26),
              borderRadius: px(8),
              backgroundColor: '#F3F4F6',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
            <ServiceIcon size={px(13)} color={colors.dark} strokeWidth={2.2} />
          </View>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: px(13.5),
              fontWeight: typography.weights.bold,
              color: colors.dark,
            }}>
            {booking.service}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: px(4),
              paddingHorizontal: px(7),
              paddingVertical: px(3),
              borderRadius: px(8),
              backgroundColor: statusBg,
              flexShrink: 0,
              maxWidth: '46%',
            }}>
            <View
              style={{
                width: px(5),
                height: px(5),
                borderRadius: px(3),
                backgroundColor: statusDot,
              }}
            />
            <Text
              numberOfLines={1}
              style={{
                fontSize: px(9),
                fontWeight: typography.weights.bold,
                color: statusFg,
              }}>
              {booking.status}
            </Text>
          </View>
        </View>

        {/* Booking ID + ETA — one row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: px(8),
            gap: px(6),
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(4), flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{
                fontSize: px(10),
                fontWeight: typography.weights.semibold,
                color: colors.grey,
              }}>
              {booking.displayId}
            </Text>
            <Pressable
              onPress={copyBookingId}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Copy booking ID">
              <Copy size={px(11)} color={colors.grey} strokeWidth={2} />
            </Pressable>
          </View>
          {booking.eta && booking.eta !== 'Updating' ? (
            <Text
              style={{
                fontSize: px(10),
                fontWeight: typography.weights.bold,
                color: colors.primary,
                flexShrink: 0,
              }}>
              {booking.eta}
            </Text>
          ) : null}
        </View>

        {/* Route — compact inline block */}
        <View
          style={{
            borderRadius: px(10),
            backgroundColor: colors.pageBg,
            paddingHorizontal: px(10),
            paddingVertical: px(8),
            marginBottom: px(8),
          }}>
          {showDrop ? (
            <View style={{ gap: px(8) }}>
              <LocationLine px={px} tag="From" loc={booking.pickup} />
              <LocationLine px={px} tag="To" loc={booking.drop!} />
            </View>
          ) : (
            <LocationLine px={px} tag="At" loc={booking.pickup} />
          )}
        </View>

        {/* Partner + dispatch hint */}
        <View style={{ marginBottom: booking.tripStartOtp ? px(8) : 0 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: px(8),
            }}>
            <DriverAvatar size={px(26)} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: px(11.5),
                  fontWeight: typography.weights.semibold,
                  color: colors.dark,
                }}>
                {booking.driver.name}
              </Text>
              {booking.dispatchHint ? (
                <Text
                  numberOfLines={2}
                  style={{
                    fontSize: px(10),
                    color: colors.grey,
                    marginTop: px(2),
                    lineHeight: px(14),
                  }}>
                  {booking.dispatchHint}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {booking.tripStartOtp ? (
          <TripOtpCard otp={booking.tripStartOtp} compact subtitle="Share at pickup to start." />
        ) : null}

        <View style={{ flexDirection: 'row', gap: px(8), marginTop: px(8) }}>
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
              paddingVertical: px(8),
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
              paddingVertical: px(8),
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
