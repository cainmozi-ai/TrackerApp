import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';

// --- Typography: clean, slightly tightened (MacroFactor is data-dense) ---
const fontConfig = {
  displayLarge: { fontFamily: 'System', fontSize: 54, fontWeight: '700' as const, letterSpacing: -0.5 },
  displayMedium: { fontFamily: 'System', fontSize: 44, fontWeight: '700' as const, letterSpacing: -0.25 },
  displaySmall: { fontFamily: 'System', fontSize: 34, fontWeight: '700' as const, letterSpacing: 0 },
  headlineLarge: { fontFamily: 'System', fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.25 },
  headlineMedium: { fontFamily: 'System', fontSize: 26, fontWeight: '700' as const, letterSpacing: 0 },
  headlineSmall: { fontFamily: 'System', fontSize: 22, fontWeight: '700' as const, letterSpacing: 0 },
  titleLarge: { fontFamily: 'System', fontSize: 20, fontWeight: '700' as const, letterSpacing: 0 },
  titleMedium: { fontFamily: 'System', fontSize: 16, fontWeight: '600' as const, letterSpacing: 0.1 },
  titleSmall: { fontFamily: 'System', fontSize: 14, fontWeight: '600' as const, letterSpacing: 0.1 },
  bodyLarge: { fontFamily: 'System', fontSize: 16, fontWeight: '400' as const, letterSpacing: 0.15 },
  bodyMedium: { fontFamily: 'System', fontSize: 14, fontWeight: '400' as const, letterSpacing: 0.2 },
  bodySmall: { fontFamily: 'System', fontSize: 12, fontWeight: '400' as const, letterSpacing: 0.3 },
  labelLarge: { fontFamily: 'System', fontSize: 14, fontWeight: '600' as const, letterSpacing: 0.1 },
  labelMedium: { fontFamily: 'System', fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.4 },
  labelSmall: { fontFamily: 'System', fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.4 },
};

const fonts = configureFonts({ config: fontConfig });

// Single brand accent — Incus: one deep forge-RED (#880808) on a black / white
// ground. Both light and dark modes use the same red per the brand's 3-colour
// scheme (white · black · red).
const RED = '#880808';
const RED_DIM = '#880808';

// --- Dark palette (the default): near-black + white + red ---
const darkColors = {
  ...MD3DarkTheme.colors,
  primary: RED,
  primaryContainer: '#3A1210',
  secondary: '#9AA0A6',
  secondaryContainer: '#232323',
  tertiary: RED,
  tertiaryContainer: '#3A1210',
  background: '#0B0B0B',
  surface: '#161616',
  surfaceVariant: '#232323',
  surfaceDisabled: '#161616',
  error: '#FF6B6B',
  errorContainer: '#3A1A1A',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#FFD9D6',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#E3E3E6',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#FFD9D6',
  onBackground: '#F4F4F5',
  onSurface: '#F4F4F5',
  onSurfaceVariant: '#A0A0A2',
  outline: '#2C2C2C',
  outlineVariant: '#202020',
  elevation: {
    level0: 'transparent',
    level1: '#161616',
    level2: '#1C1C1C',
    level3: '#222222',
    level4: '#282828',
    level5: '#2E2E2E',
  },
};

// --- Light palette (white + black + red) ---
const lightColors = {
  ...MD3LightTheme.colors,
  primary: RED_DIM,
  primaryContainer: '#FCD9D6',
  secondary: '#5F6368',
  secondaryContainer: '#ECECEC',
  tertiary: RED_DIM,
  tertiaryContainer: '#FCD9D6',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F1F1',
  error: '#D7373F',
  errorContainer: '#FFDAD6',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#3A0704',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#1A1C1E',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#3A0704',
  onBackground: '#111113',
  onSurface: '#111113',
  onSurfaceVariant: '#5A5A5A',
  outline: '#DEDEDE',
  outlineVariant: '#ECECEC',
  elevation: {
    level0: 'transparent',
    level1: '#FFFFFF',
    level2: '#F7F7F7',
    level3: '#F2F2F2',
    level4: '#EEEEEE',
    level5: '#EAEAEA',
  },
};

export const lightTheme = { ...MD3LightTheme, colors: lightColors, fonts };
export const darkTheme = { ...MD3DarkTheme, colors: darkColors, fonts };

/** Default/static theme is now DARK (MacroFactor aesthetic). Screens still
 * importing `theme` directly inherit dark; migrated screens use `useAppTheme()`. */
export const theme = darkTheme;

// --- Module accents: muted neutral tones on the black/white ground. RED is
// the one true brand accent (see RED/primary); these stay desaturated so the
// UI reads calm + data-first, with just enough differentiation for legends. ---
export const moduleColors = {
  nutrition: '#B7ADA6',
  water: '#90A4AE',
  sleep: '#A29CB0',
  workout: '#B3A595',
  tasks: '#AEA98F',
  habits: RED,
  budget: '#8FAAA2',
  gamification: '#C2B488',
};

export type ModuleKey = keyof typeof moduleColors;

/** The single brand accent, for code that wants it explicitly. */
export const accent = RED;

// --- Spacing ---
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// --- Shape: denser, flatter (MacroFactor uses moderate radii, not big pills) ---
export const shape = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

// --- Motion: restrained springs (less bounce than the Expressive pass) ---
export const motion = {
  snappy: { damping: 24, stiffness: 320, mass: 0.8 },
  smooth: { damping: 22, stiffness: 200, mass: 1 },
  bouncy: { damping: 18, stiffness: 220, mass: 0.9 },
};

/** Append an 0–1 alpha to a 6-digit hex colour → 8-digit hex. */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

export type AppThemeType = typeof darkTheme;
