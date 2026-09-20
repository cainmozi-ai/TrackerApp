import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, withAlpha, accent } from '@/theme';
import { ProgressRing } from '@/components/common/ProgressRing';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useWeightStore } from '@/stores/weightStore';
import { useSleepStore } from '@/stores/sleepStore';
import { useUserStore } from '@/stores/userStore';
import { groupPercent } from '@/utils/micronutrients';
import { VOLUME_LANDMARKS, volumeStatus, type VolumeStatus } from '@/data/volumeLandmarks';

const VOL_COLOR: Record<VolumeStatus, string> = {
  under: '#FF6B6B', low: '#FFA726', optimal: '#66BB6A', high: '#66BB6A', over: '#A83232',
};

const LEARN_FACTS = [
  'Your body uses 3 energy systems yet only one burns fat — the Aerobic (Oxidative Phosphorylation) system. The other two are the Creatine-phosphate and Anaerobic-glycolysis systems.',
  'Muscle grows in the 24–72 hours after training, not during it. Sleep and protein are when the adaptation actually happens.',
  'Progressive overload — slightly more weight, reps, or sets over time — is the single biggest driver of strength and size.',
  'Protein has the highest thermic effect of any macro: ~25–30% of its calories are burned just digesting it.',
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const {
    todayCalories, todayProtein, todayCarbs, todayFat, todayFiber, todaySugar, todaySodium,
    todayMicros, loadTodayLogs,
  } = useNutritionStore();
  const { getMuscleVolume } = useWorkoutStore();
  const { getTrendSeries } = useWeightStore();
  const { todayLog: sleep, loadTodayLog: loadSleep } = useSleepStore();
  const { profile, loadProfile } = useUserStore();

  const [muscleVol, setMuscleVol] = useState<Record<string, number>>({});
  const [latestWeight, setLatestWeight] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadTodayLogs(); loadProfile(); loadSleep();
      getMuscleVolume(7).then(rows => setMuscleVol(Object.fromEntries(rows.map(r => [r.muscleGroup, r.sets]))));
      getTrendSeries(14).then(pts => setLatestWeight(pts.length ? pts[pts.length - 1].trend : null));
    }, [])
  );

  const p = profile;
  const calTarget = p?.calorieTarget || 2000;
  const eaten = todayCalories;
  const left = Math.max(0, calTarget - eaten);
  const unit = p?.weightUnit ?? 'kg';
  const sleepHrs = sleep ? `${Math.floor(sleep.durationMinutes / 60)}h ${sleep.durationMinutes % 60}m` : '—';
  const vitPct = Math.round(groupPercent(todayMicros, 'vitamin'));
  const minPct = Math.round(groupPercent(todayMicros, 'mineral'));
  const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
  const fact = LEARN_FACTS[new Date().getDate() % LEARN_FACTS.length];

  const macros = [
    { label: 'Protein', val: todayProtein, target: p?.proteinTarget || 150, min: p?.proteinTargetMin ?? null, max: p?.proteinTargetMax ?? null },
    { label: 'Carbs', val: todayCarbs, target: p?.carbsTarget || 250, min: p?.carbsTargetMin ?? null, max: p?.carbsTargetMax ?? null },
    { label: 'Fat', val: todayFat, target: p?.fatTarget || 65, min: p?.fatTargetMin ?? null, max: p?.fatTargetMax ?? null },
  ];
  const micros = [
    { label: 'Fiber', val: todayFiber, target: p?.fiberTarget || 30, min: p?.fiberTargetMin ?? null, max: p?.fiberTargetMax ?? null },
    { label: 'Sugar', val: todaySugar, target: p?.sugarTarget || 50, min: p?.sugarTargetMin ?? null, max: p?.sugarTargetMax ?? null },
    { label: 'Sodium', val: todaySodium, target: p?.sodiumTarget || 2300 },
  ];
  const muscleOrder = Object.keys(VOLUME_LANDMARKS);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="labelSmall" style={[styles.dateKicker, { color: colors.onSurfaceVariant }]}>{dateStr}</Text>
            <Text variant="headlineMedium" style={[styles.greeting, { color: colors.onBackground }]}>{greeting()}</Text>
          </View>
          <Pressable onPress={() => router.push('/profile')} style={[styles.avatar, { backgroundColor: accent }]}>
            <Text variant="titleMedium" style={{ color: colors.onPrimary, fontWeight: '800' }}>
              {(p?.name?.trim()?.[0] || 'Y').toUpperCase()}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push('/dashboard-customize')} style={styles.customizeButton} accessibilityLabel="Customize dashboard">
            <MaterialCommunityIcons name="tune-variant" size={21} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        {/* Nutrition card */}
        <Pressable onPress={() => router.push('/health/nutrition')} style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.calRow}>
            <CalRing eaten={eaten} target={calTarget} colors={colors} />
            <View style={styles.macroCol}>
              <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
                <Text style={{ fontWeight: '800' }}>{left}</Text>
                <Text style={{ color: colors.onSurfaceVariant }}> / {calTarget} kcal left</Text>
              </Text>
              {macros.map(m => <MacroRow key={m.label} {...m} colors={colors} />)}
            </View>
          </View>
          <View style={styles.microRow}>
            {micros.map(m => <MicroCol key={m.label} {...m} colors={colors} />)}
          </View>
        </Pressable>

        {/* Weekly Workouts */}
        <SectionTitle title="Weekly Workouts" onSeeAll={() => router.push('/fitness/progress')} colors={colors} />
        <Pressable onPress={() => router.push('/fitness/progress')} style={[styles.card, { backgroundColor: colors.surface }]}>
          {muscleOrder.map(group => {
            const sets = muscleVol[group] || 0;
            const lm = VOLUME_LANDMARKS[group];
            const { status, label } = volumeStatus(sets, lm);
            const color = VOL_COLOR[status];
            const fillPct = Math.min(100, (sets / lm.mrv) * 100);
            const mevPct = Math.min(100, (lm.mev / lm.mrv) * 100);
            return (
              <View key={group} style={styles.volRow}>
                <View style={styles.volHead}>
                  <Text variant="labelMedium" style={{ color: colors.onSurface, fontWeight: '700' }}>{group}</Text>
                  <Text variant="labelSmall" style={{ color }}>{sets} sets · {label}</Text>
                </View>
                <View style={[styles.volTrack, { backgroundColor: colors.surfaceVariant }]}>
                  <View style={[styles.volFill, { width: `${Math.max(3, fillPct)}%`, backgroundColor: color }]} />
                  <View style={[styles.volMev, { left: `${mevPct}%`, backgroundColor: colors.onSurface }]} />
                </View>
              </View>
            );
          })}
        </Pressable>

        {/* Health Analytics */}
        <SectionTitle title="Health Analytics" colors={colors} />
        <View style={styles.grid}>
          <StatCard label="Weight" value={latestWeight != null ? `${latestWeight}` : '—'} unit={unit}
            icon="scale-bathroom" colors={colors} onPress={() => router.push('/health/weight')} />
          <StatCard label="Sleep" value={sleepHrs} icon="moon-waning-crescent" colors={colors} onPress={() => router.push('/health/sleep')} />
          <RingCard label="Vitamins" pct={vitPct} colors={colors} onPress={() => router.push('/health/micronutrients')} />
          <RingCard label="Minerals" pct={minPct} colors={colors} onPress={() => router.push('/health/micronutrients')} />
        </View>

        {/* Learn */}
        <SectionTitle title="Learn" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text variant="bodyMedium" style={{ color: colors.onSurface, lineHeight: 22 }}>{fact}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type C = ReturnType<typeof useAppTheme>['colors'];

