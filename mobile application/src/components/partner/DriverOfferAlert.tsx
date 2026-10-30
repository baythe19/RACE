import { PartnerText } from './PartnerText';
/**
 * Incoming job request alert.
 *
 * A compact, time-sensitive offer card that pops over the current tab the moment
 * an unaccepted request appears for an online driver:
 *
 *   [NEW] 0:47 ▓▓▓▓▓░░░        ← countdown from the BACKEND deadline
 *   Instant Towing
 *   ● 5.4 km away · ₹1,650
 *   Saheed Nagar, Bhubaneswar
 *   [ Accept trip ]  [ Decline ]
 *
 * States covered:
 *   - live        → Accept / Decline enabled
 *   - expiring    → same, countdown turns amber under 30s
 *   - expired     → Accept disabled, "Request expired" + Dismiss
 *   - taken       → someone else claimed it first (backend conflict) + Dismiss
 *   - accepting   → buttons locked, spinner (no duplicate bookings)
 *
 * The deadline is decided by the API (`offerExpiresAt`); this component only
 * renders the remaining time, and never extends or restarts the window.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, View } from 'react-native';
import { Clock, MapPin, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScreenPx } from '../../hooks/useScreenPx';
import { useAppSelector } from '../../redux/hooks';
import { getApiErrorMessage } from '../../services/auth/useAuthMutations';
import { getDriverAcceptLocationGate, pickupCoordsFromJob } from '../../utils/driverLocationGuide';
import { useDriverPresenceStore } from '../../store/driverPresenceStore';
import {
  useAcceptDriverJobMutation,
  useDriverActiveJobQuery,
  useDriverJobOffersQuery,
  useDriverProfileQuery,
  useRejectDriverJobMutation,
} from '../../services/driver/useDriverQueries';
import { useDriverRealtimeSync } from '../../services/driver/useDriverRealtimeSync';
import { useVendorRealtimeSync } from '../../services/vendor/useVendorRealtimeSync';
import { useNotificationsQuery } from '../../services/useNotificationQueries';
import type { DriverJobBooking } from '../../services/driver/driverApi';
import { assertDriverCanAcceptJobs } from '../../utils/driverVerification';
import { openDriverActiveJob } from '../../navigation/partnerNavigationRef';
import { formatReadableAddress } from '../../utils/readableAddress';
import { buildDriverVerification } from '../../utils/driverVerification';
import { UI_PREVIEW_DRIVER_ALERT_ENABLED, UI_PREVIEW_MODE } from '../../constants/preview';
import {
  driverColors as C,
  driverMetrics as M,
  driverRadius as R,
  driverShadow,
  driverType as T,
} from '../../theme/driverUi';

type OutcomeKind = 'expired' | 'taken' | 'failed';

/** Outcome messages are pinned to the offer they belong to. */
type Outcome = { key: string; kind: OutcomeKind; message: string };

function formatInr(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}



