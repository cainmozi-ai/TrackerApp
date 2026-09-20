import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, SegmentedButtons, Button, Chip, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, withAlpha } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { MotionCard } from '@/components/common/MotionCard';
import { EmptyState } from '@/components/common/EmptyState';
import { useWorkoutStore, type Program } from '@/stores/workoutStore';
import programsData from '@/data/programs.json';

/** Weeks + stripe colour live with the seed data, not in the database. */
const PROGRAM_META: Record<string, { weeks: number; stripe: string; blurb: string }> = Object.fromEntries(
  (programsData as { name: string; weeks: number; stripe: string; description: string }[])
    .map(p => [p.name, { weeks: p.weeks, stripe: p.stripe, blurb: p.description }])
);

const LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced'];

export default function ProgramsScreen() {
  const { colors } = useAppTheme();
  const { loadPrograms, cloneProgram } = useWorkoutStore();
  const [level, setLevel] = useState('All');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [snack, setSnack] = useState('');

  useEffect(() => {
    loadPrograms(level === 'All' ? undefined : level).then(setPrograms);
  }, [level]);

  const handleAdd = async (p: Program) => {
    await cloneProgram(p.programName);
    setSnack(`${p.programName} added to My Routines`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Programs" />
      <SegmentedButtons
        value={level}
        onValueChange={setLevel}
        buttons={LEVELS.map(l => ({ value: l, label: l === 'All' ? 'All' : l.slice(0, 3) }))}
        style={styles.segmented}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {programs.length === 0 ? (
          <EmptyState icon="dumbbell" color={accent} title="No programs here"
            body="Try a different experience level." />
        ) : (
          programs.map((p, i) => {
            const meta = PROGRAM_META[p.programName] ?? { weeks: 8, stripe: accent, blurb: p.split };
            return (
              <MotionCard key={p.programName} index={i} style={styles.card}>
                <View style={[styles.stripe, { backgroundColor: meta.stripe }]} />
                <View style={styles.cardBody}>
                  <Text variant="titleMedium" style={[styles.name, { color: colors.onSurface }]}>{p.programName}</Text>
                  <View style={[styles.levelChip, { backgroundColor: withAlpha(meta.stripe, 0.18) }]}>
                    <Text variant="labelSmall" style={{ color: meta.stripe, fontWeight: '700' }}>{p.level}</Text>
                  </View>
                  <Text variant="bodySmall" style={[styles.schedule, { color: colors.onSurfaceVariant }]}>
                    {p.daysPerWeek} days/week · {meta.weeks} weeks
                  </Text>
                  <View style={styles.bottomRow}>
                    <Text variant="bodyMedium" style={[styles.blurb, { color: colors.onSurface }]}>{meta.blurb || p.split}</Text>
                    <Button mode="outlined" compact onPress={() => handleAdd(p)}
                      textColor={meta.stripe} style={[styles.startBtn, { borderColor: meta.stripe }]}>
                      Start →
                    </Button>
                  </View>
                </View>
              </MotionCard>
            );
          })
        )}
      </ScrollView>
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2500}>{snack}</Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  segmented: { marginHorizontal: spacing.md, marginBottom: spacing.sm },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  // padding 0 so the stripe runs flush to the card edge; the body re-adds it
  card: { marginBottom: spacing.md, overflow: 'hidden', padding: 0, flexDirection: 'row' },
  stripe: { width: 4, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: spacing.md, gap: 6 },
  name: { fontWeight: '700' },
  levelChip: { alignSelf: 'flex-start', borderRadius: shape.pill, paddingHorizontal: 10, paddingVertical: 3 },
  schedule: {},
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: 2 },
  blurb: { flex: 1 },
  startBtn: { borderRadius: shape.pill },
});
