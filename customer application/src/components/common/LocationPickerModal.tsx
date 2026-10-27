import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GooglePlacesAutocomplete, type GooglePlacesAutocompleteRef } from 'react-native-google-places-autocomplete';
import MapView, { PROVIDER_DEFAULT, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Crosshair, MapPin } from 'lucide-react-native';

import type { LocationResult } from '../../types/location';
import { BHUBANESWAR_DEFAULT } from '../../utils/googleMaps';
import { getGoogleMapsApiKey } from '../../utils/googleMaps';
import {
  LOCATION_ACCENT,
  parseLocationFromPlaceDetails,
  reverseGeocodeToLocation,
} from '../../utils/googlePlaces';
import { formatLocationDisplay } from '../../utils/readableAddress';
import { colors, shadows, typography } from '../../theme';

const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;
const REVERSE_GEOCODE_DEBOUNCE_MS = 500;

export interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelected: (location: LocationResult) => void;
  title?: string;
  confirmLabel?: string;
  initialLocation?: Pick<LocationResult, 'latitude' | 'longitude' | 'address'>;
  accentColor?: string;
}

function splitAddress(address: string): { title: string; subtitle: string } {
  const readable = formatLocationDisplay(address);
  const parts = readable.split(',').map(part => part.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return { title: readable || 'Selected location', subtitle: '' };
  }
  return {
    title: parts[0],
    subtitle: parts.slice(1).join(', '),
  };
}

