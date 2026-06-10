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
}

/** Consistent screen header used across the app: optional back button,
 * centered title, optional right-side action. Replaces the ad-hoc
 * back/title/spacer rows that were duplicated in every screen. */
export function ScreenHeader({ title, subtitle, showBack = true, onBack, right }: ScreenHeaderProps) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.container}>
      <View style={styles.side}>
        {showBack && (
          <IconButton
            icon="arrow-left"
            iconColor={colors.onSurface}
            onPress={onBack ?? (() => router.back())}
          />
        )}
      </View>
      <View style={styles.center}>
        <Text variant="titleLarge" style={[styles.title, { color: colors.onBackground }]} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text variant="bodySmall" style={[styles.subtitle, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={[styles.side, styles.right]}>{right}</View>
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
  right: { alignItems: 'flex-end' },
  center: { flex: 1, alignItems: 'center' },
  title: { fontWeight: '700' },
  subtitle: { marginTop: 1 },
});
