// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite on web bundles a WebAssembly build of SQLite (wa-sqlite).
// Metro needs to treat .wasm files as assets so they resolve correctly.
config.resolver.assetExts.push('wasm');

// expo-sqlite on web uses SharedArrayBuffer, which the browser only enables
// when these COOP/COEP headers are present. Add them to the dev server.
config.server = config.server || {};
const previousEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (metroMiddleware, server) => {
  const base = previousEnhanceMiddleware
    ? previousEnhanceMiddleware(metroMiddleware, server)
    : metroMiddleware;
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    return base(req, res, next);
  };
};

module.exports = config;
