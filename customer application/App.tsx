import React, { useMemo, useState } from 'react';
import { Image, Platform, StatusBar, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as ReduxProvider } from 'react-redux';

import { images } from './src/assets';
import RootNavigator from './src/navigation/RootNavigator';
import { getCoverBackgroundFrame } from './src/screens/auth/splashBackground';
import { AppKeyboardProvider } from './src/components/ui/AppKeyboard';
import { SosDetailsProvider } from './src/context/SosDetailsContext';
import { queryClient } from './src/services/queryClient';
import { store } from './src/redux/store';
import { useAuth } from './src/hooks/useAuth';
import { colors } from './src/theme';

function AppRoot() {
  const { isLoading } = useAuth();
  const { width, height } = useWindowDimensions();
  const [layout, setLayout] = useState({ w: width, h: height });
  const splashBg = useMemo(
    () => getCoverBackgroundFrame(layout.w, layout.h),
    [layout.h, layout.w],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: nextW, height: nextH } = e.nativeEvent.layout;
    if (nextW <= 0 || nextH <= 0) return;
    if (Math.abs(nextW - layout.w) < 0.5 && Math.abs(nextH - layout.h) < 0.5) return;
    setLayout({ w: nextW, h: nextH });
  };

  if (isLoading) {
    return (
      <View style={styles.splash} onLayout={onLayout}>
        <Image
          source={images.splashBackground}
          style={{
            position: 'absolute',
            left: splashBg.left,
            top: splashBg.top,
            width: splashBg.width,
            height: splashBg.height,
          }}
          resizeMode="stretch"
        />
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background}
        translucent={Platform.OS === 'android'}
      />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <AppKeyboardProvider>
            <SosDetailsProvider>
              <AppRoot />
            </SosDetailsProvider>
          </AppKeyboardProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ReduxProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#1A1208',
  },
});
