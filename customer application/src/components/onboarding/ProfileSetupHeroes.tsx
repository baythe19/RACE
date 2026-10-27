import React from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

export const PROFILE_HERO_RATIO = 300 / 960;
export const HERO_VIEWBOX_W = 960;
export const HERO_VIEWBOX_H = 300;

function SceneFrame({
  width,
  height: heightProp,
  compact = 1,
  children,
}: {
  width: number;
  height?: number;
  compact?: number;
  children: React.ReactNode;
}) {
  const height = heightProp ?? width * PROFILE_HERO_RATIO * compact;
  return (
    <Svg pointerEvents="none" width={width} height={height} viewBox="0 0 960 300" preserveAspectRatio="xMidYMid meet">
      {children}
    </Svg>
  );
}

function SharedScenePaint({ prefix }: { prefix: string }) {
  return (
    <Defs>
      <LinearGradient id={`${prefix}Sky`} x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#FFF8EE" />
        <Stop offset="35%" stopColor="#F8EFD8" />
        <Stop offset="100%" stopColor="#F3E2C4" />
      </LinearGradient>
      <LinearGradient id={`${prefix}HillBack`} x1="50%" y1="0%" x2="50%" y2="100%">
        <Stop offset="0%" stopColor="#FCEFD8" stopOpacity={0.9} />
        <Stop offset="100%" stopColor="#FDF7EB" stopOpacity={0.1} />
      </LinearGradient>
      <LinearGradient id={`${prefix}HillMid`} x1="80%" y1="10%" x2="15%" y2="90%">
        <Stop offset="0%" stopColor="#FCE7C3" />
        <Stop offset="55%" stopColor="#FDF2DD" />
        <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.3} />
      </LinearGradient>
      <LinearGradient id={`${prefix}City`} x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#E8DCBE" stopOpacity={0.75} />
        <Stop offset="100%" stopColor="#F5ECE0" stopOpacity={0.2} />
      </LinearGradient>
      <LinearGradient id={`${prefix}Road`} x1="20%" y1="70%" x2="80%" y2="30%">
        <Stop offset="0%" stopColor="#EDE9E1" />
        <Stop offset="35%" stopColor="#DDD8CF" />
        <Stop offset="70%" stopColor="#C5BFB5" />
        <Stop offset="100%" stopColor="#B7B1A6" />
      </LinearGradient>
      <ClipPath id={`${prefix}Clip`}>
        <Rect x="0" y="0" width="960" height="300" />
      </ClipPath>
    </Defs>
  );
}

