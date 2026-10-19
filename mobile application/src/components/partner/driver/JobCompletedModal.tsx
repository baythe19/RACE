import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import {
  Check,
  MapPin,
  Route,
  Clock,
  ArrowRight,
  ChevronRight,
  FileText,
} from 'lucide-react-native';

interface Props {
  visible: boolean;
  bookingNumber: string;
  totalEarnings: number;
  pickupAddress: string;
  dropAddress: string;
  pickupTimeFormatted?: string;
  dropTimeFormatted?: string;
  distanceKm: number;
  durationMinutes: number;
  onBackToHome: () => void;
  onViewJobDetails?: () => void;
  insetsTop?: number;
  insetsBottom?: number;
}

export default function JobCompletedModal({
  visible,
  bookingNumber,
  totalEarnings,
  pickupAddress,
  dropAddress,
  pickupTimeFormatted = '10:12 PM',
  dropTimeFormatted = '10:34 PM',
  distanceKm,
  durationMinutes,
  onBackToHome,
  onViewJobDetails,
  insetsTop = 0,
  insetsBottom = 0,
}: Props) {
  if (!visible) return null;

  return (
    <View style={[styles.root, { paddingTop: insetsTop, paddingBottom: Math.max(insetsBottom, 16) }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Animated Green Checkmark Badge with Glow Ring */}
        <View style={styles.badgeWrapper}>
          <View style={styles.glowRingOuter}>
            <View style={styles.glowRingInner}>
              <View style={styles.checkCircle}>
                <Check size={36} color="#FFFFFF" strokeWidth={3} />
              </View>
            </View>
          </View>
        </View>

        {/* Title & Job Number */}
        <Text style={styles.title}>Job completed!</Text>
        <Text style={styles.bookingNumber}>#{bookingNumber}</Text>

        {/* Earnings Card */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsAmount}>
            ₹{Math.round(totalEarnings).toLocaleString('en-IN')}
          </Text>
          <Text style={styles.earningsLabel}>Total earnings</Text>
        </View>

        {/* Route Timeline Breakdown Card */}
        <View style={styles.timelineCard}>
          {/* Pickup Step */}
          <View style={styles.timelineRow}>
            <View style={styles.pinCol}>
              <View style={styles.greenDot} />
              <View style={styles.timelineConnector} />
            </View>
            <View style={styles.addressCol}>
              <Text style={styles.stepType}>Pickup</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {pickupAddress}
              </Text>
            </View>
            <Text style={styles.timeText}>{pickupTimeFormatted}</Text>
          </View>

          {/* Drop Step */}
          <View style={styles.timelineRow}>
            <View style={styles.pinCol}>
              <View style={styles.orangeDot} />
            </View>
            <View style={styles.addressCol}>
              <Text style={styles.stepType}>Drop</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {dropAddress}
              </Text>
            </View>
            <Text style={styles.timeText}>{dropTimeFormatted}</Text>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Stats Row (Distance + Duration) */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Route size={16} color="#64748B" strokeWidth={2.2} />
              <View style={{ marginLeft: 6 }}>
                <Text style={styles.statLabel}>Distance</Text>
                <Text style={styles.statValue}>{distanceKm} km</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Clock size={16} color="#64748B" strokeWidth={2.2} />
              <View style={{ marginLeft: 6 }}>
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>{durationMinutes} mins</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {/* Primary Button: Back to Home */}
          <Pressable
            onPress={onBackToHome}
            accessibilityRole="button"
            accessibilityLabel="Back to home"
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}>
            <Text style={styles.primaryBtnText}>Back to home</Text>
          </Pressable>

          {/* Secondary Button: View Job Details */}
          {onViewJobDetails ? (
            <Pressable
              onPress={onViewJobDetails}
              accessibilityRole="button"
              accessibilityLabel="View job details"
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.secondaryBtnPressed,
              ]}>
              <Text style={styles.secondaryBtnText}>View job details</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 60,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
  },
  badgeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  glowRingOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRingInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  bookingNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
  },
  earningsCard: {
    alignItems: 'center',
    marginVertical: 20,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  earningsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  timelineCard: {
    alignSelf: 'stretch',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    marginBottom: 24,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pinCol: {
    width: 24,
    alignItems: 'center',
  },
  greenDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#16A34A',
    marginTop: 4,
  },
  timelineConnector: {
    width: 2,
    height: 32,
    backgroundColor: '#CBD5E1',
    marginVertical: 4,
  },
  orangeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FEA701',
    marginTop: 4,
  },
  addressCol: {
    flex: 1,
    marginLeft: 10,
    paddingRight: 8,
  },
  stepType: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  timeText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  actionsContainer: {
    alignSelf: 'stretch',
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#FEA701',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryBtnPressed: {
    backgroundColor: '#F59E0B',
    transform: [{ scale: 0.98 }],
  },
  primaryBtnText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnPressed: {
    backgroundColor: '#F8FAFC',
  },
  secondaryBtnText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
  },
});
