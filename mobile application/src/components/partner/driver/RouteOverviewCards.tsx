import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import {
  FileText,
  MapPin,
  Compass,
  LocateFixed,
  Navigation,
} from 'lucide-react-native';

interface Props {
  pickupAddress: string;
  distanceKm: number;
  durationMinutes: number;
  onStartNavigation: () => void;
  onRecenter?: () => void;
  onToggleCompass?: () => void;
  compassHeadingUp?: boolean;
  insetsTop?: number;
  insetsBottom?: number;
}

export default function RouteOverviewCards({
  pickupAddress,
  distanceKm,
  durationMinutes,
  onStartNavigation,
  onRecenter,
  onToggleCompass,
  compassHeadingUp = false,
  insetsTop = 0,
  insetsBottom = 0,
}: Props) {
  return (
    <>
      {/* Top Floating Card: Go to pickup location (Screen 4) */}
      <View style={[styles.topCardWrapper, { top: insetsTop + 8 }]} pointerEvents="box-none">
        <View style={styles.topCard}>
          <View style={styles.blueIconCircle}>
            <FileText size={18} color="#2563EB" strokeWidth={2.4} />
          </View>
          <View style={styles.topCardTextCol}>
            <Text style={styles.topCardTitle}>Go to pickup location</Text>
            <Text style={styles.topCardSubtitle}>
              {distanceKm} km · {durationMinutes} mins
            </Text>
          </View>
        </View>
      </View>

      {/* Floating Right Map Controls (Compass & Recenter) */}
      <View style={[styles.floatingControls, { top: insetsTop + 84 }]} pointerEvents="auto">
        {onToggleCompass ? (
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
        ) : null}

        {onRecenter ? (
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
        ) : null}
      </View>

      {/* Bottom Sheet Card: Saheed Nagar - Pickup location & Start Navigation */}
      <View
        style={[styles.bottomCardWrapper, { paddingBottom: Math.max(insetsBottom + 12, 18) }]}
        pointerEvents="box-none">
        <View style={styles.bottomCardSurface}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Location row with distance & duration */}
          <View style={styles.pickupRow}>
            <View style={styles.pinCircle}>
              <MapPin size={20} color="#EF4444" strokeWidth={2.5} />
            </View>
            <View style={styles.pickupInfoCol}>
              <Text style={styles.pickupTitle} numberOfLines={1}>
                {pickupAddress}
              </Text>
              <Text style={styles.pickupSubtitle}>Pickup location</Text>
            </View>
            <View style={styles.statsCol}>
              <Text style={styles.statsDistance}>{distanceKm} km</Text>
              <Text style={styles.statsDuration}>{durationMinutes} mins</Text>
            </View>
          </View>

          {/* Large Gold Action Button: Start navigation */}
          <Pressable
            onPress={onStartNavigation}
            accessibilityRole="button"
            accessibilityLabel="Start navigation"
            style={({ pressed }) => [
              styles.startNavBtn,
              pressed && styles.startNavBtnPressed,
            ]}>
            <Navigation
              size={18}
              color="#0F172A"
              strokeWidth={2.5}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.startNavText}>Start navigation</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    marginBottom: 16,
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
    fontSize: 17,
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
