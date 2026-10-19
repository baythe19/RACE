import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import EmergencyAssistanceContent from '../../components/sos/EmergencyAssistanceContent';
import { colors } from '../../theme';
import type { CallStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<CallStackParamList, 'SOSEmergency'>;

/**
 * Redesigned SOS screen (v6 audit): light theme matching Home/Services, keeps
 * the standard chrome so tabs stay reachable — no more full-black takeover.
 */
export default function SOSEmergencyScreen(_props: Props) {
  return <EmergencyAssistanceContent />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pageBg },
});
