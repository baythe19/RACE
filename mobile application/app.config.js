const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ??
  process.env.GOOGLE_MAPS_API_KEY ??
  '';

module.exports = {
  expo: {
    name: 'RACE Partner',
    slug: 'race-partners',
    owner: 'race-service',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './src/assets/images/logo.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './src/assets/images/logo.png',
      resizeMode: 'contain',
      backgroundColor: '#232323',
    },
    ios: {
      bundleIdentifier: 'com.racecar.partner',
      buildNumber: '1',
      supportsTablet: true,
      config: {
        googleMapsApiKey,
      },
    },
    android: {
      package: 'com.racecar.partner',
      versionCode: 2,
      softwareKeyboardLayoutMode: 'resize',
      adaptiveIcon: {
        foregroundImage: './src/assets/images/logo.png',
        backgroundColor: '#232323',
      },
      config: {
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_IMAGES',
      ],
    },
    scheme: 'race-partner',
    plugins: [
      'expo-asset',
      'expo-font',
      'expo-secure-store',
      '@react-native-community/datetimepicker',
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow RACE Partner to access your photos to upload driver and vehicle documents.',
          cameraPermission: 'Allow RACE Partner to use your camera to photograph official documents and for selfie verification.',
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Allow RACE Partner to use your location while on active jobs.',
          locationAlwaysAndWhenInUsePermission:
            'Allow RACE Partner to share your location while on active jobs.',
        },
      ],
    ],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://race-api-w361.onrender.com',
      googleMapsApiKey,
    },
  },
};