function SectionTitle({ title, onSeeAll, colors }: { title: string; onSeeAll?: () => void; colors: C }) {
  return (
    <View style={styles.sectionHead}>
      <Text variant="titleMedium" style={{ color: colors.onBackground, fontWeight: '700' }}>{title}</Text>
      {onSeeAll && <Text variant="labelMedium" style={{ color: accent }} onPress={onSeeAll}>See All</Text>}
    </View>
  );
}

function CalRing({ eaten, target, colors }: { eaten: number; target: number; colors: C }) {
  const size = 118, sw = 11, r = (size - sw) / 2, circ = 2 * Math.PI * r;
  const prog = Math.min(1, target ? eaten / target : 0);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceVariant} strokeWidth={sw} fill="transparent" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={accent} strokeWidth={sw} fill="transparent"
          strokeDasharray={`${circ}`} strokeDashoffset={circ * (1 - prog)} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <View style={styles.calCenter}>
        <Text variant="titleLarge" style={{ color: colors.onSurface, fontWeight: '800' }}>{eaten}</Text>
        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>eaten</Text>
      </View>
    </View>
  );
}

function MacroRow({ label, val, target, min = null, max = null, colors }: { label: string; val: number; target: number; min?: number | null; max?: number | null; colors: C }) {
  const hasRange = min !== null && max !== null && max >= min;
  const scale = Math.max(target, max ?? 0, val, 1);
  const status = hasRange ? val < min! ? '#FF6B6B' : val > max! ? '#FFA726' : '#66BB6A' : val > target ? '#FFA726' : '#66BB6A';
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroLabels}>
        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
        <Text variant="labelSmall" style={{ color: colors.onSurface }}>{val}/{hasRange ? `${min}-${max}` : target}g</Text>
      </View>
      <View style={[styles.macroTrack, { backgroundColor: colors.surfaceVariant }]}>
        {hasRange && <View style={[styles.targetBand, { left: `${(min! / scale) * 100}%`, width: `${((max! - min!) / scale) * 100}%` }]} />}
        <View style={[styles.macroFill, { width: `${Math.min(100, (val / scale) * 100)}%`, backgroundColor: status }]} />
      </View>
    </View>
  );
}

