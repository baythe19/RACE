import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GoldButton from '../auth/GoldButton';
import { VEHICLE_YELLOW, VehicleEmergencyQrThumb } from './vehicleUi';
import {
  downloadVehicleQrPng,
  openVehicleEmergencyPageInBrowser,
  shareVehicleQr,
} from '../../utils/vehicleQrExport';
import type { Vehicle } from '../../types/vehicle';
import { formatVehicleNumber } from '../../utils/vehicleFormat';
import { colors, shadows, typography } from '../../theme';

type Props = {
  vehicle: Vehicle;
  px: (n: number) => number;
  /** Parent already shows plate / model — skip duplicate lines under QR. */
  showMeta?: boolean;
};

export default function VehicleEmergencyQrPanel({
  vehicle,
  px,
  showMeta = true,
}: Props) {
  const [busy, setBusy] = useState(false);

  const runDownload = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await downloadVehicleQrPng(vehicle);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={[
        styles.wrap,
        { borderRadius: px(16), padding: px(16), marginBottom: px(14) },
        shadows.card,
      ]}>
      <View style={{ alignItems: 'center', marginBottom: px(14) }}>
        <View
          style={{
            padding: px(10),
            borderRadius: px(12),
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: '#FFFFFF',
          }}>
          <VehicleEmergencyQrThumb
            vehicleId={vehicle.id}
            qrCodeDataUrl={vehicle.qrCode}
            size={px(200)}
          />
        </View>
        {showMeta ? (
          <>
            <Text
              style={{
                marginTop: px(10),
                fontSize: px(16),
                fontWeight: typography.weights.bold,
                color: colors.dark,
              }}>
              {formatVehicleNumber(vehicle.vehicleNumber)}
            </Text>
            <Text style={{ marginTop: px(2), fontSize: px(12), color: colors.grey }}>
              {vehicle.brand} {vehicle.model}
            </Text>
          </>
        ) : null}
      </View>

      <Text
        style={{
          fontSize: px(12),
          color: colors.grey,
          lineHeight: px(18),
          textAlign: 'center',
          marginBottom: px(14),
        }}>
        Windshield sticker — scan opens emergency help for this vehicle.
      </Text>

      <GoldButton
        label={busy ? 'Saving…' : 'Download QR'}
        onPress={() => void runDownload()}
        disabled={busy}
        height={px(48)}
        borderRadius={px(12)}
        style={{ width: '100%', marginBottom: px(12) }}
        loading={busy}
      />

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: px(16),
          marginBottom: px(8),
        }}>
        <Pressable onPress={() => void shareVehicleQr(vehicle)} hitSlop={8}>
          <Text style={styles.link}>Share link</Text>
        </Pressable>
        <Text style={{ color: colors.border }}>·</Text>
        <Pressable
          onPress={() => void openVehicleEmergencyPageInBrowser(vehicle)}
          hitSlop={8}>
          <Text style={styles.link}>Open in browser</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  link: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: VEHICLE_YELLOW,
  },
});
