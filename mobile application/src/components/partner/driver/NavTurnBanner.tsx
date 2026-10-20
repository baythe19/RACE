import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Volume2, VolumeX, Compass, LocateFixed } from 'lucide-react-native';
import type { RouteManeuverStep } from '../../../services/driver/roadRoutingService';
import { formatManeuverDistance } from '../../../services/driver/tripNavigation';
import ManeuverIcon from './ManeuverIcon';

interface Props {
  /** The manoeuvre being approached (already the *upcoming* one, see resolveUpcomingManeuver). */
  currentStep?: RouteManeuverStep | null;
  /** Live metres to that manoeuvre, measured along the route from the GPS fix. */
  distanceMeters?: number;
  /** The manoeuvre after this one, shown as "Then …". */
  nextStep?: RouteManeuverStep | null;
  /** Optional: only rendered when voice guidance is actually available. */
  voiceMuted?: boolean;
  onToggleVoice?: () => void;
  compassHeadingUp: boolean;
  onToggleCompass: () => void;
  onRecenter: () => void;
  /** Show the re-centre button only after the driver panned the map away. */
  showRecenter?: boolean;
  insetsTop?: number;
}

export default function NavTurnBanner({
  currentStep,
  distanceMeters,
  nextStep,
  voiceMuted = false,
  onToggleVoice,
  compassHeadingUp,
  onToggleCompass,
  onRecenter,
  showRecenter = true,
  insetsTop = 0,
}: Props) {
  const meters = distanceMeters ?? currentStep?.distanceMeters ?? 0;
  const arriving = currentStep?.maneuverType === 'arrive';
  const distanceLabel = !currentStep ? '—' : arriving && meters < 15 ? 'Now' : formatManeuverDistance(meters);
  const instructionLabel = currentStep?.instruction || 'Finding best route…';
  const nextLabel =
    nextStep && nextStep.maneuverType !== 'arrive'
      ? nextStep.shortInstruction || nextStep.instruction
      : null;

  return (
    <View style={[styles.root, { top: insetsTop + 8 }]} pointerEvents="box-none">
      <View style={styles.bannerContainer}>
        <View style={styles.iconCircle}><ManeuverIcon type={currentStep?.maneuverType} size={28} /></View>
        <View style={styles.textColumn}>
          <Text style={styles.distanceText}>{distanceLabel}</Text>
          <Text style={styles.instructionText} numberOfLines={2}>
            {instructionLabel}
          </Text>
        </View>
      </View>
      {nextLabel ? (
        <View style={styles.thenPill}>
          <Text style={styles.thenLabel}>Then</Text>
          <View style={styles.thenIcon}><ManeuverIcon type={nextStep?.maneuverType} size={14} /></View>
          <Text style={styles.thenText} numberOfLines={1}>
            {nextLabel}
          </Text>
        </View>
      ) : null}

      <View style={styles.controlsColumn} pointerEvents="auto">
        {onToggleVoice ? (
          <Pressable
            onPress={onToggleVoice}
            accessibilityRole="button"
            accessibilityLabel={voiceMuted ? 'Unmute voice navigation' : 'Mute voice navigation'}
            style={({ pressed }) => [styles.circleButton, pressed && styles.circleButtonPressed]}>
            {voiceMuted ? (
              <VolumeX size={19} color="#64748B" strokeWidth={2.4} />
            ) : (
              <Volume2 size={19} color="#0F172A" strokeWidth={2.4} />
            )}
          </Pressable>
        ) : null}

        <Pressable
          onPress={onToggleCompass}
          accessibilityRole="button"
          accessibilityLabel={compassHeadingUp ? 'Switch to north-up map' : 'Switch to heading-up map'}
          style={({ pressed }) => [styles.circleButton, pressed && styles.circleButtonPressed]}>
          <Compass size={19} color={compassHeadingUp ? '#2563EB' : '#0F172A'} strokeWidth={2.4} />
        </Pressable>

        {showRecenter ? (
          <Pressable
            onPress={onRecenter}
            accessibilityRole="button"
            accessibilityLabel="Recenter location"
            style={({ pressed }) => [styles.circleButton, pressed && styles.circleButtonPressed]}>
            <LocateFixed size={19} color="#2563EB" strokeWidth={2.4} />
          </Pressable>
        ) : null}
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
  thenPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '80%',
    marginTop: 6,
    marginLeft: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#065F46',
    borderWidth: 1,
    borderColor: '#047857',
  },
  thenLabel: {
    color: '#A7F3D0',
    fontSize: 11.5,
    fontWeight: '700',
    marginRight: 6,
  },
  thenIcon: {
    marginRight: 6,
  },
  thenText: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '600',
  },
  controlsColumn: {
    position: 'absolute',
    right: 0,
    top: 118,
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
