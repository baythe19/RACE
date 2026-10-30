import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  GooglePlacesAutocomplete,
  type GooglePlacesAutocompleteRef,
} from 'react-native-google-places-autocomplete';
import MapView, {
  type LongPressEvent,
  type Region,
} from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Crosshair, MapPin, Search } from 'lucide-react-native';

import TileMapSurface, { type TileMapHandle } from './TileMapSurface';
import type { LocationResult } from '../../types/location';
import { BHUBANESWAR_DEFAULT, getGoogleMapsApiKey } from '../../utils/googleMaps';
import { getNativeMapProvider } from '../../utils/mapProvider';
import {
  LOCATION_ACCENT,
  parseLocationFromPlaceDetails,
  reverseGeocodeToLocation,
} from '../../utils/googlePlaces';
import { formatLocationDisplay } from '../../utils/readableAddress';
import { ensureForegroundLocation } from '../../utils/locationPermission';
import { colors, shadows, typography } from '../../theme';

const MAP_PROVIDER = getNativeMapProvider();
const REVERSE_GEOCODE_DEBOUNCE_MS = 500;

export type LocationPickerInitialMode = 'search' | 'map';

export interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelected: (location: LocationResult) => void;
  title?: string;
  confirmLabel?: string;
  /** `search` opens Places first; `map` opens the drag-pin map first. */
  initialMode?: LocationPickerInitialMode;
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
  title = 'Pick on map',
  confirmLabel = 'Use this location',
  initialMode = 'map',
  initialLocation,
  accentColor = LOCATION_ACCENT,
}: LocationPickerModalProps) {
  const apiKey = getGoogleMapsApiKey();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const tileRef = useRef<TileMapHandle>(null);
  const [nativeMapReady, setNativeMapReady] = useState(false);
  const searchRef = useRef<GooglePlacesAutocompleteRef>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geoSeqRef = useRef(0);
  const regionRef = useRef<Region>({
    latitude: initialLocation?.latitude ?? BHUBANESWAR_DEFAULT.latitude,
    longitude: initialLocation?.longitude ?? BHUBANESWAR_DEFAULT.longitude,
    latitudeDelta: BHUBANESWAR_DEFAULT.latitudeDelta,
    longitudeDelta: BHUBANESWAR_DEFAULT.longitudeDelta,
  });

  const [selected, setSelected] = useState<LocationResult | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  /** Soft Places failure — never wipe the whole search screen. */
  const [placesHint, setPlacesHint] = useState<string | null>(
    apiKey ? null : 'Address search needs a Maps key on this build.',
  );
  const [sheetHeight, setSheetHeight] = useState(230);
  const pinLift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(pinLift, {
      toValue: isMapMoving ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [isMapMoving, pinLift]);

  const resolveRegion = useCallback(async (region: Region) => {
    const seq = ++geoSeqRef.current;
    setIsGeocoding(true);
    try {
      const location = await reverseGeocodeToLocation(region.latitude, region.longitude);
      if (seq !== geoSeqRef.current) return;
      setSelected(location);
    } finally {
      if (seq === geoSeqRef.current) setIsGeocoding(false);
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
      tileRef.current?.animateToRegion(region, 400);
      void resolveRegion(region);
    },
    [resolveRegion],
  );

  useEffect(() => {
    if (!visible) {
      setShowSearch(false);
      setIsMapMoving(false);
      setNativeMapReady(false);
      return;
    }

    setShowSearch(initialMode === 'search');
    setPlacesHint(apiKey ? null : 'Address search needs a Maps key on this build.');
    const lat = initialLocation?.latitude ?? BHUBANESWAR_DEFAULT.latitude;
    const lng = initialLocation?.longitude ?? BHUBANESWAR_DEFAULT.longitude;
    const region: Region = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: BHUBANESWAR_DEFAULT.latitudeDelta,
      longitudeDelta: BHUBANESWAR_DEFAULT.longitudeDelta,
    };
    regionRef.current = region;
    const frame = requestAnimationFrame(() => {
      mapRef.current?.animateToRegion(region, 0);
      tileRef.current?.animateToRegion(region, 0);
    });
    void resolveRegion(region);
    return () => cancelAnimationFrame(frame);
  }, [
    visible,
    initialMode,
    initialLocation?.latitude,
    initialLocation?.longitude,
    resolveRegion,
    apiKey,
  ]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleRegionChange = useCallback((_region: Region, details?: { isGesture?: boolean }) => {
    if (details?.isGesture) setIsMapMoving(true);
  }, []);

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      regionRef.current = region;
      setIsMapMoving(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void resolveRegion(region);
      }, REVERSE_GEOCODE_DEBOUNCE_MS);
    },
    [resolveRegion],
  );

  /** Rapido/Uber-style: long-press drops the pin on that exact spot (map recenters). */
  const handleMapLongPress = useCallback(
    (event: LongPressEvent) => {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      animateTo(latitude, longitude);
    },
    [animateTo],
  );

  const handlePlaceSelect = useCallback(
    (data: { place_id?: string; description?: string }, details: unknown) => {
      const location = parseLocationFromPlaceDetails(
        data,
        details as Parameters<typeof parseLocationFromPlaceDetails>[1],
      );
      if (!location) {
        setPlacesHint('Could not open that place. Try another result or pick on the map.');
        return;
      }
      setPlacesHint(null);
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
      const allowed = await ensureForegroundLocation();
      if (!allowed) {
        setPlacesHint('Location is off. Drag the pin, or turn on location in Settings.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setShowSearch(false);
      setPlacesHint(null);
      animateTo(position.coords.latitude, position.coords.longitude);
    } catch {
      setPlacesHint('Could not read GPS. Drag the pin on the map instead.');
    } finally {
      setIsLocating(false);
    }
  }, [animateTo]);

  const switchToMap = useCallback(() => {
    setShowSearch(false);
    setPlacesHint(null);
  }, []);

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

  const closeSearch = () => {
    if (initialMode === 'search') {
      onClose();
    } else {
      setShowSearch(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          provider={MAP_PROVIDER}
          style={StyleSheet.absoluteFill}
          initialRegion={mapRegion}
          onRegionChange={handleRegionChange}
          onRegionChangeComplete={handleRegionChangeComplete}
          onLongPress={handleMapLongPress}
          onMapReady={() => setNativeMapReady(true)}
          showsUserLocation
          showsMyLocationButton={false}
          rotateEnabled={false}
          pitchEnabled={false}
        />

        {/* Peach / web have no native map tiles. This surface keeps drag + long-press working. */}
        {!nativeMapReady && !showSearch ? (
          <TileMapSurface
            ref={tileRef}
            initialRegion={mapRegion}
            onRegionChange={handleRegionChange}
            onRegionChangeComplete={handleRegionChangeComplete}
            onLongPress={(latitude, longitude) => animateTo(latitude, longitude)}
          />
        ) : null}

        {/* Center pin — Rapido pattern: map pans under a fixed pin; long-press also drops here */}
        {!showSearch ? (
          <Animated.View
            style={[
              styles.centerPinWrap,
              {
                transform: [
                  {
                    translateY: pinLift.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -14],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents="none">
            <View style={[styles.pinBubble, shadows.cardSoft]}>
              <Text style={styles.pinBubbleText} numberOfLines={1}>
                {isMapMoving
                  ? 'Release to set'
                  : isGeocoding
                    ? 'Finding address...'
                    : addressParts.title || 'Move map to pin'}
              </Text>
            </View>
            <MapPin size={42} color={accentColor} fill={accentColor} strokeWidth={1.5} />
            <View style={styles.pinShadow} />
          </Animated.View>
        ) : null}

        {/* Header matches AppStackHeader: left back + left title + right action */}
        {!showSearch ? (
          <View style={[styles.headerBar, { paddingTop: insets.top + 6 }]}>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back">
              <ArrowLeft size={22} color={colors.dark} strokeWidth={2.4} />
            </Pressable>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                Drag map or long-press to set
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setPlacesHint(apiKey ? null : 'Address search needs a Maps key on this build.');
                setShowSearch(true);
              }}
              hitSlop={12}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel="Search location">
              <Search size={20} color={accentColor} strokeWidth={2.3} />
            </Pressable>
          </View>
        ) : null}

        {/* GPS FAB — map mode only */}
        {!showSearch ? (
          <Pressable
            onPress={() => void handleCurrentLocation()}
            disabled={isLocating}
            style={[styles.gpsBtn, shadows.cardSoft, { bottom: sheetHeight + 16 }]}>
            {isLocating ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
              <Crosshair size={22} color={accentColor} strokeWidth={2.5} />
            )}
          </Pressable>
        ) : null}

        {/* Search overlay — keeps field + dropdown; never a blank dead page */}
        {showSearch ? (
          <View style={[styles.searchOverlay, { paddingTop: insets.top + 6 }]}>
            <View style={styles.searchHeader}>
              <Pressable
                onPress={closeSearch}
                hitSlop={8}
                style={styles.headerBtn}
                accessibilityRole="button"
                accessibilityLabel="Go back">
                <ArrowLeft size={22} color={colors.dark} strokeWidth={2.4} />
              </Pressable>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Search location
                </Text>
              </View>
              <View style={{ width: 44 }} />
            </View>

            {apiKey ? (
              <GooglePlacesAutocomplete
                ref={searchRef}
                placeholder="Area, landmark or address"
                fetchDetails
                enablePoweredByContainer={false}
                minLength={2}
                debounce={300}
                predefinedPlaces={[]}
                textInputProps={{
                  placeholderTextColor: colors.grey,
                  autoFocus: true,
                  underlineColorAndroid: 'transparent',
                }}
                onPress={(data, details = null) => handlePlaceSelect(data, details)}
                onFail={() =>
                  setPlacesHint(
                    'Suggestions are unavailable right now. Check your connection, or pick on the map.',
                  )
                }
                onNotFound={() =>
                  setPlacesHint('No matching places. Try a shorter name, or pick on the map.')
                }
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
                  description: { color: colors.dark },
                }}
                renderLeftButton={() => (
                  <Search size={18} color={colors.grey} strokeWidth={2} style={{ marginRight: 8 }} />
                )}
                renderRow={rowData => (
                  <View style={styles.suggestionRow}>
                    <View style={styles.suggestionPin}>
                      <MapPin size={16} color={accentColor} strokeWidth={2.2} />
                    </View>
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
                keyboardShouldPersistTaps="handled"
                listViewDisplayed="auto"
                keepResultsAfterBlur={false}
                GooglePlacesDetailsQuery={{
                  fields: 'formatted_address,geometry,address_components,place_id',
                }}
              />
            ) : (
              <View style={styles.searchInputContainer}>
                <Search size={18} color={colors.grey} strokeWidth={2} style={{ marginRight: 8 }} />
                <Text style={styles.searchInputDisabled}>Search unavailable on this build</Text>
              </View>
            )}

            {placesHint ? (
              <View style={styles.hintCard}>
                <Text style={styles.hintTitle}>Couldn’t load search results</Text>
                <Text style={styles.hintBody}>{placesHint}</Text>
                <View style={styles.hintActions}>
                  <Pressable
                    onPress={switchToMap}
                    style={[styles.hintBtnPrimary, { backgroundColor: accentColor }]}>
                    <MapPin size={16} color={colors.dark} strokeWidth={2.3} />
                    <Text style={styles.hintBtnPrimaryLabel}>Pick on map</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void handleCurrentLocation()}
                    disabled={isLocating}
                    style={styles.hintBtnSecondary}>
                    {isLocating ? (
                      <ActivityIndicator size="small" color={accentColor} />
                    ) : (
                      <Crosshair size={16} color={accentColor} strokeWidth={2.4} />
                    )}
                    <Text style={styles.hintBtnSecondaryLabel}>Use GPS</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Text style={styles.searchHelp}>
                Type at least 2 letters — matching places appear in the list below.
              </Text>
            )}
          </View>
        ) : null}

        {/* Bottom sheet — map pin confirmation */}
        {!showSearch ? (
          <View
            style={[
              styles.bottomSheet,
              shadows.cardSoft,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
            onLayout={event => setSheetHeight(event.nativeEvent.layout.height)}>
            <Text style={styles.sheetLabel}>Selected location</Text>
            <Text style={styles.sheetSubtitle}>
              Drag the map, or long-press to drop the pin
            </Text>

            <Pressable
              onPress={() => {
                setPlacesHint(apiKey ? null : 'Address search needs a Maps key on this build.');
                setShowSearch(true);
              }}
              style={styles.addressCard}
              disabled={isGeocoding}
              accessibilityRole="button"
              accessibilityLabel="Edit location by search">
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
                <Search size={16} color={accentColor} strokeWidth={2.3} />
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
        ) : null}
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
    textDecorationLine: 'none',
  },
  pinShadow: {
    width: 10,
    height: 4,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.25)',
    marginTop: 2,
  },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    elevation: 30,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    backgroundColor: colors.pageBg ?? colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: typography.weights.extrabold,
    color: colors.dark,
    lineHeight: 22,
    letterSpacing: -0.3,
    textAlign: 'left',
    textDecorationLine: 'none',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: colors.grey,
    lineHeight: 15,
    textAlign: 'left',
    textDecorationLine: 'none',
  },
  gpsBtn: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  searchOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    zIndex: 40,
    paddingHorizontal: 16,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  autocompleteContainer: {
    flex: 0,
    zIndex: 50,
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
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    textDecorationLine: 'none',
  },
  searchInputDisabled: {
    flex: 1,
    fontSize: 14,
    color: colors.grey,
    textDecorationLine: 'none',
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
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  searchHelp: {
    marginTop: 14,
    fontSize: 13,
    color: colors.grey,
    lineHeight: 18,
    textDecorationLine: 'none',
  },
  hintCard: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  hintTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.dark,
    textDecorationLine: 'none',
  },
  hintBody: {
    fontSize: 13,
    color: colors.grey,
    lineHeight: 18,
    textDecorationLine: 'none',
  },
  hintActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  hintBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  hintBtnPrimaryLabel: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.dark,
    textDecorationLine: 'none',
  },
  hintBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: colors.background,
    paddingHorizontal: 10,
  },
  hintBtnSecondaryLabel: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.dark,
    textDecorationLine: 'none',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  suggestionPin: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(245,158,11,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  suggestionMain: {
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    color: colors.dark,
    textDecorationLine: 'none',
  },
  suggestionSecondary: {
    marginTop: 2,
    fontSize: 12,
    color: colors.grey,
    textDecorationLine: 'none',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
    zIndex: 10,
  },
  sheetLabel: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.grey,
    textDecorationLine: 'none',
  },
  sheetSubtitle: {
    fontSize: 13,
    color: colors.grey,
    marginBottom: 6,
    textDecorationLine: 'none',
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
    textDecorationLine: 'none',
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.dark,
    marginBottom: 2,
    textDecorationLine: 'none',
  },
  addressSubtitle: {
    fontSize: 13,
    color: colors.grey,
    lineHeight: 18,
    textDecorationLine: 'none',
  },
  searchIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245,158,11,0.12)',
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
    textDecorationLine: 'none',
  },
});
