import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Platform, Linking } from 'react-native';
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
import {
  getStepsState, requestStepsPermission, getDailySteps, openSettings,
  type DailySteps, type StepsState,
} from '@/services/healthConnect';

const STEP_COLOR = '#FF8A65';
const HEALTH_CONNECT_PKG = 'com.google.android.apps.healthdata';
const RANGES: { value: string; label: string; days: number }[] = [
  { value: '1W', label: '1W', days: 7 },
  { value: '1M', label: '1M', days: 30 },
  { value: '3M', label: '3M', days: 90 },
  { value: '6M', label: '6M', days: 180 },
  { value: '1Y', label: '1Y', days: 365 },
];

/** Open the Health Connect listing in the Play Store (falls back to web). */
function openPlayStore() {
  const market = `market://details?id=${HEALTH_CONNECT_PKG}`;
  const web = `https://play.google.com/store/apps/details?id=${HEALTH_CONNECT_PKG}`;
  Linking.openURL(market).catch(() => Linking.openURL(web).catch(() => {}));
}

export default function StepsScreen() {
  const { colors } = useAppTheme();
  const [range, setRange] = useState('1W');
  const [data, setData] = useState<DailySteps[]>([]);
  const [state, setState] = useState<StepsState | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (rangeVal: string) => {
    setLoading(true);
    const s = await getStepsState();
    setState(s);
    if (s !== 'ready') { setData([]); setLoading(false); return; }
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

  const renderGate = (s: StepsState) => {
    const onWeb = Platform.OS !== 'android';
    if (s === 'needs-permission') {
      return (
        <MotionCard style={styles.connectCard}>
          <MaterialCommunityIcons name="shoe-print" size={40} color={STEP_COLOR} />
          <Text variant="titleMedium" style={[styles.connectTitle, { color: colors.onSurface }]}>Connect your steps</Text>
          <Text variant="bodyMedium" style={[styles.connectBody, { color: colors.onSurfaceVariant }]}>
            Allow Life Tracker to read your daily step count from Health Connect. Your steps come from Samsung Health,
            Google Fit, or whichever app you use — synced privately on your device.
          </Text>
          <Button mode="contained" buttonColor={STEP_COLOR} style={styles.connectBtn} onPress={connect}>
            Grant steps access
          </Button>
          <Button mode="text" textColor={colors.onSurfaceVariant} onPress={openSettings}>
            Open Health Connect settings
          </Button>
        </MotionCard>
      );
    }
    // unavailable / update-required
    return (
      <MotionCard style={styles.connectCard}>
        <MaterialCommunityIcons name="heart-plus-outline" size={40} color={STEP_COLOR} />
        <Text variant="titleMedium" style={[styles.connectTitle, { color: colors.onSurface }]}>
          {s === 'update-required' ? 'Update Health Connect' : 'Set up Health Connect'}
        </Text>
        <Text variant="bodyMedium" style={[styles.connectBody, { color: colors.onSurfaceVariant }]}>
          {onWeb
            ? 'Steps sync runs through Health Connect on the Android app — it isn’t available in the web preview.'
            : s === 'update-required'
              ? 'Your Health Connect app needs an update before Life Tracker can read your steps.'
              : 'Life Tracker reads your steps from Health Connect — the hub that links Samsung Health and Google Fit. Install it (built in on Android 14+), then come back to connect.'}
        </Text>
        {!onWeb && (
          <Button mode="contained" buttonColor={STEP_COLOR} style={styles.connectBtn} onPress={openPlayStore}>
            {s === 'update-required' ? 'Update Health Connect' : 'Get Health Connect'}
          </Button>
        )}
        {!onWeb && (
          <Button mode="text" textColor={colors.onSurfaceVariant} onPress={() => load(range)}>
            I’ve installed it — retry
          </Button>
        )}
      </MotionCard>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Steps" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {state === null ? (
          <ActivityIndicator color={STEP_COLOR} style={{ marginVertical: spacing.xl }} />
        ) : state !== 'ready' ? (
          renderGate(state)
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
                  body="No steps recorded for this range yet. Walk around and check back!" />
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

            <Button mode="text" textColor={colors.onSurfaceVariant} style={styles.manageBtn} onPress={openSettings}>
              Manage in Health Connect
            </Button>
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
  connectBody: { textAlign: 'center' },
  connectBtn: { marginTop: spacing.sm, borderRadius: shape.pill },
  summaryCard: { marginBottom: spacing.md },
  avg: { fontWeight: '800' },
  unit: { fontSize: 14, fontWeight: '400' },
  chartCard: { marginBottom: spacing.md },
  chartWrap: { borderRadius: shape.md, padding: spacing.md },
  ranges: { marginTop: spacing.sm },
  manageBtn: { marginTop: spacing.md },
});
