import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Crosshair, Map as MapIcon, MapPin, Search } from 'lucide-react-native';

import { getAppDialog } from '../../utils/alertBus';

import LocationPickerModal, {
  type LocationPickerInitialMode,
} from '../common/LocationPickerModal';
import { SERVICEABLE_AREAS } from '../../config/serviceableAreas';
import { useLocationStore } from '../../store/locationStore';
import type { LocationResult } from '../../types/location';
import { reverseGeocode } from '../../utils/googleMaps';
import { ensureForegroundLocation } from '../../utils/locationPermission';
import { LOCATION_ACCENT } from '../../utils/googlePlaces';
import { colors, radius, typography } from '../../theme';

const REF_W = 390;

interface LocationSelectorSheetProps {
  visible: boolean;
  onLocationSelected: () => void;
  dismissible?: boolean;
  onRequestClose?: () => void;
}

/**
 * Home “Set your location” sheet.
 * Two clear paths (kept separate on purpose):
 * 1) Search address → Places autocomplete, then confirm pin on map
 * 2) Pick on map → drag pin / GPS, optional search edit
 */
export default function LocationSelectorSheet({
  visible,
  onLocationSelected,
  dismissible = false,
  onRequestClose,
}: LocationSelectorSheetProps) {
  const { width } = useWindowDimensions();
  const s = width / REF_W;
  const px = (n: number) => Math.round(n * s);

  const setLocation = useLocationStore(state => state.setLocation);
  const selectedLocation = useLocationStore(state => state.selectedLocation);

  const [pickerMode, setPickerMode] = useState<LocationPickerInitialMode | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const applyLocation = useCallback(
    (location: { address: string; latitude: number; longitude: number }) => {
      setLocation(location);
      setPickerMode(null);
      onLocationSelected();
    },
    [onLocationSelected, setLocation],
  );

  const handlePickerSelected = useCallback(
    (location: LocationResult) => {
      applyLocation({
        address: location.displayLabel?.trim() || location.address,
        latitude: location.latitude,
        longitude: location.longitude,
      });
    },
    [applyLocation],
  );

  const handleUseCurrentLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const allowed = await ensureForegroundLocation();
      if (!allowed) return;

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;
      const address = await reverseGeocode(latitude, longitude);
      applyLocation({ address, latitude, longitude });
    } catch {
      getAppDialog().showDialog({
        tone: 'error',
        title: 'Location error',
        message: 'Unable to get your current location. Try search or the map.',
        primaryLabel: 'OK',
      });
    } finally {
      setIsLocating(false);
    }
  }, [applyLocation]);

  const handleCityChip = useCallback(
    (cityName: string) => {
      const city = SERVICEABLE_AREAS.find(area => area.name === cityName);
      if (!city) return;

      if (city.comingSoon) {
        getAppDialog().showDialog({
          tone: 'info',
          title: 'Coming soon',
          message: `${city.displayName} is coming soon! We'll notify you when we launch there.`,
          primaryLabel: 'Got it',
        });
        return;
      }

      applyLocation({
        address: `${city.displayName}, ${city.state}`,
        latitude: city.centerLat,
        longitude: city.centerLng,
      });
    },
    [applyLocation],
  );

  const currentCityName =
    selectedLocation?.address?.split(',')[0]?.trim().toLowerCase() || 'bhubaneswar';

  const closeSheet = () => {
    if (dismissible) onRequestClose?.();
  };

  return (
    <>
      <Modal
        visible={visible && pickerMode === null}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (dismissible) onRequestClose?.();
        }}>
        <View style={styles.backdrop}>
          {dismissible ? (
            <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} />
          ) : null}
          <SafeAreaView
            edges={['bottom']}
            style={[
              styles.sheet,
              {
                paddingHorizontal: px(20),
                paddingTop: px(12),
                paddingBottom: px(24),
              },
            ]}>
            <View style={styles.handle} />

            <View style={[styles.headerRow, { minHeight: px(44), marginBottom: px(14) }]}>
              {dismissible ? (
                <Pressable
                  onPress={closeSheet}
                  hitSlop={12}
                  style={{
                    width: px(40),
                    height: px(40),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Go back">
                  <ArrowLeft size={px(22)} color={colors.dark} strokeWidth={2.4} />
                </Pressable>
              ) : (
                <View style={{ width: px(8) }} />
              )}
              <View style={{ flex: 1, paddingHorizontal: px(4) }}>
                <Text
                  style={{
                    fontSize: px(18),
                    fontWeight: typography.weights.extrabold,
                    color: colors.dark,
                    lineHeight: px(22),
                    textDecorationLine: 'none',
                  }}>
                  Set your location
                </Text>
                <Text
                  style={{
                    marginTop: px(2),
                    fontSize: px(12),
                    color: colors.grey,
                    lineHeight: px(17),
                    textDecorationLine: 'none',
                  }}>
                  Choose where you need help for nearby services
                </Text>
              </View>
              <View style={{ width: dismissible ? px(40) : px(8) }} />
            </View>

            <Text
              style={{
                fontSize: px(12),
                fontWeight: typography.weights.bold,
                color: colors.grey,
                marginBottom: px(8),
                textDecorationLine: 'none',
              }}>
              Search address
            </Text>
            <Pressable
              onPress={() => setPickerMode('search')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.background,
                borderWidth: 1.5,
                borderColor: '#E5E7EB',
                borderRadius: radius.md,
                paddingHorizontal: px(14),
                height: px(48),
                gap: px(10),
                marginBottom: px(12),
              }}
              accessibilityRole="button"
              accessibilityLabel="Search location">
              <Search size={px(18)} color={colors.grey} strokeWidth={2} />
              <Text
                style={{
                  flex: 1,
                  fontSize: px(14),
                  color: colors.grey,
                  textDecorationLine: 'none',
                }}>
                Search area, landmark or address...
              </Text>
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: px(12) }}>
              <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB' }} />
              <Text
                style={{
                  marginHorizontal: px(12),
                  fontSize: px(12),
                  color: colors.grey,
                  textDecorationLine: 'none',
                }}>
                or
              </Text>
              <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB' }} />
            </View>

            <Pressable
              onPress={() => void handleUseCurrentLocation()}
              disabled={isLocating}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.background,
                borderWidth: 1.5,
                borderColor: '#E5E7EB',
                borderRadius: radius.md,
                minHeight: px(50),
                paddingHorizontal: px(14),
                gap: px(12),
                marginBottom: px(10),
              }}>
              <View
                style={{
                  width: px(36),
                  height: px(36),
                  borderRadius: px(10),
                  backgroundColor: 'rgba(245,158,11,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {isLocating ? (
                  <ActivityIndicator size="small" color={LOCATION_ACCENT} />
                ) : (
                  <Crosshair size={px(18)} color={LOCATION_ACCENT} strokeWidth={2.4} />
                )}
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: px(14),
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                  textDecorationLine: 'none',
                }}>
                {isLocating ? 'Getting your location...' : 'Use my current location'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setPickerMode('map')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.background,
                borderWidth: 1.5,
                borderColor: '#E5E7EB',
                borderRadius: radius.md,
                minHeight: px(56),
                paddingHorizontal: px(14),
                gap: px(12),
                marginBottom: px(18),
              }}
              accessibilityRole="button"
              accessibilityLabel="Open map picker">
              <View
                style={{
                  width: px(36),
                  height: px(36),
                  borderRadius: px(10),
                  backgroundColor: 'rgba(245,158,11,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MapIcon size={px(18)} color={LOCATION_ACCENT} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: px(14),
                    fontWeight: typography.weights.bold,
                    color: colors.dark,
                    textDecorationLine: 'none',
                  }}>
                  Pick on map
                </Text>
                <Text
                  style={{
                    fontSize: px(11),
                    color: colors.grey,
                    marginTop: 2,
                    textDecorationLine: 'none',
                  }}>
                  Drag map or long-press to set
                </Text>
              </View>
            </Pressable>

            <Text
              style={{
                fontSize: px(13),
                fontWeight: typography.weights.bold,
                color: colors.dark,
                marginBottom: px(10),
                textDecorationLine: 'none',
              }}>
              Popular cities
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: px(8) }}>
              {SERVICEABLE_AREAS.map(city => {
                const isSelected = currentCityName.includes(city.name.toLowerCase());
                return (
                  <Pressable
                    key={city.name}
                    onPress={() => handleCityChip(city.name)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: px(6),
                      paddingHorizontal: px(14),
                      paddingVertical: px(8),
                      borderRadius: radius.md,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.dark : '#E5E7EB',
                      backgroundColor: colors.background,
                    }}>
                    {isSelected ? (
                      <MapPin size={px(14)} color={LOCATION_ACCENT} strokeWidth={2.4} />
                    ) : null}
                    <Text
                      style={{
                        fontSize: px(13),
                        fontWeight: isSelected
                          ? typography.weights.bold
                          : typography.weights.regular,
                        color: colors.dark,
                        textDecorationLine: 'none',
                      }}>
                      {city.displayName}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      <LocationPickerModal
        visible={pickerMode !== null}
        initialMode={pickerMode ?? 'map'}
        title={pickerMode === 'search' ? 'Search location' : 'Pick on map'}
        confirmLabel="Use this location"
        initialLocation={
          selectedLocation
            ? {
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
                address: selectedLocation.address,
              }
            : undefined
        }
        onClose={() => setPickerMode(null)}
        onLocationSelected={handlePickerSelected}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
