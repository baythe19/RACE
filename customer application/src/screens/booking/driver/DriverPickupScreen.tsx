import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Building2, ChevronRight, Clock, Home, MapPin } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import LocationPickerModal from '../../../components/common/LocationPickerModal';
import TileMapSurface from '../../../components/common/TileMapSurface';
import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import WizardStepFade from '../../../components/booking/WizardStepFade';
import {
  DRIVER_ACCENT,
  DRIVER_LIGHT_BG,
} from '../../../constants/driverBooking';
import { useDriverBooking } from '../../../context/DriverBookingContext';
import { getDriverServiceFlow } from '../../../utils/driverServiceFlow';
import { useBookingsQuery } from '../../../services/bookings/useBookingQueries';
import { useSavedLocationsQuery } from '../../../services/profile/useProfileQueries';
import { useLocationStore } from '../../../store/locationStore';
import type { HomeStackParamList } from '../../../types/navigation';
import { getRecentDriverPickups } from '../../../utils/recentDriverPickups';
import { resolveLocationSelection } from '../../../utils/locationSelection';
import { formatLocationDisplay } from '../../../utils/readableAddress';
import { assertServiceableBookingLocation } from '../../../utils/serviceableLocation';
import { colors, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'DriverPickup'>;

const PLACEHOLDER = 'Search or pick on map';
const DROP_PLACEHOLDER = 'Destination on map';

type PickerTarget = 'pickup' | 'dropoff' | null;

const LOCATION_ICONS = {
  home: Home,
  office: Building2,
} as const;

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

  const applyDropoff = (address: string, latitude: number, longitude: number, label?: string) => {
    if (!assertServiceableBookingLocation(latitude, longitude)) return;
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

  const chipRadius = t.px(12);

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
      <View style={{ gap: t.px(10) }}>
        <Text
          style={{
            fontSize: t.caption,
            fontWeight: typography.weights.semibold,
            color: colors.grey,
            marginBottom: t.px(2),
          }}>
          {flow.pickupFieldLabel}
        </Text>
        <View>
          <Pressable
            onPress={() => setPickerTarget('pickup')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.px(10),
              borderRadius: chipRadius,
              borderWidth: 1,
              borderColor: DRIVER_ACCENT,
              backgroundColor: colors.background,
              paddingHorizontal: t.px(12),
              paddingVertical: t.px(8),
            }}>
            <View
              style={{
                width: t.px(28),
                height: t.px(28),
                borderRadius: t.px(8),
                backgroundColor: DRIVER_LIGHT_BG,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <MapPin size={t.px(15)} color={DRIVER_ACCENT} strokeWidth={2.4} />
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

        <Pressable onPress={() => setPickerTarget('pickup')}>
          <View
            style={{
              height: t.px(96),
              borderRadius: chipRadius,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: colors.border,
            }}>
            {hasPickup && pickupLat != null && pickupLng != null ? (
              <TileMapSurface
                key={`${pickupLat}-${pickupLng}`}
                interactive={false}
                initialRegion={{
                  latitude: pickupLat,
                  longitude: pickupLng,
                  latitudeDelta: 0.012,
                  longitudeDelta: 0.012,
                }}
                markers={[
                  {
                    id: 'pickup',
                    latitude: pickupLat,
                    longitude: pickupLng,
                    color: DRIVER_ACCENT,
                  },
                ]}
              />
            ) : (
              <View
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#E5E7EB',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: t.px(6),
                }}>
                <MapPin size={t.px(28)} color={DRIVER_ACCENT} fill={DRIVER_ACCENT} strokeWidth={1.6} />
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
          </View>
        </Pressable>

        {flow.requiresDropoff ? (
          <>
            <Text
              style={{
                fontSize: t.caption,
                fontWeight: typography.weights.semibold,
                color: colors.grey,
                marginTop: t.px(4),
              }}>
              {flow.dropFieldLabel}
            </Text>
            <Pressable
              onPress={() => setPickerTarget('dropoff')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.px(10),
                borderRadius: chipRadius,
                borderWidth: 1,
                borderColor: hasDropoff ? DRIVER_ACCENT : colors.border,
                backgroundColor: colors.background,
                paddingHorizontal: t.px(12),
                paddingVertical: t.px(8),
              }}>
              <View
                style={{
                  width: t.px(28),
                  height: t.px(28),
                  borderRadius: t.px(8),
                  backgroundColor: DRIVER_LIGHT_BG,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MapPin size={t.px(15)} color="#DC2626" strokeWidth={2.4} />
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: t.bodyLarge,
                  fontWeight: hasDropoff ? typography.weights.semibold : typography.weights.regular,
                  color: hasDropoff ? colors.dark : colors.grey,
                  lineHeight: t.px(22),
                }}
                numberOfLines={2}>
                {hasDropoff ? dropoffLabel || formatLocationDisplay(dropoff) : DROP_PLACEHOLDER}
              </Text>
              <ChevronRight size={t.iconSm} color={colors.grey} />
            </Pressable>
          </>
        ) : null}

        {savedLocations.length > 0 ? (
          <View>
          <Text
            style={{
              fontSize: t.caption,
              fontWeight: typography.weights.semibold,
              color: colors.grey,
              marginBottom: t.px(6),
            }}>
            Saved
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.px(6) }}>
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
                      setPickerTarget('pickup');
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
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.px(6),
                    borderRadius: t.px(8),
                    borderWidth: 1,
                    borderColor: isSelected ? DRIVER_ACCENT : colors.border,
                    backgroundColor: isSelected ? DRIVER_LIGHT_BG : colors.background,
                    paddingVertical: t.px(6),
                    paddingHorizontal: t.px(10),
                  }}>
                  <Icon
                    size={t.px(14)}
                    color={isSelected ? DRIVER_ACCENT : colors.dark}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={{
                      fontSize: t.caption,
                      fontWeight: typography.weights.semibold,
                      color: colors.dark,
                    }}
                    numberOfLines={1}>
                    {location.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          </View>
        ) : null}

        {recentPickups.length > 0 ? (
          <View>
            <Text
              style={{
                fontSize: t.caption,
                fontWeight: typography.weights.semibold,
                color: colors.grey,
                marginBottom: t.px(6),
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
                    gap: t.px(8),
                    borderRadius: t.px(10),
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    paddingHorizontal: t.px(10),
                    paddingVertical: t.px(8),
                  }}>
                  <Clock size={t.px(14)} color={colors.grey} strokeWidth={2} />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: t.caption,
                      fontWeight: typography.weights.semibold,
                      color: colors.dark,
                    }}
                    numberOfLines={1}>
                    {location.title}
                  </Text>
                  <ChevronRight size={t.iconSm} color={colors.grey} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>
      </WizardStepFade>

      <LocationPickerModal
        visible={showPicker}
        title={pickerTarget === 'dropoff' ? 'Confirm destination' : 'Confirm pickup spot'}
        confirmLabel={pickerTarget === 'dropoff' ? 'Confirm destination' : 'Confirm pickup'}
        accentColor={DRIVER_ACCENT}
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
