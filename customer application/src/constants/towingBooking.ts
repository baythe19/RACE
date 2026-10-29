import { Calendar, CalendarClock, Clock, Siren, Timer, Zap, type LucideIcon } from 'lucide-react-native';

import { images } from '../assets';
import type {
  TowingServiceModeId,
  TowingTimeId,
  TowingTypeId,
  TowingVehicleTypeId,
} from '../types/towingBooking';
import { formatLocationDisplay } from '../utils/readableAddress';
import { getDateReviewLabel, parseStoredDate } from '../utils/driverCalendar';

/** Canonical 4-phase booking flow. Steps 1–3 are wizard screens; step 4 is the confirmation screen. */
export const TOWING_BOOKING_STEPS = 4;

/** Labels shown in the horizontal stepper on wizard screens (steps 1–3). */
export const TOWING_BOOKING_STEP_LABELS = ['Vehicle & Tow', 'Pickup & Drop', 'Review'] as const;

export const TOWING_SERVICE_LIST: Array<{
  id: TowingServiceModeId;
  label: string;
  description: string;
  priceLabel: string;
  Icon: LucideIcon;
  iconColor?: string;
}> = [
  {
    id: 'instant',
    label: 'Instant Towing',
    description: 'Dispatched immediately',
    priceLabel: 'From ₹499',
    Icon: Zap,
  },
  {
    id: 'scheduled',
    label: 'Scheduled Towing',
    description: 'Book in advance',
    priceLabel: 'From ₹399',
    Icon: Calendar,
  },
  {
    id: 'emergency',
    label: 'Emergency Towing',
    description: 'Priority emergency response',
    priceLabel: 'From ₹699',
    Icon: Siren,
    iconColor: '#E53935',
  },
];

export const TOWING_WHY_CHOOSE_US = [
  '30 min arrival',
  'Verified drivers',
  'Fixed pricing',
  '24/7 available',
] as const;

export const TOWING_VEHICLE_TYPES: Array<{
  id: TowingVehicleTypeId;
  label: string;
  image: number;
}> = [
  { id: 'hatchback', label: 'Hatchback', image: images.booking.vehicleHatchback },
  { id: 'sedan', label: 'Sedan', image: images.booking.vehicleHatchback },
  { id: 'suv', label: 'SUV', image: images.booking.vehicleSuv },
  { id: 'bike', label: 'Bike', image: images.booking.vehicleBike },
];

/** Same four fleet categories as partner `VendorVehicleRegistrationScreen` VEHICLE_TYPES. */
export const TOWING_TYPES: Array<{
  id: TowingTypeId;
  label: string;
  /** Two-word card title on customer booking step 1. */
  shortLabel: string;
  image: number;
}> = [
  {
    id: 'flatbed',
    label: 'Flatbed Tow Truck',
    shortLabel: 'Flatbed tow',
    image: images.booking.towingFlatbed,
  },
  {
    id: 'wheel_lift',
    label: 'Wheel-lift Tow Truck',
    shortLabel: 'Wheel lift',
    image: images.booking.towingWheelLift,
  },
  {
    id: 'heavy_tow',
    label: 'Heavy Tow Truck',
    shortLabel: 'Heavy tow',
    image: images.booking.towingHeavy,
  },
  {
    id: 'other',
    label: 'Other',
    shortLabel: 'Other',
    image: images.booking.towingOther,
  },
];

export const TOWING_DATE_OPTIONS = [
  { id: 'today', day: 'Today', date: '12 May', isToday: true },
  { id: 'tue', day: 'Tue', date: '13 May', isToday: false },
  { id: 'wed', day: 'Wed', date: '14 May', isToday: false },
  { id: 'thu', day: 'Thu', date: '15 May', isToday: false },
  { id: 'fri', day: 'Fri', date: '16 May', isToday: false },
  { id: 'sat', day: 'Sat', date: '17 May', isToday: false },
  { id: 'sun', day: 'Sun', date: '18 May', isToday: false },
];

export const TOWING_TIME_OPTIONS: Array<{
  id: TowingTimeId;
  label: string;
  Icon: LucideIcon;
}> = [
  { id: '30-60', label: '30–60 min', Icon: Clock },
  { id: '60-90', label: '60–90 min', Icon: Timer },
  { id: 'custom', label: 'Custom Time', Icon: CalendarClock },
];

export const TOWING_BOOKING_PRICE = 899;

export const TOWING_DRIVER = {
  name: 'Ramesh S.',
  rating: 4.9,
  etaMinutes: 12,
  arrivalMinutes: 25,
};

export function getVehicleLabel(id: TowingVehicleTypeId): string {
  return TOWING_VEHICLE_TYPES.find(v => v.id === id)?.label ?? id;
}

export function getTowingTypeLabel(id: TowingTypeId): string {
  return TOWING_TYPES.find(t => t.id === id)?.label ?? id;
}

export function getDateLabel(dateId: string): string {
  return getDateReviewLabel(parseStoredDate(dateId));
}

export function getTimeLabel(timeId: TowingTimeId): string {
  return TOWING_TIME_OPTIONS.find(t => t.id === timeId)?.label ?? '30–60 min';
}

export function getShortLocation(address: string, displayLabel?: string): string {
  return formatLocationDisplay({ address, displayLabel });
}

export function getServiceLocationLabel(
  serviceLocation: import('../types/towingBooking').ServiceLocationData | null,
): string {
  if (!serviceLocation) return '—';
  if (serviceLocation.vehicleLabel) return serviceLocation.vehicleLabel;
  return formatLocationDisplay(serviceLocation.address);
}
