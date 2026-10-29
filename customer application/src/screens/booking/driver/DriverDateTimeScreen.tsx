import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, ScrollView, Text, UIManager, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import WizardStepFade from '../../../components/booking/WizardStepFade';
import {
  DRIVER_ACCENT,
  DRIVER_DURATION_OPTIONS,
  DRIVER_LIGHT_BG,
  DRIVER_PACKAGES,
} from '../../../constants/driverBooking';
import { useDriverBooking } from '../../../context/DriverBookingContext';
import type { HomeStackParamList } from '../../../types/navigation';
import type { DriverDurationId } from '../../../types/driverBooking';
import type { DriverPackageHours } from '../../../types/fare';
import { buildUpcomingDateStrip, parseStoredDate } from '../../../utils/driverCalendar';
import {
  type DayPart,
  dayPartForTime,
  formatTime12,
  isTimeSlotPast,
  parseStoredTime,
  shiftTime,
  slotsForDayPart,
  toggleHalfHour,
} from '../../../utils/driverTime';
import {
  dayPartsForDriverType,
  getDriverServiceFlow,
} from '../../../utils/driverServiceFlow';
import { colors, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = NativeStackScreenProps<HomeStackParamList, 'DriverDateTime'>;

const QUICK_HOURS = new Set<DriverPackageHours>([2, 4, 8]);
const CUSTOM_PACKAGES = DRIVER_PACKAGES.filter(pkg => !QUICK_HOURS.has(pkg.hours));

function ease() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

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
  const flow = getDriverServiceFlow(booking.driverType);
  const dayParts = dayPartsForDriverType(booking.driverType);
  const durationOptions = DRIVER_DURATION_OPTIONS.filter(opt =>
    flow.durationChipIds.includes(opt.id),
  );
  const dateScrollRef = useRef<ScrollView>(null);
  const timeScrollRef = useRef<ScrollView>(null);

  const dateStrip = useMemo(() => buildUpcomingDateStrip(), []);
  const initialDate = parseStoredDate(booking.dateId);
  const safeInitialDate = dateStrip.some(chip => chip.iso === initialDate)
    ? initialDate
    : dateStrip[0]?.iso ?? initialDate;

  const [selectedDate, setSelectedDate] = useState(safeInitialDate);
  const [durationId, setDurationId] = useState<DriverDurationId>(booking.durationId);
  const [customHours, setCustomHours] = useState<DriverPackageHours>(
    CUSTOM_PACKAGES.some(pkg => pkg.hours === booking.packageHours)
      ? booking.packageHours
      : (CUSTOM_PACKAGES[0]?.hours ?? 12),
  );
  const [startTime, setStartTime] = useState(parseStoredTime(booking.startTime));
  const [dayPart, setDayPart] = useState<DayPart>(() => {
    const part = dayPartForTime(parseStoredTime(booking.startTime));
    if (dayParts.includes(part)) return part;
    return flow.defaultDayPart;
  });

  useEffect(() => {
    const part = dayPartForTime(parseStoredTime(booking.startTime));
    if (!dayParts.includes(part)) {
      setDayPart(flow.defaultDayPart);
      setStartTime(flow.defaultStartTime);
    }
  }, [booking.driverType, booking.startTime, dayParts, flow.defaultDayPart, flow.defaultStartTime]);

  const partSlots = useMemo(() => slotsForDayPart(dayPart), [dayPart]);
  const visibleSlots = partSlots.filter(slot => !isTimeSlotPast(selectedDate, slot));

  useEffect(() => {
    if (!isTimeSlotPast(selectedDate, startTime)) return;
    for (const part of dayParts) {
      const next = slotsForDayPart(part).find(slot => !isTimeSlotPast(selectedDate, slot));
      if (!next) continue;
      setStartTime(next);
      setDayPart(part);
      return;
    }
  }, [selectedDate, startTime]);

  useEffect(() => {
    const index = dateStrip.findIndex(chip => chip.iso === selectedDate);
    if (index < 0) return;
    dateScrollRef.current?.scrollTo({
      x: Math.max(0, index * t.px(56) - t.px(12)),
      animated: true,
    });
  }, [dateStrip, selectedDate, t]);

  useEffect(() => {
    const index = visibleSlots.indexOf(startTime);
    if (index < 0) return;
    timeScrollRef.current?.scrollTo({
      x: Math.max(0, index * t.px(78) - t.px(12)),
      animated: true,
    });
  }, [startTime, t, visibleSlots]);

  const selectDate = (iso: string) => {
    ease();
    setSelectedDate(iso);
    if (isTimeSlotPast(iso, startTime)) {
      const nextSlot = partSlots.find(slot => !isTimeSlotPast(iso, slot));
      if (nextSlot) setStartTime(nextSlot);
    }
  };

  const selectPart = (part: DayPart) => {
    if (part === dayPart) return;
    ease();
    setDayPart(part);
    const next = slotsForDayPart(part).find(slot => !isTimeSlotPast(selectedDate, slot));
    if (next) setStartTime(next);
  };

  const applyTime = (next: string) => {
    if (isTimeSlotPast(selectedDate, next)) return;
    setStartTime(next);
    const nextPart = dayPartForTime(next);
    if (nextPart !== dayPart) {
      ease();
      setDayPart(nextPart);
    }
  };

  const monthNumber = (date: Date) => String(date.getMonth() + 1);
  const selectedChip = dateStrip.find(chip => chip.iso === selectedDate);
  const selectedMonth = selectedChip ? monthNumber(selectedChip.date) : '';
  const selectedYear = selectedChip?.date.getFullYear() ?? '';

  return (
    <TowingBookingLayout
      title={flow.scheduleTitle}
      step={1}
      stepLabels={flow.wizardStepLabels}
      accentColor={DRIVER_ACCENT}
      scrollable={durationId === 'custom'}
      continueDisabled={isTimeSlotPast(selectedDate, startTime)}
      onBack={() => goBackWithinStack(navigation)}
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
      <WizardStepFade>
      <View style={{ gap: t.px(12) }}>
        <View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: t.px(4),
            }}>
            <Text style={{ fontSize: t.body, fontWeight: typography.weights.semibold, color: colors.dark }}>
              Date
            </Text>
            <Text style={{ fontSize: t.caption, color: colors.grey }}>
              {selectedChip?.isToday ? 'Today' : selectedChip?.weekday} · {selectedMonth}/{selectedYear}
            </Text>
          </View>
          <Text style={{ fontSize: t.px(11), color: colors.grey, marginBottom: t.px(6) }}>
            {flow.scheduleDateHint}
          </Text>
          <ScrollView
            ref={dateScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: t.px(6), paddingRight: t.px(24) }}>
            {dateStrip.map(chip => {
              const selected = selectedDate === chip.iso;
              return (
                <Pressable
                  key={chip.key}
                  onPress={() => selectDate(chip.iso)}
                  style={{
                    width: t.px(52),
                    height: t.px(46),
                    borderRadius: t.px(10),
                    borderWidth: 1,
                    borderColor: selected ? DRIVER_ACCENT : colors.border,
                    backgroundColor: selected ? DRIVER_LIGHT_BG : colors.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text
                    style={{
                      fontSize: t.px(10),
                      fontWeight: typography.weights.medium,
                      color: colors.grey,
                    }}>
                    {chip.isToday ? 'Today' : chip.weekday}
                  </Text>
                  <Text
                    style={{
                      fontSize: t.caption,
                      fontWeight: typography.weights.bold,
                      color: colors.dark,
                      marginTop: t.px(1),
                    }}>
                    {chip.dayNumber}/{monthNumber(chip.date)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {durationOptions.length > 0 ? (
        <View>
          <Text
            style={{
              fontSize: t.body,
              fontWeight: typography.weights.semibold,
              color: colors.dark,
              marginBottom: t.px(8),
            }}>
            {flow.durationLabel}
          </Text>
          <View style={{ flexDirection: 'row', gap: t.px(6) }}>
            {durationOptions.map(option => {
              const selected = durationId === option.id;
              const chipLabel =
                booking.driverType === 'full_time' && option.id === '8'
                  ? 'Full day'
                  : booking.driverType === 'outstation' && option.id === '8'
                    ? '1 day'
                    : option.id === 'custom'
                      ? 'More'
                      : option.label.replace(' hrs', 'h');
              return (
                <Pressable
                  key={option.id}
                  onPress={() => {
                    ease();
                    setDurationId(option.id);
                  }}
                  style={{
                    flex: 1,
                    height: t.px(36),
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: t.px(10),
                    borderWidth: 1,
                    borderColor: selected ? DRIVER_ACCENT : colors.border,
                    backgroundColor: selected ? DRIVER_LIGHT_BG : colors.background,
                  }}>
                  <Text
                    style={{
                      fontSize: t.caption,
                      fontWeight: typography.weights.semibold,
                      color: colors.dark,
                    }}>
                    {chipLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {durationId === 'custom' ? (
            <View style={{ marginTop: t.px(8), gap: t.px(6) }}>
              <Text style={{ fontSize: t.px(11), color: colors.grey }}>
                Longer packages — km included
              </Text>
              <View style={{ flexDirection: 'row', gap: t.px(6) }}>
                {CUSTOM_PACKAGES.map(pkg => {
                  const selected = customHours === pkg.hours;
                  return (
                    <Pressable
                      key={pkg.hours}
                      onPress={() => {
                        ease();
                        setCustomHours(pkg.hours);
                      }}
                      style={{
                        flex: 1,
                        borderRadius: t.px(10),
                        borderWidth: 1,
                        borderColor: selected ? DRIVER_ACCENT : colors.border,
                        backgroundColor: selected ? DRIVER_LIGHT_BG : colors.background,
                        paddingVertical: t.px(8),
                        paddingHorizontal: t.px(10),
                      }}>
                      <Text
                        style={{
                          fontSize: t.caption,
                          fontWeight: typography.weights.bold,
                          color: colors.dark,
                        }}>
                        {pkg.hours} hours
                      </Text>
                      <Text style={{ fontSize: t.px(11), color: colors.grey, marginTop: t.px(2) }}>
                        {pkg.km} km included
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
        ) : null}

        <View
          style={{
            borderRadius: t.px(12),
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: t.px(10),
            paddingVertical: t.px(10),
            gap: t.px(8),
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'space-between',
            }}>
            <Text style={{ fontSize: t.body, fontWeight: typography.weights.semibold, color: colors.dark }}>
              {booking.driverType === 'outstation' ? 'Departure time' : 'Start time'}
            </Text>
            <Text style={{ fontSize: t.caption, fontWeight: typography.weights.semibold, color: colors.dark }}>
              {formatTime12(startTime)} · {dayPartForTime(startTime)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: t.px(6) }}>
            {dayParts.map(part => {
              const selected = dayPart === part;
              return (
                <Pressable
                  key={part}
                  onPress={() => selectPart(part)}
                  style={{
                    flex: 1,
                    height: t.px(32),
                    borderRadius: t.px(8),
                    borderWidth: 1,
                    borderColor: selected ? DRIVER_ACCENT : colors.border,
                    backgroundColor: selected ? DRIVER_LIGHT_BG : colors.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text
                    style={{
                      fontSize: t.px(11),
                      fontWeight: typography.weights.semibold,
                      color: selected ? colors.dark : colors.grey,
                    }}>
                    {part}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView
            ref={timeScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: t.px(6), paddingRight: t.px(4) }}>
            {visibleSlots.length === 0 ? (
              <Text style={{ fontSize: t.caption, color: colors.grey, paddingVertical: t.px(8) }}>
                No times left in {dayPart.toLowerCase()} today. Pick another part of the day.
              </Text>
            ) : (
              visibleSlots.map(slot => {
                const selected = startTime === slot;
                return (
                  <Pressable
                    key={slot}
                    onPress={() => applyTime(slot)}
                    style={{
                      height: t.px(32),
                      paddingHorizontal: t.px(10),
                      borderRadius: t.px(8),
                      borderWidth: 1,
                      borderColor: selected ? DRIVER_ACCENT : colors.border,
                      backgroundColor: selected ? DRIVER_ACCENT : colors.background,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Text
                      style={{
                        fontSize: t.caption,
                        fontWeight: typography.weights.semibold,
                        color: selected ? colors.dark : colors.dark,
                      }}>
                      {formatTime12(slot)}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: t.px(8),
            }}>
            <Text style={{ fontSize: t.caption, color: colors.grey }}>Set exactly</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.px(8) }}>
              <Pressable
                hitSlop={8}
                onPress={() => applyTime(shiftTime(startTime, -1))}
                style={{
                  width: t.px(28),
                  height: t.px(28),
                  borderRadius: t.px(8),
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Minus size={t.px(14)} color={colors.dark} />
              </Pressable>
              <Text
                style={{
                  minWidth: t.px(72),
                  textAlign: 'center',
                  fontSize: t.body,
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                }}>
                {formatTime12(startTime)}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() => applyTime(shiftTime(startTime, 1))}
                style={{
                  width: t.px(28),
                  height: t.px(28),
                  borderRadius: t.px(8),
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Plus size={t.px(14)} color={colors.dark} />
              </Pressable>
              <Pressable
                onPress={() => applyTime(toggleHalfHour(startTime))}
                style={{
                  height: t.px(28),
                  paddingHorizontal: t.px(8),
                  borderRadius: t.px(8),
                  backgroundColor: DRIVER_LIGHT_BG,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text style={{ fontSize: t.px(11), fontWeight: typography.weights.bold, color: colors.dark }}>
                  :00 / :30
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
      </WizardStepFade>
    </TowingBookingLayout>
  );
}
