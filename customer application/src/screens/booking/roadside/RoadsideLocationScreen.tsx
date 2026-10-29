import React, { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Crosshair, MapPin } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import LocationPickerModal from '../../../components/common/LocationPickerModal';
import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import { ROADSIDE_ACCENT } from '../../../constants/roadsideBooking';
import { useRoadsideBooking } from '../../../context/RoadsideBookingContext';
import type { LocationResult } from '../../../types/location';
import { resolveLocationSelection } from '../../../utils/locationSelection';
import { formatLocationDisplay } from '../../../utils/readableAddress';
import type { HomeStackParamList } from '../../../types/navigation';
import { colors, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'RoadsideLocation'>;

const PLACEHOLDER = 'Select your location';

export default function RoadsideLocationScreen({ navigation }: Props) {
  const { t } = useBookingTheme();
  const { booking, updateBooking } = useRoadsideBooking();
  const [location, setLocation] = useState(booking.location || PLACEHOLDER);
  const [locationLabel, setLocationLabel] = useState(booking.locationLabel ?? '');
  const [locationLat, setLocationLat] = useState(booking.locationLat);
  const [locationLng, setLocationLng] = useState(booking.locationLng);
  const [landmark, setLandmark] = useState(booking.landmark);
  const [showPicker, setShowPicker] = useState(false);

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

  return (
    <TowingBookingLayout
      title="Where are you?"
      step={2}
      accentColor={ROADSIDE_ACCENT}
      scrollable
      onBack={() => goBackWithinStack(navigation)}
      continueDisabled={!hasLocation}
      onContinue={() => {
        if (!hasLocation) {
          Alert.alert('Location required', 'Select your location on the map before continuing.');
          return;
        }
        updateBooking({
          location,
          locationLabel: locationLabel || formatLocationDisplay(location),
          locationLat,
          locationLng,
          landmark,
        });
        navigation.navigate('RoadsideReview');
      }}>
      <View style={{ gap: t.px(16) }}>
        <View>
          <Text
            style={{
              fontSize: t.sectionTitle,
              fontWeight: typography.weights.bold,
              color: colors.dark,
              marginBottom: t.px(8),
            }}>
            Location
          </Text>
          <Pressable onPress={() => setShowPicker(true)}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.px(10),
                borderRadius: t.inputRadius,
                borderWidth: 1.5,
                borderColor: hasLocation ? ROADSIDE_ACCENT : colors.border,
                backgroundColor: colors.background,
                paddingHorizontal: t.px(14),
                paddingVertical: t.px(14),
              }}>
              <MapPin size={t.iconSm} color={ROADSIDE_ACCENT} fill={ROADSIDE_ACCENT} />
              <Text
                style={{
                  flex: 1,
                  fontSize: t.bodyLarge,
                  fontWeight: hasLocation ? typography.weights.semibold : typography.weights.regular,
                  color: hasLocation ? colors.dark : colors.grey,
                }}
                numberOfLines={2}>
                {hasLocation ? locationLabel || formatLocationDisplay(location) : PLACEHOLDER}
              </Text>
            </View>
          </Pressable>
        </View>

        <Pressable
          onPress={() => setShowPicker(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: t.px(8),
            borderRadius: t.inputRadius,
            backgroundColor: ROADSIDE_ACCENT,
            paddingVertical: t.px(14),
          }}>
          <Crosshair size={t.iconSm} color={colors.background} strokeWidth={2.5} />
          <Text
            style={{
              fontSize: t.labelBold,
              fontWeight: typography.weights.bold,
              color: colors.background,
            }}>
            Pick on Map
          </Text>
        </Pressable>

        <View>
          <Text
            style={{
              fontSize: t.sectionTitle,
              fontWeight: typography.weights.bold,
              color: colors.dark,
              marginBottom: t.px(8),
            }}>
            Nearby Landmark (Optional)
          </Text>
          <TextInput
            value={landmark}
            onChangeText={setLandmark}
            placeholder="e.g. Near Patia Square Mall"
            placeholderTextColor={colors.grey}
            style={{
              borderRadius: t.inputRadius,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.background,
              paddingHorizontal: t.px(14),
              paddingVertical: t.px(14),
              fontSize: t.bodyLarge,
              fontWeight: typography.weights.semibold,
              color: colors.dark,
            }}
          />
        </View>
      </View>

      <LocationPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onLocationSelected={selected => {
          applyLocation(selected);
          setShowPicker(false);
        }}
        title="Your location"
        confirmLabel="Use this location"
        accentColor={ROADSIDE_ACCENT}
        initialLocation={
          locationLat != null && locationLng != null
            ? { address: location, latitude: locationLat, longitude: locationLng }
            : undefined
        }
      />
    </TowingBookingLayout>
  );
}
