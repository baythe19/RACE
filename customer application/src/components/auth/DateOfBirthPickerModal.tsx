import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';

import { DOB_MIN_DATE, formatDateApi, getDobMaxDate, parseDob } from '../../utils/date';
import { typography } from '../../theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const COLORS = {
  background: '#FFFFFF',
  highlight: '#F59E0B',
  selectedText: '#1F2937',
  unselectedText: '#9CA3AF',
  overlay: 'rgba(0,0,0,0.5)',
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function clampDateParts(day: number, month: number, year: number) {
  const maxDay = getDaysInMonth(year, month);
  return {
    day: Math.min(day, maxDay),
    month,
    year,
  };
}

function isSameDay(a: Date, year: number, month: number, day: number): boolean {
  return a.getFullYear() === year && a.getMonth() + 1 === month && a.getDate() === day;
}

interface CalendarViewProps {
  day: number;
  month: number;
  year: number;
  viewMonth: number;
  viewYear: number;
  minYear: number;
  maxYear: number;
  maxDate: Date;
  onSelectDay: (day: number, month: number, year: number) => void;
  onViewChange: (month: number, year: number) => void;
}

function CalendarView({
  day,
  month,
  year,
  viewMonth,
  viewYear,
  minYear,
  maxYear,
  maxDate,
  onSelectDay,
  onViewChange,
}: CalendarViewProps) {
  const today = useMemo(() => new Date(), []);
  const firstDay = new Date(viewYear, viewMonth - 1, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);

  const cells: Array<number | null> = [];
  for (let i = 0; i < startWeekday; i += 1) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(d);
  }

  const canGoPrev =
    viewYear > minYear || (viewYear === minYear && viewMonth > DOB_MIN_DATE.getMonth() + 1);
  const canGoNext =
    viewYear < maxYear || (viewYear === maxYear && viewMonth < maxDate.getMonth() + 1);

  const isDisabled = (d: number) => {
    const date = new Date(viewYear, viewMonth - 1, d);
    return date < DOB_MIN_DATE || date > maxDate;
  };

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <Pressable
          onPress={() => {
            if (!canGoPrev) return;
            if (viewMonth === 1) {
              onViewChange(12, viewYear - 1);
            } else {
              onViewChange(viewMonth - 1, viewYear);
            }
          }}
          disabled={!canGoPrev}
          hitSlop={10}
          style={{ opacity: canGoPrev ? 1 : 0.3 }}>
          <ChevronLeft size={22} color={COLORS.selectedText} />
        </Pressable>
        <Text style={styles.calendarMonthLabel}>
          {MONTHS[viewMonth - 1]} {viewYear}
        </Text>
        <Pressable
          onPress={() => {
            if (!canGoNext) return;
            if (viewMonth === 12) {
              onViewChange(1, viewYear + 1);
            } else {
              onViewChange(viewMonth + 1, viewYear);
            }
          }}
          disabled={!canGoNext}
          hitSlop={10}
          style={{ opacity: canGoNext ? 1 : 0.3 }}>
          <ChevronRight size={22} color={COLORS.selectedText} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((label, index) => (
          <Text key={`weekday-${index}`} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {cells.map((cellDay, index) => {
          if (!cellDay) {
            return <View key={`empty-${index}`} style={styles.calendarCell} />;
          }

          const disabled = isDisabled(cellDay);
          const selected = day === cellDay && month === viewMonth && year === viewYear;
          const isToday = isSameDay(today, viewYear, viewMonth, cellDay);

          return (
            <Pressable
              key={`day-${cellDay}-${index}`}
              disabled={disabled}
              onPress={() => onSelectDay(cellDay, viewMonth, viewYear)}
              style={[styles.calendarCell, disabled && styles.calendarCellDisabled]}>
              <View
                style={[
                  styles.calendarDayInner,
                  selected && styles.calendarDaySelected,
                  !selected && isToday && styles.calendarDayToday,
                ]}>
                <Text
                  style={[
                    styles.calendarDayText,
                    selected && styles.calendarDayTextSelected,
                    disabled && styles.calendarDayTextDisabled,
                  ]}>
                  {cellDay}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface DateOfBirthPickerModalProps {
  visible: boolean;
  value: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

export default function DateOfBirthPickerModal({
  visible,
  value,
  onConfirm,
  onClose,
}: DateOfBirthPickerModalProps) {
  const insets = useSafeAreaInsets();
  const maxDate = useMemo(() => getDobMaxDate(), []);
  const minYear = DOB_MIN_DATE.getFullYear();
  const maxYear = maxDate.getFullYear();

  const [day, setDay] = useState(1);
  const [month, setMonth] = useState(1);
  const [year, setYear] = useState(1998);
  const [viewMonth, setViewMonth] = useState(1);
  const [viewYear, setViewYear] = useState(1998);

  useEffect(() => {
    if (!visible) return;
    const parsed = parseDob(value);
    setDay(parsed.getDate());
    setMonth(parsed.getMonth() + 1);
    setYear(parsed.getFullYear());
    setViewMonth(parsed.getMonth() + 1);
    setViewYear(parsed.getFullYear());
  }, [visible, value]);

  useEffect(() => {
    const maxDay = getDaysInMonth(year, month);
    if (day > maxDay) {
      setDay(maxDay);
    }
  }, [day, month, year]);

  const handleCalendarSelect = (nextDay: number, nextMonth: number, nextYear: number) => {
    const clamped = clampDateParts(nextDay, nextMonth, nextYear);
    setDay(clamped.day);
    setMonth(clamped.month);
    setYear(clamped.year);
    setViewMonth(clamped.month);
    setViewYear(clamped.year);
  };

  const handleConfirm = () => {
    const clamped = clampDateParts(day, month, year);
    const nextDate = new Date(clamped.year, clamped.month - 1, clamped.day);

    if (nextDate < DOB_MIN_DATE || nextDate > maxDate) {
      return;
    }

    onConfirm(formatDateApi(nextDate));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.overlayBackdrop} onPress={onClose} accessibilityRole="button" />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Date of Birth</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <X size={22} color={COLORS.selectedText} strokeWidth={2.5} />
            </Pressable>
          </View>

          <CalendarView
            day={day}
            month={month}
            year={year}
            viewMonth={viewMonth}
            viewYear={viewYear}
            minYear={minYear}
            maxYear={maxYear}
            maxDate={maxDate}
            onSelectDay={handleCalendarSelect}
            onViewChange={(nextMonth, nextYear) => {
              setViewMonth(nextMonth);
              setViewYear(nextYear);
            }}
          />

          <Pressable style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: COLORS.overlay,
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: COLORS.selectedText,
  },
  calendarContainer: {
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarMonthLabel: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: COLORS.selectedText,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: COLORS.unselectedText,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  calendarCellDisabled: {
    opacity: 0.35,
  },
  calendarDayInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDaySelected: {
    backgroundColor: COLORS.highlight,
  },
  calendarDayToday: {
    borderWidth: 1.5,
    borderColor: COLORS.highlight,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: typography.weights.medium,
    color: COLORS.selectedText,
  },
  calendarDayTextSelected: {
    color: COLORS.background,
    fontWeight: typography.weights.bold,
  },
  calendarDayTextDisabled: {
    color: COLORS.unselectedText,
  },
  confirmButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: typography.weights.bold,
    color: COLORS.background,
  },
});
