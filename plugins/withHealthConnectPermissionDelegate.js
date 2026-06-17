/**
 * Expo config plugin: finish wiring react-native-health-connect for a managed
 * (CNG) Android build. The library's bundled Expo plugin only adds the
 * permissions-rationale intent-filter, which is not enough to actually request
 * permissions. Two more things are required, and this plugin adds both:
 *
 * 1. Permission delegate (MainActivity.onCreate)
 *    The permission UI is launched through an ActivityResultLauncher registered
 *    by `HealthConnectPermissionDelegate.setPermissionDelegate(activity)`. That
 *    call MUST run in MainActivity.onCreate; otherwise the launcher is an
 *    uninitialized `lateinit var` and `requestPermission()` throws
 *    `UninitializedPropertyAccessException` — which our JS swallows, so the
 *    button appears to do nothing.
 *
 * 2. Package visibility (AndroidManifest <queries>)
 *    On Android 11+ (API 30+) an app cannot resolve or launch another package
 *    unless it declares it in <queries>. The permission contract targets the
 *    Health Connect provider `com.google.android.apps.healthdata`, so without a
 *    <package> query the launch intent doesn't resolve and, again, nothing
 *    happens. See the Health Connect "Get started" docs.
 */
const { withMainActivity, withAndroidManifest } = require('@expo/config-plugins');

const IMPORT_KT = 'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';
const CALL = 'HealthConnectPermissionDelegate.setPermissionDelegate(this)';
const HEALTH_CONNECT_PROVIDER = 'com.google.android.apps.healthdata';

function addImport(src, importLine) {
  if (src.includes(importLine)) return src;
  return src.replace(/^(package .*\n)/m, `$1\n${importLine}\n`);
}

function addDelegateCall(src) {
  if (src.includes(CALL)) return src;
  const match = src.match(/super\.onCreate\([^)]*\)\s*\n/);
  if (!match) {
    throw new Error(
      'withHealthConnectPermissionDelegate: could not find super.onCreate(...) in MainActivity'
    );
  }
  return src.replace(match[0], `${match[0]}    ${CALL}\n`);
}

function withDelegate(config) {
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
}

function withHealthConnectQuery(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    if (!Array.isArray(manifest.queries)) manifest.queries = [];

    const alreadyDeclared = manifest.queries.some(
      (q) => Array.isArray(q.package)
        && q.package.some((p) => p?.$?.['android:name'] === HEALTH_CONNECT_PROVIDER)
    );
    if (!alreadyDeclared) {
      // Reuse the first <queries> block if one exists, otherwise create one.
      let queries = manifest.queries[0];
      if (!queries) {
        queries = {};
        manifest.queries.push(queries);
      }
      if (!Array.isArray(queries.package)) queries.package = [];
      queries.package.push({ $: { 'android:name': HEALTH_CONNECT_PROVIDER } });
    }
    return cfg;
  });
}

module.exports = function withHealthConnect(config) {
  config = withDelegate(config);
  config = withHealthConnectQuery(config);
  return config;
};
