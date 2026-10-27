import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { ChevronRight, MapPin } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import LocationPickerModal from '../../../components/common/LocationPickerModal';
import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import { useTowingBooking } from '../../../context/TowingBookingContext';
import { estimateTowingFare } from '../../../services/bookings/fareApi';
import { useSavedLocationsQuery } from '../../../services/profile/useProfileQueries';
import { useLocationStore } from '../../../store/locationStore';
import type { LocationResult } from '../../../types/location';
import type { HomeStackParamList } from '../../../types/navigation';
import { assertServiceableBookingLocation } from '../../../utils/serviceableLocation';
import { resolveLocationSelection } from '../../../utils/locationSelection';
import { formatReadableLocation } from '../../../utils/readableAddress';
import {
  TOWING_DEMO_DROP,
  TOWING_DEMO_PICKUP,
  TOWING_WALKTHROUGH_ENABLED,
} from '../../../utils/towingBookingWalkthrough';
import { formatRupee } from '../../../utils/towingPricing';
import { colors, shadows, typography } from '../../../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'TowingPickupDrop'>;

const TOWING_ACCENT = '#F59E0B';
const PLACEHOLDER = 'Select location';

function LocationCard({
  label,
  value,
  pinColor,
  isPickup,
  onPress,
  t,
}: {
  label: string;
  value: string;
  pinColor: string;
  isPickup: boolean;
  onPress: () => void;
  t: ReturnType<typeof useBookingTheme>['t'];
}) {
  const hasValue = value.trim().length > 0 && value !== PLACEHOLDER;

  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.px(8),
          marginBottom: t.px(8),
        }}>
        <MapPin size={t.iconSm} color={pinColor} fill={pinColor} />
        <Text
          style={{
            fontSize: t.labelBold,
            fontWeight: typography.weights.bold,
            color: colors.dark,
          }}>
          {label}
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: t.inputRadius,
          borderWidth: isPickup ? 1.5 : 1,
          borderColor: isPickup ? colors.primary : colors.border,
          backgroundColor: isPickup ? colors.goldLight : colors.background,
          paddingHorizontal: t.px(14),
          paddingVertical: t.px(14),
          gap: t.px(10),
        }}>
        <Text
          style={{
            flex: 1,
            fontSize: t.bodyLarge,
            fontWeight: hasValue ? typography.weights.semibold : typography.weights.regular,
            color: hasValue ? colors.dark : colors.grey,
            lineHeight: t.px(22),
          }}
          numberOfLines={2}>
          {hasValue ? value : PLACEHOLDER}
        </Text>
        <ChevronRight size={t.iconSm} color={colors.grey} />
      </View>
    </Pressable>
  );
}

function applyLocation(location: LocationResult) {
  return resolveLocationSelection(location);
}

export default function TowingPickupDropScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, updateBooking } = useTowingBooking();
  const selectedLocation = useLocationStore(state => state.selectedLocation);
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
  const [distanceKm, setDistanceKm] = useState<number | null>(booking.distanceKm ?? null);
  const [farePreview, setFarePreview] = useState<number | null>(null);
  const [isLoadingFare, setIsLoadingFare] = useState(false);
  const { data: savedLocations = [] } = useSavedLocationsQuery();

  useEffect(() => {
    if (!TOWING_WALKTHROUGH_ENABLED) return;
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
      onBack={() => navigation.goBack()}
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
      <View
        style={[
          {
            borderRadius: t.cardRadius,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
            paddingHorizontal: t.px(18),
            paddingTop: t.px(18),
            paddingBottom: t.px(16),
          },
          shadows.card,
        ]}>
        <LocationCard
          label="Pickup"
          value={
            pickup !== PLACEHOLDER
              ? pickupLabel || formatReadableLocation(pickup)
              : pickup
          }
          pinColor={colors.primary}
          isPickup
          onPress={() => setShowPickupPicker(true)}
          t={t}
        />

        <View
          style={{
            height: t.px(28),
            marginLeft: t.px(9),
            borderLeftWidth: 2,
            borderLeftColor: '#F5D78A',
            borderStyle: 'dashed',
          }}
        />

        <LocationCard
          label="Drop"
          value={
            drop !== PLACEHOLDER ? dropLabel || formatReadableLocation(drop) : drop
          }
          pinColor={colors.error}
          isPickup={false}
          onPress={() => setShowDropPicker(true)}
          t={t}
        />
      </View>

      {pickupLat && pickupLng && dropLat && dropLng ? (
        <View
          style={{
            marginTop: t.px(14),
            borderRadius: t.cardRadius,
            borderWidth: 1,
            borderColor: TOWING_ACCENT,
            backgroundColor: '#FEF3C7',
            padding: t.px(14),
            gap: t.px(6),
          }}>
          {isLoadingFare ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.px(8) }}>
              <ActivityIndicator color={TOWING_ACCENT} size="small" />
              <Text style={{ fontSize: t.caption, color: colors.grey }}>
                Calculating route distance...
              </Text>
            </View>
          ) : (
            <>
              {distanceKm != null ? (
                <Text style={{ fontSize: t.body, color: colors.dark }}>
                  Distance: <Text style={{ fontWeight: typography.weights.bold }}>{distanceKm} km</Text>
                </Text>
              ) : null}
              {farePreview != null ? (
                <Text style={{ fontSize: t.body, color: colors.dark }}>
                  Estimated fare:{' '}
                  <Text style={{ fontWeight: typography.weights.bold, color: TOWING_ACCENT }}>
                    {formatRupee(farePreview)}
                  </Text>
                </Text>
              ) : null}
            </>
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
                  setPickup(mapped.address);
                  setPickupLabel(mapped.displayLabel);
                  setPickupLat(lat);
                  setPickupLng(lng);
                }}
                style={{
                  paddingHorizontal: t.px(12),
                  paddingVertical: t.px(8),
                  borderRadius: t.px(20),
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.goldLight,
                }}>
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
        accentColor={TOWING_ACCENT}
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
