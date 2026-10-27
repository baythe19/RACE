import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, type ScrollViewProps, View } from 'react-native';

const KeyboardModule = (() => {
  try {
    return require('react-native-keyboard-controller') as typeof import('react-native-keyboard-controller');
  } catch {
    return null;
  }
})();

export function AppKeyboardProvider({ children }: { children: React.ReactNode }) {
  const Provider = KeyboardModule?.KeyboardProvider;
  if (!Provider) {
    return <>{children}</>;
  }
  return <Provider statusBarTranslucent navigationBarTranslucent>{children}</Provider>;
}

export function KeyboardFormView({
  children,
  style,
  contentContainerStyle,
  variant = 'default',
}: {
  children: React.ReactNode;
  style?: ScrollViewProps['style'];
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  /** Wizard: header/stepper stay fixed; only hero + card scroll with keyboard. */
  variant?: 'default' | 'wizard';
}) {
  const Aware = KeyboardModule?.KeyboardAwareScrollView;
  const isWizard = variant === 'wizard';
  if (Aware) {
    return (
      <Aware
        style={style}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        bottomOffset={isWizard ? 72 : 100}
        extraKeyboardSpace={isWizard ? 36 : 48}
        mode={isWizard ? 'insets' : 'layout'}
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bounces={false}
        automaticallyAdjustContentInsets={isWizard ? false : undefined}>
        {children}
      </Aware>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={style}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function KeyboardScreen({ children }: { children: React.ReactNode }) {
  const Avoiding = KeyboardModule?.KeyboardAvoidingView;
  if (Avoiding) {
    return (
      <Avoiding style={{ flex: 1 }} behavior="padding">
        {children}
      </Avoiding>
    );
  }
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {children}
    </KeyboardAvoidingView>
  );
}

export { View };
