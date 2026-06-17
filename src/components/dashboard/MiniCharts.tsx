import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { useAppTheme } from '@/theme/ThemeContext';
import { withAlpha } from '@/theme';

/** A compact bar chart from a list of values. */
export function MiniBars({ values, color, height = 44 }: { values: number[]; color: string; height?: number }) {
  const max = Math.max(...values, 1);
  return (
    <View style={[styles.bars, { height }]}>
      {values.map((v, i) => (
        <View key={i} style={styles.barSlot}>
          <View style={{ width: '70%', height: `${Math.max(4, (v / max) * 100)}%`, backgroundColor: v > 0 ? color : withAlpha(color, 0.25), borderRadius: 2 }} />
        </View>
      ))}
    </View>
  );
}

/** A compact line chart from a list of values (e.g. weight trend). */
export function MiniLine({ values, color, width = 150, height = 44 }: { values: number[]; color: string; width?: number; height?: number }) {
  if (values.length < 2) return <View style={{ height }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 4;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return `${x},${y}`;
  });
  const last = pts[pts.length - 1].split(',').map(Number);
  return (
    <Svg width={width} height={height}>
      <Polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={last[0]} cy={last[1]} r={3} fill={color} />
    </Svg>
  );
}

/** A GitHub-style consistency grid for the last N days (most recent last). */
export function ConsistencyGrid({ days, color, weeks = 4 }: { days: Set<string>; color: string; weeks?: number }) {
  const { colors } = useAppTheme();
  const cols: { iso: string; on: boolean }[][] = [];
  const today = new Date();
  for (let w = weeks - 1; w >= 0; w--) {
    const col: { iso: string; on: boolean }[] = [];
    for (let d = 6; d >= 0; d--) {
      const offset = w * 7 + d;
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      col.push({ iso, on: days.has(iso) });
    }
    cols.push(col);
  }
  return (
    <View style={styles.grid}>
      {cols.map((col, ci) => (
        <View key={ci} style={styles.gridCol}>
          {col.map(cell => (
            <View key={cell.iso} style={[styles.cell, { backgroundColor: cell.on ? color : withAlpha(colors.onSurfaceVariant, 0.15) }]} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  grid: { flexDirection: 'row', gap: 3 },
  gridCol: { gap: 3 },
  cell: { width: 9, height: 9, borderRadius: 2 },
});
