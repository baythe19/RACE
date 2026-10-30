import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import LocationPickerModal from '../../../components/common/LocationPickerModal';
import RideLocationBoard, { type RideSuggestion } from '../../../components/booking/RideLocationBoard';
import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import WizardStepFade from '../../../components/booking/WizardStepFade';
import {
  DRIVER_ACCENT,
} from '../../../constants/driverBooking';
import { useDriverBooking } from '../../../context/DriverBookingContext';
import { getDriverServiceFlow } from '../../../utils/driverServiceFlow';
import { useBookingsQuery } from '../../../services/bookings/useBookingQueries';
import { useSavedLocationsQuery } from '../../../services/profile/useProfileQueries';
import { useLocationStore } from '../../../store/locationStore';
import type { HomeStackParamList } from '../../../types/navigation';
import { getRecentDriverPickups } from '../../../utils/recentDriverPickups';
import {
  distanceKm as haversineKm,
  isSameSpot,
  locationFromPlaceId,
  searchPlaceSuggestions,
  type PlaceSuggestion,
} from '../../../utils/googlePlaces';
import { getAppDialog } from '../../../utils/alertBus';
import { resolveLocationSelection } from '../../../utils/locationSelection';
import { formatLocationDisplay } from '../../../utils/readableAddress';
import { assertServiceableBookingLocation } from '../../../utils/serviceableLocation';
import { colors, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'DriverPickup'>;

const PLACEHOLDER = 'Search or pick on map';
const DROP_PLACEHOLDER = 'Destination on map';

type PickerTarget = 'pickup' | 'dropoff' | null;

export default function DriverPickupScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, updateBooking } = useDriverBooking();
  const flow = getDriverServiceFlow(booking.driverType);
  const selectedLocation = useLocationStore(state => state.selectedLocation);
  const [pickup, setPickup] = useState(booking.pickup || PLACEHOLDER);
  const [pickupLabel, setPickupLabel] = useState(booking.pickupLabel ?? '');
  const [pickupLat, setPickupLat] = useState(booking.pickupLat);
  const [pickupLng, setPickupLng] = useState(booking.pickupLng);
  const [dropoff, setDropoff] = useState(booking.dropoff || DROP_PLACEHOLDER);
  const [dropoffLabel, setDropoffLabel] = useState(booking.dropoffLabel ?? '');
  const [dropoffLat, setDropoffLat] = useState(booking.dropoffLat);
  const [dropoffLng, setDropoffLng] = useState(booking.dropoffLng);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [activeStop, setActiveStop] = useState<'pickup' | 'dropoff'>('pickup');
  const [query, setQuery] = useState('');
  const [placeHits, setPlaceHits] = useState<PlaceSuggestion[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const showPicker = pickerTarget !== null;
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
    const bias =
      activeStop === 'dropoff' && pickupLat != null && pickupLng != null
        ? { latitude: pickupLat, longitude: pickupLng }
        : selectedLocation
          ? { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude }
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
  }, [activeStop, pickupLat, pickupLng, query, selectedLocation]);

  const applyPickup = (address: string, latitude: number, longitude: number, label?: string) => {
    if (
      flow.requiresDropoff &&
      isSameSpot(
        dropoffLat != null && dropoffLng != null ? { latitude: dropoffLat, longitude: dropoffLng } : null,
        latitude,
        longitude,
      )
    ) {
      getAppDialog().showDialog({
        tone: 'warning',
        title: 'Same spot',
        message: 'Pickup and drop need to be two different places.',
        primaryLabel: 'OK',
      });
      return false;
    }
    if (!assertServiceableBookingLocation(latitude, longitude)) return false;
    const displayLabel = label || formatLocationDisplay(address);
    setPickup(address);
    setPickupLabel(displayLabel);
    setPickupLat(latitude);
    setPickupLng(longitude);
    updateBooking({
      pickup: address,
      pickupLabel: displayLabel,
      pickupLat: latitude,
      pickupLng: longitude,
    });
    if (flow.requiresDropoff && dropoffLat == null) setActiveStop('dropoff');
    return true;
  };

  const applyDropoff = (address: string, latitude: number, longitude: number, label?: string) => {
    if (
      isSameSpot(
        pickupLat != null && pickupLng != null ? { latitude: pickupLat, longitude: pickupLng } : null,
        latitude,
        longitude,
      )
    ) {
      getAppDialog().showDialog({
        tone: 'warning',
        title: 'Same spot',
        message: 'Pickup and drop need to be two different places.',
        primaryLabel: 'OK',
      });
      return false;
    }
    if (!assertServiceableBookingLocation(latitude, longitude)) return false;
    const displayLabel = label || formatLocationDisplay(address);
    setDropoff(address);
    setDropoffLabel(displayLabel);
    setDropoffLat(latitude);
    setDropoffLng(longitude);
    updateBooking({
      dropoff: address,
      dropoffLabel: displayLabel,
      dropoffLat: latitude,
      dropoffLng: longitude,
    });
    if (pickupLat == null) setActiveStop('pickup');
    return true;
  };

  const hasPickup =
    pickup.trim().length > 0 &&
    pickup !== PLACEHOLDER &&
    pickupLat != null &&
    pickupLng != null;

  const hasDropoff =
    dropoff.trim().length > 0 &&
    dropoff !== DROP_PLACEHOLDER &&
    dropoffLat != null &&
    dropoffLng != null;

  const canContinue = hasPickup && (!flow.requiresDropoff || hasDropoff);

  const origin =
    pickupLat != null && pickupLng != null
      ? { latitude: pickupLat, longitude: pickupLng }
      : null;

  const suggestions: RideSuggestion[] = useMemo(() => {
    const target = activeStop;
    const choose = (address: string, latitude: number, longitude: number, label?: string) => {
      const ok =
        target === 'dropoff'
          ? applyDropoff(address, latitude, longitude, label)
          : applyPickup(address, latitude, longitude, label);
      if (ok) {
        setQuery('');
        setPlaceHits([]);
      }
    };

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
            choose(location.address, location.latitude, location.longitude, location.displayLabel);
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
        distanceLabel:
          haversineKm(origin, loc.latitude as number, loc.longitude as number) != null
            ? `${haversineKm(origin, loc.latitude as number, loc.longitude as number)} km`
            : undefined,
        kind: 'saved' as const,
        savedType: loc.type,
        onPress: () => choose(loc.address, loc.latitude as number, loc.longitude as number, loc.label),
      }));

    const recent: RideSuggestion[] = recentPickups.map(loc => ({
      id: loc.id,
      title: loc.title,
      subtitle: loc.address,
      distanceLabel:
        haversineKm(origin, loc.latitude, loc.longitude) != null
          ? `${haversineKm(origin, loc.latitude, loc.longitude)} km`
          : undefined,
      kind: 'recent' as const,
      onPress: () => choose(loc.address, loc.latitude, loc.longitude, loc.title),
    }));

    return [...saved, ...recent];
  }, [activeStop, origin, placeHits, query, recentPickups, savedLocations]);

  return (
    <TowingBookingLayout
      title={flow.pickupTitle}
      step={2}
      stepLabels={flow.wizardStepLabels}
      accentColor={DRIVER_ACCENT}
      scrollable={recentPickups.length > 2}
      onBack={() => goBackWithinStack(navigation)}
      continueDisabled={!canContinue}
      buttonLabel="Continue"
      onContinue={() => {
        updateBooking({
          pickup,
          pickupLabel: pickupLabel || formatLocationDisplay(pickup),
          pickupLat,
          pickupLng,
          ...(flow.requiresDropoff
            ? {
                dropoff,
                dropoffLabel: dropoffLabel || formatLocationDisplay(dropoff),
                dropoffLat,
                dropoffLng,
              }
            : {}),
        });
        navigation.navigate('DriverChooseVehicleType');
      }}>
      <WizardStepFade>
      <RideLocationBoard
        px={t.px}
        activeId={activeStop}
        query={query}
        searching={searchingPlaces}
        suggestions={suggestions}
        onActivate={id => {
          const next = id === 'dropoff' ? 'dropoff' : 'pickup';
          setActiveStop(next);
          setQuery('');
        }}
        onQueryChange={setQuery}
        onClearActive={() => {
          setQuery('');
          setPlaceHits([]);
          if (activeStop === 'dropoff') {
            setDropoff(DROP_PLACEHOLDER);
            setDropoffLabel('');
            setDropoffLat(undefined);
            setDropoffLng(undefined);
            return;
          }
          setPickup(PLACEHOLDER);
          setPickupLabel('');
          setPickupLat(undefined);
          setPickupLng(undefined);
        }}
        onSelectOnMap={() => setPickerTarget(activeStop)}
        stops={[
          {
            id: 'pickup',
            label: 'Pickup',
            value: hasPickup ? pickupLabel || formatLocationDisplay(pickup) : '',
            placeholder: flow.pickupFieldLabel,
            filled: hasPickup,
            dot: 'pickup',
          },
          ...(flow.requiresDropoff
            ? [{
                id: 'dropoff',
                label: 'Drop',
                value: hasDropoff ? dropoffLabel || formatLocationDisplay(dropoff) : '',
                placeholder: flow.dropFieldLabel,
                filled: hasDropoff,
                dot: 'drop' as const,
              }]
            : []),
        ]}
      />
      </WizardStepFade>

      <LocationPickerModal
        visible={showPicker}
        title={pickerTarget === 'dropoff' ? 'Confirm destination' : 'Confirm pickup spot'}
        confirmLabel={pickerTarget === 'dropoff' ? 'Confirm destination' : 'Confirm pickup'}
        accentColor={DRIVER_ACCENT}
        initialMode="map"
        initialLocation={
          pickerTarget === 'dropoff'
            ? dropoffLat && dropoffLng
              ? { latitude: dropoffLat, longitude: dropoffLng, address: dropoff }
              : undefined
            : pickupLat && pickupLng
              ? { latitude: pickupLat, longitude: pickupLng, address: pickup }
              : undefined
        }
        onClose={() => setPickerTarget(null)}
        onLocationSelected={location => {
          const resolved = resolveLocationSelection(location);
          if (pickerTarget === 'dropoff') {
            applyDropoff(
              resolved.address,
              location.latitude,
              location.longitude,
              resolved.displayLabel,
            );
          } else {
            applyPickup(
              resolved.address,
              location.latitude,
              location.longitude,
              resolved.displayLabel,
            );
          }
          setPickerTarget(null);
        }}
      />
    </TowingBookingLayout>
  );
}
