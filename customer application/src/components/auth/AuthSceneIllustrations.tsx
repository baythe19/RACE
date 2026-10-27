import React from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { AUTH_COLORS as COLORS, AUTH_HERO_RATIO } from './authDesign';

function HeroEdgeFades({ idPrefix }: { idPrefix: string }) {
  return (
    <>
      <Defs>
        <LinearGradient id={`${idPrefix}FadeTop`} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={COLORS.background} stopOpacity={1} />
          <Stop offset="42%" stopColor={COLORS.background} stopOpacity={0.45} />
          <Stop offset="100%" stopColor={COLORS.background} stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={`${idPrefix}FadeRight`} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={COLORS.background} stopOpacity={0} />
          <Stop offset="40%" stopColor={COLORS.background} stopOpacity={0.22} />
          <Stop offset="100%" stopColor={COLORS.background} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="1000" height="96" fill={`url(#${idPrefix}FadeTop)`} />
      <Rect x="748" y="0" width="252" height="400" fill={`url(#${idPrefix}FadeRight)`} />
    </>
  );
}

export function LoginIllustration({ width, compact = 1 }: { width: number; compact?: number }) {
  const height = width * AUTH_HERO_RATIO * compact;
  return (
    <Svg
      pointerEvents="none"
      width={width}
      height={height}
      viewBox="0 0 1000 400"
      preserveAspectRatio="xMidYMid meet">
      <Defs>
        <LinearGradient id="wbSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FDFCF9" />
          <Stop offset="100%" stopColor="#FBF7EE" />
        </LinearGradient>
        <LinearGradient id="wbHillBack" x1="30%" y1="0%" x2="70%" y2="100%">
          <Stop offset="0%" stopColor="#FCEFD2" />
          <Stop offset="100%" stopColor="#FFFEFA" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="wbHillRight" x1="100%" y1="10%" x2="10%" y2="100%">
          <Stop offset="0%" stopColor="#FBE9CB" />
          <Stop offset="55%" stopColor="#FDF5E5" />
          <Stop offset="100%" stopColor="#FFFEFA" />
        </LinearGradient>
        <LinearGradient id="wbCityFade" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#E9E3D6" stopOpacity={0.85} />
          <Stop offset="100%" stopColor="#F4EEE0" stopOpacity={0.15} />
        </LinearGradient>
        <LinearGradient id="wbRoadGrad" x1="0%" y1="30%" x2="100%" y2="70%">
          <Stop offset="0%" stopColor="#F2F0EA" />
          <Stop offset="45%" stopColor="#E2E0D8" />
          <Stop offset="80%" stopColor="#CBC8BE" />
          <Stop offset="100%" stopColor="#BDBAB0" />
        </LinearGradient>
        <LinearGradient id="wbRoadEdge" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.5} />
          <Stop offset="100%" stopColor="#9C9890" stopOpacity={0.35} />
        </LinearGradient>
        <LinearGradient id="wbPinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FAC53A" />
          <Stop offset="100%" stopColor="#E89A0D" />
        </LinearGradient>
        <LinearGradient id="wbCarBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFD254" />
          <Stop offset="30%" stopColor="#F7BB24" />
          <Stop offset="80%" stopColor="#E29D0E" />
          <Stop offset="100%" stopColor="#C98304" />
        </LinearGradient>
        <RadialGradient id="wbPinShadow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#8A6615" stopOpacity={0.45} />
          <Stop offset="100%" stopColor="#8A6615" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      <Rect x="0" y="0" width="1000" height="400" fill="url(#wbSkyGrad)" />

      <G opacity={0.5}>
        <Ellipse cx="200" cy="55" rx="55" ry="10" fill="#FFF8E8" />
        <Ellipse cx="640" cy="40" rx="70" ry="12" fill="#FFF8E8" />
      </G>

      <Path
        d="M 38,232 C 95,148 158,82 248,82 C 338,82 388,160 445,232 L 445,400 L 38,400 Z"
        fill="url(#wbHillBack)"
      />
      <Path d="M 615,222 C 718,178 835,138 1000,116 L 1000,400 L 615,400 Z" fill="url(#wbHillRight)" />

      <G fill="url(#wbCityFade)">
        <Rect x="386" y="98" width="16" height="122" rx="2" />
        <Rect x="407" y="144" width="17" height="76" rx="2" />
        <Rect x="429" y="170" width="15" height="50" rx="2" />
        <Rect x="449" y="183" width="13" height="37" rx="1.5" />
        <Rect x="466" y="134" width="21" height="86" rx="2.5" />
        <Rect x="492" y="156" width="17" height="64" rx="2" />
        <Rect x="517" y="108" width="44" height="112" rx="4" />
        <Rect x="567" y="132" width="40" height="88" rx="3" />
      </G>
      <G fill="#FCF8EF" opacity={0.55}>
        <Rect x="525" y="120" width="4" height="4" />
        <Rect x="536" y="120" width="4" height="4" />
        <Rect x="547" y="120" width="4" height="4" />
        <Rect x="525" y="134" width="4" height="4" />
        <Rect x="536" y="134" width="4" height="4" />
        <Rect x="547" y="134" width="4" height="4" />
        <Rect x="525" y="148" width="4" height="4" />
        <Rect x="536" y="148" width="4" height="4" />
        <Rect x="547" y="148" width="4" height="4" />
        <Rect x="525" y="162" width="4" height="4" />
        <Rect x="536" y="162" width="4" height="4" />
        <Rect x="547" y="162" width="4" height="4" />
      </G>

      <Path
        d="M 38,262 C 200,262 320,236 452,216 C 582,196 682,216 782,216 C 882,216 952,258 1000,284 L 1000,400 L 38,400 Z"
        fill="#FFFDF7"
        opacity={0.92}
      />

      <G opacity={0.88}>
        <Line x1="116" y1="242" x2="116" y2="268" stroke="#D2C19F" strokeWidth="1.8" />
        <Path d="M116,168 C129,195 129,227 116,246 C103,227 103,195 116,168 Z" fill="#E7D8BD" />
      </G>
      <G opacity={0.88}>
        <Line x1="282" y1="248" x2="282" y2="272" stroke="#D2C19F" strokeWidth="1.8" />
        <Path d="M282,172 C295,198 295,230 282,250 C269,230 269,198 282,172 Z" fill="#E5D5BA" />
      </G>
      <G opacity={0.85}>
        <Line x1="908" y1="278" x2="908" y2="308" stroke="#CCBB98" strokeWidth="2" />
        <Path d="M908,190 C924,224 924,258 908,282 C892,258 892,224 908,190 Z" fill="#E2D0B2" />
      </G>
      <G opacity={0.85}>
        <Line x1="935" y1="326" x2="935" y2="356" stroke="#C6B592" strokeWidth="2" />
        <Path d="M935,240 C950,271 950,302 935,328 C920,302 920,271 935,240 Z" fill="#DECBAD" />
      </G>

      <Path
        d="M 36,345 C 200,338 340,322 470,308 C 600,294 700,278 775,250
           C 830,228 822,198 775,202 C 725,206 668,222 605,226
           C 695,218 748,214 778,219 C 805,224 803,240 765,263
           C 708,298 560,314 420,320 C 280,326 150,338 36,370 Z"
        fill="url(#wbRoadGrad)"
      />
      <Path
        d="M 36,345 C 200,338 340,322 470,308 C 600,294 700,278 775,250
           C 830,228 822,198 775,202"
        fill="none"
        stroke="url(#wbRoadEdge)"
        strokeWidth="3"
        opacity={0.5}
      />
      <Path
        d="M 70,350 C 230,340 360,324 480,310 C 610,294 705,276 770,250 C 815,230 808,205 772,206"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeDasharray="9 9"
        strokeLinecap="round"
        opacity={0.8}
      />

      <Ellipse cx="764" cy="210" rx="9" ry="3" fill="url(#wbPinShadow)" />
      <Path d="M 764,188 L 764,206" stroke="#DFA018" strokeWidth="2.4" strokeLinecap="round" />
      <Path
        d="M 764,190
           C 754,175 736,157 736,140
           C 736,125 749,113 764,113
           C 779,113 792,125 792,140
           C 792,157 774,175 764,190 Z"
        fill="url(#wbPinGrad)"
        stroke="#FFFFFF"
        strokeWidth="1.6"
      />
      <Circle cx="764" cy="140" r="9.8" fill="#FFFFFF" />
      <Circle cx="764" cy="140" r="9.8" fill="none" stroke="#E9A312" strokeWidth="0.6" opacity={0.4} />

      <Ellipse cx="394" cy="299" rx="60" ry="6" fill="#1D1F21" opacity={0.18} />
      <Ellipse cx="394" cy="298" rx="47" ry="3.6" fill="#141618" opacity={0.22} />
      <Path
        d="M 334,272
           C 333,266 338,260 344,258
           L 353,248 C 356,244 361,243 366,243
           L 408,243 C 413,243 417,245 420,248
           L 431,260 L 447,264
           C 453,265 456,269 456,274
           L 454,282 C 453,286 449,288 445,288
           L 443,288 A 14 14 0 0 0 417,288
           L 371,288 A 14 14 0 0 0 345,288
           L 338,288 C 335,288 333,285 333,281 Z"
        fill="url(#wbCarBody)"
      />
      <Path
        d="M 345,285 L 371,285 A 14 14 0 0 1 371,288 L 345,288 Z
           M 417,285 L 443,285 A 14 14 0 0 1 443,288 L 417,288 Z"
        fill="#AD6F02"
      />
      <Path
        d="M 353,260 L 362,247 C 363.5,245 366,244.5 368,244.5
           L 406,244.5 C 409,244.5 411.5,246 413,248 L 423,260 Z"
        fill="#1B2631"
      />
      <Path d="M 356,260 L 364,247.5 L 376,247.5 L 376,260 Z" fill="#2C3D4E" />
      <Rect x="380" y="247.5" width="18" height="12.5" fill="#2C3D4E" />
      <Path d="M 402,247.5 L 410.5,247.5 L 420.5,260 L 402,260 Z" fill="#2C3D4E" />
      <Rect x="376" y="245" width="4" height="15" fill="#F5B620" />
      <Rect x="398" y="245" width="4" height="15" fill="#F5B620" />
      <Path
        d="M 366,249 L 360,258 M 388,249 L 383,258 M 408,249 L 404,258"
        stroke="#6F8CA6"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={0.6}
      />
      <Ellipse cx="452.5" cy="272" rx="3.6" ry="4.2" fill="#FFFFFF" />
      <Ellipse cx="452" cy="272" rx="2.4" ry="2.8" fill="#FFFFFF" />
      <Rect x="332.5" y="267" width="2.6" height="6.5" rx="1.2" fill="#E83A2C" />
      <Rect x="384" y="267.5" width="7" height="1.8" rx="0.9" fill="#D38C04" />
      <Rect x="406" y="267.5" width="7" height="1.8" rx="0.9" fill="#D38C04" />
      <Path d="M 419,261 C 423,261 425,263 423,265 C 420,266 418,264 418,262 Z" fill="#EFA914" />
      <Circle cx="430" cy="288" r="13" fill="#1C2127" />
      <Circle cx="430" cy="288" r="11" fill="#2A3038" />
      <Circle cx="430" cy="288" r="5.4" fill="#ECEFF3" />
      <Circle cx="430" cy="288" r="2" fill="#2A3038" />
      <Circle cx="358" cy="288" r="13" fill="#1C2127" />
      <Circle cx="358" cy="288" r="11" fill="#2A3038" />
      <Circle cx="358" cy="288" r="5.4" fill="#ECEFF3" />
      <Circle cx="358" cy="288" r="2" fill="#2A3038" />
      <HeroEdgeFades idPrefix="wb" />
    </Svg>
  );
}

