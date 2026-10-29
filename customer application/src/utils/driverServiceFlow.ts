import type { DriverDurationId, DriverTypeId } from '../types/driverBooking';
import type { DriverPackageHours } from '../types/fare';
import type { DayPart } from './driverTime';

export interface DriverServiceFlowConfig {
  /** Short line under hero on Driver Service landing */
  landingTagline: string;
  tierInfoBody: string;
  headerInfoBody: string;
  wizardStepLabels: readonly [string, string, string, string];
  scheduleTitle: string;
  scheduleDateHint: string;
  durationLabel: string;
  /** Which quick duration chips to show (2/4/8/custom). Empty = hide duration block. */
  durationChipIds: DriverDurationId[];
  defaultDurationId: DriverDurationId;
  defaultCustomHours: DriverPackageHours;
  allowedDayParts: DayPart[] | 'all';
  defaultStartTime: string;
  defaultDayPart: DayPart;
  pickupTitle: string;
  pickupFieldLabel: string;
  requiresDropoff: boolean;
  dropFieldLabel: string;
  reviewDurationLabel: string;
}

const HEADER_INFO =
  'All driver bookings use your car from Profile → Vehicles, a verified driver, and GPS during the trip. Steps below change by service type — part-time is hourly in-city, full-time is a full-day hire, outstation needs a destination route, night shifts start in the evening.';

const FLOW: Record<DriverTypeId, DriverServiceFlowConfig> = {
  part_time: {
    landingTagline: 'Hourly hire · your car · in-city',
    tierInfoBody:
      'Book a driver by the hour (2h–24h packages). Pick date, start time, where to meet, and your vehicle. Best for errands, events, or when you cannot drive.',
    headerInfoBody: HEADER_INFO,
    wizardStepLabels: ['Schedule', 'Pickup', 'Vehicle', 'Review'],
    scheduleTitle: 'Schedule',
    scheduleDateHint: 'Swipe for dates up to 2 months ahead',
    durationLabel: 'How long',
    durationChipIds: ['2', '4', '8', 'custom'],
    defaultDurationId: '4',
    defaultCustomHours: 12,
    allowedDayParts: 'all',
    defaultStartTime: '09:00',
    defaultDayPart: 'Morning',
    pickupTitle: 'Pickup location',
    pickupFieldLabel: 'Where should the driver meet you?',
    requiresDropoff: false,
    dropFieldLabel: 'Destination',
    reviewDurationLabel: 'Duration',
  },
  full_time: {
    landingTagline: 'Full-day driver · your car',
    tierInfoBody:
      'One driver for most of your day (8h full day or longer packages). Same meet point — no drop city. Ideal for office runs, weddings, or all-day travel in your vehicle.',
    headerInfoBody: HEADER_INFO,
    wizardStepLabels: ['Schedule', 'Meet point', 'Vehicle', 'Review'],
    scheduleTitle: 'Day & start time',
    scheduleDateHint: 'Pick the day your driver should report',
    durationLabel: 'Day package',
    durationChipIds: ['8', 'custom'],
    defaultDurationId: '8',
    defaultCustomHours: 12,
    allowedDayParts: 'all',
    defaultStartTime: '08:00',
    defaultDayPart: 'Morning',
    pickupTitle: 'Meet point',
    pickupFieldLabel: 'Where should the driver report?',
    requiresDropoff: false,
    dropFieldLabel: 'Destination',
    reviewDurationLabel: 'Day package',
  },
  outstation: {
    landingTagline: 'Inter-city · pickup & destination',
    tierInfoBody:
      'Driver for a trip between cities. Set departure date & time, pickup city, and destination. Trip length defaults to a full day; longer trips use 12h or 24h packages.',
    headerInfoBody: HEADER_INFO,
    wizardStepLabels: ['Trip date', 'Route', 'Vehicle', 'Review'],
    scheduleTitle: 'Trip schedule',
    scheduleDateHint: 'Departure date — plan at least a day ahead when possible',
    durationLabel: 'Trip length',
    durationChipIds: ['8', 'custom'],
    defaultDurationId: '8',
    defaultCustomHours: 24,
    allowedDayParts: 'all',
    defaultStartTime: '06:00',
    defaultDayPart: 'Morning',
    pickupTitle: 'Pickup & destination',
    pickupFieldLabel: 'Pickup — starting city / point',
    requiresDropoff: true,
    dropFieldLabel: 'Destination — drop city / point',
    reviewDurationLabel: 'Trip length',
  },
  night: {
    landingTagline: 'Evening & overnight · your car',
    tierInfoBody:
      'Driver for late hours (typically 9 PM onwards). Start time defaults to night; 8h overnight shift is standard. Meet point only — no separate drop unless you book outstation separately.',
    headerInfoBody: HEADER_INFO,
    wizardStepLabels: ['Night shift', 'Pickup', 'Vehicle', 'Review'],
    scheduleTitle: 'Night shift',
    scheduleDateHint: 'Select the date the night shift begins',
    durationLabel: 'Shift length',
    durationChipIds: ['8', 'custom'],
    defaultDurationId: '8',
    defaultCustomHours: 12,
    allowedDayParts: ['Evening', 'Night'],
    defaultStartTime: '21:00',
    defaultDayPart: 'Night',
    pickupTitle: 'Pickup location',
    pickupFieldLabel: 'Where should the driver meet you?',
    requiresDropoff: false,
    dropFieldLabel: 'Destination',
    reviewDurationLabel: 'Shift length',
  },
};

export function getDriverServiceFlow(driverType: DriverTypeId): DriverServiceFlowConfig {
  return FLOW[driverType] ?? FLOW.part_time;
}

export function getDriverTypeBookingDefaults(driverType: DriverTypeId): {
  durationId: DriverDurationId;
  packageHours: DriverPackageHours;
  hours: number;
  startTime: string;
  dropoff?: string;
  dropoffLabel?: string;
  dropoffLat?: number;
  dropoffLng?: number;
} {
  const flow = getDriverServiceFlow(driverType);
  const packageHours =
    flow.defaultDurationId === 'custom'
      ? flow.defaultCustomHours
      : (Number(flow.defaultDurationId) as DriverPackageHours);

  return {
    durationId: flow.defaultDurationId,
    packageHours,
    hours: packageHours,
    startTime: flow.defaultStartTime,
    ...(flow.requiresDropoff
      ? { dropoff: '', dropoffLabel: '', dropoffLat: undefined, dropoffLng: undefined }
      : {}),
  };
}

export function dayPartsForDriverType(driverType: DriverTypeId): DayPart[] {
  const flow = getDriverServiceFlow(driverType);
  if (flow.allowedDayParts === 'all') {
    return ['Morning', 'Afternoon', 'Evening', 'Night'];
  }
  return flow.allowedDayParts;
}
