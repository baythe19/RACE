import { PartnerText } from '../../components/partner/PartnerText';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  Bell,
  Briefcase,
  Calendar,
  Car,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Truck,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import axios from 'axios';
import { openPartnerNotifications } from '../../navigation/partnerNavigationRef';

import GlassCard from '../../components/ui/GlassCard';
import AppScreenLayout from '../../components/ui/AppScreenLayout';
import { useAppSelector } from '../../redux/hooks';
import {
  useAcceptDriverJobMutation,
  useDriverJobOffersQuery,
  useDriverJobsQuery,
  useRejectDriverJobMutation,
} from '../../services/driver/useDriverQueries';
import type { DriverJobBooking } from '../../services/driver/driverApi';
import {
  useVendorBookingOffersQuery,
  useVendorBookingsQuery,
  type VendorBookingItem,
} from '../../services/vendor/useVendorBookingsQueries';
import { formatReadableAddress } from '../../utils/readableAddress';
import type { PartnerJobsStackParamList } from '../../types/partnerNavigation';
import { colors, radius, spacing, typography } from '../../theme';
import { getApiErrorMessage } from '../../services/auth/useAuthMutations';

const SUCCESS_GREEN = '#22C55E';

const ACTIVE_STATUSES = new Set(['DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS']);

type JobTab = 'all' | 'new' | 'nearby' | 'assigned' | 'in_progress' | 'completed';

const PAGE_BG = '#FFFFFF';

const DRIVER_TABS: Array<{ key: JobTab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'Available' },
  { key: 'in_progress', label: 'Active' },
  { key: 'completed', label: 'Done' },
];

const VENDOR_TABS: Array<{ key: JobTab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'nearby', label: 'Nearby' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  NEW: { bg: '#DBEAFE', text: '#1D4ED8' },
  NEARBY: { bg: '#DCFCE7', text: '#15803D' },
  APPROVED: { bg: '#FEF3C7', text: '#B45309' },
  'AWAITING DRIVER': { bg: '#FEF3C7', text: '#B45309' },
  ASSIGNED: { bg: '#F3E8FF', text: '#7E22CE' },
  'IN PROGRESS': { bg: '#FFEDD5', text: '#C2410C' },
  COMPLETED: { bg: '#F3F4F6', text: '#4B5563' },
};

function statusLabelFor(job: DriverJobBooking, isOffer: boolean, isVendor = false): string {
  if (isOffer && job.vendorApproved && isVendor) return 'AWAITING DRIVER';
  if (isOffer && job.vendorApproved) return 'APPROVED';
  if (isOffer) {
    if (typeof job.distanceKm === 'number' && job.distanceKm <= 5) return 'NEARBY';
    return 'NEW';
  }
  if (job.status === 'DRIVER_ASSIGNED') return 'ASSIGNED';
  if (ACTIVE_STATUSES.has(job.status)) return 'IN PROGRESS';
  if (job.status === 'COMPLETED' || job.status === 'RATED') return 'COMPLETED';
  return 'NEW';
}

function tabFor(job: DriverJobBooking, isOffer: boolean, isVendor = false): JobTab {
  const label = statusLabelFor(job, isOffer, isVendor);
  if (label === 'NEARBY') return 'nearby';
  if (label === 'NEW' || label === 'APPROVED' || label === 'AWAITING DRIVER') return 'new';
  if (label === 'ASSIGNED') return 'assigned';
  if (label === 'IN PROGRESS') return 'in_progress';
  if (label === 'COMPLETED') return 'completed';
  return 'all';
}

function formatJobTime(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(+date)) return '';
  const today = new Date();
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return sameDay
    ? `Today, ${time}`
    : date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const EXCLUDED_VENDOR_STATUSES = new Set(['CANCELLED', 'REJECTED']);

/** Map a vendor booking row onto the shared job-card shape. */
function vendorBookingToCard(item: VendorBookingItem): DriverJobBooking {
  return {
    bookingType: item.bookingType,
    id: item.id,
    bookingNumber: item.bookingNumber,
    status: item.status,
    pickup: item.pickup,
    dropoff: item.dropoff,
    estimatedFare: item.estimatedFare,
    finalFare: item.finalFare,
    createdAt: item.createdAt,
    serviceLabel: item.serviceLabel,
    assignedFleetVehicleLabel: item.assignedFleetVehicleLabel,
    driver: item.driver,
    // Vendor-routed rows awaiting a driver claim come from /vendor/bookings.
    vendorApproved: Boolean(item.driver) || item.status === 'CONFIRMED',
  };
}

