import { AppState } from 'react-native';
import { focusManager, QueryClient } from '@tanstack/react-query';

// React Native has no browser visibility events. Bridge app foreground state so
// stale queries refresh as soon as the driver returns to the app.
focusManager.setEventListener(handleFocus => {
  const subscription = AppState.addEventListener('change', state => {
    handleFocus(state === 'active');
  });
  return () => subscription.remove();
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});
