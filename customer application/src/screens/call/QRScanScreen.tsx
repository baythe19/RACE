import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ScanLine } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { SOS_COLORS } from '../../constants/sosTheme';
import type { CallStackParamList } from '../../types/navigation';
import { typography } from '../../theme';

const REF_W = 390;

type Props = NativeStackScreenProps<CallStackParamList, 'QRScan'>;

export default function QRScanScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const px = (n: number) => Math.round(n * (width / REF_W));
  const scanAnim = useRef(new Animated.Value(0)).current;

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
    outputRange: [px(20), px(200)],
  });

  const handleScan = () => {
    navigation.navigate('VehicleQrEmergency', { vehicleId: 'demo_veh_101' });
  };

  const handleSos = () => {
    navigation.replace('SOSEmergency');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={{ paddingHorizontal: px(20), flex: 1 }}>
        <Pressable
          onPress={() => navigation.goBack()}
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
            marginBottom: px(24),
            lineHeight: px(20),
          }}>
          Point your camera at the vehicle's RACE QR tag to contact the owner or send an emergency alert
        </Text>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginBottom: px(24) }}>
          <View
            style={{
              width: px(260),
              height: px(260),
              borderRadius: px(20),
              backgroundColor: SOS_COLORS.card,
              borderWidth: 1.5,
              borderColor: SOS_COLORS.gold,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
            <View
              style={{
                width: px(220),
                height: px(220),
                borderWidth: 2,
                borderColor: SOS_COLORS.red,
                borderRadius: px(12),
                overflow: 'hidden',
              }}>
              <Animated.View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: 2,
                  backgroundColor: SOS_COLORS.red,
                  transform: [{ translateY: scanLineY }],
                }}
              />
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ScanLine size={px(48)} color={SOS_COLORS.grey} />
              </View>
            </View>
          </View>
        </View>

        <Pressable
          onPress={handleScan}
          style={{
            width: '100%',
            height: px(52),
            borderRadius: px(14),
            backgroundColor: SOS_COLORS.gold,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: px(12),
          }}>
          <Text style={{ fontSize: px(16), fontWeight: typography.weights.bold, color: '#000000' }}>
            🔍 Scan Demo Vehicle QR
          </Text>
        </Pressable>
        <Pressable
          onPress={handleSos}
          style={{
            width: '100%',
            height: px(50),
            borderRadius: px(14),
            backgroundColor: SOS_COLORS.red,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: px(12),
          }}>
          <Text style={{ fontSize: px(15), fontWeight: typography.weights.bold, color: SOS_COLORS.white }}>
            🚨 Trigger Direct SOS Alert
          </Text>
        </Pressable>
        <Pressable onPress={() => navigation.goBack()} style={{ alignItems: 'center', paddingVertical: px(8) }}>
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
