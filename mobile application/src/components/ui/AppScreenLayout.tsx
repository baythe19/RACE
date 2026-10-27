import React, { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { useScreenPx } from '../../hooks/useScreenPx';
import { colors } from '../../theme';

type Props = {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  keyboardDismissMode?: ScrollViewProps['keyboardDismissMode'];
  horizontalPadding?: number;
  contentStyle?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  edges?: Edge[];
  refreshing?: boolean;
  onRefresh?: () => void;
  /**
   * Let the scroll content stretch to at least the full height
   * (`contentContainerStyle.flexGrow = 1`) so sparse content — e.g. empty
   * states — can center itself vertically with `justifyContent`.
   */
  growContent?: boolean;
};

export default function AppScreenLayout({
  header,
  footer,
  children,
  scrollable = true,
  keyboardAvoiding = false,
  keyboardDismissMode = 'none',
  horizontalPadding,
  contentStyle,
  backgroundColor = colors.background,
  edges = ['top'],
  refreshing = false,
  onRefresh,
  growContent = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const px = useScreenPx();
  const paddingX = horizontalPadding ?? 12;

  const body = scrollable ? (
    <ScrollView
      style={styles.flex}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={keyboardDismissMode}
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
        growContent && styles.growContent,
        contentStyle,
      ]}>
      {children}
    </ScrollView>
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
        {keyboardAvoiding ? (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
  growContent: {
    flexGrow: 1,
  },
});
