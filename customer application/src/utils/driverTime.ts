import { startOfDay, toISODate } from './driverCalendar';

export function parseStoredTime(value: string): string {
  const match24 = value.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = Number(match24[1]);
    const minutes = Number(match24[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return formatTime24(hours, minutes);
    }
  }

  const match12 = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = Number(match12[1]) % 12;
    const minutes = Number(match12[2]);
    if (match12[3].toUpperCase() === 'PM') {
      hours += 12;
    }
    return formatTime24(hours, minutes);
  }

  return '09:00';
}

export function formatTime24(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function parseTime24(value: string): { hours: number; minutes: number } {
  const [hours, minutes] = value.split(':').map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
}

export type DayPart = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

export const DAY_PARTS: DayPart[] = ['Morning', 'Afternoon', 'Evening', 'Night'];

export function dayPartForTime(time24: string): DayPart {
  const { hours } = parseTime24(time24);
  if (hours >= 5 && hours < 12) return 'Morning';
  if (hours >= 12 && hours < 17) return 'Afternoon';
  if (hours >= 17 && hours < 21) return 'Evening';
  return 'Night';
}

/** 12-hour label so morning and night are obvious (09:00 AM / 09:30 PM). */
export function formatTime12(time24: string): string {
  const { hours, minutes } = parseTime24(time24);
  const hour12 = hours % 12 || 12;
  const suffix = hours < 12 ? 'AM' : 'PM';
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

export function slotsForDayPart(part: DayPart, intervalMinutes = 30): string[] {
  return generateTimeSlots(intervalMinutes).filter(slot => dayPartForTime(slot) === part);
}

export function shiftTime(time24: string, deltaHours: number, minuteStep = 30): string {
  const { hours, minutes } = parseTime24(time24);
  const total = hours * 60 + minutes + deltaHours * 60;
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const nextHours = Math.floor(wrapped / 60);
  const nextMinutes = Math.floor((wrapped % 60) / minuteStep) * minuteStep;
  return formatTime24(nextHours, nextMinutes);
}

export function toggleHalfHour(time24: string): string {
  const { hours, minutes } = parseTime24(time24);
  return formatTime24(hours, minutes >= 30 ? 0 : 30);
}

export function generateTimeSlots(intervalMinutes = 30): string[] {
  const slots: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += intervalMinutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    slots.push(formatTime24(hours, mins));
  }
  return slots;
}

export function isTimeSlotPast(dateIso: string, time24: string): boolean {
  const todayIso = toISODate(startOfDay(new Date()));
  if (dateIso !== todayIso) {
    return false;
  }

  const now = new Date();
  const { hours, minutes } = parseTime24(time24);
  const slot = new Date();
  slot.setHours(hours, minutes, 0, 0);
  return slot.getTime() <= now.getTime();
}
