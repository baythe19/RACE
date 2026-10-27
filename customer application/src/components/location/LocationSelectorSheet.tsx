import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import LocationPickerMap from '../booking/LocationPickerMap';
import { SERVICEABLE_AREAS } from '../../config/serviceableAreas';
import { useLocationStore } from '../../store/locationStore';
import { reverseGeocode } from '../../utils/googleMaps';
import { colors, shadows, typography } from '../../theme';

const REF_W = 390;

interface LocationSelectorSheetProps {
  visible: boolean;
  onLocationSelected: () => void;
  dismissible?: boolean;
  onRequestClose?: () => void;
}

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

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const applyLocation = useCallback(
    (location: { address: string; latitude: number; longitude: number }) => {
      setLocation(location);
      setShowMapPicker(false);
      onLocationSelected();
    },
    [onLocationSelected, setLocation],
  );

  const handleUseCurrentLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Allow location access to use your current location, or search on the map.',
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;
      const address = await reverseGeocode(latitude, longitude);
      applyLocation({ address, latitude, longitude });
    } catch {
      Alert.alert('Location error', 'Unable to get your current location. Try the map picker.');
    } finally {
      setIsLocating(false);
    }
  }, [applyLocation]);

  const handleCityChip = useCallback(
    (cityName: string) => {
      const city = SERVICEABLE_AREAS.find(area => area.name === cityName);
      if (!city) return;

      if (city.comingSoon) {
        Alert.alert(
          'Coming soon',
          `${city.displayName} is coming soon! We'll notify you when we launch there.`,
        );
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

  const currentCityName = selectedLocation?.address?.split(',')[0]?.trim().toLowerCase() || 'bhubaneswar';

  return (
    <>
      <Modal
        visible={visible && !showMapPicker}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (dismissible) onRequestClose?.();
        }}>
        <View style={styles.backdrop}>
          {dismissible ? (
            <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} />
          ) : null}
          <SafeAreaView edges={['bottom']} style={[styles.sheet, { paddingHorizontal: px(20), paddingTop: px(12), paddingBottom: px(24) }]}>
            {/* Grab handle */}
            <View style={styles.handle} />

            {/* Back button row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: px(12) }}>
              <Pressable
                onPress={() => {
                  if (dismissible) onRequestClose?.();
                }}
                hitSlop={12}
                style={{ width: px(36), height: px(36), justifyContent: 'center' }}>
                <ArrowLeft size={px(22)} color={colors.dark} strokeWidth={2.4} />
              </Pressable>
            </View>

            {/* Title & Subtitle */}
            <Text
              style={{
                fontSize: px(22),
                fontWeight: typography.weights.extrabold,
                color: colors.dark,
                marginBottom: px(4),
              }}>
              Set your location
            </Text>
            <Text
              style={{
                fontSize: px(13),
                color: colors.grey,
                lineHeight: px(18),
                marginBottom: px(18),
              }}>
              Choose where you need help so we can show nearby services
            </Text>

            {/* Search Input Bar */}
            <Pressable
              onPress={() => setShowMapPicker(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: px(14),
                paddingHorizontal: px(14),
                height: px(48),
                gap: px(10),
                marginBottom: px(16),
              }}>
              <Search size={px(18)} color={colors.grey} strokeWidth={2} />
              <Text style={{ fontSize: px(14), color: colors.grey }}>
                Search location, area or landmark...
              </Text>
            </Pressable>

            {/* Divider: or */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: px(8) }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
              <Text style={{ marginHorizontal: px(12), fontSize: px(12), color: colors.grey }}>
                or
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
            </View>

            {/* Use my current location */}
            <Pressable
              onPress={() => void handleUseCurrentLocation()}
              disabled={isLocating}
              style={[
                shadows.card,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: '#F0EFEA',
                  borderRadius: px(14),
                  height: px(48),
                  paddingHorizontal: px(16),
                  gap: px(12),
                  marginVertical: px(6),
                },
              ]}>
              {isLocating ? (
                <ActivityIndicator size="small" color={colors.dark} />
              ) : (
                <Crosshair size={px(20)} color={colors.dark} strokeWidth={2.2} />
              )}
              <Text
                style={{
                  fontSize: px(14),
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                }}>
                {isLocating ? 'Getting your location...' : 'Use my current location'}
              </Text>
            </Pressable>

            {/* Divider: Select on map */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: px(10) }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
              <Text style={{ marginHorizontal: px(12), fontSize: px(12), color: colors.grey }}>
                Select on map
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
            </View>

            {/* Open Map Picker */}
            <Pressable
              onPress={() => setShowMapPicker(true)}
              style={[
                shadows.card,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: '#F0EFEA',
                  borderRadius: px(14),
                  height: px(48),
                  paddingHorizontal: px(16),
                  gap: px(12),
                  marginVertical: px(6),
                  marginBottom: px(18),
                },
              ]}>
              <MapIcon size={px(20)} color={colors.dark} strokeWidth={2} />
              <Text
                style={{
                  fontSize: px(14),
                  fontWeight: typography.weights.bold,
                  color: colors.dark,
                }}>
                Open Map Picker
              </Text>
            </Pressable>

            {/* Popular cities */}
            <Text
              style={{
                fontSize: px(13),
                fontWeight: typography.weights.bold,
                color: colors.dark,
                marginBottom: px(10),
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
                      borderRadius: px(20),
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.dark : '#E5E7EB',
                      backgroundColor: isSelected ? '#FFFFFF' : '#FAFAFA',
                    }}>
                    {isSelected ? (
                      <MapPin size={px(14)} color={colors.dark} strokeWidth={2.4} />
                    ) : null}
                    <Text
                      style={{
                        fontSize: px(13),
                        fontWeight: isSelected ? typography.weights.bold : typography.weights.regular,
                        color: colors.dark,
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

      <LocationPickerMap
        visible={showMapPicker}
        title="Select Your Location"
        initialLocation={
          selectedLocation
            ? {
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
              }
            : undefined
        }
        onClose={() => setShowMapPicker(false)}
        onLocationSelected={location => applyLocation(location)}
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
    marginBottom: 12,
  },
});
