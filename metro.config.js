const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts } = defaultConfig.resolver;

const config = {
  resolver: {
    // Hem Whisper (.bin) hem de Llama (.gguf) uzantılarına açıkça izin veriyoruz
    assetExts: [...assetExts, 'bin', 'gguf'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
