import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, withAlpha } from '@/theme';
import { MotionCard } from './MotionCard';

interface AppCardProps {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  subtitle?: string;
  onPress?: () => void;
  compact?: boolean;
  index?: number;
  rightContent?: React.ReactNode;
}

export function AppCard({ title, icon, color, subtitle, onPress, compact, index, rightContent }: AppCardProps) {
  const { colors } = useAppTheme();

  if (compact) {
    return (
      <MotionCard onPress={onPress} index={index} style={styles.compactCard}>
        <View style={[styles.compactIcon, { backgroundColor: withAlpha(color, 0.16) }]}>
          <MaterialCommunityIcons name={icon} size={24} color={color} />
        </View>
        <Text variant="labelLarge" style={[styles.compactTitle, { color: colors.onSurface }]} numberOfLines={1}>
          {title}
        </Text>
      </MotionCard>
    );
  }

  return (
    <MotionCard onPress={onPress} index={index} style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: withAlpha(color, 0.16) }]}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <View style={styles.content}>
        <Text variant="titleMedium" style={{ color: colors.onSurface }}>{title}</Text>
        {!!subtitle && (
          <Text variant="bodySmall" style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>{subtitle}</Text>
        )}
      </View>
      {rightContent ?? (
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
      )}
    </MotionCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: shape.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  subtitle: { marginTop: 2 },
  compactCard: {
    width: '47.5%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactIcon: {
    width: 48,
    height: 48,
    borderRadius: shape.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactTitle: { textAlign: 'center' },
});