export default function DriverOfferAlert() {
  const px = useScreenPx();
  const insets = useSafeAreaInsets();
  const user = useAppSelector(state => state.auth.user);
  const isDriver = user?.role === 'driver';
  const isVendor = user?.role === 'vendor';
  const isOnline = useDriverPresenceStore(state => state.isOnline);

  const { data: profile } = useDriverProfileQuery(isDriver);
  const verification = buildDriverVerification(profile);
  const canWork =
    verification.state !== 'rejected' &&
    verification.state !== 'suspended' &&
    profile?.operationalStatus !== 'SUSPENDED' &&
    profile?.operationalStatus !== 'DISABLED' &&
    profile?.reviewStatus !== 'REJECTED';
  const isVendorStaff =
    profile?.driverContext === 'VENDOR_MANAGED' ||
    Boolean(profile?.vendorUserId) ||
    Boolean(profile?.driverProfile?.vendorUserId) ||
    profile?.driverProfile?.fleetSource === 'vendor';
  // This host is mounted above the tab navigator, so job and notification events
  // keep syncing while the driver moves between tabs and nested screens.
  // Pending review still syncs. Fleet drivers never browse marketplace offers.
  useDriverRealtimeSync(isDriver && canWork, user?.id);
  useVendorRealtimeSync(isVendor, user?.id);
  const showMarketplaceOffers = isDriver && canWork && !isVendorStaff;
  const { data: offers = [] } = useDriverJobOffersQuery(showMarketplaceOffers);
  const { data: activeJob } = useDriverActiveJobQuery(isDriver && canWork);
  // Keep the notification cache live while the driver is in any nested screen.
  useNotificationsQuery(isDriver && canWork);
  const acceptMutation = useAcceptDriverJobMutation();
  const rejectMutation = useRejectDriverJobMutation();

  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const enterAnim = useRef(new Animated.Value(0)).current;

  /** Newest un-dismissed request wins the slot. */
  const offer: DriverJobBooking | null = useMemo(() => {
    const candidates = offers
      .filter(item => !dismissedIds.includes(`${item.bookingType}-${item.id}`))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return candidates[0] ?? null;
  }, [dismissedIds, offers]);

  const offerKey = offer ? `${offer.bookingType}-${offer.id}` : null;
  const activeOutcome = outcome && offerKey && outcome.key === offerKey ? outcome : null;
  const shouldShow =
    isDriver &&
    showMarketplaceOffers &&
    isOnline &&
    !activeJob &&
    Boolean(offer) &&
    (!UI_PREVIEW_MODE || UI_PREVIEW_DRIVER_ALERT_ENABLED);

  useEffect(() => {
    if (!shouldShow) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [shouldShow]);

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: shouldShow ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [enterAnim, shouldShow]);

  const windowMs = useMemo(() => {
    if (!offer?.offerExpiresAt) return null;
    const expires = +new Date(offer.offerExpiresAt);
    const created = +new Date(offer.createdAt);
    if (!Number.isFinite(expires) || !Number.isFinite(created)) return null;
    return { expires, total: Math.max(1, expires - created) };
  }, [offer?.createdAt, offer?.offerExpiresAt]);

  const remainingMs = windowMs ? Math.max(0, windowMs.expires - now) : null;
  const windowElapsed =
    Boolean(offer?.isExpired) || (remainingMs !== null && remainingMs <= 0);
  const isExpired = windowElapsed || activeOutcome?.kind === 'expired';
  const isUrgent = !isExpired && remainingMs !== null && remainingMs <= 30_000;
  const progress = windowMs && remainingMs !== null ? Math.min(1, remainingMs / windowMs.total) : 1;

  const dismiss = useCallback(() => {
    if (!offerKey) return;
    setDismissedIds(ids => [...ids, offerKey]);
    setOutcome(null);
  }, [offerKey]);

  const onAccept = useCallback(async () => {
    if (!offer || !offerKey || accepting || declining || isExpired) return;

    // Profile gate: rejected/suspended/unsubmitted accounts never accept.
    const profileVerdict = assertDriverCanAcceptJobs(profile ?? undefined);
    if (!profileVerdict.ok) {
      setOutcome({
        key: offerKey,
        kind: 'failed',
        message: profileVerdict.message ?? 'You cannot accept jobs right now.',
      });
      return;
    }

    // Distance + location gate: refuse accepts the driver can never serve in time.
    if (!UI_PREVIEW_MODE) {
      const gate = getDriverAcceptLocationGate({
        manualLocation: useDriverPresenceStore.getState().manualLocation,
        gpsLocation: useDriverPresenceStore.getState().driverLocation,
        pickup: pickupCoordsFromJob(offer),
        mobileNumber: user?.mobileNumber,
        previewMode: false,
      });
      if (!gate.ok) {
        setOutcome({
          key: offerKey,
          kind: 'failed',
          message: gate.message,
        });
        return;
      }
    }

    setAccepting(true);
    try {
      await acceptMutation.mutateAsync({ bookingId: offer.id, bookingType: offer.bookingType });
      dismiss();
      openDriverActiveJob(offer.id, offer.bookingType);
    } catch (error) {
      const message = getApiErrorMessage(error, 'Could not accept this request. Please try again.');
      const lowered = message.toLowerCase();
      // The backend is authoritative: a claim on an already-taken or lapsed
      // request aborts the alert instead of pretending the job is ours.
      if (lowered.includes('taken') || lowered.includes('expired')) {
        setOutcome({
          key: offerKey,
          kind: lowered.includes('expired') ? 'expired' : 'taken',
          message,
        });
      } else {
        setOutcome({
          key: offerKey,
          kind: 'failed',
          message,
        });
      }
    } finally {
      setAccepting(false);
    }
  }, [acceptMutation, accepting, declining, dismiss, isExpired, offer, offerKey, profile, user?.mobileNumber]);

  const onDecline = useCallback(async () => {
    if (!offer || accepting || declining) return;
    setDeclining(true);
    try {
      await rejectMutation.mutateAsync({ bookingId: offer.id, bookingType: offer.bookingType });
    } catch {
      // Declining is best-effort: dismissing locally is still correct for the
      // driver, and the offer simply stays in the Jobs list.
    } finally {
      setDeclining(false);
      dismiss();
    }
  }, [accepting, declining, dismiss, offer, rejectMutation]);

  if (!shouldShow || !offer || !offerKey) return null;

  const pickup = formatReadableAddress(offer.pickup?.address || offer.pickup?.label);
  const showPickup = pickup !== '—';
  const disabled = accepting || declining || isExpired || activeOutcome?.kind === 'taken';

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          top: insets.top + px(6),
          paddingHorizontal: px(M.pagePadding),
          opacity: enterAnim,
          transform: [
            {
              translateY: enterAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-px(16), 0],
              }),
            },
          ],
        },
      ]}>
      <View
        style={{
          backgroundColor: C.card,
          borderRadius: px(R.card),
          borderWidth: 1,
          borderColor: C.amberBorder,
          padding: px(14),
          ...driverShadow,
          shadowOpacity: 0.16,
          elevation: 10,
        }}>
        {/* header ------------------------------------------------------- */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              backgroundColor: C.bluePill,
              borderRadius: px(R.pill),
              paddingHorizontal: px(9),
              paddingVertical: px(3),
            }}>
            <PartnerText style={[T.pill, { fontSize: px(10.5), lineHeight: px(13), color: C.blue }]}>
              NEW
            </PartnerText>
          </View>

          {isExpired ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginLeft: px(8),
                backgroundColor: C.redPill,
                borderRadius: px(R.pill),
                paddingHorizontal: px(9),
                paddingVertical: px(3),
              }}>
              <PartnerText style={[T.pill, { fontSize: px(10.5), lineHeight: px(13), color: C.red }]}>
                EXPIRED
              </PartnerText>
            </View>
          ) : remainingMs !== null ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginLeft: px(8),
                backgroundColor: isUrgent ? C.amberTile : C.light,
                borderRadius: px(R.pill),
                paddingHorizontal: px(9),
                paddingVertical: px(3),
              }}>
              <Clock size={px(11)} color={isUrgent ? C.amberText : C.grey} strokeWidth={2.6} />
              <PartnerText
                style={[
                  T.pill,
                  {
                    fontSize: px(11),
                    lineHeight: px(14),
                    color: isUrgent ? C.amberText : C.grey,
                    marginLeft: px(4),
                  },
                ]}>
                {formatCountdown(remainingMs)}
              </PartnerText>
            </View>
          ) : null}

          <View style={{ flex: 1 }} />

          <Pressable
            onPress={dismiss}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Dismiss request"
            style={{ width: px(24), height: px(24), alignItems: 'center', justifyContent: 'center' }}>
            <X size={px(16)} color={C.greySoft} strokeWidth={2.4} />
          </Pressable>
        </View>

        <PartnerText
          numberOfLines={1}
          style={[
            T.jobTitle,
            { fontSize: px(16), lineHeight: px(21), color: C.ink, marginTop: px(8) },
          ]}>
          {offer.serviceLabel?.trim() || (offer.bookingType === 'towing' ? 'Towing' : 'Driver hire')}
        </PartnerText>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: px(4) }}>
          {offer.distanceKm != null ? (
            <>
              <MapPin size={px(13)} color={C.green} strokeWidth={2.6} />
              <PartnerText
                style={[
                  T.distance,
                  { fontSize: px(13.5), lineHeight: px(18), color: C.green, marginLeft: px(4) },
                ]}>
                {offer.distanceKm} km away
              </PartnerText>
            </>
          ) : null}
          {offer.distanceKm != null && offer.estimatedFare != null ? (
            <PartnerText style={[T.meta, { color: C.greySoft, marginHorizontal: px(6) }]}>·</PartnerText>
          ) : null}
          {offer.estimatedFare != null ? (
            <PartnerText style={[T.distance, { fontSize: px(13.5), lineHeight: px(18), color: C.ink }]}>
              {formatInr(offer.estimatedFare)}
            </PartnerText>
          ) : null}
        </View>

        {showPickup ? (
          <PartnerText
            numberOfLines={1}
            style={[T.meta, { fontSize: px(12.5), lineHeight: px(17), color: C.greySoft, marginTop: px(4) }]}>
            {pickup}
          </PartnerText>
        ) : null}

        {/* decision window --------------------------------------------- */}
        {windowMs ? (
          <View
            style={{
              height: px(4),
              borderRadius: px(2),
              backgroundColor: C.chartTrack,
              marginTop: px(10),
              overflow: 'hidden',
            }}>
            <View
              style={{
                height: '100%',
                width: `${Math.round(progress * 100)}%`,
                borderRadius: px(2),
                backgroundColor: isExpired ? C.greySoft : isUrgent ? C.amberText : C.green,
              }}
            />
          </View>
        ) : null}

        {/* outcome message ---------------------------------------------- */}
        {activeOutcome ? (
          <PartnerText
            style={[
              T.meta,
              {
                fontSize: px(12.5),
                lineHeight: px(17),
                marginTop: px(8),
                color: activeOutcome.kind === 'failed' ? C.red : C.grey,
              },
            ]}>
            {activeOutcome.kind === 'expired'
              ? activeOutcome.message ||
                'Request expired — it will be offered to another partner.'
              : activeOutcome.kind === 'taken'
                ? activeOutcome.message || 'Another partner accepted this request first.'
                : activeOutcome.message}
          </PartnerText>
        ) : null}

        {/* actions ------------------------------------------------------ */}
        <View style={{ flexDirection: 'row', marginTop: px(12), gap: px(10) }}>
          <Pressable
            onPress={() => void onAccept()}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            accessibilityLabel="Accept request"
            style={({ pressed }) => ({
              flex: 1,
              height: px(M.ctaHeight),
              borderRadius: px(R.button),
              backgroundColor: disabled ? C.amberBorder : C.amber,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.94 : 1,
            })}>
            {accepting ? (
              <ActivityIndicator color={C.ink} />
            ) : (
              <PartnerText style={[T.button, { fontSize: px(15.5), color: C.ink }]}>
                {isExpired
                  ? 'Expired'
                  : activeOutcome?.kind === 'taken'
                    ? 'Not available'
                    : 'Accept trip'}
              </PartnerText>
            )}
          </Pressable>

          <Pressable
            onPress={() => void onDecline()}
            disabled={accepting || declining}
            accessibilityRole="button"
            accessibilityLabel="Decline request"
            style={({ pressed }) => ({
              width: px(104),
              height: px(M.ctaHeight),
              borderRadius: px(R.button),
              borderWidth: 1,
              borderColor: C.hairline,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.9 : 1,
            })}>
            {declining ? (
              <ActivityIndicator color={C.grey} />
            ) : (
              <PartnerText style={[T.button, { fontSize: px(15), color: C.grey }]}>Decline</PartnerText>
            )}
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
  },
});
