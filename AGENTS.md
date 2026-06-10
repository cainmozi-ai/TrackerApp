# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Project state (Life Tracker app)

Full MVP is built and type-checks clean (`npx tsc --noEmit` = 0 errors). All routes
server-render with HTTP 200.

### Key environment facts learned
- SDK 56 uses the `src/app/` directory for Expo Router (not root `app/`).
- Entry point: `"main": "expo-router/entry"` in package.json (no App.tsx/index.ts).
- `typedRoutes` experiment is DISABLED in app.json — it broke dynamic routes. Routes are plain strings.
- Tabs use the classic `Tabs` from `expo-router` (in `src/app/(tabs)/_layout.tsx`), not NativeTabs.
- npm installs need `--legacy-peer-deps` (React 19 peer conflicts).

### Web testing
- Expo Go on the Play Store does NOT support SDK 56 ("Incompatible SDK version") — test via web.
- `metro.config.js` adds `wasm` to assetExts + COOP/COEP headers so `expo-sqlite` works on web.
- Start: `npx expo start --web` then open http://127.0.0.1:8081 (use 127.0.0.1, `localhost` can hang on IPv6).
- Web needs `react-dom`, `react-native-web`, `@expo/metro-runtime` (installed).

### Android build (EAS cloud — no local Android SDK/JDK needed)
- Configured: `eas.json` (`preview` profile = installable APK), `.npmrc` (`legacy-peer-deps=true` so EAS install succeeds), `app.json` `android.package = com.lifetracker.app` + `versionCode`.
- `npx expo-doctor` = 21/21 pass. Required native peers added: `expo-font`, `react-native-worklets`.
- Local build NOT possible here (only Java 8 installed, no Android SDK; Android needs JDK 17).
- To build the APK (needs a free Expo account — interactive login):
  `npx eas-cli login` then `npx eas-cli build -p android --profile preview`
  (first run: accept EAS project creation + auto keystore). Produces a downloadable APK URL/QR.

### Architecture
- 4 tabs: Home, Health, Fitness, Life. Profile at `/profile` (header icon).
- State: Zustand stores in `src/stores/`. DB: SQLite via `src/database/schema.ts` (seeds exercises, achievements, starter templates).
- AI photo recognition needs `EXPO_PUBLIC_GEMINI_API_KEY` in `.env` (gracefully degrades without it).
