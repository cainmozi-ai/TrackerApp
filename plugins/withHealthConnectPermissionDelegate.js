/**
 * Expo config plugin: wire up react-native-health-connect's permission delegate.
 *
 * react-native-health-connect (v2+) launches the Health Connect permission UI
 * through an ActivityResultLauncher that is registered by
 * `HealthConnectPermissionDelegate.setPermissionDelegate(activity)`. That call
 * MUST happen in MainActivity.onCreate — otherwise the launcher is a
 * `lateinit var` that's never initialized, and `requestPermission()` throws
 * `UninitializedPropertyAccessException` (which our JS swallows, so nothing
 * happens and the app never appears in Health Connect's app list).
 *
 * The library ships an Expo plugin that only edits AndroidManifest.xml, so in a
 * managed/CNG workflow this delegate is never set. This plugin injects the
 * import + the setPermissionDelegate(this) call into the generated
 * MainActivity at prebuild time. Supports Kotlin MainActivity (Expo SDK 50+).
 */
const { withMainActivity } = require('@expo/config-plugins');

const IMPORT_KT = 'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';
const CALL = 'HealthConnectPermissionDelegate.setPermissionDelegate(this)';

function addImport(src, importLine) {
  if (src.includes(importLine)) return src;
  // Place the import right after the package declaration.
  return src.replace(/^(package .*\n)/m, `$1\n${importLine}\n`);
}

function addDelegateCall(src) {
  if (src.includes(CALL)) return src;
  // Inject immediately after the first super.onCreate(...) inside onCreate.
  const match = src.match(/super\.onCreate\([^)]*\)\s*\n/);
  if (!match) {
    throw new Error(
      'withHealthConnectPermissionDelegate: could not find super.onCreate(...) in MainActivity'
    );
  }
  const insertion = `${match[0]}    ${CALL}\n`;
  return src.replace(match[0], insertion);
}

module.exports = function withHealthConnectPermissionDelegate(config) {
  return withMainActivity(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') {
      throw new Error(
        `withHealthConnectPermissionDelegate: expected a Kotlin MainActivity, got "${cfg.modResults.language}"`
      );
    }
    let src = cfg.modResults.contents;
    src = addImport(src, IMPORT_KT);
    src = addDelegateCall(src);
    cfg.modResults.contents = src;
    return cfg;
  });
};
