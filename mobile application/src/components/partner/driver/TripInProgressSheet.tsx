import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, Linking } from 'react-native';
import { MapPin, Phone, FileText, Navigation } from 'lucide-react-native';

interface Props {
  bookingNumber: string;
  dropAddress: string;
  /** Formatted remaining distance to the drop, or null when unknown. */
  distanceLabel: string | null;
  durationMinutes: number | null;
  /** Driver is at the drop: lead with Complete job instead of Resume navigation. */
  atDrop?: boolean;
  /** ISO time the trip started (status IN_PROGRESS); drives the real timer. */
  startedAt?: string;
  onResumeNavigation: () => void;
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
  distanceLabel,
  durationMinutes,
  atDrop = false,
  startedAt,
  onResumeNavigation,
  customerMobile,
  onCompletePress,
  acting = false,
  insetsTop = 0,
  insetsBottom = 0,
}: Props) {
  const startMs = startedAt ? +new Date(startedAt) : NaN;
  const secondsSince = () =>
    Number.isFinite(startMs) ? Math.max(0, Math.floor((Date.now() - startMs) / 1000)) : 0;
  const [elapsed, setElapsed] = useState(secondsSince);
  const [collapsed, setCollapsed] = useState(false);

  // Real stopwatch: counts from when the backend moved the job to IN_PROGRESS.
  useEffect(() => {
    setElapsed(secondsSince());
    const timer = setInterval(() => setElapsed(secondsSince()), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMs]);

  return (
    <>
      {/* Top Floating Service in Progress Pill (Screen 9 design) */}
      <View style={[styles.topPillContainer, { top: insetsTop + 8 }]} pointerEvents="box-none">
        <View style={styles.pillSurface}>
          <View style={styles.fileIcon}>
            <FileText size={16} color="#2563EB" strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.pillTitle}>{atDrop ? 'At drop location' : 'Service in progress'}</Text>
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
        style={styles.bottomSheet}
        pointerEvents="box-none">
        <View style={[styles.sheetSurface, { paddingBottom: Math.max(insetsBottom, 12) + 12 }]}>
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
            {distanceLabel && durationMinutes != null ? (
              <View style={styles.distanceEtaCol}>
                <Text style={styles.distanceText}>{distanceLabel}</Text>
                <Text style={styles.etaText}>{durationMinutes} min</Text>
              </View>
            ) : null}
          </View>

          {!collapsed ? (
            <>
              <View style={styles.actionsRow}>
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
              </View>
            </>
          ) : null}

          {!atDrop ? (
            <Pressable
              onPress={onResumeNavigation}
              accessibilityRole="button"
              accessibilityLabel="Resume navigation to drop"
              style={({ pressed }) => [styles.resumeBtn, pressed && styles.resumeBtnPressed]}>
              <Navigation size={18} color="#0F172A" strokeWidth={2.5} style={{ marginRight: 8 }} />
              <Text style={styles.resumeBtnText}>Resume navigation</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={onCompletePress}
            disabled={acting}
            accessibilityRole="button"
            accessibilityLabel="Complete job"
            style={({ pressed }) => [
              styles.completeBtn,
              !atDrop && styles.completeBtnSecondary,
              pressed && styles.completeBtnPressed,
            ]}>
            <Text style={[styles.completeBtnText, !atDrop && styles.completeBtnSecondaryText]}>
              Complete job
            </Text>
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
    justifyContent: 'flex-start',
    marginBottom: 18,
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
  resumeBtn: {
    backgroundColor: '#FEA701',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  resumeBtnPressed: {
    backgroundColor: '#F59E0B',
    transform: [{ scale: 0.98 }],
  },
  resumeBtnText: {
    color: '#0F172A',
    fontSize: 16.5,
    fontWeight: '800',
  },
  completeBtnSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    shadowOpacity: 0,
    elevation: 0,
  },
  completeBtnSecondaryText: {
    color: '#DC2626',
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
