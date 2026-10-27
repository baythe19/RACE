import { PartnerText } from '../partner/PartnerText';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, View, type GestureResponderEvent, type PanResponderGestureState } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import {
  Compass,
  Crosshair,
  MapPin,
  Minus,
  Navigation,
  Plus,
  RotateCcw,
} from 'lucide-react-native';

export type DeliveryNavMapProps = {
  pickupLabel?: string;
  dropoffLabel?: string;
  isNavigating: boolean;
  distanceKm: number;
  durationMinutes?: number;
  step: 'en_route' | 'verify_otp' | 'in_progress' | 'completed';
  recenterTrigger?: number;
  onToggleNavigation?: () => void;
  onMapPress?: () => void;
};

/**
 * Rapido / Delivery App Grade Interactive Navigation Map
 *
 * Provides a rich, fluid, crash-proof delivery navigation viewport:
 * 1. Realistic Bhubaneswar street grid (Janpath, NH-16, Rasulgarh, Vani Vihar, Saheed Nagar, Mancheswar)
 * 2. Neon-lit gradient navigation polyline with directional indicators
 * 3. Starting point (Driver position with animated pulse radar & towing cab artwork)
 * 4. Ending points (Pickup & Drop-off pins with high-contrast floating callout badges)
 * 5. Interactive touch panning (drag to inspect the route ahead)
 * 6. Smooth Zoom In (+) & Zoom Out (-) controls
 * 7. Recenter (Target) button snapping camera back to live vehicle
 * 8. Top floating turn-by-turn maneuver banner in active navigation mode
 */
