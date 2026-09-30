import { StyleSheet, View } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  /** 'left' puts the title beside the back arrow (Active Workout, Records,
   * Routine Editor in the design); the default centres it. */
  align?: 'center' | 'left';
}

/** Consistent screen header used across the app: optional back button,
 * title, optional right-side action. */
export function ScreenHeader({ title, subtitle, showBack = true, onBack, right, align = 'center' }: ScreenHeaderProps) {
  const { colors } = useAppTheme();
  const left = align === 'left';
  return (
    <View style={styles.container}>
      <View style={left ? styles.sideLeft : styles.side}>
        {showBack && (
          <IconButton
            icon="arrow-left"
            iconColor={colors.onSurface}
            onPress={onBack ?? (() => router.back())}
            accessibilityLabel="Back"
          />
        )}
      </View>
      <View style={[styles.center, left && styles.centerLeft]}>
        <Text style={[left ? styles.titleLeft : styles.title, { color: colors.onBackground }]}
          numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72}>
          {title}
        </Text>
        {!!subtitle && (
          <Text variant="bodySmall" style={[styles.subtitle, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={[left ? styles.sideRightLeft : styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    minHeight: 56,
  },
  side: { width: 56, justifyContent: 'center' },
  sideLeft: { justifyContent: 'center' },
  sideRightLeft: { minWidth: 56, justifyContent: 'center', paddingRight: spacing.sm },
  right: { alignItems: 'flex-end' },
  center: { flex: 1, alignItems: 'center' },
  centerLeft: { alignItems: 'flex-start' },
  // Design: centred screen titles are 18px light; left-aligned ones 20px.
  title: { fontSize: 18, fontWeight: '300', textAlign: 'center' },
  titleLeft: { fontSize: 20, fontWeight: '300' },
  subtitle: { marginTop: 1 },
});
