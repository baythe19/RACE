import React from 'react';
import { Image, type ImageSourcePropType, Text, View } from 'react-native';

import { API_BASE_URL } from '../../config/env';
import InlineQrCode from '../qr/InlineQrCode';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import {
  BusFront,
  Car,
  CircleDashed,
  Droplet,
  Flame,
  Fuel,
  Leaf,
  Motorbike as Bike,
  PlugZap as Zap,
  Truck,
  type LucideProps,
} from 'lucide-react-native';

import { images } from '../../assets';
import type { FuelType, VehicleType } from '../../types/vehicle';
import { colors, typography } from '../../theme';

export const VEHICLE_YELLOW = '#F59E0B';
export const VEHICLE_BANNER_BG = '#FEF3C7';

export const VEHICLE_COLOR_OPTIONS = [
  { name: 'Red', hex: '#EF4444' },
  { name: 'Silver', hex: '#C0C0C0' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#1F2937' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Gray', hex: '#9CA3AF' },
  { name: 'Brown', hex: '#92400E' },
] as const;

export type UiVehicleType = VehicleType;

function AutoIcon({ size = 24, color = '#6B7280', strokeWidth = 2 }: LucideProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 15h12.5a3.5 3.5 0 0 0 3.5-3.5V9H8.2L6.2 5.5H3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 9h8.2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Circle cx="7.2" cy="17.2" r="1.7" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="15.8" cy="17.2" r="1.7" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M8.9 17.2h5.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export const VEHICLE_TYPE_OPTIONS: Array<{
  id: VehicleType;
  label: string;
  Icon: React.ComponentType<LucideProps>;
}> = [
  { id: 'car', label: 'Car', Icon: Car },
  { id: 'bike', label: 'Bike', Icon: Bike },
  { id: 'ev', label: 'EV', Icon: Zap },
  { id: 'truck', label: 'Truck', Icon: Truck },
  { id: 'auto', label: 'Auto', Icon: AutoIcon },
  { id: 'bus', label: 'Bus', Icon: BusFront },
  { id: 'other', label: 'Other', Icon: CircleDashed },
];

export const VEHICLE_TYPE_IDS: VehicleType[] = VEHICLE_TYPE_OPTIONS.map(option => option.id);

/** Self-serve add vehicle — omit auto-rickshaw; bus and other fleet types stay. */
export const ADD_VEHICLE_TYPE_OPTIONS = VEHICLE_TYPE_OPTIONS.filter(option => option.id !== 'auto');

export const FUEL_TYPE_OPTIONS: Array<{
  id: FuelType;
  label: string;
  Icon: React.ComponentType<LucideProps>;
}> = [
  { id: 'petrol', label: 'Petrol', Icon: Fuel },
  { id: 'diesel', label: 'Diesel', Icon: Droplet },
  { id: 'cng', label: 'CNG', Icon: Flame },
  { id: 'electric', label: 'EV', Icon: Zap },
  { id: 'hybrid', label: 'Hybrid', Icon: Leaf },
  { id: 'other', label: 'Other', Icon: CircleDashed },
];

export const FUEL_TYPE_IDS: FuelType[] = FUEL_TYPE_OPTIONS.map(option => option.id);

export function getVehicleImageSource(type: VehicleType): ImageSourcePropType {
  switch (type) {
    case 'bike':
      return images.booking.vehicleBike;
    case 'truck':
      return images.booking.vehicleTruck;
    case 'bus':
      return images.booking.vehicleBus;
    case 'ev':
      return images.booking.vehicleEv;
    case 'other':
    case 'auto':
      return images.booking.vehicleHatchback;
    default:
      return images.booking.vehicleSedan;
  }
}

export function getColorHex(colorName?: string): string {
  if (!colorName) return colors.grey;
  const match = VEHICLE_COLOR_OPTIONS.find(
    option => option.name.toLowerCase() === colorName.toLowerCase(),
  );
  return match?.hex ?? colors.grey;
}

export function formatFuelLabel(fuelType: FuelType): string {
  const option = FUEL_TYPE_OPTIONS.find(item => item.id === fuelType);
  if (option) return option.label;
  return fuelType.charAt(0).toUpperCase() + fuelType.slice(1);
}

export function formatVehicleTypeLabel(type: VehicleType): string {
  const option = VEHICLE_TYPE_OPTIONS.find(item => item.id === type);
  if (option) return option.label;
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function formatVehicleTypeWithSubtype(vehicle: {
  vehicleType: VehicleType;
  vehicleSubtype?: string;
}): string {
  const typeLabel = formatVehicleTypeLabel(vehicle.vehicleType);
  if (vehicle.vehicleSubtype) {
    return `${typeLabel} • ${vehicle.vehicleSubtype}`;
  }
  return typeLabel;
}

export function VehicleTypeIcon({
  type,
  size,
  color = colors.grey,
  selected = false,
}: {
  type: VehicleType;
  size: number;
  color?: string;
  selected?: boolean;
}) {
  const option = VEHICLE_TYPE_OPTIONS.find(item => item.id === type);
  const Icon = option?.Icon ?? Car;
  const iconColor = selected ? VEHICLE_YELLOW : color;

  return <Icon size={size} color={iconColor} strokeWidth={2} />;
}

export function UiVehicleTypeIcon({
  type,
  size,
  color = colors.grey,
  selected = false,
}: {
  type: UiVehicleType;
  size: number;
  color?: string;
  selected?: boolean;
}) {
  return (
    <VehicleTypeIcon type={type} size={size} color={color} selected={selected} />
  );
}

export function FuelTypeIcon({
  type,
  size,
  color = colors.grey,
  selected = false,
}: {
  type: FuelType;
  size: number;
  color?: string;
  selected?: boolean;
}) {
  const option = FUEL_TYPE_OPTIONS.find(item => item.id === type);
  const Icon = option?.Icon ?? Fuel;
  const iconColor = selected ? VEHICLE_YELLOW : color;

  return <Icon size={size} color={iconColor} strokeWidth={2} />;
}

/** Same URL encoded in backend `getVehicleQrPayload` — scan opens emergency verify flow. */
export function getVehicleQrScanUrl(vehicleId: string): string {
  return `${API_BASE_URL}/api/v1/qr/${vehicleId}`;
}

/** List/detail thumbnail: real data-URL from API, or inline encode of the scan URL. */
export function VehicleEmergencyQrThumb({
  vehicleId,
  qrCodeDataUrl,
  size,
}: {
  vehicleId: string;
  qrCodeDataUrl?: string;
  size: number;
}) {
  if (qrCodeDataUrl?.startsWith('data:image')) {
    return (
      <Image
        source={{ uri: qrCodeDataUrl }}
        style={{ width: size, height: size, borderRadius: size * 0.12 }}
        resizeMode="contain"
      />
    );
  }
  return (
    <InlineQrCode
      value={getVehicleQrScanUrl(vehicleId)}
      size={size}
      backgroundColor="#FFFFFF"
    />
  );
}

export function MiniQrCode({ size }: { size: number }) {
  const pattern = ['1111011', '1010101', '1111011', '1010001', '1111011'];
  const cell = size / pattern[0].length;
  return (
    <Svg width={size} height={size}>
      {pattern.map((row, rowIndex) =>
        row.split('').map((cellValue, colIndex) =>
          cellValue === '1' ? (
            <Rect
              key={`${rowIndex}-${colIndex}`}
              x={colIndex * cell}
              y={rowIndex * cell}
              width={cell - 0.5}
              height={cell - 0.5}
              fill={colors.dark}
            />
          ) : null,
        ),
      )}
    </Svg>
  );
}

export function IndFlagBadge({ px }: { px: (n: number) => number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        width: px(38),
        height: px(26),
        borderRadius: px(4),
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: px(10),
      }}>
      <View
        style={{
          width: px(14),
          backgroundColor: '#1E40AF',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text
          style={{
            fontSize: px(6),
            fontWeight: typography.weights.bold,
            color: colors.background,
          }}>
          IND
        </Text>
      </View>
      <View style={{ flex: 1, backgroundColor: colors.background }} />
    </View>
  );
}

export function VehiclePlaceholderImage({
  type,
  size,
}: {
  type: VehicleType;
  size: number;
}) {
  return (
    <Image
      source={getVehicleImageSource(type)}
      style={{ width: size, height: size * 0.72, borderRadius: 8 }}
      resizeMode="cover"
    />
  );
}
