import { PartnerText, PartnerTextInput } from '../partner/PartnerText';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_DEFAULT, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Crosshair, MapPin, Search } from 'lucide-react-native';

import { BHUBANESWAR_DEFAULT, forwardGeocode, reverseGeocode } from '../../utils/googleMaps';
import { formatLocationDisplay } from '../../utils/readableAddress';
import { getCurrentPositionWhenAllowed } from '../../utils/locationPermission';
import { colors, shadows, typography } from '../../theme';

const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

export interface SelectedLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export interface LocationPickerMapProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelected: (location: SelectedLocation) => void;
  title: string;
  initialLocation?: { latitude: number; longitude: number };
  accentColor?: string;
}

const REVERSE_GEOCODE_DEBOUNCE_MS = 500;

export default function LocationPickerMap({
  visible,
  onClose,
  onLocationSelected,
  title,
  initialLocation,
  accentColor = colors.primary,
}: LocationPickerMapProps) {
  const mapRef = useRef<MapView>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const regionRef = useRef<Region>({
    ...BHUBANESWAR_DEFAULT,
    latitude: initialLocation?.latitude ?? BHUBANESWAR_DEFAULT.latitude,
    longitude: initialLocation?.longitude ?? BHUBANESWAR_DEFAULT.longitude,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [address, setAddress] = useState('');

  const updateAddressForRegion = useCallback(async (region: Region) => {
    setIsGeocoding(true);
    try {
      const formatted = await reverseGeocode(region.latitude, region.longitude);
      setAddress(formatted);
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
      void updateAddressForRegion(region);
    },
    [updateAddressForRegion],
  );

  useEffect(() => {
    if (!visible) return;

    const lat = initialLocation?.latitude ?? BHUBANESWAR_DEFAULT.latitude;
    const lng = initialLocation?.longitude ?? BHUBANESWAR_DEFAULT.longitude;
    regionRef.current = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: BHUBANESWAR_DEFAULT.latitudeDelta,
      longitudeDelta: BHUBANESWAR_DEFAULT.longitudeDelta,
    };
    void updateAddressForRegion(regionRef.current);
  }, [visible, initialLocation?.latitude, initialLocation?.longitude, updateAddressForRegion]);

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
        void updateAddressForRegion(region);
      }, REVERSE_GEOCODE_DEBOUNCE_MS);
    },
    [updateAddressForRegion],
  );

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const result = await forwardGeocode(searchQuery);
      if (result) {
        animateTo(result.latitude, result.longitude);
        setAddress(result.address);
      } else {
        Alert.alert('Not found', 'Could not find that location. Try a different search.');
      }
    } finally {
      setIsSearching(false);
    }
  }, [animateTo, searchQuery]);

  const handleCurrentLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const position = await getCurrentPositionWhenAllowed(Location.Accuracy.High);
      if (!position) {
        Alert.alert(
          'Location access denied',
          'Location access denied. Please search or move map manually.',
        );
        return;
      }
      animateTo(position.coords.latitude, position.coords.longitude);
    } catch {
      Alert.alert('Location error', 'Unable to get your location. Please search or move the map.');
    } finally {
      setIsLocating(false);
    }
  }, [animateTo]);

  const handleConfirm = useCallback(() => {
    const region = regionRef.current;
    onLocationSelected({
      address: address || 'Selected location',
      latitude: region.latitude,
      longitude: region.longitude,
    });
  }, [address, onLocationSelected]);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.headerSide}>
            <ArrowLeft size={24} color={colors.dark} strokeWidth={2.5} />
          </Pressable>
          <PartnerText style={styles.headerTitle} numberOfLines={1}>
            {title}
          </PartnerText>
          <View style={styles.headerSide} />
        </View>

        <View style={styles.searchRow}>
          <Search size={18} color={colors.grey} />
          <PartnerTextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search location..."
            placeholderTextColor={colors.grey}
            returnKeyType="search"
            onSubmitEditing={() => void handleSearch()}
            style={styles.searchInput}
          />
          {isSearching ? <ActivityIndicator size="small" color={accentColor} /> : null}
        </View>

        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            provider={MAP_PROVIDER}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: initialLocation?.latitude ?? BHUBANESWAR_DEFAULT.latitude,
              longitude: initialLocation?.longitude ?? BHUBANESWAR_DEFAULT.longitude,
              latitudeDelta: BHUBANESWAR_DEFAULT.latitudeDelta,
              longitudeDelta: BHUBANESWAR_DEFAULT.longitudeDelta,
            }}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation
            showsMyLocationButton={false}
          />

          <View style={styles.pinWrap} pointerEvents="none">
            <MapPin size={40} color={accentColor} fill={accentColor} />
            <View style={styles.pinShadow} />
          </View>

          <Pressable
            onPress={() => void handleCurrentLocation()}
            style={[styles.locateBtn, shadows.card]}
            disabled={isLocating}>
            {isLocating ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
              <Crosshair size={22} color={accentColor} strokeWidth={2.5} />
            )}
          </Pressable>
        </View>

        <View style={[styles.bottomSheet, shadows.card]}>
          <PartnerText style={styles.addressLabel}>Selected address</PartnerText>
          {isGeocoding ? (
            <View style={styles.addressLoading}>
              <ActivityIndicator size="small" color={accentColor} />
              <PartnerText style={styles.addressLoadingText}>Getting address...</PartnerText>
            </View>
          ) : (
            <PartnerText style={styles.addressText} numberOfLines={3}>
              {address ? formatLocationDisplay(address) : 'Move the map to select a location'}
            </PartnerText>
          )}

          <Pressable
            onPress={handleConfirm}
            disabled={isGeocoding}
            style={[
              styles.confirmBtn,
              { backgroundColor: isGeocoding ? colors.grey : accentColor },
            ]}>
            <PartnerText style={styles.confirmLabel}>Use this location</PartnerText>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerSide: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.dark,
    padding: 0,
  },
  mapWrap: {
    flex: 1,
    position: 'relative',
  },
  pinWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -44,
    alignItems: 'center',
  },
  pinShadow: {
    width: 10,
    height: 4,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.25)',
    marginTop: 2,
  },
  locateBtn: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheet: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: 12,
  },
  addressLabel: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.grey,
  },
  addressLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
  },
  addressLoadingText: {
    fontSize: 14,
    color: colors.grey,
  },
  addressText: {
    fontSize: 15,
    fontWeight: typography.weights.semibold,
    color: colors.dark,
    lineHeight: 22,
    minHeight: 48,
  },
  confirmBtn: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLabel: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
});
