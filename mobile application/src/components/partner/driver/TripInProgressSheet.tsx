import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, Linking } from 'react-native';
import { MapPin, Phone, MessageSquare, Share2, FileText, ChevronUp, ChevronDown } from 'lucide-react-native';

interface Props {
  bookingNumber: string;
  dropAddress: string;
  distanceKm: number;
  durationMinutes: number;
  customerName?: string;
  customerMobile?: string;
  onCompletePress: () => void;
  acting?: boolean;
  insetsTop?: number;
  insetsBottom?: number;
}

function formatStopwatch(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function TripInProgressSheet({
  bookingNumber,
  dropAddress,
  distanceKm,
  durationMinutes,
  customerName = 'Customer',
  customerMobile,
  onCompletePress,
  acting = false,
  insetsTop = 0,
  insetsBottom = 0,
}: Props) {
  const [elapsed, setElapsed] = useState(1106); // ~18 mins initial for demo
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Top Floating Service in Progress Pill (Screen 9 design) */}
      <View style={[styles.topPillContainer, { top: insetsTop + 8 }]} pointerEvents="box-none">
        <View style={styles.pillSurface}>
          <View style={styles.fileIcon}>
            <FileText size={16} color="#2563EB" strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.pillTitle}>Service in progress</Text>
            <Text style={styles.pillSubtitle}>#{bookingNumber}</Text>
          </View>
          <View style={styles.timerBadge}>
            <View style={styles.greenPulseDot} />
            <Text style={styles.timerText}>{formatStopwatch(elapsed)}</Text>
          </View>
        </View>
      </View>

      {/* Bottom Sheet Card */}
      <View
        style={[styles.bottomSheet, { paddingBottom: Math.max(insetsBottom + 10, 18) }]}
        pointerEvents="box-none">
        <View style={styles.sheetSurface}>
          {/* Collapsible Drag Handle */}
          <Pressable
            onPress={() => setCollapsed(prev => !prev)}
            hitSlop={12}
            style={styles.handleContainer}>
            <View style={styles.handle} />
          </Pressable>

          {/* Destination & Distance Row */}
          <View style={styles.destRow}>
            <View style={styles.destPinCircle}>
              <MapPin size={20} color="#EF4444" strokeWidth={2.5} />
            </View>
            <View style={styles.destCol}>
              <Text style={styles.destTitle} numberOfLines={1}>
                {dropAddress}
              </Text>
              <Text style={styles.destSubtitle}>Drop location</Text>
            </View>
            <View style={styles.distanceEtaCol}>
              <Text style={styles.distanceText}>{distanceKm} km</Text>
              <Text style={styles.etaText}>{durationMinutes} mins</Text>
            </View>
          </View>

          {!collapsed ? (
            <>
              {/* 3 Circular Action Icons (Call customer, Message, Share location) */}
              <View style={styles.actionsRow}>
                {/* 1. Call customer */}
                <Pressable
                  onPress={() =>
                    customerMobile ? void Linking.openURL(`tel:${customerMobile}`) : undefined
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Call customer"
                  style={({ pressed }) => [
                    styles.actionCircle,
                    pressed && styles.actionCirclePressed,
                  ]}>
                  <View style={styles.iconBg}>
                    <Phone size={20} color="#2563EB" strokeWidth={2.4} />
                  </View>
                  <Text style={styles.actionLabel}>Call customer</Text>
                </Pressable>

                {/* 2. Message */}
                <Pressable
                  onPress={() =>
                    customerMobile ? void Linking.openURL(`sms:${customerMobile}`) : undefined
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Message customer"
                  style={({ pressed }) => [
                    styles.actionCircle,
                    pressed && styles.actionCirclePressed,
                  ]}>
                  <View style={styles.iconBg}>
                    <MessageSquare size={20} color="#2563EB" strokeWidth={2.4} />
                  </View>
                  <Text style={styles.actionLabel}>Message</Text>
                </Pressable>

                {/* 3. Share location */}
                <Pressable
                  onPress={() => {
                    void Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(dropAddress)}`);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Share location"
                  style={({ pressed }) => [
                    styles.actionCircle,
                    pressed && styles.actionCirclePressed,
                  ]}>
                  <View style={styles.iconBg}>
                    <Share2 size={20} color="#2563EB" strokeWidth={2.4} />
                  </View>
                  <Text style={styles.actionLabel}>Share location</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {/* Primary Action Button: Complete job (Red/Orange CTA from design) */}
          <Pressable
            onPress={onCompletePress}
            disabled={acting}
            accessibilityRole="button"
            accessibilityLabel="Complete job"
            style={({ pressed }) => [
              styles.completeBtn,
              pressed && styles.completeBtnPressed,
            ]}>
            <Text style={styles.completeBtnText}>Complete job</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topPillContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 25,
  },
  pillSurface: {
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
  fileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  pillSubtitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 25,
  },
  sheetSurface: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 6,
  },
  handle: {
    width: 44,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: '#CBD5E1',
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  destPinCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  destCol: {
    flex: 1,
  },
  destTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  destSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  distanceEtaCol: {
    alignItems: 'flex-end',
  },
  distanceText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  etaText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 18,
    paddingHorizontal: 10,
  },
  actionCircle: {
    alignItems: 'center',
  },
  actionCirclePressed: {
    opacity: 0.7,
  },
  iconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  completeBtn: {
    backgroundColor: '#EF4444', // Red CTA from Screen 9 design
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  completeBtnPressed: {
    backgroundColor: '#DC2626',
    transform: [{ scale: 0.98 }],
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '800',
  },
});
