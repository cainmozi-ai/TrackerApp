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
import { spacing, shape, accent, moduleColors, withAlpha } from '@/theme';
import { useWorkoutStore, type WorkoutPR } from '@/stores/workoutStore';
import { useUserStore } from '@/stores/userStore';
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
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getWorkoutDetail, detectPRs } = useWorkoutStore();
  const { profile } = useUserStore();
  const [workout, setWorkout] = useState<WorkoutLog | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [prs, setPrs] = useState<WorkoutPR[]>([]);
  const [snack, setSnack] = useState('');
  const shareCardRef = useRef<View>(null);

  const weightUnit = profile?.weightUnit ?? 'kg';

  useEffect(() => {
    (async () => {
      const wid = Number(id);
      if (!wid) return;
      const detail = await getWorkoutDetail(wid);
      if (detail) {
        setWorkout(detail.workout);
        setSets(detail.sets);
      }
      setPrs(await detectPRs(wid));
    })();
  }, [id]);

  const exerciseCount = new Set(sets.map(s => s.exerciseId)).size;
  const totalVolume = Math.round(sets.reduce((sum, s) => sum + s.weight * s.reps, 0));
  const totalReps = sets.reduce((sum, s) => sum + s.reps, 0);

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
          <View style={[styles.iconCircle, { backgroundColor: withAlpha(accent, 0.18) }]}>
            <MaterialCommunityIcons name="trophy" size={48} color={accent} />
          </View>
        </Animated.View>

        <Text variant="headlineMedium" style={[styles.title, { color: colors.onBackground }]}>Workout Complete!</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          {workout?.name || 'Workout'} · {workout ? formatDuration(workout.startedAt, workout.finishedAt) : ''}
        </Text>

        <Animated.View entering={FadeInUp.delay(150)} style={[styles.statsCard, { backgroundColor: colors.surface }]}>
          <View style={styles.stat}>
            <Text variant="headlineSmall" style={{ color: accent, fontWeight: '800' }}>{exerciseCount}</Text>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Exercises</Text>
          </View>
          <View style={styles.stat}>
            <Text variant="headlineSmall" style={{ color: accent, fontWeight: '800' }}>{sets.length}</Text>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Sets</Text>
          </View>
          <View style={styles.stat}>
            <Text variant="headlineSmall" style={{ color: accent, fontWeight: '800' }}>{totalReps}</Text>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Reps</Text>
          </View>
          <View style={styles.stat}>
            <Text variant="headlineSmall" style={{ color: accent, fontWeight: '800' }}>{totalVolume}</Text>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Volume ({weightUnit})</Text>
          </View>
        </Animated.View>

        {prs.length > 0 && (
          <Animated.View entering={FadeInUp.delay(300)} style={[styles.prCard, { backgroundColor: withAlpha(moduleColors.gamification, 0.12), borderColor: moduleColors.gamification }]}>
            <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '800', marginBottom: spacing.xs }}>
              🏆 {prs.length} Personal Record{prs.length > 1 ? 's' : ''}!
            </Text>
            {prs.map((pr, i) => (
              <View key={i} style={styles.prRow}>
                <MaterialCommunityIcons name="medal" size={18} color={moduleColors.gamification} />
                <Text variant="bodyMedium" style={{ color: colors.onSurface, flex: 1 }}>
                  {pr.exerciseName}: {prText(pr, weightUnit)}
                </Text>
              </View>
            ))}
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.delay(400)} style={[styles.xpCard, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons name="star-four-points" size={22} color={moduleColors.gamification} />
          <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '700' }}>+50 XP earned</Text>
        </Animated.View>
        </View>

        <Button mode="contained-tonal" icon="share-variant" style={styles.shareBtn} onPress={handleShare}>
          {Platform.OS === 'web' ? 'Copy Summary' : 'Share Workout Card'}
        </Button>

        <Animated.View entering={FadeInUp.delay(500)}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurface }]}>What you did</Text>
          {Array.from(new Set(sets.map(s => s.exerciseId))).map(exId => {
            const exSets = sets.filter(s => s.exerciseId === exId);
            const name = exSets[0]?.exercise?.name || 'Exercise';
            return (
              <View key={exId} style={[styles.exRow, { backgroundColor: colors.surface }]}>
                <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>{name}</Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                  {exSets.map(s => formatSetCompact(s, (exSets[0]?.exercise?.logType || 'weight_reps') as LogType)).join(', ')}
                </Text>
              </View>
            );
          })}
        </Animated.View>

        <Button mode="contained" buttonColor={accent} style={styles.doneBtn}
          onPress={() => router.replace('/(tabs)/fitness')}>
          Done
        </Button>
      </ScrollView>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2500}>{snack}</Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  heroIcon: { alignItems: 'center', marginTop: spacing.lg },
  iconCircle: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
  title: { fontWeight: '800', textAlign: 'center', marginTop: spacing.md },
  subtitle: { textAlign: 'center', marginBottom: spacing.lg },
  statsCard: { flexDirection: 'row', justifyContent: 'space-around', padding: spacing.md, borderRadius: shape.lg, marginBottom: spacing.sm },
  stat: { alignItems: 'center' },
  prCard: { padding: spacing.md, borderRadius: shape.lg, borderWidth: 1.5, marginBottom: spacing.sm },
  prRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  xpCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: shape.lg, marginBottom: spacing.sm },
  shareBtn: { marginBottom: spacing.sm, borderRadius: shape.pill },
  sectionTitle: { fontWeight: '700', marginTop: spacing.sm, marginBottom: spacing.xs },
  exRow: { padding: spacing.md, borderRadius: shape.md, marginBottom: spacing.xs },
  doneBtn: { marginTop: spacing.lg, borderRadius: shape.pill },
});
