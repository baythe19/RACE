import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import SosButton from '../../components/dashboard/SosButton';
import LoadingState from '../../components/ui/LoadingState';
import PrimaryButton from '../../components/ui/PrimaryButton';
import Screen, { Card, ScreenContent } from '../../components/ui/Screen';
import { useAppDialog } from '../../hooks/useAppDialog';
import { useAppSelector } from '../../redux/hooks';
import { getApiErrorMessage } from '../../services/api/apiClient';
import {
  useSosAlertMutation,
  useSosConfigQuery,
  useSosContextQuery,
} from '../../services/sos/useSosQueries';
import type { ProfileStackParamList } from '../../types/navigation';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'EmergencySos'>;

export default function EmergencySosScreen({}: Props) {
  const user = useAppSelector((state) => state.auth.user);
  const { dialog, showDialog } = useAppDialog();
  const { data: config } = useSosConfigQuery();
  const { data: context, isLoading } = useSosContextQuery(undefined, Boolean(user));
  const sosAlert = useSosAlertMutation();

  const emergencyContact = context?.emergencyContact
    ? `${context.emergencyContact.name} (${context.emergencyContact.mobileNumber})`
    : user?.emergencyContact?.name
      ? `${user.emergencyContact.name} (${user.emergencyContact.mobileNumber})`
      : 'Not set — update in profile';

  const supportPhone = config?.supportPhone ?? config?.emergencyPhone ?? '';
  const vehicleId = context?.vehicle?.id;

  const triggerAction = (
    action: 'sos' | 'towing' | 'ambulance' | 'share_location' | 'notify_contacts',
    successTitle: string,
  ) => {
    if (sosAlert.isPending) return;
    sosAlert.mutate(
      { action, vehicleId, address: 'Current location' },
      {
        onSuccess: (result) => {
          showDialog({
            tone: 'success',
            title: successTitle,
            message: result.message,
            primaryLabel: 'OK',
          });
        },
        onError: (error) => {
          showDialog({
            tone: 'error',
            title: 'Request failed',
            message: getApiErrorMessage(error),
            primaryLabel: 'OK',
          });
        },
      },
    );
  };

  if (isLoading && !context) {
    return (
      <Screen backgroundColor={colors.surfaceDarker}>
        <LoadingState message="Loading emergency context..." />
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={colors.surfaceDarker}>
      <SafeAreaView style={styles.safe}>
        {dialog}
        <ScrollView contentContainerStyle={styles.scroll}>
          <ScreenContent>
            <Text style={styles.title}>Emergency SOS</Text>
            <Text style={styles.subtitle}>Immediate help when you need it most</Text>

            {context?.vehicle ? (
              <Text style={styles.vehicle}>
                Vehicle: {context.vehicle.label} · {context.vehicle.number}
              </Text>
            ) : null}

            <View style={styles.sosWrap}>
              <SosButton />
            </View>

            <Card dark style={styles.card}>
              <PrimaryButton
                label="Call Support"
                onPress={() => supportPhone && Linking.openURL(`tel:${supportPhone.replace(/\s/g, '')}`)}
              />
            </Card>
            <Card dark style={styles.card}>
              <PrimaryButton
                label="Request Emergency Tow"
                onPress={() => triggerAction('towing', 'Towing Requested')}
                variant="outline"
              />
            </Card>
            <Card dark style={styles.card}>
              <PrimaryButton
                label="Share Live Location"
                onPress={() => triggerAction('share_location', 'Location Shared')}
                variant="outline"
              />
            </Card>
            <Card dark style={styles.card}>
              <PrimaryButton
                label="Notify Emergency Contact"
                onPress={() => triggerAction('notify_contacts', 'Contact Notified')}
                variant="outline"
              />
            </Card>

            <Text style={styles.contactLabel}>Emergency contact: {emergencyContact}</Text>
          </ScreenContent>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  title: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.textLight, textAlign: 'center' },
  subtitle: { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  vehicle: { color: colors.primary, textAlign: 'center', marginBottom: spacing.md },
  sosWrap: { alignItems: 'center', marginBottom: spacing.xl },
  card: { marginBottom: spacing.md },
  contactLabel: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg, fontSize: typography.sizes.sm },
});
