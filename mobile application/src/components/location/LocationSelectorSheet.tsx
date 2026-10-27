import { PartnerText } from '../partner/PartnerText';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Crosshair, Map as MapIcon, MapPin, Search } from 'lucide-react-native';

import { images } from '../../assets';
import { usePartnerDialog } from '../../hooks/usePartnerDialog';
import LocationPickerMap from '../booking/LocationPickerMap';
import { SERVICEABLE_AREAS } from '../../config/serviceableAreas';
import { useLocationStore } from '../../store/locationStore';
import { reverseGeocode } from '../../utils/googleMaps';
import { getCurrentPositionWhenAllowed } from '../../utils/locationPermission';
import { colors, shadows, typography } from '../../theme';

interface LocationSelectorSheetProps {
  visible: boolean;
  onLocationSelected: () => void;
  /** When false, sheet can be dismissed (returning user changing location). */
  dismissible?: boolean;
  onRequestClose?: () => void;
}

export default function LocationSelectorSheet({
  visible,
  onLocationSelected,
  dismissible = false,
  onRequestClose,
}: LocationSelectorSheetProps) {
  const { dialog: partnerDialog, showAlert } = usePartnerDialog();
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
      const position = await getCurrentPositionWhenAllowed();
      if (!position) {
        showAlert({
          tone: 'warning',
          title: 'Permission needed',
          message: 'Allow location access to use your current location, or search on the map.',
        });
        return;
      }
      const { latitude, longitude } = position.coords;
      const address = await reverseGeocode(latitude, longitude);
      applyLocation({ address, latitude, longitude });
    } catch {
      showAlert({ tone: 'error', title: 'Location error', message: 'Unable to get your current location. Try the map picker.' });
    } finally {
      setIsLocating(false);
    }
  }, [applyLocation, showAlert]);

  const handleCityChip = useCallback(
    (cityName: string) => {
      const city = SERVICEABLE_AREAS.find(area => area.name === cityName);
      if (!city) return;

      if (city.comingSoon) {
        showAlert({
          tone: 'info',
          title: 'Coming soon',
          message: `${city.displayName} is coming soon! We'll notify you when we launch there.`,
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
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <View style={styles.handle} />

            <Image
              source={images.logo}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="RACE"
            />

            <PartnerText style={styles.title}>Set your location</PartnerText>
            <PartnerText style={styles.subtitle}>
              Choose where you need help so we can show nearby services
            </PartnerText>

            <Pressable style={styles.searchBar} onPress={() => setShowMapPicker(true)}>
              <Search size={18} color={colors.grey} strokeWidth={2} />
              <PartnerText style={styles.searchPlaceholder}>Search your location...</PartnerText>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <PartnerText style={styles.dividerText}>or</PartnerText>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={[styles.actionRow, shadows.card]}
              onPress={() => void handleUseCurrentLocation()}
              disabled={isLocating}>
              {isLocating ? (
                <ActivityIndicator size="small" color={colors.dark} />
              ) : (
                <Crosshair size={20} color={colors.dark} strokeWidth={2.2} />
              )}
              <PartnerText style={styles.actionText}>
                {isLocating ? 'Getting your location...' : 'Use my current location'}
              </PartnerText>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <PartnerText style={styles.dividerText}>Select on map</PartnerText>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={[styles.actionRow, shadows.card]}
              onPress={() => setShowMapPicker(true)}>
              <MapIcon size={20} color={colors.dark} strokeWidth={2} />
              <PartnerText style={styles.actionText}>Open Map Picker</PartnerText>
            </Pressable>

            <PartnerText style={styles.popularLabel}>Popular cities</PartnerText>
            <View style={styles.chipsRow}>
              {SERVICEABLE_AREAS.map(city => (
                <Pressable
                  key={city.name}
                  style={[styles.chip, city.comingSoon && styles.chipSoon]}
                  onPress={() => handleCityChip(city.name)}>
                  <MapPin
                    size={14}
                    color={city.comingSoon ? colors.grey : colors.dark}
                    strokeWidth={2.2}
                  />
                  <PartnerText
                    style={[
                      styles.chipText,
                      city.comingSoon && { color: colors.grey },
                    ]}>
                    {city.displayName}
                    {city.comingSoon ? ' · Soon' : ''}
                  </PartnerText>
                </Pressable>
              ))}
            </View>
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
      {partnerDialog}
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  logo: {
    width: 132,
    height: 132 * (230 / 480),
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: typography.weights.extrabold,
    color: colors.dark,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: colors.grey,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.lightGrey,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: colors.grey,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: colors.grey,
    fontWeight: typography.weights.semibold,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: typography.weights.semibold,
    color: colors.dark,
  },
  popularLabel: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipSoon: {
    backgroundColor: colors.lightGrey,
  },
  chipText: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.dark,
  },
});
