import type { DriverVehicleCategory } from '../types/fare';
import type { VehicleType } from '../types/vehicle';

export function getVehicleCategory(
  vehicleType: VehicleType | string,
  vehicleSubtype?: string,
): DriverVehicleCategory {
  const subtype = vehicleSubtype?.trim().toLowerCase() ?? '';

  if (subtype.includes('hatchback') || subtype.includes('scooter') || subtype.includes('commuter')) {
    return 'hatchback';
  }
  if (subtype.includes('sedan')) {
    return 'sedan';
  }
  if (
    subtype.includes('suv') ||
    subtype.includes('muv') ||
    subtype.includes('truck') ||
    subtype.includes('coach') ||
    subtype.includes('bus')
  ) {
    return 'suv';
  }

  switch (String(vehicleType ?? '').toLowerCase()) {
    case 'truck':
    case 'bus':
      return 'suv';
    case 'bike':
    case 'auto':
      return 'hatchback';
    case 'ev':
      return subtype.includes('car') ? 'sedan' : 'hatchback';
    case 'car':
      return 'sedan';
    default:
      return 'hatchback';
  }
}

export function getVehicleCategoryLabel(category: DriverVehicleCategory): string {
  const labels: Record<DriverVehicleCategory, string> = {
    hatchback: 'Hatchback',
    sedan: 'Sedan',
    suv: 'SUV',
  };
  return labels[category];
}
