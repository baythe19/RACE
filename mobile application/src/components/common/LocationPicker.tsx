import { PartnerText, PartnerTextInput } from '../partner/PartnerText';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GooglePlacesAutocomplete, type GooglePlacesAutocompleteRef } from 'react-native-google-places-autocomplete';

import type { LocationResult } from '../../types/location';
import { getGoogleMapsApiKey } from '../../utils/googleMaps';
import { LOCATION_ACCENT, parseLocationFromPlaceDetails } from '../../utils/googlePlaces';
import { formatLocationDisplay } from '../../utils/readableAddress';
import { colors, typography } from '../../theme';

export interface LocationPickerProps {
  placeholder: string;
  onLocationSelect: (location: LocationResult) => void;
  initialValue?: string;
}

export default function LocationPicker({
  placeholder,
  onLocationSelect,
  initialValue = '',
}: LocationPickerProps) {
  const apiKey = getGoogleMapsApiKey();
  const autocompleteRef = useRef<GooglePlacesAutocompleteRef>(null);
  const [focused, setFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState(initialValue);
  const [useFallback, setUseFallback] = useState(!apiKey);

  const handleSelect = useCallback(
    (data: { place_id?: string; description?: string }, details: unknown) => {
      const location = parseLocationFromPlaceDetails(data, details as Parameters<typeof parseLocationFromPlaceDetails>[1]);
      if (!location) {
        setUseFallback(true);
        return;
      }
      const displayLabel =
        location.displayLabel?.trim() || formatLocationDisplay(location.address);
      setDisplayValue(displayLabel);
      onLocationSelect(location);
    },
    [onLocationSelect],
  );

  const handleClear = useCallback(() => {
    setDisplayValue('');
    autocompleteRef.current?.setAddressText('');
  }, []);

  if (useFallback || !apiKey) {
    return (
      <View style={styles.wrapper}>
        <View
          style={[
            styles.inputRow,
            focused && styles.inputRowFocused,
          ]}>
          <Ionicons name="search" size={18} color={colors.grey} />
          <PartnerTextInput
            value={displayValue}
            onChangeText={setDisplayValue}
            placeholder={placeholder}
            placeholderTextColor={colors.grey}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={styles.fallbackInput}
          />
          {displayValue ? (
            <Pressable onPress={handleClear} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.grey} />
            </Pressable>
          ) : null}
        </View>
        <PartnerText style={styles.fallbackHint}>
          Enter your address manually. Google search is unavailable.
        </PartnerText>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <GooglePlacesAutocomplete
        ref={autocompleteRef}
        placeholder={placeholder}
        fetchDetails
        enablePoweredByContainer={false}
        minLength={2}
        debounce={300}
        predefinedPlaces={[]}
        textInputProps={{
          placeholderTextColor: colors.grey,
          onFocus: () => setFocused(true),
          onBlur: () => setFocused(false),
          clearButtonMode: 'never',
          defaultValue: initialValue,
        }}
        onPress={(data, details = null) => handleSelect(data, details)}
        onFail={() => setUseFallback(true)}
        onNotFound={() => undefined}
        query={{
          key: apiKey,
          language: 'en',
          components: 'country:in',
          types: 'geocode',
        }}
        styles={{
          container: styles.autocompleteContainer,
          textInputContainer: [
            styles.inputRow,
            focused && styles.inputRowFocused,
          ],
          textInput: styles.textInput,
          listView: styles.listView,
          row: styles.row,
          separator: styles.separator,
          description: styles.description,
          loader: styles.loader,
        }}
        renderLeftButton={() => (
          <View style={styles.leftIcon}>
            <Ionicons name="search" size={18} color={colors.grey} />
          </View>
        )}
        renderRightButton={() =>
          displayValue ? (
            <Pressable onPress={handleClear} hitSlop={8} style={styles.rightIcon}>
              <Ionicons name="close-circle" size={18} color={colors.grey} />
            </Pressable>
          ) : (
            <View style={styles.rightIcon} />
          )
        }
        renderRow={rowData => (
          <View style={styles.suggestionRow}>
            <PartnerText style={styles.suggestionIcon}>📍</PartnerText>
            <View style={styles.suggestionTextWrap}>
              <PartnerText style={styles.suggestionMain} numberOfLines={1}>
                {rowData.structured_formatting?.main_text ?? rowData.description}
              </PartnerText>
              {rowData.structured_formatting?.secondary_text ? (
                <PartnerText style={styles.suggestionSecondary} numberOfLines={1}>
                  {rowData.structured_formatting.secondary_text}
                </PartnerText>
              ) : null}
            </View>
          </View>
        )}
        keyboardShouldPersistTaps="always"
        listViewDisplayed
        GooglePlacesDetailsQuery={{ fields: 'formatted_address,geometry,address_components,place_id' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 999,
    elevation: 12,
    marginBottom: 12,
  },
  autocompleteContainer: {
    flex: 0,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    minHeight: 52,
  },
  inputRowFocused: {
    borderColor: LOCATION_ACCENT,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
    width: 18,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.dark,
    backgroundColor: 'transparent',
    height: 48,
    marginTop: 0,
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  fallbackInput: {
    flex: 1,
    fontSize: 15,
    color: colors.dark,
    paddingVertical: 0,
  },
  fallbackHint: {
    marginTop: 6,
    fontSize: 12,
    color: colors.grey,
  },
  listView: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    maxHeight: 220,
    zIndex: 1000,
    elevation: 14,
  },
  row: {
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  description: {
    color: colors.dark,
  },
  loader: {
    paddingVertical: 8,
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
});
