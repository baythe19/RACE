import React, { type ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';

import AppScreenLayout from '../ui/AppScreenLayout';
import AppStackHeader from '../ui/AppStackHeader';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';
import { useScreenPx } from '../../hooks/useScreenPx';
import { colors } from '../../theme';

type Props = {
  title: string;
  subtitle?: string;
  subtitleNumberOfLines?: number;
  headerRight?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  onBack?: () => void;
  /** Defaults to true — every profile form has inputs that must stay above
   * the keyboard. Pass false only for screens with no inputs. */
  keyboardAvoiding?: boolean;
  contentStyle?: import('react-native').StyleProp<import('react-native').ViewStyle>;
};

export function useProfilePx() {
  return useScreenPx();
}

function ProfileSubScreenLayout({
  title,
  subtitle,
  subtitleNumberOfLines,
  headerRight,
  footer,
  children,
  onBack,
  keyboardAvoiding = true,
  contentStyle,
}: Props) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const px = useScreenPx();
  const handleBack = onBack ?? (() => goBackWithinStack(navigation));

  return (
    <AppScreenLayout
      backgroundColor={colors.pageBg}
      keyboardAvoiding={keyboardAvoiding}
      footer={footer}
      contentStyle={[{ paddingTop: px(14) }, contentStyle]}
      header={
        <AppStackHeader
          title={title}
          subtitle={subtitle}
          subtitleNumberOfLines={subtitleNumberOfLines}
          onBack={handleBack}
          headerRight={headerRight}
        />
      }>
      {children}
    </AppScreenLayout>
  );
}

export default ProfileSubScreenLayout;
