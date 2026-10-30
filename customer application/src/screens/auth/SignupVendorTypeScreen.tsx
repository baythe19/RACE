import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import GlassCard from '../../components/ui/GlassCard';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { VENDOR_TYPE_CONFIGS } from '../../data/vendorWizardConfig';
import { useAppDispatch } from '../../redux/hooks';
import { setSignupPath } from '../../redux/onboarding/onboardingSlice';
import { startVendorWizard } from '../../redux/vendor/vendorOnboardingSlice';
import type { AuthStackParamList } from '../../types/navigation';
import type { VendorType } from '../../types/vendor';
import { colors, spacing, typography } from '../../theme';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignupVendorType'>;

const VENDOR_ONLY: VendorType[] = ['towing_company'];
const DRIVER_ONLY: VendorType[] = ['tow_truck_driver', 'full_time_driver', 'part_time_driver'];

export default function SignupVendorTypeScreen({ navigation, route }: Props) {
  const accountType = route.params?.accountType ?? 'vendor';
  const dispatch = useAppDispatch();

  const options = VENDOR_TYPE_CONFIGS.filter(item =>
    accountType === 'vendor'
      ? VENDOR_ONLY.includes(item.type)
      : DRIVER_ONLY.includes(item.type),
  );

  const handleSelect = (vendorType: VendorType) => {
    dispatch(
      setSignupPath({
        accountType,
        vendorType,
      }),
    );
    dispatch(startVendorWizard({ vendorType }));
    navigation.navigate('MobileNumber');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          {accountType === 'vendor' ? 'Select business type' : 'Select driver type'}
        </Text>
        <Text style={styles.subtitle}>
          Document verification is required next — Aadhaar, PAN, licenses, and more.
        </Text>

        {options.map(item => (
          <TouchableOpacity key={item.type} onPress={() => handleSelect(item.type)} activeOpacity={0.88}>
            <GlassCard style={styles.card}>
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              <Text style={styles.steps}>{item.steps.length} steps · includes document upload</Text>
            </GlassCard>
          </TouchableOpacity>
        ))}

        <PrimaryButton label="Back" variant="outline" onPress={() => goBackWithinStack(navigation)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.pageBg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: {
    color: colors.dark,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.extrabold,
  },
  subtitle: { color: colors.grey, marginBottom: spacing.lg, marginTop: spacing.xs, lineHeight: 20 },
  card: { marginBottom: spacing.md, alignItems: 'center' },
  emoji: { fontSize: 36, marginBottom: spacing.sm },
  cardTitle: { color: colors.dark, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  cardSubtitle: { color: colors.grey, textAlign: 'center', marginTop: spacing.xs, lineHeight: 20 },
  steps: {
    color: colors.primaryDark,
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
});
