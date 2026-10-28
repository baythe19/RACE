import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AlarmClock, ChevronDown, ChevronUp } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import {
  DRIVER_ACCENT,
  DRIVER_BOOKING_STEP_LABELS,
  DRIVER_DURATION_OPTIONS,
  DRIVER_PACKAGES,
} from '../../../constants/driverBooking';
import { useDriverBooking } from '../../../context/DriverBookingContext';
import type { HomeStackParamList } from '../../../types/navigation';
import type { DriverDurationId } from '../../../types/driverBooking';
import type { DriverPackageHours } from '../../../types/fare';
import {
  buildUpcomingDateStrip,
  formatMonthYear,
  parseISODate,
  parseStoredDate,
} from '../../../utils/driverCalendar';
import {
  generateTimeSlots,
  isTimeSlotPast,
  parseStoredTime,
} from '../../../utils/driverTime';
import { colors, shadows, typography } from '../../../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'DriverDateTime'>;

const TIME_SLOTS = generateTimeSlots(30);
const TIME_COLUMNS = 3;
const CUSTOM_HOUR_OPTIONS = DRIVER_PACKAGES.map(pkg => pkg.hours);

function durationToPackageHours(
  durationId: DriverDurationId,
  customHours: DriverPackageHours,
): DriverPackageHours {
  if (durationId === 'custom') {
    return customHours;
  }
  return Number(durationId) as DriverPackageHours;
}

