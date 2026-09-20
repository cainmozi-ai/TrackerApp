import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, moduleColors, withAlpha, accent } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { MotionCard } from '@/components/common/MotionCard';
import { ProgressRing } from '@/components/common/ProgressRing';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useUserStore } from '@/stores/userStore';
import {
  VITAMINS, MINERALS, CATEGORIES, groupPercent, categoryPercent, percentOf, type MicroDef,
} from '@/utils/micronutrients';

/** The design draws these bars in the brand accent at any level; the number
 * carries the meaning. Untouched nutrients stay grey so "nothing logged" reads
 * differently from "logged a little". */
function fillColor(pct: number): string {
  return pct > 0 ? accent : '#9E9E9E';
}

export default function MicronutrientsScreen() {
  const { colors } = useAppTheme();
  const { todayMicros, todayProtein, todayCarbs, todayFat, todaySugar, todayFiber, loadTodayLogs } = useNutritionStore();
  const { profile, loadProfile } = useUserStore();

  useFocusEffect(useCallback(() => { loadTodayLogs(); loadProfile(); }, []));

  const vitaminPct = groupPercent(todayMicros, 'vitamin');
  const mineralPct = groupPercent(todayMicros, 'mineral');
  const anyData = Object.keys(todayMicros).length > 0;

  // The design opens with the day's macros before the vitamin/mineral rings.
  const macroRows = [
    { label: 'Protein', value: todayProtein, target: profile?.proteinTarget || 150, unit: 'g' },
    { label: 'Carbs', value: todayCarbs, target: profile?.carbsTarget || 250, unit: 'g' },
    { label: 'Fat', value: todayFat, target: profile?.fatTarget || 65, unit: 'g' },
    { label: 'Sugar', value: todaySugar, target: profile?.sugarTarget || 50, unit: 'g' },
    { label: 'Fiber', value: todayFiber, target: profile?.fiberTarget || 30, unit: 'g' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Micro nutrients and minerals" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <MotionCard style={styles.macroCard} noEnter>
          {macroRows.map(m => {
            const pct = m.target > 0 ? Math.min(100, (m.value / m.target) * 100) : 0;
            return (
              <View key={m.label} style={styles.macroRow}>
                <View style={styles.macroHead}>
                  <Text variant="bodyMedium" style={{ color: colors.onSurface }}>{m.label}</Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    {Math.round(m.value)}/{m.target}{m.unit}
                  </Text>
                </View>
                <View style={[styles.macroTrack, { backgroundColor: colors.surfaceVariant }]}>
                  <View style={[styles.macroFill, { width: `${pct}%`, backgroundColor: accent }]} />
                </View>
              </View>
            );
          })}
        </MotionCard>

        <View style={styles.ringRow}>
          <MotionCard style={styles.ringCard} noEnter>
            <ProgressRing progress={vitaminPct / 100} size={96} strokeWidth={10}
              color={accent} value={`${vitaminPct}%`} />
            <Text variant="titleSmall" style={[styles.ringTitle, { color: colors.onSurface }]}>Vitamins</Text>
          </MotionCard>
          <MotionCard style={styles.ringCard} noEnter>
            <ProgressRing progress={mineralPct / 100} size={96} strokeWidth={10}
              color={accent} value={`${mineralPct}%`} />
            <Text variant="titleSmall" style={[styles.ringTitle, { color: colors.onSurface }]}>Minerals</Text>
          </MotionCard>
        </View>

        {!anyData && (
          <MotionCard style={styles.empty} index={0}>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
              Log foods to see your vitamins and minerals here. Scanned products fill in
              automatically when the data exists, or add values yourself under “Add vitamins &
              minerals” on the custom-food screen.
            </Text>
          </MotionCard>
        )}

        <View style={styles.catGrid}>
          {CATEGORIES.map((cat, i) => {
            const pct = categoryPercent(todayMicros, cat.key);
            return (
              <MotionCard key={cat.key} index={i} style={styles.catCard} onPress={() => router.push(`/health/wellness/${cat.key}`)}>
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <Text variant="labelMedium" style={[styles.catLabel, { color: colors.onSurface }]} numberOfLines={2}>
                  {cat.label}
                </Text>
                <View style={[styles.catTrack, { backgroundColor: withAlpha(fillColor(pct), 0.18) }]}>
                  <View style={[styles.catFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: fillColor(pct) }]} />
                </View>
                <Text variant="titleSmall" style={[styles.catPct, { color: fillColor(pct) }]}>{pct}%</Text>
              </MotionCard>
            );
          })}
        </View>

        <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurface }]}>Vitamins</Text>
        <MotionCard style={styles.listCard}>
          {VITAMINS.map((m, i) => <MicroRow key={m.key} def={m} amount={todayMicros[m.key] || 0} last={i === VITAMINS.length - 1} />)}
        </MotionCard>

        <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurface }]}>Minerals</Text>
        <MotionCard style={styles.listCard}>
          {MINERALS.map((m, i) => <MicroRow key={m.key} def={m} amount={todayMicros[m.key] || 0} last={i === MINERALS.length - 1} />)}
        </MotionCard>

        <Text variant="labelSmall" style={[styles.disclaimer, { color: colors.onSurfaceVariant }]}>
          Values are estimated from your logged foods. Targets follow NIH reference intakes, except where this app's design specifies a different figure. Not medical advice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MicroRow({ def, amount, last }: { def: MicroDef; amount: number; last: boolean }) {
  const { colors } = useAppTheme();
  const pct = Math.round(percentOf(def.key, amount));
  const display = Math.round(amount * 10) / 10;
  return (
    <View style={[styles.microRow, !last && { borderBottomColor: colors.outline, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={styles.microHead}>
        <Text variant="bodyMedium" style={[styles.microName, { color: colors.onSurface }]}>{def.label}</Text>
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
          {display} / {def.rda} {def.unit}
        </Text>
        <Text variant="bodyMedium" style={[styles.microPct, { color: fillColor(pct) }]}>{pct}%</Text>
      </View>
      <View style={[styles.microTrack, { backgroundColor: withAlpha(fillColor(pct), 0.16) }]}>
        <View style={[styles.microFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: fillColor(pct) }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  macroCard: { padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm },
  macroRow: { gap: 5 },
  macroHead: { flexDirection: 'row', justifyContent: 'space-between' },
  macroTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  macroFill: { height: '100%', borderRadius: 4 },
  ringRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  ringCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, gap: spacing.xs },
  ringTitle: { fontWeight: '700' },
  empty: { padding: spacing.md, marginBottom: spacing.sm },
  sectionTitle: { fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  catCard: { width: '47.5%', padding: spacing.md, gap: 6 },
  catIcon: { fontSize: 26 },
  catLabel: { fontWeight: '600', minHeight: 34 },
  catTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  catFill: { height: '100%', borderRadius: 4 },
  catPct: { fontWeight: '800' },
  listCard: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  microRow: { paddingVertical: spacing.sm },
  microHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: 6 },
  microName: { flex: 1, fontWeight: '600' },
  microPct: { fontWeight: '800', minWidth: 44, textAlign: 'right' },
  microTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  microFill: { height: '100%', borderRadius: 4 },
  disclaimer: { textAlign: 'center', marginTop: spacing.lg, lineHeight: 16 },
});
