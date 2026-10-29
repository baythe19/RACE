import { images } from '../assets';
import type { DriverDurationId, DriverTimeId, DriverTypeId } from '../types/driverBooking';
import type { DriverPackageHours, DriverVehicleCategory } from '../types/fare';
import { formatLocationDisplay } from '../utils/readableAddress';

export const DRIVER_ACCENT = '#F59E0B';
export const DRIVER_LIGHT_BG = '#FEF3C7';

export const DRIVER_PACKAGES: Array<{
  hours: DriverPackageHours;
  km: number;
  label: string;
  sublabel: string;
}> = [
  { hours: 2, km: 20, label: '2 Hours', sublabel: '20 km included' },
  { hours: 4, km: 40, label: '4 Hours', sublabel: '40 km included' },
  { hours: 8, km: 80, label: '8 Hours', sublabel: '80 km included' },
  { hours: 12, km: 120, label: '12 Hours', sublabel: '120 km included' },
  { hours: 24, km: 240, label: '24 Hours', sublabel: '240 km included' },
];

export const DRIVER_PACKAGE_PRICES: Record<DriverVehicleCategory, number[]> = {
  hatchback: [400, 600, 1000, 1500, 2000],
  sedan: [500, 700, 1100, 1600, 2100],
  suv: [600, 800, 1400, 2000, 2800],
};

export function getPackagePrice(
  packageHours: DriverPackageHours,
  vehicleCategory: DriverVehicleCategory = 'hatchback',
): number {
  const index = DRIVER_PACKAGES.findIndex(pkg => pkg.hours === packageHours);
  if (index < 0) return DRIVER_PACKAGE_PRICES.hatchback[0];
  return DRIVER_PACKAGE_PRICES[vehicleCategory][index];
}

export const DRIVER_BOOKING_STEPS = 6;

/** Wizard labels for Book Now path: Schedule → Pickup → Vehicle → Review */
export const DRIVER_BOOKING_STEP_LABELS = ['Schedule', 'Pickup', 'Vehicle', 'Review'] as const;

export const DRIVER_SERVICE_LIST: Array<{
  id: DriverTypeId;
  label: string;
  priceLabel: string;
}> = [
  { id: 'part_time', label: 'Part-Time Driver', priceLabel: 'From ₹199 /hr' },
  { id: 'full_time', label: 'Full-Time Driver', priceLabel: 'From ₹999 /day' },
  { id: 'outstation', label: 'Outstation Driver', priceLabel: 'From ₹1,499 /trip' },
  { id: 'night', label: 'Night Driver', priceLabel: 'From ₹299 /night' },
];

export const DRIVER_WHY_CHOOSE_US = [
  'Police verified & background checked',
  'GPS tracked during service',
  'Trained & licensed drivers',
] as const;

export const DRIVER_DATE_OPTIONS = [
  { id: 'today', day: 'Today', date: '12 May', isToday: true },
  { id: 'tue', day: 'Tue', date: '13 May', isToday: false },
  { id: 'wed', day: 'Wed', date: '14 May', isToday: false },
  { id: 'thu', day: 'Thu', date: '15 May', isToday: false },
  { id: 'fri', day: 'Fri', date: '16 May', isToday: false },
  { id: 'sat', day: 'Sat', date: '17 May', isToday: false },
  { id: 'sun', day: 'Sun', date: '18 May', isToday: false },
];

export const DRIVER_TIME_OPTIONS: Array<{
  id: DriverTimeId;
  label: string;
  iconName: 'flash-outline' | 'time-outline' | 'timer-outline' | 'calendar-outline';
}> = [
  { id: 'asap', label: 'ASAP', iconName: 'flash-outline' },
  { id: '30-60', label: '30–60 min', iconName: 'time-outline' },
  { id: '60-90', label: '60–90 min', iconName: 'timer-outline' },
  { id: 'custom', label: 'Custom Time', iconName: 'calendar-outline' },
];

export const DRIVER_HOUR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export const DRIVER_TYPES: Array<{
  id: DriverTypeId;
  label: string;
  price: string;
  image: number;
}> = [
  {
    id: 'part_time',
    label: 'Part-Time',
    price: '₹199/hr',
    image: images.booking.driverParttime,
  },
  {
    id: 'full_time',
    label: 'Full-Time',
    price: '₹999/day',
    image: images.booking.driverFulltime,
  },
  {
    id: 'outstation',
    label: 'Outstation',
    price: '₹1,499/trip',
    image: images.booking.driverOutstation,
  },
  {
    id: 'night',
    label: 'Night Driver',
    price: '₹299/night',
    image: images.booking.driverNight,
  },
];

export const DRIVER_VEHICLE_TYPES: Array<{
  id: DriverVehicleCategory;
  label: string;
  image: number;
}> = [
  { id: 'hatchback', label: 'Hatchback', image: images.booking.vehicleHatchback },
  { id: 'sedan', label: 'Sedan', image: images.booking.vehicleHatchback },
  { id: 'suv', label: 'SUV', image: images.booking.vehicleSuv },
];

export function getDriverVehicleTypeLabel(id: DriverVehicleCategory): string {
  return DRIVER_VEHICLE_TYPES.find(v => v.id === id)?.label ?? id;
}

export const DRIVER_DURATION_OPTIONS: Array<{
  id: DriverDurationId;
  label: string;
}> = [
  { id: '2', label: '2 hrs' },
  { id: '4', label: '4 hrs' },
  { id: '8', label: '8 hrs' },
  { id: 'custom', label: 'Custom' },
];

export const DRIVER_CALENDAR_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DRIVER_SAVED_LOCATIONS = [
  { id: 'home', label: 'Home', address: 'Patia Square, Bhubaneswar' },
  { id: 'office', label: 'Office', address: 'Chandrasekharpur, Bhubaneswar' },
];

export const DRIVER_BOOKING_TOTAL = 599;

export const DRIVER_ASSIGNED = {
  name: 'Ramesh S.',
  rating: 4.9,
  etaMinutes: 15,
};

export function getDriverTypeLabel(id: DriverTypeId): string {
  return DRIVER_SERVICE_LIST.find(t => t.id === id)?.label ?? id;
}

export function getDriverTypeBadgeLabel(id: DriverTypeId): string {
  const label = getDriverTypeLabel(id);
  return label.endsWith('Driver') ? label : `${label} Driver`;
}

export function getDriverTypePrice(id: DriverTypeId): string {
  return DRIVER_TYPES.find(t => t.id === id)?.price ?? '';
}

export function getDurationLabel(id: DriverDurationId): string {
  return DRIVER_DURATION_OPTIONS.find(d => d.id === id)?.label ?? id;
}

export function getDurationReviewLabel(id: DriverDurationId, hours?: number): string {
  if (id === 'custom' && hours) {
    return `${hours} hours`;
  }
  const labels: Record<DriverDurationId, string> = {
    '2': '2 hours',
    '4': '4 hours',
    '8': '8 hours',
    custom: 'Custom',
  };
  return labels[id] ?? id;
}

export function getDateLabel(dateId: string): string {
  return DRIVER_DATE_OPTIONS.find(d => d.id === dateId)?.day ?? 'Today';
}

export function getTimeLabel(timeId: DriverTimeId): string {
  return DRIVER_TIME_OPTIONS.find(t => t.id === timeId)?.label ?? '30–60 min';
}

export { getDateReviewLabel } from '../utils/driverCalendar';

export function getShortLocation(address: string, displayLabel?: string): string {
  return formatLocationDisplay({ address, displayLabel });
}

export function isBookableDriverType(id: DriverTypeId): boolean {
  return true;
}
