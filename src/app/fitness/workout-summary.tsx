import { useState, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View, Platform } from 'react-native';
import { Text, Button, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, withAlpha } from '@/theme';
import { useWorkoutStore, type WorkoutPR } from '@/stores/workoutStore';
import { useUserStore, getLevelName } from '@/stores/userStore';
import { WorkoutDateDialog } from '@/components/workout/WorkoutDateDialog';
import { MuscleMap } from '@/components/workout/MuscleMap';
import { type LogType, formatSetCompact, formatDuration as formatSecs } from '@/utils/workout';
import type { WorkoutLog, WorkoutSet } from '@/types';

function formatDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return '—';
  const ms = new Date(finishedAt.replace(' ', 'T')).getTime() - new Date(startedAt.replace(' ', 'T')).getTime();
  const mins = Math.max(1, Math.round(ms / 60000));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
}

/** Human-readable before→after for any PR type. */
function prText(pr: WorkoutPR, unit: string): string {
  switch (pr.type) {
    case 'weight': return `${pr.previous} → ${pr.value} ${unit}`;
    case '1rm': return `est. 1RM ${pr.previous} → ${pr.value} ${unit}`;
    case 'reps': return `${pr.previous} → ${pr.value} reps`;
    case 'time': return `${formatSecs(pr.previous)} → ${formatSecs(pr.value)}`;
    case 'distance': return `${pr.previous} → ${pr.value} km`;
  }
}

