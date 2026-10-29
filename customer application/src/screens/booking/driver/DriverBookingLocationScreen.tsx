import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight, Clock, MapPin } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import LocationPickerModal from '../../../components/common/LocationPickerModal';
import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import { DRIVER_ACCENT, DRIVER_LIGHT_BG } from '../../../constants/driverBooking';
import { useDriverBooking } from '../../../context/DriverBookingContext';
import { useBookingsQuery } from '../../../services/bookings/useBookingQueries';
import { useSavedLocationsQuery } from '../../../services/profile/useProfileQueries';
import { useLocationStore } from '../../../store/locationStore';
import type { HomeStackParamList } from '../../../types/navigation';
import { getRecentDriverPickups } from '../../../utils/recentDriverPickups';
import { resolveLocationSelection } from '../../../utils/locationSelection';
import { formatLocationDisplay } from '../../../utils/readableAddress';
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

  const applyPickup = (address: string, latitude: number, longitude: number, label?: string) => {
    if (!assertServiceableBookingLocation(latitude, longitude)) return;
    const displayLabel = label || formatLocationDisplay(address);
    setPickup(address);
    setPickupLabel(displayLabel);
    setPickupLat(latitude);
    setPickupLng(longitude);
  };

  const hasPickup = pickup.trim().length > 0 && pickup !== PLACEHOLDER;

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
      <Text
        style={{
          fontSize: t.bodyLarge,
          color: colors.grey,
          textAlign: 'center',
          marginBottom: t.px(16),
        }}>
        Where should the driver meet you?
      </Text>

      <Pressable onPress={() => setShowPicker(true)}>
        <View
          style={[
            {
              borderRadius: t.cardRadius,
              borderWidth: 2,
              borderColor: DRIVER_ACCENT,
              backgroundColor: DRIVER_LIGHT_BG,
              padding: t.px(16),
              marginBottom: t.px(16),
            },
            shadows.card,
          ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.px(10) }}>
            <MapPin size={t.iconSm} color={DRIVER_ACCENT} fill={DRIVER_ACCENT} />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: t.labelBold,
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                  marginBottom: t.px(4),
                }}>
                Pickup Location
              </Text>
              <Text
                style={{
                  fontSize: t.body,
                  color: hasPickup ? colors.dark : colors.grey,
                  fontWeight: hasPickup ? typography.weights.semibold : typography.weights.regular,
                }}
                numberOfLines={2}>
                {hasPickup ? pickupLabel || formatLocationDisplay(pickup) : PLACEHOLDER}
              </Text>
            </View>
            <ChevronRight size={t.iconSm} color={colors.grey} />
          </View>
        </View>
      </Pressable>

      <Text
        style={{
          fontSize: t.sectionTitle,
          fontWeight: typography.weights.bold,
          color: colors.dark,
          marginBottom: t.px(10),
        }}>
        Saved Locations
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.px(10) }}>
        {savedLocations.length > 0
          ? savedLocations.map(location => (
              <Pressable
                key={location.id}
                onPress={() => {
                  if (location.latitude == null || location.longitude == null) return;
                  applyPickup(location.address, location.latitude, location.longitude, location.label);
                }}
                style={[
                  {
                    minWidth: '47%',
                    flexGrow: 1,
                    alignItems: 'center',
                    gap: t.px(8),
                    borderRadius: t.inputRadius,
                    borderWidth: pickup === location.address ? 2 : 1,
                    borderColor: pickup === location.address ? DRIVER_ACCENT : colors.border,
                    backgroundColor:
                      pickup === location.address ? DRIVER_LIGHT_BG : colors.background,
                    paddingVertical: t.px(14),
                    paddingHorizontal: t.px(8),
                  },
                  shadows.card,
                ]}>
                <Text
                  style={{
                    fontSize: t.caption,
                    fontWeight: typography.weights.bold,
                    color: colors.dark,
                    textAlign: 'center',
                  }}>
                  {location.label}
                </Text>
              </Pressable>
            ))
          : null}
      </View>

      {recentPickups.length > 0 ? (
        <View style={{ marginTop: t.px(18) }}>
          <Text
            style={{
              fontSize: t.sectionTitle,
              fontWeight: typography.weights.bold,
              color: colors.dark,
              marginBottom: t.px(10),
            }}>
            Recent
          </Text>
          <View style={{ gap: t.px(8) }}>
            {recentPickups.map(location => (
              <Pressable
                key={location.id}
                onPress={() => applyPickup(location.address, location.latitude, location.longitude, location.title)}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.px(12),
                    borderRadius: t.inputRadius,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    paddingHorizontal: t.px(12),
                    paddingVertical: t.px(12),
                  },
                  shadows.card,
                ]}>
                <View
                  style={{
                    width: t.px(36),
                    height: t.px(36),
                    borderRadius: t.px(18),
                    backgroundColor: colors.lightGrey,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Clock size={t.px(18)} color={colors.grey} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: t.body,
                      fontWeight: typography.weights.bold,
                      color: colors.dark,
                    }}
                    numberOfLines={1}>
                    {location.title}
                  </Text>
                  <Text
                    style={{
                      marginTop: t.px(2),
                      fontSize: t.caption,
                      color: colors.grey,
                      lineHeight: t.px(16),
                    }}
                    numberOfLines={2}>
                    {formatLocationDisplay(location.address)}
                  </Text>
                </View>
                <ChevronRight size={t.iconSm} color={colors.grey} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <LocationPickerModal
        visible={showPicker}
        title="Confirm pickup spot"
        confirmLabel="Confirm pickup"
        accentColor={DRIVER_ACCENT}
        initialLocation={
          pickupLat && pickupLng
            ? { latitude: pickupLat, longitude: pickupLng, address: pickup }
            : undefined
        }
        onClose={() => setShowPicker(false)}
        onLocationSelected={location => {
          const resolved = resolveLocationSelection(location);
          applyPickup(resolved.address, location.latitude, location.longitude, resolved.displayLabel);
        }}
      />
    </TowingBookingLayout>
  );
}
