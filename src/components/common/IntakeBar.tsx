import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/theme/ThemeContext';
import { accent } from '@/theme';

interface IntakeBarProps {
  label: string;
  value: number;
  target: number;
  /** Optional target range — drawn as small ticks on the track, per the design. */
  min?: number | null;
  max?: number | null;
  unit?: string;
}

/** A labelled intake bar (macros, fiber, sugar, sodium): label and
 * "value/target" above a 6px Surface-2 track with a brand-red fill. The design
 * keeps these red at every level — status colours are reserved for training
 * volume. */
export function IntakeBar({ label, value, target, min = null, max = null, unit = '' }: IntakeBarProps) {
  const { colors } = useAppTheme();
  const hasRange = min != null && max != null && max >= min;
  const scale = Math.max(target, hasRange ? max! : 0, value, 1);
  const pct = (n: number) => `${Math.min(100, (n / scale) * 100)}%` as const;
  return (
    <View style={styles.wrap}>
      <View style={styles.labels}>
        <Text variant="labelSmall" style={{ color: colors.onSurface }}>{label}</Text>
        <Text variant="labelSmall" style={{ color: colors.onSurface }}>
          {Math.round(value)}/{hasRange ? `${min}-${max}` : target}{unit}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surfaceVariant }]}>
        <View style={[styles.fill, { width: pct(value), backgroundColor: accent }]} />
        {hasRange && [min!, max!].map((mark, i) => (
          <View key={i} style={[styles.tick, { left: pct(mark), backgroundColor: colors.onSurface }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: 3 },
  fill: { height: '100%', borderRadius: 3 },
  tick: { position: 'absolute', top: -2, width: 2, height: 10, opacity: 0.55 },
});