export function AboutYouHero({
  width,
  height,
  compact = 1,
}: {
  width: number;
  height?: number;
  compact?: number;
}) {
  return (
    <SceneFrame width={width} height={height} compact={compact}>
      <SharedScenePaint prefix="ay" />
      <Defs>
        <LinearGradient id="ayPin" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFC533" />
          <Stop offset="50%" stopColor="#F7A70B" />
          <Stop offset="100%" stopColor="#E28E00" />
        </LinearGradient>
        <LinearGradient id="ayCar" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFD64B" />
          <Stop offset="25%" stopColor="#F8BA18" />
          <Stop offset="75%" stopColor="#E89F0B" />
          <Stop offset="100%" stopColor="#C88002" />
        </LinearGradient>
        <LinearGradient id="ayGlass" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#2D3A49" />
          <Stop offset="70%" stopColor="#1B2531" />
          <Stop offset="100%" stopColor="#101720" />
        </LinearGradient>
      </Defs>
      <Rect width="960" height="300" fill="url(#aySky)" />
      <G clipPath="url(#ayClip)">
        <Path d="M 0,165 C 120,110 240,115 360,160 L 360,300 L 0,300 Z" fill="url(#ayHillBack)" />
        <Path d="M 440,160 C 620,95 760,70 960,95 L 960,300 L 440,300 Z" fill="url(#ayHillMid)" />
        <Path d="M 0,225 C 220,225 330,165 520,160 C 690,155 830,195 960,220 L 960,300 L 0,300 Z" fill="#FFFDF8" opacity={0.92} />
        <G fill="url(#ayCity)">
          <Rect x="472" y="88" width="16" height="78" rx="2" />
          <Rect x="491" y="118" width="15" height="48" rx="1.5" />
          <Rect x="509" y="102" width="18" height="64" rx="2" />
          <Rect x="531" y="65" width="34" height="102" rx="3" />
          <Line x1="548" y1="52" x2="548" y2="65" stroke="#D8C9A8" strokeWidth="1.8" />
          <Rect x="569" y="85" width="28" height="82" rx="2.5" />
          <Rect x="601" y="120" width="16" height="46" rx="1.5" />
          <Rect x="620" y="108" width="30" height="58" rx="2" />
        </G>
        <G opacity={0.9}>
          <Line x1="58" y1="188" x2="58" y2="228" stroke="#BFA885" strokeWidth="2.2" strokeLinecap="round" />
          <Path d="M 58,92 C 72,125 72,175 58,198 Z" fill="#DEC9A7" />
          <Path d="M 58,92 C 44,125 44,175 58,198 Z" fill="#CBB28D" />
        </G>
        <G opacity={0.88}>
          <Line x1="145" y1="195" x2="145" y2="230" stroke="#BFA885" strokeWidth="2" strokeLinecap="round" />
          <Path d="M 145,120 C 157,148 157,185 145,202 Z" fill="#E2D2B5" />
          <Path d="M 145,120 C 133,148 133,185 145,202 Z" fill="#D0BE9C" />
        </G>
        <G opacity={0.9}>
          <Line x1="902" y1="172" x2="902" y2="208" stroke="#BFA885" strokeWidth="2.2" strokeLinecap="round" />
          <Path d="M 902,88 C 916,120 916,165 902,185 Z" fill="#DEC9A7" />
          <Path d="M 902,88 C 888,120 888,165 902,185 Z" fill="#CBB28D" />
        </G>
        <Path
          d="M 450,118 C 520,115 620,122 720,145 C 830,172 905,200 905,225 C 905,258 795,278 630,285 C 440,292 240,295 0,298 L 0,270 C 220,268 410,265 580,258 C 740,252 825,236 825,222 C 825,205 765,188 680,168 C 590,148 510,138 450,132 Z"
          fill="url(#ayRoad)"
        />
        <Path d="M 450,118 C 620,122 720,145 905,225" fill="none" stroke="#FFFFFF" strokeWidth="1.8" opacity={0.6} />
        <Path d="M 0,298 C 240,295 440,292 630,285 C 795,278 905,258 905,225" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity={0.5} />
        <Path
          d="M 470,125 C 560,132 660,154 750,182 C 820,205 865,222 865,232 C 865,248 780,265 620,273 C 440,282 220,288 0,292"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeDasharray="10 9"
          strokeLinecap="round"
          opacity={0.85}
        />
        <Path d="M 0,290 C 180,288 340,286 460,280 L 460,300 L 0,300 Z" fill="#FFFDF8" opacity={0.9} />
        <G transform="translate(768, 48)">
          <Ellipse cx="24" cy="115" rx="9" ry="3.2" fill="#8C6615" opacity={0.32} />
          <Circle cx="24" cy="114" r="2" fill="#E28E00" />
          <Path
            d="M 24,112 C 14,97 -2,78 -2,56 C -2,38 10,24 24,24 C 38,24 50,38 50,56 C 50,78 34,97 24,112 Z"
            fill="url(#ayPin)"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <Circle cx="24" cy="56" r="10.5" fill="#FFFFFF" />
        </G>
        <G transform="translate(230, 100) scale(1.08)">
          <Ellipse cx="118" cy="100" rx="122" ry="10" fill="#1C2128" opacity={0.22} />
          <Ellipse cx="50" cy="100" rx="24" ry="4" fill="#0C0E11" opacity={0.5} />
          <Ellipse cx="186" cy="100" rx="24" ry="4" fill="#0C0E11" opacity={0.5} />
          <Rect x="54" y="96" width="130" height="5" rx="2.5" fill="#15191F" opacity={0.4} />
          <Path d="M 12,88 L 32,88 A 20 20 0 0 1 70,88 L 166,88 A 20 20 0 0 1 204,88 L 226,88 C 229,88 231,85 230,82 L 227,78 L 10,78 L 8,82 C 7,85 9,88 12,88 Z" fill="#1C2127" />
          <Path
            d="M 12,68 C 10,54 18,44 26,42 L 46,38 L 68,14 C 74,8 82,6 90,6 L 165,6 C 174,6 182,10 188,16 L 204,32 L 225,40 C 233,43 236,50 236,58 L 234,74 C 233,80 229,84 224,84 L 204,84 A 20 20 0 0 0 166,84 L 70,84 A 20 20 0 0 0 32,84 L 14,84 C 9,84 6,80 6,75 Z"
            fill="url(#ayCar)"
          />
          <Path d="M 64,15 L 75,7 L 92,7 L 78,15 Z" fill="#E59703" />
          <Path d="M 44,40 L 70,15 C 73,12 77,11 81,11 L 162,11 C 168,11 174,14 178,19 L 198,40 Z" fill="url(#ayGlass)" />
          <Path d="M 48,39 L 71,16 L 82,16 L 82,39 Z" fill="#2A3848" />
          <Rect x="86" y="15" width="38" height="24" fill="#253241" />
          <Path d="M 128,15 L 161,15 C 165,15 170,17 173,21 L 191,39 L 128,39 Z" fill="#2B3A4B" />
          <Rect x="124" y="13" width="4.5" height="27" fill="#182029" />
          <Path d="M 82,13 L 86,13 L 86,40 L 82,40 Z" fill="#182029" />
          <Path d="M 94,17 L 88,36 M 142,17 L 134,36 M 168,17 L 158,36" stroke="#6D8BA9" strokeWidth="1.6" strokeLinecap="round" opacity={0.55} />
          <Path d="M 32,48 C 75,46 140,44 228,52" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity={0.6} />
          <Path d="M 36,66 C 85,65 145,63 226,67" fill="none" stroke="#B87300" strokeWidth="1.4" />
          <Line x1="84" y1="40" x2="84" y2="78" stroke="#CA7E00" strokeWidth="1.2" />
          <Line x1="126" y1="40" x2="126" y2="78" stroke="#CA7E00" strokeWidth="1.2" />
          <Rect x="94" y="47" width="12" height="3" rx="1.5" fill="#E69500" stroke="#FFFFFF" strokeWidth="0.6" />
          <Rect x="136" y="47" width="12" height="3" rx="1.5" fill="#E69500" stroke="#FFFFFF" strokeWidth="0.6" />
          <Path d="M 172,37 C 166,37 164,41 168,44 C 174,45 178,43 178,39 Z" fill="#F8BA18" stroke="#CA7E00" strokeWidth="0.8" />
          <Path d="M 218,45 L 234,51 C 236,54 235,59 231,60 L 216,58 Z" fill="#EBF3FA" stroke="#C5D7E8" strokeWidth="0.8" />
          <Ellipse cx="225" cy="53" rx="4" ry="2.5" fill="#FFFFFF" />
          <Path d="M 8,60 C 8,52 14,48 20,48 L 22,58 L 10,64 Z" fill="#E22618" stroke="#B01509" strokeWidth="0.8" />
          <Rect x="13" y="52" width="4" height="4" rx="1" fill="#FFFFFF" opacity={0.85} />
          <Path d="M 28,84 A 23 23 0 0 1 74,84" fill="none" stroke="#1D2228" strokeWidth="3.5" />
          <Path d="M 162,84 A 23 23 0 0 1 208,84" fill="none" stroke="#1D2228" strokeWidth="3.5" />
          <G transform="translate(185, 84)">
            <Circle cx="0" cy="0" r="19" fill="#1C2026" />
            <Circle cx="0" cy="0" r="16.5" fill="#282E37" />
            <Circle cx="0" cy="0" r="11" fill="#E4E9EF" stroke="#1C2026" strokeWidth="1.8" />
            <Circle cx="0" cy="0" r="4.5" fill="#1C2026" />
            <Line x1="0" y1="-10" x2="0" y2="10" stroke="#1C2026" strokeWidth="2.2" />
            <Line x1="-9.5" y1="-3" x2="9.5" y2="3" stroke="#1C2026" strokeWidth="2.2" />
            <Line x1="-6" y1="8" x2="6" y2="-8" stroke="#1C2026" strokeWidth="2.2" />
            <Circle cx="0" cy="0" r="2.2" fill="#E4E9EF" />
          </G>
          <G transform="translate(51, 84)">
            <Circle cx="0" cy="0" r="19" fill="#1C2026" />
            <Circle cx="0" cy="0" r="16.5" fill="#282E37" />
            <Circle cx="0" cy="0" r="11" fill="#E4E9EF" stroke="#1C2026" strokeWidth="1.8" />
            <Circle cx="0" cy="0" r="4.5" fill="#1C2026" />
            <Line x1="0" y1="-10" x2="0" y2="10" stroke="#1C2026" strokeWidth="2.2" />
            <Line x1="-9.5" y1="-3" x2="9.5" y2="3" stroke="#1C2026" strokeWidth="2.2" />
            <Line x1="-6" y1="8" x2="6" y2="-8" stroke="#1C2026" strokeWidth="2.2" />
            <Circle cx="0" cy="0" r="2.2" fill="#E4E9EF" />
          </G>
        </G>
      </G>
    </SceneFrame>
  );
}

