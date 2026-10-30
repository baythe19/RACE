import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Crosshair, Map as MapIcon } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import LocationPickerModal from '../../../components/common/LocationPickerModal';
import FormSectionLabel from '../../../components/booking/FormSectionLabel';
import SinglePickupLocationCard from '../../../components/booking/SinglePickupLocationCard';
import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import WizardStepFade from '../../../components/booking/WizardStepFade';
import {
  getRoadsideServiceLabel,
  ROADSIDE_ACCENT,
  ROADSIDE_BOOKING_STEP_LABELS,
} from '../../../constants/roadsideBooking';
import { useRoadsideBooking } from '../../../context/RoadsideBookingContext';
import { useAppDialog } from '../../../hooks/useAppDialog';
import { useLocationStore } from '../../../store/locationStore';
import { useUserLocationStore } from '../../../store/userLocationStore';
import type { LocationResult } from '../../../types/location';
import { findServiceableCity } from '../../../config/serviceableAreas';
import { assertServiceableBookingLocation } from '../../../utils/serviceableLocation';
import { ensureForegroundLocation } from '../../../utils/locationPermission';
import { resolveLocationSelection } from '../../../utils/locationSelection';
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
  const fetchCurrentLocation = useUserLocationStore(state => state.fetchCurrentLocation);

  const paramServiceId = route.params?.serviceId;
  const [location, setLocation] = useState(booking.location || PLACEHOLDER);
  const [locationLabel, setLocationLabel] = useState(booking.locationLabel ?? '');
  const [locationLat, setLocationLat] = useState(booking.locationLat);
  const [locationLng, setLocationLng] = useState(booking.locationLng);
  const [landmark, setLandmark] = useState(booking.landmark);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'search' | 'map'>('search');
  const [isLocating, setIsLocating] = useState(false);

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

        <FormSectionLabel
          title="Help location"
          hint="Where should we send the professional?"
          t={t}
        />

        <SinglePickupLocationCard
          label="You are here"
          value={displayValue}
          placeholder={PLACEHOLDER}
          onPress={() => {
            setPickerMode('search');
            setShowPicker(true);
          }}
          t={t}
        />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.px(8) }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use current location"
            disabled={isLocating}
            onPress={() => {
              void (async () => {
                setIsLocating(true);
                try {
                  const allowed = await ensureForegroundLocation();
                  if (!allowed) return;
                  const fetched = await fetchCurrentLocation();
                  if (!fetched?.latitude || !fetched?.longitude) return;
                  if (!assertServiceableBookingLocation(fetched.latitude, fetched.longitude)) return;
                  applyLocation(fetched);
                } finally {
                  setIsLocating(false);
                }
              })();
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.px(6),
              paddingHorizontal: t.px(12),
              paddingVertical: t.px(8),
              borderRadius: t.px(20),
              borderWidth: 1,
              borderColor: '#10B981',
              backgroundColor: pressed ? '#ECFDF5' : colors.background,
              opacity: isLocating ? 0.6 : 1,
            })}>
            {isLocating ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <Crosshair size={t.px(14)} color="#10B981" strokeWidth={2.2} />
            )}
            <Text
              style={{
                fontSize: t.px(11),
                fontWeight: typography.weights.semibold,
                color: colors.dark,
              }}>
              Current location
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pick location on map"
            onPress={() => {
              setPickerMode('map');
              setShowPicker(true);
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.px(6),
              paddingHorizontal: t.px(12),
              paddingVertical: t.px(8),
              borderRadius: t.px(20),
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: pressed ? colors.lightGrey : colors.background,
            })}>
            <MapIcon size={t.px(14)} color={ROADSIDE_ACCENT} strokeWidth={2.2} />
            <Text
              style={{
                fontSize: t.px(11),
                fontWeight: typography.weights.semibold,
                color: colors.dark,
              }}>
              Pick on map
            </Text>
          </Pressable>
        </View>

        <FormSectionLabel
          title="Landmark (optional)"
          hint="Gate, shop, or landmark so we find you faster"
          t={t}
          topGap={8}
        />
        <TextInput
          value={landmark}
          onChangeText={setLandmark}
          placeholder="e.g. Near KIIT main gate, petrol pump…"
          placeholderTextColor={colors.grey}
          style={{
            borderRadius: t.inputRadius,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
            paddingHorizontal: t.px(12),
            paddingVertical: t.px(10),
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
