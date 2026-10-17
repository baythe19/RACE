import React from 'react';
import { Image, StyleSheet } from 'react-native';

type VehicleImageType = 'flatbed' | 'wheel_lift' | 'heavy_tow' | 'other';

const vehicleImages = {
  flatbed: require('../../assets/vehicles/flatbed-tow.png'),
  wheel_lift: require('../../assets/vehicles/wheel-lift-tow.png'),
  heavy_tow: require('../../assets/vehicles/heavy-tow.png'),
  other: require('../../assets/vehicles/service-van.png'),
};

const imageLabels: Record<VehicleImageType, string> = {
  flatbed: 'Flatbed tow truck',
  wheel_lift: 'Wheel-lift tow truck',
  heavy_tow: 'Heavy tow truck',
  other: 'Other fleet vehicle',
};

interface VendorVehicleImageProps {
  type: VehicleImageType;
  size?: number;
}

export default function VendorVehicleImage({ type, size = 48 }: VendorVehicleImageProps) {
  return (
    <Image
      source={vehicleImages[type]}
      resizeMode="contain"
      accessibilityLabel={imageLabels[type]}
      style={[styles.image, { width: size, height: Math.round(size * 0.7) }]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    maxWidth: '100%',
  },
});