export default function WorkoutSummaryScreen() {
  const { colors } = useAppTheme();
  const { id, xp, levelUp } = useLocalSearchParams<{ id?: string; xp?: string; levelUp?: string }>();
  const xpGained = Number(xp) || 0;
  const newLevel = Number(levelUp) || 0;
  const { getWorkoutDetail, detectPRs, updateWorkoutDate } = useWorkoutStore();
  const { profile } = useUserStore();
  const [workout, setWorkout] = useState<WorkoutLog | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [prs, setPrs] = useState<WorkoutPR[]>([]);
  const [snack, setSnack] = useState('');
  const [dateDlg, setDateDlg] = useState(false);
  const shareCardRef = useRef<View>(null);

  const weightUnit = profile?.weightUnit ?? 'kg';

  const load = async () => {
    const wid = Number(id);
    if (!wid) return;
    const detail = await getWorkoutDetail(wid);
    if (detail) {
      setWorkout(detail.workout);
      setSets(detail.sets);
    }
    setPrs(await detectPRs(wid));
  };

  useEffect(() => { load(); }, [id]);

  const whenLabel = workout
    ? new Date(workout.startedAt.replace(' ', 'T')).toLocaleString(undefined,
        { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

  const handleSaveDate = async (ms: number) => {
    if (!id) return;
    await updateWorkoutDate(Number(id), ms);
    await load();
    setSnack('Workout date updated');
  };

  const exerciseCount = new Set(sets.map(s => s.exerciseId)).size;
  const totalVolume = Math.round(sets.reduce((sum, s) => sum + s.weight * s.reps, 0));
  const totalReps = sets.reduce((sum, s) => sum + s.reps, 0);
  const setsByGroup = sets.reduce((acc, s) => {
    const g = s.exercise?.muscleGroup;
    if (g) acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const shareText = () => {
    const lines = [
      `💪 ${workout?.name || 'Workout'} complete — ${workout ? formatDuration(workout.startedAt, workout.finishedAt) : ''}`,
      `${exerciseCount} exercises · ${sets.length} sets · ${totalVolume} ${weightUnit} volume`,
    ];
    for (const pr of prs) {
      lines.push(`🏆 PR — ${pr.exerciseName}: ${prText(pr, weightUnit)}`);
    }
    lines.push('Tracked with Incus');
    return lines.join('\n');
  };

  const handleShare = async () => {
    if (Platform.OS === 'web') {
      const text = shareText();
      try {
        await navigator.clipboard.writeText(text);
        setSnack('Summary copied — paste it anywhere');
      } catch {
        // Clipboard API can refuse without document focus — legacy fallback.
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(ta);
          setSnack(ok ? 'Summary copied — paste it anywhere' : "Couldn't copy to clipboard");
        } catch {
          setSnack("Couldn't copy to clipboard");
        }
      }
      return;
    }
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share workout' });
      } else {
        setSnack('Sharing not available on this device');
      }
    } catch {
      setSnack("Couldn't create the share image");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View ref={shareCardRef} collapsable={false} style={{ backgroundColor: colors.background }}>
        <Animated.View entering={ZoomIn.duration(400)} style={styles.heroIcon}>
          <View style={[styles.iconCircle, { backgroundColor: accent }]}>
            <MaterialCommunityIcons name="check" size={44} color="#FFFFFF" />
          </View>
        </Animated.View>

        <Text variant="headlineMedium" style={[styles.title, { color: colors.onBackground }]}>Workout Complete!</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          {workout?.name || 'Workout'} · {workout ? formatDuration(workout.startedAt, workout.finishedAt) : ''}
        </Text>
        {!!whenLabel && (
          <Text variant="labelSmall" style={[styles.whenText, { color: colors.onSurfaceVariant }]}>{whenLabel}</Text>
        )}

        <Animated.View entering={FadeInUp.delay(150)} style={styles.statsGrid}>
          <View style={[styles.stat, { backgroundColor: colors.surface }]}>
            <Text variant="headlineSmall" style={{ color: colors.onSurface, fontWeight: '300' }}>{exerciseCount}</Text>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Exercises</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: colors.surface }]}>
            <Text variant="headlineSmall" style={{ color: colors.onSurface, fontWeight: '300' }}>{sets.length}</Text>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Sets</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: colors.surface }]}>
            <Text variant="headlineSmall" style={{ color: colors.onSurface, fontWeight: '300' }}>{totalReps}</Text>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Reps</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: colors.surface }]}>
            <Text variant="headlineSmall" style={{ color: colors.onSurface, fontWeight: '300' }}>{totalVolume}</Text>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Volume ({weightUnit})</Text>
          </View>
        </Animated.View>

        {prs.length > 0 && (
          <Animated.View entering={FadeInUp.delay(220)}
            style={[styles.prCard, { backgroundColor: withAlpha(accent, 0.12), borderColor: accent }]}>
            <View style={styles.prHead}>
              <MaterialCommunityIcons name="trophy" size={20} color={colors.accentText} />
              <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '300' }}>
                {prs.length === 1 ? 'New personal record' : `${prs.length} new personal records`}
              </Text>
            </View>
            {prs.map((pr, i) => (
              <View key={`${pr.exerciseName}-${pr.type}-${i}`} style={styles.prRow}>
                <Text variant="bodyMedium" style={{ color: colors.onSurface, flex: 1 }} numberOfLines={1}>{pr.exerciseName}</Text>
                <Text variant="bodyMedium" style={{ color: colors.accentText, fontWeight: '300' }}>{prText(pr, weightUnit)}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {xpGained > 0 && (
          <Animated.View entering={FadeInUp.delay(260)} style={[styles.xpCard, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name="star-four-points" size={20} color={colors.accentText} />
            <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '300' }}>+{xpGained} XP</Text>
            {newLevel > 0 && (
              <Text variant="bodyMedium" style={{ color: colors.accentText, fontWeight: '300' }}>
                · Level up! Lv. {newLevel} {getLevelName(newLevel)}
              </Text>
            )}
          </Animated.View>
        )}

        {Object.keys(setsByGroup).length > 0 && (
          <Animated.View entering={FadeInUp.delay(300)} style={[styles.mapCard, { backgroundColor: colors.surface }]}> 
            <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '300', marginBottom: spacing.xs }}>Muscles worked</Text>
            <MuscleMap setsByGroup={setsByGroup} />
          </Animated.View>
        )}
        </View>

        <View style={styles.summaryActions}>
          <Button mode="contained" buttonColor={colors.surface} textColor={colors.onSurface} style={styles.shareBtn}
            contentStyle={styles.secondaryContent} onPress={handleShare}>
            {Platform.OS === 'web' ? 'Copy Summary' : 'Share Summary'}
          </Button>
          <Button mode="contained" buttonColor={colors.surface} textColor={colors.onSurface} style={styles.shareBtn}
            contentStyle={styles.secondaryContent} onPress={() => setDateDlg(true)}>
            Change date & time
          </Button>
        </View>

        <Button mode="contained" buttonColor={accent} style={styles.doneBtn} contentStyle={styles.primaryContent}
          onPress={() => router.replace('/(tabs)/fitness')}>
          Done
        </Button>
      </ScrollView>

      {workout && (
        <WorkoutDateDialog
          visible={dateDlg}
          initial={new Date(workout.startedAt.replace(' ', 'T'))}
          onDismiss={() => setDateDlg(false)}
          onSave={handleSaveDate}
        />
      )}

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2500}>{snack}</Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  heroIcon: { alignItems: 'center', marginTop: spacing.lg },
  iconCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  title: { fontWeight: '400', textAlign: 'center', marginTop: spacing.md },
  subtitle: { textAlign: 'center', marginBottom: 2 },
  whenText: { textAlign: 'center', marginBottom: spacing.lg },
  changeDateBtn: { marginBottom: spacing.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.lg },
  stat: { width: '48.5%', height: 72, borderRadius: shape.lg, alignItems: 'center', justifyContent: 'center' },
  prCard: { padding: spacing.md, borderRadius: shape.lg, borderWidth: 1.5, marginBottom: spacing.sm },
  prHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  prRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  xpCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: shape.lg, marginBottom: spacing.sm },
  mapCard: { padding: spacing.md, borderRadius: shape.lg, marginBottom: spacing.sm },
  summaryActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  shareBtn: { flex: 1, borderRadius: shape.md },
  secondaryContent: { height: 44 },
  sectionTitle: { fontWeight: '300', marginTop: spacing.sm, marginBottom: spacing.xs },
  exRow: { padding: spacing.md, borderRadius: shape.md, marginBottom: spacing.xs },
  doneBtn: { marginTop: spacing.lg, borderRadius: shape.md },
  primaryContent: { height: 48 },
});
