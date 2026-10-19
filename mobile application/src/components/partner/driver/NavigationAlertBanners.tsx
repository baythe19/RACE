import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {
  TriangleAlert,
  Radio,
  RefreshCw,
  Settings,
  ChevronRight,
} from 'lucide-react-native';

interface OffRouteProps {
  visible: boolean;
  onDismiss?: () => void;
  insetsTop?: number;
}

export function OffRouteBanner({ visible, onDismiss, insetsTop = 0 }: OffRouteProps) {
  if (!visible) return null;

  return (
    <>
      {/* Top Dark Red Banner (Screen 11) */}
      <View style={[styles.topBannerWrapper, { top: insetsTop + 8 }]} pointerEvents="box-none">
        <View style={styles.offRouteContainer}>
          <View style={styles.alertIconCircle}>
            <TriangleAlert size={20} color="#FFFFFF" strokeWidth={2.6} />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.offRouteTitle}>You are off route</Text>
            <Text style={styles.offRouteSubtitle}>Recalculating route...</Text>
          </View>
        </View>
      </View>

      {/* Floating Bottom Finding Best Route Card */}
      <View style={styles.bottomFindingRoute} pointerEvents="box-none">
        <View style={styles.findingCard}>
          <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 10 }} />
          <Text style={styles.findingText}>Finding best route...</Text>
        </View>
      </View>
    </>
  );
}

interface WeakGpsProps {
  visible: boolean;
  onRetryGps: () => void;
  onDismissSheet: () => void;
  insetsTop?: number;
  insetsBottom?: number;
}

export function WeakGpsAlert({
  visible,
  onRetryGps,
  onDismissSheet,
  insetsTop = 0,
  insetsBottom = 0,
}: WeakGpsProps) {
  if (!visible) return null;

  return (
    <>
      {/* Top Amber Weak GPS Banner (Screen 12) */}
      <View style={[styles.topBannerWrapper, { top: insetsTop + 8 }]} pointerEvents="box-none">
        <View style={styles.weakGpsBanner}>
          <View style={styles.gpsIconCircle}>
            <Radio size={18} color="#D97706" strokeWidth={2.4} />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.weakGpsTitle}>GPS signal weak</Text>
            <Text style={styles.weakGpsSubtitle} numberOfLines={1}>
              Trying to improve location accuracy...
            </Text>
          </View>
          <Pressable
            onPress={onRetryGps}
            accessibilityRole="button"
            accessibilityLabel="Retry GPS location"
            style={({ pressed }) => [
              styles.retryPill,
              pressed && styles.retryPillPressed,
            ]}>
            <Text style={styles.retryPillText}>Retry</Text>
          </Pressable>
        </View>
      </View>

      {/* Bottom Location Unavailable Recovery Sheet */}
      <View
        style={[styles.recoverySheet, { paddingBottom: Math.max(insetsBottom + 12, 20) }]}
        pointerEvents="box-none">
        <View style={styles.sheetInner}>
          <View style={styles.sheetHandle} />

          <Text style={styles.sheetTitle}>Current location unavailable</Text>
          <Text style={styles.sheetDesc}>
            Check your GPS settings and location permissions, then try again.
          </Text>

          {/* Open Settings Button */}
          <Pressable
            onPress={() => void Linking.openSettings()}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            style={({ pressed }) => [
              styles.settingsBtn,
              pressed && styles.settingsBtnPressed,
            ]}>
            <Settings size={18} color="#0F172A" strokeWidth={2.4} style={{ marginRight: 8 }} />
            <Text style={styles.settingsBtnText}>Open settings</Text>
          </Pressable>

          {/* Continue Anyway Button */}
          <Pressable
            onPress={onDismissSheet}
            accessibilityRole="button"
            accessibilityLabel="Continue anyway"
            style={({ pressed }) => [
              styles.continueBtn,
              pressed && styles.continueBtnPressed,
            ]}>
            <Text style={styles.continueBtnText}>Continue anyway</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topBannerWrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 40,
  },
  offRouteContainer: {
    backgroundColor: '#7F1D1D', // Dark Red from Screen 11 design
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#7F1D1D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#991B1B',
  },
  alertIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textCol: {
    flex: 1,
  },
  offRouteTitle: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  offRouteSubtitle: {
    color: '#FECACA',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  bottomFindingRoute: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 90,
    zIndex: 40,
    alignItems: 'center',
  },
  findingCard: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  findingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  weakGpsBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  gpsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  weakGpsTitle: {
    color: '#92400E',
    fontSize: 15,
    fontWeight: '800',
  },
  weakGpsSubtitle: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  retryPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  retryPillPressed: {
    backgroundColor: '#FEF3C7',
  },
  retryPillText: {
    color: '#D97706',
    fontSize: 12.5,
    fontWeight: '700',
  },
  recoverySheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
  },
  sheetInner: {
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
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: '#CBD5E1',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  sheetDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 14,
  },
  settingsBtn: {
    backgroundColor: '#FEA701',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsBtnPressed: {
    backgroundColor: '#F59E0B',
    transform: [{ scale: 0.98 }],
  },
  settingsBtnText: {
    color: '#0F172A',
    fontSize: 15.5,
    fontWeight: '800',
  },
  continueBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  continueBtnPressed: {
    backgroundColor: '#F1F5F9',
  },
  continueBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
});
