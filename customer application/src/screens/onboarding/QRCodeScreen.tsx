import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Hospital, Share2 } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import QRCodePlaceholder from '../../components/auth/QRCodePlaceholder';
import GoldButton from '../../components/auth/GoldButton';
import StepHeader from '../../components/auth/StepHeader';
import { QR_ACTIONS } from '../../constants/auth';
import { useAppDialog } from '../../hooks/useAppDialog';
import { useVehicleQuery } from '../../services/vehicles/useVehicleQueries';
import { formatFuelLabel } from '../../components/vehicles/vehicleUi';
import { getLucideIcon } from '../../utils/lucideIcon';
import type { AuthStackParamList } from '../../types/navigation';
import { colors, shadows, typography } from '../../theme';
import { finishCustomerOnboarding } from '../../utils/finishCustomerOnboarding';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

const REF_W = 390;

const ACTION_ICON_COLORS: Record<string, string> = {
  Phone: colors.primary,
  AlertCircle: colors.error,
  Truck: colors.primary,
  MapPin: colors.error,
  Hospital: colors.primary,
};

type Props = NativeStackScreenProps<AuthStackParamList, 'QRCode'>;

export default function QRCodeScreen({ navigation, route }: Props) {
  const { vehicleId, vehicleNumber } = route.params;
  const { dialog, showDialog } = useAppDialog();
  const { data: vehicle, isLoading } = useVehicleQuery(vehicleId);
  const { width } = useWindowDimensions();
  const s = width / REF_W;
  const px = (n: number) => Math.round(n * s);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const vehicleLine = vehicle
    ? `${vehicle.brand} ${vehicle.model} · ${vehicle.color ?? '—'} · ${formatFuelLabel(vehicle.fuelType)}`
    : 'Loading vehicle details...';

  const handleShare = () => {
    if (!vehicle?.qrCode) {
      showDialog({
        tone: 'warning',
        title: 'QR Code',
        message: 'QR code is not ready yet.',
        primaryLabel: 'OK',
      });
      return;
    }
    void Share.share({
      message: `RACE Emergency QR for ${vehicle.vehicleNumber}`,
      url: vehicle.qrCode,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {dialog}
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingHorizontal: px(24),
            paddingBottom: px(40),
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <StepHeader
          step={3}
          scale={s}
          onBack={() => goBackWithinStack(navigation)}
          showSkip={false}
        />

        <Animated.View
          style={[
            styles.successCircle,
            {
              width: px(80),
              height: px(80),
              borderRadius: px(40),
              marginBottom: px(18),
              transform: [{ scale: scaleAnim }],
            },
          ]}>
          <Check size={px(40)} color={colors.background} strokeWidth={3} />
        </Animated.View>

        <Text
          style={{
            fontSize: px(24),
            fontWeight: typography.weights.extrabold,
            color: colors.dark,
            textAlign: 'center',
          }}>
          Vehicle Registered!
        </Text>
        <Text
          style={{
            marginTop: px(6),
            marginBottom: px(22),
            fontSize: px(14),
            color: colors.grey,
            textAlign: 'center',
          }}>
          Your QR code has been generated.
        </Text>

        <View
          style={[
            styles.qrCard,
            shadows.card,
            {
              borderRadius: px(20),
              padding: px(22),
              marginBottom: px(22),
            },
          ]}>
          <Text
            style={{
              marginTop: px(8),
              marginBottom: px(16),
              fontSize: px(11),
              fontWeight: typography.weights.bold,
              color: colors.primary,
              letterSpacing: 1.2,
            }}>
            SCAN IN EMERGENCY
          </Text>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: px(40) }} />
          ) : vehicle?.qrCode ? (
            <Image
              source={{ uri: vehicle.qrCode }}
              style={{ width: px(190), height: px(190) }}
              resizeMode="contain"
            />
          ) : (
            <QRCodePlaceholder size={px(190)} scale={s} />
          )}
          <Text
            style={{
              marginTop: px(18),
              fontSize: px(18),
              fontWeight: typography.weights.extrabold,
              color: colors.dark,
              letterSpacing: 1.5,
            }}>
            {vehicle?.vehicleNumber ?? vehicleNumber}
          </Text>
          <Text
            style={{
              marginTop: px(4),
              fontSize: px(13),
              color: colors.grey,
              textAlign: 'center',
            }}>
            {vehicleLine}
          </Text>
        </View>

        <Text
          style={{
            fontSize: px(13),
            color: colors.grey,
            marginBottom: px(14),
            textAlign: 'center',
          }}>
          When scanned, anyone can:
        </Text>

        <View
          style={{
            width: '100%',
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: px(10),
            marginBottom: px(10),
          }}>
          {QR_ACTIONS.slice(0, 4).map(action => {
            const Icon = getLucideIcon(action.icon);
            const iconColor = ACTION_ICON_COLORS[action.icon] ?? colors.primary;
            return (
              <View
                key={action.label}
                accessibilityRole="text"
                style={{
                  width: '48%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: px(8),
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: px(20),
                  paddingHorizontal: px(12),
                  paddingVertical: px(10),
                }}>
                <Icon size={px(16)} color={iconColor} />
                <Text
                  style={{
                    fontSize: px(11),
                    fontWeight: typography.weights.semibold,
                    color: colors.dark,
                    flexShrink: 1,
                  }}>
                  {action.label}
                </Text>
              </View>
            );
          })}
        </View>

        <Pressable
          style={{
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: px(10),
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.primary,
            borderRadius: px(20),
            paddingHorizontal: px(16),
            paddingVertical: px(12),
            marginBottom: px(22),
          }}
          onPress={() => void Linking.openURL('tel:112')}
          accessibilityRole="button"
          accessibilityLabel="Call emergency 112">
          <Hospital size={px(18)} color={colors.primary} strokeWidth={2} />
          <Text
            style={{
              fontSize: px(12),
              fontWeight: typography.weights.semibold,
              color: colors.dark,
            }}>
            Emergency Help · Call 112
          </Text>
        </Pressable>

        <Pressable
          style={{
            width: '100%',
            minHeight: px(54),
            borderRadius: px(14),
            backgroundColor: colors.primary,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: px(10),
            marginBottom: px(24),
            ...shadows.card,
          }}
          onPress={handleShare}>
          <Share2 size={px(20)} color={colors.dark} />
          <Text
            style={{
              fontSize: px(17),
              fontWeight: typography.weights.bold,
              color: colors.dark,
            }}>
            Share QR Code
          </Text>
        </Pressable>

        <GoldButton
          label="Continue to RACE"
          onPress={() => void finishCustomerOnboarding()}
          style={{ width: '100%', marginTop: px(8), marginBottom: px(24), ...shadows.card }}
          height={px(52)}
          borderRadius={px(14)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
  },
  successCircle: {
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  qrCard: {
    width: '100%',
    backgroundColor: colors.cardBg,
    alignItems: 'center',
  },
  fullBtn: {
    width: '100%',
  },
});
