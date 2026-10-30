import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import LocationPickerModal from '../../../components/common/LocationPickerModal';
import RideLocationBoard, { type RideSuggestion } from '../../../components/booking/RideLocationBoard';
import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import WizardStepFade from '../../../components/booking/WizardStepFade';
import {
  getRoadsideServiceLabel,
  ROADSIDE_ACCENT,
  ROADSIDE_BOOKING_STEP_LABELS,
} from '../../../constants/roadsideBooking';
import { useRoadsideBooking } from '../../../context/RoadsideBookingContext';
import { useSavedLocationsQuery } from '../../../services/profile/useProfileQueries';
import { useAppDialog } from '../../../hooks/useAppDialog';
import { useLocationStore } from '../../../store/locationStore';
import { useUserLocationStore } from '../../../store/userLocationStore';
import type { LocationResult } from '../../../types/location';
import { findServiceableCity } from '../../../config/serviceableAreas';
import { assertServiceableBookingLocation } from '../../../utils/serviceableLocation';
import { resolveLocationSelection } from '../../../utils/locationSelection';
import { locationFromPlaceId, searchPlaceSuggestions, type PlaceSuggestion } from '../../../utils/googlePlaces';
import { formatLocationCard, formatLocationDisplay } from '../../../utils/readableAddress';
import type { HomeStackParamList } from '../../../types/navigation';
import type { RoadsideServiceId } from '../../../types/roadsideBooking';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'RoadsideLocation'>;

const PLACEHOLDER = 'Search where you need help';

