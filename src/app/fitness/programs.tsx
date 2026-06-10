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
            const muscles = Array.from(new Set(p.days.flatMap(d => d.muscles))).slice(0, 6);
            return (
              <MotionCard key={p.programName} index={i} style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={styles.titleWrap}>
                    <Text variant="titleMedium" style={[styles.name, { color: colors.onSurface }]}>{p.programName}</Text>
                    <Text variant="labelMedium" style={{ color: accent }}>
                      {p.level} · {p.daysPerWeek} days/week · {p.split}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="dumbbell" size={22} color={colors.onSurfaceVariant} />
                </View>

                <View style={styles.dayRow}>
                  {p.days.map(d => (
                    <Chip key={d.templateId} compact style={[styles.dayChip, { backgroundColor: colors.surfaceVariant }]} textStyle={styles.dayChipText}>
                      {d.label}
                    </Chip>
                  ))}
                </View>

                {muscles.length > 0 && (
                  <Text variant="bodySmall" style={[styles.muscles, { color: colors.onSurfaceVariant }]}>
                    {muscles.join(' · ')}
                  </Text>
                )}

                <Button mode="contained" icon="plus" onPress={() => handleAdd(p)} style={styles.addBtn} buttonColor={accent}>
                  Add to My Routines
                </Button>
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
  card: { marginBottom: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  titleWrap: { flex: 1 },
  name: { fontWeight: '700' },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  dayChip: {},
  dayChipText: { fontSize: 11 },
  muscles: { marginTop: spacing.sm },
  addBtn: { marginTop: spacing.md, borderRadius: shape.pill },
});
