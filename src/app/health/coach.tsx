import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Button, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, withAlpha } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { MotionCard } from '@/components/common/MotionCard';
import { EmptyState } from '@/components/common/EmptyState';
import { useUserStore } from '@/stores/userStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useWeightStore } from '@/stores/weightStore';
import { estimateExpenditure, targetsFromExpenditure, GOAL_LABELS, type Goal, type ExpenditureResult, type NutritionTargets } from '@/utils/calories';

export default function CoachScreen() {
  const { colors } = useAppTheme();
  const { profile, loadProfile, updateProfile } = useUserStore();
  const { getDailyTotals } = useNutritionStore();
  const { getTrendSeries } = useWeightStore();
  const [result, setResult] = useState<ExpenditureResult | null>(null);
  const [rec, setRec] = useState<NutritionTargets | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [snack, setSnack] = useState('');

  const refresh = useCallback(async () => {
    await loadProfile();
    const intake = await getDailyTotals(21);
    const trend = await getTrendSeries(60);
    const est = estimateExpenditure(intake, trend);
    setResult(est);
    const weightKg = trend.length ? trend[trend.length - 1].trend : (useUserStore.getState().profile?.weight ?? null);
    setCurrentWeight(weightKg);
    if (est.expenditure && weightKg) {
      const goal = (useUserStore.getState().profile?.goal as Goal) || 'maintain';
      setRec(targetsFromExpenditure(est.expenditure, goal, weightKg));
    } else {
      setRec(null);
    }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const goal = (profile?.goal as Goal) || 'maintain';

  const applyTargets = async () => {
    if (!rec) return;
    await updateProfile({
      calorieTarget: rec.calories,
      proteinTarget: rec.protein,
      carbsTarget: rec.carbs,
      fatTarget: rec.fat,
      waterTarget: rec.water,
    });
    setSnack('Targets updated from your coach');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Coach" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!result?.expenditure || !rec ? (
          <EmptyState
            icon="chart-bell-curve-cumulative"
            color={accent}
            title="Keep logging to unlock your coach"
            body="Once you've logged food for about a week and your weight a few times, your coach estimates your real metabolism and recommends an adjusted target."
          />
        ) : (
          <>
            <MotionCard style={styles.card} noEnter>
              <View style={styles.cardHead}>
                <MaterialCommunityIcons name="fire" size={20} color={accent} />
                <Text variant="titleMedium" style={[styles.cardTitle, { color: colors.onSurface }]}>Estimated expenditure</Text>
              </View>
              <Text variant="displaySmall" style={[styles.big, { color: accent }]}>{result.expenditure}</Text>
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>kcal / day maintenance</Text>
              {result.weeklyRateKg !== null && (
                <Text variant="bodySmall" style={[styles.sub, { color: colors.onSurfaceVariant }]}>
                  Weight trend: {result.weeklyRateKg > 0 ? '+' : ''}{result.weeklyRateKg} kg/week · based on {result.days} days
                </Text>
              )}
            </MotionCard>

            <MotionCard style={styles.card} noEnter>
              <View style={styles.cardHead}>
                <MaterialCommunityIcons name="target" size={20} color={accent} />
                <Text variant="titleMedium" style={[styles.cardTitle, { color: colors.onSurface }]}>
                  Recommended target
                </Text>
              </View>
              <Text variant="bodySmall" style={[styles.sub, { color: colors.onSurfaceVariant }]}>
                For your goal: {GOAL_LABELS[goal]}
              </Text>
              <View style={styles.macroRow}>
                <Macro label="Calories" value={String(rec.calories)} />
                <Macro label="Protein" value={`${rec.protein}g`} />
                <Macro label="Carbs" value={`${rec.carbs}g`} />
                <Macro label="Fat" value={`${rec.fat}g`} />
              </View>
              {profile && rec.calories !== profile.calorieTarget && (
                <Text variant="bodySmall" style={[styles.sub, { color: colors.onSurfaceVariant }]}>
                  Current target: {profile.calorieTarget} kcal
                </Text>
              )}
              <Button mode="contained" onPress={applyTargets} style={styles.applyBtn} buttonColor={accent}>
                Apply recommended target
              </Button>
            </MotionCard>

            <Text variant="bodySmall" style={[styles.footnote, { color: colors.onSurfaceVariant }]}>
              This is a suggestion based on your own data — apply it only if it fits how you feel. It recalibrates as you keep logging.
            </Text>
          </>
        )}
      </ScrollView>
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2500}>{snack}</Snackbar>
    </SafeAreaView>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.macro}>
      <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '800' }}>{value}</Text>
      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  card: { marginBottom: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontWeight: '700' },
  big: { fontWeight: '800', marginTop: spacing.sm },
  sub: { marginTop: spacing.xs },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  macro: { alignItems: 'center', flex: 1 },
  applyBtn: { marginTop: spacing.lg, borderRadius: shape.pill },
  footnote: { textAlign: 'center', lineHeight: 18, marginTop: spacing.sm },
});