export function EmergencyHero({
  width,
  height,
  compact = 1,
}: {
  width: number;
  height?: number;
  compact?: number;
}) {
  return (
    <SceneFrame width={width} height={height} compact={compact}>
      <SharedScenePaint prefix="em" />
      <Defs>
        <LinearGradient id="emShieldGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFDB58" />
          <Stop offset="45%" stopColor="#F5AF11" />
          <Stop offset="100%" stopColor="#DF8702" />
        </LinearGradient>
        <LinearGradient id="emShieldBevel" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#FFF0A2" />
          <Stop offset="50%" stopColor="#FFB91A" />
          <Stop offset="100%" stopColor="#C57500" />
        </LinearGradient>
      </Defs>
      <Rect width="960" height="300" fill="url(#emSky)" />
      <G clipPath="url(#emClip)">
        <Path d="M 0,160 C 140,110 320,115 480,170 C 640,225 800,165 960,135 L 960,300 L 0,300 Z" fill="url(#emHillBack)" />
        <Path d="M 0,210 C 200,160 410,210 600,185 C 750,165 870,185 960,205 L 960,300 L 0,300 Z" fill="url(#emHillMid)" />
        <Path d="M 0,260 C 220,240 440,270 660,245 C 790,230 890,250 960,265 L 960,300 L 0,300 Z" fill="#FFFDF8" opacity={0.88} />
        <G opacity={0.85}>
          <Line x1="180" y1="180" x2="180" y2="215" stroke="#BFA885" strokeWidth="2" strokeLinecap="round" />
          <Path d="M 180,110 C 192,138 192,175 180,192 Z" fill="#DEC9A7" />
          <Path d="M 180,110 C 168,138 168,175 180,192 Z" fill="#CBB28D" />
        </G>
        <G opacity={0.85}>
          <Line x1="285" y1="205" x2="285" y2="238" stroke="#BFA885" strokeWidth="2" strokeLinecap="round" />
          <Path d="M 285,145 C 295,170 295,198 285,212 Z" fill="#E2D2B5" />
          <Path d="M 285,145 C 275,170 275,198 285,212 Z" fill="#D0BE9C" />
        </G>
        <Path d="M 0,285 C 260,275 520,250 780,210 L 840,210 C 600,260 300,290 0,300 Z" fill="url(#emRoad)" opacity={0.5} />
        <G transform="translate(700, 108) rotate(-7) scale(1.12)">
          <Rect x="-48" y="-92" width="102" height="184" rx="22" fill="#18202A" opacity={0.12} />
          <Rect x="-46" y="-90" width="92" height="178" rx="20" fill="#FFFFFF" stroke="#E1E5EC" strokeWidth="2.5" />
          <Rect x="-40" y="-83" width="80" height="164" rx="15" fill="#F8FAFD" />
          <Rect x="-11" y="-77" width="22" height="3.5" rx="1.8" fill="#D5DAE3" />
          <Circle cx="0" cy="-38" r="23" fill="#E6EFF9" />
          <Circle cx="0" cy="-44" r="8.5" fill="#6589B7" />
          <Path d="M -15,-20 C -15,-30 -8,-32 0,-32 C 8,-32 15,-30 15,-20 Z" fill="#6589B7" />
          <Rect x="-28" y="-4" width="56" height="7.5" rx="3.5" fill="#D8E1ED" />
          <Rect x="-20" y="10" width="40" height="5.5" rx="2.5" fill="#EAF0F8" />
          <Rect x="-24" y="21" width="48" height="5.5" rx="2.5" fill="#EAF0F8" />
          <Rect x="-18" y="32" width="36" height="5.5" rx="2.5" fill="#EAF0F8" />
          <Rect x="-28" y="47" width="56" height="18" rx="9" fill="#FDEBD2" stroke="#F6AF18" strokeWidth="1.2" />
          <Circle cx="-16" cy="56" r="3.5" fill="#E89B07" />
          <Rect x="-8" y="54" width="22" height="4" rx="2" fill="#C57E00" />
        </G>
        <G transform="translate(655, 168)">
          <Path d="M 0,-42 C 22,-42 38,-28 38,-9 C 38,24 10,48 0,58 C -10,48 -38,24 -38,-9 C -38,-28 -22,-42 0,-42 Z" fill="#8C5C00" opacity={0.22} />
          <Path d="M 0,-38 C 20,-38 35,-26 35,-8 C 35,22 9,45 0,54 C -9,45 -35,22 -35,-8 C -35,-26 -20,-38 0,-38 Z" fill="url(#emShieldBevel)" stroke="#FFFFFF" strokeWidth="1" />
          <Path d="M 0,-34 C 17,-34 31,-23 31,-7 C 31,19 7,40 0,48 C -7,40 -31,19 -31,-7 C -31,-23 -17,-34 0,-34 Z" fill="url(#emShieldGold)" />
          <Path d="M 0,-30 C 13,-30 24,-20 24,-5 C 24,13 6,30 0,36 C -6,30 -24,13 -24,-5 C -24,-20 -13,-30 0,-30 Z" fill="none" stroke="#FFF2B2" strokeWidth="1.5" opacity={0.65} />
          <Path d="M -10,-4 L -3,4 L 11,-11" fill="none" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        </G>
      </G>
    </SceneFrame>
  );
}

