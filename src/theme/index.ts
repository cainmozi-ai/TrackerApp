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

// Single brand accent — MacroFactor-style: one strong colour on a monochrome ground.
const GREEN = '#34D27A';
const GREEN_DIM = '#1F8A50';

// --- Dark palette (the default / showcase): charcoal + green ---
const darkColors = {
  ...MD3DarkTheme.colors,
  primary: GREEN,
  primaryContainer: '#103D24',
  secondary: '#9AA0A6',
  secondaryContainer: '#2A2A2C',
  tertiary: GREEN,
  tertiaryContainer: '#103D24',
  background: '#121212',
  surface: '#1C1C1E',
  surfaceVariant: '#2A2A2C',
  surfaceDisabled: '#1C1C1E',
  error: '#FF6B6B',
  errorContainer: '#3A1A1A',
  onPrimary: '#06220F',
  onPrimaryContainer: '#B8F5D0',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#E3E3E6',
  onTertiary: '#06220F',
  onTertiaryContainer: '#B8F5D0',
  onBackground: '#F2F2F4',
  onSurface: '#F2F2F4',
  onSurfaceVariant: '#9A9AA0',
  outline: '#323234',
  outlineVariant: '#262628',
  elevation: {
    level0: 'transparent',
    level1: '#1C1C1E',
    level2: '#222224',
    level3: '#262628',
    level4: '#2A2A2C',
    level5: '#2E2E30',
  },
};

// --- Light palette (refined alternate — minimal, same green accent) ---
const lightColors = {
  ...MD3LightTheme.colors,
  primary: GREEN_DIM,
  primaryContainer: '#CFF3DE',
  secondary: '#5F6368',
  secondaryContainer: '#ECEDEF',
  tertiary: GREEN_DIM,
  tertiaryContainer: '#CFF3DE',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceVariant: '#F0F1F2',
  error: '#D7373F',
  errorContainer: '#FFDAD6',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#04210F',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#1A1C1E',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#04210F',
  onBackground: '#17181A',
  onSurface: '#17181A',
  onSurfaceVariant: '#5F6368',
  outline: '#DADCE0',
  outlineVariant: '#E8EAED',
  elevation: {
    level0: 'transparent',
    level1: '#FFFFFF',
    level2: '#F7F8F9',
    level3: '#F2F3F4',
    level4: '#EEEFF1',
    level5: '#EAEBED',
  },
};

export const lightTheme = { ...MD3LightTheme, colors: lightColors, fonts };
export const darkTheme = { ...MD3DarkTheme, colors: darkColors, fonts };

/** Default/static theme is now DARK (MacroFactor aesthetic). Screens still
 * importing `theme` directly inherit dark; migrated screens use `useAppTheme()`. */
export const theme = darkTheme;

// --- Module accents: flattened to muted, near-grayscale tones (MacroFactor
// keeps things monochrome). Green is the one true accent (see GREEN/primary);
// these stay desaturated so the UI reads calm + data-first, while still giving
// just enough differentiation for legends/markers. ---
export const moduleColors = {
  nutrition: '#B7ADA6',
  water: '#90A4AE',
  sleep: '#A29CB0',
  workout: '#B3A595',
  tasks: '#AEA98F',
  habits: GREEN,
  budget: '#8FAAA2',
  gamification: '#C2B488',
};

export type ModuleKey = keyof typeof moduleColors;

/** The single brand accent, for code that wants it explicitly. */
export const accent = GREEN;

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
