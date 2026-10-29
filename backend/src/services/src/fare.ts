import { getDistanceAndDuration } from './googleMaps';
import {
  calculateDriverFare,
  calculateTowingFare,
  type DriverFareBreakdown,
  type DriverPackageHours,
  type TowingFareBreakdown,
} from './bookings/booking';
import type { DriverFareQueryDto, TowingFareQueryDto } from './fareValidator';

export class FareService {
  async estimateTowingFare(query: TowingFareQueryDto): Promise<{
    estimatedFare: number;
    distanceKm?: number;
    durationMinutes?: number;
    fareBreakdown: TowingFareBreakdown;
  }> {
    const pickup = { latitude: query.pickup_lat, longitude: query.pickup_lng };
    const dropoff = { latitude: query.dropoff_lat, longitude: query.dropoff_lng };
    const scheduledAt = query.scheduledAt ? new Date(query.scheduledAt) : undefined;
    const towingMode =
      query.towingMode ??
      (scheduledAt ? ('scheduled' as const) : ('instant' as const));

    const matrix = await getDistanceAndDuration(pickup, dropoff);
    const { fare, breakdown } = calculateTowingFare(
      matrix?.distanceKm ?? 0,
      scheduledAt,
      towingMode,
    );

    return {
      estimatedFare: fare,
      distanceKm: matrix?.distanceKm ?? breakdown.distanceKm,
      durationMinutes: matrix?.durationMinutes,
      fareBreakdown: breakdown,
    };
  }

  estimateDriverFare(query: DriverFareQueryDto): {
    estimatedFare: number;
    fareBreakdown: DriverFareBreakdown;
  } {
    const vehicleCategory = query.vehicleCategory ?? query.vehicleType ?? 'hatchback';
    const packageHours = Number(query.packageHours) as DriverPackageHours;
    const { fare, breakdown } = calculateDriverFare(packageHours, vehicleCategory);

    return {
      estimatedFare: fare,
      fareBreakdown: breakdown,
    };
  }
}

export const fareService = new FareService();
