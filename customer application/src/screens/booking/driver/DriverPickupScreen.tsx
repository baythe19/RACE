import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Building2, ChevronRight, Clock, Home, MapPin, PlusCircle } from 'lucide-react-native';
import MapView, { PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import LocationPickerModal from '../../../components/common/LocationPickerModal';
import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import {
  DRIVER_ACCENT,
  DRIVER_BOOKING_STEP_LABELS,
  DRIVER_LIGHT_BG,
} from '../../../constants/driverBooking';
import { useDriverBooking } from '../../../context/DriverBookingContext';
import { useBookingsQuery } from '../../../services/bookings/useBookingQueries';
import { useSavedLocationsQuery } from '../../../services/profile/useProfileQueries';
import { useLocationStore } from '../../../store/locationStore';
import type { HomeStackParamList } from '../../../types/navigation';
import { getRecentDriverPickups } from '../../../utils/recentDriverPickups';
import { resolveLocationSelection } from '../../../utils/locationSelection';
import { formatLocationDisplay } from '../../../utils/readableAddress';
import { assertServiceableBookingLocation } from '../../../utils/serviceableLocation';
import { colors, typography } from '../../../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'DriverPickup'>;

const MAP_PROVIDER =
  Platform.OS === 'android' || Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY)
    ? PROVIDER_GOOGLE
    : PROVIDER_DEFAULT;
const PLACEHOLDER = 'Search or pick on map';

const LOCATION_ICONS = {
  home: Home,
  office: Building2,
} as const;

