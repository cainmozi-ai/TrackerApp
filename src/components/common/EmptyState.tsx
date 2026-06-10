import { StyleSheet, View } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, withAlpha } from '@/theme';

interface EmptyStateProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  body?: string;
  color?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Warm, encouraging empty state (Finch-style: reward, never scold) with an
 * optional call-to-action. Dark-mode aware. */
export function EmptyState({ icon, title, body, color, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useAppTheme();
  const accent = color ?? colors.primary;
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: withAlpha(accent, 0.15) }]}>
        <MaterialCommunityIcons name={icon} size={44} color={accent} />
      </View>
      <Text variant="titleMedium" style={[styles.title, { color: colors.onBackground }]}>
        {title}
      </Text>
      {!!body && (
        <Text variant="bodyMedium" style={[styles.body, { color: colors.onSurfaceVariant }]}>
          {body}
        </Text>
      )}
      {!!actionLabel && !!onAction && (
        <Button mode="contained" onPress={onAction} style={styles.button} buttonColor={accent}>
          {actionLabel}
        </Button>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: shape.pill,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontWeight: '700', textAlign: 'center' },
  body: { textAlign: 'center', lineHeight: 20 },
  button: { marginTop: spacing.md, borderRadius: shape.pill },
});
