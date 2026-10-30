const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ??
  process.env.GOOGLE_MAPS_API_KEY ??
  '';

const productionApiUrl =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://race-api-w361.onrender.com';

// Peach (peachsim.com) serves the iOS/Android simulator from its own origin.
// Expo CLI's dev-server CORS middleware blocks bundle requests from unknown
// origins ("Unauthorized request from ...runtime.localhost:7668"). Allowing it
// via router.headOrigin is local-dev-only: EAS builds never set the env var.
const peachRuntimeOrigin = process.env.EXPO_PUBLIC_PEACH_ORIGIN ?? '';

module.exports = {
  expo: {
    name: 'RACE',
    slug: 'race-service',
    owner: 'webstarts',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './src/assets/images/icon-1024.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './src/assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#FFFFFF',
    },
    ios: {
      bundleIdentifier: 'com.racecar.customer',
      buildNumber: '1',
      supportsTablet: true,
      config: {
        googleMapsApiKey,
      },
    },
    android: {
      package: 'com.racecar.customer',
      versionCode: 6,
      softwareKeyboardLayoutMode: 'resize',
      adaptiveIcon: {
        foregroundImage: './src/assets/images/icon-1024.png',
        backgroundColor: '#F5A800',
      },
      config: {
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
    scheme: 'race-customer',
    plugins: [
      'expo-asset',
      'expo-font',
      'expo-secure-store',
      '@react-native-community/datetimepicker',
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow RACE to access your photos for document upload.',
          cameraPermission: 'Allow RACE to use your camera for selfie verification.',
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Allow RACE to use your location to set pickup and dropoff.',
        },
      ],
      'expo-sharing',
    ],
    extra: {
      apiUrl: productionApiUrl,
      googleMapsApiKey,
      eas: {
        projectId: '277981d5-5046-4288-8c91-672aab158419',
      },
      router: peachRuntimeOrigin
        ? { headOrigin: peachRuntimeOrigin, origin: peachRuntimeOrigin }
        : undefined,
    },
  },
};