export function SignupIllustration({ width, compact = 1 }: { width: number; compact?: number }) {
  const height = width * AUTH_HERO_RATIO * compact;
  return (
    <Svg
      pointerEvents="none"
      width={width}
      height={height}
      viewBox="0 0 1000 400"
      preserveAspectRatio="xMidYMid meet">
      <Defs>
        <LinearGradient id="suBgCanvas" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FCFBF8" />
          <Stop offset="100%" stopColor="#F9F5EC" />
        </LinearGradient>
        <LinearGradient id="suHillsFar" x1="50%" y1="0%" x2="50%" y2="100%">
          <Stop offset="0%" stopColor="#FDF2DB" stopOpacity={0.9} />
          <Stop offset="100%" stopColor="#FFFDF8" stopOpacity={0.1} />
        </LinearGradient>
        <LinearGradient id="suHillRight" x1="80%" y1="10%" x2="10%" y2="90%">
          <Stop offset="0%" stopColor="#FBE8C5" />
          <Stop offset="50%" stopColor="#FDF3DE" />
          <Stop offset="100%" stopColor="#FFFDF9" />
        </LinearGradient>
        <LinearGradient id="suRoadSurface" x1="15%" y1="65%" x2="85%" y2="35%">
          <Stop offset="0%" stopColor="#F4F3EE" />
          <Stop offset="35%" stopColor="#E5E3DC" />
          <Stop offset="70%" stopColor="#D0CEC4" />
          <Stop offset="100%" stopColor="#C2BFB5" />
        </LinearGradient>
        <LinearGradient id="suRoadRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#F4C75D" stopOpacity={0} />
          <Stop offset="30%" stopColor="#F8C95C" stopOpacity={0.85} />
          <Stop offset="75%" stopColor="#F6B834" stopOpacity={0.9} />
          <Stop offset="100%" stopColor="#EDB02B" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="suPinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFCB3D" />
          <Stop offset="50%" stopColor="#F6AE1B" />
          <Stop offset="100%" stopColor="#E4970B" />
        </LinearGradient>
        <LinearGradient id="suTruckYellow" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFCF4B" />
          <Stop offset="25%" stopColor="#F7B822" />
          <Stop offset="75%" stopColor="#E89E0F" />
          <Stop offset="100%" stopColor="#CA8102" />
        </LinearGradient>
        <LinearGradient id="suChassisDark" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#2D3540" />
          <Stop offset="100%" stopColor="#1B1F26" />
        </LinearGradient>
      </Defs>

      <Rect x="0" y="0" width="1000" height="400" fill="url(#suBgCanvas)" />
      <Path d="M 0,165 C 140,110 260,115 380,160 L 380,400 L 0,400 Z" fill="url(#suHillsFar)" />
      <Path d="M 450,180 C 620,95 760,65 1000,90 L 1000,400 L 450,400 Z" fill="url(#suHillRight)" />
      <Path
        d="M 0,260 C 220,260 330,170 520,165 C 690,160 840,205 1000,230 L 1000,400 L 0,400 Z"
        fill="#FFFEFB"
        opacity={0.94}
      />

      <G opacity={0.82}>
        <Line x1="602" y1="184" x2="602" y2="204" stroke="#C4B390" strokeWidth="2" strokeLinecap="round" />
        <Path d="M 602,126 C 615,150 615,174 602,188 C 589,174 589,150 602,126 Z" fill="#E8DAC1" />
      </G>
      <G opacity={0.82}>
        <Line x1="642" y1="187" x2="642" y2="206" stroke="#C4B390" strokeWidth="2" strokeLinecap="round" />
        <Path d="M 642,135 C 654,156 654,178 642,190 C 630,178 630,156 642,135 Z" fill="#E4D5BA" />
      </G>

      <Path
        d="M 370,143
           C 260,140 148,185 148,245
           C 148,305 260,332 400,332
           C 570,332 750,296 1000,285
           L 1000,256
           C 810,268 640,282 480,282
           C 340,282 256,268 250,240
           C 242,198 320,150 420,147 Z"
        fill="url(#suRoadSurface)"
      />
      <Path
        d="M 150,225 C 146,275 220,318 340,330 C 430,338 560,326 690,305"
        fill="none"
        stroke="url(#suRoadRibbon)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <Path
        d="M 395,145
           C 300,146 195,190 200,245
           C 204,285 305,308 440,308
           C 610,308 780,282 1000,270"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeDasharray="8 8"
        strokeLinecap="round"
        opacity={0.75}
      />
      <Path d="M 0,335 C 160,335 320,330 450,324 L 450,400 L 0,400 Z" fill="#FFFDF9" opacity={0.9} />

      <Ellipse cx="426" cy="163" rx="10" ry="3.5" fill="none" stroke="#F6AE1B" />
      <Ellipse cx="426" cy="163" rx="9" ry="3.2" fill="#8C6615" opacity={0.28} />
      <Path
        d="M 426,161
           C 415,146 397,128 397,110
           C 397,94.5 410,82 426,82
           C 442,82 455,94.5 455,110
           C 455,128 437,146 426,161 Z"
        fill="url(#suPinGrad)"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <Circle cx="426" cy="110" r="8.8" fill="#FFFFFF" />
      <Circle cx="426" cy="110" r="8.8" fill="none" stroke="#E3960A" strokeWidth="0.8" opacity={0.3} />

      <Ellipse cx="820" cy="286" rx="122" ry="11" fill="#1C2127" opacity={0.18} />
      <Ellipse cx="748" cy="286" rx="22" ry="4" fill="#0E1114" opacity={0.35} />
      <Ellipse cx="872" cy="286" rx="22" ry="4" fill="#0E1114" opacity={0.35} />

      <Rect x="730" y="248" width="185" height="24" rx="2" fill="url(#suChassisDark)" />
      <Path d="M 915,258 L 944,258 L 944,268 L 915,268 Z" fill="#E59E0F" stroke="#B87600" strokeWidth="1" />
      <Rect x="940" y="255" width="4" height="16" rx="1.5" fill="#20242B" />
      <Rect x="818" y="246" width="34" height="18" rx="1.5" fill="#1A1D24" stroke="#333A44" strokeWidth="1" />
      <Rect x="831" y="253" width="8" height="2.2" rx="0.8" fill="#586370" />

      <Path
        d="M 708,245
           L 708,212
           C 708,209 711,206 714,205
           L 723,203
           L 753,171
           C 756,168 760,167 764,167
           L 778,167
           C 782,167 785,170 785,174
           L 785,248
           L 770,248
           A 18 18 0 0 0 734,248
           L 712,248
           C 709.8,248 708,246.7 708,245 Z"
        fill="url(#suTruckYellow)"
      />
      <Path
        d="M 706,215 L 715,215 L 715,258 C 715,260 713,262 710.5,262 L 705,262 C 703.5,262 702.5,260.5 703,259 L 706,215 Z"
        fill="#242A33"
      />
      <Rect x="704.5" y="235" width="4.5" height="10" rx="1.5" fill="#FFFCE6" stroke="#E5A110" strokeWidth="0.8" />
      <Rect x="705.2" y="236.5" width="2.5" height="7" rx="1" fill="#FFFFFF" />
      <Path
        d="M 714,204
           L 746,173
           C 748,171 751,170 754,170
           L 778,170
           C 781,170 782,172 782,174
           L 782,212
           L 715,212
           C 713.5,212 713,205.5 714,204 Z"
        fill="#1A2129"
      />
      <Path d="M 718,203 L 746,174 L 752,203 Z" fill="#2D3744" />
      <Path d="M 755,173 L 778,173 L 778,203 L 755,203 Z" fill="#252F3B" />
      <Line x1="753.5" y1="171" x2="753.5" y2="204" stroke="#F5B41C" strokeWidth="2.5" />
      <Path d="M 726,201 L 746,177" stroke="#71889E" strokeWidth="1.8" strokeLinecap="round" opacity={0.6} />
      <Path d="M 762,176 L 774,176" stroke="#71889E" strokeWidth="1.2" strokeLinecap="round" opacity={0.5} />
      <Path d="M 750,208 L 782,208 L 782,246 L 766,246" fill="none" stroke="#D18902" strokeWidth="1.2" />
      <Rect x="754" y="220" width="7" height="2" rx="1" fill="#FFFFFF" stroke="#AF7000" strokeWidth="0.6" />
      <Path d="M 724,202 L 728,202 L 728,212 L 724,212 Z" fill="#181D24" />
      <Rect x="722" y="200" width="3" height="14" rx="1.2" fill="#2A333E" />
      <Rect x="760" y="163" width="15" height="4.5" rx="2" fill="#E08B00" />
      <Rect x="762" y="162" width="11" height="5" rx="2" fill="#FFB700" />
      <Rect x="786" y="174" width="7.5" height="74" fill="#E89E0F" stroke="#BF7D00" strokeWidth="0.8" />
      <Rect x="793.5" y="180" width="4.5" height="68" fill="#232931" />
      <Line x1="798" y1="228" x2="812" y2="248" stroke="#232931" strokeWidth="3" strokeLinecap="round" />
      <Path
        d="M 798,248
           L 810,218
           L 856,218
           L 884,248
           L 914,248
           C 916,248 917,250 917,252
           L 915,264
           L 892,264
           A 18 18 0 0 0 854,264
           L 798,264 Z"
        fill="url(#suTruckYellow)"
      />
      <Circle cx="819" cy="235" r="7.5" fill="#20252D" />
      <Circle cx="819" cy="235" r="4.5" fill="#717D8A" />
      <Circle cx="819" cy="235" r="2" fill="#171A1F" />
      <Line x1="833" y1="246" x2="856" y2="218" stroke="#363E48" strokeWidth="5" strokeLinecap="round" />
      <Line x1="846" y1="230" x2="864" y2="208" stroke="#B0BAC5" strokeWidth="3" strokeLinecap="round" />
      <Line x1="823" y1="235" x2="920" y2="162" stroke="#1D222A" strokeWidth="8.5" strokeLinecap="round" />
      <Line x1="821" y1="231" x2="918" y2="158" stroke="#F7B822" strokeWidth="5" strokeLinecap="round" />
      <Line x1="860" y1="202" x2="925" y2="153" stroke="#B9C3CE" strokeWidth="3" strokeLinecap="round" />
      <Circle cx="925" cy="155" r="8" fill="#F7B822" stroke="#B87600" strokeWidth="1.2" />
      <Circle cx="925" cy="155" r="5" fill="#2A303A" />
      <Circle cx="925" cy="155" r="2" fill="#E8EDF2" />
      <Line x1="825" y1="225" x2="925" y2="151" stroke="#373D47" strokeWidth="1.2" />
      <Line x1="928" y1="158" x2="928" y2="215" stroke="#252A33" strokeWidth="1.8" />
      <Circle cx="928" cy="216" r="3.8" fill="#E59E0F" stroke="#252A33" strokeWidth="1" />
      <Path
        d="M 928,219
           L 928,224
           C 928,230 923,234 918,231
           C 914,228 915,221 920,221
           C 922,221 924,222 925,223
           C 923.5,219 921,217 918,218
           C 912,219 910,228 915,235
           C 921,241 932,238 932,225
           L 932,219 Z"
        fill="#232830"
        stroke="#16191E"
        strokeWidth="0.8"
      />

      <Path d="M 730,250 A 18 18 0 0 1 766,250 Z" fill="#14181E" />
      <Circle cx="748" cy="265" r="16.5" fill="#20242B" />
      <Circle cx="748" cy="265" r="14" fill="#282E37" />
      <Circle cx="748" cy="265" r="9" fill="#FFF4DE" stroke="#D1C0A5" strokeWidth="1.2" />
      <Circle cx="748" cy="265" r="5" fill="#E59E0F" />
      <Circle cx="748" cy="265" r="2.2" fill="#20242B" />
      <Circle cx="748" cy="261.8" r="0.8" fill="#FFFFFF" />
      <Circle cx="751.2" cy="265" r="0.8" fill="#FFFFFF" />
      <Circle cx="748" cy="268.2" r="0.8" fill="#FFFFFF" />
      <Circle cx="744.8" cy="265" r="0.8" fill="#FFFFFF" />

      <Path d="M 854,250 A 18 18 0 0 1 890,250 Z" fill="#14181E" />
      <Circle cx="872" cy="265" r="16.5" fill="#20242B" />
      <Circle cx="872" cy="265" r="14" fill="#282E37" />
      <Circle cx="872" cy="265" r="9" fill="#FFF4DE" stroke="#D1C0A5" strokeWidth="1.2" />
      <Circle cx="872" cy="265" r="5" fill="#E59E0F" />
      <Circle cx="872" cy="265" r="2.2" fill="#20242B" />
      <Circle cx="872" cy="261.8" r="0.8" fill="#FFFFFF" />
      <Circle cx="875.2" cy="265" r="0.8" fill="#FFFFFF" />
      <Circle cx="872" cy="268.2" r="0.8" fill="#FFFFFF" />
      <Circle cx="868.8" cy="265" r="0.8" fill="#FFFFFF" />
      <HeroEdgeFades idPrefix="su" />
    </Svg>
  );
}
