const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const {assetExts} = defaultConfig.resolver;

const config = {
  resolver: {
    // .bin ve .gguf uzantılarını asset olarak ekliyoruz
    assetExts: [...assetExts, 'bin', 'gguf'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
