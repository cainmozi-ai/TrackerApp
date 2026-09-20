import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useUserStore } from '@/stores/userStore';
import {
  CATEGORIES, CATEGORY_ROWS, MICRO_BY_KEY, percentOf, type CategoryKey,
} from '@/utils/micronutrients';

// The design draws every wellness bar in the brand accent regardless of how
// close the nutrient is to its RDA — the number carries the meaning here, not
// the colour. (Home and Progress keep semantic colours; those frames use them.)
function pctColor(_pct: number): string {
  return accent;
}

export default function WellnessCategory() {
  const { colors } = useAppTheme();
  const { cat } = useLocalSearchParams<{ cat: string }>();
  const { todayMicros, todayCalories, todayProtein, todayFat, loadTodayLogs } = useNutritionStore();
  const { profile, loadProfile } = useUserStore();

  useFocusEffect(useCallback(() => { loadTodayLogs(); loadProfile(); }, []));

  const category = CATEGORIES.find(c => c.key === cat);
  const rows: Row[] = [];
  const calTarget = profile?.calorieTarget || 2000;
  const proteinTarget = profile?.proteinTarget || 150;

  type Row = { label: string; amount: number; target: number; unit: string; pct: number };
  const pct = (amount: number, target: number) => (target > 0 ? Math.round((amount / target) * 100) : 0);

  for (const row of CATEGORY_ROWS[cat as CategoryKey] ?? []) {
    if (row.kind === 'calories') {
      rows.push({ label: 'Calories', amount: todayCalories, target: calTarget, unit: 'kcal', pct: pct(todayCalories, calTarget) });
    } else if (row.kind === 'fat') {
      const fatTarget = profile?.fatTarget || 65;
      rows.push({ label: 'Fat', amount: Math.round(todayFat), target: fatTarget, unit: 'g', pct: pct(todayFat, fatTarget) });
    } else if (row.kind === 'protein') {
      rows.push({ label: 'Protein', amount: Math.round(todayProtein), target: proteinTarget, unit: 'g', pct: pct(todayProtein, proteinTarget) });
    } else {
      const def = MICRO_BY_KEY[row.key];
      if (!def) continue;
      const amt = Math.round((todayMicros[def.key] || 0) * 10) / 10;
      rows.push({ label: def.label, amount: amt, target: def.rda, unit: def.unit, pct: Math.round(percentOf(def.key, todayMicros[def.key] || 0)) });
    }
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
