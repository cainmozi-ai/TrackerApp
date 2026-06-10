import { useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Text, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, withAlpha } from '@/theme';

interface PlateCalculatorProps {
  visible: boolean;
  totalWeight: number;
  onDismiss: () => void;
}

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const BARS = [20, 15, 10];

function breakdown(total: number, bar: number) {
  let perSide = (total - bar) / 2;
  if (perSide < 0) return null;
  const out: { plate: number; count: number }[] = [];
  for (const p of PLATES) {
    const count = Math.floor(perSide / p + 1e-9);
    if (count > 0) {
      out.push({ plate: p, count });
      perSide = Math.round((perSide - count * p) * 100) / 100;
    }
  }
  return { out, leftover: Math.round(perSide * 100) / 100 };
}

/** Barbell plate calculator: enter total weight → plates per side. */
export function PlateCalculator({ visible, totalWeight, onDismiss }: PlateCalculatorProps) {
  const { colors } = useAppTheme();
  const [bar, setBar] = useState(20);
  if (!visible) return null;
  const result = breakdown(totalWeight, bar);

  return (
    <Portal>
      <Pressable style={styles.backdrop} onPress={onDismiss} />
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <Text variant="titleMedium" style={[styles.title, { color: colors.onSurface }]}>Plate Calculator</Text>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>Total: {totalWeight} kg</Text>

        <View style={styles.barRow}>
          <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>Bar:</Text>
          {BARS.map(b => (
            <Pressable key={b} onPress={() => setBar(b)}
              style={[styles.barChip, { backgroundColor: bar === b ? accent : colors.surfaceVariant }]}>
              <Text variant="labelMedium" style={{ color: bar === b ? '#06220F' : colors.onSurfaceVariant, fontWeight: '700' }}>{b}kg</Text>
            </Pressable>
          ))}
        </View>

        {!result ? (
          <Text variant="bodyMedium" style={[styles.warn, { color: colors.onSurfaceVariant }]}>
            Total is below the bar weight.
          </Text>
        ) : (
          <>
            <Text variant="labelLarge" style={[styles.perSide, { color: colors.onSurface }]}>Per side:</Text>
            {result.out.length === 0 ? (
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>Just the bar.</Text>
            ) : (
              <View style={styles.plateList}>
                {result.out.map(p => (
                  <View key={p.plate} style={[styles.plateChip, { backgroundColor: withAlpha(accent, 0.18), borderColor: accent }]}>
                    <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '800' }}>{p.count}×</Text>
                    <Text variant="bodyMedium" style={{ color: colors.onSurface }}>{p.plate}kg</Text>
                  </View>
                ))}
              </View>
            )}
            {result.leftover > 0 && (
              <Text variant="bodySmall" style={[styles.warn, { color: colors.onSurfaceVariant }]}>
                {result.leftover}kg/side can't be made with standard plates.
              </Text>
            )}
          </>
        )}

        <Pressable onPress={onDismiss} style={[styles.done, { backgroundColor: colors.surfaceVariant }]}>
          <MaterialCommunityIcons name="check" size={20} color={colors.onSurface} />
          <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '700' }}>Done</Text>
        </Pressable>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: shape.lg, borderTopRightRadius: shape.lg,
    padding: spacing.md, paddingBottom: spacing.lg, gap: spacing.sm,
  },
  title: { fontWeight: '700' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  barChip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: shape.pill },
  perSide: { fontWeight: '700', marginTop: spacing.sm },
  plateList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  plateChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: shape.md, borderWidth: 1.5 },
  warn: { fontStyle: 'italic', marginTop: spacing.xs },
  done: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, height: 48, borderRadius: shape.pill, marginTop: spacing.sm },
});
