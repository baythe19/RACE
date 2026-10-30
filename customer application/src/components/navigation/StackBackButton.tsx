import React from 'react';
import { Pressable } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { NativeStackHeaderLeftProps } from '@react-navigation/native-stack';

import { goBackWithinStack } from '../../navigation/goBackWithinStack';
import { colors } from '../../theme';

export default function StackBackButton({ canGoBack }: NativeStackHeaderLeftProps) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const state = navigation.getState();
  const inTab = navigation.getParent()?.getState()?.type === 'tab';
  const onStackRoot = !state || state.index === 0;
  const allowBack = canGoBack || navigation.canGoBack() || (inTab && onStackRoot && state?.routes[0]?.name !== state?.routeNames[0]);

  if (!allowBack) {
    return null;
  }

  return (
    <Pressable
      onPress={() => goBackWithinStack(navigation)}
      hitSlop={12}
      style={{ marginLeft: 4, padding: 6, minWidth: 40, minHeight: 40, justifyContent: 'center' }}
      accessibilityRole="button"
      accessibilityLabel="Go back">
      <ArrowLeft size={22} color={colors.dark} strokeWidth={2.5} />
    </Pressable>
  );
}
