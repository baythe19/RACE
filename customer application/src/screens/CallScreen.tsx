import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import EmergencyAssistanceContent from '../components/sos/EmergencyAssistanceContent';
import { colors } from '../theme';
import type { CallStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<CallStackParamList, 'CallMain'>;

/** Same redesigned SOS content; stacked entry keeps its own back affordance. */
export default function CallScreen(_props: Props) {
  return <EmergencyAssistanceContent />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pageBg },
});
