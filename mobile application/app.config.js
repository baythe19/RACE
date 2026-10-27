const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ??
  process.env.GOOGLE_MAPS_API_KEY ??
  '';

const isMockApk = process.env.EXPO_PUBLIC_UI_PREVIEW_RELEASE === 'true';

module.exports = {
  expo: {
    name: isMockApk ? 'RACE Partner Mock' : 'RACE Partner',
    slug: 'race-partners',
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
      bundleIdentifier: 'com.racecar.partner',
      buildNumber: '1',
      supportsTablet: true,
      infoPlist: {
        UIBackgroundModes: ['location', 'fetch'],
      },
      config: {
        googleMapsApiKey,
      },
    },
    android: {
      package: 'com.racecar.partner',
      versionCode: 3,
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
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_BACKGROUND_LOCATION',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_LOCATION',
      ],
    },
    scheme: 'race-partner',
    plugins: [
      'expo-asset',
      'expo-font',
      'expo-secure-store',
      ...(googleMapsApiKey
        ? [
            [
              'react-native-maps',
              {
                androidGoogleMapsApiKey: googleMapsApiKey,
                iosGoogleMapsApiKey: googleMapsApiKey,
              },
            ],
          ]
        : []),
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
      eas: {
        projectId: '7ec95498-c8a2-44c4-a013-f7a44f95c367',
      },
    },
  },
};