export default function DriverDateTimeScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, updateBooking } = useDriverBooking();
  const timeScrollRef = useRef<ScrollView>(null);
  const dateScrollRef = useRef<ScrollView>(null);

  const dateStrip = useMemo(() => buildUpcomingDateStrip(14), []);
  const initialDate = parseStoredDate(booking.dateId);
  const safeInitialDate = dateStrip.some(chip => chip.iso === initialDate)
    ? initialDate
    : dateStrip[0]?.iso ?? initialDate;

  const [selectedDate, setSelectedDate] = useState(safeInitialDate);
  const [durationId, setDurationId] = useState<DriverDurationId>(booking.durationId);
  const [customHours, setCustomHours] = useState<DriverPackageHours>(
    booking.packageHours === 12 || booking.packageHours === 24 ? booking.packageHours : 12,
  );
  const [startTime, setStartTime] = useState(parseStoredTime(booking.startTime));
  const [showTimePicker, setShowTimePicker] = useState(true);

  const selectedChip = dateStrip.find(chip => chip.iso === selectedDate) ?? dateStrip[0];
  const selectedParsed = parseISODate(selectedDate);
  const selectedTimeIndex = TIME_SLOTS.indexOf(startTime);
  const timeRowHeight = t.px(40);

  useEffect(() => {
    const index = dateStrip.findIndex(chip => chip.iso === selectedDate);
    if (index < 0) {
      return;
    }
    dateScrollRef.current?.scrollTo({
      x: Math.max(0, index * t.px(64) - t.px(24)),
      animated: false,
    });
  }, [dateStrip, selectedDate, t]);

  useEffect(() => {
    if (!showTimePicker || selectedTimeIndex < 0) {
      return;
    }

    const row = Math.floor(selectedTimeIndex / TIME_COLUMNS);
    timeScrollRef.current?.scrollTo({
      y: Math.max(0, row * timeRowHeight - timeRowHeight),
      animated: false,
    });
  }, [showTimePicker, selectedTimeIndex, timeRowHeight]);

  const selectDate = (iso: string) => {
    setSelectedDate(iso);
    if (isTimeSlotPast(iso, startTime)) {
      const nextSlot = TIME_SLOTS.find(slot => !isTimeSlotPast(iso, slot));
      if (nextSlot) {
        setStartTime(nextSlot);
      }
    }
  };

  return (
    <TowingBookingLayout
      title="Pick date & time"
      step={1}
      stepLabels={DRIVER_BOOKING_STEP_LABELS}
      accentColor={DRIVER_ACCENT}
      scrollable
      onBack={() => navigation.goBack()}
      onContinue={() => {
        const packageHours = durationToPackageHours(durationId, customHours);
        updateBooking({
          dateId: selectedDate,
          durationId,
          startTime,
          packageHours,
          hours: packageHours,
        });
        navigation.navigate('DriverPickup');
      }}>
      <View style={{ gap: t.px(16) }}>
        <View>
          <Text
            style={{
              fontSize: t.sectionTitle,
              fontWeight: typography.weights.bold,
              color: colors.dark,
              marginBottom: t.px(4),
            }}>
            Date
          </Text>
          <Text
            style={{
              fontSize: t.caption,
              color: colors.grey,
              marginBottom: t.px(10),
            }}>
            {selectedChip?.isToday
              ? `Today · ${formatMonthYear(selectedParsed.getFullYear(), selectedParsed.getMonth())}`
              : formatMonthYear(selectedParsed.getFullYear(), selectedParsed.getMonth())}
          </Text>

          <ScrollView
            ref={dateScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: t.px(8), paddingRight: t.px(8) }}>
            {dateStrip.map(chip => {
              const selected = selectedDate === chip.iso;
              return (
                <Pressable
                  key={chip.key}
                  onPress={() => selectDate(chip.iso)}
                  style={{
                    width: t.px(58),
                    height: t.px(72),
                    borderRadius: t.px(12),
                    borderWidth: selected ? 1.5 : 1,
                    borderColor: selected ? DRIVER_ACCENT : colors.border,
                    backgroundColor: selected ? DRIVER_ACCENT : colors.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: t.px(2),
                  }}>
                  <Text
                    style={{
                      fontSize: t.px(11),
                      fontWeight: typography.weights.semibold,
                      color: selected ? colors.dark : colors.grey,
                    }}>
                    {chip.isToday ? 'Today' : chip.weekday}
                  </Text>
                  <Text
                    style={{
                      fontSize: t.labelBold,
                      fontWeight: typography.weights.bold,
                      color: colors.dark,
                    }}>
                    {chip.dayNumber}
                  </Text>
                  <Text
                    style={{
                      fontSize: t.px(10),
                      fontWeight: typography.weights.medium,
                      color: selected ? colors.dark : colors.grey,
                    }}>
                    {chip.monthShort}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View>
          <Text
            style={{
              fontSize: t.sectionTitle,
              fontWeight: typography.weights.bold,
              color: colors.dark,
              marginBottom: t.px(10),
            }}>
            Duration
          </Text>
          <View style={{ flexDirection: 'row', gap: t.px(8) }}>
            {DRIVER_DURATION_OPTIONS.map(option => {
              const selected = durationId === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setDurationId(option.id)}
                  style={{
                    flex: 1,
                    aspectRatio: 1.15,
                    maxHeight: t.px(64),
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: t.px(12),
                    borderWidth: selected ? 1.5 : 1,
                    borderColor: selected ? DRIVER_ACCENT : colors.border,
                    backgroundColor: selected ? DRIVER_ACCENT : colors.background,
                  }}>
                  <Text
                    style={{
                      fontSize: t.caption,
                      fontWeight: typography.weights.bold,
                      color: colors.dark,
                      textAlign: 'center',
                    }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {durationId === 'custom' ? (
            <View style={{ marginTop: t.px(10), gap: t.px(8) }}>
              <Text
                style={{
                  fontSize: t.caption,
                  color: colors.grey,
                  fontWeight: typography.weights.medium,
                }}>
                Choose package hours
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.px(8) }}>
                {CUSTOM_HOUR_OPTIONS.map(hours => {
                  const selected = customHours === hours;
                  return (
                    <Pressable
                      key={hours}
                      onPress={() => setCustomHours(hours)}
                      style={{
                        width: t.px(64),
                        height: t.px(44),
                        borderRadius: t.px(10),
                        borderWidth: selected ? 1.5 : 1,
                        borderColor: selected ? DRIVER_ACCENT : colors.border,
                        backgroundColor: selected ? '#FEF3C7' : colors.background,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Text
                        style={{
                          fontSize: t.caption,
                          fontWeight: typography.weights.bold,
                          color: colors.dark,
                        }}>
                        {hours} hrs
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>

        <View>
          <Text
            style={{
              fontSize: t.sectionTitle,
              fontWeight: typography.weights.bold,
              color: colors.dark,
              marginBottom: t.px(4),
            }}>
            Start time
          </Text>
          <Text
            style={{
              fontSize: t.caption,
              color: colors.grey,
              marginBottom: t.px(10),
            }}>
            Driver arrives at this time
          </Text>
          <Pressable
            onPress={() => setShowTimePicker(open => !open)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: t.px(12),
              borderWidth: 1.5,
              borderColor: DRIVER_ACCENT,
              backgroundColor: colors.background,
              paddingHorizontal: t.px(14),
              paddingVertical: t.px(12),
            }}>
            <View
              style={{
                width: t.px(36),
                height: t.px(36),
                borderRadius: t.px(10),
                backgroundColor: '#FEF3C7',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <AlarmClock size={t.px(18)} color={DRIVER_ACCENT} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1, marginLeft: t.px(12) }}>
              <Text
                style={{
                  fontSize: t.px(11),
                  fontWeight: typography.weights.medium,
                  color: colors.grey,
                }}>
                Selected time
              </Text>
              <Text
                style={{
                  fontSize: t.labelBold,
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                  marginTop: t.px(1),
                }}>
                {startTime}
              </Text>
            </View>
            {showTimePicker ? (
              <ChevronUp size={t.iconSm} color={DRIVER_ACCENT} strokeWidth={2.5} />
            ) : (
              <ChevronDown size={t.iconSm} color={DRIVER_ACCENT} strokeWidth={2.5} />
            )}
          </Pressable>

          {showTimePicker ? (
            <View
              style={[
                {
                  marginTop: t.px(10),
                  borderRadius: t.px(12),
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  maxHeight: t.px(200),
                  overflow: 'hidden',
                },
                shadows.card,
              ]}>
              <ScrollView
                ref={timeScrollRef}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: t.px(8) }}>
                  {TIME_SLOTS.map(slot => {
                    const selected = startTime === slot;
                    const past = isTimeSlotPast(selectedDate, slot);
                    return (
                      <Pressable
                        key={slot}
                        disabled={past}
                        onPress={() => {
                          setStartTime(slot);
                          setShowTimePicker(false);
                        }}
                        style={{
                          width: `${100 / TIME_COLUMNS}%`,
                          paddingHorizontal: t.px(4),
                          paddingVertical: t.px(4),
                          opacity: past ? 0.35 : 1,
                        }}>
                        <View
                          style={{
                            minHeight: timeRowHeight - t.px(8),
                            borderRadius: t.px(10),
                            borderWidth: selected ? 1.5 : 1,
                            borderColor: selected ? DRIVER_ACCENT : colors.border,
                            backgroundColor: selected ? '#FEF3C7' : colors.background,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          <Text
                            style={{
                              fontSize: t.caption,
                              fontWeight: typography.weights.bold,
                              color: selected ? DRIVER_ACCENT : colors.dark,
                            }}>
                            {slot}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </View>
    </TowingBookingLayout>
  );
}
