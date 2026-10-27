export interface VehicleTypeOption {
  id: string;
  label: string;
  description: string;
  backendType: 'Tow Driver' | 'Full-Time' | 'Part-Time';
  illustrationType: 'flatbed' | 'wheel_lift' | 'heavy_tow' | 'car';
}

export const DRIVER_VEHICLE_TYPE_CARDS: VehicleTypeOption[] = [
  {
    id: 'flatbed',
    label: 'Flatbed',
    description: 'Hydraulic tilt & slide bed for all vehicles',
    backendType: 'Tow Driver',
    illustrationType: 'flatbed',
  },
  {
    id: 'wheel_lift',
    label: 'Wheel-lift',
    description: 'Hydraulic boom lifts under front/rear wheels',
    backendType: 'Tow Driver',
    illustrationType: 'wheel_lift',
  },
  {
    id: 'heavy_tow',
    label: 'Heavy tow',
    description: 'Commercial wrecker for buses & trucks',
    backendType: 'Tow Driver',
    illustrationType: 'heavy_tow',
  },
  {
    id: 'car',
    label: 'Car',
    description: 'Quick jumpstart & roadside support vehicle',
    backendType: 'Part-Time',
    illustrationType: 'car',
  },
];
