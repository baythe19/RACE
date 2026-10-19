import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { X, Check } from 'lucide-react-native';

interface Props {
  etaMinutes: number;
  distanceKm: number;
  etaTimeFormatted: string;
  onExitNav: () => void;
  onArriveAction?: () => void;
  arriveActionLabel?: string;
  insetsBottom?: number;
}

export default function NavBottomBar({
  etaMinutes,
  distanceKm,
  etaTimeFormatted,
  onExitNav,
  onArriveAction,
  arriveActionLabel = 'Arrived',
  insetsBottom = 0,
}: Props) {
  return (
    <View style={[styles.root, { paddingBottom: Math.max(insetsBottom + 8, 16) }]} pointerEvents="box-none">
      <View style={styles.cardContainer}>
        {/* Left: Close (X) Button to return to overview mode */}
        <Pressable
          onPress={onExitNav}
          accessibilityRole="button"
          accessibilityLabel="Exit navigation mode"
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.closeButtonPressed,
          ]}>
          <X size={20} color="#0F172A" strokeWidth={2.4} />
        </Pressable>

        {/* Center: ETA Duration, Distance, Arrival Time */}
        <View style={styles.etaInfo}>
          <Text style={styles.etaMinutesText}>{etaMinutes} min</Text>
          <Text style={styles.etaSubText}>
            {distanceKm} km · {etaTimeFormatted}
          </Text>
        </View>

        {/* Right: End / Arrived Action Button */}
        {onArriveAction ? (
          <Pressable
            onPress={onArriveAction}
            accessibilityRole="button"
            accessibilityLabel={arriveActionLabel}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}>
            <Check size={16} color="#FFFFFF" strokeWidth={2.6} style={{ marginRight: 4 }} />
            <Text style={styles.actionButtonText}>{arriveActionLabel}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onExitNav}
            accessibilityRole="button"
            accessibilityLabel="End navigation"
            style={({ pressed }) => [
              styles.endButton,
              pressed && styles.endButtonPressed,
            ]}>
            <Text style={styles.endButtonText}>End</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 0,
    zIndex: 30,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    backgroundColor: '#E2E8F0',
    transform: [{ scale: 0.95 }],
  },
  etaInfo: {
    flex: 1,
    marginLeft: 14,
  },
  etaMinutesText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  etaSubText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  endButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  endButtonPressed: {
    backgroundColor: '#DC2626',
    transform: [{ scale: 0.96 }],
  },
  endButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  actionButton: {
    backgroundColor: '#FEA701',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonPressed: {
    backgroundColor: '#F59E0B',
    transform: [{ scale: 0.96 }],
  },
  actionButtonText: {
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: '700',
  },
});
