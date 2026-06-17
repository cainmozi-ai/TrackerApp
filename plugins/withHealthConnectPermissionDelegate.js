/**
 * Expo config plugin: finish wiring react-native-health-connect for a managed
 * (CNG) Android build. The library's bundled Expo plugin only adds the
 * (Android 13-) permissions-rationale intent-filter, which is not enough.
 * This plugin adds the three missing pieces:
 *
 * 1. Permission delegate (MainActivity.onCreate)
 *    The permission UI is launched through an ActivityResultLauncher registered
 *    by `HealthConnectPermissionDelegate.setPermissionDelegate(activity)`. That
 *    call MUST run in MainActivity.onCreate; otherwise the launcher is an
 *    uninitialized `lateinit var` and `requestPermission()` throws.
 *
 * 2. Package visibility (AndroidManifest <queries>)
 *    On Android 11+ (API 30+) an app cannot resolve or launch another package
 *    unless it declares it in <queries>. The permission contract targets the
 *    Health Connect provider `com.google.android.apps.healthdata`.
 *
 * 3. Permission-usage activity-alias (Android 14+ / API 34+)
 *    On Android 14+, Health Connect is part of the OS and only recognises apps
 *    that declare an <activity-alias> handling
 *    android.intent.action.VIEW_PERMISSION_USAGE with the
 *    android.intent.category.HEALTH_PERMISSIONS category. Without it Health
 *    Connect does NOT consider the app's health permissions valid: the app
 *    never appears in Health Connect's app list and requestPermission() returns
 *    an empty set immediately without showing a dialog. The bundled plugin only
 *    adds the older ACTION_SHOW_PERMISSIONS_RATIONALE filter (Android 13-).
 */
const { withMainActivity, withAndroidManifest } = require('@expo/config-plugins');

const IMPORT_KT = 'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';
const CALL = 'HealthConnectPermissionDelegate.setPermissionDelegate(this)';
const HEALTH_CONNECT_PROVIDER = 'com.google.android.apps.healthdata';
const PERMISSION_USAGE_ALIAS = 'ViewPermissionUsageActivity';

function addImport(src, importLine) {
  if (src.includes(importLine)) return src;
  return src.replace(/^(package .*\n)/m, `$1\n${importLine}\n`);
}

function addDelegateCall(src) {
  if (src.includes(CALL)) return src;
  const match = src.match(/super\.onCreate\([^)]*\)\s*\n/);
  if (!match) {
    throw new Error(
      'withHealthConnect: could not find super.onCreate(...) in MainActivity'
    );
  }
  return src.replace(match[0], `${match[0]}    ${CALL}\n`);
}

function withDelegate(config) {
  return withMainActivity(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') {
      throw new Error(
        `withHealthConnect: expected a Kotlin MainActivity, got "${cfg.modResults.language}"`
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

function withPermissionUsageActivity(config) {
  const pkg = config.android?.package;
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (!application) {
      throw new Error('withHealthConnect: no <application> in AndroidManifest');
    }
    if (!Array.isArray(application['activity-alias'])) application['activity-alias'] = [];

    const exists = application['activity-alias'].some(
      (a) => a?.$?.['android:name'] === PERMISSION_USAGE_ALIAS
    );
    if (!exists) {
      const targetActivity = pkg ? `${pkg}.MainActivity` : '.MainActivity';
      application['activity-alias'].push({
        $: {
          'android:name': PERMISSION_USAGE_ALIAS,
          'android:exported': 'true',
          'android:targetActivity': targetActivity,
          'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE' } }],
            category: [{ $: { 'android:name': 'android.intent.category.HEALTH_PERMISSIONS' } }],
          },
        ],
      });
    }
    return cfg;
  });
}

module.exports = function withHealthConnect(config) {
  config = withDelegate(config);
  config = withHealthConnectQuery(config);
  config = withPermissionUsageActivity(config);
  return config;
};
