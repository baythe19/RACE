import React from 'react';

import LocationPickerModal from '../common/LocationPickerModal';

export interface SelectedLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export interface LocationPickerMapProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelected: (location: SelectedLocation) => void;
  title: string;
  initialLocation?: { latitude: number; longitude: number };
  accentColor?: string;
}

/**
 * Same picker as every other map in the customer app.
 * Kept so older imports don't grow a second map chrome.
 */
export default function LocationPickerMap({
  visible,
  onClose,
  onLocationSelected,
  title,
  initialLocation,
  accentColor,
}: LocationPickerMapProps) {
  return (
    <LocationPickerModal
      visible={visible}
      onClose={onClose}
      title={title}
      accentColor={accentColor}
      confirmLabel="Use this location"
      initialLocation={
        initialLocation
          ? { latitude: initialLocation.latitude, longitude: initialLocation.longitude, address: '' }
          : undefined
      }
      onLocationSelected={location => {
        onLocationSelected({
          address: location.displayLabel || location.address,
          latitude: location.latitude,
          longitude: location.longitude,
        });
      }}
    />
  );
}
