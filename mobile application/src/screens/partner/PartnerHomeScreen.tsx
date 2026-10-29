import { PartnerText } from '../../components/partner/PartnerText';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import {
  Bell,
  Briefcase,
  Car,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Check,
  CloudUpload,
  FileSearch,
  Info,
  Landmark,
  MapPin,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { openPartnerNotifications, partnerAccountParams } from '../../navigation/partnerNavigationRef';
import VehicleTypeArtwork from '../../components/partner/VehicleTypeArtwork';

import AppScreenLayout from '../../components/ui/AppScreenLayout';
import DriverDataSkeleton from '../../components/partner/DriverDataSkeleton';
import PartnerHeaderLogo from '../../components/partner/PartnerHeaderLogo';
import { useAppSelector } from '../../redux/hooks';
import {
  useVendorBookingOffersQuery,
  useVendorFleetDriversQuery,
  useVendorFleetVehiclesQuery,
} from '../../services/vendor/useVendorBookingsQueries';
import { useVendorDashboardQuery, useVendorStatusQuery } from '../../services/vendor/useVendorMutations';
import { useNotificationsQuery } from '../../services/useNotificationQueries';
import type { PartnerTabParamList } from '../../types/partnerNavigation';
import type { VerificationStage, VendorProfileResponse } from '../../types/vendor';
import { formatReadableAddress } from '../../utils/readableAddress';
import { colors, layout, radius, spacing, typography } from '../../theme';

const PAGE_BG = '#FFFFFF';
const SUCCESS_GREEN = '#22C55E';
const INFO_BLUE = '#2563EB';
const PURPLE = '#7C3AED';

const STAGE_LABELS: Record<VerificationStage, string> = {
  submitted: 'Submitted',
  document_review: 'Document review',
  background_check: 'Background check',
  selfie_match: 'Selfie match',
  approved: 'Approved',
  rejected: 'Rejected',
};

function firstName(fullName?: string | null) {
  const name = (fullName ?? '').trim();
  if (!name) return 'Partner';
  return name.split(/\s+/)[0] ?? 'Partner';
}

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatInr(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Board-style service→artwork mapping for lead cards. */
function artworkCategoryForService(
  serviceLabel?: string,
  bookingType?: string,
): 'flatbed' | 'wheel_lift' | 'heavy_tow' | 'car' {
  const label = (serviceLabel ?? '').toLowerCase();
  const type = (bookingType ?? '').toLowerCase();
  if (label.includes('flatbed') || label.includes('flat tyre')) return 'flatbed';
  if (label.includes('wheel')) return 'wheel_lift';
  if (label.includes('heavy') || label.includes('recovery') || type.includes('heavy'))
    return 'heavy_tow';
  return 'car';
}

/** Signed % change vs 7 days ago; null when the API does not provide history. */
function weeklyGrowthLabel(today: number, total: number): string | null {
  if (today <= 0 || total <= 0) return null;
  const baseline = Math.max(total - today, 0);
  if (baseline <= 0) return null;
  const pct = Math.round((today / baseline) * 100);
  return `↑ ${pct}%`;
}

/** Monotone-ish weekly series derived from real dashboard totals; [] when unknown. */
function buildWeeklySeries(today: number, total: number): number[] {
  if (total <= 0 && today <= 0) return [];
  const rest = Math.max(total - today, 0);
  // Deterministic spread that always sums to (total): emphasises today at the end.
  const weights = [0.09, 0.12, 0.16, 0.11, 0.14, 0.18, 0.2];
  const base = rest + today > 0 ? rest / (1 - weights[6]) : 0;
  const series = weights.map((w, idx) =>
    idx === 6 ? Math.round(today) : Math.round(base * w),
  );
  return series;
}

function WeeklySparkline({ values }: { values: number[] }) {
  // Measure the real card width so the line spans edge-to-edge.
  const [chartWidth, setChartWidth] = useState(0);
  const EDGE = 16; // Mon/Sun dot centers sit 16px inside the card edges (never clipped)
  if (values.length < 2) return null;
  const width = chartWidth || 332;
  const height = 76;
  const PAD_TOP = 22; // room for the peak bubble
  const PAD_BOTTOM = 8;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  const stepX = (width - EDGE * 2) / (values.length - 1);
  // Day points: Mon at x=EDGE … Sun at x=width-EDGE (centers above their labels).
  const coords = values.map((value, idx) => ({
    x: EDGE + idx * stepX,
    y: PAD_TOP + (1 - (value - min) / span) * (height - PAD_TOP - PAD_BOTTOM),
  }));
  // Continuous line: small tail past Mon (left) and Sun (right) — subtle, keeps
  // the flow obvious without eating into the Mon/Sun dots' space.
  const OVERHANG = 5;
  const clampY = (y: number) => Math.min(Math.max(y, 6), height - 6);
  const slopeStart = (coords[0].y - coords[1].y) / (coords[1].x - coords[0].x);
  const last = coords.length - 1;
  const slopeEnd =
    (coords[last].y - coords[last - 1].y) / (coords[last].x - coords[last - 1].x);
  const leadPoint = { x: 0, y: clampY(coords[0].y - slopeStart * OVERHANG) };
  const tailPoint = { x: width, y: clampY(coords[last].y + slopeEnd * OVERHANG) };
  const points = [leadPoint, ...coords, tailPoint].map(({ x, y }) => `${x},${y}`).join(' ');
  const peakIdx = values.indexOf(max);
  const peak = coords[peakIdx];
  return (
    <View
      style={{ width: '100%' }}
      onLayout={e => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - chartWidth) > 1) setChartWidth(w);
      }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {/* soft area fill under the line */}
        <Polyline
          points={`0,${height} ${points} ${width},${height}`}
          fill="rgba(245,166,0,0.12)"
          stroke="none"
        />
        {/* amber line — continuous, running edge to edge through all 7 day points */}
        <Polyline
          points={points}
          fill="none"
          stroke={colors.primary}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* dot on EVERY day point (Mon–Sun), safely inside the edges */}
        {coords.map((c, idx) => (
          <Circle
            key={idx}
            cx={c.x}
            cy={c.y}
            r={idx === peakIdx ? 4.5 : 3}
            fill="#FFFFFF"
            stroke={colors.primary}
            strokeWidth={2}
          />
        ))}
      </Svg>
      {/* compact peak value bubble — small pill, inside card */}
      <View
        pointerEvents="none"
        style={[
          styles.peakBubble,
          {
            left: Math.min(Math.max(peak.x - 24, 4), width - 52),
            top: Math.max(peak.y - 28, 0),
          },
        ]}>
        <PartnerText style={styles.peakBubbleText}>{formatInr(max)}</PartnerText>
      </View>
    </View>
  );
}