export function VehicleHero({
  width,
  height,
  compact = 1,
}: {
  width: number;
  height?: number;
  compact?: number;
}) {
  return (
    <SceneFrame width={width} height={height} compact={compact}>
      <SharedScenePaint prefix="vh" />
      <Defs>
        <LinearGradient id="vhSuv" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="55%" stopColor="#F2F4F7" />
          <Stop offset="100%" stopColor="#D7DCE3" />
        </LinearGradient>
        <LinearGradient id="vhGrille" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#2D343D" />
          <Stop offset="100%" stopColor="#15181D" />
        </LinearGradient>
        <LinearGradient id="vhGlass" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#2D3A49" />
          <Stop offset="70%" stopColor="#1B2531" />
          <Stop offset="100%" stopColor="#101720" />
        </LinearGradient>
      </Defs>
      <Rect width="960" height="300" fill="url(#vhSky)" />
      <G clipPath="url(#vhClip)">
        <Path d="M 0,170 C 160,120 340,125 510,175 C 680,225 820,165 960,135 L 960,300 L 0,300 Z" fill="url(#vhHillBack)" />
        <G fill="url(#vhCity)">
          <Rect x="805" y="105" width="16" height="65" rx="1.5" />
          <Rect x="825" y="85" width="28" height="85" rx="2" />
          <Rect x="858" y="110" width="18" height="60" rx="1.5" />
          <Rect x="880" y="122" width="22" height="48" rx="1.5" />
          <Rect x="906" y="96" width="32" height="74" rx="2.5" />
        </G>
        <Path d="M 0,220 C 240,175 480,225 720,195 C 830,180 910,195 960,215 L 960,300 L 0,300 Z" fill="url(#vhHillMid)" />
        <Path d="M 0,265 C 280,250 560,270 820,248 L 960,255 L 960,300 L 0,300 Z" fill="#FFFDF8" opacity={0.9} />
        <G opacity={0.88}>
          <Line x1="85" y1="188" x2="85" y2="228" stroke="#BFA885" strokeWidth="2.2" strokeLinecap="round" />
          <Path d="M 85,92 C 99,125 99,175 85,198 Z" fill="#DEC9A7" />
          <Path d="M 85,92 C 71,125 71,175 85,198 Z" fill="#CBB28D" />
        </G>
        <G opacity={0.85}>
          <Line x1="175" y1="198" x2="175" y2="232" stroke="#BFA885" strokeWidth="2" strokeLinecap="round" />
          <Path d="M 175,125 C 187,152 187,185 175,204 Z" fill="#E2D2B5" />
          <Path d="M 175,125 C 163,152 163,185 175,204 Z" fill="#D0BE9C" />
        </G>
        <Path d="M 0,285 C 280,280 560,270 800,258 L 960,255 L 960,300 L 0,300 Z" fill="url(#vhRoad)" opacity={0.65} />
        <G transform="translate(545, 88) scale(1.18)">
          <Ellipse cx="140" cy="116" rx="145" ry="12" fill="#1A2028" opacity={0.22} />
          <Ellipse cx="60" cy="116" rx="30" ry="5.5" fill="#0C0E11" opacity={0.45} />
          <Ellipse cx="225" cy="116" rx="30" ry="5.5" fill="#0C0E11" opacity={0.45} />
          <Rect x="65" y="112" width="155" height="6" rx="3" fill="#12161D" opacity={0.35} />
          <Path d="M 22,98 L 36,98 A 25 25 0 0 1 84,98 L 202,98 A 25 25 0 0 1 250,98 L 260,98 C 263,98 265,95 264,92 L 261,88 L 18,88 L 16,92 C 15,95 18,98 22,98 Z" fill="#1C2128" />
          <Path
            d="M 20,72 C 16,65 19,55 26,51 L 46,47 L 74,45 L 106,20 C 111,15 119,13 127,13 L 204,13 C 214,13 222,18 226,26 L 245,42 L 256,48 C 262,52 265,59 263,67 L 258,95 L 246,95 A 24 24 0 0 0 206,95 L 80,95 A 24 24 0 0 0 40,95 L 20,95 Z"
            fill="url(#vhSuv)"
          />
          <Path d="M 128,10 L 206,10 L 206,13 L 128,13 Z" fill="#9DA7B3" />
          <Rect x="134" y="13" width="5" height="3" fill="#4B5562" />
          <Rect x="196" y="13" width="5" height="3" fill="#4B5562" />
          <Path d="M 50,45 L 76,21 C 80,17 85,15 91,15 L 118,15 L 98,45 Z" fill="url(#vhGlass)" />
          <Path d="M 122,17 L 162,17 L 162,42 L 105,43 Z" fill="url(#vhGlass)" />
          <Path d="M 168,17 L 204,17 C 210,17 215,20 217,25 L 224,42 L 168,42 Z" fill="url(#vhGlass)" />
          <Rect x="162" y="16" width="6" height="26" fill="#1C222A" />
          <Path d="M 114,15 L 120,15 L 102,43 L 96,43 Z" fill="url(#vhSuv)" />
          <Path d="M 46,47 L 78,45 M 42,54 L 80,52" stroke="#CBD4DF" strokeWidth="1.6" strokeLinecap="round" />
          <Path d="M 22,66 L 38,62 L 38,84 L 24,84 Z" fill="url(#vhGrille)" />
          <Path d="M 24,68 L 36,65 L 36,82 L 26,82 Z" fill="#20252D" stroke="#485362" strokeWidth="0.8" strokeDasharray="3 2" />
          <Ellipse cx="30" cy="74" rx="3.2" ry="2.2" fill="#E8EDF5" />
          <Path d="M 24,61 L 42,57 L 45,61 L 26,65 Z" fill="#FFFFFF" />
          <Rect x="25" y="85" width="8" height="5" rx="1.5" fill="#FFFFFF" opacity={0.85} />
          <Path d="M 22,85 L 38,85 L 35,94 L 22,94 Z" fill="#B4BEC9" />
          <Path d="M 92,38 C 85,38 82,42 85,45 C 91,47 96,45 97,40 Z" fill="#FFFFFF" stroke="#CCD5DF" strokeWidth="1.2" />
          <Path d="M 36,95 A 26 26 0 0 1 88,95" fill="none" stroke="#232932" strokeWidth="4.5" />
          <Path d="M 200,95 A 26 26 0 0 1 252,95" fill="none" stroke="#232932" strokeWidth="4.5" />
          <G transform="translate(62, 95)">
            <Circle cx="0" cy="0" r="22" fill="#1C2127" />
            <Circle cx="0" cy="0" r="19" fill="#292F38" />
            <Circle cx="0" cy="0" r="13" fill="#DDE4EC" stroke="#1C2127" strokeWidth="2.5" />
            <Circle cx="0" cy="0" r="5" fill="#1C2127" />
            <Line x1="-8" y1="-8" x2="8" y2="8" stroke="#FFFFFF" strokeWidth="2" />
            <Line x1="8" y1="-8" x2="-8" y2="8" stroke="#FFFFFF" strokeWidth="2" />
            <Circle cx="0" cy="0" r="2.5" fill="#DDE4EC" />
          </G>
          <G transform="translate(226, 95)">
            <Circle cx="0" cy="0" r="22" fill="#1C2127" />
            <Circle cx="0" cy="0" r="19" fill="#292F38" />
            <Circle cx="0" cy="0" r="13" fill="#DDE4EC" stroke="#1C2127" strokeWidth="2.5" />
            <Circle cx="0" cy="0" r="5" fill="#1C2127" />
            <Line x1="-8" y1="-8" x2="8" y2="8" stroke="#FFFFFF" strokeWidth="2" />
            <Line x1="8" y1="-8" x2="-8" y2="8" stroke="#FFFFFF" strokeWidth="2" />
            <Circle cx="0" cy="0" r="2.5" fill="#DDE4EC" />
          </G>
          <Path d="M 120,44 L 116,90 M 172,44 L 168,90" stroke="#CBD4DF" strokeWidth="1.4" />
          <Rect x="130" y="54" width="13" height="3.5" rx="1.5" fill="#FFFFFF" stroke="#CCD5DF" strokeWidth="0.8" />
          <Rect x="180" y="54" width="13" height="3.5" rx="1.5" fill="#FFFFFF" stroke="#CCD5DF" strokeWidth="0.8" />
        </G>
      </G>
    </SceneFrame>
  );
}

