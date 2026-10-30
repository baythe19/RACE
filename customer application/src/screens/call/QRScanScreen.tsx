import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, ChevronLeft, RefreshCw, ScanLine } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { SOS_COLORS } from '../../constants/sosTheme';
import type { CallStackParamList } from '../../types/navigation';
import { typography } from '../../theme';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

const REF_W = 390;

type Props = NativeStackScreenProps<CallStackParamList, 'QRScan'>;

/** Extract clean vehicleId from plain IDs, deep link URLs, or JSON payloads */
function extractVehicleId(raw: string): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();

  // Case 1: JSON payload (e.g. {"vehicleId":"veh_123"} or {"id":"veh_123"})
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.vehicleId) return String(parsed.vehicleId);
      if (parsed.id) return String(parsed.id);
    } catch {
      // not valid JSON, proceed to other checks
    }
  }

  // Case 2: URL containing /vehicles/:id or /verify/:id
  if (trimmed.includes('/vehicles/')) {
    const parts = trimmed.split('/vehicles/');
    const candidate = parts[1]?.split('/')[0]?.split('?')[0];
    if (candidate) return candidate;
  }
  if (trimmed.includes('/verify/')) {
    const parts = trimmed.split('/verify/');
    const candidate = parts[1]?.split('/')[0]?.split('?')[0];
    if (candidate) return candidate;
  }

  // Backend QR payload: {APP_BASE_URL}/api/v1/qr/{vehicleId}
  if (trimmed.includes('/api/v1/qr/')) {
    const parts = trimmed.split('/api/v1/qr/');
    const candidate = parts[1]?.split('/')[0]?.split('?')[0];
    if (candidate) return candidate;
  }
  if (trimmed.includes('/qr/')) {
    const parts = trimmed.split('/qr/');
    const candidate = parts[parts.length - 1]?.split('/')[0]?.split('?')[0];
    if (candidate) return candidate;
  }

  return trimmed;
}

export default function QRScanScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const px = (n: number) => Math.round(n * (width / REF_W));
  const scanAnim = useRef(new Animated.Value(0)).current;

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scanAnim]);

  const scanLineY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [px(10), px(210)],
  });

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    const vehicleId = extractVehicleId(data);
    if (!vehicleId) {
      setScanned(false);
      return;
    }
    navigation.navigate('VehicleQrEmergency', { vehicleId });
  };

  const handleSos = () => {
    navigation.replace('SOSEmergency');
  };

  const isPermissionPending = !permission;
  const isPermissionGranted = permission?.granted;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={{ paddingHorizontal: px(20), flex: 1 }}>
        <Pressable
          onPress={() => goBackWithinStack(navigation)}
          hitSlop={12}
          style={{ alignSelf: 'flex-start', marginBottom: px(8), paddingVertical: px(4) }}>
          <ChevronLeft size={px(24)} color={SOS_COLORS.white} strokeWidth={2.5} />
        </Pressable>

        <Text
          style={{
            fontSize: px(24),
            fontWeight: typography.weights.extrabold,
            color: SOS_COLORS.white,
            textAlign: 'center',
            marginBottom: px(8),
          }}>
          Scan Vehicle QR
        </Text>
        <Text
          style={{
            fontSize: px(13),
            color: SOS_COLORS.grey,
            textAlign: 'center',
            marginBottom: px(20),
            lineHeight: px(20),
          }}>
          Point camera at the vehicle's RACE windshield QR sticker to contact the owner or send an emergency alert
        </Text>

        {/* Viewfinder area */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginBottom: px(20) }}>
          <View
            style={{
              width: px(270),
              height: px(270),
              borderRadius: px(24),
              backgroundColor: '#121212',
              borderWidth: 2,
              borderColor: SOS_COLORS.gold,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative',
            }}>
            {isPermissionGranted ? (
              <>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                  onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                />
                {/* Viewfinder reticle overlay */}
                <View
                  style={{
                    width: px(220),
                    height: px(220),
                    borderWidth: 2,
                    borderColor: scanned ? '#22C55E' : SOS_COLORS.red,
                    borderRadius: px(16),
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                  {!scanned && (
                    <Animated.View
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        height: 3,
                        backgroundColor: SOS_COLORS.red,
                        transform: [{ translateY: scanLineY }],
                      }}
                    />
                  )}
                  {scanned && (
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: 'rgba(34, 197, 94, 0.25)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Text
                        style={{
                          color: '#FFFFFF',
                          fontWeight: typography.weights.bold,
                          fontSize: px(16),
                        }}>
                        ✓ Scanned!
                      </Text>
                    </View>
                  )}
                </View>
              </>
            ) : isPermissionPending ? (
              <ActivityIndicator color={SOS_COLORS.gold} size="large" />
            ) : (
              <View style={{ alignItems: 'center', paddingHorizontal: px(16) }}>
                <Camera size={px(44)} color={SOS_COLORS.gold} />
                <Text
                  style={{
                    color: SOS_COLORS.white,
                    fontSize: px(14),
                    fontWeight: typography.weights.bold,
                    marginTop: px(12),
                    textAlign: 'center',
                  }}>
                  Camera Access Required
                </Text>
                <Text
                  style={{
                    color: SOS_COLORS.grey,
                    fontSize: px(12),
                    textAlign: 'center',
                    marginTop: px(6),
                    marginBottom: px(14),
                  }}>
                  Grant camera permissions to scan vehicle QR windshield stickers
                </Text>
                <Pressable
                  onPress={requestPermission}
                  style={{
                    backgroundColor: SOS_COLORS.gold,
                    paddingHorizontal: px(16),
                    paddingVertical: px(8),
                    borderRadius: px(10),
                  }}>
                  <Text style={{ color: '#000000', fontWeight: typography.weights.bold, fontSize: px(13) }}>
                    Grant Permission
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {isPermissionGranted && scanned && (
            <Pressable
              onPress={() => setScanned(false)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: px(6),
                marginTop: px(12),
                paddingHorizontal: px(12),
                paddingVertical: px(6),
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: px(20),
              }}>
              <RefreshCw size={px(14)} color={SOS_COLORS.white} />
              <Text style={{ color: SOS_COLORS.white, fontSize: px(12), fontWeight: typography.weights.medium }}>
                Scan Another QR Code
              </Text>
            </Pressable>
          )}
        </View>

        {/* Action buttons */}
        <Pressable
          onPress={handleSos}
          style={{
            width: '100%',
            height: px(48),
            borderRadius: px(14),
            backgroundColor: SOS_COLORS.red,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: px(10),
          }}>
          <Text style={{ fontSize: px(14), fontWeight: typography.weights.bold, color: SOS_COLORS.white }}>
            🚨 Trigger Direct SOS Alert
          </Text>
        </Pressable>

        <Pressable onPress={() => goBackWithinStack(navigation)} style={{ alignItems: 'center', paddingVertical: px(6) }}>
          <Text style={{ fontSize: px(14), fontWeight: typography.weights.semibold, color: SOS_COLORS.grey }}>
            Cancel
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SOS_COLORS.bg },
});