function MicroCol({ label, val, target, min = null, max = null, colors }: { label: string; val: number; target: number; min?: number | null; max?: number | null; colors: C }) {
  const hasRange = min !== null && max !== null && max >= min;
  const scale = Math.max(target, max ?? 0, val, 1);
  const status = hasRange ? val < min! ? '#FF6B6B' : val > max! ? '#FFA726' : '#66BB6A' : val > target ? '#FFA726' : '#66BB6A';
  return (
    <View style={styles.microCol}>
      <View style={styles.macroLabels}>
        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
        <Text variant="labelSmall" style={{ color: colors.onSurface }}>{val}/{hasRange ? `${min}-${max}` : target}</Text>
      </View>
      <View style={[styles.macroTrack, { backgroundColor: colors.surfaceVariant }]}>
        {hasRange && <View style={[styles.targetBand, { left: `${(min! / scale) * 100}%`, width: `${((max! - min!) / scale) * 100}%` }]} />}
        <View style={[styles.macroFill, { width: `${Math.min(100, (val / scale) * 100)}%`, backgroundColor: status }]} />
      </View>
    </View>
  );
}

function StatCard({ label, value, unit, icon, colors, onPress }: { label: string; value: string; unit?: string; icon: string; colors: C; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.gridCard, { backgroundColor: colors.surface }]}>
      <MaterialCommunityIcons name={icon as never} size={22} color={accent} />
      <Text variant="headlineSmall" style={{ color: colors.onSurface, fontWeight: '800', marginTop: 6 }}>
        {value}{unit && value !== '—' ? <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}> {unit}</Text> : null}
      </Text>
      <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
    </Pressable>
  );
}

function RingCard({ label, pct, colors, onPress }: { label: string; pct: number; colors: C; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.gridCard, styles.ringCard, { backgroundColor: colors.surface }]}>
      <ProgressRing progress={pct / 100} size={96} strokeWidth={9} color={accent} value={`${pct}%`} />
      <Text variant="labelLarge" style={{ color: colors.onSurface, fontWeight: '600', marginTop: 4 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  dateKicker: { letterSpacing: 1.5, fontWeight: '700', marginBottom: 2 },
  greeting: { fontWeight: '800' },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  customizeButton: { width: 36, height: 44, justifyContent: 'center', alignItems: 'flex-end' },
  card: { borderRadius: shape.lg, padding: spacing.md, marginBottom: spacing.xs },
  calRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  calCenter: { position: 'absolute', width: 118, height: 118, justifyContent: 'center', alignItems: 'center' },
  macroCol: { flex: 1, gap: 6 },
  macroRow: { gap: 3 },
  macroLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  macroTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  targetBand: { position: 'absolute', top: 0, bottom: 0, backgroundColor: withAlpha('#66BB6A', 0.3) },
  macroFill: { height: '100%', borderRadius: 3 },
  microRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  microCol: { flex: 1, gap: 3 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm },
  volRow: { marginBottom: spacing.sm },
  volHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  volTrack: { height: 10, borderRadius: 5, position: 'relative', overflow: 'hidden' },
  volFill: { height: '100%', borderRadius: 5 },
  volMev: { position: 'absolute', top: -2, width: 2, height: 14, opacity: 0.6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  gridCard: { width: '48%', borderRadius: shape.lg, padding: spacing.md, minHeight: 96 },
  ringCard: { alignItems: 'center', minHeight: 160, justifyContent: 'center' },
});
