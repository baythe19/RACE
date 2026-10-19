import React from 'react';
import { StyleSheet, View, Text, Pressable, Linking } from 'react-native';
import { MapPin, Phone, ArrowLeft, ShieldCheck } from 'lucide-react-native';

interface Props {
  pickupAddress: string;
  customerName?: string;
  customerMobile?: string;
  onVerifyOtpPress: () => void;
  onUndoArrival: () => void;
  acting?: boolean;
  insetsTop?: number;
  insetsBottom?: number;
}

export default function ArrivedPickupCard({
  pickupAddress,
  customerName = 'Customer',
  customerMobile,
  onVerifyOtpPress,
  onUndoArrival,
  acting = false,
  insetsTop = 0,
  insetsBottom = 0,
}: Props) {
  return (
    <>
      {/* Top Vibrant Amber Alert Banner (Screen 6 from design) */}
      <View style={[styles.topBanner, { top: insetsTop + 8 }]} pointerEvents="box-none">
        <View style={styles.bannerInner}>
          <View style={styles.pinCircle}>
            <MapPin size={18} color="#FFFFFF" strokeWidth={2.6} />
          </View>
          <View style={styles.bannerTextCol}>
            <Text style={styles.bannerTitle}>You have arrived</Text>
            <Text style={styles.bannerSubtitle} numberOfLines={1}>
              {pickupAddress}
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Sheet Card */}
      <View
        style={[styles.bottomCard, { paddingBottom: Math.max(insetsBottom + 12, 20) }]}
        pointerEvents="box-none">
        <View style={styles.cardSurface}>
          {/* Handle bar */}
          <View style={styles.handle} />

          <View style={styles.headlineRow}>
            <View style={styles.shieldBadge}>
              <ShieldCheck size={20} color="#15803D" strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cardTitle}>You have reached pickup</Text>
              <Text style={styles.cardSubtitle}>
                Confirm with customer and verify OTP to start service.
              </Text>
            </View>
          </View>

          {/* Primary Action Button: Verify OTP & Start */}
          <Pressable
            onPress={onVerifyOtpPress}
            disabled={acting}
            accessibilityRole="button"
            accessibilityLabel="Verify OTP & start service"
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}>
            <Text style={styles.primaryButtonText}>Verify OTP & start</Text>
          </Pressable>

          {/* Secondary Action: Call Customer */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => (customerMobile ? void Linking.openURL(`tel:${customerMobile}`) : undefined)}
              accessibilityRole="button"
              accessibilityLabel="Call customer"
              style={({ pressed }) => [
                styles.callButton,
                pressed && styles.callButtonPressed,
              ]}>
              <Phone size={16} color="#0F172A" strokeWidth={2.4} style={{ marginRight: 6 }} />
              <Text style={styles.callButtonText}>
                {customerMobile ? `Call customer (${customerName})` : 'Call customer'}
              </Text>
            </Pressable>

            {/* Undo Arrival Link */}
            <Pressable
              onPress={onUndoArrival}
              disabled={acting}
              accessibilityRole="button"
              accessibilityLabel="Not at pickup yet, return to navigation"
              style={({ pressed }) => [
                styles.undoButton,
                pressed && { opacity: 0.7 },
              ]}>
              <ArrowLeft size={14} color="#64748B" strokeWidth={2.2} style={{ marginRight: 4 }} />
              <Text style={styles.undoButtonText}>Not at pickup yet</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topBanner: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 25,
  },
  bannerInner: {
    backgroundColor: '#FEA701', // Vibrant Amber/Orange
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  pinCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  bannerSubtitle: {
    color: '#FFFBEB',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  bottomCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 25,
  },
  cardSurface: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
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
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  shieldBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 17,
  },
  primaryButton: {
    backgroundColor: '#FEA701',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonPressed: {
    backgroundColor: '#F59E0B',
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  actionRow: {
    marginTop: 10,
    gap: 8,
  },
  callButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonPressed: {
    backgroundColor: '#F1F5F9',
  },
  callButtonText: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '700',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  undoButtonText: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '600',
  },
});
