import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { IndianRupee, Route } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import LocationPickerModal from '../../../components/common/LocationPickerModal';
import RideLocationBoard, { type RideSuggestion } from '../../../components/booking/RideLocationBoard';
import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import WizardStepFade from '../../../components/booking/WizardStepFade';
import { useTowingBooking } from '../../../context/TowingBookingContext';
import { estimateTowingFare } from '../../../services/bookings/fareApi';
import { towingFareModeParams } from '../../../utils/towingFareEstimate';
import { useSavedLocationsQuery } from '../../../services/profile/useProfileQueries';
import { useLocationStore } from '../../../store/locationStore';
import { useUserLocationStore } from '../../../store/userLocationStore';
import type { LocationResult } from '../../../types/location';
import type { HomeStackParamList } from '../../../types/navigation';
import { findServiceableCity } from '../../../config/serviceableAreas';
import { assertServiceableBookingLocation } from '../../../utils/serviceableLocation';
import { resolveLocationSelection } from '../../../utils/locationSelection';
import { formatBookingStopAddress, resolveBookingStopField } from '../../../utils/readableAddress';
import {
  distanceKm as haversineKm,
  isSameSpot,
  locationFromPlaceId,
  searchPlaceSuggestions,
  type PlaceSuggestion,
} from '../../../utils/googlePlaces';
import { getAppDialog } from '../../../utils/alertBus';
import {
  TOWING_DEMO_DROP,
  TOWING_DEMO_PICKUP,
  isTowingWalkthroughEnabled,
} from '../../../utils/towingBookingWalkthrough';
import { formatRupee } from '../../../utils/towingPricing';
import { colors, shadows, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'TowingPickupDrop'>;

const PICKUP_GREEN = '#10B981';
const PLACEHOLDER = 'Select location';

function applyLocation(location: LocationResult) {
  return resolveLocationSelection(location);
}

export default function TowingPickupDropScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, updateBooking } = useTowingBooking();
  const selectedLocation = useLocationStore(state => state.selectedLocation);
  const userLocation = useUserLocationStore(state => state.location);
  const fetchCurrentLocation = useUserLocationStore(state => state.fetchCurrentLocation);
  const [pickup, setPickup] = useState(booking.pickup || PLACEHOLDER);
  const [pickupLabel, setPickupLabel] = useState(booking.pickupLabel ?? '');
  const [pickupLat, setPickupLat] = useState(booking.pickupLat);
  const [pickupLng, setPickupLng] = useState(booking.pickupLng);
  const [drop, setDrop] = useState(booking.drop || PLACEHOLDER);
  const [dropLabel, setDropLabel] = useState(booking.dropLabel ?? '');
  const [dropLat, setDropLat] = useState(booking.dropLat);
  const [dropLng, setDropLng] = useState(booking.dropLng);
  const [showPickupPicker, setShowPickupPicker] = useState(false);
  const [showDropPicker, setShowDropPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'search' | 'map'>('search');
  const [distanceKm, setDistanceKm] = useState<number | null>(booking.distanceKm ?? null);
  const [farePreview, setFarePreview] = useState<number | null>(null);
  const [isLoadingFare, setIsLoadingFare] = useState(false);
  const [activeStop, setActiveStop] = useState<'pickup' | 'drop' | null>(() => {
    if (booking.pickupLat != null && booking.dropLat != null) return null;
    if (booking.pickupLat != null) return 'drop';
    return 'drop';
  });
  const [query, setQuery] = useState('');
  const [placeHits, setPlaceHits] = useState<PlaceSuggestion[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const { data: savedLocations = [] } = useSavedLocationsQuery();

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setPlaceHits([]);
      setSearchingPlaces(false);
      return;
    }
    const bias =
      activeStop === 'drop' && pickupLat != null && pickupLng != null
        ? { latitude: pickupLat, longitude: pickupLng }
        : userLocation?.latitude != null && userLocation.longitude != null
          ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
          : null;
    let cancelled = false;
    setSearchingPlaces(true);
    const timer = setTimeout(() => {
      void searchPlaceSuggestions(text, bias).then(hits => {
        if (cancelled) return;
        setPlaceHits(hits);
        setSearchingPlaces(false);
      });
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeStop, pickupLat, pickupLng, query, userLocation]);

  // Ride-hailing pattern: pickup defaults to the user's current location.
  useEffect(() => {
    if (isTowingWalkthroughEnabled()) return;
    if (pickupLat != null && pickupLat !== undefined) return;
    let cancelled = false;

    async function autoFillPickup() {
      const stored = userLocation;
      const storedCity =
        stored?.latitude != null && stored?.longitude != null
          ? findServiceableCity(stored.latitude, stored.longitude)
          : null;
      if (stored?.latitude != null && stored?.longitude != null && storedCity && !storedCity.comingSoon) {
        const resolved = resolveLocationSelection(stored);
        if (!cancelled) {
          setPickup(resolved.address);
          setPickupLabel(resolved.displayLabel);
          setPickupLat(stored.latitude);
          setPickupLng(stored.longitude);
        }
        return;
      }
      const fetched = await fetchCurrentLocation();
      if (cancelled || !fetched?.latitude || !fetched?.longitude) return;
      const fetchedCity = findServiceableCity(fetched.latitude, fetched.longitude);
      if (!fetchedCity || fetchedCity.comingSoon) return;
      const resolved = resolveLocationSelection(fetched);
      if (!cancelled) {
        setPickup(resolved.address);
        setPickupLabel(resolved.displayLabel);
        setPickupLat(fetched.latitude);
        setPickupLng(fetched.longitude);
      }
    }

    void autoFillPickup();
    return () => {
      cancelled = true;
    };
  }, [fetchCurrentLocation, pickupLat, userLocation]);

  useEffect(() => {
    if (!isTowingWalkthroughEnabled()) return;
    if (pickupLat != null && dropLat != null) return;

    setPickup(TOWING_DEMO_PICKUP.address);
    setPickupLabel(TOWING_DEMO_PICKUP.label);
    setPickupLat(TOWING_DEMO_PICKUP.lat);
    setPickupLng(TOWING_DEMO_PICKUP.lng);
    setDrop(TOWING_DEMO_DROP.address);
    setDropLabel(TOWING_DEMO_DROP.label);
    setDropLat(TOWING_DEMO_DROP.lat);
    setDropLng(TOWING_DEMO_DROP.lng);
    updateBooking({
      pickup: TOWING_DEMO_PICKUP.address,
      pickupLabel: TOWING_DEMO_PICKUP.label,
      pickupLat: TOWING_DEMO_PICKUP.lat,
      pickupLng: TOWING_DEMO_PICKUP.lng,
      drop: TOWING_DEMO_DROP.address,
      dropLabel: TOWING_DEMO_DROP.label,
      dropLat: TOWING_DEMO_DROP.lat,
      dropLng: TOWING_DEMO_DROP.lng,
      distanceKm: 8,
    });
  }, [dropLat, pickupLat, updateBooking]);

  useEffect(() => {
    if (!selectedLocation) return;
    if (booking.pickupLat != null) return;
    if (pickupLat != null) return;

    const resolved = resolveLocationSelection({
      address: selectedLocation.address,
      city: selectedLocation.city,
      state: '',
      pincode: '',
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      placeId: '',
      displayLabel: selectedLocation.displayName,
    });
    setPickup(resolved.address);
    setPickupLabel(resolved.displayLabel);
    setPickupLat(selectedLocation.latitude);
    setPickupLng(selectedLocation.longitude);
    updateBooking({
      pickup: resolved.address,
      pickupLabel: resolved.displayLabel,
      pickupLat: selectedLocation.latitude,
      pickupLng: selectedLocation.longitude,
    });
  }, [booking.pickupLat, pickupLat, selectedLocation, updateBooking]);

  const canContinue =
    pickup.trim() &&
    pickup !== PLACEHOLDER &&
    drop.trim() &&
    drop !== PLACEHOLDER &&
    pickupLat != null &&
    pickupLng != null &&
    dropLat != null &&
    dropLng != null;

  useEffect(() => {
    if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
      setDistanceKm(null);
      setFarePreview(null);
      return;
    }

    let cancelled = false;

    async function loadFarePreview() {
      if (pickupLat == null || pickupLng == null || dropLat == null || dropLng == null) return;

      setIsLoadingFare(true);
      try {
        const { towingMode, scheduledAt } = towingFareModeParams(booking);
        const estimate = await estimateTowingFare({
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          dropoff_lat: dropLat,
          dropoff_lng: dropLng,
          scheduledAt,
          towingMode,
        });
        if (!cancelled) {
          setDistanceKm(estimate.fareBreakdown.distanceKm);
          setFarePreview(estimate.fareBreakdown.totalFare);
        }
      } catch {
        if (!cancelled) {
          setDistanceKm(null);
          setFarePreview(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingFare(false);
        }
      }
    }

    void loadFarePreview();
    return () => {
      cancelled = true;
    };
  }, [booking.dateId, booking.serviceMode, booking.timeId, dropLat, dropLng, pickupLat, pickupLng]);

  const pickupFilled = pickup.trim().length > 0 && pickup !== PLACEHOLDER;
  const dropFilled = drop.trim().length > 0 && drop !== PLACEHOLDER;
  const pickupStop = resolveBookingStopField({
    address: pickup,
    placeholder: PLACEHOLDER,
    label: pickupLabel,
    hasCoordinates: pickupLat != null && pickupLng != null,
  });
  const dropStop = resolveBookingStopField({
    address: drop,
    placeholder: PLACEHOLDER,
    label: dropLabel,
    hasCoordinates: dropLat != null && dropLng != null,
  });
  const origin =
    pickupLat != null && pickupLng != null
      ? { latitude: pickupLat, longitude: pickupLng }
      : userLocation?.latitude != null && userLocation.longitude != null
        ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
        : null;

  const applyStop = (target: 'pickup' | 'drop', location: LocationResult) => {
    const counterpart =
      target === 'pickup'
        ? dropLat != null && dropLng != null
          ? { latitude: dropLat, longitude: dropLng }
          : null
        : pickupLat != null && pickupLng != null
          ? { latitude: pickupLat, longitude: pickupLng }
          : null;
    if (isSameSpot(counterpart, location.latitude, location.longitude)) {
      getAppDialog().showDialog({
        tone: 'warning',
        title: 'Same spot',
        message: 'Pickup and drop need to be two different places.',
        primaryLabel: 'OK',
      });
      return;
    }
    if (!assertServiceableBookingLocation(location.latitude, location.longitude)) return;
    const resolved = applyLocation(location);
    const addressLine =
      resolved.address.trim() ||
      resolved.displayLabel.trim() ||
      location.displayLabel?.trim() ||
      'Pinned on map';
    if (target === 'pickup') {
      setPickup(addressLine);
      setPickupLabel(resolved.displayLabel || formatBookingStopAddress(addressLine));
      setPickupLat(location.latitude);
      setPickupLng(location.longitude);
      if (!dropFilled) setActiveStop('drop');
      else setActiveStop(null);
    } else {
      setDrop(addressLine);
      setDropLabel(resolved.displayLabel || formatBookingStopAddress(addressLine));
      setDropLat(location.latitude);
      setDropLng(location.longitude);
      if (!pickupFilled) setActiveStop('pickup');
      else setActiveStop(null);
    }
    setQuery('');
    setPlaceHits([]);
  };

  const clearActiveStop = (stopId?: string) => {
    setQuery('');
    setPlaceHits([]);
    const target = (stopId ?? activeStop ?? 'pickup') as 'pickup' | 'drop';
    if (target === 'pickup') {
      setPickup(PLACEHOLDER);
      setPickupLabel('');
      setPickupLat(undefined);
      setPickupLng(undefined);
      setActiveStop('pickup');
      return;
    }
    setDrop(PLACEHOLDER);
    setDropLabel('');
    setDropLat(undefined);
    setDropLng(undefined);
    setActiveStop('drop');
  };

  const suggestions: RideSuggestion[] = useMemo(() => {
    const searchTarget: 'pickup' | 'drop' =
      activeStop ?? (pickupStop.filled ? 'drop' : 'pickup');

    if (query.trim().length >= 2) {
      return placeHits.map(hit => ({
        id: hit.placeId,
        title: hit.title,
        subtitle: hit.subtitle,
        distanceLabel: hit.distanceLabel,
        kind: 'search' as const,
        onPress: () => {
          void locationFromPlaceId(hit.placeId, hit.title).then(location => {
            if (location) applyStop(searchTarget, location);
          });
        },
      }));
    }

    return savedLocations
      .filter(loc => loc.latitude != null && loc.longitude != null)
      .map(loc => {
        const km = haversineKm(origin, loc.latitude as number, loc.longitude as number);
        return {
          id: loc.id,
          title: loc.label,
          subtitle: loc.address,
          distanceLabel: km == null ? undefined : km === 0 ? 'Nearby' : `${km} km`,
          kind: 'saved' as const,
          savedType: loc.type,
          onPress: () =>
            applyStop(searchTarget, {
              address: loc.address,
              city: '',
              state: '',
              pincode: '',
              latitude: loc.latitude as number,
              longitude: loc.longitude as number,
              placeId: '',
              displayLabel: loc.label,
            }),
        };
      });
  }, [activeStop, origin, pickupStop.filled, placeHits, query, savedLocations]);

  return (
    <TowingBookingLayout
      title="Pickup & drop"
      step={2}
      buttonLabel="Review booking"
      onBack={() => goBackWithinStack(navigation)}
      continueDisabled={!canContinue}
      onContinue={() => {
        updateBooking({
          pickup,
          pickupLabel: pickupStop.value || formatBookingStopAddress(pickup) || pickupLabel,
          pickupLat,
          pickupLng,
          drop,
          dropLabel: dropStop.value || formatBookingStopAddress(drop) || dropLabel,
          dropLat,
          dropLng,
          distanceKm: distanceKm ?? undefined,
        });
        navigation.navigate('TowingReview');
      }}>
      <WizardStepFade>
      <RideLocationBoard
        px={t.px}
        activeId={activeStop}
        query={query}
        searching={searchingPlaces}
        suggestions={suggestions}
        suppressIdleHint={pickupStop.filled && dropStop.filled}
        onActivate={id => {
          setActiveStop(id as 'pickup' | 'drop');
          setQuery('');
        }}
        onQueryChange={setQuery}
        onClearActive={clearActiveStop}
        onSelectOnMap={() => {
          setPickerMode('map');
          const target = activeStop ?? (pickupFilled ? 'drop' : 'pickup');
          if (target === 'pickup') setShowPickupPicker(true);
          else setShowDropPicker(true);
        }}
        belowMap={
          pickupLat && pickupLng && dropLat && dropLng ? (
            <View
              style={[
                {
                  borderRadius: t.px(16),
                  borderWidth: 1,
                  borderColor: '#E7E5E4',
                  backgroundColor: colors.background,
                  paddingHorizontal: t.px(14),
                  paddingVertical: t.px(12),
                },
                shadows.card,
              ]}>
              {isLoadingFare ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.px(10) }}>
                  <ActivityIndicator color={colors.grey} size="small" />
                  <Text style={{ fontSize: t.px(13), color: colors.grey }}>
                    Calculating route & fare…
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                  {distanceKm != null ? (
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.px(6) }}>
                        <Route size={t.px(15)} color={colors.grey} strokeWidth={2.2} />
                        <Text
                          style={{
                            fontSize: t.px(11),
                            color: colors.grey,
                            fontWeight: typography.weights.medium,
                          }}>
                          Distance
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: t.px(18),
                          fontWeight: typography.weights.bold,
                          color: colors.dark,
                          marginTop: t.px(4),
                        }}>
                        {distanceKm} km
                      </Text>
                    </View>
                  ) : null}
                  {distanceKm != null && farePreview != null ? (
                    <View
                      style={{
                        width: 1,
                        backgroundColor: '#F3F4F6',
                        marginHorizontal: t.px(14),
                      }}
                    />
                  ) : null}
                  {farePreview != null ? (
                    <View
                      style={{
                        flex: 1,
                        minWidth: 0,
                        alignItems: distanceKm != null ? 'flex-end' : 'flex-start',
                      }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.px(6) }}>
                        <IndianRupee size={t.px(14)} color={colors.grey} strokeWidth={2.2} />
                        <Text
                          style={{
                            fontSize: t.px(11),
                            color: colors.grey,
                            fontWeight: typography.weights.medium,
                          }}>
                          Est. fare
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: t.px(18),
                          fontWeight: typography.weights.bold,
                          color: colors.dark,
                          marginTop: t.px(4),
                        }}>
                        {formatRupee(farePreview)}
                      </Text>
                      <Text
                        style={{
                          fontSize: t.px(10),
                          color: colors.grey,
                          marginTop: t.px(2),
                        }}>
                        Before taxes & fees
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          ) : null
        }
        stops={[
          {
            id: 'pickup',
            label: 'Pickup',
            value: pickupStop.value,
            placeholder: 'Pickup location',
            filled: pickupStop.filled,
            dot: 'pickup',
          },
          {
            id: 'drop',
            label: 'Drop',
            value: dropStop.value,
            placeholder: 'Drop location',
            filled: dropStop.filled,
            dot: 'drop',
          },
        ]}
      />

      </WizardStepFade>

      <LocationPickerModal
        visible={showPickupPicker}
        title="Confirm pickup spot"
        confirmLabel="Confirm pickup"
        accentColor={PICKUP_GREEN}
        initialMode={pickerMode}
        initialLocation={
          pickupLat && pickupLng
            ? { latitude: pickupLat, longitude: pickupLng, address: pickup }
            : undefined
        }
        onClose={() => setShowPickupPicker(false)}
        onLocationSelected={location => {
          applyStop('pickup', location);
        }}
      />

      <LocationPickerModal
        visible={showDropPicker}
        title="Confirm drop spot"
        confirmLabel="Confirm drop"
        accentColor={colors.error}
        initialMode={pickerMode}
        initialLocation={
          dropLat && dropLng ? { latitude: dropLat, longitude: dropLng, address: drop } : undefined
        }
        onClose={() => setShowDropPicker(false)}
        onLocationSelected={location => {
          applyStop('drop', location);
        }}
      />
    </TowingBookingLayout>
  );
}
