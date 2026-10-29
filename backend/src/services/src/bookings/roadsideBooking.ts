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

/** Flat MVP fares — keep in sync with customer `constants/roadsideBooking.ts`. */
const ROADSIDE_FLAT_FARES: Record<string, number> = {
  roadside_flat_tyre: 199,
  roadside_battery_jump: 299,
  roadside_fuel_delivery: 149,
  roadside_minor_repair: 399,
};

const KNOWN_SERVICE_TYPES = new Set([
  ...TOWING_SERVICE_TYPES,
  ...Object.keys(ROADSIDE_FLAT_FARES),
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

    const flatFare = ROADSIDE_FLAT_FARES[normalizedType];
    if (!flatFare) {
      return {
        available: false,
        message: `${resolveServiceLabel(normalizedType)} is coming soon`,
        serviceType: normalizedType,
      };
    }

    const booking = await towingBookingService.createRoadsideOnSiteBooking(customerId, {
      vehicleId: dto.vehicleId,
      pickup: dto.pickup,
      serviceType: normalizedType,
      serviceLabel: resolveServiceLabel(normalizedType),
      flatFare,
      scheduledAt: dto.scheduledAt,
    });

    return {
      available: true,
      serviceType: normalizedType,
      booking,
    };
  }

  async getAvailability() {
    const services = await serviceRepository.findAllActive();
    const roadsideServices = services.filter((service) => service.category === 'roadside');
    const towingServices = services.filter((service) => service.category === 'towing');

    const defaultTowingItems = [...TOWING_SERVICE_TYPES].map((slug) => ({
      serviceType: slug,
      label: resolveServiceLabel(slug),
      available: true,
    }));

    const defaultRoadsideItems = Object.keys(ROADSIDE_FLAT_FARES).map((slug) => ({
      serviceType: slug,
      label: resolveServiceLabel(slug),
      available: true,
    }));

    const items =
      towingServices.length + roadsideServices.length > 0
        ? [
            ...towingServices.map((service) => ({
              serviceType: service.slug,
              label: service.title,
              available: true,
            })),
            ...roadsideServices.map((service) => ({
              serviceType: service.slug,
              label: service.title,
              available: Object.prototype.hasOwnProperty.call(ROADSIDE_FLAT_FARES, service.slug),
            })),
          ]
        : [...defaultTowingItems, ...defaultRoadsideItems];

    const bookableRoadside = items.filter(
      (item) => ROADSIDE_FLAT_FARES[item.serviceType] != null,
    ).length;

    const bookableTowing = items.filter((item) => TOWING_SERVICE_TYPES.has(item.serviceType)).length;

    return {
      bookableCount: bookableTowing + bookableRoadside,
      items,
    };
  }
}

export const roadsideBookingService = new RoadsideBookingService();
