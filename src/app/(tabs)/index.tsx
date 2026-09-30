import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, withAlpha } from '@/theme';
import { ProgressRing } from '@/components/common/ProgressRing';
import { CalorieCard } from '@/components/nutrition/CalorieCard';
import { WeekStrip } from '@/components/common/WeekStrip';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useWeightStore } from '@/stores/weightStore';
import { useSleepStore } from '@/stores/sleepStore';
import { useWaterStore } from '@/stores/waterStore';
import { useUserStore } from '@/stores/userStore';
import { groupPercent } from '@/utils/micronutrients';
import { localDate } from '@/utils/dates';
import { VOLUME_LANDMARKS, volumeStatus, type VolumeStatus } from '@/data/volumeLandmarks';

// Design avatar: a 40px circle of #880808 at 18%, with the initial in red.
const AVATAR_TINT = '#880808';

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
  const { todayTotal: fluidMl, loadTodayLogs: loadWater } = useWaterStore();
  const { profile, loadProfile } = useUserStore();

  const [muscleVol, setMuscleVol] = useState<Record<string, number>>({});
  const [latestWeight, setLatestWeight] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadTodayLogs(); loadProfile(); loadSleep(); loadWater();
      getMuscleVolume(7).then(rows => setMuscleVol(Object.fromEntries(rows.map(r => [r.muscleGroup, r.sets]))));
      getTrendSeries(14).then(pts => setLatestWeight(pts.length ? pts[pts.length - 1].trend : null));
    }, [])
  );

  const p = profile;
  const eaten = todayCalories;
  const unit = p?.weightUnit ?? 'kg';
  // Health Analytics rings — the design shows Sleep, Fluid, Vitamins, Minerals.
  const sleepMins = sleep?.durationMinutes ?? 0;
  const sleepHours = sleepMins / 60;
  const sleepRingValue = sleepMins ? `${Number(sleepHours.toFixed(sleepHours % 1 ? 1 : 0))} Hrs` : '—';
  const fluidTargetMl = (p?.waterTarget || 8) * 250;
  const fluidRingValue = `${Number((fluidMl / 1000).toFixed(1))} L`;
  const vitPct = Math.round(groupPercent(todayMicros, 'vitamin', p));
  const minPct = Math.round(groupPercent(todayMicros, 'mineral', p));
  const todayIso = localDate(new Date());
  const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
  const fact = LEARN_FACTS[new Date().getDate() % LEARN_FACTS.length];

  const muscleOrder = Object.keys(VOLUME_LANDMARKS);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="labelSmall" style={[styles.dateKicker, { color: colors.onSurfaceVariant }]}>{dateStr}</Text>
            <Text variant="headlineLarge" style={[styles.greeting, { color: colors.onBackground }]}>{greeting()}</Text>
          </View>
          <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel="Profile"
            style={[styles.avatar, { backgroundColor: withAlpha(AVATAR_TINT, 0.18) }]}>
            <Text style={[styles.avatarLetter, { color: colors.accentText }]}>
              {(p?.name?.trim()?.[0] || 'Y').toUpperCase()}
            </Text>
          </Pressable>
        </View>

        {/* Week strip — the design shows it between the greeting and the
            nutrition card. Home itself is a today view, so picking a day opens
            that day in Nutrition rather than rewinding the whole dashboard. */}
        <WeekStrip selected={todayIso} onSelect={iso => router.push(`/health/nutrition?date=${iso}`)} />

        {/* Nutrition card */}
        <CalorieCard
          profile={p}
          totals={{ calories: eaten, protein: todayProtein, carbs: todayCarbs, fat: todayFat, fiber: todayFiber, sugar: todaySugar, sodium: todaySodium }}
          onPress={() => router.push('/health/nutrition')}
        />

        {/* Weekly Workouts */}
        <SectionTitle title="Weekly Workouts" colors={colors} />
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
                  <Text variant="labelMedium" style={{ color: colors.onSurface, fontWeight: '300' }}>{group}</Text>
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
          <RingCard label="Sleep" value={sleepRingValue} progress={sleepMins / (8 * 60)}
            colors={colors} onPress={() => router.push('/health/sleep')} />
          <RingCard label="Fluid" value={fluidRingValue} progress={fluidTargetMl ? fluidMl / fluidTargetMl : 0}
            colors={colors} onPress={() => router.push('/health/water')} />
          <RingCard label="Vitamins" value={`${vitPct}%`} progress={vitPct / 100}
            colors={colors} onPress={() => router.push('/health/micronutrients')} />
          <RingCard label="Minerals" value={`${minPct}%`} progress={minPct / 100}
            colors={colors} onPress={() => router.push('/health/micronutrients')} />
        </View>
        {/* The design has no weight card; keep the screen reachable from here. */}
        <Pressable onPress={() => router.push('/health/weight')} style={[styles.weightLink, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons name="scale-bathroom" size={18} color={accent} />
          <Text variant="bodyMedium" style={{ color: colors.onSurface, flex: 1 }}>Weight</Text>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            {latestWeight != null ? `${latestWeight} ${unit}` : '—'}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
        </Pressable>

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
      <Text variant="titleMedium" style={{ color: colors.onBackground, fontWeight: '300' }}>{title}</Text>
      {onSeeAll && <Text variant="labelMedium" style={{ color: colors.accentText }} onPress={onSeeAll}>See All</Text>}
    </View>
  );
}

function RingCard({ label, value, progress, colors, onPress }: { label: string; value: string; progress: number; colors: C; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.gridCard, styles.ringCard, { backgroundColor: colors.surface }]}>
      <ProgressRing progress={Math.min(1, progress || 0)} size={108} color={accent} value={value} />
      <Text variant="labelLarge" style={{ color: colors.onSurface, fontWeight: '300', marginTop: 4 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  dateKicker: { fontWeight: '300', marginBottom: 2 },
  greeting: { fontWeight: '300' },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: 16, fontWeight: '300' },
  card: { borderRadius: shape.lg, padding: spacing.md, marginBottom: spacing.xs },
  weightLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: shape.lg, paddingHorizontal: spacing.md, paddingVertical: 12, marginTop: spacing.sm },
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
