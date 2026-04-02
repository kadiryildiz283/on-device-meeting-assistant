const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const customConfig = {
  resolver: {
    // Add .bin extension so Metro bundler recognizes Whisper and Llama models
    assetExts: [...defaultConfig.resolver.assetExts, 'bin', 'gguf'],
  },
};

module.exports = mergeConfig(defaultConfig, customConfig);