function isPendingApprovalError(error: unknown): boolean {
  if (!axios.isAxiosError(error) || error.response?.status !== 403) return false;
  const message = String(
    (error.response?.data as { message?: string } | undefined)?.message ?? '',
  ).toLowerCase();
  // Driver: "pending admin approval". Vendor: "...must be approved before you can ...".
  return message.includes('pending admin approval') || message.includes('must be approved');
}

export default function PartnerJobsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PartnerJobsStackParamList>>();
  const user = useAppSelector(state => state.auth.user);
  const isDriver = user?.role === 'driver';
  const isVendor = user?.role === 'vendor';

  const [filter, setFilter] = useState<JobTab>('all');
  const [actingId, setActingId] = useState<string | null>(null);

  const driverJobsQuery = useDriverJobsQuery(isDriver);
  const driverOffersQuery = useDriverJobOffersQuery(isDriver);
  const vendorOffersQuery = useVendorBookingOffersQuery(isVendor);
  const vendorBookingsQuery = useVendorBookingsQuery(isVendor);

  const acceptMutation = useAcceptDriverJobMutation();
  const rejectMutation = useRejectDriverJobMutation();

  const offers: DriverJobBooking[] = isVendor
    ? (vendorOffersQuery.data ?? []).filter(job => !job.vendorApproved)
    : (driverOffersQuery.data ?? []);
  const myJobs: DriverJobBooking[] = isDriver ? (driverJobsQuery.data ?? []) : [];

  const pendingApproval =
    isPendingApprovalError(driverJobsQuery.error) ||
    isPendingApprovalError(driverOffersQuery.error) ||
    isPendingApprovalError(vendorOffersQuery.error) ||
    isPendingApprovalError(vendorBookingsQuery.error);

  const loadError =
    (!pendingApproval &&
      (driverJobsQuery.error ||
        driverOffersQuery.error ||
        vendorOffersQuery.error ||
        vendorBookingsQuery.error)) ||
    null;

  const isLoading = isVendor
    ? vendorOffersQuery.isLoading || vendorBookingsQuery.isLoading
    : driverJobsQuery.isLoading || driverOffersQuery.isLoading;

  const offerCards = useMemo(
    () => offers.map(job => ({ job, isOffer: true as const })),
    [offers],
  );
  const mineCards = useMemo(
    () => myJobs.map(job => ({ job, isOffer: false as const })),
    [myJobs],
  );

  const driverAvailableCards = useMemo(() => {
    if (filter === 'all' || filter === 'new' || filter === 'nearby') {
      return offerCards.filter(({ job, isOffer }) =>
        filter === 'all' ? true : tabFor(job, isOffer, false) === filter,
      );
    }
    return [];
  }, [offerCards, filter]);

  const driverMyCards = useMemo(() => {
    if (filter === 'all' || filter === 'assigned' || filter === 'in_progress' || filter === 'completed') {
      return mineCards.filter(({ job, isOffer }) =>
        filter === 'all' ? true : tabFor(job, isOffer, false) === filter,
      );
    }
    return [];
  }, [mineCards, filter]);

  const isRefetching = isVendor
    ? vendorOffersQuery.isRefetching || vendorBookingsQuery.isRefetching
    : driverJobsQuery.isRefetching || driverOffersQuery.isRefetching;

  const refetchAll = () => {
    if (isVendor) {
      void vendorOffersQuery.refetch();
      void vendorBookingsQuery.refetch();
    } else if (isDriver) {
      void driverJobsQuery.refetch();
      void driverOffersQuery.refetch();
    }
  };

  // Vendor fleet bookings after assignment (awaiting claim / claimed / done).
  const allVendorCards = useMemo(() => {
    const rows = vendorBookingsQuery.data ?? [];
    const awaiting = rows
      .filter(item => !EXCLUDED_VENDOR_STATUSES.has(item.status) && !item.driver)
      .map(item => ({ job: vendorBookingToCard(item), isOffer: true as const }));
    const claimed = rows
      .filter(item => !EXCLUDED_VENDOR_STATUSES.has(item.status) && item.driver)
      .map(item => ({ job: vendorBookingToCard(item), isOffer: false as const }));
    return [...awaiting, ...claimed];
  }, [vendorBookingsQuery.data]);

  const allDriverCards = useMemo(() => {
    const offerCards = offers.map(job => ({ job, isOffer: true as const }));
    const mineCards = myJobs.map(job => ({ job, isOffer: false as const }));
    return [...offerCards, ...mineCards];
  }, [offers, myJobs]);

  const cards = isVendor ? allVendorCards : allDriverCards;

  const tabs = isDriver ? DRIVER_TABS : VENDOR_TABS;

  const counts = useMemo(() => {
    if (isDriver) {
      const activeMine = mineCards.filter(
        ({ job }) => job.status === 'DRIVER_ASSIGNED' || ACTIVE_STATUSES.has(job.status),
      ).length;
      const doneMine = mineCards.filter(
        ({ job }) => job.status === 'COMPLETED' || job.status === 'RATED',
      ).length;
      return {
        all: offerCards.length + mineCards.length,
        new: offerCards.length,
        nearby: 0,
        assigned: 0,
        in_progress: activeMine,
        completed: doneMine,
      };
    }

    const base: Record<JobTab, number> = {
      all: cards.length,
      new: 0,
      nearby: 0,
      assigned: 0,
      in_progress: 0,
      completed: 0,
    };
    cards.forEach(({ job, isOffer }) => {
      const tab = tabFor(job, isOffer, isVendor);
      base[tab] += 1;
    });
    return base;
  }, [isDriver, offerCards, mineCards, cards, isVendor]);

  const filteredCards = useMemo(() => {
    if (filter === 'all') return cards;
    return cards.filter(({ job, isOffer }) => tabFor(job, isOffer, isVendor) === filter);
  }, [cards, filter, isVendor]);

  const summary = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const jobsToday = cards.filter(({ job }) => {
      if (!job.createdAt) return false;
      return new Date(job.createdAt) >= todayStart;
    }).length;
    return {
      jobsToday,
      open: counts.new + counts.nearby,
      inProgress: counts.assigned + counts.in_progress,
    };
  }, [cards, counts]);

  const onAccept = async (job: DriverJobBooking) => {
    if (counts.in_progress > 0) {
      Alert.alert(
        'Active Trip in Progress',
        'You already have an active trip in progress. Please complete or cancel your current trip before accepting a new job.',
      );
      return;
    }
    setActingId(job.id);
    try {
      await acceptMutation.mutateAsync({ bookingId: job.id, bookingType: job.bookingType });
      navigation.navigate('PartnerActiveJob', {
        bookingId: job.id,
        bookingType: job.bookingType,
      });
    } catch (error) {
      Alert.alert('Accept failed', getApiErrorMessage(error, 'Could not accept job'));
      refetchAll();
    } finally {
      setActingId(null);
    }
  };

  const onReject = (job: DriverJobBooking) => {
    Alert.alert('Reject job?', 'This booking will go back to the open pool.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setActingId(job.id);
            try {
              await rejectMutation.mutateAsync({
                bookingId: job.id,
                bookingType: job.bookingType,
              });
            } catch (error) {
              Alert.alert('Reject failed', getApiErrorMessage(error, 'Could not reject job'));
            } finally {
              setActingId(null);
            }
          })();
        },
      },
    ]);
  };

  const driverIsEmpty = driverAvailableCards.length === 0 && driverMyCards.length === 0;

  const renderJobCard = ({ job, isOffer }: { job: DriverJobBooking; isOffer: boolean }) => {
    const label = statusLabelFor(job, isOffer, isVendor);
    const statusStyle = STATUS_COLORS[label] ?? STATUS_COLORS.NEW;
    const Icon = job.bookingType === 'towing' ? Truck : Car;
    const serviceLabel =
      job.serviceLabel || (job.bookingType === 'towing' ? 'Car Tow' : 'Hire Driver');
    const busy = actingId === job.id;
    const canAcceptOffer = isDriver && isOffer;
    const canRejectAssigned = isDriver && !isOffer && job.status === 'DRIVER_ASSIGNED';
    const isActive = isDriver && !isOffer && ACTIVE_STATUSES.has(job.status);

    return (
      <GlassCard
        key={`${isOffer ? 'o' : 'm'}-${job.bookingType}-${job.id}`}
        style={[styles.jobCard, isOffer && isDriver && styles.driverOfferCard]}>
        {/* status badge + booking ref */}
        <View style={styles.cardHeadRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <PartnerText style={[styles.statusBadgeText, { color: statusStyle.text }]}>{label}</PartnerText>
          </View>
          <View style={styles.refPill}>
            <PartnerText style={styles.jobNumber}>#{job.bookingNumber}</PartnerText>
          </View>
        </View>

        {/* service title + fare column */}
        <View style={styles.cardMainRow}>
          <View style={styles.cardCopyCol}>
            <PartnerText style={styles.cardTitle}>{serviceLabel}</PartnerText>
            <View style={styles.pinRow}>
              <MapPin size={12} color="#2563EB" strokeWidth={2.4} />
              <PartnerText style={styles.pinText} numberOfLines={1}>
                {formatReadableAddress(job.pickup?.address || job.pickup?.label) || 'Pickup'}
              </PartnerText>
            </View>
            {job.dropoff ? (
              <View style={styles.pinRow}>
                <MapPin size={12} color="#F59E0B" strokeWidth={2.4} />
                <PartnerText style={styles.pinText} numberOfLines={1}>
                  {formatReadableAddress(job.dropoff.address || job.dropoff.label)}
                </PartnerText>
              </View>
            ) : null}
            <View style={styles.metaRow}>
              {typeof job.distanceKm === 'number' && job.distanceKm < 900 ? (
                <>
                  <Navigation size={11} color={colors.grey} strokeWidth={2.4} />
                  <PartnerText style={styles.metaText}>{job.distanceKm.toFixed(1)} km</PartnerText>
                </>
              ) : null}
              <Calendar size={11} color={colors.grey} strokeWidth={2.2} />
              <PartnerText style={styles.metaText}>{formatJobTime(job.createdAt)}</PartnerText>
            </View>
          </View>
          <View style={styles.fareCol}>
            {typeof (isVendor && job.status === 'COMPLETED' ? job.finalFare : job.estimatedFare) ===
            'number' ? (
              <>
                <PartnerText style={styles.fare}>
                  ₹{Math.round(
                    (isVendor && job.status === 'COMPLETED' ? job.finalFare : job.estimatedFare) ?? 0,
                  )}
                </PartnerText>
                <PartnerText style={styles.fareHint}>
                  {isVendor
                    ? job.status === 'COMPLETED'
                      ? 'Confirmed value'
                      : 'Est. Fare'
                    : 'Est. earnings'}
                </PartnerText>
              </>
            ) : null}
          </View>
        </View>

        {/* driver row with call icon */}
        {!isOffer && job.driver ? (
          <View style={styles.driverChipRow}>
            <View style={styles.driverChipAvatar}>
              <PartnerText style={styles.driverChipInitial}>{job.driver.name.charAt(0).toUpperCase()}</PartnerText>
            </View>
            <View style={styles.driverChipCopy}>
              <PartnerText style={styles.driverChipName} numberOfLines={1}>
                {job.driver.name}
              </PartnerText>
              <PartnerText style={styles.driverChipMeta}>Fleet driver on this job</PartnerText>
            </View>
            {job.driver.phone ? (
              <Pressable
                onPress={() => {
                  const phone = job.driver?.phone;
                  if (phone) void Linking.openURL(`tel:${phone}`);
                }}
                hitSlop={8}
                style={styles.callBtn}
                accessibilityRole="button"
                accessibilityLabel={`Call ${job.driver.name}`}>
                <Phone size={14} color="#FFFFFF" strokeWidth={2.4} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* vehicle hint (assigned cards) */}
        {job.assignedFleetVehicleLabel ? (
          <PartnerText style={styles.vehicleHint} numberOfLines={1}>
            Vehicle: {job.assignedFleetVehicleLabel}
          </PartnerText>
        ) : null}

        {isOffer && job.vendorApproved ? (
          <View style={styles.awaitingDriverBanner}>
            <PartnerText style={styles.awaitingDriverText}>
              Awaiting driver — your fleet drivers can accept this job
            </PartnerText>
          </View>
        ) : null}

        {isVendor && isOffer && !job.vendorApproved ? (
          <View style={styles.vendorActions}>
            <Pressable
              onPress={() =>
                navigation.navigate('VendorAssignJob', {
                  bookingId: job.id,
                  bookingType: job.bookingType,
                  bookingNumber: job.bookingNumber,
                  serviceLabel,
                  pickupAddress: job.pickup?.address || job.pickup?.label,
                  estimatedFare: job.estimatedFare,
                })
              }
              style={styles.assignBtn}>
              <PartnerText style={styles.assignLabel}>Assign vehicle</PartnerText>
            </Pressable>
          </View>
        ) : null}

        {isVendor && isOffer && !job.vendorApproved ? (
          <View style={styles.vendorActions}>
            <Pressable
              onPress={() =>
                navigation.navigate('VendorAssignJob', {
                  bookingId: job.id,
                  bookingType: job.bookingType,
                  bookingNumber: job.bookingNumber,
                  serviceLabel,
                  pickupAddress: job.pickup?.address || job.pickup?.label,
                  estimatedFare: job.estimatedFare,
                })
              }
              style={styles.assignBtn}>
              <PartnerText style={styles.assignLabel}>Approve & assign vehicle</PartnerText>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('VendorVehicles')}
              style={styles.addVehicleOutline}>
              <PartnerText style={styles.addVehicleOutlineLabel}>Add vehicle</PartnerText>
            </Pressable>
          </View>
        ) : null}

        {isVendor && isOffer && job.vendorApproved ? (
          <View style={styles.awaitingDriverBanner}>
            <PartnerText style={styles.awaitingDriverText}>
              Awaiting driver — your fleet drivers can accept this job
            </PartnerText>
          </View>
        ) : null}

        {canAcceptOffer ? (
          <Pressable
            disabled={busy}
            onPress={() => void onAccept(job)}
            style={[styles.acceptBtnFull, busy && styles.disabled]}>
            <PartnerText style={styles.acceptLabel}>{busy ? 'Accepting…' : 'Accept trip'}</PartnerText>
          </Pressable>
        ) : null}

        {canRejectAssigned ? (
          <View style={styles.actions}>
            <Pressable
              disabled={busy}
              onPress={() => void onAccept(job)}
              style={[styles.acceptBtn, busy && styles.disabled]}>
              <PartnerText style={styles.acceptLabel}>{busy ? '…' : 'Start trip'}</PartnerText>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => onReject(job)}
              style={[styles.rejectBtn, busy && styles.disabled]}>
              <PartnerText style={styles.rejectLabel}>Reject</PartnerText>
            </Pressable>
          </View>
        ) : null}

        {isActive ? (
          <Pressable
            onPress={() =>
              navigation.navigate('PartnerActiveJob', {
                bookingId: job.id,
                bookingType: job.bookingType,
              })
            }
            style={styles.manageBtn}>
            <PartnerText style={styles.manageLabel}>Manage active trip →</PartnerText>
          </Pressable>
        ) : null}
      </GlassCard>
    );
  };

  return (
    <AppScreenLayout
      header={
        <View style={styles.headerPad}>
          <View style={styles.headerTop}>
            <View style={styles.headerCopy}>
              <View>
                <PartnerText style={styles.brandRace}>RACE</PartnerText>
                <PartnerText style={styles.brandPartner}>PARTNER</PartnerText>
              </View>
              <PartnerText style={styles.subtitle} numberOfLines={1}>
                {isVendor
                  ? 'Manage and assign roadside assistance requests.'
                  : 'Trips approved by your vendor appear here — accept to start.'}
              </PartnerText>
            </View>
            <View style={styles.headerActions}>
              {isVendor ? (
                <Pressable
                  onPress={() => navigation.navigate('VendorVehicles')}
                  style={styles.addVehicleBtn}>
                  <Plus size={16} color={colors.dark} strokeWidth={2.6} />
                  <PartnerText style={styles.addVehicleLabel}>Vehicle</PartnerText>
                </Pressable>
              ) : null}
              <Pressable
                onPress={openPartnerNotifications}
                hitSlop={10}
                style={styles.bellBtn}
                accessibilityRole="button"
                accessibilityLabel="Notifications">
                <Bell size={20} color={colors.dark} strokeWidth={2.2} />
              </Pressable>
            </View>
          </View>

          {isVendor ? (
            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Briefcase size={18} color="#2563EB" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <PartnerText style={styles.summaryTitle}>
                  Jobs today: <PartnerText style={styles.summaryCount}>{summary.jobsToday}</PartnerText>
                </PartnerText>
                <PartnerText style={styles.summaryMeta}>
                  <PartnerText style={styles.openMeta}>{summary.open} Open</PartnerText>
                  {' · '}
                  <PartnerText style={styles.progressMeta}>{summary.inProgress} In progress</PartnerText>
                </PartnerText>
              </View>
            </View>
          ) : null}

          {isDriver ? (
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.goldLight }]}>
                <Briefcase size={18} color={colors.primaryDark} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <PartnerText style={styles.summaryTitle}>
                  <PartnerText style={styles.summaryCount}>{offerCards.length}</PartnerText> ready to accept
                </PartnerText>
                <PartnerText style={styles.summaryMeta}>
                  <PartnerText style={styles.openMeta}>{counts.in_progress} active trip(s)</PartnerText>
                  {offerCards.length === 0 ? (
                    <>
                      {' · '}
                      <PartnerText style={styles.progressMeta}>Ask vendor to approve jobs first</PartnerText>
                    </>
                  ) : null}
                </PartnerText>
              </View>
            </View>
          ) : null}
        </View>
      }
      scrollable={false}
      contentStyle={styles.content}>
      {!isDriver && !isVendor ? (
        <View style={styles.empty}>
          <PartnerText style={styles.emptyTitle}>Partner jobs</PartnerText>
          <PartnerText style={styles.emptySubtitle}>
            Sign in as a vendor or driver to see customer requests.
          </PartnerText>
        </View>
      ) : pendingApproval ? (
        <View style={styles.empty}>
          <PartnerText style={styles.emptyTitle}>Waiting for approval</PartnerText>
          <PartnerText style={styles.emptySubtitle}>
            Your account is pending admin approval. Jobs will appear here once approved.
          </PartnerText>
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}>
            {tabs.map(tab => {
              const active = filter === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setFilter(tab.key)}
                  style={[styles.tab, active && styles.tabActive]}>
                  <PartnerText style={[styles.tabText, active && styles.tabTextActive]}>
                    {tab.label} ({counts[tab.key]})
                  </PartnerText>
                </Pressable>
              );
            })}
          </ScrollView>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
          ) : (
            <ScrollView
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl refreshing={isRefetching} onRefresh={refetchAll} />
              }>
              {loadError ? (
                <PartnerText style={styles.errorText}>
                  {getApiErrorMessage(loadError, 'Unable to load jobs')}
                </PartnerText>
              ) : null}

              {isDriver ? (
                driverIsEmpty ? (
                  <View style={styles.emptyInline}>
                    <View style={styles.iconWrap}>
                      <Navigation size={36} color={colors.primary} strokeWidth={2} />
                    </View>
                    <PartnerText style={styles.emptyTitle}>No trips yet</PartnerText>
                    <PartnerText style={styles.emptySubtitle}>
                      After your vendor approves a customer request and assigns a vehicle, it will
                      show up here. Tap Accept trip to claim it — then it becomes your active job.
                    </PartnerText>
                  </View>
                ) : (
                  <>
                    {driverAvailableCards.length > 0 ? (
                      <>
                        <PartnerText style={styles.sectionHeading}>Available to accept</PartnerText>
                        {driverAvailableCards.map(renderJobCard)}
                      </>
                    ) : null}
                    {driverMyCards.length > 0 ? (
                      <>
                        <PartnerText style={[styles.sectionHeading, driverAvailableCards.length > 0 && styles.sectionHeadingSpaced]}>
                          My trips
                        </PartnerText>
                        {driverMyCards.map(renderJobCard)}
                      </>
                    ) : null}
                  </>
                )
              ) : filteredCards.length === 0 ? (
                <View style={styles.emptyInline}>
                  <View style={styles.iconWrap}>
                    <Navigation size={36} color={colors.primary} strokeWidth={2} />
                  </View>
                  <PartnerText style={styles.emptyTitle}>No jobs yet</PartnerText>
                  <PartnerText style={styles.emptySubtitle}>
                    Open customer requests appear here. Approve a job and assign a vehicle — your
                    drivers can accept it.
                  </PartnerText>
                </View>
              ) : (
                filteredCards.map(renderJobCard)
              )}
            </ScrollView>
          )}
        </>
      )}
    </AppScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerPad: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: PAGE_BG,
    gap: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerCopy: { flex: 1 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.dark,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.extrabold,
  },
  brandRace: {
    color: colors.dark,
    fontSize: 17,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  brandPartner: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 2.5,
  },
  subtitle: {
    marginTop: 6,
    color: colors.grey,
    fontSize: typography.sizes.xs,
    lineHeight: 15,
  },
  addVehicleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addVehicleLabel: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    color: colors.dark,
    fontWeight: typography.weights.semibold,
  },
  summaryCount: {
    fontWeight: typography.weights.extrabold,
    fontSize: typography.sizes.lg,
  },
  summaryMeta: {
    marginTop: 2,
    fontSize: typography.sizes.sm,
  },
  openMeta: { color: '#2563EB', fontWeight: typography.weights.semibold },
  progressMeta: { color: colors.primaryDark, fontWeight: typography.weights.semibold },
  content: { flexGrow: 1 },
  tabsRow: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: 6,
    flexGrow: 0,
    flexShrink: 0,
    alignItems: 'flex-start',
  },
  tab: {
    height: 28,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lightGrey,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.grey,
    fontWeight: typography.weights.semibold,
    fontSize: 12,
  },
  tabTextActive: { color: colors.dark },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
    backgroundColor: PAGE_BG,
  },
  sectionHeading: {
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.xs,
  },
  sectionHeadingSpaced: {
    marginTop: spacing.lg,
  },
  jobCard: {
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  driverOfferCard: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  cardHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.4,
  },
  refPill: {
    backgroundColor: colors.lightGrey,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  jobNumber: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: 11,
  },
  cardMainRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardCopyCol: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  cardTitle: {
    color: colors.dark,
    fontSize: 14,
    fontWeight: typography.weights.extrabold,
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pinText: {
    flex: 1,
    color: colors.grey,
    fontSize: 11.5,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    color: colors.grey,
    fontSize: 10.5,
    fontWeight: '600',
    marginRight: 6,
  },
  fareCol: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    minWidth: 70,
  },
  fare: {
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
    fontSize: 17,
  },
  fareHint: {
    color: colors.grey,
    fontSize: 10,
    marginTop: 2,
  },
  vehicleHint: {
    marginTop: 2,
    color: colors.grey,
    fontSize: typography.sizes.xs,
  },
  callBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: SUCCESS_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorActions: { gap: spacing.sm },
  assignBtn: {
    minHeight: 48,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignLabel: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  addVehicleOutline: {
    minHeight: 44,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addVehicleOutlineLabel: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
  },
  awaitingDriverBanner: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.goldLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  awaitingDriverText: {
    color: colors.primaryDark,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  vendorApprovedChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.goldLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  vendorApprovedChipText: {
    color: colors.primaryDark,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  driverChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.lightGrey,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  driverChipAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverChipInitial: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  driverChipCopy: { flex: 1 },
  driverChipName: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  driverChipMeta: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    marginTop: 1,
  },
  driverChipPhone: {
    color: colors.dark,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  acceptBtnFull: {
    minHeight: 48,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  acceptBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptLabel: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  rejectBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectLabel: {
    color: colors.error,
    fontWeight: typography.weights.bold,
  },
  manageBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  manageLabel: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  disabled: { opacity: 0.5 },
  empty: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxxl,
  },
  emptyInline: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.dark,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.grey,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
});
