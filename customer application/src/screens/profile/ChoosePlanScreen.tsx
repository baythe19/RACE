import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import SubscriptionPlansView from '../../components/subscription/SubscriptionPlansView';
import type { ProfileStackParamList } from '../../types/navigation';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

export default function ChoosePlanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  return (
    <SubscriptionPlansView
      showCancel
      onSubscribed={() => goBackWithinStack(navigation)}
    />
  );
}