export default function LocationPickerModal({
  visible,
  onClose,
  onLocationSelected,
  title = 'Confirm location',
  confirmLabel = 'Confirm location',
  initialLocation,
  accentColor = LOCATION_ACCENT,
}: LocationPickerModalProps) {
  const apiKey = getGoogleMapsApiKey();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const searchRef = useRef<GooglePlacesAutocompleteRef>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const regionRef = useRef<Region>({
    latitude: initialLocation?.latitude ?? BHUBANESWAR_DEFAULT.latitude,
    longitude: initialLocation?.longitude ?? BHUBANESWAR_DEFAULT.longitude,
    latitudeDelta: BHUBANESWAR_DEFAULT.latitudeDelta,
    longitudeDelta: BHUBANESWAR_DEFAULT.longitudeDelta,
  });

  const [selected, setSelected] = useState<LocationResult | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchFailed, setSearchFailed] = useState(!apiKey);
  const [sheetHeight, setSheetHeight] = useState(230);

  const resolveRegion = useCallback(async (region: Region) => {
    setIsGeocoding(true);
    try {
      const location = await reverseGeocodeToLocation(region.latitude, region.longitude);
      setSelected(location);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  const animateTo = useCallback(
    (latitude: number, longitude: number) => {
      const region: Region = {
        latitude,
        longitude,
        latitudeDelta: BHUBANESWAR_DEFAULT.latitudeDelta,
        longitudeDelta: BHUBANESWAR_DEFAULT.longitudeDelta,
      };
      regionRef.current = region;
      mapRef.current?.animateToRegion(region, 400);
      void resolveRegion(region);
    },
    [resolveRegion],
  );

  useEffect(() => {
    if (!visible) {
      setShowSearch(false);
      return;
    }

    const lat = initialLocation?.latitude ?? BHUBANESWAR_DEFAULT.latitude;
    const lng = initialLocation?.longitude ?? BHUBANESWAR_DEFAULT.longitude;
    regionRef.current = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: BHUBANESWAR_DEFAULT.latitudeDelta,
      longitudeDelta: BHUBANESWAR_DEFAULT.longitudeDelta,
    };
    void resolveRegion(regionRef.current);
  }, [visible, initialLocation?.latitude, initialLocation?.longitude, resolveRegion]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      regionRef.current = region;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void resolveRegion(region);
      }, REVERSE_GEOCODE_DEBOUNCE_MS);
    },
    [resolveRegion],
  );

  const handlePlaceSelect = useCallback(
    (data: { place_id?: string; description?: string }, details: unknown) => {
      const location = parseLocationFromPlaceDetails(
        data,
        details as Parameters<typeof parseLocationFromPlaceDetails>[1],
      );
      if (!location) {
        setSearchFailed(true);
        return;
      }
      setSelected(location);
      setShowSearch(false);
      animateTo(location.latitude, location.longitude);
      searchRef.current?.setAddressText(location.address);
    },
    [animateTo],
  );

  const handleCurrentLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      animateTo(position.coords.latitude, position.coords.longitude);
    } finally {
      setIsLocating(false);
    }
  }, [animateTo]);

  const handleConfirm = useCallback(() => {
    if (!selected) return;
    onLocationSelected({
      ...selected,
      latitude: regionRef.current.latitude,
      longitude: regionRef.current.longitude,
    });
    onClose();
  }, [onClose, onLocationSelected, selected]);

  const addressParts = splitAddress(selected?.address ?? '');
  const mapRegion = {
    latitude: regionRef.current.latitude,
    longitude: regionRef.current.longitude,
    latitudeDelta: BHUBANESWAR_DEFAULT.latitudeDelta,
    longitudeDelta: BHUBANESWAR_DEFAULT.longitudeDelta,
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          provider={MAP_PROVIDER}
          style={StyleSheet.absoluteFill}
          initialRegion={mapRegion}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
          rotateEnabled={false}
          pitchEnabled={false}
        />

        {/* Center pin — map moves underneath */}
        <View style={styles.centerPinWrap} pointerEvents="none">
          <View style={[styles.pinBubble, shadows.card]}>
            <Text style={styles.pinBubbleText} numberOfLines={1}>
              {isGeocoding ? 'Finding address...' : addressParts.title || 'Move map to pin'}
            </Text>
          </View>
          <MapPin size={42} color={accentColor} fill={accentColor} strokeWidth={1.5} />
          <View style={styles.pinShadow} />
        </View>

        {/* Floating back */}
        <Pressable
          onPress={onClose}
          hitSlop={16}
          style={[styles.floatingBtn, shadows.card, { top: insets.top + 8 }]}>
          <Ionicons name="arrow-back" size={22} color={colors.dark} />
        </Pressable>

        {/* GPS button — sits just above the bottom sheet */}
        <Pressable
          onPress={() => void handleCurrentLocation()}
          disabled={isLocating}
          style={[styles.gpsBtn, shadows.card, { bottom: sheetHeight + 16 }]}>
          {isLocating ? (
            <ActivityIndicator size="small" color={accentColor} />
          ) : (
            <Crosshair size={22} color={accentColor} strokeWidth={2.5} />
          )}
        </Pressable>

        {/* Search overlay */}
        {showSearch ? (
          <View style={[styles.searchOverlay, { paddingTop: insets.top + 8 }]}>
            <View style={styles.searchOverlayHeader}>
              <Pressable onPress={() => setShowSearch(false)} hitSlop={8}>
                <Ionicons name="arrow-back" size={22} color={colors.dark} />
              </Pressable>
              <Text style={styles.searchOverlayTitle}>Select location</Text>
              <View style={{ width: 22 }} />
            </View>

            {!searchFailed && apiKey ? (
              <GooglePlacesAutocomplete
                ref={searchRef}
                placeholder="Search address or place"
                fetchDetails
                enablePoweredByContainer={false}
                minLength={2}
                debounce={300}
                predefinedPlaces={[]}
                textInputProps={{
                  placeholderTextColor: colors.grey,
                  autoFocus: true,
                }}
                onPress={(data, details = null) => handlePlaceSelect(data, details)}
                onFail={() => setSearchFailed(true)}
                query={{
                  key: apiKey,
                  language: 'en',
                  components: 'country:in',
                  types: 'geocode',
                }}
                styles={{
                  container: styles.autocompleteContainer,
                  textInputContainer: styles.searchInputContainer,
                  textInput: styles.searchInput,
                  listView: styles.searchList,
                  row: styles.searchRow,
                  separator: styles.searchSeparator,
                }}
                renderLeftButton={() => (
                  <Ionicons name="search" size={18} color={colors.grey} style={{ marginRight: 8 }} />
                )}
                renderRow={rowData => (
                  <View style={styles.suggestionRow}>
                    <Text style={styles.suggestionIcon}>📍</Text>
                    <View style={styles.suggestionTextWrap}>
                      <Text style={styles.suggestionMain} numberOfLines={1}>
                        {rowData.structured_formatting?.main_text ?? rowData.description}
                      </Text>
                      {rowData.structured_formatting?.secondary_text ? (
                        <Text style={styles.suggestionSecondary} numberOfLines={1}>
                          {rowData.structured_formatting.secondary_text}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                )}
                keyboardShouldPersistTaps="always"
                listViewDisplayed
                GooglePlacesDetailsQuery={{
                  fields: 'formatted_address,geometry,address_components,place_id',
                }}
              />
            ) : (
              <Text style={styles.fallbackSearchText}>
                Search unavailable. Drag the map or use GPS.
              </Text>
            )}
          </View>
        ) : null}

        {/* Bottom sheet */}
        <View
          style={[styles.bottomSheet, shadows.card, { paddingBottom: Math.max(insets.bottom, 16) }]}
          onLayout={event => setSheetHeight(event.nativeEvent.layout.height)}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Text style={styles.sheetSubtitle}>Drag map to move pin</Text>

          <Pressable
            onPress={() => setShowSearch(true)}
            style={styles.addressCard}
            disabled={isGeocoding}>
            <View style={styles.addressCardText}>
              {isGeocoding ? (
                <View style={styles.addressLoading}>
                  <ActivityIndicator size="small" color={accentColor} />
                  <Text style={styles.addressLoadingText}>Getting address...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.addressTitle} numberOfLines={1}>
                    {addressParts.title || 'Move map to select'}
                  </Text>
                  {addressParts.subtitle ? (
                    <Text style={styles.addressSubtitle} numberOfLines={2}>
                      {addressParts.subtitle}
                    </Text>
                  ) : null}
                </>
              )}
            </View>
            <View style={styles.searchIconBtn}>
              <Ionicons name="search" size={18} color={colors.dark} />
            </View>
          </Pressable>

          <Pressable
            onPress={handleConfirm}
            disabled={!selected || isGeocoding}
            style={[
              styles.confirmBtn,
              { backgroundColor: selected && !isGeocoding ? accentColor : colors.grey },
            ]}>
            <Text style={styles.confirmLabel}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerPinWrap: {
    position: 'absolute',
    top: '42%',
    left: '50%',
    marginLeft: -21,
    marginTop: -52,
    alignItems: 'center',
    zIndex: 5,
  },
  pinBubble: {
    backgroundColor: colors.dark,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 6,
    maxWidth: 220,
  },
  pinBubbleText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  pinShadow: {
    width: 10,
    height: 4,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.25)',
    marginTop: 2,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    zIndex: 10,
  },
  floatingBtn: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    elevation: 30,
  },
  gpsBtn: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  searchOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    zIndex: 20,
    paddingHorizontal: 16,
  },
  searchOverlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  searchOverlayTitle: {
    fontSize: 17,
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  autocompleteContainer: {
    flex: 0,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: LOCATION_ACCENT,
    borderRadius: 12,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.dark,
    height: 44,
    marginTop: 0,
    marginBottom: 0,
    backgroundColor: 'transparent',
  },
  searchList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: colors.background,
    maxHeight: 360,
  },
  searchRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  searchSeparator: {
    height: 1,
    backgroundColor: colors.border,
  },
  fallbackSearchText: {
    fontSize: 14,
    color: colors.grey,
    marginTop: 8,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  suggestionIcon: {
    fontSize: 16,
  },
  suggestionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  suggestionMain: {
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    color: colors.dark,
  },
  suggestionSecondary: {
    marginTop: 2,
    fontSize: 12,
    color: colors.grey,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 10,
    zIndex: 10,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: colors.grey,
    marginBottom: 4,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    backgroundColor: colors.background,
  },
  addressCardText: {
    flex: 1,
    minWidth: 0,
  },
  addressLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressLoadingText: {
    fontSize: 14,
    color: colors.grey,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.dark,
    marginBottom: 2,
  },
  addressSubtitle: {
    fontSize: 13,
    color: colors.grey,
    lineHeight: 18,
  },
  searchIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.lightGrey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    minHeight: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  confirmLabel: {
    fontSize: 17,
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
});
