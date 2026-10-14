import React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

interface VerificationUnderReviewArtworkProps {
  size?: number;
}

export default function VerificationUnderReviewArtwork({
  size = 175,
}: VerificationUnderReviewArtworkProps) {
  const width = size;
  const height = size * 0.92;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={width} height={height} viewBox="0 0 200 180" fill="none">
        <Defs>
          {/* Radial aura glow */}
          <RadialGradient id="auraGlow" cx="50%" cy="45%" r="50%">
            <Stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.95" />
            <Stop offset="65%" stopColor="#FFFBEB" stopOpacity="0.45" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>

          {/* Board gradient */}
          <LinearGradient id="boardBase" x1="60" y1="20" x2="140" y2="155" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#F59E0B" />
            <Stop offset="100%" stopColor="#D97706" />
          </LinearGradient>

          {/* Paper sheet */}
          <LinearGradient id="paperSheet" x1="65" y1="30" x2="135" y2="145" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#FAFAFA" />
          </LinearGradient>

          {/* Clip metallic gradient */}
          <LinearGradient id="clipMetal" x1="80" y1="18" x2="120" y2="34" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#FDE68A" />
            <Stop offset="50%" stopColor="#F59E0B" />
            <Stop offset="100%" stopColor="#B45309" />
          </LinearGradient>

          {/* Clock gradient */}
          <LinearGradient id="clockRimGrad" x1="125" y1="85" x2="175" y2="140" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#FBBF24" />
            <Stop offset="50%" stopColor="#F59E0B" />
            <Stop offset="100%" stopColor="#D97706" />
          </LinearGradient>

          {/* Shield gradient */}
          <LinearGradient id="shieldGrad" x1="28" y1="35" x2="52" y2="65" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#3B82F6" />
            <Stop offset="100%" stopColor="#1D4ED8" />
          </LinearGradient>
        </Defs>

        {/* Ground shadow */}
        <Ellipse cx="100" cy="162" rx="72" ry="9" fill="#000000" fillOpacity="0.06" />

        {/* Ambient Aura Background */}
        <Circle cx="100" cy="85" r="78" fill="url(#auraGlow)" />

        {/* Orbital tech ring dashed */}
        <Circle
          cx="100"
          cy="85"
          r="74"
          stroke="#FDE68A"
          strokeWidth="1.2"
          strokeDasharray="4 6"
          strokeOpacity="0.75"
        />

        {/* Document Board Drop Shadow */}
        <Rect x="59" y="32" width="82" height="106" rx="14" fill="#000000" fillOpacity="0.07" />

        {/* Clipboard Base (Amber Leather / Metal) */}
        <Rect
          x="57"
          y="28"
          width="86"
          height="108"
          rx="14"
          fill="url(#boardBase)"
        />

        {/* Paper Sheet */}
        <Rect
          x="62"
          y="34"
          width="76"
          height="97"
          rx="9"
          fill="url(#paperSheet)"
          stroke="#FDE68A"
          strokeWidth="1"
        />

        {/* Paper Header Stripe */}
        <Rect x="62" y="34" width="76" height="12" rx="9" fill="#FEF3C7" />
        <Rect x="62" y="42" width="76" height="4" fill="#FEF3C7" />

        {/* Mini Driver Avatar Silhouette on Paper Header */}
        <Circle cx="74" cy="40" r="3.5" fill="#D97706" />
        <Path d="M69 46C69 44.2 71.2 43 74 43C76.8 43 79 44.2 79 46" stroke="#D97706" strokeWidth="1" />

        {/* Header Title Bar */}
        <Rect x="83" y="38" width="34" height="4" rx="2" fill="#D97706" />

        {/* Clipboard Metal Clip (Top Center) */}
        <Rect x="84" y="21" width="32" height="15" rx="5" fill="url(#clipMetal)" />
        <Rect x="90" y="25" width="20" height="5.5" rx="2.5" fill="#FFFFFF" fillOpacity="0.85" />
        <Circle cx="100" cy="24" r="1.5" fill="#78350F" />

        {/* Document Verification Row 1: ID Verified */}
        <Rect x="70" y="56" width="10" height="10" rx="3" fill="#DCFCE7" stroke="#16A34A" strokeWidth="1.2" />
        <Path d="M72.5 61L74.5 63L77.5 58" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <Rect x="84" y="59" width="44" height="4" rx="2" fill="#E2E8F0" />

        {/* Document Verification Row 2: Driving Licence Verified */}
        <Rect x="70" y="73" width="10" height="10" rx="3" fill="#DCFCE7" stroke="#16A34A" strokeWidth="1.2" />
        <Path d="M72.5 78L74.5 80L77.5 75" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <Rect x="84" y="76" width="38" height="4" rx="2" fill="#E2E8F0" />

        {/* Document Verification Row 3: Vehicle RC in progress (Amber dot) */}
        <Rect x="70" y="90" width="10" height="10" rx="3" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.2" />
        <Circle cx="75" cy="95" r="2" fill="#D97706" />
        <Rect x="84" y="93" width="32" height="4" rx="2" fill="#F1F5F9" />

        {/* Document Verification Row 4: Background check pending */}
        <Rect x="70" y="107" width="10" height="10" rx="3" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
        <Rect x="84" y="110" width="28" height="4" rx="2" fill="#F1F5F9" />

        {/* Document Official Stamp / Seal (Bottom Left of paper) */}
        <Circle cx="78" cy="122" r="6" stroke="#2563EB" strokeWidth="0.8" strokeDasharray="1.5 1" strokeOpacity="0.45" />
        <Circle cx="78" cy="122" r="4" fill="#EFF6FF" fillOpacity="0.6" />
        <Path d="M76 122L77.5 123.5L80 120.5" stroke="#2563EB" strokeWidth="0.9" strokeLinecap="round" />

        {/* Top-Left Floating Security Shield Badge */}
        <G>
          <Circle cx="40" cy="50" r="16" fill="#FFFFFF" />
          <Path
            d="M40 37L51 41.5V49C51 55.5 46.5 60.5 40 62.5C33.5 60.5 29 55.5 29 49V41.5L40 37Z"
            fill="url(#shieldGrad)"
          />
          <Path
            d="M36 50L39 53L45 46"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>

        {/* Bottom-Right Prominent Clock / Review Time Badge */}
        <G>
          {/* Badge soft shadow */}
          <Circle cx="146" cy="118" r="28" fill="#000000" fillOpacity="0.08" />
          {/* Badge white glow container */}
          <Circle cx="145" cy="116" r="27" fill="#FFFBEB" />
          {/* Clock Outer Rim */}
          <Circle
            cx="145"
            cy="116"
            r="23"
            fill="#FFFFFF"
            stroke="url(#clockRimGrad)"
            strokeWidth="4"
          />
          {/* Center Hub */}
          <Circle cx="145" cy="116" r="2.8" fill="#D97706" />
          {/* Hour Hand */}
          <Path
            d="M145 116L145 103"
            stroke="#D97706"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Minute Hand */}
          <Path
            d="M145 116L156 116"
            stroke="#D97706"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          {/* Ticking dots */}
          <Circle cx="145" cy="98" r="1" fill="#F59E0B" />
          <Circle cx="163" cy="116" r="1" fill="#F59E0B" />
          <Circle cx="145" cy="134" r="1" fill="#F59E0B" />
          <Circle cx="127" cy="116" r="1" fill="#F59E0B" />

          {/* Tiny attached Verification Badge on Clock */}
          <Circle cx="164" cy="100" r="7.5" fill="#15803D" stroke="#FFFFFF" strokeWidth="1.8" />
          <Path d="M161.5 100L163.5 102L167 98" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </G>

        {/* Micro Sparkles & Stars */}
        {/* Top-Right Big Sparkle */}
        <Path
          d="M165 42L167.5 35L170 42L177 44.5L170 47L167.5 54L165 47L158 44.5L165 42Z"
          fill="#F59E0B"
        />
        {/* Mid-Left Small Sparkle */}
        <Path
          d="M24 88L25.5 83L27 88L32 89.5L27 91L25.5 96L24 91L19 89.5L24 88Z"
          fill="#FBBF24"
        />
        {/* Bottom Sparkle */}
        <Path
          d="M50 142L51.5 138L53 142L57 143.5L53 145L51.5 149L50 145L46 143.5L50 142Z"
          fill="#FDE68A"
        />
        {/* Floating amber particle dots */}
        <Circle cx="178" cy="74" r="2.2" fill="#FDE68A" />
        <Circle cx="35" cy="116" r="1.8" fill="#FDE68A" />
        <Circle cx="130" cy="26" r="2" fill="#FBBF24" />
      </Svg>
    </View>
  );
}
