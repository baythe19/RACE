import React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

interface VerificationUnderReviewArtworkProps {
  size?: number;
}

export default function VerificationUnderReviewArtwork({
  size = 140,
}: VerificationUnderReviewArtworkProps) {
  const width = size;
  const height = size * 0.95;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={width} height={height} viewBox="0 0 160 152" fill="none">
        <Defs>
          {/* Soft background glow gradient */}
          <LinearGradient id="bgGlow" x1="80" y1="20" x2="80" y2="140" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.85" />
            <Stop offset="100%" stopColor="#FFFBEB" stopOpacity="0.1" />
          </LinearGradient>

          {/* Clipboard gradient */}
          <LinearGradient id="boardGrad" x1="45" y1="20" x2="115" y2="130" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#FFFDF7" />
          </LinearGradient>

          {/* Clock rim gradient */}
          <LinearGradient id="clockRim" x1="100" y1="65" x2="145" y2="115" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#F59E0B" />
            <Stop offset="100%" stopColor="#D97706" />
          </LinearGradient>
        </Defs>

        {/* Backdrop Glow & Skyline Silhouette */}
        <Circle cx="80" cy="76" r="68" fill="url(#bgGlow)" />
        <Path
          d="M20 120H32V98H42V120H55V88H68V120H92V92H105V120H120V98H130V120H140"
          stroke="#FDE68A"
          strokeWidth="1.5"
          strokeOpacity="0.6"
        />

        {/* Clipboard Body */}
        {/* Board base border */}
        <Rect
          x="44"
          y="28"
          width="72"
          height="92"
          rx="12"
          fill="#FDE68A"
        />
        {/* Paper sheet */}
        <Rect
          x="47"
          y="31"
          width="66"
          height="86"
          rx="9"
          fill="url(#boardGrad)"
          stroke="#F59E0B"
          strokeWidth="2"
        />

        {/* Clipboard Top Clip */}
        <Rect x="65" y="21" width="30" height="13" rx="4" fill="#F59E0B" />
        <Rect x="71" y="25" width="18" height="5" rx="2" fill="#FFFFFF" opacity={0.9} />

        {/* Clipboard Document Content lines */}
        {/* Checklist box 1 */}
        <Rect x="56" y="47" width="10" height="10" rx="3" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.2" />
        <Path d="M59 52L61 54L64 49" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" />
        {/* Line 1 */}
        <Rect x="71" y="50" width="32" height="4" rx="2" fill="#E5E7EB" />

        {/* Checklist box 2 */}
        <Rect x="56" y="65" width="10" height="10" rx="3" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.2" />
        <Path d="M59 70L61 72L64 67" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" />
        {/* Line 2 */}
        <Rect x="71" y="68" width="26" height="4" rx="2" fill="#E5E7EB" />

        {/* Line 3 (shorter) */}
        <Rect x="56" y="85" width="30" height="4" rx="2" fill="#F3F4F6" />
        <Rect x="56" y="94" width="22" height="4" rx="2" fill="#F3F4F6" />

        {/* Glowing Clock Badge Overlaid on bottom right */}
        {/* Outer shadow / soft ring */}
        <Circle cx="114" cy="95" r="26" fill="#FFFBEB" />
        {/* Clock Orange Rim */}
        <Circle cx="114" cy="95" r="22" fill="#FFFFFF" stroke="url(#clockRim)" strokeWidth="4.5" />
        {/* Center dot */}
        <Circle cx="114" cy="95" r="2.5" fill="#D97706" />
        {/* Clock Hands at ~10:10 */}
        <Path
          d="M114 95L114 83"
          stroke="#D97706"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Path
          d="M114 95L124 95"
          stroke="#D97706"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Sparkle details */}
        <Path
          d="M34 40L36 34L38 40L44 42L38 44L36 50L34 44L28 42L34 40Z"
          fill="#FDE68A"
        />
        <Path
          d="M136 48L137.5 43L139 48L144 49.5L139 51L137.5 56L136 51L131 49.5L136 48Z"
          fill="#FDE68A"
        />
      </Svg>
    </View>
  );
}
