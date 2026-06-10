import { useState, useEffect, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Dimensions } from 'react-native';
import { Text, TextInput, Button, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, withAlpha } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { MotionCard } from '@/components/common/MotionCard';
import { EmptyState } from '@/components/common/EmptyState';
import { useWeightStore, type TrendPoint } from '@/stores/weightStore';
import { useUserStore } from '@/stores/userStore';

const screenWidth = Dimensions.get('window').width;

export default function WeightScreen() {
  const { colors } = useAppTheme();
  const { recent, loadRecent, logWeight, deleteLog, getTrendSeries } = useWeightStore();
  const { profile, loadProfile } = useUserStore();
  const [input, setInput] = useState('');
  const [series, setSeries] = useState<TrendPoint[]>([]);

  const refresh = useCallback(async () => {
    await loadRecent();
    await loadProfile();
    setSeries(await getTrendSeries(60));
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const handleLog = async () => {
    const w = parseFloat(input);
    if (!w || w <= 0) return;
    await logWeight(w);
    setInput('');
    setSeries(await getTrendSeries(60));
  };

  const unit = profile?.weightUnit || 'kg';
  const latestTrend = series.length ? series[series.length - 1].trend : null;
  const firstTrend = series.length ? series[0].trend : null;
  const totalChange = latestTrend !== null && firstTrend !== null ? Math.round((latestTrend - firstTrend) * 10) / 10 : null;

  const chartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 1,
    color: (o = 1) => withAlpha(accent, o),
    labelColor: () => colors.onSurfaceVariant,
    propsForDots: { r: '3' },
    propsForBackgroundLines: { stroke: colors.outlineVariant },
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Weight" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <MotionCard style={styles.logCard} noEnter>
          <Text variant="titleMedium" style={[styles.cardTitle, { color: colors.onSurface }]}>Log today's weight</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={input} onChangeText={setInput} mode="outlined" keyboardType="numeric"
              placeholder="0.0" right={<TextInput.Affix text={unit} />} style={styles.input}
            />
            <Button mode="contained" onPress={handleLog} disabled={!input} style={styles.logBtn} buttonColor={accent}>
              Log
            </Button>
          </View>
        </MotionCard>

        {series.length < 2 ? (
          <EmptyState icon="scale-bathroom" color={accent} title="Track your trend"
            body="Log your weight a few days in a row and a smoothed trend line will appear here — cutting through daily fluctuations." />
        ) : (
          <>
            <MotionCard style={styles.statsRow} noEnter>
              <Stat label="Trend" value={`${latestTrend} ${unit}`} />
              <Stat label="Change" value={totalChange !== null ? `${totalChange > 0 ? '+' : ''}${totalChange} ${unit}` : '—'} />
              <Stat label="Logs" value={String(recent.length)} />
            </MotionCard>

            <MotionCard style={styles.chartCard} noEnter>
              <Text variant="titleSmall" style={[styles.cardTitle, { color: colors.onSurface }]}>Trend (smoothed)</Text>
              <LineChart
                data={{
                  labels: series.map(s => s.date.slice(5)).filter((_, i) => i % Math.ceil(series.length / 5) === 0),
                  datasets: [
                    { data: series.map(s => s.scale), color: (o = 1) => withAlpha(colors.onSurfaceVariant, o * 0.5), withDots: true },
                    { data: series.map(s => s.trend), color: (o = 1) => withAlpha(accent, o), withDots: false, strokeWidth: 3 },
                  ],
                }}
                width={screenWidth - spacing.md * 4}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </MotionCard>

            <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onBackground }]}>Recent</Text>
            {recent.slice(0, 10).map(log => (
              <View key={log.id} style={[styles.logRow, { backgroundColor: colors.surface }]}>
                <Text variant="bodyMedium" style={{ color: colors.onSurface, flex: 1 }}>{log.logDate}</Text>
                <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '700' }}>{log.weight} {unit}</Text>
                <IconButton icon="close" size={16} onPress={() => deleteLog(log.id)} />
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.stat}>
      <Text variant="titleMedium" style={{ color: accent, fontWeight: '800' }}>{value}</Text>
      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  logCard: { marginBottom: spacing.md },
  cardTitle: { fontWeight: '700', marginBottom: spacing.sm },
  inputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: { flex: 1 },
  logBtn: { borderRadius: shape.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.md },
  stat: { alignItems: 'center' },
  chartCard: { marginBottom: spacing.md, alignItems: 'center' },
  chart: { borderRadius: shape.md, marginTop: spacing.sm },
  sectionTitle: { fontWeight: '700', marginBottom: spacing.sm },
  logRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.xs, paddingLeft: spacing.md, borderRadius: shape.sm, marginBottom: spacing.xs },
});
