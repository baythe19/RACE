import React, { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { useScreenPx } from '../../hooks/useScreenPx';
import { colors } from '../../theme';

const KeyboardAware = (() => {
  try {
    return require('react-native-keyboard-controller')
      .KeyboardAwareScrollView as typeof import('react-native-keyboard-controller').KeyboardAwareScrollView;
  } catch {
    return null;
  }
})();

type Props = {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  horizontalPadding?: number;
  contentStyle?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  edges?: Edge[];
  refreshing?: boolean;
  onRefresh?: () => void;
};

export default function AppScreenLayout({
  header,
  footer,
  children,
  scrollable = true,
  keyboardAvoiding = false,
  horizontalPadding,
  contentStyle,
  backgroundColor = colors.background,
  edges = ['top'],
  refreshing = false,
  onRefresh,
}: Props) {
  const insets = useSafeAreaInsets();
  const px = useScreenPx();
  const paddingX = horizontalPadding ?? px(20);

  const body = scrollable ? (
    KeyboardAware && keyboardAvoiding ? (
      <KeyboardAware
        style={styles.flex}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={px(96)}
        extraKeyboardSpace={px(24)}
        contentContainerStyle={[
          {
            paddingHorizontal: paddingX,
            paddingBottom: px(24),
          },
          contentStyle,
        ]}>
        {children}
      </KeyboardAware>
    ) : (
    <ScrollView
      style={styles.flex}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
      contentContainerStyle={[
        {
          paddingHorizontal: paddingX,
          paddingBottom: px(20) + insets.bottom,
        },
        contentStyle,
      ]}>
      {children}
    </ScrollView>
    )
  ) : (
    <View
      style={[
        styles.flex,
        { paddingHorizontal: paddingX, paddingBottom: insets.bottom },
        contentStyle,
      ]}>
      {children}
    </View>
  );

  const content = (
    <View style={[styles.flex, { backgroundColor }]}>
      {header}
      {body}
      {footer}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor }]}>
      <SafeAreaView style={styles.flex} edges={edges}>
        {keyboardAvoiding && !KeyboardAware ? (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
            // Android: react-native's automatic "adjustResize" handles it when
            // the activity is configured; no KAV wrapper needed there.
          >
            {content}
          </KeyboardAvoidingView>
        ) : (
          content
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
});
