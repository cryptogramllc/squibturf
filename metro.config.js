/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

const { getDefaultConfig } = require('metro-config');

module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts },
    transformer
  } = await getDefaultConfig();

  return {
    transformer: {
      ...transformer,
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: false,
        },
      }),
    },
    resolver: {
      assetExts: [...assetExts, 'txt', 'jpg', 'png'],
      sourceExts: [...sourceExts, 'ts', 'tsx', 'js', 'jsx', 'json']
    }
  };
})();
