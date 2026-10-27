import React from 'react';
import { Platform, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as ReduxProvider } from 'react-redux';

import PartnerAppNavigator from './src/navigation/PartnerAppNavigator';
import { queryClient } from './src/services/queryClient';
import { store } from './src/redux/store';
import { colors } from './src/theme';
import { useInterFonts } from './src/theme/interFonts';

export default function App() {
  useInterFonts();

  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar
            barStyle="dark-content"
            backgroundColor={colors.background}
            translucent={Platform.OS === 'android'}
          />
          <PartnerAppNavigator />
        </SafeAreaProvider>
      </QueryClientProvider>
    </ReduxProvider>
  );
}
