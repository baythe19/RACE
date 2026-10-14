import { PartnerText, PartnerTextInput } from '../partner/PartnerText';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapPin } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SERVICEABLE_AREAS } from '../../config/serviceableAreas';
import { formatLocationDisplay } from '../../utils/readableAddress';
import { useLocationStore } from '../../store/locationStore';
import { colors, shadows, typography } from '../../theme';

const NOTIFY_EMAIL_KEY = 'race-location-notify-email';

interface NotServiceableScreenProps {
  onChangeLocation: () => void;
}

export default function NotServiceableScreen({ onChangeLocation }: NotServiceableScreenProps) {
  const selectedLocation = useLocationStore(state => state.selectedLocation);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const availableCities = SERVICEABLE_AREAS.filter(city => !city.comingSoon);
  const comingSoonCities = SERVICEABLE_AREAS.filter(city => city.comingSoon);

  const handleNotify = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Valid email needed', 'Enter a valid email so we can notify you.');
      return;
    }

    setIsSaving(true);
    try {
      await AsyncStorage.setItem(
        NOTIFY_EMAIL_KEY,
        JSON.stringify({
          email: trimmed,
          address: selectedLocation?.address ?? '',
          savedAt: new Date().toISOString(),
        }),
      );
      setSubmitted(true);
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <PartnerText style={styles.illustration}>🚗</PartnerText>

          <PartnerText style={styles.title}>We're not in your area yet</PartnerText>
          <PartnerText style={styles.subtitle}>
            RACE is currently available in limited cities. Change your location or leave your email
            to get notified.
          </PartnerText>

          <View style={[styles.card, shadows.card]}>
            <PartnerText style={styles.cardTitle}>RACE is currently available in:</PartnerText>
            {availableCities.map(city => (
              <PartnerText key={city.name} style={styles.cityLine}>
                • {city.displayName}, {city.state}
              </PartnerText>
            ))}
            {comingSoonCities.map(city => (
              <PartnerText key={city.name} style={[styles.cityLine, styles.comingSoon]}>
                • {city.displayName} (Coming Soon)
              </PartnerText>
            ))}
          </View>

          {selectedLocation ? (
            <View style={styles.selectedBox}>
              <PartnerText style={styles.selectedLabel}>Selected location</PartnerText>
              <View style={styles.selectedRow}>
                <MapPin size={16} color={colors.primary} strokeWidth={2.2} />
                <PartnerText style={styles.selectedAddress} numberOfLines={3}>
                  {formatLocationDisplay({
                    address: selectedLocation.address,
                    displayLabel: selectedLocation.displayName,
                  })}
                </PartnerText>
              </View>
            </View>
          ) : null}

          <Pressable style={styles.changeBtn} onPress={onChangeLocation}>
            <PartnerText style={styles.changeBtnText}>Change Location</PartnerText>
          </Pressable>

          <View style={styles.notifySection}>
            <PartnerText style={styles.notifyTitle}>Notify me when RACE launches in my city</PartnerText>
            {submitted ? (
              <View style={styles.thanksBox}>
                <PartnerText style={styles.thanksText}>We'll notify you!</PartnerText>
              </View>
            ) : (
              <View style={styles.notifyRow}>
                <PartnerTextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email"
                  placeholderTextColor={colors.grey}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.emailInput}
                />
                <Pressable
                  style={[styles.notifyBtn, isSaving && { opacity: 0.7 }]}
                  onPress={() => void handleNotify()}
                  disabled={isSaving}>
                  <PartnerText style={styles.notifyBtnText}>{isSaving ? '...' : 'Submit'}</PartnerText>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    alignItems: 'center',
  },
  illustration: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: typography.weights.extrabold,
    color: colors.dark,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: colors.grey,
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.dark,
    marginBottom: 10,
  },
  cityLine: {
    fontSize: 14,
    color: colors.dark,
    marginBottom: 6,
    lineHeight: 20,
  },
  comingSoon: {
    color: colors.grey,
  },
  selectedBox: {
    width: '100%',
    marginBottom: 20,
  },
  selectedLabel: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.grey,
    marginBottom: 8,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.lightGrey,
    borderRadius: 12,
    padding: 12,
  },
  selectedAddress: {
    flex: 1,
    fontSize: 14,
    color: colors.dark,
    lineHeight: 20,
  },
  changeBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  changeBtnText: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  notifySection: {
    width: '100%',
  },
  notifyTitle: {
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    color: colors.dark,
    marginBottom: 12,
  },
  notifyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  emailInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.dark,
    backgroundColor: colors.background,
  },
  notifyBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyBtnText: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.background,
  },
  thanksBox: {
    borderRadius: 12,
    backgroundColor: colors.goldLight,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  thanksText: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
});
