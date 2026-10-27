import React from 'react';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';

interface VehicleTypeArtworkProps {
  type: 'flatbed' | 'wheel_lift' | 'heavy_tow' | 'car';
  size?: number;
  selected?: boolean;
}

export default function VehicleTypeArtwork({
  type,
  size = 48,
  selected = false,
}: VehicleTypeArtworkProps) {
  const primaryColor = selected ? '#D97706' : '#374151';
  const truckBody = selected ? '#F59E0B' : '#6B7280';
  const accent = selected ? '#B45309' : '#1F2937';
  const wheelColor = '#111827';
  const wheelHub = selected ? '#FEF3C7' : '#E5E7EB';

  if (type === 'flatbed') {
    return (
      <Svg width={size} height={size * 0.7} viewBox="0 0 64 44" fill="none">
        {/* Flatbed bed angled */}
        <Path d="M4 22L36 18V24L4 28V22Z" fill={truckBody} />
        <Rect x="2" y="21" width="35" height="3" rx="1.5" fill={accent} />
        {/* Cab */}
        <Path d="M37 14H48L55 24V32H37V14Z" fill={truckBody} />
        {/* Window */}
        <Path d="M40 17H47L52 24H40V17Z" fill="#E0F2FE" />
        {/* Bumper */}
        <Rect x="54" y="28" width="4" height="4" rx="1" fill="#9CA3AF" />
        {/* Wheels */}
        <Circle cx="16" cy="32" r="6" fill={wheelColor} />
        <Circle cx="16" cy="32" r="2.5" fill={wheelHub} />
        <Circle cx="48" cy="32" r="6" fill={wheelColor} />
        <Circle cx="48" cy="32" r="2.5" fill={wheelHub} />
        {/* Beacon light */}
        <Rect x="42" y="11" width="5" height="3" rx="1" fill="#EF4444" />
      </Svg>
    );
  }

  if (type === 'wheel_lift') {
    return (
      <Svg width={size} height={size * 0.7} viewBox="0 0 64 44" fill="none">
        {/* Wheel-lift boom & rear frame */}
        <Path d="M6 31L22 23V27L12 32H6V31Z" fill={accent} />
        <Circle cx="6" cy="32" r="3" fill="#9CA3AF" />
        {/* Truck body */}
        <Path d="M22 19H38V32H22V19Z" fill={truckBody} />
        {/* Cab */}
        <Path d="M38 14H49L56 24V32H38V14Z" fill={truckBody} />
        {/* Window */}
        <Path d="M41 17H48L53 24H41V17Z" fill="#E0F2FE" />
        {/* Wheels */}
        <Circle cx="26" cy="32" r="6" fill={wheelColor} />
        <Circle cx="26" cy="32" r="2.5" fill={wheelHub} />
        <Circle cx="48" cy="32" r="6" fill={wheelColor} />
        <Circle cx="48" cy="32" r="2.5" fill={wheelHub} />
        {/* Light bar */}
        <Rect x="43" y="11" width="5" height="3" rx="1" fill="#EF4444" />
      </Svg>
    );
  }

  if (type === 'heavy_tow') {
    return (
      <Svg width={size} height={size * 0.7} viewBox="0 0 64 44" fill="none">
        {/* Large crane/crane boom */}
        <Path d="M8 12L28 22V27L10 16H8V12Z" fill={accent} />
        <Path d="M26 18H38V32H26V18Z" fill={truckBody} />
        {/* Big heavy-duty cab */}
        <Path d="M38 10H50L58 22V32H38V10Z" fill={truckBody} />
        {/* High grill and window */}
        <Path d="M41 14H49L55 22H41V14Z" fill="#E0F2FE" />
        <Rect x="56" y="24" width="4" height="8" rx="1" fill="#9CA3AF" />
        {/* Dual rear wheels + front wheel */}
        <Circle cx="16" cy="32" r="6" fill={wheelColor} />
        <Circle cx="16" cy="32" r="2" fill={wheelHub} />
        <Circle cx="28" cy="32" r="6" fill={wheelColor} />
        <Circle cx="28" cy="32" r="2" fill={wheelHub} />
        <Circle cx="50" cy="32" r="6" fill={wheelColor} />
        <Circle cx="50" cy="32" r="2" fill={wheelHub} />
        {/* Twin strobe lights */}
        <Rect x="42" y="7" width="3" height="3" rx="0.5" fill="#EF4444" />
        <Rect x="47" y="7" width="3" height="3" rx="0.5" fill="#F59E0B" />
      </Svg>
    );
  }

  // Car / Service Van
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 64 44" fill="none">
      {/* Car chassis & roof */}
      <Path
        d="M10 24L16 16H42L50 24H54C56 24 57 25.5 57 27V30H7V27C7 25.5 8 24 10 24Z"
        fill={truckBody}
      />
      {/* Windows */}
      <Path d="M19 18H30V23H15L19 18Z" fill="#E0F2FE" />
      <Path d="M33 18H41L47 23H33V18Z" fill="#E0F2FE" />
      {/* Lights */}
      <Circle cx="55" cy="26" r="1.5" fill="#FEF08A" />
      <Circle cx="9" cy="26" r="1.5" fill="#EF4444" />
      {/* Wheels */}
      <Circle cx="18" cy="31" r="5.5" fill={wheelColor} />
      <Circle cx="18" cy="31" r="2" fill={wheelHub} />
      <Circle cx="44" cy="31" r="5.5" fill={wheelColor} />
      <Circle cx="44" cy="31" r="2" fill={wheelHub} />
    </Svg>
  );
}
