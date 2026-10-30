import React, { useEffect } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { HomeStackParamList } from '../../../types/navigation';

type Props = NativeStackScreenProps<HomeStackParamList, 'TowingAdvancePayment'>;

/** Legacy route — review step now confirms in one screen. */
export default function TowingAdvancePaymentScreen({ navigation }: Props) {
  useEffect(() => {
    navigation.replace('TowingReview');
  }, [navigation]);

  return null;
}