export default function RoadsideLocationScreen({ navigation, route }: Props) {
  const { t } = useBookingTheme();
  const { dialog, showDialog } = useAppDialog();
  const { booking, updateBooking } = useRoadsideBooking();
  const selectedLocation = useLocationStore(state => state.selectedLocation);
  const userLocation = useUserLocationStore(state => state.location);

  const paramServiceId = route.params?.serviceId;
  const [location, setLocation] = useState(booking.location || PLACEHOLDER);
  const [locationLabel, setLocationLabel] = useState(booking.locationLabel ?? '');
  const [locationLat, setLocationLat] = useState(booking.locationLat);
  const [locationLng, setLocationLng] = useState(booking.locationLng);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'search' | 'map'>('map');
  const [query, setQuery] = useState('');
  const [placeHits, setPlaceHits] = useState<PlaceSuggestion[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [activeStop, setActiveStop] = useState<'help' | null>(
    booking.locationLat != null ? null : 'help',
  );
  const { data: savedLocations = [] } = useSavedLocationsQuery();

  useEffect(() => {
    if (paramServiceId) {
      updateBooking({ serviceId: paramServiceId });
    }
  }, [paramServiceId, updateBooking]);

  const serviceId = (paramServiceId ?? booking.serviceId) as RoadsideServiceId;
  const serviceLabel = getRoadsideServiceLabel(serviceId);

  const hasLocation =
    location.trim().length > 0 &&
    location !== PLACEHOLDER &&
    locationLat != null &&
    locationLng != null;

  const locationStopValue = useMemo(() => {
    if (!hasLocation) return '';
    const card = formatLocationCard({ address: location, label: locationLabel });
    return card.secondary ? `${card.primary}\n${card.secondary}` : card.primary;
  }, [hasLocation, location, locationLabel]);

  const applyLocation = (result: LocationResult) => {
    const resolved = resolveLocationSelection(result);
    setLocation(resolved.address);
    setLocationLabel(resolved.displayLabel);
    setLocationLat(result.latitude);
    setLocationLng(result.longitude);
    setQuery('');
    setPlaceHits([]);
    setActiveStop(null);
  };

  useEffect(() => {
    if (locationLat != null) return;
    let cancelled = false;

    async function autoFill() {
      const stored = userLocation;
      const storedCity =
        stored?.latitude != null && stored?.longitude != null
          ? findServiceableCity(stored.latitude, stored.longitude)
          : null;
      if (stored?.latitude != null && stored?.longitude != null && storedCity && !storedCity.comingSoon) {
        const resolved = resolveLocationSelection(stored);
        if (!cancelled) {
          setLocation(resolved.address);
          setLocationLabel(resolved.displayLabel);
          setLocationLat(stored.latitude);
          setLocationLng(stored.longitude);
          setActiveStop(null);
        }
        return;
      }
      if (!selectedLocation) return;
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
      if (!cancelled) {
        setLocation(resolved.address);
        setLocationLabel(resolved.displayLabel);
        setLocationLat(selectedLocation.latitude);
        setLocationLng(selectedLocation.longitude);
        setActiveStop(null);
      }
    }

    void autoFill();
    return () => {
      cancelled = true;
    };
  }, [locationLat, selectedLocation, userLocation]);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setPlaceHits([]);
      setSearchingPlaces(false);
      return;
    }
    const bias =
      userLocation?.latitude != null && userLocation.longitude != null
        ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
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
  }, [query, selectedLocation, userLocation]);

  const suggestions: RideSuggestion[] = useMemo(() => {
    if (query.trim().length >= 2) {
      return placeHits.map(hit => ({
        id: hit.placeId,
        title: hit.title,
        subtitle: hit.subtitle,
        distanceLabel: hit.distanceLabel,
        kind: 'search' as const,
        onPress: () => {
          void locationFromPlaceId(hit.placeId, hit.title).then(locationResult => {
            if (locationResult) applyLocation(locationResult);
            setQuery('');
          });
        },
      }));
    }
    return savedLocations
      .filter(loc => loc.latitude != null && loc.longitude != null)
      .map(loc => ({
        id: loc.id,
        title: loc.label,
        subtitle: loc.address,
        kind: 'saved' as const,
        savedType: loc.type,
        onPress: () => {
          applyLocation({
            address: loc.address,
            city: '',
            state: '',
            pincode: '',
            latitude: loc.latitude as number,
            longitude: loc.longitude as number,
            placeId: '',
            displayLabel: loc.label,
          });
          setQuery('');
        },
      }));
  }, [placeHits, query, savedLocations]);

  return (
    <TowingBookingLayout
      title="Where you need help"
      step={1}
      stepLabels={ROADSIDE_BOOKING_STEP_LABELS}
      accentColor={ROADSIDE_ACCENT}
      headerTag={serviceLabel}
      headerTagVariant="emergency"
      scrollable
      onBack={() => goBackWithinStack(navigation)}
      continueDisabled={!hasLocation}
      onContinue={() => {
        if (!hasLocation) {
          showDialog({
            tone: 'warning',
            title: 'Location required',
            message: 'Choose where you need help before continuing.',
            primaryLabel: 'OK',
          });
          return;
        }
        updateBooking({
          serviceId,
          location,
          locationLabel: locationLabel || formatLocationDisplay(location),
          locationLat,
          locationLng,
          landmark: '',
        });
        navigation.navigate('RoadsideReview');
      }}>
      <WizardStepFade>
        {dialog}
        <RideLocationBoard
          px={t.px}
          activeId={activeStop}
          query={query}
          searching={searchingPlaces}
          suggestions={suggestions}
          suppressIdleHint={hasLocation}
          onActivate={() => {
            setActiveStop('help');
            setQuery('');
          }}
          onQueryChange={setQuery}
          onClearActive={() => {
            setQuery('');
            setPlaceHits([]);
            setLocation(PLACEHOLDER);
            setLocationLabel('');
            setLocationLat(undefined);
            setLocationLng(undefined);
            setActiveStop('help');
          }}
          onSelectOnMap={() => {
            setPickerMode('map');
            setShowPicker(true);
          }}
          stops={[
            {
              id: 'help',
              label: 'Help',
              value: locationStopValue,
              placeholder: 'Search or pick on map',
              filled: hasLocation,
              dot: 'pickup',
            },
          ]}
        />
      </WizardStepFade>

      <LocationPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onLocationSelected={selected => {
          applyLocation(selected);
          setShowPicker(false);
        }}
        title="Help location"
        confirmLabel="Use this spot"
        accentColor={ROADSIDE_ACCENT}
        initialMode={pickerMode}
        initialLocation={
          locationLat != null && locationLng != null
            ? { address: location, latitude: locationLat, longitude: locationLng }
            : undefined
        }
      />
    </TowingBookingLayout>
  );
}
