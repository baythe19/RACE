import React, { type ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';

import AppScreenLayout from '../ui/AppScreenLayout';
import AppStackHeader from '../ui/AppStackHeader';
import { useScreenPx } from '../../hooks/useScreenPx';
import { colors } from '../../theme';

type Props = {
  title: string;
  subtitle?: string;
  headerRight?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  onBack?: () => void;
  /** Defaults to true — every profile form has inputs that must stay above
   * the keyboard. Pass false only for screens with no inputs. */
  keyboardAvoiding?: boolean;
};

export function useProfilePx() {
  return useScreenPx();
}

export default function ProfileSubScreenLayout({
  title,
  subtitle,
  headerRight,
  footer,
  children,
  onBack,
  keyboardAvoiding = true,
}: Props) {
  const navigation = useNavigation();
  const handleBack = onBack ?? (() => navigation.goBack());

  return (
    <AppScreenLayout
      backgroundColor={colors.pageBg}
      keyboardAvoiding={keyboardAvoiding}
      footer={footer}
      header={
        <AppStackHeader
          title={title}
          subtitle={subtitle}
          onBack={handleBack}
          headerRight={headerRight}
        />
      }>
      {children}
    </AppScreenLayout>
  );
}
