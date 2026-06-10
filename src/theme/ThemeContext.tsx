import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { PaperProvider } from 'react-native-paper';
import { lightTheme, darkTheme, type AppThemeType } from '@/theme';
import { getDatabase } from '@/database/schema';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  dark: boolean;
  colors: AppThemeType['colors'];
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  dark: true,
  colors: darkTheme.colors,
  setMode: () => {},
  toggle: () => {},
});

async function persistMode(mode: ThemeMode): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync('UPDATE user_profile SET theme_pref = ? WHERE id = 1', [mode]);
  } catch {
    // Best-effort; ignore if DB not ready.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    persistMode(next);
  }, []);

  const toggle = useCallback(() => {
    setModeState(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      persistMode(next);
      return next;
    });
  }, []);

  const activeTheme = mode === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider
      value={{ mode, dark: mode === 'dark', colors: activeTheme.colors, setMode, toggle }}
    >
      <PaperProvider theme={activeTheme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Loads the saved theme preference once the database is ready. Render this
 * inside DatabaseProvider (which only renders children after init). */
export function ThemePrefLoader() {
  const { setMode } = useAppTheme();
  useEffect(() => {
    (async () => {
      try {
        const db = await getDatabase();
        const row = await db.getFirstAsync<{ theme_pref: string | null }>(
          'SELECT theme_pref FROM user_profile WHERE id = 1'
        );
        if (row?.theme_pref === 'light' || row?.theme_pref === 'dark') setMode(row.theme_pref);
      } catch {
        // ignore
      }
    })();
  }, []);
  return null;
}
