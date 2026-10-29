import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Crosshair, Map as MapIcon, MapPin } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import LocationPickerModal from '../../../components/common/LocationPickerModal';
import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import { useTowingBooking } from '../../../context/TowingBookingContext';
import { estimateTowingFare } from '../../../services/bookings/fareApi';
import { useSavedLocationsQuery } from '../../../services/profile/useProfileQueries';
import { useLocationStore } from '../../../store/locationStore';
import { useUserLocationStore } from '../../../store/userLocationStore';
import type { LocationResult } from '../../../types/location';
import type { HomeStackParamList } from '../../../types/navigation';
import { findServiceableCity } from '../../../config/serviceableAreas';
import { assertServiceableBookingLocation } from '../../../utils/serviceableLocation';
import { ensureForegroundLocation } from '../../../utils/locationPermission';
import { resolveLocationSelection } from '../../../utils/locationSelection';
import { formatReadableLocation } from '../../../utils/readableAddress';
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

/**
 * Ride-hailing style search card (Uber/Rapido/Ola pattern):
 * one card, left rail with colored dots connected by a dotted line,
 * pickup pre-filled with the user's current location, drop prompts a search.
 */
function LocationSearchCard({
  pickupValue,
  dropValue,
  onPickupPress,
  onDropPress,
  t,
}: {
  pickupValue: string;
  dropValue: string;
  onPickupPress: () => void;
  onDropPress: () => void;
  t: ReturnType<typeof useBookingTheme>['t'];
}) {
  const pickupHasValue = pickupValue.trim().length > 0 && pickupValue !== PLACEHOLDER;
  const dropHasValue = dropValue.trim().length > 0 && dropValue !== PLACEHOLDER;

  const rowStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    minHeight: t.px(56),
    paddingVertical: t.px(10),
  };

  return (
    <View
      style={[
        {
          borderRadius: t.cardRadius,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          paddingHorizontal: t.px(14),
          paddingVertical: t.px(4),
        },
      ]}>
      {/* Pickup row — Rapido/Uber style */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          pickupHasValue ? `Pickup ${pickupValue}` : 'Enter pickup location'
        }
        onPress={onPickupPress}
        style={({ pressed }) => [rowStyle, { opacity: pressed ? 0.8 : 1 }]}>
        <View
          style={{
            width: t.px(34),
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View
            style={{
              width: t.px(12),
              height: t.px(12),
              borderRadius: t.px(6),
              backgroundColor: PICKUP_GREEN,
              borderWidth: 2,
              borderColor: '#D1FAE5',
            }}
          />
        </View>
        <View style={{ flexGrow: 1, flexShrink: 1, marginLeft: t.px(12), minWidth: 0 }}>
          <Text
            style={{
              fontSize: t.caption,
              fontWeight: typography.weights.semibold,
              color: colors.grey,
              marginBottom: t.px(2),
            }}>
            Pickup
          </Text>
          <Text
            style={{
              fontSize: t.body,
              fontWeight: typography.weights.semibold,
              color: pickupHasValue ? colors.dark : colors.grey,
              lineHeight: t.px(20),
            }}
            numberOfLines={1}>
            {pickupHasValue ? pickupValue : 'Enter pickup location'}
          </Text>
        </View>
        {!pickupHasValue ? (
          <ActivityIndicator size="small" color={PICKUP_GREEN} style={{ marginLeft: t.px(6) }} />
        ) : null}
      </Pressable>

      {/* Dotted connector between the two dots */}
      <View
        style={{
          width: t.px(34),
          alignItems: 'center',
          justifyContent: 'center',
          height: t.px(10),
          marginVertical: -t.px(2),
        }}>
        <View
          style={{
            width: 0,
            height: t.px(14),
            borderLeftWidth: 2,
            borderLeftColor: colors.border,
            borderStyle: 'dashed',
          }}
        />
      </View>

      {/* Drop row */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={dropHasValue ? `Drop ${dropValue}` : 'Search drop location'}
        onPress={onDropPress}
        style={({ pressed }) => [rowStyle, { opacity: pressed ? 0.8 : 1 }]}>
        <View
          style={{
            width: t.px(34),
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <MapPin size={t.px(17)} color={colors.error} fill={colors.error} strokeWidth={2} />
        </View>
        <View style={{ flexGrow: 1, flexShrink: 1, marginLeft: t.px(12), minWidth: 0 }}>
          <Text
            style={{
              fontSize: t.caption,
              fontWeight: typography.weights.semibold,
              color: colors.grey,
              marginBottom: t.px(2),
            }}>
            Drop
          </Text>
          <Text
            style={{
              fontSize: t.body,
              fontWeight: dropHasValue ? typography.weights.semibold : typography.weights.regular,
              color: dropHasValue ? colors.dark : colors.grey,
              lineHeight: t.px(20),
            }}
            numberOfLines={1}>
            {dropHasValue ? dropValue : 'Search drop location'}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

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
  const [isLocatingPickup, setIsLocatingPickup] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(booking.distanceKm ?? null);
  const [farePreview, setFarePreview] = useState<number | null>(null);
  const [isLoadingFare, setIsLoadingFare] = useState(false);
  const { data: savedLocations = [] } = useSavedLocationsQuery();

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
        const estimate = await estimateTowingFare({
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          dropoff_lat: dropLat,
          dropoff_lng: dropLng,
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
  }, [dropLat, dropLng, pickupLat, pickupLng]);

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
      <LocationSearchCard
        pickupValue={pickup !== PLACEHOLDER ? pickupLabel || formatReadableLocation(pickup) : pickup}
        dropValue={drop !== PLACEHOLDER ? dropLabel || formatReadableLocation(drop) : drop}
        onPickupPress={() => {
          setPickerMode('search');
          setShowPickupPicker(true);
        }}
        onDropPress={() => {
          setPickerMode('search');
          setShowDropPicker(true);
        }}
        t={t}
      />

      {/* Rapido-style quick actions — always visible so the user knows what to do */}
      <View
        style={{
          marginTop: t.px(12),
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: t.px(8),
        }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Use current location for pickup"
          disabled={isLocatingPickup}
          onPress={() => {
            void (async () => {
              setIsLocatingPickup(true);
              try {
                const allowed = await ensureForegroundLocation();
                if (!allowed) return;
                const fetched = await fetchCurrentLocation();
                if (!fetched?.latitude || !fetched?.longitude) return;
                if (!assertServiceableBookingLocation(fetched.latitude, fetched.longitude)) return;
                const resolved = resolveLocationSelection(fetched);
                setPickup(resolved.address);
                setPickupLabel(resolved.displayLabel);
                setPickupLat(fetched.latitude);
                setPickupLng(fetched.longitude);
              } finally {
                setIsLocatingPickup(false);
              }
            })();
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.px(6),
            paddingHorizontal: t.px(12),
            paddingVertical: t.px(9),
            borderRadius: t.px(20),
            borderWidth: 1,
            borderColor: PICKUP_GREEN,
            backgroundColor: pressed ? '#ECFDF5' : colors.background,
            opacity: isLocatingPickup ? 0.6 : 1,
          })}>
          {isLocatingPickup ? (
            <ActivityIndicator size="small" color={PICKUP_GREEN} />
          ) : (
            <Crosshair size={t.px(14)} color={PICKUP_GREEN} strokeWidth={2.2} />
          )}
          <Text
            style={{
              fontSize: t.caption,
              fontWeight: typography.weights.semibold,
              color: colors.dark,
            }}>
            Use current location
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose drop location on map"
          onPress={() => {
            setPickerMode('map');
            setShowDropPicker(true);
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.px(6),
            paddingHorizontal: t.px(12),
            paddingVertical: t.px(9),
            borderRadius: t.px(20),
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: pressed ? colors.lightGrey : colors.background,
          })}>
          <MapIcon size={t.px(14)} color={TOWING_ACCENT} strokeWidth={2.2} />
          <Text
            style={{
              fontSize: t.caption,
              fontWeight: typography.weights.semibold,
              color: colors.dark,
            }}>
            Choose on map
          </Text>
        </Pressable>
      </View>

      {/* Distance / fare preview */}
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

      {savedLocations.length > 0 ? (
        <View style={{ marginTop: t.px(14), gap: t.px(8) }}>
          <Text
            style={{
              fontSize: t.labelBold,
              fontWeight: typography.weights.bold,
              color: colors.dark,
            }}>
            Saved addresses
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.px(8) }}>
            {savedLocations.map(loc => (
              <Pressable
                key={loc.id}
                onPress={() => {
                  const lat = loc.latitude ?? 0;
                  const lng = loc.longitude ?? 0;
                  if (!assertServiceableBookingLocation(lat, lng)) return;

                  const mapped = applyLocation({
                    address: loc.address,
                    city: '',
                    state: '',
                    pincode: '',
                    latitude: lat,
                    longitude: lng,
                    placeId: '',
                    displayLabel: loc.label,
                  });
                  setDrop(mapped.address);
                  setDropLabel(mapped.displayLabel);
                  setDropLat(lat);
                  setDropLng(lng);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.px(6),
                  paddingHorizontal: t.px(12),
                  paddingVertical: t.px(8),
                  borderRadius: t.px(20),
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.goldLight,
                }}>
                <MapPin size={t.px(13)} color={colors.primary} strokeWidth={2.2} />
                <Text style={{ fontSize: t.caption, fontWeight: typography.weights.semibold, color: colors.dark }}>
                  {loc.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

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
