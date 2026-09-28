import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, IconButton, Button, SegmentedButtons, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Pill } from '@/components/common/Pill';
import { useUserStore } from '@/stores/userStore';
import { DASHBOARD_SECTIONS, SECTION_LABEL, DEFAULT_DASHBOARD } from '@/utils/dashboard';
import { MUSCLE_GROUPS } from '@/utils/muscles';
import type { DashboardConfig } from '@/types';

export default function DashboardCustomizeScreen() {
  const { colors } = useAppTheme();
  const { profile, loadProfile, updateProfile } = useUserStore();
  const [cfg, setCfg] = useState<DashboardConfig>(DEFAULT_DASHBOARD);
  const [snack, setSnack] = useState('');

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => { if (profile?.dashboardConfig) setCfg(profile.dashboardConfig); }, [profile?.dashboardConfig]);

  const enabled = cfg.sections;
  const disabled = DASHBOARD_SECTIONS.map(s => s.key).filter(k => !enabled.includes(k));

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...enabled];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setCfg(c => ({ ...c, sections: next }));
  };
  const remove = (key: string) => setCfg(c => ({ ...c, sections: c.sections.filter(k => k !== key) }));
  const add = (key: string) => setCfg(c => ({ ...c, sections: [...c.sections, key] }));

  const toggleMuscle = (g: string) =>
    setCfg(c => ({ ...c, muscleGroups: c.muscleGroups.includes(g) ? c.muscleGroups.filter(x => x !== g) : [...c.muscleGroups, g] }));

  const save = async () => {
    await updateProfile({ dashboardConfig: cfg });
    setSnack('Dashboard saved');
    setTimeout(() => router.back(), 700);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Customize Dashboard" right={<Button onPress={save} compact>Save</Button>} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurface }]}>Sections (drag order with arrows)</Text>
        {enabled.map((key, idx) => (
          <View key={key} style={[styles.row, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name="drag-horizontal-variant" size={20} color={colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={[styles.rowLabel, { color: colors.onSurface }]}>{SECTION_LABEL[key]}</Text>
            <IconButton icon="arrow-up" size={18} disabled={idx === 0} onPress={() => move(idx, -1)} style={styles.arrow} />
            <IconButton icon="arrow-down" size={18} disabled={idx === enabled.length - 1} onPress={() => move(idx, 1)} style={styles.arrow} />
            <IconButton icon="eye-off" size={18} iconColor={colors.error} onPress={() => remove(key)} style={styles.arrow} />
          </View>
        ))}

        {disabled.length > 0 && (
          <>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurface }]}>Hidden sections</Text>
            <View style={styles.chipWrap}>
              {disabled.map(key => (
                <Pill key={key} label={`+ ${SECTION_LABEL[key]}`} onPress={() => add(key)} />
              ))}
            </View>
          </>
        )}

        <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurface }]}>Muscle Group cards</Text>
        <View style={styles.chipWrap}>
          {MUSCLE_GROUPS.map(g => (
            <Pill key={g} label={g} selected={cfg.muscleGroups.includes(g)} onPress={() => toggleMuscle(g)} />
          ))}
        </View>

        <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurface }]}>Exercise card metric</Text>
        <SegmentedButtons
          value={cfg.exerciseMetric}
          onValueChange={v => setCfg(c => ({ ...c, exerciseMetric: v as DashboardConfig['exerciseMetric'] }))}
          buttons={[
            { value: 'weight', label: 'Top set' },
            { value: '1rm', label: 'Est. 1RM' },
            { value: 'volume', label: 'Volume' },
          ]}
        />

        <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurface }]}>Weekly targets</Text>
        <View style={styles.targetRow}>
          <TargetStepper label="Muscles" value={cfg.targets.muscles} onChange={v => setCfg(c => ({ ...c, targets: { ...c.targets, muscles: v } }))} />
          <TargetStepper label="Sets" value={cfg.targets.sets} step={5} onChange={v => setCfg(c => ({ ...c, targets: { ...c.targets, sets: v } }))} />
          <TargetStepper label="Exercises" value={cfg.targets.exercises} onChange={v => setCfg(c => ({ ...c, targets: { ...c.targets, exercises: v } }))} />
        </View>

        <Button mode="contained" buttonColor={accent} style={styles.saveBtn} onPress={save}>Save Dashboard</Button>
        <Button mode="text" textColor={colors.error} onPress={() => setCfg({ ...DEFAULT_DASHBOARD })}>Reset to defaults</Button>
      </ScrollView>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={1500}>{snack}</Snackbar>
    </SafeAreaView>
  );
}

function TargetStepper({ label, value, step = 1, onChange }: { label: string; value: number; step?: number; onChange: (v: number) => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.stepper, { backgroundColor: colors.surface }]}>
      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
      <View style={styles.stepperRow}>
        <IconButton icon="minus" size={16} onPress={() => onChange(Math.max(0, value - step))} style={styles.arrow} />
        <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '300' }}>{value}</Text>
        <IconButton icon="plus" size={16} onPress={() => onChange(value + step)} style={styles.arrow} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  sectionTitle: { fontWeight: '300', marginTop: spacing.md, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.xs, paddingLeft: spacing.sm, borderRadius: shape.md, marginBottom: spacing.xs, gap: spacing.xs },
  rowLabel: { flex: 1, fontWeight: '300' },
  arrow: { margin: 0 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  targetRow: { flexDirection: 'row', gap: spacing.sm },
  stepper: { flex: 1, borderRadius: shape.md, padding: spacing.sm, alignItems: 'center' },
  stepperRow: { flexDirection: 'row', alignItems: 'center' },
  saveBtn: { marginTop: spacing.lg, borderRadius: shape.md },
});
