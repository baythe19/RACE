/**
 * Generic bottom-sheet calendar date picker (DD/MM/YYYY).
 *
 * Reusable across surfaces:
 * - DOB: pass minDate = DOB_MIN_DATE, maxDate = today-18y
 * - Insurance expiry: pass minDate = today, maxDate = today+10y
 *
 * Emits and parses the user-facing DD/MM/YYYY format.
 */
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

import { colors } from '../../theme';

const COLORS = {
  bg: '#FFFFFF',
  text: '#16161E',
  muted: '#8A8A93',
  selected: colors.primary,
  selectedText: '#FFFFFF',
  border: '#EEEDEA',
};

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

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
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

/** Parse DD/MM/YYYY (preferred) or ISO fallback into Date parts. */
function parsePickerValue(value: string, fallback: Date): Date {
  const dmy = value.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  }
  const iso = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  return fallback;
}

interface CalendarViewProps {
  day: number;
  month: number;
  year: number;
  viewMonth: number;
  viewYear: number;
  minDate: Date;
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
  minDate,
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

  const minYear = minDate.getFullYear();
  const maxYear = maxDate.getFullYear();

  const canGoPrev =
    viewYear > minYear || (viewYear === minYear && viewMonth > minDate.getMonth() + 1);
  const canGoNext =
    viewYear < maxYear || (viewYear === maxYear && viewMonth < maxDate.getMonth() + 1);

  const isDisabled = (d: number) => {
    const date = new Date(viewYear, viewMonth - 1, d);
    return startOfDay(date) < startOfDay(minDate) || startOfDay(date) > startOfDay(maxDate);
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
          hitSlop={10}
          style={{ opacity: canGoPrev ? 1 : 0.3 }}>
          <ChevronLeft size={22} color={COLORS.selectedText === '#FFFFFF' ? COLORS.text : COLORS.text} />
        </Pressable>

        <Text style={styles.monthLabel}>
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
          hitSlop={10}
          style={{ opacity: canGoNext ? 1 : 0.3 }}>
          <ChevronRight size={22} color={COLORS.text} />
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

interface DatePickerModalProps {
  visible: boolean;
  /** Current value shown in the field: DD/MM/YYYY (preferred) or ISO. */
  value: string;
  /** Fired with DD/MM/YYYY. */
  onConfirm: (value: string) => void;
  onClose: () => void;
  /** Lowest selectable date. Defaults to today-100y. */
  minDate?: Date;
  /** Highest selectable date. Defaults to today+10y. */
  maxDate?: Date;
  /** Initial view/selection when nothing valid is provided. */
  fallbackDate?: Date;
  title?: string;
}

export default function DatePickerModal({
  visible,
  value,
  onConfirm,
  onClose,
  minDate,
  maxDate,
  fallbackDate,
  title = 'Select date',
}: DatePickerModalProps) {
  const insets = useSafeAreaInsets();
  const resolvedMin = useMemo(() => startOfDay(minDate ?? new Date(1926, 0, 1)), [minDate]);
  const resolvedMax = useMemo(
    () => startOfDay(maxDate ?? new Date(new Date().getFullYear() + 10, 11, 31)),
    [maxDate],
  );

  const [day, setDay] = useState(1);
  const [month, setMonth] = useState(1);
  const [year, setYear] = useState(2027);
  const [viewMonth, setViewMonth] = useState(1);
  const [viewYear, setViewYear] = useState(2027);

  useEffect(() => {
    if (!visible) return;
    const parsed = parsePickerValue(value, fallbackDate ?? resolvedMax);
    const clamped = clampDateParts(parsed.getDate(), parsed.getMonth() + 1, parsed.getFullYear());
    const picked = new Date(clamped.year, clamped.month - 1, clamped.day);
    const finalDate = picked < resolvedMin ? resolvedMin : picked > resolvedMax ? resolvedMax : picked;
    setDay(finalDate.getDate());
    setMonth(finalDate.getMonth() + 1);
    setYear(finalDate.getFullYear());
    setViewMonth(finalDate.getMonth() + 1);
    setViewYear(finalDate.getFullYear());
  }, [visible, value, fallbackDate, resolvedMin, resolvedMax]);

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

    if (nextDate < resolvedMin || nextDate > resolvedMax) {
      return;
    }

    const dd = String(clamped.day).padStart(2, '0');
    const mm = String(clamped.month).padStart(2, '0');
    onConfirm(`${dd}/${mm}/${clamped.year}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.overlayBackdrop} onPress={onClose} accessibilityRole="button" />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <X size={22} color={COLORS.selectedText === '#FFFFFF' ? COLORS.text : COLORS.text} strokeWidth={2.5} />
            </Pressable>
          </View>

          <CalendarView
            day={day}
            month={month}
            year={year}
            viewMonth={viewMonth}
            viewYear={viewYear}
            minDate={resolvedMin}
            maxDate={resolvedMax}
            onSelectDay={handleCalendarSelect}
            onViewChange={(m, y) => {
              setViewMonth(m);
              setViewYear(y);
            }}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Confirm date"
            onPress={handleConfirm}
            style={({ pressed }) => [styles.confirmButton, pressed && { opacity: 0.9 }]}>
            <Text style={styles.confirmText}>Confirm</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  overlayBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    color: COLORS.text,
    fontWeight: '700',
  },
  confirmButton: {
    marginTop: 14,
    backgroundColor: COLORS.selected,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmText: {
    color: COLORS.selectedText,
    fontSize: 15,
    fontWeight: '700',
  },
  calendarContainer: {
    marginTop: 4,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 2,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
  },
  calendarCellDisabled: {
    opacity: 0.25,
  },
  calendarDayInner: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  calendarDaySelected: {
    backgroundColor: COLORS.selected,
  },
  calendarDayToday: {
    borderColor: COLORS.selected,
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  calendarDayTextSelected: {
    color: COLORS.selectedText,
    fontWeight: '800',
  },
  calendarDayTextDisabled: {
    color: COLORS.muted,
  },
});