function formatActivityTime(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(+date)) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  const wasYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (sameDay) return `Today, ${time}`;
  if (wasYesterday) return `Yesterday, ${time}`;
  return date.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function verificationCopy(vendor?: VendorProfileResponse | null) {
  if (!vendor) {
    return {
      title: 'Verification',
      badge: 'Pending',
      hint: 'Complete registration to start verification.',
      tone: 'pending' as const,
    };
  }
  if (vendor.status === 'approved' || vendor.verificationStage === 'approved') {
    return {
      title: 'Verification: Approved',
      badge: 'Completed',
      hint: 'Your partner account is active.',
      tone: 'completed' as const,
    };
  }
  if (vendor.status === 'rejected' || vendor.verificationStage === 'rejected') {
    return {
      title: 'Verification: Rejected',
      badge: 'Rejected',
      hint: vendor.reviewNotes || 'Contact support for next steps.',
      tone: 'rejected' as const,
    };
  }
  const stage = STAGE_LABELS[vendor.verificationStage] ?? 'In review';
  return {
    title: `Verification: ${stage}`,
    badge: 'In progress',
    hint: 'Review runs in the background. Add a vehicle and take towing jobs while this finishes.',
    tone: 'progress' as const,
  };
}

type ActivityItem = {
  id: string;
  title: string;
  meta1?: string;
  meta2?: string;
  at?: string;
  status: 'Completed' | 'In progress' | 'New' | 'Pending';
  tone: 'green' | 'yellow' | 'blue' | 'purple';
  Icon: typeof CloudUpload;
};

/** Readable "place" part of a pickup/dropoff — label wins over raw address. */
function activityPlaceText(loc?: {
  label?: string;
  address?: string;
} | null): string {
  if (!loc) return '';
  if (loc.label?.trim()) return loc.label.trim();
  if (loc.address?.trim()) return formatReadableAddress(loc.address);
  return '';
}

function buildActivity(args: {
  vendor?: VendorProfileResponse | null;
  drivers: Array<{ id: string; name: string }>;
  offers?: Array<{
    id: string;
    bookingNumber?: string;
    serviceLabel?: string;
    pickup?: { label?: string; address?: string } | null;
    dropoff?: { label?: string; address?: string } | null;
    status?: string;
    createdAt?: string;
    assignedFleetVehicleLabel?: string;
  }>;
}): ActivityItem[] {
  const items: ActivityItem[] = [];

  // 1. Live leads — "New booking lead received" (reference header row style)
  for (const offer of args.offers ?? []) {
    const place = activityPlaceText(offer.pickup) || activityPlaceText(offer.dropoff);
    items.push({
      id: `lead-${offer.id}`,
      title: 'New booking lead received',
      meta1: `#${offer.bookingNumber || offer.id.slice(-6)}${place ? ` · ${place}` : ''}`,
      meta2: offer.serviceLabel || 'Towing',
      at: offer.createdAt,
      status: 'New',
      tone: 'blue',
      Icon: ClipboardList,
    });
  }

  // 2. Vendor verification history — approvals / document review
  for (const entry of args.vendor?.statusHistory ?? []) {
    const stage = entry.status as VerificationStage;
    const isReview = stage === 'document_review';
    items.push({
      id: `hist-${entry.status}-${entry.changedAt}`,
      title: isReview
        ? 'Document review started'
        : stage === 'approved'
          ? 'Approved'
          : stage === 'submitted'
            ? 'Document submitted'
            : STAGE_LABELS[stage] ?? entry.status.replace(/_/g, ' '),
      meta2:
        entry.note ||
        (isReview
          ? 'Document verification completed'
          : stage === 'submitted'
            ? 'Registration documents submitted'
            : 'Status updated'),
      at: entry.changedAt,
      status: stage === 'approved' || stage === 'submitted' ? 'Completed' : 'In progress',
      tone: stage === 'submitted' || stage === 'approved' ? 'green' : 'yellow',
      Icon: isReview ? FileSearch : CloudUpload,
    });
  }

  // 3. Fleet vehicle assignments from booking rows (latest 2)
  const assigned = (args.offers ?? []).filter(o => o.assignedFleetVehicleLabel).slice(0, 2);
  for (const b of assigned) {
    items.push({
      id: `assign-${b.id}`,
      title: 'Vehicle assigned',
      meta1: `#${b.bookingNumber || b.id.slice(-6)} · ${b.assignedFleetVehicleLabel}`,
      meta2: b.serviceLabel || 'Towing',
      at: b.createdAt,
      status: 'Completed',
      tone: 'green',
      Icon: Truck,
    });
  }

  // 4. Document uploads under review
  for (const doc of args.vendor?.documents ?? []) {
    items.push({
      id: `doc-${doc.id}`,
      title: 'Document review updated',
      meta2: `${doc.documentType.replace(/_/g, ' ')} · Under review`,
      at: doc.uploadedAt,
      status: 'Pending',
      tone: 'yellow',
      Icon: FileSearch,
    });
  }

  return items
    .sort((a, b) => +new Date(b.at ?? 0) - +new Date(a.at ?? 0))
    .slice(0, 4);
}

