import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import {
  DRIVER_ACCENT,
  DRIVER_DATE_OPTIONS,
  DRIVER_LIGHT_BG,
  DRIVER_PACKAGES,
  DRIVER_TIME_OPTIONS,
  getPackagePrice,
} from '../../../constants/driverBooking';
import { useDriverBooking } from '../../../context/DriverBookingContext';
import type { HomeStackParamList } from '../../../types/navigation';
import type { DriverPackageHours } from '../../../types/fare';
import type { DriverTimeId, DriverDurationId } from '../../../types/driverBooking';
import { formatRupee } from '../../../utils/driverPricing';
import { colors, shadows, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'DriverBookingDateTime'>;

function packageHoursToDurationId(hours: DriverPackageHours): DriverDurationId {
  if (hours === 2 || hours === 4 || hours === 8) {
    return String(hours) as DriverDurationId;
  }
  return 'custom';
}

export default function DriverBookingDateTimeScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, updateBooking } = useDriverBooking();
  const [dateId, setDateId] = useState(booking.dateId);
  const [timeId, setTimeId] = useState<DriverTimeId>(booking.timeId);
  const [packageHours, setPackageHours] = useState<DriverPackageHours>(booking.packageHours);
  const vehicleCategory = booking.vehicleCategory ?? 'hatchback';

  return (
    <TowingBookingLayout
      title="Select Package & Time"
      step={3}
      accentColor={DRIVER_ACCENT}
      scrollable
      onBack={() => goBackWithinStack(navigation)}
      onContinue={() => {
        const pkg = DRIVER_PACKAGES.find(p => p.hours === packageHours);
        updateBooking({
          dateId,
          timeId,
          packageHours,
          hours: packageHours,
          durationId: packageHoursToDurationId(packageHours),
          includedKm: pkg?.km,
        });
        navigation.navigate('DriverBookingReview');
      }}>
      <Text
        style={{
          fontSize: t.sectionTitle,
          fontWeight: typography.weights.bold,
          color: colors.dark,
          marginBottom: t.px(10),
        }}>
        Select Package
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: t.px(10),
          paddingRight: t.px(4),
          paddingBottom: t.px(4),
        }}>
        {DRIVER_PACKAGES.map(pkg => {
          const selected = packageHours === pkg.hours;
          const price = booking.vehicleCategory
            ? getPackagePrice(pkg.hours, vehicleCategory)
            : null;

          return (
            <Pressable
              key={pkg.hours}
              onPress={() => setPackageHours(pkg.hours)}
              style={{
                width: t.px(130),
                borderRadius: t.inputRadius,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? DRIVER_ACCENT : colors.border,
                backgroundColor: selected ? DRIVER_LIGHT_BG : colors.background,
                padding: t.px(14),
                gap: t.px(6),
              }}>
              <Text
                style={{
                  fontSize: t.labelBold,
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                }}>
                {pkg.label}
              </Text>
              <Text style={{ fontSize: t.caption, color: colors.grey }}>{pkg.sublabel}</Text>
              {price !== null ? (
                <Text
                  style={{
                    fontSize: t.body,
                    fontWeight: typography.weights.bold,
                    color: selected ? DRIVER_ACCENT : colors.dark,
                    marginTop: t.px(4),
                  }}>
                  {formatRupee(price)}
                </Text>
              ) : (
                <Text style={{ fontSize: t.caption, color: colors.grey, marginTop: t.px(4) }}>
                  Select vehicle first
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <Text
        style={{
          fontSize: t.sectionTitle,
          fontWeight: typography.weights.bold,
          color: colors.dark,
          marginTop: t.px(20),
          marginBottom: t.px(10),
        }}>
        Select Date
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: t.px(10),
          paddingRight: t.px(4),
          paddingBottom: t.px(4),
        }}>
        {DRIVER_DATE_OPTIONS.map(date => {
          const selected = dateId === date.id;
          const showTodayStyle = date.isToday && selected;
          return (
            <Pressable
              key={date.id}
              onPress={() => setDateId(date.id)}
              style={{
                width: t.px(82),
                height: t.px(88),
                borderRadius: t.inputRadius,
                borderWidth: selected ? 0 : 1,
                borderColor: colors.border,
                backgroundColor: selected ? DRIVER_ACCENT : colors.background,
                alignItems: 'center',
                justifyContent: 'center',
                gap: t.px(4),
              }}>
              {showTodayStyle ? (
                <>
                  <Ionicons name="calendar" size={t.iconSm} color={colors.background} />
                  <Text
                    style={{
                      fontSize: t.label,
                      fontWeight: typography.weights.bold,
                      color: colors.background,
                    }}>
                    Today
                  </Text>
                </>
              ) : date.isToday ? (
                <>
                  <Ionicons name="calendar-outline" size={t.px(18)} color={colors.dark} />
                  <Text
                    style={{
                      fontSize: t.label,
                      fontWeight: typography.weights.bold,
                      color: colors.dark,
                    }}>
                    Today
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={{
                      fontSize: t.labelBold,
                      fontWeight: typography.weights.bold,
                      color: colors.dark,
                    }}>
                    {date.day}
                  </Text>
                  <Text style={{ fontSize: t.caption, color: colors.grey }}>{date.date}</Text>
                </>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <Text
        style={{
          fontSize: t.sectionTitle,
          fontWeight: typography.weights.bold,
          color: colors.dark,
          marginTop: t.px(20),
          marginBottom: t.px(10),
        }}>
        Select Time
      </Text>
      <View style={{ gap: t.px(10) }}>
        {DRIVER_TIME_OPTIONS.map(option => {
          const selected = timeId === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => setTimeId(option.id)}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.px(12),
                  borderRadius: t.inputRadius,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? DRIVER_ACCENT : colors.border,
                  backgroundColor: selected ? DRIVER_LIGHT_BG : colors.background,
                  paddingHorizontal: t.px(16),
                  paddingVertical: t.px(16),
                  minHeight: t.px(54),
                },
                shadows.card,
              ]}>
              <Ionicons
                name={option.iconName}
                size={t.iconSm}
                color={selected ? DRIVER_ACCENT : colors.dark}
              />
              <Text
                style={{
                  fontSize: t.labelBold,
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </TowingBookingLayout>
  );
}
