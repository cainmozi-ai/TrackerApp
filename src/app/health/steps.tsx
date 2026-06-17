import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Button, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, withAlpha } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { MotionCard } from '@/components/common/MotionCard';
import { EmptyState } from '@/components/common/EmptyState';
import { MiniBars } from '@/components/dashboard/MiniCharts';
import { isStepsAvailable, requestStepsPermission, getDailySteps, type DailySteps } from '@/services/healthConnect';

const STEP_COLOR = '#FF8A65';
const RANGES: { value: string; label: string; days: number }[] = [
  { value: '1W', label: '1W', days: 7 },
  { value: '1M', label: '1M', days: 30 },
  { value: '3M', label: '3M', days: 90 },
  { value: '6M', label: '6M', days: 180 },
  { value: '1Y', label: '1Y', days: 365 },
];

export default function StepsScreen() {
  const { colors } = useAppTheme();
  const [range, setRange] = useState('1W');
  const [data, setData] = useState<DailySteps[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (rangeVal: string) => {
    setLoading(true);
    const ok = await isStepsAvailable();
    setAvailable(ok);
    if (!ok) { setData([]); setLoading(false); return; }
    const days = RANGES.find(r => r.value === rangeVal)?.days ?? 7;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    setData(await getDailySteps(start.toISOString(), end.toISOString()));
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(range); }, [range]));

  const connect = async () => {
    setLoading(true);
    await requestStepsPermission();
    await load(range);
  };

  const withSteps = data.filter(d => d.steps > 0);
  const avg = withSteps.length ? Math.round(withSteps.reduce((s, d) => s + d.steps, 0) / withSteps.length) : 0;
  // Show at most ~30 most-recent bars for readability.
  const bars = data.slice(-30).map(d => d.steps);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Steps" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {available === false ? (
          <MotionCard style={styles.connectCard}>
            <MaterialCommunityIcons name="shoe-print" size={40} color={STEP_COLOR} />
            <Text variant="titleMedium" style={[styles.connectTitle, { color: colors.onSurface }]}>Connect your steps</Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
              Sync your daily step count from Samsung Health or Google Fit through Health Connect.
              Install Health Connect on your phone, then grant Life Tracker permission to read steps.
            </Text>
            <Button mode="contained" buttonColor={STEP_COLOR} style={styles.connectBtn} onPress={connect}>
              Connect Health Connect
            </Button>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
              Steps sync only works on the Android build, not the web preview.
            </Text>
          </MotionCard>
        ) : (
          <>
            <MotionCard style={styles.summaryCard} noEnter>
              <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>Average</Text>
              <Text variant="displaySmall" style={[styles.avg, { color: colors.onSurface }]}>
                {avg.toLocaleString()} <Text style={styles.unit}>steps</Text>
              </Text>
            </MotionCard>

            <MotionCard style={styles.chartCard} noEnter>
              {loading ? (
                <ActivityIndicator color={STEP_COLOR} style={{ marginVertical: spacing.lg }} />
              ) : bars.length === 0 ? (
                <EmptyState icon="shoe-print" color={STEP_COLOR} title="No step data"
                  body="No steps recorded for this range yet." />
              ) : (
                <View style={[styles.chartWrap, { backgroundColor: withAlpha(STEP_COLOR, 0.06) }]}>
                  <MiniBars values={bars} color={STEP_COLOR} height={160} />
                </View>
              )}
            </MotionCard>

            <SegmentedButtons
              value={range}
              onValueChange={setRange}
              buttons={RANGES.map(r => ({ value: r.value, label: r.label }))}
              style={styles.ranges}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  connectCard: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  connectTitle: { fontWeight: '800', marginTop: spacing.xs },
  connectBtn: { marginTop: spacing.sm, borderRadius: shape.pill },
  summaryCard: { marginBottom: spacing.md },
  avg: { fontWeight: '800' },
  unit: { fontSize: 14, fontWeight: '400' },
  chartCard: { marginBottom: spacing.md },
  chartWrap: { borderRadius: shape.md, padding: spacing.md },
  ranges: { marginTop: spacing.sm },
});