export default function DeliveryNavMap({
  pickupLabel = 'Saheed Nagar, Bhubaneswar',
  dropoffLabel = 'Mancheswar, Bhubaneswar',
  isNavigating,
  distanceKm,
  durationMinutes = 12,
  step,
  recenterTrigger = 0,
  onToggleNavigation,
  onMapPress,
}: DeliveryNavMapProps) {
  // Zoom level: 1.0 (overview) to 2.5 (deep turn detail)
  const [zoom, setZoom] = useState(isNavigating ? 1.4 : 1.15);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  panRef.current = pan;

  // Animated live radar pulse for driver position
  const pulseAnim = useRef(new Animated.Value(0)).current;
  // Simulated progress along route during active navigation (0 -> 1)
  const [liveProgress, setLiveProgress] = useState(0);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // When active navigation is turned on, gently advance the vehicle marker along the road
  useEffect(() => {
    if (!isNavigating) {
      setLiveProgress(0);
      return undefined;
    }
    const interval = setInterval(() => {
      setLiveProgress(prev => (prev >= 0.85 ? 0.85 : prev + 0.015));
    }, 2000);
    return () => clearInterval(interval);
  }, [isNavigating]);

  // Recenter trigger handler
  useEffect(() => {
    if (recenterTrigger > 0) {
      setPan({ x: 0, y: 0 });
      setZoom(isNavigating ? 1.45 : 1.2);
    }
  }, [isNavigating, recenterTrigger]);

  // Pan Responder for fluid, non-blocking touch dragging across the map
  const panStartRef = useRef({ x: 0, y: 0 });
  const touchStartTimeRef = useRef(0);
  const onMapPressRef = useRef(onMapPress);
  onMapPressRef.current = onMapPress;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gesture: PanResponderGestureState) =>
          Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,
        onMoveShouldSetPanResponderCapture: (_, gesture: PanResponderGestureState) =>
          Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          panStartRef.current = { ...panRef.current };
          touchStartTimeRef.current = Date.now();
        },
        onPanResponderMove: (_, gesture: PanResponderGestureState) => {
          setPan({
            x: Math.max(-360, Math.min(360, panStartRef.current.x + gesture.dx)),
            y: Math.max(-320, Math.min(320, panStartRef.current.y + gesture.dy)),
          });
        },
        onPanResponderRelease: (_, gesture: PanResponderGestureState) => {
          const elapsed = Date.now() - touchStartTimeRef.current;
          const dist = Math.hypot(gesture.dx, gesture.dy);
          // Tap on map area: minimizes bottom sheet automatically
          if (dist < 8 && elapsed < 350) {
            onMapPressRef.current?.();
          }
        },
      }),
    [],
  );

  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(2.4, Math.round((prev + 0.25) * 100) / 100));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(0.9, Math.round((prev - 0.25) * 100) / 100));
  }, []);

  const recenter = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(isNavigating ? 1.45 : 1.2);
  }, [isNavigating]);

  // Remaining distance calculates dynamically based on navigation progress
  const liveDistanceKm = useMemo(() => {
    const raw = distanceKm * (1 - liveProgress * 0.7);
    return Math.max(0.3, Math.round(raw * 10) / 10);
  }, [distanceKm, liveProgress]);

  const liveMinutes = Math.max(2, Math.round(durationMinutes * (1 - liveProgress * 0.7)));

  // Route points on 420x420 coordinate system
  // Start (Driver): (65, 340)
  // Waypoint 1 (Vani Vihar Junction): (120, 260)
  // Waypoint 2 (Saheed Nagar Pickup): (210, 190)
  // Waypoint 3 (Rasulgarh Square): (295, 140)
  // End (Mancheswar Dropoff): (360, 75)
  const driverX = 65 + (210 - 65) * liveProgress;
  const driverY = 340 + (190 - 340) * liveProgress;

  const pickupCoord = { x: 210, y: 190 };
  const dropoffCoord = { x: 360, y: 75 };

  // Route paths
  // Primary Leg: Driver -> Pickup
  const routePathToPickup = `M 65 340 C 90 300, 120 260, 160 230 S 185 205, 210 190`;
  // Secondary Leg: Pickup -> Dropoff
  const routePathToDrop = `M 210 190 C 245 170, 275 155, 310 120 S 340 95, 360 75`;
  // Full Route
  const fullRoutePath = `${routePathToPickup} ${routePathToDrop.replace('M 210 190', '')}`;

  return (
    <View style={styles.container}>
      {/* Interactive Map Viewport with SVG Vector Tiles */}
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
        <Svg
          width="100%"
          height="100%"
          pointerEvents="none"
          viewBox={`${-pan.x / zoom + (420 - 420 / zoom) / 2} ${
            -pan.y / zoom + (420 - 420 / zoom) / 2
          } ${420 / zoom} ${420 / zoom}`}
          preserveAspectRatio="xMidYMid slice">
          <Defs>
            {/* Soft Modern Rapido Base Gradient */}
            <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#EFF4F8" />
              <Stop offset="100%" stopColor="#E6EEF3" />
            </LinearGradient>

            {/* Glowing Active Route Gradient */}
            <LinearGradient id="routeGlow" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0%" stopColor="#2563EB" />
              <Stop offset="70%" stopColor="#3B82F6" />
              <Stop offset="100%" stopColor="#0D9488" />
            </LinearGradient>

            {/* Secondary Route Gradient */}
            <LinearGradient id="futureRoute" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0%" stopColor="#94A3B8" />
              <Stop offset="100%" stopColor="#CBD5E1" />
            </LinearGradient>
          </Defs>

          {/* 1. Base Ground Tile */}
          <Rect x="-500" y="-500" width="1420" height="1420" fill="url(#bgGrad)" />

          {/* 2. City Blocks & Commercial Zones */}
          <Rect x="20" y="40" width="85" height="110" rx="8" fill="#DFE7ED" opacity="0.65" />
          <Rect x="125" y="55" width="95" height="85" rx="8" fill="#DFE7ED" opacity="0.65" />
          <Rect x="240" y="30" width="70" height="70" rx="8" fill="#DFE7ED" opacity="0.65" />
          <Rect x="15" y="195" width="80" height="95" rx="8" fill="#DFE7ED" opacity="0.65" />
          <Rect x="115" y="275" width="110" height="110" rx="8" fill="#DFE7ED" opacity="0.65" />
          <Rect x="250" y="215" width="130" height="130" rx="8" fill="#DFE7ED" opacity="0.65" />

          {/* 3. Parks & Natural Greenery (Ekamra Greenery, Vani Vihar) */}
          <Path
            d="M 28 60 C 50 45, 80 50, 90 75 C 95 105, 60 125, 40 120 C 20 115, 15 80, 28 60 Z"
            fill="#D1FAE5"
            opacity="0.85"
          />
          <Path
            d="M 125 295 C 150 280, 185 285, 200 310 C 210 340, 170 365, 140 360 C 120 355, 110 320, 125 295 Z"
            fill="#D1FAE5"
            opacity="0.85"
          />

          {/* 4. Kuakhai River Blue Bend (Real Bhubaneswar Geography) */}
          <Path
            d="M 370 -50 C 355 30, 395 120, 375 220 S 410 320, 390 470"
            stroke="#BAE6FD"
            strokeWidth="32"
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M 370 -50 C 355 30, 395 120, 375 220 S 410 320, 390 470"
            stroke="#93C5FD"
            strokeWidth="20"
            fill="none"
            strokeLinecap="round"
          />

          {/* 5. Minor Residential Roads Grid */}
          <Path
            d="M 0 95 H 420 M 0 170 H 420 M 0 255 H 420 M 0 325 H 420 M 90 0 V 420 M 175 0 V 420 M 265 0 V 420 M 345 0 V 420"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            fill="none"
            opacity="0.9"
          />

          {/* 6. Major Highway Artery 1: NH-16 Cuttack-Puri Bypass */}
          <Path
            d="M -30 220 C 90 200, 180 180, 270 140 S 380 60, 460 20"
            stroke="#CBD5E1"
            strokeWidth="16"
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M -30 220 C 90 200, 180 180, 270 140 S 380 60, 460 20"
            stroke="#FFFFFF"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M -30 220 C 90 200, 180 180, 270 140 S 380 60, 460 20"
            stroke="#E2E8F0"
            strokeWidth="1"
            strokeDasharray="8 6"
            fill="none"
          />

          {/* 7. Major Avenue 2: Janpath Arterial Road */}
          <Path
            d="M 40 450 C 70 360, 125 270, 185 210 S 260 120, 320 -20"
            stroke="#CBD5E1"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M 40 450 C 70 360, 125 270, 185 210 S 260 120, 320 -20"
            stroke="#FFFFFF"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />

          {/* 8. Active Trip Polyline (Rapido Neon Route) */}
          {/* Outer Neon Glow */}
          <Path
            d={fullRoutePath}
            stroke="#93C5FD"
            strokeWidth="13"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.45"
          />
          {/* White Border Ring */}
          <Path
            d={fullRoutePath}
            stroke="#FFFFFF"
            strokeWidth="8.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* High-Contrast Route Core */}
          <Path
            d={routePathToPickup}
            stroke="url(#routeGlow)"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d={routePathToDrop}
            stroke={step === 'in_progress' ? 'url(#routeGlow)' : 'url(#futureRoute)'}
            strokeWidth={step === 'in_progress' ? 5 : 4}
            strokeDasharray={step === 'in_progress' ? undefined : '6 4'}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 9. Directional Chevrons along Route */}
          <Path d="M 120 257 L 126 251 L 120 245" stroke="#FFFFFF" strokeWidth="2.2" fill="none" />
          <Path d="M 165 227 L 171 221 L 165 215" stroke="#FFFFFF" strokeWidth="2.2" fill="none" />
          <Path d="M 265 157 L 271 151 L 265 145" stroke="#FFFFFF" strokeWidth="2" fill="none" />

          {/* 10. Street & Landmark Labels */}
          <SvgText x="135" y="165" fill="#475569" fontSize="9" fontWeight="700">
            Janpath Road
          </SvgText>
          <SvgText x="280" y="112" fill="#475569" fontSize="8.5" fontWeight="700">
            NH-16 Flyover
          </SvgText>
          <SvgText x="38" y="90" fill="#059669" fontSize="7.5" fontWeight="600">
            Ekamra Greenery
          </SvgText>
          <SvgText x="135" y="335" fill="#059669" fontSize="7.5" fontWeight="600">
            Vani Vihar Campus
          </SvgText>
          <SvgText x="365" y="195" fill="#0284C7" fontSize="8" fontWeight="600">
            Kuakhai River
          </SvgText>

          {/* 11. ENDING POINT: Drop-off Marker (Mancheswar) */}
          <G transform={`translate(${dropoffCoord.x - 14}, ${dropoffCoord.y - 28})`}>
            {/* Shadow */}
            <Circle cx="14" cy="27" r="5" fill="#0F172A" opacity="0.18" />
            {/* Pin Body */}
            <Path
              d="M 14 0 C 6.3 0 0 6.3 0 14 C 0 23.5 14 32 14 32 C 14 32 28 23.5 28 14 C 28 6.3 21.7 0 14 0 Z"
              fill="#D97706"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
            {/* White Core Dot */}
            <Circle cx="14" cy="13" r="4.5" fill="#FFFFFF" />
            <Circle cx="14" cy="13" r="2" fill="#B45309" />
          </G>

          {/* 12. DESTINATION 1: Pickup Marker (Saheed Nagar) */}
          <G transform={`translate(${pickupCoord.x - 14}, ${pickupCoord.y - 28})`}>
            {/* Shadow */}
            <Circle cx="14" cy="27" r="5.5" fill="#0F172A" opacity="0.22" />
            {/* Radiant Pulse Ring */}
            <Circle cx="14" cy="13" r="17" fill="#2563EB" opacity="0.16" />
            {/* Pin Body */}
            <Path
              d="M 14 0 C 6.3 0 0 6.3 0 14 C 0 23.5 14 32 14 32 C 14 32 28 23.5 28 14 C 28 6.3 21.7 0 14 0 Z"
              fill="#2563EB"
              stroke="#FFFFFF"
              strokeWidth="2.2"
            />
            {/* White Core Dot */}
            <Circle cx="14" cy="13" r="4.5" fill="#FFFFFF" />
          </G>

          {/* 13. STARTING POINT: Driver Vehicle Marker (Live Pulse & Cab/Truck Icon) */}
          <G transform={`translate(${driverX}, ${driverY})`}>
            {/* Live Animated Pulse Radar */}
            <Circle cx="0" cy="0" r="20" fill="#3B82F6" opacity="0.22" />
            <Circle cx="0" cy="0" r="13" fill="#2563EB" opacity="0.28" />
            {/* Vehicle Disk */}
            <Circle cx="0" cy="0" r="12" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.8" />
            <Circle cx="0" cy="0" r="9" fill="#FEA701" />
            {/* Directional Heading Cone */}
            <Path d="M 0 -15 L 5 -8 L -5 -8 Z" fill="#2563EB" />
            {/* Inner Cab Artwork */}
            <Rect x="-4" y="-4" width="8" height="8" rx="1.5" fill="#1E293B" />
            <Rect x="-2.5" y="-2.5" width="5" height="5" rx="1" fill="#FEF08A" />
          </G>
        </Svg>
      </View>

      {/* Floating Destination Callout Badge (Pickup / Saheed Nagar) */}
      <View
        pointerEvents="none"
        style={[
          styles.calloutCard,
          {
            top: 60,
            left: 16,
          },
        ]}>
        <View style={styles.calloutIconBadge}>
          <MapPin size={13} color="#2563EB" strokeWidth={2.4} />
        </View>
        <View style={{ marginLeft: 6 }}>
          <PartnerText style={styles.calloutHeading}>
            {step === 'in_progress' ? 'Drop' : 'Pickup'}
          </PartnerText>
          <PartnerText numberOfLines={1} style={styles.calloutSub}>
            {liveDistanceKm} km away · {liveMinutes} min
          </PartnerText>
        </View>
      </View>

      {/* Floating Active Turn-by-Turn Maneuver HUD (Rapido Style) */}
      {isNavigating ? (
        <View pointerEvents="none" style={styles.turnHudContainer}>
          <View style={styles.turnHudCard}>
            <View style={styles.turnIconCircle}>
              <Navigation size={18} color="#FFFFFF" strokeWidth={2.6} style={{ transform: [{ rotate: '-45deg' }] }} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <PartnerText style={styles.turnPrimaryText}>
                In 250m, Turn Left on Janpath Rd
              </PartnerText>
              <PartnerText numberOfLines={1} style={styles.turnSecondaryText}>
                Towards {pickupLabel.split(',')[0] || 'Pickup location'}
              </PartnerText>
            </View>
            <View style={styles.speedBadge}>
              <PartnerText style={styles.speedNumber}>38</PartnerText>
              <PartnerText style={styles.speedUnit}>km/h</PartnerText>
            </View>
          </View>
        </View>
      ) : null}

      {/* Floating Map Action Controls on Right Side (Zoom In, Zoom Out, Recenter) */}
      <View style={styles.floatingControls}>
        {/* Recenter Button */}
        <Pressable
          onPress={recenter}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Recenter map to driver position"
          style={({ pressed }) => [
            styles.ctrlBtn,
            { backgroundColor: pressed ? '#F1F5F9' : '#FFFFFF' },
          ]}>
          <Crosshair size={19} color="#1E293B" strokeWidth={2.4} />
        </Pressable>

        {/* Zoom In Button */}
        <Pressable
          onPress={zoomIn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Zoom in on map"
          style={({ pressed }) => [
            styles.ctrlBtn,
            styles.ctrlBtnTop,
            { backgroundColor: pressed ? '#F1F5F9' : '#FFFFFF' },
          ]}>
          <Plus size={18} color="#1E293B" strokeWidth={2.6} />
        </Pressable>

        {/* Zoom Out Button */}
        <Pressable
          onPress={zoomOut}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Zoom out on map"
          style={({ pressed }) => [
            styles.ctrlBtn,
            styles.ctrlBtnBottom,
            { backgroundColor: pressed ? '#F1F5F9' : '#FFFFFF' },
          ]}>
          <Minus size={18} color="#1E293B" strokeWidth={2.6} />
        </Pressable>

        {/* Compass Reset */}
        <Pressable
          onPress={recenter}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Reset map orientation"
          style={({ pressed }) => [
            styles.ctrlBtn,
            { marginTop: 8, backgroundColor: pressed ? '#F1F5F9' : '#FFFFFF' },
          ]}>
          <Compass size={17} color="#2563EB" strokeWidth={2.4} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#E8EFF4',
    overflow: 'hidden',
  },
  calloutCard: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: 210,
    zIndex: 10,
  },
  calloutIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutHeading: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  calloutSub: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 0.5,
  },
  turnHudContainer: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    zIndex: 20,
  },
  turnHudCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  turnIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnPrimaryText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  turnSecondaryText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 1.5,
  },
  speedBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginLeft: 6,
  },
  speedNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38BDF8',
    lineHeight: 16,
  },
  speedUnit: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  floatingControls: {
    position: 'absolute',
    right: 14,
    top: 90,
    alignItems: 'center',
    zIndex: 15,
  },
  ctrlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ctrlBtnTop: {
    marginTop: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0.5,
  },
  ctrlBtnBottom: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0.5,
  },
});
