import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

/** Pixel-perfect Tow Truck vector icon for Driver */
export function TowTruckIcon({ size = 26, color = '#D97706' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Front Cab */}
      <Path
        d="M3 13.5C3 12.67 3.67 12 4.5 12H13V22H3V13.5Z"
        fill={color}
        fillOpacity={0.2}
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      {/* Cab Window */}
      <Path
        d="M5 14H11V18H5V14Z"
        fill={color}
        fillOpacity={0.4}
        stroke={color}
        strokeWidth={1.2}
      />
      {/* Front Bumper */}
      <Path
        d="M3 17H1V22H3"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Flatbed Deck */}
      <Path
        d="M13 20H29V22H13V20Z"
        fill={color}
        stroke={color}
        strokeWidth={1.4}
      />
      {/* Tow Crane Boom (Angled Support) */}
      <Path
        d="M15 20L23 9L27 13"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cable and Winch Hook */}
      <Path
        d="M23 9V17"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray="2 1"
      />
      <Path
        d="M21.5 17.5C21.5 19 23.5 19 23.5 17.5C23.5 16.5 22.5 16 22 16.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Front Wheel */}
      <Circle cx={7} cy={23} r={3.2} fill="#1F2937" stroke={color} strokeWidth={1.4} />
      <Circle cx={7} cy={23} r={1.2} fill="#F9FAFB" />
      {/* Rear Wheel */}
      <Circle cx={23} cy={23} r={3.2} fill="#1F2937" stroke={color} strokeWidth={1.4} />
      <Circle cx={23} cy={23} r={1.2} fill="#F9FAFB" />
    </Svg>
  );
}

/** Pixel-perfect Fleet Headquarters building vector icon for Vendor */
export function FleetBuildingIcon({ size = 26, color = '#4B5563' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      {/* Roof Pediment Gable */}
      <Path
        d="M3 10L14 3L25 10H3Z"
        fill={color}
        fillOpacity={0.16}
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      {/* Architrave / Top Header Beam */}
      <Rect
        x={4}
        y={10}
        width={20}
        height={2}
        fill={color}
        stroke={color}
        strokeWidth={1}
      />
      {/* 4 Architectural Columns */}
      <Path
        d="M7 12V21M11.66 12V21M16.33 12V21M21 12V21"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Base / Plinth Steps */}
      <Path
        d="M2 21H26V23.5H2V21Z"
        fill={color}
        fillOpacity={0.2}
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path
        d="M1 23.5H27"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Driver Type Avatars (Self Driver & Vendor Driver) */
export function SelfDriverAvatar({ size = 52 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <Circle cx={30} cy={30} r={28} fill="#FEF3C7" />
      {/* Head */}
      <Circle cx={30} cy={24} r={10} fill="#FDE68A" />
      {/* Red Cap */}
      <Path d="M20 22C20 16.5 24.5 14 30 14C35.5 14 40 16.5 40 22H20Z" fill="#DC2626" />
      <Path d="M30 18H44" stroke="#DC2626" strokeWidth={3} strokeLinecap="round" />
      {/* Body / Shirt */}
      <Path d="M15 48C15 38 21 34 30 34C39 34 45 38 45 48V54H15V48Z" fill="#1F2937" />
      {/* Steering Wheel */}
      <Circle cx={30} cy={44} r={9} stroke="#F59E0B" strokeWidth={2.5} fill="#111827" />
      <Path d="M21 44H39M30 44V53" stroke="#F59E0B" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function VendorDriverAvatar({ size = 52 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <Circle cx={30} cy={30} r={28} fill="#F3F4F6" />
      {/* Head */}
      <Circle cx={30} cy={24} r={10} fill="#FED7AA" />
      {/* Black Cap with gold accent */}
      <Path d="M20 22C20 16.5 24.5 14 30 14C35.5 14 40 16.5 40 22H20Z" fill="#111827" />
      <Path d="M30 18H44" stroke="#111827" strokeWidth={3} strokeLinecap="round" />
      {/* Polo Shirt (Yellow / Gold top, dark bottom) */}
      <Path d="M15 48C15 38 21 34 30 34C39 34 45 38 45 48V54H15V48Z" fill="#F59E0B" />
      <Path d="M15 46H45V54H15V46Z" fill="#111827" />
      {/* Collar */}
      <Path d="M26 34L30 39L34 34" stroke="#111827" strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}
