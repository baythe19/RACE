import React, { useEffect, useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import LocationPickerModal from '../../../components/common/LocationPickerModal';
import RideLocationBoard, { type RideSuggestion } from '../../../components/booking/RideLocationBoard';
import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import { DRIVER_ACCENT, DRIVER_LIGHT_BG } from '../../../constants/driverBooking';
import { useDriverBooking } from '../../../context/DriverBookingContext';
import { useBookingsQuery } from '../../../services/bookings/useBookingQueries';
import { useSavedLocationsQuery } from '../../../services/profile/useProfileQueries';
import { useLocationStore } from '../../../store/locationStore';
import type { HomeStackParamList } from '../../../types/navigation';
import { getRecentDriverPickups } from '../../../utils/recentDriverPickups';
import { locationFromPlaceId, searchPlaceSuggestions, type PlaceSuggestion } from '../../../utils/googlePlaces';
import { resolveLocationSelection } from '../../../utils/locationSelection';
import {
  formatBookingStopAddress,
  formatLocationDisplay,
  resolveBookingStopField,
} from '../../../utils/readableAddress';
import { assertServiceableBookingLocation } from '../../../utils/serviceableLocation';
import { colors, shadows, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'DriverBookingLocation'>;

const PLACEHOLDER = 'Select pickup location';

export default function DriverBookingLocationScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, updateBooking } = useDriverBooking();
  const selectedLocation = useLocationStore(state => state.selectedLocation);
  const [pickup, setPickup] = useState(booking.pickup || PLACEHOLDER);
  const [pickupLabel, setPickupLabel] = useState(booking.pickupLabel ?? '');
  const [pickupLat, setPickupLat] = useState(booking.pickupLat);
  const [pickupLng, setPickupLng] = useState(booking.pickupLng);
  const [showPicker, setShowPicker] = useState(false);
  const [activeStop, setActiveStop] = useState<'pickup' | null>(
    booking.pickupLat != null ? null : 'pickup',
  );
  const [query, setQuery] = useState('');
  const [placeHits, setPlaceHits] = useState<PlaceSuggestion[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const { data: savedLocations = [] } = useSavedLocationsQuery();
  const { data: bookings = [] } = useBookingsQuery();

  const recentPickups = useMemo(
    () =>
      getRecentDriverPickups(bookings).filter(
        loc =>
          loc.address !== pickup &&
          !(
            pickupLat != null &&
            pickupLng != null &&
            Math.abs(loc.latitude - pickupLat) < 0.0001 &&
            Math.abs(loc.longitude - pickupLng) < 0.0001
          ),
      ),
    [bookings, pickup, pickupLat, pickupLng],
  );

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
      void searchPlaceSuggestions(
        text,
        selectedLocation
          ? { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude }
          : null,
      ).then(hits => {
        if (cancelled) return;
        setPlaceHits(hits);
        setSearchingPlaces(false);
      });
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, selectedLocation]);

  const applyPickup = (address: string, latitude: number, longitude: number, label?: string) => {
    if (!assertServiceableBookingLocation(latitude, longitude)) return;
    const displayLabel = label || formatLocationDisplay(address);
    setPickup(address);
    setPickupLabel(displayLabel);
    setPickupLat(latitude);
    setPickupLng(longitude);
    setQuery('');
    setPlaceHits([]);
    setActiveStop(null);
  };

  const hasPickup =
    pickup.trim().length > 0 &&
    pickup !== PLACEHOLDER &&
    pickupLat != null &&
    pickupLng != null;

  const pickupStop = resolveBookingStopField({
    address: pickup,
    placeholder: PLACEHOLDER,
    label: pickupLabel,
    hasCoordinates: pickupLat != null && pickupLng != null,
  });

  const suggestions: RideSuggestion[] = useMemo(() => {
    if (query.trim().length >= 2) {
      return placeHits.map(hit => ({
        id: hit.placeId,
        title: hit.title,
        subtitle: hit.subtitle,
        distanceLabel: hit.distanceLabel,
        kind: 'search' as const,
        onPress: () => {
          void locationFromPlaceId(hit.placeId, hit.title).then(location => {
            if (!location) return;
            applyPickup(location.address, location.latitude, location.longitude, location.displayLabel);
            setQuery('');
          });
        },
      }));
    }
    const saved: RideSuggestion[] = savedLocations
      .filter(loc => loc.latitude != null && loc.longitude != null)
      .map(loc => ({
        id: `saved-${loc.id}`,
        title: loc.label,
        subtitle: loc.address,
        kind: 'saved' as const,
        savedType: loc.type,
        onPress: () => {
          applyPickup(loc.address, loc.latitude as number, loc.longitude as number, loc.label);
          setQuery('');
        },
      }));
    const recent: RideSuggestion[] = recentPickups.map(loc => ({
      id: loc.id,
      title: loc.title,
      subtitle: loc.address,
      kind: 'recent' as const,
      onPress: () => {
        applyPickup(loc.address, loc.latitude, loc.longitude, loc.title);
        setQuery('');
      },
    }));
    return [...saved, ...recent];
  }, [placeHits, query, recentPickups, savedLocations]);

  return (
    <TowingBookingLayout
      title="Pickup Location"
      step={2}
      accentColor={DRIVER_ACCENT}
      onBack={() => goBackWithinStack(navigation)}
      continueDisabled={!hasPickup}
      onContinue={() => {
        updateBooking({
          pickup,
          pickupLabel: pickupLabel || formatLocationDisplay(pickup),
          pickupLat,
          pickupLng,
        });
        navigation.navigate('DriverBookingDateTime');
      }}>
      <RideLocationBoard
        px={t.px}
        activeId={activeStop}
        query={query}
        searching={searchingPlaces}
        suggestions={suggestions}
        suppressIdleHint={pickupStop.filled}
        onActivate={() => {
          setActiveStop('pickup');
          setQuery('');
        }}
        onQueryChange={setQuery}
          onClearActive={() => {
            setQuery('');
            setPlaceHits([]);
            setPickup(PLACEHOLDER);
            setPickupLabel('');
            setPickupLat(undefined);
            setPickupLng(undefined);
            setActiveStop('pickup');
          }}
        onSelectOnMap={() => setShowPicker(true)}
        stops={[
          {
            id: 'pickup',
            label: 'Pickup',
            value: pickupStop.value,
            placeholder: 'Pickup location',
            filled: pickupStop.filled,
            dot: 'pickup',
          },
        ]}
      />

      <LocationPickerModal
        visible={showPicker}
        title="Confirm pickup spot"
        confirmLabel="Confirm pickup"
        accentColor={DRIVER_ACCENT}
        initialMode="map"
        initialLocation={
          pickupLat && pickupLng
            ? { latitude: pickupLat, longitude: pickupLng, address: pickup }
            : undefined
        }
        onClose={() => setShowPicker(false)}
        onLocationSelected={location => {
          const resolved = resolveLocationSelection(location);
          applyPickup(resolved.address, location.latitude, location.longitude, resolved.displayLabel);
          setShowPicker(false);
        }}
      />
    </TowingBookingLayout>
  );
}
