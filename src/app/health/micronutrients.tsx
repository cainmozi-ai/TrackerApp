import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, moduleColors, withAlpha, accent } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { MotionCard } from '@/components/common/MotionCard';
import { ProgressRing } from '@/components/common/ProgressRing';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useUserStore } from '@/stores/userStore';
import { NutrientSheet } from '@/components/nutrition/NutrientSheet';
import {
  VITAMINS, MINERALS, CATEGORIES, groupPercent, categoryPercent, percentOf, targetFor, isOverLimit, formatAmount,
  type MicroDef, type NutrientProfile,
} from '@/utils/micronutrients';

/** The design draws these bars in the brand accent at any level; the number
 * carries the meaning. Untouched nutrients stay grey so "nothing logged" reads
 * differently from "logged a little". */
function fillColor(pct: number): string {
  return pct > 0 ? accent : '#9E9E9E';
}

export default function MicronutrientsScreen() {
  const { colors } = useAppTheme();
  const {
    todayMicros, todaySupplementMicros, todayMicroCoverage, todayLogCount,
    todayProtein, todayCarbs, todayFat, todaySugar, todayFiber, loadTodayLogs,
  } = useNutritionStore();
  const { profile, loadProfile } = useUserStore();
  const [openKey, setOpenKey] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { loadTodayLogs(); loadProfile(); }, []));

  const vitaminPct = groupPercent(todayMicros, 'vitamin', profile);
  const mineralPct = groupPercent(todayMicros, 'mineral', profile);
  // Supplement-only limits look at the form the limit covers.
  const supplementAmount = (key: string) =>
    key === 'folate' ? todaySupplementMicros.folicAcid || 0
      : key === 'vitaminA' ? todaySupplementMicros.vitaminAPreformed || 0
      : todaySupplementMicros[key] || 0;
  const rowProps = (m: MicroDef) => ({
    def: m,
    amount: todayMicros[m.key] || 0,
    profile,
    unknown: todayLogCount > 0 && !todayMicroCoverage[m.key],
    over: isOverLimit(m.key, todayMicros[m.key] || 0, supplementAmount(m.key), profile),
    onPress: () => setOpenKey(m.key),
  });

  // The design opens with the day's macros before the vitamin/mineral rings.
  const macroRows = [
    { label: 'Protein', value: todayProtein, target: profile?.proteinTarget || 150, unit: 'g', min: profile?.proteinTargetMin, max: profile?.proteinTargetMax },
    { label: 'Carbs', value: todayCarbs, target: profile?.carbsTarget || 250, unit: 'g', min: profile?.carbsTargetMin, max: profile?.carbsTargetMax },
    { label: 'Fat', value: todayFat, target: profile?.fatTarget || 65, unit: 'g', min: profile?.fatTargetMin, max: profile?.fatTargetMax },
    { label: 'Sugar', value: todaySugar, target: profile?.sugarTarget || 50, unit: 'g', min: profile?.sugarTargetMin, max: profile?.sugarTargetMax },
    { label: 'Fiber', value: todayFiber, target: profile?.fiberTarget || 30, unit: 'g', min: profile?.fiberTargetMin, max: profile?.fiberTargetMax },
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
                  {/* Range markers — the design ticks the bar where a min/max is set. */}
                  {[m.min, m.max].map((mark, mi) =>
                    mark != null && m.target > 0 && mark <= m.target ? (
                      <View key={mi} style={[styles.macroTick, { left: `${(mark / m.target) * 100}%`, backgroundColor: colors.onSurface }]} />
                    ) : null
                  )}
                </View>
              </View>
            );
          })}
        </MotionCard>

        <View style={styles.ringRow}>
          <MotionCard style={styles.ringCard} noEnter>
            <ProgressRing progress={vitaminPct / 100} size={108}
              color={accent} value={`${vitaminPct}%`} />
            <Text variant="titleSmall" style={[styles.ringTitle, { color: colors.onSurface }]}>Vitamins</Text>
          </MotionCard>
          <MotionCard style={styles.ringCard} noEnter>
            <ProgressRing progress={mineralPct / 100} size={108}
              color={accent} value={`${mineralPct}%`} />
            <Text variant="titleSmall" style={[styles.ringTitle, { color: colors.onSurface }]}>Minerals</Text>
          </MotionCard>
        </View>


        <View style={styles.catGrid}>
          {CATEGORIES.map((cat, i) => {
            const pct = categoryPercent(todayMicros, cat.key, profile);
            return (
              <MotionCard key={cat.key} index={i} style={styles.catCard} onPress={() => router.push(`/health/wellness/${cat.key}`)}>
                <View style={[styles.catIconCircle, { backgroundColor: colors.surfaceVariant }]}>
                  <Text style={styles.catIcon}>{cat.icon}</Text>
                </View>
                <View style={[styles.catTrack, { backgroundColor: colors.surfaceVariant }]}>
                  <View style={[styles.catFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: fillColor(pct) }]} />
                </View>
                <Text variant="labelMedium" style={[styles.catLabel, { color: colors.onSurface }]} numberOfLines={1}>
                  {cat.label}
                </Text>
              </MotionCard>
            );
          })}
        </View>

        <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurface }]}>Vitamins</Text>
        <MotionCard style={styles.listCard}>
          {VITAMINS.map((m, i) => <MicroRow key={m.key} {...rowProps(m)} last={i === VITAMINS.length - 1} />)}
        </MotionCard>

        <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurface }]}>Minerals</Text>
        <MotionCard style={styles.listCard}>
          {MINERALS.map((m, i) => <MicroRow key={m.key} {...rowProps(m)} last={i === MINERALS.length - 1} />)}
        </MotionCard>

        <Text variant="labelSmall" style={[styles.disclaimer, { color: colors.onSurfaceVariant }]}>
          Targets and upper limits are the NIH Office of Dietary Supplements values for your age and sex. Amounts are estimated from your logged foods; “—” means none of them report that nutrient. Tap a nutrient for details. Not medical advice.
        </Text>
      </ScrollView>

      <NutrientSheet
        nutrientKey={openKey}
        onDismiss={() => setOpenKey(null)}
        profile={profile}
        amount={openKey ? todayMicros[openKey] || 0 : 0}
        fromSupplements={openKey ? supplementAmount(openKey) : 0}
        coverage={openKey ? todayMicroCoverage[openKey] || 0 : 0}
        logCount={todayLogCount}
      />
    </SafeAreaView>
  );
}

