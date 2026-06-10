import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Button, IconButton, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { moduleColors, spacing, shape } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { MotionCard } from '@/components/common/MotionCard';
import { useSleepStore } from '@/stores/sleepStore';
import { useUserStore } from '@/stores/userStore';

const QUALITY_LABELS = ['', 'Terrible', 'Poor', 'Okay', 'Good', 'Great'];

export default function SleepScreen() {
  const { colors } = useAppTheme();
  const { todayLog, recentLogs, loadTodayLog, loadRecentLogs, logSleep } = useSleepStore();
  const { reward } = useUserStore();
  const [bedtime, setBedtime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [quality, setQuality] = useState(3);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadTodayLog();
    loadRecentLogs();
  }, []);

  const handleSave = async () => {
    await logSleep(bedtime, wakeTime, quality, notes);
    await reward(10, 'sleep', 'Logged sleep', 'first_sleep');
  };

  const fmt = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Sleep Log" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {todayLog ? (
          <MotionCard style={styles.todayCard} noEnter>
            <MaterialCommunityIcons name="moon-waning-crescent" size={36} color={moduleColors.sleep} />
            <Text variant="headlineMedium" style={[styles.duration, { color: moduleColors.sleep }]}>{fmt(todayLog.durationMinutes)}</Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{todayLog.bedtime} → {todayLog.wakeTime}</Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Quality: {QUALITY_LABELS[todayLog.quality]}</Text>
            <Button mode="text" onPress={() => loadTodayLog()} compact>Re-log</Button>
          </MotionCard>
        ) : (
          <MotionCard style={styles.inputCard} noEnter>
            <Text variant="titleMedium" style={[styles.inputTitle, { color: colors.onSurface }]}>Log Tonight's Sleep</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeInput}>
                <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>Bedtime</Text>
                <TextInput value={bedtime} onChangeText={setBedtime} mode="outlined" placeholder="23:00" />
              </View>
              <View style={styles.timeInput}>
                <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>Wake Time</Text>
                <TextInput value={wakeTime} onChangeText={setWakeTime} mode="outlined" placeholder="07:00" />
              </View>
            </View>
            <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant, marginTop: spacing.sm }}>
              Quality: {QUALITY_LABELS[quality]}
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(q => (
                <IconButton key={q} icon={q <= quality ? 'star' : 'star-outline'}
                  iconColor={q <= quality ? moduleColors.sleep : colors.onSurfaceVariant}
                  size={28} onPress={() => setQuality(q)} />
              ))}
            </View>
            <TextInput label="Notes (optional)" value={notes} onChangeText={setNotes} mode="outlined" multiline style={styles.notes} />
            <Button mode="contained" onPress={handleSave} style={styles.saveBtn} buttonColor={moduleColors.sleep}>Save Sleep</Button>
          </MotionCard>
        )}

        {recentLogs.length > 0 && (
          <View style={styles.history}>
            <Text variant="titleSmall" style={[styles.historyTitle, { color: colors.onBackground }]}>Recent History</Text>
            {recentLogs.map((log, i) => (
              <MotionCard key={log.id} index={i} style={styles.historyRow}>
                <Text variant="bodyMedium" style={{ color: colors.onSurface }}>{log.logDate}</Text>
                <Text variant="bodyMedium" style={{ color: moduleColors.sleep, fontWeight: '700' }}>{fmt(log.durationMinutes)}</Text>
                <View style={styles.starsInline}>
                  {[1, 2, 3, 4, 5].map(q => (
                    <MaterialCommunityIcons key={q} name={q <= log.quality ? 'star' : 'star-outline'} size={13}
                      color={q <= log.quality ? moduleColors.sleep : colors.outline} />
                  ))}
                </View>
              </MotionCard>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md },
  todayCard: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg, paddingVertical: spacing.xl },
  duration: { fontWeight: '800' },
  inputCard: { marginBottom: spacing.lg },
  inputTitle: { fontWeight: '700', marginBottom: spacing.md },
  timeRow: { flexDirection: 'row', gap: spacing.md },
  timeInput: { flex: 1 },
  starsRow: { flexDirection: 'row', justifyContent: 'center' },
  notes: { marginTop: spacing.sm },
  saveBtn: { marginTop: spacing.md, borderRadius: shape.pill },
  history: {},
  historyTitle: { fontWeight: '700', marginBottom: spacing.sm },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  starsInline: { flexDirection: 'row' },
});
