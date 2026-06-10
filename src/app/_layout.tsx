import { useEffect, useState } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { ThemeProvider, useAppTheme, ThemePrefLoader } from '@/theme/ThemeContext';
import { DatabaseProvider } from '@/database/DatabaseProvider';
import { useUserStore } from '@/stores/userStore';

// Silence noisy, non-actionable deprecation warnings emitted by library
// internals (react-native-paper / react-native-web). Real errors still show.
const SUPPRESSED = [
  'props.pointerEvents is deprecated',
  '"shadow*" style props are deprecated',
  'style.tintColor is deprecated',
  'useNativeDriver',
];
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (SUPPRESSED.some(s => msg.includes(s))) return;
  originalWarn(...args);
};

function ThemedStatusBar() {
  const { dark } = useAppTheme();
  return <StatusBar style={dark ? 'light' : 'dark'} />;
}

/** Redirects to onboarding on first launch (profile not yet completed). */
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { profile, loadProfile } = useUserStore();
  const segments = useSegments();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    loadProfile().then(() => setChecked(true));
  }, []);

  useEffect(() => {
    if (!checked || !profile) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!profile.onboarded && !inOnboarding) {
      router.replace('/onboarding');
    }
  }, [checked, profile, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <DatabaseProvider>
            <ThemePrefLoader />
            <ThemedStatusBar />
            <OnboardingGate>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="onboarding" />
              </Stack>
            </OnboardingGate>
          </DatabaseProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
