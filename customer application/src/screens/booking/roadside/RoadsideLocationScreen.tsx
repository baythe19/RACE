import React, { useEffect, useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import LocationPickerModal from '../../../components/common/LocationPickerModal';
import RideLocationBoard, { type RideSuggestion } from '../../../components/booking/RideLocationBoard';
import FormSectionLabel from '../../../components/booking/FormSectionLabel';
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
import { formatLocationDisplay } from '../../../utils/readableAddress';
import type { HomeStackParamList } from '../../../types/navigation';
import type { RoadsideServiceId } from '../../../types/roadsideBooking';
import { colors, typography } from '../../../theme';
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
  const [landmark, setLandmark] = useState(booking.landmark);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'search' | 'map'>('map');
  const [query, setQuery] = useState('');
  const [placeHits, setPlaceHits] = useState<PlaceSuggestion[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const { data: savedLocations = [] } = useSavedLocationsQuery();

  useEffect(() => {
    if (paramServiceId) {
      updateBooking({ serviceId: paramServiceId });
    }
  }, [paramServiceId, updateBooking]);

  const serviceId = (paramServiceId ?? booking.serviceId) as RoadsideServiceId;

  const hasLocation =
    location.trim().length > 0 &&
    location !== PLACEHOLDER &&
    locationLat != null &&
    locationLng != null;

  const applyLocation = (result: LocationResult) => {
    const resolved = resolveLocationSelection(result);
    setLocation(resolved.address);
    setLocationLabel(resolved.displayLabel);
    setLocationLat(result.latitude);
    setLocationLng(result.longitude);
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

  const displayValue = hasLocation
    ? locationLabel || formatLocationDisplay(location)
    : PLACEHOLDER;

  return (
    <TowingBookingLayout
      title="Where you need help"
      step={1}
      stepLabels={ROADSIDE_BOOKING_STEP_LABELS}
      accentColor={ROADSIDE_ACCENT}
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
          landmark,
        });
        navigation.navigate('RoadsideReview');
      }}>
      <WizardStepFade>
      {dialog}
      <View style={{ gap: t.px(8) }}>
        <Text
          style={{
            fontSize: t.px(11),
            fontWeight: typography.weights.semibold,
            color: ROADSIDE_ACCENT,
            marginBottom: t.px(2),
          }}
          numberOfLines={1}>
          {getRoadsideServiceLabel(serviceId)}
        </Text>

        <RideLocationBoard
          px={t.px}
          activeId="help"
          query={query}
          searching={searchingPlaces}
          suggestions={suggestions}
          onActivate={() => setQuery('')}
          onQueryChange={setQuery}
          onClearActive={() => {
            setQuery('');
            setPlaceHits([]);
            setLocation(PLACEHOLDER);
            setLocationLabel('');
            setLocationLat(undefined);
            setLocationLng(undefined);
          }}
          onSelectOnMap={() => {
            setPickerMode('map');
            setShowPicker(true);
          }}
          stops={[
            {
              id: 'help',
              label: 'Help',
              value: hasLocation ? locationLabel || displayValue : '',
              placeholder: 'Where should we send help?',
              filled: hasLocation,
              dot: 'pickup',
            },
          ]}
        />

        <FormSectionLabel
          title="Landmark"
          hint="Optional — gate, shop, or a nearby place"
          t={t}
          topGap={16}
        />
        <TextInput
          value={landmark}
          onChangeText={setLandmark}
          placeholder="Near KIIT gate, petrol pump…"
          placeholderTextColor="#A8A29E"
          style={{
            borderRadius: t.px(14),
            borderWidth: 1,
            borderColor: '#E7E5E4',
            backgroundColor: colors.background,
            paddingHorizontal: t.px(14),
            paddingVertical: t.px(12),
            fontSize: t.px(14),
            fontWeight: typography.weights.semibold,
            color: colors.dark,
          }}
        />
      </View>
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
