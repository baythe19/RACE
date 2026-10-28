import { BadRequestError } from '../../../utils/src/errors';
import { serviceRepository } from '../serviceRepository';
import { towingBookingService } from './towingBooking';
import type { CreateRoadsideBookingDto } from '../roadsideBookingValidator';

/** Service slugs / category ids that route to the towing booking flow. */
const TOWING_SERVICE_TYPES = new Set([
  'towing',
  'towing_instant',
  'towing_scheduled',
  'towing_emergency',
]);

const ROADSIDE_SERVICE_LABELS: Record<string, string> = {
  towing: 'Towing Service',
  towing_instant: 'Instant Towing',
  towing_scheduled: 'Scheduled Towing',
  towing_emergency: 'Emergency Towing',
  roadside_flat_tyre: 'Flat Tyre Assistance',
  roadside_battery_jump: 'Battery Jump Start',
  roadside_fuel_delivery: 'Fuel Delivery',
  roadside_minor_repair: 'Minor Repairs',
};

// D-15 (audit 2026-10-28): never echo an unvalidated client string back in a
// user-facing message — accept only the known slugs, reject everything else.
const KNOWN_SERVICE_TYPES = new Set([
  ...TOWING_SERVICE_TYPES,
  'roadside_flat_tyre',
  'roadside_battery_jump',
  'roadside_fuel_delivery',
  'roadside_minor_repair',
]);

function resolveServiceLabel(serviceType: string): string {
  return ROADSIDE_SERVICE_LABELS[serviceType] ?? serviceType.replace(/_/g, ' ');
}

export class RoadsideBookingService {
  async createBooking(customerId: string, dto: CreateRoadsideBookingDto) {
    const normalizedType = dto.serviceType.trim().toLowerCase();

    if (!KNOWN_SERVICE_TYPES.has(normalizedType)) {
      throw new BadRequestError(
        'Unknown service type. Choose one of the advertised roadside services.',
      );
    }

    if (TOWING_SERVICE_TYPES.has(normalizedType)) {
      if (!dto.dropoff) {
        throw new BadRequestError('dropoff is required for towing services');
      }

      const booking = await towingBookingService.createBooking(customerId, {
        vehicleId: dto.vehicleId,
        pickup: dto.pickup,
        dropoff: dto.dropoff,
        scheduledAt: dto.scheduledAt,
      });

      return {
        available: true,
        redirectedTo: 'towing' as const,
        serviceType: normalizedType,
        booking,
      };
    }

    return {
      available: false,
      message: `${resolveServiceLabel(normalizedType)} is coming soon`,
      serviceType: normalizedType,
    };
  }

  async getAvailability() {
    const services = await serviceRepository.findAllActive();
    const roadsideServices = services.filter((service) => service.category === 'roadside');
    const towingServices = services.filter((service) => service.category === 'towing');

    const items = [
      ...towingServices.map((service) => ({
        serviceType: service.slug,
        label: service.title,
        available: true,
      })),
      ...roadsideServices.map((service) => ({
        serviceType: service.slug,
        label: service.title,
        available: false,
      })),
    ];

    return {
      bookableCount: towingServices.length,
      items,
    };
  }
}

export const roadsideBookingService = new RoadsideBookingService();