interface MicroRowProps {
  def: MicroDef;
  amount: number;
  profile: NutrientProfile | null;
  /** Foods were logged but none of them report this nutrient. */
  unknown: boolean;
  /** Today's intake is above the NIH upper limit. */
  over: boolean;
  onPress: () => void;
  last: boolean;
}

function MicroRow({ def, amount, profile, unknown, over, onPress, last }: MicroRowProps) {
  const { colors } = useAppTheme();
  const target = targetFor(def.key, profile);
  const pct = Math.round(percentOf(def.key, amount, profile));
  const amountText = unknown ? '—' : formatAmount(amount);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityHint="Shows the NIH target, upper limit and source"
      style={[styles.microRow, !last && { borderBottomColor: colors.outline, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={styles.microHead}>
        <Text variant="bodyMedium" style={[styles.microName, { color: colors.onSurface }]}>{def.label}</Text>
        {over && <MaterialCommunityIcons name="alert-circle" size={16} color={colors.error} accessibilityLabel="Above upper limit" />}
        <Text variant="bodySmall" style={{ color: over ? colors.error : colors.onSurfaceVariant }}>
          {target != null ? `${amountText} / ${formatAmount(target)} ${def.unit}` : `${amountText} ${def.unit} · no NIH target`}
        </Text>
        <Text variant="bodyMedium" style={[styles.microPct, { color: colors.onSurface }]}>
          {target == null || unknown ? '—' : `${pct}%`}
        </Text>
      </View>
      <View style={[styles.microTrack, { backgroundColor: colors.surfaceVariant }]}>
        <View style={[styles.microFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: over ? colors.error : fillColor(pct) }]} />
      </View>
    </Pressable>
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
  macroTick: { position: 'absolute', top: -2, width: 2, height: 12, borderRadius: 1 },
  ringRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  ringCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, gap: spacing.xs },
  ringTitle: { fontWeight: '300' },
  sectionTitle: { fontWeight: '300', marginTop: spacing.md, marginBottom: spacing.sm },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  // 171x170 in the design: a large icon circle, then the bar, then the label.
  catCard: { width: '47.5%', padding: spacing.md, gap: spacing.sm, alignItems: 'center' },
  catIconCircle: { width: 99, height: 97, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  catIcon: { fontSize: 34 },
  catLabel: { fontWeight: '300', textAlign: 'center' },
  catTrack: { height: 9, borderRadius: 5, overflow: 'hidden', alignSelf: 'stretch' },
  catFill: { height: '100%', borderRadius: 4 },

  listCard: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  microRow: { paddingVertical: spacing.sm },
  microHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: 6 },
  microName: { flex: 1, fontWeight: '300' },
  microPct: { fontWeight: '300', minWidth: 44, textAlign: 'right' },
  microTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  microFill: { height: '100%', borderRadius: 4 },
  disclaimer: { textAlign: 'center', marginTop: spacing.lg, lineHeight: 16 },
});
