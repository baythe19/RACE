const { getDefaultConfig } = require('expo/metro-config');

const path = require('path');

const config = getDefaultConfig(__dirname);

// Native-only modules have no web implementation — stub them for web builds.
// Metro only applies this for platform=web; iOS/Android keep real modules.
const webShims = {
  'react-native-maps': path.resolve(__dirname, 'src/shims/react-native-maps.web.js'),
  'expo-secure-store': path.resolve(__dirname, 'src/shims/expo-secure-store.web.js'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    for (const [name, shimPath] of Object.entries(webShims)) {
      if (moduleName === name || moduleName.startsWith(`${name}/`)) {
        return { filePath: shimPath, type: 'sourceFile' };
      }
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
