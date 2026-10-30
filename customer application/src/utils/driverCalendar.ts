const MONTH_NAMES = [
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

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export interface CalendarCell {
  key: string;
  day: number;
  currentMonth: boolean;
  iso: string;
  date: Date;
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseStoredDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (value === 'today') {
    return toISODate(startOfDay(new Date()));
  }

  const legacyOffsets: Record<string, number> = {
    tue: 1,
    wed: 2,
    thu: 3,
    fri: 4,
    sat: 5,
    sun: 6,
  };
  if (legacyOffsets[value] != null) {
    const date = startOfDay(new Date());
    date.setDate(date.getDate() + legacyOffsets[value]!);
    return toISODate(date);
  }

  if (value === '12') {
    return '2025-05-12';
  }

  return toISODate(startOfDay(new Date()));
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isPastDate(date: Date): boolean {
  return startOfDay(date).getTime() < startOfDay(new Date()).getTime();
}

export function formatMonthYear(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const jsDay = firstDay.getDay();
  const mondayOffset = jsDay === 0 ? 6 : jsDay - 1;

  const cells: CalendarCell[] = [];

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let index = mondayOffset - 1; index >= 0; index -= 1) {
    const day = prevMonthLastDay - index;
    const date = new Date(year, month - 1, day);
    cells.push({
      key: toISODate(date),
      day,
      currentMonth: false,
      iso: toISODate(date),
      date,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({
      key: toISODate(date),
      day,
      currentMonth: true,
      iso: toISODate(date),
      date,
    });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    const date = new Date(year, month + 1, nextDay);
    cells.push({
      key: toISODate(date),
      day: nextDay,
      currentMonth: false,
      iso: toISODate(date),
      date,
    });
    nextDay += 1;
  }

  return cells;
}

export function getDateReviewLabel(iso: string): string {
  const date = parseISODate(iso);
  const label = `${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;

  if (isSameDay(date, new Date())) {
    return `Today, ${label}`;
  }

  return label;
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export interface UpcomingDateChip {
  key: string;
  iso: string;
  date: Date;
  weekday: string;
  dayNumber: number;
  monthShort: string;
  isToday: boolean;
}

/** Bookable days ahead in part-time driver schedule (≈2 months). */
export const DRIVER_BOOKING_DATE_STRIP_DAYS = 60;

/** Compact strip for scheduled towing (one week ahead). */
export const TOWING_SCHEDULE_DATE_STRIP_DAYS = 7;

export function buildTowingScheduleDateStrip(): UpcomingDateChip[] {
  return buildUpcomingDateStrip(TOWING_SCHEDULE_DATE_STRIP_DAYS);
}

/** Compact strip of upcoming bookable days (horizontal scroll). */
export function buildUpcomingDateStrip(count = DRIVER_BOOKING_DATE_STRIP_DAYS): UpcomingDateChip[] {
  const today = startOfDay(new Date());
  const chips: UpcomingDateChip[] = [];

  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    chips.push({
      key: toISODate(date),
      iso: toISODate(date),
      date,
      weekday: WEEKDAY_SHORT[date.getDay()],
      dayNumber: date.getDate(),
      monthShort: MONTH_SHORT[date.getMonth()],
      isToday: offset === 0,
    });
  }

  return chips;
}
