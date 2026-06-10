import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, IconButton, Button } from 'react-native-paper';
import { useAppTheme } from '@/theme/ThemeContext';
import { moduleColors, spacing, shape, withAlpha } from '@/theme';

interface RestTimerProps {
  defaultSeconds?: number;
  /** Increment this to auto-reset and start the timer (e.g. when a set is logged). */
  autoStartSignal?: number;
}

export function RestTimer({ defaultSeconds = 90, autoStartSignal = 0 }: RestTimerProps) {
  const { colors } = useAppTheme();
  const [remaining, setRemaining] = useState(defaultSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firstSignal = useRef(true);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) { setRunning(false); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  // Auto-start when the signal changes (skip the initial mount).
  useEffect(() => {
    if (firstSignal.current) { firstSignal.current = false; return; }
    setRemaining(defaultSeconds);
    setRunning(true);
  }, [autoStartSignal]);

  const reset = (s: number) => { setRunning(false); setRemaining(s); };
  const adjust = (d: number) => setRemaining(prev => Math.max(0, prev + d));
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const isDone = remaining === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.row}>
        <IconButton icon="minus" size={20} onPress={() => adjust(-15)} />
        <View style={styles.timeBlock}>
          <Text variant="headlineMedium" style={[styles.time, { color: isDone ? moduleColors.habits : moduleColors.workout }]}>
            {fmt(remaining)}
          </Text>
          <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
            {isDone ? 'Rest complete!' : running ? 'Resting…' : 'Rest timer'}
          </Text>
        </View>
        <IconButton icon="plus" size={20} onPress={() => adjust(15)} />
      </View>
      <View style={styles.controls}>
        <Button mode={running ? 'contained-tonal' : 'contained'} icon={running ? 'pause' : 'play'}
          onPress={() => setRunning(r => !r)} compact style={styles.controlBtn} buttonColor={running ? undefined : moduleColors.workout}>
          {running ? 'Pause' : 'Start'}
        </Button>
        <Button mode="outlined" icon="restart" onPress={() => reset(defaultSeconds)} compact style={styles.controlBtn}>
          Reset
        </Button>
      </View>
      <View style={styles.presets}>
        {[60, 90, 120, 180].map(s => (
          <Button key={s} mode="text" compact onPress={() => reset(s)} labelStyle={styles.presetLabel}
            textColor={withAlpha(moduleColors.workout, 1)}>
            {s < 120 ? `${s}s` : `${s / 60}m`}
          </Button>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: shape.lg, padding: spacing.md, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeBlock: { alignItems: 'center' },
  time: { fontWeight: '800' },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm },
  controlBtn: { minWidth: 110 },
  presets: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xs },
  presetLabel: { fontSize: 12 },
});