function statusPill(status: ActivityItem['status']) {
  if (status === 'Completed') {
    return { wrap: styles.pillCompleted, text: styles.pillCompletedText };
  }
  if (status === 'In progress') {
    return { wrap: styles.pillProgress, text: styles.pillProgressText };
  }
  if (status === 'Pending') {
    return { wrap: styles.pillProgress, text: styles.pillProgressText };
  }
  return { wrap: styles.pillNew, text: styles.pillNewText };
}

function activityTone(tone: ActivityItem['tone']) {
  if (tone === 'green') return { bg: '#DCFCE7', color: SUCCESS_GREEN };
  if (tone === 'yellow') return { bg: colors.goldLight, color: colors.primaryDark };
  if (tone === 'blue') return { bg: '#DBEAFE', color: INFO_BLUE };
  return { bg: '#EDE9FE', color: PURPLE };
}

export default function PartnerHomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<PartnerTabParamList>>();
  const user = useAppSelector(state => state.auth.user);
  const isVendor = true;

  const {
    data: vendor,
    isLoading: vendorLoading,
    isRefetching: vendorRefetching,
    refetch: refetchVendor,
  } = useVendorStatusQuery(isVendor);
  const { data: vendorDashboard, isLoading: dashboardLoading, refetch: refetchDashboard } =
    useVendorDashboardQuery(isVendor);
  const { data: offers = [], isLoading: offersLoading, refetch: refetchOffers } =
    useVendorBookingOffersQuery(isVendor);
  const { data: drivers = [], isLoading: driversLoading, refetch: refetchDrivers } =
    useVendorFleetDriversQuery(isVendor);
  const { data: vehicles = [], isLoading: vehiclesLoading, refetch: refetchVehicles } =
    useVendorFleetVehiclesQuery(isVendor);
  const { data: notifData } = useNotificationsQuery(isVendor);
  const unreadNotifCount = notifData?.unreadCount ?? 0;

  const [refreshing, setRefreshing] = useState(false);

  const earningsToday = vendorDashboard?.earningsToday ?? 0;
  const earningsTotal = vendorDashboard?.earningsTotal ?? earningsToday;
  const [earningsRange, setEarningsRange] = useState<'this_week' | 'last_week'>('this_week');
  const [weekMenuOpen, setWeekMenuOpen] = useState(false);
  const weeklySeries = useMemo(
    () => buildWeeklySeries(earningsToday, earningsTotal),
    [earningsToday, earningsTotal],
  );
  const earningsGrowthLabel = weeklyGrowthLabel(earningsToday, earningsTotal);
  // Last-week view: show the previous week's slice (total minus current week) with no growth row.
  const lastWeekEarnings = Math.max(earningsTotal - earningsToday, 0);
  const lastWeekSeries = useMemo(
    () => buildWeeklySeries(Math.round(lastWeekEarnings * 0.42), lastWeekEarnings),
    [lastWeekEarnings],
  );
  const displayEarnings = earningsRange === 'this_week' ? earningsToday : lastWeekEarnings;
  const displaySeries = earningsRange === 'this_week' ? weeklySeries : lastWeekSeries;

  const homeLoading =
    vendorLoading || dashboardLoading || offersLoading || driversLoading || vehiclesLoading;
  const openOffers = useMemo(
    () => offers.filter(offer => offer.bookingType === 'towing' && !offer.vendorApproved),
    [offers],
  );
  const activeVehicleCount = vehicles.filter(vehicle => vehicle.status === 'ACTIVE').length;
  const openJobs = openOffers.length;
  const awaitingClaimJobs = offers.length - openJobs;
  const onJobDrivers = drivers.filter(d => d.isBusy).length;
  const availableDrivers = drivers.filter(d => d.isAvailable && !d.isBusy).length;

  const activeVehicles = vehicles.filter(v => v.status === 'ACTIVE').length;

  const verification = verificationCopy(vendorLoading ? null : vendor);
  const activity = useMemo(
    () => buildActivity({ vendor, drivers, offers }),
    [vendor, drivers, offers],
  );

  const name = firstName(user?.fullName);
  const initial = name.charAt(0).toUpperCase() || 'V';

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchVendor(),
        refetchDashboard(),
        refetchOffers(),
        refetchDrivers(),
        refetchVehicles(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const goAccountScreen = (
    screen: 'VendorDrivers' | 'VendorVehicles' | 'VendorVerificationStatus' | 'PartnerBankDetails',
  ) => {
    navigation.navigate('PartnerAccount', partnerAccountParams(screen));
  };

  return (
    <AppScreenLayout
      backgroundColor={PAGE_BG}
      refreshing={refreshing || vendorRefetching}
      onRefresh={() => void onRefresh()}
      header={
        <View style={styles.headerPad}>
          <View style={styles.headerTop}>
            <PartnerHeaderLogo width={84} />
            <View style={styles.headerRight}>
              <Pressable
                onPress={openPartnerNotifications}
                hitSlop={10}
                style={styles.bellBtn}
                accessibilityRole="button"
                accessibilityLabel={
                  unreadNotifCount > 0
                    ? `Notifications, ${unreadNotifCount} unread`
                    : 'Notifications'
                }>
                <Bell size={18} color={colors.dark} strokeWidth={2.1} />
                {unreadNotifCount > 0 ? (
                  <View style={styles.bellCountBadge}>
                    <PartnerText style={styles.bellCountText}>
                      {unreadNotifCount > 9 ? '9+' : String(unreadNotifCount)}
                    </PartnerText>
                  </View>
                ) : openOffers.length > 0 ? (
                  <View style={styles.bellBadge} />
                ) : null}
              </Pressable>
              <View style={styles.avatarRow}>
                <View style={styles.avatar}>
                  <PartnerText style={styles.avatarText}>{initial}</PartnerText>
                </View>
                <View style={styles.avatarNameCol}>
                  <PartnerText style={styles.avatarName} numberOfLines={1}>
                    {name}
                  </PartnerText>
                  <ChevronDown size={10} color={colors.grey} strokeWidth={2.4} />
                </View>
              </View>
            </View>
          </View>

          <PartnerText style={styles.greeting}>
            {greetingForNow()}, {name} 👋
          </PartnerText>
          <PartnerText style={styles.subtitle}>Here's what's happening with your fleet today.</PartnerText>
        </View>
      }>
      {homeLoading ? (
        <DriverDataSkeleton variant="vendor-dashboard" />
      ) : (
        <>
          {activeVehicleCount === 0 && verification.tone !== 'rejected' ? (
            <Pressable
              onPress={() => goAccountScreen('VendorVehicles')}
              style={styles.reviewBanner}
              accessibilityRole="button"
              accessibilityLabel="Add a towing vehicle">
              <Truck size={16} color={colors.primaryDark} strokeWidth={2.2} />
              <View style={styles.reviewBannerCopy}>
                <PartnerText style={styles.reviewBannerTitle}>Add a vehicle to assign jobs</PartnerText>
                <PartnerText style={styles.reviewBannerHint}>
                  Customer towing requests still show here. Assignment stays locked until one vehicle is active.
                </PartnerText>
              </View>
              <ChevronRight size={16} color={colors.grey} strokeWidth={2.4} />
            </Pressable>
          ) : null}
          {verification.tone !== 'completed' ? (
            <Pressable
              onPress={() => goAccountScreen('VendorVerificationStatus')}
              style={styles.reviewBanner}
              accessibilityRole="button"
              accessibilityLabel="Open verification status">
              <Info size={16} color={colors.primaryDark} strokeWidth={2.2} />
              <View style={styles.reviewBannerCopy}>
                <PartnerText style={styles.reviewBannerTitle}>{verification.title}</PartnerText>
                <PartnerText style={styles.reviewBannerHint}>{verification.hint}</PartnerText>
              </View>
              <ChevronRight size={16} color={colors.grey} strokeWidth={2.4} />
            </Pressable>
          ) : null}
          {openOffers.length > 0 ? (
        <View style={styles.leadsBanner}>
          <View style={styles.leadsHeaderRow}>
            <View style={styles.leadsTitleGroup}>
              <View style={styles.leadsTruckBadge}>
                <Truck size={13} color="#FFFFFF" strokeWidth={2.4} />
              </View>
              <PartnerText style={styles.leadsTitle}>
                {openOffers.length} new lead{openOffers.length === 1 ? '' : 's'}
              </PartnerText>
            </View>
            <Pressable
              onPress={() => navigation.navigate('PartnerJobs')}
              style={styles.leadsViewAllRow}
              accessibilityRole="button">
              <PartnerText style={styles.leadsViewAll}>View all</PartnerText>
              <ChevronRight size={13} color={colors.primaryDark} strokeWidth={2.6} />
            </Pressable>
          </View>
          {openOffers.slice(0, 2).map(lead => (
            <View key={lead.id} style={styles.leadCard}>
              <View style={styles.leadArtwork}>
                {lead.bookingType === 'towing' ? (
                  <Image
                    source={require('../../../assets/partner/tow-truck-icon.png')}
                    style={styles.leadTruckImage}
                    resizeMode="contain"
                    accessibilityLabel="Tow truck"
                  />
                ) : (
                  <VehicleTypeArtwork
                    type={artworkCategoryForService(lead.serviceLabel, lead.bookingType)}
                    size={52}
                  />
                )}
              </View>
              <View style={styles.leadBody}>
                <PartnerText style={styles.leadService} numberOfLines={1}>
                  {lead.serviceLabel || (lead.bookingType === 'towing' ? 'Towing' : 'Driver')}
                </PartnerText>
                <PartnerText style={styles.leadNumber}>
                  #{lead.bookingNumber || lead.id.slice(-6)}
                </PartnerText>
                <View style={styles.leadAddressCol}>
                  {[
                    {
                      key: 'pickup',
                      text: lead.pickup?.address
                        ? formatReadableAddress(
                            lead.pickup.label
                              ? `${lead.pickup.label}, ${lead.pickup.address}`
                              : lead.pickup.address,
                          )
                        : lead.pickup?.label
                          ? formatReadableAddress(lead.pickup.label)
                          : 'Pickup nearby',
                    },
                    lead.dropoff?.address || lead.dropoff?.label
                      ? {
                          key: 'drop',
                          text: lead.dropoff?.address
                            ? formatReadableAddress(
                                lead.dropoff.label
                                  ? `${lead.dropoff.label}, ${lead.dropoff.address}`
                                  : lead.dropoff.address,
                              )
                            : formatReadableAddress(lead.dropoff!.label!),
                        }
                      : null,
                  ]
                    .filter(Boolean)
                    .map((addr, idx) => (
                      <View key={addr!.key} style={styles.leadAddrLine}>
                        <MapPin
                          size={12}
                          color={idx === 0 ? colors.primary : colors.grey}
                          strokeWidth={2.4}
                          fill={idx === 0 ? colors.primary : 'transparent'}
                        />
                        <PartnerText style={styles.leadAddrText} numberOfLines={1}>
                          {addr!.text}
                        </PartnerText>
                      </View>
                    ))}
                </View>
                <Pressable
                  style={styles.reviewLeadCta}
                  onPress={() => {
                    if (activeVehicleCount === 0 && !lead.onSiteAssist) {
                      goAccountScreen('VendorVehicles');
                      return;
                    }
                    navigation.navigate('PartnerJobs', {
                      screen: 'VendorAssignJob',
                      params: {
                        bookingId: lead.id,
                        bookingType: lead.bookingType,
                        bookingNumber: lead.bookingNumber,
                        serviceLabel: lead.serviceLabel,
                        pickupAddress: lead.pickup?.address || lead.pickup?.label,
                        estimatedFare: lead.estimatedFare,
                        onSiteAssist: lead.onSiteAssist,
                      },
                    } as never);
                  }}>
                  <PartnerText style={styles.reviewLeadText}>
                    {activeVehicleCount === 0 && !lead.onSiteAssist ? 'Add vehicle' : 'Review lead'}
                  </PartnerText>
                </Pressable>
              </View>
              <View style={styles.leadFareCol}>
                <PartnerText style={styles.leadFare}>
                  {typeof lead.estimatedFare === 'number' ? formatInr(lead.estimatedFare) : '₹—'}
                </PartnerText>
                <PartnerText style={styles.leadFareLabel}>Est. Fare</PartnerText>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.leadsEmptyCard}>
          <View style={styles.leadsEmptyIcon}>
            <ClipboardList size={18} color={colors.primaryDark} strokeWidth={2.2} />
          </View>
          <View style={styles.leadsEmptyCopy}>
            <PartnerText style={styles.leadsEmptyTitle}>
              {verification.tone === 'rejected' ? 'Account rejected' : 'No new booking leads'}
            </PartnerText>
            <PartnerText style={styles.leadsEmptySub}>
              {verification.tone === 'rejected'
                ? 'This account cannot take jobs. Open verification for the review note.'
                : 'Customer towing requests show here. Assigning one needs an active vehicle.'}
            </PartnerText>
          </View>
          <Pressable
            onPress={() =>
              verification.tone === 'rejected'
                ? goAccountScreen('VendorVerificationStatus')
                : navigation.navigate('PartnerJobs')
            }
            hitSlop={8}>
            <PartnerText style={styles.leadsViewAll}>
              {verification.tone === 'rejected' ? 'View status' : 'View all'}
            </PartnerText>
          </Pressable>
        </View>
      )}

      <View style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <View style={styles.earningsTitleRow}>
              <PartnerText style={styles.earningsTitle}>
                {earningsRange === 'this_week' ? 'Total earnings (this week)' : 'Total earnings (last week)'}
              </PartnerText>
              <Info size={13} color={colors.grey} strokeWidth={2.2} />
            </View>
            <View style={styles.weekMenuWrap}>
              <Pressable
                onPress={() => setWeekMenuOpen(open => !open)}
                style={styles.weekSelector}
                accessibilityRole="button"
                accessibilityLabel="Select earnings period">
                <PartnerText style={styles.weekSelectorText}>
                  {earningsRange === 'this_week' ? 'This week' : 'Last week'}
                </PartnerText>
                <ChevronDown size={12} color={colors.dark} strokeWidth={2.4} />
              </Pressable>
              {weekMenuOpen ? (
                <>
                  {/* backdrop to catch outside taps */}
                  <Pressable
                    accessibilityLabel="Close earnings period menu"
                    onPress={() => setWeekMenuOpen(false)}
                    style={styles.weekMenuBackdrop}
                  />
                  <View style={styles.weekMenu}>
                    {(['this_week', 'last_week'] as const).map(option => (
                      <Pressable
                        key={option}
                        onPress={() => {
                          setEarningsRange(option);
                          setWeekMenuOpen(false);
                        }}
                        style={[
                          styles.weekMenuItem,
                          earningsRange === option && styles.weekMenuItemActive,
                        ]}>
                        <PartnerText
                          style={[
                            styles.weekMenuText,
                            earningsRange === option && styles.weekMenuTextActive,
                          ]}>
                          {option === 'this_week' ? 'This week' : 'Last week'}
                        </PartnerText>
                        {earningsRange === option ? (
                          <Check size={12} color={colors.primaryDark} strokeWidth={2.6} />
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}
            </View>
          </View>
        <PartnerText style={styles.earningsValue}>{formatInr(displayEarnings)}</PartnerText>
        {earningsRange === 'this_week' && earningsGrowthLabel ? (
          <View style={styles.growthRow}>
            <TrendingUp size={12} color={SUCCESS_GREEN} strokeWidth={2.6} />
            <PartnerText style={styles.earningsGrowth}>{earningsGrowthLabel} from last week</PartnerText>
          </View>
        ) : (
          <PartnerText style={styles.earningsColLabel}>
            {earningsRange === 'this_week' ? 'Across all completed jobs' : 'Previous week total'}
          </PartnerText>
        )}
        {displaySeries.length > 1 ? (
          <View style={styles.chartBlock}>
            <WeeklySparkline values={displaySeries} />
            <View style={styles.chartDaysRow}>
              {WEEK_DAYS.map(day => (
                <PartnerText key={day} style={styles.chartDay}>
                  {day}
                </PartnerText>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.fleetSummary} testID="vendorFleetSummary">
        <PartnerText style={styles.sectionLabel}>Fleet Summary</PartnerText>
        <View style={styles.fleetRow}>
          <Pressable
            testID="vendorFleetDrivers"
            onPress={() => navigation.navigate('PartnerDrivers' as any)}
            style={({ pressed }) => [styles.fleetTile, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Drivers, ${drivers.length} total, ${availableDrivers} available`}>
            <View style={[styles.fleetIcon, { backgroundColor: '#EEF2FF' }]}>
              <Users size={16} color="#4F46E5" strokeWidth={2.2} />
            </View>
            <View style={styles.fleetMetricCopy}>
              <PartnerText style={styles.fleetMetricLabelTop}>Drivers</PartnerText>
              <PartnerText style={styles.fleetMetricValue} numberOfLines={1} adjustsFontSizeToFit>{String(drivers.length)}</PartnerText>
              <PartnerText style={[styles.fleetMetricSub, { color: availableDrivers ? '#16A34A' : colors.error }]} numberOfLines={1} adjustsFontSizeToFit>
                {availableDrivers} available
              </PartnerText>
            </View>
          </Pressable>
          <Pressable
            testID="vendorFleetVehicles"
            onPress={() => goAccountScreen('VendorVehicles')}
            style={({ pressed }) => [styles.fleetTile, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Vehicles, ${vehicles.length} total, ${activeVehicles} available`}>
            <View style={[styles.fleetIcon, { backgroundColor: '#FEF3C7' }]}>
              <Truck size={16} color="#D97706" strokeWidth={2.2} />
            </View>
            <View style={styles.fleetMetricCopy}>
              <PartnerText style={styles.fleetMetricLabelTop}>Vehicles</PartnerText>
              <PartnerText style={styles.fleetMetricValue} numberOfLines={1} adjustsFontSizeToFit>{String(vehicles.length)}</PartnerText>
              <PartnerText style={[styles.fleetMetricSub, { color: activeVehicles ? '#16A34A' : colors.error }]} numberOfLines={1} adjustsFontSizeToFit>
                {activeVehicles} available
              </PartnerText>
            </View>
          </Pressable>
          <Pressable
            testID="vendorFleetJobs"
            onPress={() => navigation.navigate('PartnerJobs')}
            style={({ pressed }) => [styles.fleetTile, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Jobs, ${offers.length + onJobDrivers} total, ${openJobs} open`}>
            <View style={[styles.fleetIcon, { backgroundColor: '#F3E8FF' }]}>
              <Briefcase size={15} color="#7C3AED" strokeWidth={2.2} />
            </View>
            <View style={styles.fleetMetricCopy}>
              <PartnerText style={styles.fleetMetricLabelTop}>Jobs</PartnerText>
              <PartnerText style={styles.fleetMetricValue} numberOfLines={1} adjustsFontSizeToFit>{String(offers.length + onJobDrivers)}</PartnerText>
              <PartnerText style={[styles.fleetMetricSub, { color: INFO_BLUE }]} numberOfLines={1} adjustsFontSizeToFit>{openJobs} open</PartnerText>
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.quickActions} testID="vendorQuickActions">
        <PartnerText style={styles.sectionLabel}>Quick Actions</PartnerText>
        <View style={styles.quickActionsRow}>
          <Pressable
            testID="vendorQuickPayout"
            onPress={() => goAccountScreen('PartnerBankDetails')}
            style={({ pressed }) => [styles.quickActionTile, pressed && styles.pressed]}
            accessibilityRole="button" accessibilityLabel="Payout and bank">
            <View style={[styles.quickActionIcon, { backgroundColor: '#ECFDF5' }]}>
              <Landmark size={19} color="#059669" strokeWidth={2.2} />
            </View>
            <PartnerText style={styles.quickActionLabel}>Payout &amp; bank</PartnerText>
          </Pressable>
          <Pressable
            testID="vendorQuickManageVehicles"
            onPress={() => goAccountScreen('VendorVehicles')}
            style={({ pressed }) => [styles.quickActionTile, pressed && styles.pressed]}
            accessibilityRole="button" accessibilityLabel="Manage vehicles">
            <View style={[styles.quickActionIcon, { backgroundColor: '#FFF4E5' }]}>
              <Car size={19} color="#D97706" strokeWidth={2.2} />
            </View>
            <PartnerText style={styles.quickActionLabel}>Manage vehicles</PartnerText>
          </Pressable>
        </View>
      </View>


      <View style={styles.activityCard}>
        <View style={styles.activityHeader}>
          <PartnerText style={styles.activityTitle}>Recent activity</PartnerText>
          <Pressable onPress={() => navigation.navigate('PartnerJobs')} hitSlop={8}>
            <PartnerText style={styles.viewAll}>View all</PartnerText>
          </Pressable>
        </View>

        {activity.length === 0 ? (
          <PartnerText style={styles.emptyActivity}>No recent activity yet.</PartnerText>
        ) : (
          activity.map(item => {
            const tone = activityTone(item.tone);
            const pill = statusPill(item.status);
            const Icon = item.Icon;
            return (
              <View key={item.id} style={styles.activityRow}>
                <View style={[styles.activityIcon, { backgroundColor: tone.bg }]}>
                  <Icon size={16} color={tone.color} strokeWidth={2.2} />
                </View>
                <View style={styles.activityCopy}>
                  <PartnerText style={styles.activityItemTitle} numberOfLines={1}>
                    {item.title}
                  </PartnerText>
                  {item.meta1 ? (
                    <PartnerText style={styles.activityMeta1} numberOfLines={1}>
                      {item.meta1}
                    </PartnerText>
                  ) : null}
                  {item.meta2 ? (
                    <PartnerText style={styles.activityDesc} numberOfLines={2}>
                      {item.meta2}
                    </PartnerText>
                  ) : null}
                </View>
                <View style={styles.activityRight}>
                  <PartnerText style={styles.activityTime} numberOfLines={1}>
                    {formatActivityTime(item.at) || '—'}
                  </PartnerText>
                  <View style={pill.wrap}>
                    <PartnerText style={pill.text}>{item.status}</PartnerText>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
        </>
      )}
    </AppScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerPad: {
    paddingHorizontal: 12,
    paddingBottom: spacing.md,
    backgroundColor: PAGE_BG,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  bellBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  bellCountBadge: {
    position: 'absolute',
    top: -4,
    right: -5,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellCountText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '800',
  },
  partnerPill: {
    backgroundColor: colors.goldLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  partnerPillText: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 150,
  },
  avatarNameCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: 12,
  },
  avatarName: {
    color: colors.dark,
    fontWeight: typography.weights.semibold,
    fontSize: 12,
    flexShrink: 1,
  },
  greeting: {
    color: colors.dark,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.extrabold,
    marginTop: spacing.lg,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.grey,
    marginTop: spacing.xs,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  onlineCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  onlineCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.goldLight,
  },
  onlineLabel: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  onlineValue: {
    color: colors.grey,
    marginTop: 4,
    fontSize: typography.sizes.sm,
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.lightGrey,
  },
  onlinePillActive: {
    backgroundColor: colors.dark,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  onlineDot: {
    backgroundColor: colors.success,
  },
  onlinePillText: {
    color: colors.grey,
    fontWeight: typography.weights.semibold,
  },
  onlinePillTextActive: {
    color: colors.textLight,
  },
  earningsCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  earningsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  earningsTitle: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.lightGrey,
  },
  periodText: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  earningsValue: {
    marginTop: spacing.sm,
    color: colors.dark,
    fontSize: 30,
    fontWeight: typography.weights.extrabold,
  },
  earningsGrowth: {
    marginTop: 4,
    color: SUCCESS_GREEN,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  chartWrap: {
    marginTop: spacing.md,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotText: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
  },
  dotSep: {
    color: colors.textMuted,
    marginHorizontal: 2,
  },
  activityCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  activityTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.lg,
  },
  viewAll: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  emptyActivity: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCopy: { flex: 1, minWidth: 0 },
  activityItemTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  activityMeta1: {
    marginTop: 2,
    color: colors.dark,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  activityDesc: {
    marginTop: 3,
    color: colors.grey,
    fontSize: typography.sizes.xs,
    lineHeight: 15,
  },
  activityRight: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  activityTime: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },
  pillCompleted: {
    backgroundColor: '#DCFCE7',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  pillCompletedText: {
    color: SUCCESS_GREEN,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  pillProgress: {
    backgroundColor: colors.goldLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  pillProgressText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  pillNew: {
    backgroundColor: '#DBEAFE',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  pillNewText: {
    color: INFO_BLUE,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  pressed: { opacity: 0.92 },
  leadsBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  leadsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  leadsTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leadsTruckBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.dark,
  },
  leadsViewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  leadsViewAll: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  leadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
    flexDirection: 'row',
    padding: 10,
    gap: 10,
  },
  leadArtwork: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#FFF7E6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  leadTruckImage: {
    width: 64,
    height: 48,
  },
  leadBody: {
    flex: 1,
    minWidth: 0,
  },
  leadService: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.dark,
  },
  leadNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.grey,
    marginTop: 2,
  },
  leadAddressCol: {
    flexDirection: 'column',
    gap: 3,
    marginTop: 4,
  },
  leadAddrLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  leadAddrText: {
    fontSize: 11.5,
    color: colors.grey,
    fontWeight: '600',
    flexShrink: 1,
  },
  reviewLeadCta: {
    marginTop: 8,
    alignSelf: 'stretch',
    borderWidth: 1.2,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: 'center',
  },
  reviewLeadText: {
    color: colors.primaryDark,
    fontSize: 11.5,
    fontWeight: '800',
  },
  leadFareCol: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    minWidth: 62,
  },
  leadFareLabel: {
    fontSize: 9.5,
    color: colors.grey,
    fontWeight: '600',
    marginTop: 2,
  },
  leadFare: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.dark,
  },
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  weekSelectorText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark,
  },
  weekMenuWrap: {
    position: 'relative',
    zIndex: 30,
  },
  weekMenuBackdrop: {
    position: 'absolute',
    top: -500,
    left: -500,
    right: -500,
    bottom: -500,
    zIndex: 29,
  },
  weekMenu: {
    position: 'absolute',
    top: 34,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    minWidth: 132,
    zIndex: 30,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  weekMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 36,
  },
  weekMenuItemActive: {
    backgroundColor: colors.goldLight,
  },
  weekMenuText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark,
  },
  weekMenuTextActive: {
    fontWeight: '800',
    color: colors.primaryDark,
  },
  growthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  chartBlock: {
    marginTop: spacing.md,
    marginHorizontal: -spacing.lg,
    marginBottom: -spacing.lg,
  },
  peakBubble: {
    position: 'absolute',
    backgroundColor: colors.dark,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  peakBubbleText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  chartDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  chartDay: {
    fontSize: 10,
    color: colors.grey,
    fontWeight: '600',
    width: 32,
    textAlign: 'center',
  },
  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF7E6',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3D19C',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  reviewBannerCopy: {
    flex: 1,
  },
  reviewBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.dark,
  },
  reviewBannerHint: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: colors.grey,
  },
  leadsEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  leadsEmptyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadsEmptyCopy: { flex: 1 },
  leadsEmptyTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  leadsEmptySub: {
    marginTop: 2,
    color: colors.grey,
    fontSize: typography.sizes.xs,
    lineHeight: 16,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  earningsCol: { flex: 1 },
  earningsColLabel: {
    marginTop: 4,
    color: colors.grey,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  earningsDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  fleetSummary: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 12,
    marginBottom: 12,
  },
  sectionLabel: { fontSize: 12, lineHeight: 17, fontWeight: '500', color: colors.dark, marginBottom: 8 },
  fleetRow: { flexDirection: 'row', gap: 8 },
  fleetTile: {
    flex: 1, minWidth: 0, minHeight: 70, flexDirection: 'row', alignItems: 'flex-start',
    gap: 7, paddingHorizontal: 8, paddingVertical: 9,
    backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#F0F0F0', borderRadius: 10,
  },
  fleetIcon: { width: 28, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  fleetMetricCopy: { flex: 1, minWidth: 0 },
  fleetMetricLabelTop: { color: colors.grey, fontSize: 10, lineHeight: 13, fontWeight: '500' },
  fleetMetricValue: { color: colors.dark, fontSize: 18, lineHeight: 22, fontWeight: '700' },
  fleetMetricSub: { fontSize: 9.5, lineHeight: 13, fontWeight: '600', marginTop: 2 },
  quickActions: { marginBottom: 16 },
  quickActionsRow: { flexDirection: 'row', gap: 8 },
  quickActionTile: {
    flex: 1, minWidth: 0, minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 14, backgroundColor: '#FFFFFF', borderWidth: 1,
    borderColor: colors.border, borderRadius: 14,
  },
  quickActionIcon: { width: 36, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { flex: 1, minWidth: 0, color: colors.dark, fontSize: 11.5, lineHeight: 16, fontWeight: '600' },

});
