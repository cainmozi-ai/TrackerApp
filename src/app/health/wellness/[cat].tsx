import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useUserStore } from '@/stores/userStore';
import { NutrientSheet } from '@/components/nutrition/NutrientSheet';
import {
  CATEGORIES, CATEGORY_ROWS, MICRO_BY_KEY, percentOf, targetFor, isOverLimit, formatAmount, type CategoryKey,
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
  const {
    todayMicros, todaySupplementMicros, todayMicroCoverage, todayLogCount, todayEstimatedCount,
    todayCalories, todayProtein, todayFat, loadTodayLogs,
  } = useNutritionStore();
  const { profile, loadProfile } = useUserStore();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const supplementAmount = (key: string) =>
    key === 'folate' ? todaySupplementMicros.folicAcid || 0
      : key === 'vitaminA' ? todaySupplementMicros.vitaminAPreformed || 0
      : todaySupplementMicros[key] || 0;

  useFocusEffect(useCallback(() => { loadTodayLogs(); loadProfile(); }, []));

  const category = CATEGORIES.find(c => c.key === cat);
  const rows: Row[] = [];
  const calTarget = profile?.calorieTarget || 2000;
  const proteinTarget = profile?.proteinTarget || 150;

  /** amount/target/pct are null when unknown (no data, or no NIH target). */
  type Row = { key?: string; label: string; amount: number | null; target: number | null; unit: string; pct: number | null; over?: boolean };
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
      const total = todayMicros[def.key] || 0;
      const unknown = todayLogCount > 0 && !todayMicroCoverage[def.key];
      const target = targetFor(def.key, profile);
      rows.push({
        key: def.key, label: def.label, unit: def.unit, target,
        amount: unknown ? null : total,
        pct: unknown || target == null ? null : Math.round(percentOf(def.key, total, profile)),
        over: isOverLimit(def.key, total, supplementAmount(def.key), profile),
      });
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title={category?.label || 'Wellness'} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {rows.map((r, i) => {
            const amountText = r.amount == null ? '—' : formatAmount(r.amount);
            const pct = r.pct ?? 0;
            return (
              <Pressable key={i} style={styles.row} disabled={!r.key} onPress={() => r.key && setOpenKey(r.key)}
                accessibilityRole={r.key ? 'button' : undefined}>
                <View style={styles.rowHead}>
                  <Text variant="bodyMedium" style={{ color: colors.onSurface }}>{r.label}</Text>
                  <Text variant="labelMedium" style={{ color: r.over ? colors.error : colors.onSurfaceVariant }}>
                    {r.target != null ? `${amountText} / ${formatAmount(r.target)} ${r.unit}` : `${amountText} ${r.unit} · no NIH target`}
                    {'   '}
                    <Text style={{ color: colors.onSurface, fontWeight: '300' }}>{r.pct == null ? '—' : `${r.pct}%`}</Text>
                  </Text>
                </View>
                <View style={[styles.track, { backgroundColor: colors.surfaceVariant }]}>
                  <View style={[styles.fill, { width: `${Math.min(100, pct)}%`, backgroundColor: r.over ? colors.error : pctColor(pct) }]} />
                </View>
              </Pressable>
            );
          })}
          <Text variant="labelSmall" style={[styles.note, { color: colors.onSurface }]}>
            Vitamin and mineral targets are NIH values for your age and sex. Amounts are estimated from the foods you log; “—” means none of them report that nutrient. Tap a nutrient for details.
          </Text>
          <Text variant="labelSmall" style={[styles.noteLast, { color: colors.onSurface }]}>This is not medical advice</Text>
        </View>
      </ScrollView>
      <NutrientSheet
        nutrientKey={openKey}
        onDismiss={() => setOpenKey(null)}
        profile={profile}
        amount={openKey ? todayMicros[openKey] || 0 : 0}
        fromSupplements={openKey ? supplementAmount(openKey) : 0}
        coverage={openKey ? todayMicroCoverage[openKey] || 0 : 0}
        logCount={todayLogCount}
        estimatedCount={todayEstimatedCount}
      />
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
  note: { textAlign: 'center', marginTop: spacing.xl, lineHeight: 16 },
  noteLast: { textAlign: 'center', marginTop: spacing.sm },
});