export function AllSetHero({ width, height }: { width: number; height?: number }) {
  const svgHeight = height ?? width * (276 / 520);
  return (
    <Svg pointerEvents="none" width={width} height={svgHeight} viewBox="0 0 520 276" preserveAspectRatio="xMidYMax slice">
      <Defs>
        <LinearGradient id="asSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFF8EE" />
          <Stop offset="22%" stopColor="#FBF6EA" />
          <Stop offset="48%" stopColor="#F8EBCB" />
          <Stop offset="78%" stopColor="#F3D089" />
          <Stop offset="100%" stopColor="#E8A23A" />
        </LinearGradient>
        <LinearGradient id="asFadeTop" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFF8EE" stopOpacity={1} />
          <Stop offset="55%" stopColor="#FFF8EE" stopOpacity={0.45} />
          <Stop offset="100%" stopColor="#FFF8EE" stopOpacity={0} />
        </LinearGradient>
        <RadialGradient id="asSunCore" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFF6C8" />
          <Stop offset="35%" stopColor="#FFD056" />
          <Stop offset="70%" stopColor="#F5A20E" stopOpacity={0.55} />
          <Stop offset="100%" stopColor="#F5A20E" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="asHillFar" x1="50%" y1="0%" x2="50%" y2="100%">
          <Stop offset="0%" stopColor="#F6D9A0" stopOpacity={0.85} />
          <Stop offset="100%" stopColor="#F8E7C4" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="asHillMid" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#F3D6A4" />
          <Stop offset="100%" stopColor="#FBF3E1" />
        </LinearGradient>
        <LinearGradient id="asCityFade" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#D9C49A" />
          <Stop offset="100%" stopColor="#EBD7B0" stopOpacity={0.15} />
        </LinearGradient>
        <LinearGradient id="asAsphalt" x1="50%" y1="0%" x2="50%" y2="100%">
          <Stop offset="0%" stopColor="#D8C9A6" />
          <Stop offset="18%" stopColor="#C4B496" />
          <Stop offset="55%" stopColor="#9E9584" />
          <Stop offset="100%" stopColor="#6F695C" />
        </LinearGradient>
        <LinearGradient id="asSunReflect" x1="50%" y1="0%" x2="50%" y2="100%">
          <Stop offset="0%" stopColor="#FFE7A3" stopOpacity={0.75} />
          <Stop offset="55%" stopColor="#FFD27A" stopOpacity={0.18} />
          <Stop offset="100%" stopColor="#FFD27A" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="asPaint" x1="0%" y1="0%" x2="100%" y2="80%">
          <Stop offset="0%" stopColor="#E39A08" />
          <Stop offset="28%" stopColor="#F5B41C" />
          <Stop offset="62%" stopColor="#FFD056" />
          <Stop offset="100%" stopColor="#F0A90A" />
        </LinearGradient>
        <LinearGradient id="asPaintTop" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFE08A" />
          <Stop offset="100%" stopColor="#F5B41C" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="asCladding" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#2A313C" />
          <Stop offset="100%" stopColor="#12151B" />
        </LinearGradient>
        <LinearGradient id="asGlass" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#4A5C70" />
          <Stop offset="45%" stopColor="#243140" />
          <Stop offset="100%" stopColor="#10161D" />
        </LinearGradient>
        <LinearGradient id="asChrome" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#F4F7FB" />
          <Stop offset="45%" stopColor="#C5CDD8" />
          <Stop offset="100%" stopColor="#8A94A2" />
        </LinearGradient>
        <LinearGradient id="asGrille" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#3A424E" />
          <Stop offset="100%" stopColor="#161A20" />
        </LinearGradient>
        <LinearGradient id="asRubber" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#1A1E24" />
          <Stop offset="50%" stopColor="#2C333E" />
          <Stop offset="100%" stopColor="#1A1E24" />
        </LinearGradient>
      </Defs>

      <Rect width="520" height="276" fill="url(#asSky)" />
      <Circle cx="260" cy="148" r="78" fill="url(#asSunCore)" />
      <Circle cx="260" cy="148" r="28" fill="#FFF4B8" opacity={0.28} />
      <Circle cx="260" cy="148" r="16" fill="#FFF4B8" opacity={0.72} />
      <Circle cx="260" cy="148" r="7" fill="#FFFDF2" />

      <G stroke="#FFE7A0" strokeLinecap="round" fill="none" opacity={0.18}>
        <Line x1="260" y1="148" x2="80" y2="0" strokeWidth="18" />
        <Line x1="260" y1="148" x2="0" y2="40" strokeWidth="26" />
        <Line x1="260" y1="148" x2="0" y2="110" strokeWidth="14" />
        <Line x1="260" y1="148" x2="440" y2="0" strokeWidth="20" />
        <Line x1="260" y1="148" x2="520" y2="36" strokeWidth="28" />
        <Line x1="260" y1="148" x2="520" y2="120" strokeWidth="14" />
        <Line x1="260" y1="148" x2="260" y2="0" strokeWidth="10" />
      </G>

      <Path d="M0,168 C90,138 170,142 250,160 C330,178 400,150 520,136 L520,276 L0,276 Z" fill="url(#asHillFar)" />
      <G fill="url(#asCityFade)">
        <Rect x="168" y="118" width="14" height="52" rx="1.5" />
        <Rect x="184" y="102" width="18" height="68" rx="2" />
        <Rect x="204" y="124" width="12" height="46" rx="1.5" />
        <Rect x="218" y="88" width="26" height="82" rx="2.5" />
        <Rect x="246" y="110" width="16" height="60" rx="2" />
        <Rect x="264" y="96" width="22" height="74" rx="2" />
        <Rect x="288" y="120" width="14" height="50" rx="1.5" />
        <Rect x="304" y="108" width="20" height="62" rx="2" />
        <Rect x="326" y="128" width="12" height="42" rx="1.5" />
      </G>
      <Line x1="231" y1="76" x2="231" y2="88" stroke="#D4C09A" strokeWidth="1.6" />
      <G fill="#F6D889" opacity={0.7}>
        <Rect x="188" y="110" width="3" height="3" />
        <Rect x="196" y="110" width="3" height="3" />
        <Rect x="188" y="118" width="3" height="3" />
        <Rect x="196" y="118" width="3" height="3" />
        <Rect x="224" y="100" width="3.2" height="3.2" />
        <Rect x="232" y="100" width="3.2" height="3.2" />
        <Rect x="224" y="108" width="3.2" height="3.2" />
        <Rect x="232" y="108" width="3.2" height="3.2" />
        <Rect x="270" y="108" width="3" height="3" />
        <Rect x="278" y="108" width="3" height="3" />
        <Rect x="270" y="116" width="3" height="3" />
        <Rect x="278" y="116" width="3" height="3" />
      </G>

      <Path d="M0,196 C140,176 250,198 360,182 C430,172 480,180 520,190 L520,276 L0,276 Z" fill="url(#asHillMid)" />
      <Path d="M0,228 C160,218 300,232 520,214 L520,276 L0,276 Z" fill="#FFF8EC" opacity={0.55} />

      <G opacity={0.92}>
        <Line x1="478" y1="186" x2="478" y2="214" stroke="#B89A70" strokeWidth="2.2" strokeLinecap="round" />
        <Path d="M478,132 C492,156 492,188 478,204 C464,188 464,156 478,132 Z" fill="#E3CBA6" />
        <Path d="M478,132 C468,156 468,188 478,204 C478,188 478,156 478,132 Z" fill="#CDB48C" />
        <Line x1="502" y1="198" x2="502" y2="222" stroke="#B89A70" strokeWidth="1.8" strokeLinecap="round" />
        <Path d="M502,154 C512,172 512,196 502,210 C492,196 492,172 502,154 Z" fill="#DCC4A0" />
      </G>
      <G>
        <Line x1="36" y1="200" x2="36" y2="248" stroke="#A8885E" strokeWidth="2.6" strokeLinecap="round" />
        <Path d="M36,118 C54,152 54,200 36,228 C18,200 18,152 36,118 Z" fill="#E4CCAA" />
        <Path d="M36,118 C24,152 24,200 36,228 C36,200 36,152 36,118 Z" fill="#C9B089" />
        <Line x1="78" y1="214" x2="78" y2="250" stroke="#A8885E" strokeWidth="2.2" strokeLinecap="round" />
        <Path d="M78,148 C92,176 92,210 78,230 C64,210 64,176 78,148 Z" fill="#E0C8A4" />
        <Path d="M78,148 C68,176 68,210 78,230 C78,210 78,176 78,148 Z" fill="#C7AE88" />
      </G>

      <Path d="M0,276 L198,156 L322,156 L520,276 Z" fill="url(#asAsphalt)" />
      <Path d="M248,158 L272,158 L292,276 L228,276 Z" fill="url(#asSunReflect)" />
      <Path d="M198,156 L0,276" fill="none" stroke="#F0B429" strokeWidth="3.2" strokeLinecap="round" opacity={0.9} />
      <Path d="M322,156 L520,276" fill="none" stroke="#F0B429" strokeWidth="3.2" strokeLinecap="round" opacity={0.9} />
      <Path d="M204,158 L30,276" fill="none" stroke="#F7F3EA" strokeWidth="1.4" opacity={0.55} />
      <Path d="M316,158 L490,276" fill="none" stroke="#F7F3EA" strokeWidth="1.4" opacity={0.55} />
      <Path
        d="M260,160 L260,276"
        fill="none"
        stroke="#F8F4EC"
        strokeWidth="3.4"
        strokeDasharray="7 6 9 7 12 8 16 10"
        strokeLinecap="round"
        opacity={0.92}
      />
      <Path
        d="M238,168 L175,276"
        fill="none"
        stroke="#F8F4EC"
        strokeWidth="1.6"
        strokeDasharray="5 8 7 9 10 11"
        strokeLinecap="round"
        opacity={0.35}
      />
      <G opacity={0.55}>
        <Rect x="252" y="161" width="9" height="5" rx="1.2" fill="#D7A031" />
        <Rect x="268" y="163" width="7" height="4" rx="1" fill="#C4B7A0" />
      </G>

      <G transform="translate(16,16)">
        <Rect x="0" y="2" width="128" height="28" rx="14" fill="#FFFFFF" opacity={0.96} />
        <Circle cx="16" cy="16" r="8" fill="none" stroke="#22C55E" strokeWidth="1.2" opacity={0.35} />
        <Circle cx="16" cy="16" r="4.2" fill="#22C55E" />
        <SvgText x="28" y="20" fill="#1A2029" fontSize="10" fontWeight="800" letterSpacing="0.6">
          RACE PATROL
        </SvgText>
      </G>

      <G transform="translate(148,108)">
        <Ellipse cx="128" cy="154" rx="128" ry="11" fill="#1A140C" opacity={0.28} />
        <Ellipse cx="54" cy="154" rx="22" ry="4.5" fill="#0B0D10" opacity={0.5} />
        <Ellipse cx="198" cy="154" rx="22" ry="4.5" fill="#0B0D10" opacity={0.5} />
        <Path d="M40,150 C70,146 160,146 230,151 L210,157 C150,154 80,154 48,157 Z" fill="#16120C" opacity={0.35} />

        <G transform="translate(214,140)" opacity={0.55}>
          <Ellipse cx="0" cy="0" rx="9" ry="16" fill="#1A1E24" />
          <Ellipse cx="0" cy="0" rx="5" ry="9" fill="#C9D1DC" />
        </G>

        <Path
          d="M18,128 L34,128 A20 20 0 0 1 74,128 L186,128 A20 20 0 0 1 226,128 L246,128 L244,136 L20,136 Z"
          fill="url(#asCladding)"
        />
        <Path d="M142,52 L238,52 C244,52 248,56 248,62 L246,128 L142,128 Z" fill="url(#asPaint)" />
        <Path d="M142,52 L238,52 C244,52 248,56 248,62 L246,78 L142,72 Z" fill="url(#asPaintTop)" />
        <Path d="M144,52 L236,52 L236,57 L144,57 Z" fill="#FFE08A" opacity={0.85} />
        <Path d="M236,52 L248,62 L246,68 L236,57 Z" fill="#C98404" />
        <Rect x="150" y="78" width="42" height="42" rx="2.5" fill="#E9A40E" stroke="#C47E00" strokeWidth="1" />
        <Rect x="196" y="78" width="42" height="42" rx="2.5" fill="#E9A40E" stroke="#C47E00" strokeWidth="1" />
        <Rect x="156" y="84" width="30" height="22" rx="1.5" fill="#D8960A" opacity={0.7} />
        <Rect x="202" y="84" width="30" height="22" rx="1.5" fill="#D8960A" opacity={0.7} />
        <Rect x="166" y="108" width="10" height="3.2" rx="1.2" fill="#F4F7FB" />
        <Rect x="212" y="108" width="10" height="3.2" rx="1.2" fill="#F4F7FB" />
        <Circle cx="192" cy="88" r="1.1" fill="#8A5A00" />
        <Circle cx="192" cy="108" r="1.1" fill="#8A5A00" />
        <SvgText
          x="196"
          y="102"
          textAnchor="middle"
          fontSize="13"
          fontWeight="800"
          fontStyle="italic"
          letterSpacing="1.4"
          fill="#FFFFFF"
          opacity={0.95}>
          RACE
        </SvgText>
        <Path d="M150,122 L238,122" stroke="#FFF6D6" strokeWidth="2.2" opacity={0.8} />
        <Path d="M150,125 L238,125" stroke="#C47E00" strokeWidth="0.8" opacity={0.7} />

        <Path
          d="M28,118 C24,108 28,96 38,92 L58,88 L78,58 C82,52 90,48 98,48 L142,48 L142,128 L78,128 L36,128 C30,128 26,124 28,118 Z"
          fill="url(#asPaint)"
        />
        <Path d="M96,48 L142,48 L142,58 L88,58 Z" fill="url(#asPaintTop)" />
        <Path d="M38,92 L78,58 L88,58 L62,92 Z" fill="#F3B31A" />
        <Path d="M40,94 L78,92 L58,118 L36,116 Z" fill="#D89008" opacity={0.35} />
        <Path d="M44,90 C54,78 66,70 76,64" fill="none" stroke="#FFE08A" strokeWidth="1.3" strokeLinecap="round" opacity={0.7} />
        <Path d="M42,100 L70,96" stroke="#C47E00" strokeWidth="1" opacity={0.5} />
        <Path d="M62,88 L80,58 C83,54 88,52 94,52 L140,52 L140,88 Z" fill="url(#asGlass)" />
        <Path d="M78,56 L90,52 L76,88 L64,88 Z" fill="#E39A08" />
        <Rect x="112" y="52" width="5" height="36" fill="#1C222A" />
        <Path d="M68,86 L82,58 L110,58 L110,86 Z" fill="#2A3A4C" />
        <Path d="M118,54 L138,54 L138,86 L118,86 Z" fill="#243342" />
        <Path d="M86,60 L78,84 M126,58 L122,82" stroke="#8AA4BE" strokeWidth="1.6" strokeLinecap="round" opacity={0.45} />
        <Rect x="92" y="64" width="7" height="10" rx="2.5" fill="#1A222C" opacity={0.7} />
        <Rect x="124" y="64" width="7" height="10" rx="2.5" fill="#1A222C" opacity={0.7} />
        <Path d="M72,84 L104,64" stroke="#1C222A" strokeWidth="1.3" strokeLinecap="round" />
        <Path d="M74,86 L98,70" stroke="#1C222A" strokeWidth="1" strokeLinecap="round" />
        <Path d="M62,88 L140,88 L140,91 L60,91 Z" fill="url(#asChrome)" opacity={0.85} />
        <Path d="M90,91 L88,126" stroke="#C47E00" strokeWidth="1.2" />
        <Rect x="96" y="100" width="13" height="3.4" rx="1.5" fill="#F4F7FB" stroke="#C47E00" strokeWidth="0.6" />
        <Rect x="52" y="104" width="6" height="3" rx="1" fill="#FFB000" />
        <Path d="M70,82 C62,82 60,88 64,92 C70,94 76,90 76,84 Z" fill="#F4F7FB" stroke="#C5CDD8" strokeWidth="1.1" />
        <Path d="M66,84 C64,86 64,90 67,90" fill="none" stroke="#4A5C70" strokeWidth="1.1" />
        <Path d="M16,100 L32,96 L34,124 L18,128 C14,128 12,124 14,118 Z" fill="url(#asCladding)" />
        <Path d="M18,102 L32,99 L32,120 L19,122 Z" fill="url(#asGrille)" />
        <G stroke="#6A7380" strokeWidth="1.05">
          <Line x1="20" y1="104" x2="31" y2="102" />
          <Line x1="20" y1="108" x2="31" y2="106" />
          <Line x1="20" y1="112" x2="31" y2="110" />
          <Line x1="20" y1="116" x2="31" y2="114" />
        </G>
        <Ellipse cx="25.5" cy="110" rx="3.4" ry="2.4" fill="url(#asChrome)" />
        <Path d="M16,126 L12,126 L12,132 L18,132" fill="none" stroke="#3A424E" strokeWidth="2" strokeLinecap="round" />
        <Path d="M20,96 L36,92 L38,104 L22,106 Z" fill="#E8F2FC" />
        <Ellipse cx="28" cy="99" rx="4.2" ry="3" fill="#FFFFFF" />
        <Ellipse cx="28" cy="99" rx="2" ry="1.4" fill="#DCE9F7" />
        <Path d="M22,94 L36,91 L36,93.5 L22,96.5 Z" fill="#FFFFFF" opacity={0.95} />
        <Rect x="20" y="118" width="8" height="4" rx="1.2" fill="#F4F7FB" opacity={0.85} />
        <Ellipse cx="38" cy="94" rx="4" ry="2.6" fill="#FFFFFF" opacity={0.7} />
        <Path d="M16,122 L34,120 L32,130 L16,132 Z" fill="url(#asChrome)" opacity={0.8} />
        <Rect x="20" y="123.5" width="12" height="5" rx="0.8" fill="#F4F7FB" stroke="#8A94A2" strokeWidth="0.5" />
        <Rect x="140" y="48" width="6" height="80" fill="#D89008" />
        <Rect x="140" y="48" width="6" height="8" fill="#FFE08A" />
        <Rect x="100" y="40" width="44" height="8" rx="2.5" fill="#1C222A" />
        <Rect x="103" y="41.5" width="38" height="5" rx="2" fill="#2A313C" />
        <Rect x="105" y="41.2" width="10" height="5.4" rx="1.4" fill="#FFBE0A" />
        <Rect x="129" y="41.2" width="10" height="5.4" rx="1.4" fill="#FFBE0A" />
        <Rect x="117" y="42" width="8" height="4" rx="1" fill="#F4F7FB" opacity={0.55} />
        <Path d="M136,48 L138,18" stroke="#2A313C" strokeWidth="1.3" strokeLinecap="round" />
        <Circle cx="138" cy="17" r="1.6" fill="#E39A08" />
        <Path d="M76,128 L184,128 L182,133 L78,133 Z" fill="#2A313C" />
        <Path d="M80,129 L178,129" stroke="#C5CDD8" strokeWidth="0.8" opacity={0.5} />
        <Path d="M240,88 L248,88 L246,108 L238,108 Z" fill="#C81E14" />
        <Path d="M241,90 L246,90 L245,96 L240,96 Z" fill="#F4F7FB" opacity={0.7} />
        <Rect x="148" y="96" width="8" height="10" rx="1.2" fill="none" stroke="#C47E00" strokeWidth="1" />
        <Circle cx="154" cy="101" r="1" fill="#C47E00" />
        <Path d="M70,136 L70,146 L80,146 L80,136" fill="#1C222A" />
        <Path d="M204,136 L204,146 L216,146 L216,136" fill="#1C222A" />

        <G transform="translate(54,140)">
          <Path d="M-22,-12 A24 24 0 0 1 22,-12" fill="none" stroke="#1C222A" strokeWidth="5" />
          <Circle r="21" fill="#0E1115" />
          <Circle r="18.4" fill="url(#asRubber)" />
          <Circle r="16.2" fill="none" stroke="#3A424E" strokeWidth="1.2" />
          <Circle r="12.2" fill="url(#asChrome)" stroke="#1C222A" strokeWidth="1.6" />
          <G stroke="#1C222A" strokeWidth="2.3" strokeLinecap="round">
            <Line x1="0" y1="-11" x2="0" y2="11" />
            <Line x1="-9.5" y1="-5.5" x2="9.5" y2="5.5" />
            <Line x1="9.5" y1="-5.5" x2="-9.5" y2="5.5" />
          </G>
          <Circle r="5.2" fill="#1C222A" />
          <Circle r="3.2" fill="url(#asChrome)" />
          <Ellipse cy="20" rx="16" ry="2.1" fill="#0B0D10" opacity={0.55} />
        </G>
        <G transform="translate(206,140)">
          <Path d="M-22,-12 A24 24 0 0 1 22,-12" fill="none" stroke="#1C222A" strokeWidth="5" />
          <Circle r="21" fill="#0E1115" />
          <Circle r="18.4" fill="url(#asRubber)" />
          <Circle r="16.2" fill="none" stroke="#3A424E" strokeWidth="1.2" />
          <Circle r="12.2" fill="url(#asChrome)" stroke="#1C222A" strokeWidth="1.6" />
          <G stroke="#1C222A" strokeWidth="2.3" strokeLinecap="round">
            <Line x1="0" y1="-11" x2="0" y2="11" />
            <Line x1="-9.5" y1="-5.5" x2="9.5" y2="5.5" />
            <Line x1="9.5" y1="-5.5" x2="-9.5" y2="5.5" />
          </G>
          <Circle r="5.2" fill="#1C222A" />
          <Circle r="3.2" fill="url(#asChrome)" />
          <Ellipse cy="20" rx="16" ry="2.1" fill="#0B0D10" opacity={0.55} />
        </G>
      </G>
      <Rect x="0" y="0" width="520" height="70" fill="url(#asFadeTop)" />
    </Svg>
  );
}
