import { images } from '../assets';
import type { RoadsideServiceId } from '../types/roadsideBooking';

export const ROADSIDE_ACCENT = '#F4A115';
export const ROADSIDE_ACCENT_LIGHT = '#FFF4E5';

export const ROADSIDE_BOOKING_STEP_LABELS = ['Where to help', 'Confirm'] as const;

export const ROADSIDE_SERVICES: Array<{
  id: RoadsideServiceId;
  label: string;
  description: string;
  price: number;
  image: number;
}> = [
  {
    id: 'flat_tyre',
    label: 'Flat Tyre Assistance',
    description: 'Tyre change at your location',
    price: 199,
    image: images.booking.roadsideTyre,
  },
  {
    id: 'battery',
    label: 'Battery Jump Start',
    description: 'Dead battery? We’ll jump start',
    price: 299,
    image: images.booking.roadsideBattery,
  },
  {
    id: 'fuel',
    label: 'Fuel Delivery',
    description: 'Out of fuel? We deliver',
    price: 149,
    image: images.booking.roadsideFuel,
  },
  {
    id: 'minor_repairs',
    label: 'Minor Repairs',
    description: 'Small fixes on the spot',
    price: 399,
    image: images.booking.roadsideRepairs,
  },
];

export const ROADSIDE_ETA_MINUTES = 25;

export const ROADSIDE_VALUE_PROPS = [
  { id: 'response', highlight: '25 min', label: 'Avg. Response' },
  { id: 'verified', highlight: 'Verified Pros', label: 'Trusted & Trained' },
  { id: 'location', highlight: 'At Your Location', label: 'We come to you' },
] as const;

export function getRoadsideServiceLabel(id: RoadsideServiceId): string {
  return ROADSIDE_SERVICES.find(service => service.id === id)?.label ?? id;
}

export function getRoadsideServicePrice(id: RoadsideServiceId): number {
  return ROADSIDE_SERVICES.find(service => service.id === id)?.price ?? 0;
}
