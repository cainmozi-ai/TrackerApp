import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, withAlpha } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useUserStore } from '@/stores/userStore';
import { MICROS, CATEGORIES, percentOf } from '@/utils/micronutrients';

// % → status colour (kept semantic, like the design's bars).
function pctColor(pct: number): string {
  if (pct >= 100) return '#66BB6A';
  if (pct >= 60) return '#FFA726';
  return '#FF6B6B';
}

export default function WellnessCategory() {
  const { colors } = useAppTheme();
  const { cat } = useLocalSearchParams<{ cat: string }>();
  const { todayMicros, todayCalories, loadTodayLogs } = useNutritionStore();
  const { profile, loadProfile } = useUserStore();

  useFocusEffect(useCallback(() => { loadTodayLogs(); loadProfile(); }, []));

  const category = CATEGORIES.find(c => c.key === cat);
  const nutrients = MICROS.filter(m => m.cats.includes(cat as never));
  const calTarget = profile?.calorieTarget || 2000;

  type Row = { label: string; amount: number; target: number; unit: string; pct: number };
  const rows: Row[] = [];
  if (cat === 'energy') {
    rows.push({ label: 'Calories', amount: todayCalories, target: calTarget, unit: 'kcal', pct: Math.round((todayCalories / calTarget) * 100) });
  }
  for (const m of nutrients) {
    const amt = Math.round((todayMicros[m.key] || 0) * 10) / 10;
    rows.push({ label: m.label, amount: amt, target: m.rda, unit: m.unit, pct: Math.round(percentOf(m.key, todayMicros[m.key] || 0)) });
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title={category?.label || 'Wellness'} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {rows.map((r, i) => (
            <View key={i} style={styles.row}>
              <View style={styles.rowHead}>
                <Text variant="bodyMedium" style={{ color: colors.onSurface }}>{r.label}</Text>
                <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
                  {r.amount}/{r.target} {r.unit}  <Text style={{ color: pctColor(r.pct), fontWeight: '700' }}>{r.pct}%</Text>
                </Text>
              </View>
              <View style={[styles.track, { backgroundColor: colors.surfaceVariant }]}>
                <View style={[styles.fill, { width: `${Math.min(100, r.pct)}%`, backgroundColor: pctColor(r.pct) }]} />
              </View>
            </View>
          ))}
        </View>
        <Text variant="labelSmall" style={[styles.note, { color: colors.onSurfaceVariant }]}>
          Values are estimated from your logged foods and profile. Incomplete or missing data will affect accuracy. This is not medical advice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: 40 },
  card: { borderRadius: shape.lg, padding: spacing.md },
  row: { marginBottom: spacing.md },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  note: { textAlign: 'center', marginTop: spacing.md, lineHeight: 16 },
});
