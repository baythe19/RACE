import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import LocationPickerModal from '../../../components/common/LocationPickerModal';
import RideLocationBoard, { type RideSuggestion } from '../../../components/booking/RideLocationBoard';
import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import TowingServiceModeBanner from '../../../components/booking/TowingServiceModeBanner';
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
import { formatReadableLocation } from '../../../utils/readableAddress';
import {
  distanceKm as haversineKm,
  locationFromPlaceId,
  searchPlaceSuggestions,
  type PlaceSuggestion,
} from '../../../utils/googlePlaces';
import {
  TOWING_DEMO_DROP,
  TOWING_DEMO_PICKUP,
  isTowingWalkthroughEnabled,
} from '../../../utils/towingBookingWalkthrough';
import { formatRupee } from '../../../utils/towingPricing';
import { colors, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'TowingPickupDrop'>;

const TOWING_ACCENT = '#F59E0B';
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
  const [activeStop, setActiveStop] = useState<'pickup' | 'drop'>('drop');
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
    let cancelled = false;
    setSearchingPlaces(true);
    const timer = setTimeout(() => {
      void searchPlaceSuggestions(text).then(hits => {
        if (cancelled) return;
        setPlaceHits(hits);
        setSearchingPlaces(false);
      });
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

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
  const origin =
    pickupLat != null && pickupLng != null
      ? { latitude: pickupLat, longitude: pickupLng }
      : userLocation?.latitude != null && userLocation.longitude != null
        ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
        : null;

  const applyStop = (target: 'pickup' | 'drop', location: LocationResult) => {
    if (!assertServiceableBookingLocation(location.latitude, location.longitude)) return;
    const resolved = applyLocation(location);
    if (target === 'pickup') {
      setPickup(resolved.address);
      setPickupLabel(resolved.displayLabel);
      setPickupLat(location.latitude);
      setPickupLng(location.longitude);
    } else {
      setDrop(resolved.address);
      setDropLabel(resolved.displayLabel);
      setDropLat(location.latitude);
      setDropLng(location.longitude);
    }
    setQuery('');
    setPlaceHits([]);
  };

  const suggestions: RideSuggestion[] = useMemo(() => {
    if (query.trim().length >= 2) {
      return placeHits.map(hit => ({
        id: hit.placeId,
        title: hit.title,
        subtitle: hit.subtitle,
        kind: 'search' as const,
        onPress: () => {
          void locationFromPlaceId(hit.placeId, hit.title).then(location => {
            if (location) applyStop(activeStop, location);
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
          distanceLabel: km != null ? `${km} km` : undefined,
          kind: 'saved' as const,
          savedType: loc.type,
          onPress: () =>
            applyStop(activeStop, {
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
  }, [activeStop, origin, placeHits, query, savedLocations]);

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
          pickupLabel: pickupLabel || formatReadableLocation(pickup),
          pickupLat,
          pickupLng,
          drop,
          dropLabel: dropLabel || formatReadableLocation(drop),
          dropLat,
          dropLng,
          distanceKm: distanceKm ?? undefined,
        });
        navigation.navigate('TowingReview');
      }}>
      <WizardStepFade>
      <TowingServiceModeBanner mode={booking.serviceMode} t={t} />
      <RideLocationBoard
        px={t.px}
        activeId={activeStop}
        query={query}
        searching={searchingPlaces}
        suggestions={suggestions}
        onActivate={id => {
          setActiveStop(id as 'pickup' | 'drop');
          setQuery('');
        }}
        onQueryChange={setQuery}
        onClearActive={() => setQuery('')}
        onSelectOnMap={() => {
          setPickerMode('map');
          if (activeStop === 'pickup') setShowPickupPicker(true);
          else setShowDropPicker(true);
        }}
        stops={[
          {
            id: 'pickup',
            label: 'Pickup',
            value: pickupFilled ? pickupLabel || formatReadableLocation(pickup) : '',
            placeholder: 'Pickup location',
            filled: pickupFilled,
            dot: 'pickup',
          },
          {
            id: 'drop',
            label: 'Drop',
            value: dropFilled ? dropLabel || formatReadableLocation(drop) : '',
            placeholder: 'Drop location',
            filled: dropFilled,
            dot: 'drop',
          },
        ]}
      />

      {pickupLat && pickupLng && dropLat && dropLng ? (
        <View
          style={{
            marginTop: t.px(14),
            borderRadius: t.cardRadius,
            borderWidth: 1,
            borderColor: TOWING_ACCENT,
            backgroundColor: '#FEF3C7',
            padding: t.px(14),
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          {isLoadingFare ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.px(8) }}>
              <ActivityIndicator color={TOWING_ACCENT} size="small" />
              <Text style={{ fontSize: t.body, color: colors.grey }}>
                Calculating route distance...
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {distanceKm != null ? (
                <Text style={{ fontSize: t.body, color: colors.dark }}>
                  Distance:{' '}
                  <Text style={{ fontWeight: typography.weights.bold }}>{distanceKm} km</Text>
                </Text>
              ) : null}
              {farePreview != null ? (
                <Text
                  style={{
                    fontSize: t.body,
                    color: colors.dark,
                    marginTop: distanceKm != null ? t.px(3) : 0,
                  }}>
                  Estimated fare:{' '}
                  <Text style={{ fontWeight: typography.weights.bold, color: TOWING_ACCENT }}>
                    {formatRupee(farePreview)}
                  </Text>
                </Text>
              ) : null}
            </View>
          )}
        </View>
      ) : null}
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
          if (!assertServiceableBookingLocation(location.latitude, location.longitude)) return;
          const resolved = resolveLocationSelection(location);
          setPickup(resolved.address);
          setPickupLabel(resolved.displayLabel);
          setPickupLat(location.latitude);
          setPickupLng(location.longitude);
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
          if (!assertServiceableBookingLocation(location.latitude, location.longitude)) return;
          const resolved = resolveLocationSelection(location);
          setDrop(resolved.address);
          setDropLabel(resolved.displayLabel);
          setDropLat(location.latitude);
          setDropLng(location.longitude);
        }}
      />
    </TowingBookingLayout>
  );
}
