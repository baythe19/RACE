import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronUp, Compass, ListOrdered, LocateFixed, MapPin, Navigation } from 'lucide-react-native';

import type { RouteManeuverStep } from '../../../services/driver/roadRoutingService';
import DirectionsList from './DirectionsList';
import ManeuverIcon from './ManeuverIcon';

interface Props {
  /** "Go to pickup location" */
  title: string;
  destinationAddress: string;
  /** "Pickup location" / "Drop location" */
  destinationCaption: string;
  /** Formatted leg distance, or null while GPS / route is not ready. */
  distanceLabel: string | null;
  durationMinutes: number | null;
  /** All manoeuvres of the leg (first one previews the route in the top card). */
  steps: RouteManeuverStep[];
  loading?: boolean;
  /** Straight guide only — no road geometry is available. */
  approximate?: boolean;
  /** Driver GPS is not available yet. */
  waitingForGps?: boolean;
  startLabel?: string;
  onStartNavigation: () => void;
  onRecenter?: () => void;
  onToggleCompass?: () => void;
  compassHeadingUp?: boolean;
  insetsTop?: number;
  insetsBottom?: number;
}

export default function RouteOverviewCards({
  title,
  destinationAddress,
  destinationCaption,
  distanceLabel,
  durationMinutes,
  steps,
  loading = false,
  approximate = false,
  waitingForGps = false,
  startLabel = 'Start navigation',
  onStartNavigation,
  onRecenter,
  onToggleCompass,
  compassHeadingUp = true,
  insetsTop = 0,
  insetsBottom = 0,
}: Props) {
  const [stepsOpen, setStepsOpen] = useState(false);
  const firstStep = steps.find(step => step.maneuverType !== 'arrive') ?? steps[0];
  const ready = distanceLabel != null && durationMinutes != null;
  const summary = waitingForGps
    ? 'Waiting for GPS…'
    : loading && !ready
      ? 'Finding best route…'
      : ready
        ? `${distanceLabel} · ${durationMinutes} min${approximate ? ' · straight line' : ''}`
        : 'Route unavailable';
  const turnSteps = steps.length > 1 ? steps : [];

  return (
    <>
      {/* Top card: where we are going + the first instruction, like Google's route preview. */}
      <View style={[styles.topCardWrapper, { top: insetsTop + 8 }]} pointerEvents="box-none">
        <View style={styles.topCard}>
          <View style={styles.blueIconCircle}>
            {firstStep && ready ? (
              <ManeuverIcon type={firstStep.maneuverType} size={20} color="#2563EB" />
            ) : (
              <Navigation size={18} color="#2563EB" strokeWidth={2.4} />
            )}
          </View>
          <View style={styles.topCardTextCol}>
            <Text style={styles.topCardTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.topCardSubtitle} numberOfLines={1}>
              {summary}
            </Text>
          </View>
          {loading || waitingForGps ? <ActivityIndicator size="small" color="#2563EB" /> : null}
        </View>
      </View>

      <View style={[styles.floatingControls, { top: insetsTop + 78 }]} pointerEvents="auto">
        {onToggleCompass ? (
          <Pressable
            onPress={onToggleCompass}
            accessibilityRole="button"
            accessibilityLabel="Toggle compass view"
            style={({ pressed }) => [styles.circleButton, pressed && styles.circleButtonPressed]}>
            <Compass size={19} color={compassHeadingUp ? '#2563EB' : '#0F172A'} strokeWidth={2.4} />
          </Pressable>
        ) : null}
        {onRecenter ? (
          <Pressable
            onPress={onRecenter}
            accessibilityRole="button"
            accessibilityLabel="Recenter location"
            style={({ pressed }) => [styles.circleButton, pressed && styles.circleButtonPressed]}>
            <LocateFixed size={19} color="#0F172A" strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>

      {/* Bottom sheet — padding lives INSIDE the surface so no map shows beneath it. */}
      <View style={styles.bottomCardWrapper} pointerEvents="box-none">
        <View style={[styles.bottomCardSurface, { paddingBottom: Math.max(insetsBottom, 12) + 12 }]}>
          <View style={styles.handle} />

          <View style={styles.pickupRow}>
            <View style={styles.pinCircle}>
              <MapPin size={20} color="#EF4444" strokeWidth={2.5} />
            </View>
            <View style={styles.pickupInfoCol}>
              <Text style={styles.pickupTitle} numberOfLines={2}>
                {destinationAddress}
              </Text>
              <Text style={styles.pickupSubtitle}>{destinationCaption}</Text>
            </View>
            {ready ? (
              <View style={styles.statsCol}>
                <Text style={styles.statsDistance}>{distanceLabel}</Text>
                <Text style={styles.statsDuration}>{durationMinutes} min</Text>
              </View>
            ) : null}
          </View>

          {turnSteps.length > 0 ? (
            <>
              <Pressable
                onPress={() => setStepsOpen(open => !open)}
                accessibilityRole="button"
                accessibilityLabel={stepsOpen ? 'Hide directions' : 'Show directions'}
                style={styles.stepsToggle}>
                <ListOrdered size={16} color="#2563EB" strokeWidth={2.4} />
                <Text style={styles.stepsToggleText}>
                  Directions · {turnSteps.length} steps
                </Text>
                {stepsOpen ? (
                  <ChevronDown size={18} color="#2563EB" />
                ) : (
                  <ChevronUp size={18} color="#2563EB" />
                )}
              </Pressable>
              {stepsOpen ? (
                <ScrollView
                  style={styles.stepsScroll}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}>
                  <DirectionsList steps={turnSteps} />
                </ScrollView>
              ) : null}
            </>
          ) : null}

          <Pressable
            onPress={onStartNavigation}
            accessibilityRole="button"
            accessibilityLabel={startLabel}
            style={({ pressed }) => [styles.startNavBtn, pressed && styles.startNavBtnPressed]}>
            <Navigation size={18} color="#0F172A" strokeWidth={2.5} style={{ marginRight: 8 }} />
            <Text style={styles.startNavText}>{startLabel}</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topCardWrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 25,
  },
  topCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  blueIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topCardTextCol: {
    flex: 1,
  },
  topCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  topCardSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  floatingControls: {
    position: 'absolute',
    right: 14,
    gap: 10,
    zIndex: 25,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 5,
  },
  circleButtonPressed: {
    backgroundColor: '#F1F5F9',
    transform: [{ scale: 0.96 }],
  },
  bottomCardWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 25,
  },
  bottomCardSurface: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
  },
  pickupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pinCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pickupInfoCol: {
    flex: 1,
  },
  pickupTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  pickupSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  statsCol: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  statsDistance: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statsDuration: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  stepsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    marginBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  stepsToggleText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  stepsScroll: {
    maxHeight: 190,
    marginBottom: 10,
  },
  startNavBtn: {
    backgroundColor: '#FEA701',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  startNavBtnPressed: {
    backgroundColor: '#F59E0B',
    transform: [{ scale: 0.98 }],
  },
  startNavText: {
    color: '#0F172A',
    fontSize: 16.5,
    fontWeight: '800',
  },
});
