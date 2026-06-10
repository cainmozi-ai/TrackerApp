import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, withAlpha } from '@/theme';
import { MotionCard } from './MotionCard';

interface StatTileProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  value: string;
  label: string;
  caption?: string;
  onPress?: () => void;
  index?: number;
  /** Fill the row (bento "wide" tile) instead of half-width. */
  wide?: boolean;
  progress?: number; // 0..1, optional bottom bar
}

/** Bento dashboard tile: icon chip, big value, label, optional progress bar. */
export function StatTile({ icon, color, value, label, caption, onPress, index, wide, progress }: StatTileProps) {
  const { colors } = useAppTheme();
  return (
    <MotionCard onPress={onPress} index={index} style={[styles.tile, wide ? styles.wide : styles.half]}>
      <View style={styles.topRow}>
        <View style={[styles.iconChip, { backgroundColor: withAlpha(color, 0.16) }]}>
          <MaterialCommunityIcons name={icon} size={20} color={color} />
        </View>
        {!!caption && (
          <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{caption}</Text>
        )}
      </View>
      <Text variant="headlineSmall" style={[styles.value, { color: colors.onSurface }]}>{value}</Text>
      <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
      {progress !== undefined && (
        <View style={[styles.track, { backgroundColor: withAlpha(color, 0.18) }]}>
          <View style={[styles.fill, { width: `${Math.min(Math.max(progress, 0), 1) * 100}%`, backgroundColor: color }]} />
        </View>
      )}
    </MotionCard>
  );
}

const styles = StyleSheet.create({
  tile: { gap: 4, minHeight: 110, justifyContent: 'center' },
  half: { width: '47.5%' },
  wide: { width: '100%' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconChip: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  value: { fontWeight: '800', marginTop: spacing.xs },
  track: { height: 6, borderRadius: 3, marginTop: spacing.xs, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
