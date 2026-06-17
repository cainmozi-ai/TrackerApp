import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text, IconButton, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useAppTheme } from '@/theme/ThemeContext';
import { moduleColors, spacing, shape, withAlpha, accent } from '@/theme';
import { localToday, localDate } from '@/utils/dates';
import { StatTile } from '@/components/common/StatTile';
import { MotionCard } from '@/components/common/MotionCard';
import { ProgressRing } from '@/components/common/ProgressRing';
import { QuickActionFab } from '@/components/common/QuickActionFab';
import { MiniBars, MiniLine, ConsistencyGrid } from '@/components/dashboard/MiniCharts';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useWaterStore } from '@/stores/waterStore';
import { useHabitStore } from '@/stores/habitStore';
import { useSleepStore } from '@/stores/sleepStore';
import { useTaskStore } from '@/stores/taskStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { useWorkoutStore, type DashExercise } from '@/stores/workoutStore';
import { useWeightStore } from '@/stores/weightStore';
import { useUserStore, getLevelName, getXpForCurrentLevel, getXpForNextLevel } from '@/stores/userStore';
import { DEFAULT_DASHBOARD } from '@/utils/dashboard';
import type { WorkoutLog } from '@/types';

const GROUP_COLORS: Record<string, string> = {
  Chest: '#FF6584', Back: '#4FC3F7', Shoulders: '#FFB74D', Arms: '#B388FF',
  Legs: '#81C784', Glutes: '#F06292', Core: '#4DD0E1', Cardio: '#FF8A65',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const { todayCalories, loadTodayLogs: loadFood, getDailyTotals } = useNutritionStore();
  const { todayTotal, loadTodayLogs: loadWater } = useWaterStore();
  const { habits, todayLogs: habitLogs, loadHabits, loadTodayLogs: loadHabitLogs } = useHabitStore();
  const { todayLog: sleep, loadTodayLog: loadSleep } = useSleepStore();
  const { tasks, loadTasks } = useTaskStore();
  const { transactions, loadTransactions } = useBudgetStore();
  const { getActiveWorkout, getWorkoutDates, getMuscleVolume, getWorkoutSummaries, getWeekTrainingStats, getTopExercises } = useWorkoutStore();
  const { getTrendSeries } = useWeightStore();
  const { profile, loadProfile } = useUserStore();

  const [activeWorkout, setActiveWorkout] = useState<WorkoutLog | null>(null);
  const [foodDays, setFoodDays] = useState<Set<string>>(new Set());
  const [workoutDays, setWorkoutDays] = useState<Set<string>>(new Set());
  const [weighDays, setWeighDays] = useState<Set<string>>(new Set());
  const [weekStats, setWeekStats] = useState({ muscles: 0, sets: 0, exercises: 0 });
  const [muscleVol, setMuscleVol] = useState<Record<string, number>>({});
  const [workoutSetBars, setWorkoutSetBars] = useState<number[]>([]);
  const [trend, setTrend] = useState<number[]>([]);
  const [topExercises, setTopExercises] = useState<DashExercise[]>([]);

  const cfg = profile?.dashboardConfig ?? DEFAULT_DASHBOARD;

  useFocusEffect(
    useCallback(() => {
      loadFood(); loadWater(); loadHabits(); loadHabitLogs();
      loadSleep(); loadTasks(); loadTransactions(); loadProfile();
      getActiveWorkout().then(setActiveWorkout);
      getDailyTotals(7).then(rows => setFoodDays(new Set(rows.filter(r => r.calories > 0).map(r => r.date))));
      getWorkoutDates().then(dates => setWorkoutDays(new Set(dates)));
      getWeekTrainingStats(7).then(setWeekStats);
      getMuscleVolume(7).then(rows => setMuscleVol(Object.fromEntries(rows.map(r => [r.muscleGroup, r.sets]))));
      getWorkoutSummaries(7).then(s => setWorkoutSetBars(s.slice().reverse().map(w => w.setCount)));
      getTrendSeries(14).then(pts => setTrend(pts.map(p => p.trend)));
      getTopExercises(4).then(setTopExercises);
      useWeightStore.getState().getTrendSeries(60).then(pts => setWeighDays(new Set(pts.map(p => p.date))));
    }, [])
  );

  const weekDays = (() => {
    const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push({ iso: localDate(d), letter: letters[d.getDay()], dayNum: d.getDate(), isToday: i === 0 });
    }
    return out;
  })();

  const calorieTarget = profile?.calorieTarget || 2000;
  const waterTarget = (profile?.waterTarget || 8) * 250;
  const waterGlasses = Math.floor(todayTotal / 250);
  const habitsDone = habits.filter(h => habitLogs.some(l => l.habitId === h.id)).length;
  const pendingTasks = tasks.filter(t => !t.isCompleted).length;
  const todaySpend = transactions.filter(t => t.type === 'expense' && t.transactionDate === localToday()).reduce((s, t) => s + t.amount, 0);
  const weekWorkouts = workoutSetBars.length;

  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  const xpCur = getXpForCurrentLevel(level);
  const xpNext = getXpForNextLevel(level);
  const xpProgress = xpNext > xpCur ? (xp - xpCur) / (xpNext - xpCur) : 1;
  const sleepHrs = sleep ? `${Math.floor(sleep.durationMinutes / 60)}h ${sleep.durationMinutes % 60}m` : '—';
  const latestWeight = trend.length ? trend[trend.length - 1] : null;
  const unit = profile?.weightUnit ?? 'kg';

  // ---- Section renderers ----
  const SectionTitle = ({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) => (
    <View style={styles.sectionHead}>
      <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onBackground }]}>{title}</Text>
      {onSeeAll && <Text variant="labelMedium" style={{ color: colors.primary }} onPress={onSeeAll}>See All</Text>}
    </View>
  );

  const Card = ({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) => (
    <MotionCard style={styles.halfCard} onPress={onPress}>{children}</MotionCard>
  );

  const renderSection = (key: string) => {
    switch (key) {
      case 'weekly':
        return (
          <View key={key}>
            <SectionTitle title="Weekly Workouts" onSeeAll={() => router.push('/fitness/progress')} />
            <MotionCard style={styles.weeklyCard}>
              <View style={styles.ringRow}>
                <Ring value={weekStats.muscles} target={cfg.targets.muscles} label="Muscles" color="#4FC3F7" />
                <Ring value={weekStats.sets} target={cfg.targets.sets} label="Sets" color="#FF8A65" />
                <Ring value={weekStats.exercises} target={cfg.targets.exercises} label="Exercises" color="#7ED957" />
              </View>
            </MotionCard>
          </View>
        );
      case 'today':
        return (
          <View key={key}>
            <SectionTitle title="Today" />
            <View style={styles.bento}>
              <StatTile index={0} icon="fire" color={moduleColors.nutrition} value={String(todayCalories)} label="calories" caption={`/ ${calorieTarget}`} progress={todayCalories / calorieTarget} onPress={() => router.push('/health/nutrition')} />
              <StatTile index={1} icon="cup-water" color={moduleColors.water} value={String(waterGlasses)} label="glasses" caption={`/ ${profile?.waterTarget || 8}`} progress={todayTotal / waterTarget} onPress={() => router.push('/health/water')} />
              <StatTile index={2} icon="repeat" color={moduleColors.habits} value={`${habitsDone}/${habits.length}`} label="habits" progress={habits.length ? habitsDone / habits.length : 0} onPress={() => router.push('/life/habits')} />
              <StatTile index={3} icon="moon-waning-crescent" color={moduleColors.sleep} value={sleepHrs} label="slept" onPress={() => router.push('/health/sleep')} />
              <StatTile index={4} icon="dumbbell" color={moduleColors.workout} value={String(weekWorkouts)} label={`workout${weekWorkouts === 1 ? '' : 's'} this week`} onPress={() => router.push('/fitness/progress')} />
              <StatTile index={5} icon="checkbox-marked-outline" color={moduleColors.tasks} value={String(pendingTasks)} label="tasks left" onPress={() => router.push('/life/tasks')} />
              <StatTile index={6} icon="wallet" color={moduleColors.budget} value={`$${todaySpend.toFixed(0)}`} label="spent today" onPress={() => router.push('/life/budget')} />
            </View>
          </View>
        );
      case 'insights':
        return (
          <View key={key}>
            <SectionTitle title="Insights & Analytics" />
            <View style={styles.row2}>
              <Card onPress={() => router.push('/fitness/progress')}>
                <Text variant="titleSmall" style={{ color: colors.onSurface }}>Workouts</Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Last 7 workouts</Text>
                <View style={styles.cardChart}>{workoutSetBars.length ? <MiniBars values={workoutSetBars} color="#FF8A65" /> : <Dash />}</View>
                <Text variant="titleMedium" style={[styles.cardValue, { color: colors.onSurface }]}>{workoutSetBars.reduce((a, b) => a + b, 0)} <Text style={styles.unit}>sets</Text></Text>
              </Card>
              <Card onPress={() => router.push('/health/weight')}>
                <Text variant="titleSmall" style={{ color: colors.onSurface }}>Weight Trend</Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Last 14 days</Text>
                <View style={styles.cardChart}>{trend.length > 1 ? <MiniLine values={trend} color="#B388FF" /> : <Dash />}</View>
                <Text variant="titleMedium" style={[styles.cardValue, { color: colors.onSurface }]}>{latestWeight != null ? `${latestWeight} ` : '— '}<Text style={styles.unit}>{unit}</Text></Text>
              </Card>
            </View>
          </View>
        );
      case 'habits':
        return (
          <View key={key}>
            <SectionTitle title="Habits" />
            <View style={styles.row2}>
              <Card onPress={() => router.push('/health/weight')}>
                <Text variant="titleSmall" style={{ color: colors.onSurface }}>Weigh-In</Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Last 4 weeks</Text>
                <View style={styles.cardChart}><ConsistencyGrid days={weighDays} color="#7ED957" /></View>
              </Card>
              <Card onPress={() => router.push('/fitness/progress')}>
                <Text variant="titleSmall" style={{ color: colors.onSurface }}>Workouts</Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Last 4 weeks</Text>
                <View style={styles.cardChart}><ConsistencyGrid days={workoutDays} color={moduleColors.workout} /></View>
              </Card>
            </View>
          </View>
        );
      case 'bodyMetrics':
        return (
          <View key={key}>
            <SectionTitle title="Body Metrics" onSeeAll={() => router.push('/health/measurements')} />
            <View style={styles.row2}>
              <Card onPress={() => router.push('/health/weight')}>
                <Text variant="titleSmall" style={{ color: colors.onSurface }}>Scale Weight</Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Last 14 days</Text>
                <View style={styles.cardChart}>{trend.length > 1 ? <MiniLine values={trend} color="#7ED957" /> : <Dash />}</View>
                <Text variant="titleMedium" style={[styles.cardValue, { color: colors.onSurface }]}>{latestWeight != null ? `${latestWeight} ` : '— '}<Text style={styles.unit}>{unit}</Text></Text>
              </Card>
              <Card onPress={() => router.push('/health/measurements')}>
                <Text variant="titleSmall" style={{ color: colors.onSurface }}>Measurements</Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Tape & photos</Text>
                <View style={styles.cardChart}><MaterialCommunityIcons name="tape-measure" size={32} color="#7E57C2" /></View>
                <Text variant="labelMedium" style={{ color: colors.primary }}>Open tracker →</Text>
              </Card>
            </View>
          </View>
        );
      case 'muscleGroups':
        return (
          <View key={key}>
            <SectionTitle title="Muscle Groups" onSeeAll={() => router.push('/fitness/progress')} />
            <View style={styles.row2}>
              {cfg.muscleGroups.map(g => (
                <Card key={g} onPress={() => router.push('/fitness/progress')}>
                  <View style={styles.muscleHead}>
                    <View style={[styles.dot, { backgroundColor: GROUP_COLORS[g] ?? accent }]} />
                    <Text variant="titleSmall" style={{ color: colors.onSurface }}>{g}</Text>
                  </View>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Last 7 days</Text>
                  <Text variant="headlineSmall" style={[styles.muscleVal, { color: GROUP_COLORS[g] ?? accent }]}>
                    {muscleVol[g] ?? 0} <Text style={styles.unit}>sets</Text>
                  </Text>
                </Card>
              ))}
            </View>
          </View>
        );
      case 'exercises':
        return (
          <View key={key}>
            <SectionTitle title="Exercises" onSeeAll={() => router.push('/fitness/progress')} />
            {topExercises.length === 0 ? (
              <MotionCard style={styles.fullCard}><Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Log a workout to see your top lifts here.</Text></MotionCard>
            ) : (
              <View style={styles.row2}>
                {topExercises.map(ex => {
                  const metric = cfg.exerciseMetric;
                  const val = metric === '1rm' ? ex.last1RM : metric === 'volume' ? ex.lastVolume : ex.lastWeight;
                  const lbl = metric === '1rm' ? 'est. 1RM' : metric === 'volume' ? 'volume' : 'top set';
                  return (
                    <Card key={ex.id} onPress={() => router.push(`/fitness/exercise-detail?id=${ex.id}`)}>
                      <Text variant="titleSmall" style={{ color: colors.onSurface }} numberOfLines={2}>{ex.name}</Text>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{lbl}</Text>
                      <Text variant="headlineSmall" style={[styles.muscleVal, { color: accent }]}>
                        {ex.logType === 'weight_reps' || ex.logType === 'bodyweight' ? `${val} ` : '— '}
                        <Text style={styles.unit}>{metric === 'volume' ? unit : unit}</Text>
                      </Text>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>
        );
      case 'steps':
        return (
          <View key={key}>
            <SectionTitle title="Steps" onSeeAll={() => router.push('/health/steps')} />
            <MotionCard style={styles.fullCard} onPress={() => router.push('/health/steps')}>
              <View style={styles.stepsRow}>
                <MaterialCommunityIcons name="shoe-print" size={26} color="#FF8A65" />
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={{ color: colors.onSurface }}>Daily Steps</Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Connect Health to sync your step count</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
              </View>
            </MotionCard>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text variant="labelSmall" style={[styles.dateKicker, { color: colors.onSurfaceVariant }]}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
            </Text>
            <Text variant="headlineMedium" style={[styles.greeting, { color: colors.onBackground }]}>{greeting()}</Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{profile?.name || "Let's make today count"}</Text>
          </View>
          <IconButton icon="account-circle" size={34} iconColor={colors.primary} onPress={() => router.push('/profile')} />
        </View>

        <Animated.View entering={FadeInUp} style={[styles.weekStrip, { backgroundColor: colors.surface }]}>
          {weekDays.map(day => {
            const ate = foodDays.has(day.iso);
            const trained = workoutDays.has(day.iso);
            return (
              <View key={day.iso} style={styles.weekDay}>
                <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{day.letter}</Text>
                <View style={[styles.weekCircle, { borderColor: ate ? moduleColors.nutrition : withAlpha(colors.onSurfaceVariant, 0.3), backgroundColor: day.isToday ? withAlpha(colors.primary, 0.12) : 'transparent' }]}>
                  <Text variant="labelMedium" style={{ color: colors.onSurface, fontWeight: day.isToday ? '800' : '500' }}>{day.dayNum}</Text>
                </View>
                <MaterialCommunityIcons name="dumbbell" size={10} color={trained ? moduleColors.workout : 'transparent'} />
              </View>
            );
          })}
        </Animated.View>

        <Animated.View entering={FadeInUp} style={[styles.xpCard, { backgroundColor: colors.surface }]}>
          <View style={styles.xpHeader}>
            <View style={styles.levelBadge}>
              <MaterialCommunityIcons name="star-four-points" size={18} color={moduleColors.gamification} />
              <Text variant="titleMedium" style={[styles.levelText, { color: colors.onSurface }]}>Lv. {level}</Text>
              <Text variant="labelMedium" style={{ color: moduleColors.gamification }}>{getLevelName(level)}</Text>
            </View>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{xp} XP</Text>
          </View>
          <View style={[styles.xpTrack, { backgroundColor: withAlpha(colors.primary, 0.16) }]}>
            <View style={[styles.xpFill, { width: `${Math.min(xpProgress * 100, 100)}%`, backgroundColor: colors.primary }]} />
          </View>
        </Animated.View>

        {activeWorkout && (
          <Pressable onPress={() => router.push(`/fitness/active-workout?workoutId=${activeWorkout.id}`)} style={[styles.resumeBanner, { backgroundColor: withAlpha(accent, 0.16), borderColor: accent }]}>
            <MaterialCommunityIcons name="play-circle" size={24} color={accent} />
            <View style={styles.resumeText}>
              <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '700' }}>Workout in progress</Text>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{activeWorkout.name} · tap to resume</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
          </Pressable>
        )}

        {cfg.sections.map(renderSection)}

        <Button mode="contained-tonal" icon="view-dashboard-edit" style={styles.customizeBtn} onPress={() => router.push('/dashboard-customize')}>
          Customize Dashboard
        </Button>
      </ScrollView>

      <QuickActionFab
        actions={[
          { icon: 'food-apple', label: 'Log Meal', color: moduleColors.nutrition, onPress: () => router.push('/health/nutrition/search') },
          { icon: 'dumbbell', label: 'Start Workout', color: moduleColors.workout, onPress: () => router.push('/fitness/active-workout') },
          { icon: 'checkbox-marked-outline', label: 'Add Task', color: moduleColors.tasks, onPress: () => router.push('/life/tasks/add-task') },
          { icon: 'cup-water', label: 'Log Water', color: moduleColors.water, onPress: () => router.push('/health/water') },
        ]}
      />
    </SafeAreaView>
  );
}

function Ring({ value, target, label, color }: { value: number; target: number; label: string; color: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.ring}>
      <ProgressRing progress={target ? value / target : 0} size={88} strokeWidth={9} color={color} value={String(value)} />
      <Text variant="labelMedium" style={[styles.ringLabel, { color: colors.onSurface }]}>{label}</Text>
      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{target} target</Text>
    </View>
  );
}

function Dash() {
  const { colors } = useAppTheme();
  return <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, alignSelf: 'center' }}>— — —</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 130 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  headerLeft: { flex: 1 },
  greeting: { fontWeight: '800' },
  dateKicker: { letterSpacing: 1.5, fontWeight: '700', marginBottom: 2 },
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.sm, borderRadius: shape.lg, marginBottom: spacing.md },
  weekDay: { alignItems: 'center', gap: 3, flex: 1 },
  weekCircle: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  xpCard: { padding: spacing.md, borderRadius: shape.lg, marginBottom: spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelText: { fontWeight: '800' },
  xpTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 4 },
  resumeBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: shape.lg, borderWidth: 1.5, marginBottom: spacing.md },
  resumeText: { flex: 1 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionTitle: { fontWeight: '700' },
  bento: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' },
  weeklyCard: { padding: spacing.md },
  ringRow: { flexDirection: 'row', justifyContent: 'space-around' },
  ring: { alignItems: 'center', gap: 2 },
  ringLabel: { fontWeight: '700', marginTop: 2 },
  row2: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  halfCard: { width: '48%', padding: spacing.md, gap: 2 },
  fullCard: { padding: spacing.md },
  cardChart: { height: 48, justifyContent: 'center', marginVertical: spacing.xs },
  cardValue: { fontWeight: '800' },
  unit: { fontSize: 12, fontWeight: '400' },
  muscleHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  muscleVal: { fontWeight: '800', marginTop: 2 },
  stepsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  customizeBtn: { marginTop: spacing.lg, borderRadius: shape.pill },
});
