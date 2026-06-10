import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { initializeDatabase } from './schema';
import { theme, spacing } from '@/theme';

interface DatabaseContextType {
  isReady: boolean;
}

const DatabaseContext = createContext<DatabaseContextType>({ isReady: false });

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    initializeDatabase()
      .then(() => { if (!cancelled) setIsReady(true); })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="database-alert" size={56} color={theme.colors.error} />
        <Text variant="titleMedium" style={styles.title}>Storage couldn't start</Text>
        <Text variant="bodyMedium" style={styles.text}>
          {Platform.OS === 'web'
            ? "The browser database is locked by another tab. Close ALL tabs for this app (and the Expo dev page), then open just one fresh tab."
            : 'The database failed to initialize.'}
        </Text>
        <Text variant="bodySmall" style={styles.detail}>{error}</Text>
        {Platform.OS === 'web' && (
          <Button
            mode="contained"
            style={styles.btn}
            onPress={() => { if (typeof window !== 'undefined') window.location.reload(); }}
          >
            Reload
          </Button>
        )}
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyMedium" style={styles.text}>Loading your tracker...</Text>
      </View>
    );
  }

  return (
    <DatabaseContext.Provider value={{ isReady }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  return useContext(DatabaseContext);
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
    backgroundColor: theme.colors.background,
  },
  title: { fontWeight: '700', marginTop: spacing.sm },
  text: { color: theme.colors.onSurfaceVariant, textAlign: 'center' },
  detail: { color: theme.colors.onSurfaceVariant, textAlign: 'center', opacity: 0.6, marginTop: spacing.xs },
  btn: { marginTop: spacing.md },
});
