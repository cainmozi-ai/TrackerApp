import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';

// --- Typography: the design sets every style in Helvetica Neue *Light*
// (Display 30 · Headline 22 · Title 16 · Body 14 · Label 11). Helvetica is a
// paid font, so we use the system face at weight 300; hierarchy comes from
// size, not boldness. Keep inline styles free of heavy fontWeights. ---
const LIGHT = '300' as const;
const fontConfig = {
  // Used by <Text> without a variant (e.g. nested spans), so it matches too.
  default: { fontFamily: 'System', fontWeight: LIGHT, letterSpacing: 0 },
  displayLarge: { fontFamily: 'System', fontSize: 54, fontWeight: LIGHT, letterSpacing: 0 },
  displayMedium: { fontFamily: 'System', fontSize: 44, fontWeight: LIGHT, letterSpacing: 0 },
  displaySmall: { fontFamily: 'System', fontSize: 34, fontWeight: LIGHT, letterSpacing: 0 },
  headlineLarge: { fontFamily: 'System', fontSize: 30, fontWeight: LIGHT, letterSpacing: 0 },
  headlineMedium: { fontFamily: 'System', fontSize: 26, fontWeight: LIGHT, letterSpacing: 0 },
  headlineSmall: { fontFamily: 'System', fontSize: 22, fontWeight: LIGHT, letterSpacing: 0 },
  titleLarge: { fontFamily: 'System', fontSize: 20, fontWeight: LIGHT, letterSpacing: 0 },
  titleMedium: { fontFamily: 'System', fontSize: 16, fontWeight: LIGHT, letterSpacing: 0 },
  titleSmall: { fontFamily: 'System', fontSize: 14, fontWeight: LIGHT, letterSpacing: 0 },
  bodyLarge: { fontFamily: 'System', fontSize: 16, fontWeight: LIGHT, letterSpacing: 0 },
  bodyMedium: { fontFamily: 'System', fontSize: 14, fontWeight: LIGHT, letterSpacing: 0 },
  bodySmall: { fontFamily: 'System', fontSize: 12, fontWeight: LIGHT, letterSpacing: 0 },
  labelLarge: { fontFamily: 'System', fontSize: 15, fontWeight: LIGHT, letterSpacing: 0 },
  labelMedium: { fontFamily: 'System', fontSize: 12, fontWeight: LIGHT, letterSpacing: 0 },
  labelSmall: { fontFamily: 'System', fontSize: 11, fontWeight: LIGHT, letterSpacing: 0 },
};

const fonts = configureFonts({ config: fontConfig });

// Single brand accent — the design's red (#A83232) on a dark ground.
export const BRAND = '#A83232';
export const BRAND_DIM = '#8A2828';

// --- Dark palette (the default / showcase): charcoal + brand red ---
const darkColors = {
  ...MD3DarkTheme.colors,
  primary: BRAND,
  primaryContainer: '#3A1210',
  secondary: '#9AA0A6',
  secondaryContainer: '#2A2A2C',
  tertiary: BRAND,
  tertiaryContainer: '#3A1210',
  background: '#121212',
  surface: '#1C1C1E',
  surfaceVariant: '#2A2A2C',
  surfaceDisabled: '#1C1C1E',
  error: '#FF6B6B',
  errorContainer: '#3A1A1A',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#F3D0D0',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#E3E3E6',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#F3D0D0',
  onBackground: '#F2F2F4',
  onSurface: '#F2F2F4',
  onSurfaceVariant: '#9A9AA0',
  outline: '#323234',
  outlineVariant: '#262628',
  // Brand red is too dark to read as text on charcoal (~2.6:1). Use this
  // lifted red for any red TEXT; keep `primary` for fills (buttons, rings).
  accentText: '#E8766B',
  // Snackbar action colour (sits on the light inverse surface).
  inversePrimary: BRAND_DIM,
  elevation: {
    level0: 'transparent',
    level1: '#1C1C1E',
    level2: '#222224',
    level3: '#262628',
    level4: '#2A2A2C',
    level5: '#2E2E30',
  },
};

// --- Light palette (refined alternate — minimal, same brand accent) ---
const lightColors = {
  ...MD3LightTheme.colors,
  primary: BRAND_DIM,
  primaryContainer: '#F5D6D6',
  secondary: '#5F6368',
  secondaryContainer: '#ECEDEF',
  tertiary: BRAND_DIM,
  tertiaryContainer: '#F5D6D6',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceVariant: '#F0F1F2',
  error: '#D7373F',
  errorContainer: '#FFDAD6',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#3A0A0A',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#1A1C1E',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#3A0A0A',
  onBackground: '#17181A',
  onSurface: '#17181A',
  onSurfaceVariant: '#5F6368',
  outline: '#DADCE0',
  outlineVariant: '#E8EAED',
  accentText: BRAND_DIM,
  inversePrimary: '#E8766B',
  elevation: {
    level0: 'transparent',
    level1: '#FFFFFF',
    level2: '#F7F8F9',
    level3: '#F2F3F4',
    level4: '#EEEFF1',
    level5: '#EAEBED',
  },
};

// Paper derives corner radii from `roundness`: MD3 buttons use 5×, so 2.4
// gives the design's 12px buttons (and 12px segmented controls).
const ROUNDNESS = 2.4;

export const lightTheme = { ...MD3LightTheme, colors: lightColors, fonts, roundness: ROUNDNESS };
export const darkTheme = { ...MD3DarkTheme, colors: darkColors, fonts, roundness: ROUNDNESS };

/** Default/static theme is now DARK (MacroFactor aesthetic). Screens still
 * importing `theme` directly inherit dark; migrated screens use `useAppTheme()`. */
export const theme = darkTheme;

// --- Module accents: flattened to muted, near-grayscale tones (MacroFactor
// keeps things monochrome). Brand red is the one true accent (see BRAND/primary);
// these stay desaturated so the UI reads calm + data-first, while still giving
// just enough differentiation for legends/markers. ---
export const moduleColors = {
  nutrition: '#A83232',
  water: '#A83232',
  sleep: '#A83232',
  workout: '#A83232',
  tasks: '#A83232',
  habits: BRAND,
  budget: '#A83232',
  gamification: '#A83232',
};

export type ModuleKey = keyof typeof moduleColors;

/** The single brand accent, for code that wants it explicitly. */
export const accent = BRAND;

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
export type AppColors = AppThemeType['colors'];
