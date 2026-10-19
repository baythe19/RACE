import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import {
  CornerUpLeft,
  CornerUpRight,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowUp,
  RotateCcw,
  Navigation,
  MapPin,
  Mic,
  Volume2,
  VolumeX,
  Compass,
  LocateFixed,
} from 'lucide-react-native';
import type { RouteManeuverStep, ManeuverType } from '../../../services/driver/roadRoutingService';

interface Props {
  currentStep?: RouteManeuverStep | null;
  voiceMuted: boolean;
  onToggleVoice: () => void;
  compassHeadingUp: boolean;
  onToggleCompass: () => void;
  onRecenter: () => void;
  insetsTop?: number;
}

function renderManeuverIcon(type?: ManeuverType) {
  const size = 26;
  const color = '#FFFFFF';
  const strokeWidth = 2.8;

  switch (type) {
    case 'turn_left':
      return <CornerUpLeft size={size} color={color} strokeWidth={strokeWidth} />;
    case 'turn_right':
      return <CornerUpRight size={size} color={color} strokeWidth={strokeWidth} />;
    case 'slight_left':
      return <ArrowUpLeft size={size} color={color} strokeWidth={strokeWidth} />;
    case 'slight_right':
      return <ArrowUpRight size={size} color={color} strokeWidth={strokeWidth} />;
    case 'u_turn':
      return <RotateCcw size={size} color={color} strokeWidth={strokeWidth} />;
    case 'arrive':
      return <MapPin size={size} color={color} strokeWidth={strokeWidth} />;
    case 'straight':
    default:
      return <ArrowUp size={size} color={color} strokeWidth={strokeWidth} />;
  }
}

export default function NavTurnBanner({
  currentStep,
  voiceMuted,
  onToggleVoice,
  compassHeadingUp,
  onToggleCompass,
  onRecenter,
  insetsTop = 0,
}: Props) {
  const distanceLabel = currentStep
    ? currentStep.distanceMeters < 1000
      ? `${currentStep.distanceMeters} m`
      : `${(currentStep.distanceMeters / 1000).toFixed(1)} km`
    : '650 m';

  const instructionLabel =
    currentStep?.instruction || 'Turn left onto NH-16';

  return (
    <View style={[styles.root, { top: insetsTop + 8 }]} pointerEvents="box-none">
      {/* Top Turn Navigation Card */}
      <View style={styles.bannerContainer}>
        {/* Left: Maneuver Icon */}
        <View style={styles.iconCircle}>
          {renderManeuverIcon(currentStep?.maneuverType)}
        </View>

        {/* Center: Distance & Turn Instruction */}
        <View style={styles.textColumn}>
          <Text style={styles.distanceText}>{distanceLabel}</Text>
          <Text style={styles.instructionText} numberOfLines={2}>
            {instructionLabel}
          </Text>
        </View>

        {/* Right: Mic Audio Indicator */}
        <View style={styles.micContainer}>
          <Mic size={18} color="#A7F3D0" strokeWidth={2.4} />
        </View>
      </View>

      {/* Floating Right Navigation Controls (Mute, Compass, Recenter) */}
      <View style={styles.controlsColumn} pointerEvents="auto">
        {/* Voice Guidance Toggle */}
        <Pressable
          onPress={onToggleVoice}
          accessibilityRole="button"
          accessibilityLabel={voiceMuted ? 'Unmute voice navigation' : 'Mute voice navigation'}
          style={({ pressed }) => [
            styles.circleButton,
            pressed && styles.circleButtonPressed,
          ]}>
          {voiceMuted ? (
            <VolumeX size={19} color="#64748B" strokeWidth={2.4} />
          ) : (
            <Volume2 size={19} color="#0F172A" strokeWidth={2.4} />
          )}
        </Pressable>

        {/* Compass / Heading Mode */}
        <Pressable
          onPress={onToggleCompass}
          accessibilityRole="button"
          accessibilityLabel="Toggle compass view"
          style={({ pressed }) => [
            styles.circleButton,
            pressed && styles.circleButtonPressed,
          ]}>
          <Compass
            size={19}
            color={compassHeadingUp ? '#2563EB' : '#0F172A'}
            strokeWidth={2.4}
          />
        </Pressable>

        {/* Recenter Map */}
        <Pressable
          onPress={onRecenter}
          accessibilityRole="button"
          accessibilityLabel="Recenter location"
          style={({ pressed }) => [
            styles.circleButton,
            pressed && styles.circleButtonPressed,
          ]}>
          <LocateFixed size={19} color="#0F172A" strokeWidth={2.4} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 30,
  },
  bannerContainer: {
    backgroundColor: '#064E3B', // Dark forest green matching design
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#047857',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textColumn: {
    flex: 1,
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  instructionText: {
    color: '#E6F4EA',
    fontSize: 14.5,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 18,
  },
  micContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  controlsColumn: {
    position: 'absolute',
    right: 0,
    top: 86,
    gap: 10,
  },
  circleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  circleButtonPressed: {
    backgroundColor: '#F1F5F9',
    transform: [{ scale: 0.96 }],
  },
});
