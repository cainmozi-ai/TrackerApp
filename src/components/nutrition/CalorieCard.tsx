import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle } from 'react-native-svg';
import { useAppTheme } from '@/theme/ThemeContext';
import { accent, shape } from '@/theme';
import { IntakeBar } from '@/components/common/IntakeBar';
import type { UserProfile } from '@/types';

export interface DayTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

/** The design's calorie card, shared by Home and Nutrition: a 124px ring on
 * the left, "kcal left" and the three macro bars beside it, then a
 * Fiber · Sugar · Sodium row along the bottom. */
export function CalorieCard({ totals, profile, onPress }: {
  totals: DayTotals;
  profile: UserProfile | null;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  const p = profile;
  const target = p?.calorieTarget || 2000;
  const over = totals.calories > target;
  const remaining = Math.abs(target - totals.calories);

  const macros = [
    { label: 'Protein', value: totals.protein, target: p?.proteinTarget || 150, min: p?.proteinTargetMin, max: p?.proteinTargetMax },
    { label: 'Carbs', value: totals.carbs, target: p?.carbsTarget || 250, min: p?.carbsTargetMin, max: p?.carbsTargetMax },
    { label: 'Fat', value: totals.fat, target: p?.fatTarget || 65, min: p?.fatTargetMin, max: p?.fatTargetMax },
  ];
  const micros = [
    { label: 'Fiber', value: totals.fiber, target: p?.fiberTarget || 30, min: p?.fiberTargetMin, max: p?.fiberTargetMax, unit: 'g' },
    { label: 'Sugar', value: totals.sugar, target: p?.sugarTarget || 50, min: p?.sugarTargetMin, max: p?.sugarTargetMax, unit: 'g' },
    { label: 'Sodium', value: totals.sodium, target: p?.sodiumTarget || 2300, min: null, max: null, unit: '' },
  ];

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.top}>
        <CalRing eaten={totals.calories} target={target} />
        <View style={styles.side}>
          {/* Adherence-neutral: going over reads "kcal over", never red. */}
          <View style={styles.leftRow}>
            <Text style={[styles.leftNum, { color: colors.onSurface }]}>{remaining}</Text>
            <Text style={[styles.leftOf, { color: colors.onSurface }]}> / {target}</Text>
            <View style={{ flex: 1 }} />
            <Text style={[styles.leftOf, { color: colors.onSurface }]}>{over ? 'kcal over' : 'kcal left'}</Text>
          </View>
          {macros.map(m => (
            <IntakeBar key={m.label} label={m.label} value={m.value} target={m.target} min={m.min} max={m.max} unit="g" />
          ))}
        </View>
      </View>
      <View style={styles.bottom}>
        {micros.map(m => (
          <View key={m.label} style={styles.microCol}>
            <IntakeBar label={m.label} value={m.value} target={m.target} min={m.min} max={m.max} unit={m.unit} />
          </View>
        ))}
      </View>
    </Pressable>
  );
}

function CalRing({ eaten, target }: { eaten: number; target: number }) {
  const { colors } = useAppTheme();
  // Design: 124px ring, 13px flat-ended arc on a Surface-2 track.
  const size = 124, sw = 13, r = (size - sw) / 2, circ = 2 * Math.PI * r;
  const prog = Math.min(1, target ? eaten / target : 0);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceVariant} strokeWidth={sw} fill="transparent" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={accent} strokeWidth={sw} fill="transparent"
          strokeDasharray={`${circ}`} strokeDashoffset={circ * (1 - prog)} strokeLinecap="butt"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringNum, { color: colors.onSurface }]}>{Math.round(eaten)}</Text>
        <Text style={[styles.ringLabel, { color: colors.onSurface }]}>eaten</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: shape.lg, padding: 15, gap: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 28 },
  side: { flex: 1, gap: 8 },
  leftRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 },
  leftNum: { fontSize: 24, fontWeight: '300' },
  leftOf: { fontSize: 12, fontWeight: '300' },
  bottom: { flexDirection: 'row', gap: 16 },
  microCol: { flex: 1 },
  ringCenter: { position: 'absolute', width: 124, height: 124, justifyContent: 'center', alignItems: 'center' },
  ringNum: { fontSize: 20, fontWeight: '300' },
  ringLabel: { fontSize: 11, fontWeight: '300' },
});
