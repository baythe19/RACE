import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import SubscriptionPlansView from '../../components/subscription/SubscriptionPlansView';
import type { ProfileStackParamList } from '../../types/navigation';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<ProfileStackParamList, 'SubscriptionPlans'>;

export default function SubscriptionPlansScreen({ navigation }: Props) {
  return (
    <SubscriptionPlansView onSubscribed={() => goBackWithinStack(navigation)} showCancel={false} />
  );
}
