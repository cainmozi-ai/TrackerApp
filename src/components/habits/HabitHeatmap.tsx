import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { theme, spacing } from '@/theme';

interface HabitHeatmapProps {
  data: Record<string, number>;
  color: string;
  weeks?: number;
  maxLevel?: number;
}

const DAY_LABELS = ['', 'M', '', 'W', '', 'F', ''];

export function HabitHeatmap({ data, color, weeks = 13, maxLevel = 1 }: HabitHeatmapProps) {
  const today = new Date();
  const todayDow = today.getDay();

  // Saturday that ends the current grid week
  const endOfGrid = new Date(today);
  endOfGrid.setDate(today.getDate() + (6 - todayDow));

  const columns: { date: string; count: number; future: boolean }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: { date: string; count: number; future: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const offsetFromEnd = (weeks - 1 - w) * 7 + (6 - d);
      const cellDate = new Date(endOfGrid);
      cellDate.setDate(endOfGrid.getDate() - offsetFromEnd);
      const key = cellDate.toISOString().split('T')[0];
      col.push({ date: key, count: data[key] || 0, future: cellDate > today });
    }
    columns.push(col);
  }

  const cellColor = (count: number, future: boolean) => {
    if (future) return 'transparent';
    if (count <= 0) return theme.colors.surfaceVariant;
    const level = Math.min(count / maxLevel, 1);
    const opacity = 0.4 + level * 0.6;
    return color + Math.round(opacity * 255).toString(16).padStart(2, '0');
  };

  return (
    <View style={styles.container}>
      <View style={styles.dayLabels}>
        {DAY_LABELS.map((l, i) => (
          <Text key={i} variant="labelSmall" style={styles.dayLabel}>{l}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {columns.map((col, w) => (
          <View key={w} style={styles.column}>
            {col.map((cell, d) => (
              <View
                key={d}
                style={[styles.cell, { backgroundColor: cellColor(cell.count, cell.future) }]}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const CELL = 13;
const GAP = 3;

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: GAP },
  dayLabels: { justifyContent: 'space-between', paddingVertical: 0 },
  dayLabel: { height: CELL + GAP, color: theme.colors.onSurfaceVariant, fontSize: 9, lineHeight: CELL + GAP },
  grid: { flexDirection: 'row', gap: GAP, flex: 1 },
  column: { gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 3 },
});