export default function DriverPickupScreen({ navigation }: Props) {
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
    updateBooking({
      pickup: address,
      pickupLabel: displayLabel,
      pickupLat: latitude,
      pickupLng: longitude,
    });
  };

  const hasPickup =
    pickup.trim().length > 0 &&
    pickup !== PLACEHOLDER &&
    pickupLat != null &&
    pickupLng != null;

  const chipRadius = t.px(12);

  return (
    <TowingBookingLayout
      title="Pickup location"
      step={2}
      stepLabels={DRIVER_BOOKING_STEP_LABELS}
      accentColor={DRIVER_ACCENT}
      scrollable
      onBack={() => navigation.goBack()}
      continueDisabled={!hasPickup}
      buttonLabel="Continue"
      onContinue={() => {
        updateBooking({
          pickup,
          pickupLabel: pickupLabel || formatLocationDisplay(pickup),
          pickupLat,
          pickupLng,
        });
        navigation.navigate('DriverChooseVehicleType');
      }}>
      <View style={{ gap: t.px(16) }}>
        <Text
          style={{
            fontSize: t.caption,
            color: colors.grey,
            lineHeight: t.px(18),
            marginTop: -t.px(4),
          }}>
          Driver will come to this spot. No drop location needed for driver hire.
        </Text>

        <View>
          <Text
            style={{
              fontSize: t.sectionTitle,
              fontWeight: typography.weights.bold,
              color: colors.dark,
              marginBottom: t.px(10),
            }}>
            Meet here
          </Text>
          <Pressable
            onPress={() => setShowPicker(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.px(12),
              borderRadius: chipRadius,
              borderWidth: 1.5,
              borderColor: DRIVER_ACCENT,
              backgroundColor: colors.background,
              paddingHorizontal: t.px(14),
              paddingVertical: t.px(14),
            }}>
            <View
              style={{
                width: t.px(36),
                height: t.px(36),
                borderRadius: t.px(10),
                backgroundColor: DRIVER_LIGHT_BG,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <MapPin size={t.px(18)} color={DRIVER_ACCENT} strokeWidth={2.4} />
            </View>
            <Text
              style={{
                flex: 1,
                fontSize: t.bodyLarge,
                fontWeight: hasPickup ? typography.weights.semibold : typography.weights.regular,
                color: hasPickup ? colors.dark : colors.grey,
                lineHeight: t.px(22),
              }}
              numberOfLines={2}>
              {hasPickup ? pickupLabel || formatLocationDisplay(pickup) : PLACEHOLDER}
            </Text>
            <ChevronRight size={t.iconSm} color={colors.grey} />
          </Pressable>
        </View>

        <Pressable onPress={() => setShowPicker(true)}>
          <View
            style={{
              height: t.px(160),
              borderRadius: chipRadius,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: colors.border,
            }}>
            {hasPickup ? (
              <MapView
                key={`${pickupLat}-${pickupLng}`}
                provider={MAP_PROVIDER}
                style={{ width: '100%', height: '100%' }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                pointerEvents="none"
                initialRegion={{
                  latitude: pickupLat!,
                  longitude: pickupLng!,
                  latitudeDelta: 0.012,
                  longitudeDelta: 0.012,
                }}
              />
            ) : (
              <View
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: t.px(6),
                }}>
                <MapPin size={t.px(28)} color={colors.grey} />
                <Text
                  style={{
                    fontSize: t.caption,
                    fontWeight: typography.weights.semibold,
                    color: colors.grey,
                  }}>
                  Tap to pick on map
                </Text>
              </View>
            )}
            {hasPickup ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MapPin size={t.px(32)} color={DRIVER_ACCENT} fill={DRIVER_ACCENT} />
              </View>
            ) : null}
          </View>
        </Pressable>

        <View>
          <Text
            style={{
              fontSize: t.sectionTitle,
              fontWeight: typography.weights.bold,
              color: colors.dark,
              marginBottom: t.px(10),
            }}>
            Quick picks
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.px(8) }}>
            {savedLocations.map(location => {
              const iconKey = location.label.toLowerCase() as keyof typeof LOCATION_ICONS;
              const Icon = LOCATION_ICONS[iconKey] ?? Home;
              const isSelected =
                pickup === location.address ||
                (pickupLat != null &&
                  location.latitude != null &&
                  Math.abs(pickupLat - location.latitude) < 0.0001);

              return (
                <Pressable
                  key={location.id}
                  onPress={() => {
                    if (location.latitude == null || location.longitude == null) {
                      setShowPicker(true);
                      return;
                    }
                    applyPickup(
                      location.address,
                      location.latitude,
                      location.longitude,
                      location.label,
                    );
                  }}
                  style={{
                    width: '31%',
                    flexGrow: 1,
                    maxWidth: '48%',
                    alignItems: 'center',
                    gap: t.px(6),
                    borderRadius: chipRadius,
                    borderWidth: isSelected ? 1.5 : 1,
                    borderColor: isSelected ? DRIVER_ACCENT : colors.border,
                    backgroundColor: isSelected ? DRIVER_LIGHT_BG : colors.background,
                    paddingVertical: t.px(12),
                    paddingHorizontal: t.px(8),
                  }}>
                  <View
                    style={{
                      width: t.px(34),
                      height: t.px(34),
                      borderRadius: t.px(10),
                      backgroundColor: isSelected ? colors.background : DRIVER_LIGHT_BG,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Icon
                      size={t.px(16)}
                      color={isSelected ? DRIVER_ACCENT : colors.dark}
                      strokeWidth={2.2}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: t.caption,
                      fontWeight: typography.weights.bold,
                      color: colors.dark,
                      textAlign: 'center',
                    }}
                    numberOfLines={1}>
                    {location.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setShowPicker(true)}
              style={{
                width: '31%',
                flexGrow: 1,
                maxWidth: '48%',
                alignItems: 'center',
                gap: t.px(6),
                borderRadius: chipRadius,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                paddingVertical: t.px(12),
                paddingHorizontal: t.px(8),
              }}>
              <View
                style={{
                  width: t.px(34),
                  height: t.px(34),
                  borderRadius: t.px(10),
                  backgroundColor: DRIVER_LIGHT_BG,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <PlusCircle size={t.px(16)} color={DRIVER_ACCENT} strokeWidth={2.2} />
              </View>
              <Text
                style={{
                  fontSize: t.caption,
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                }}>
                New place
              </Text>
            </Pressable>
          </View>
        </View>

        {recentPickups.length > 0 ? (
          <View>
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
              {recentPickups.slice(0, 3).map(location => (
                <Pressable
                  key={location.id}
                  onPress={() =>
                    applyPickup(
                      location.address,
                      location.latitude,
                      location.longitude,
                      location.title,
                    )
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.px(12),
                    borderRadius: chipRadius,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    paddingHorizontal: t.px(12),
                    paddingVertical: t.px(12),
                  }}>
                  <View
                    style={{
                      width: t.px(36),
                      height: t.px(36),
                      borderRadius: t.px(10),
                      backgroundColor: '#F3F4F6',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Clock size={t.px(16)} color={colors.grey} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
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
                      numberOfLines={1}>
                      {formatLocationDisplay(location.address)}
                    </Text>
                  </View>
                  <ChevronRight size={t.iconSm} color={colors.grey} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>

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
          applyPickup(
            resolved.address,
            location.latitude,
            location.longitude,
            resolved.displayLabel,
          );
        }}
      />
    </TowingBookingLayout>
  );
}
