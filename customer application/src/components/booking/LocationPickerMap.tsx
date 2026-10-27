import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { PROVIDER_DEFAULT, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Crosshair, Edit3, MapPin, Search } from 'lucide-react-native';

import { BHUBANESWAR_DEFAULT, forwardGeocode, reverseGeocode } from '../../utils/googleMaps';
import { formatLocationDisplay } from '../../utils/readableAddress';
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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location access denied',
          'Location access denied. Please search or move map manually.',
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
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
        {/* Top Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.headerSide}>
            <ArrowLeft size={22} color={colors.dark} strokeWidth={2.4} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.headerSide} />
        </View>

        {/* Map Wrap */}
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

          {/* Floating Search Bar */}
          <View style={[styles.searchRow, shadows.card]}>
            <Search size={18} color={colors.grey} strokeWidth={2} />
            <TextInput
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

          {/* Center Pin + Blue accuracy ring */}
          <View style={styles.pinWrap} pointerEvents="none">
            <MapPin size={42} color={accentColor} fill={accentColor} strokeWidth={1.5} />
            {/* Accuracy ring with center blue dot */}
            <View style={styles.accuracyCircle}>
              <View style={styles.accuracyDot} />
            </View>
          </View>

          {/* Floating Current Location Button */}
          <Pressable
            onPress={() => void handleCurrentLocation()}
            style={[styles.locateBtn, shadows.card]}
            disabled={isLocating}>
            {isLocating ? (
              <ActivityIndicator size="small" color={colors.dark} />
            ) : (
              <Crosshair size={22} color={colors.dark} strokeWidth={2.2} />
            )}
          </Pressable>
        </View>

        {/* Bottom Sheet Card */}
        <View style={[styles.bottomSheet, shadows.card]}>
          <Text style={styles.addressLabel}>Selected location</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 6 }}>
            {isGeocoding ? (
              <View style={styles.addressLoading}>
                <ActivityIndicator size="small" color={accentColor} />
                <Text style={styles.addressLoadingText}>Getting address...</Text>
              </View>
            ) : (
              <Text style={styles.addressText} numberOfLines={2}>
                {address ? formatLocationDisplay(address) : 'Bhubaneswar, Odisha'}
              </Text>
            )}
            <Pressable hitSlop={8} style={{ padding: 4 }}>
              <Edit3 size={18} color={colors.grey} strokeWidth={2} />
            </Pressable>
          </View>

          <Pressable
            onPress={handleConfirm}
            disabled={isGeocoding}
            style={[
              styles.confirmBtn,
              { backgroundColor: isGeocoding ? '#E5E7EB' : accentColor },
            ]}>
            <Text style={styles.confirmLabel}>Use this location</Text>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.background,
  },
  headerSide: {
    width: 36,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: typography.weights.extrabold,
    color: colors.dark,
  },
  mapWrap: {
    flex: 1,
    position: 'relative',
  },
  searchRow: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.background,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.dark,
    padding: 0,
  },
  pinWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -21,
    marginTop: -52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accuracyCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(59, 130, 246, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
  },
  accuracyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  locateBtn: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  bottomSheet: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.background,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.grey,
  },
  addressLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  addressLoadingText: {
    fontSize: 14,
    color: colors.grey,
  },
  addressText: {
    flex: 1,
    fontSize: 18,
    fontWeight: typography.weights.extrabold,
    color: colors.dark,
    lineHeight: 24,
    paddingRight: 8,
  },
  confirmBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  confirmLabel: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
});
