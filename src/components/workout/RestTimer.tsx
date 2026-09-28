import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Platform, AppState, Pressable } from 'react-native';
import { Text, IconButton, Button } from 'react-native-paper';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent } from '@/theme';

interface RestTimerProps {
  defaultSeconds?: number;
  /** Increment this to auto-reset and start the timer (e.g. when a set is logged). */
  autoStartSignal?: number;
}

const beepSource = require('../../../assets/beep.wav');
const isWeb = Platform.OS === 'web';
const REST_CHANNEL = 'rest-timer';
let askedForPermission = false;

/** Two short beeps via WebAudio — expo-audio asset playback is unreliable on web. */
function webBeep() {
  try {
    const Ctx = (window as unknown as { AudioContext: typeof AudioContext }).AudioContext;
    const ctx = new Ctx();
    [0, 0.25].forEach(start => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + 0.2);
    });
  } catch {
    // No audio available — vibration/visual cue still fires.
  }
}

/** Ask once per session, the first time a rest starts, so the end-of-rest alert
 * can reach a locked phone. Declining is fine — the in-app beep still works. */
async function askForAlertPermission(): Promise<void> {
  if (isWeb || askedForPermission) return;
  askedForPermission = true;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (!current.granted && current.canAskAgain) await Notifications.requestPermissionsAsync();
  } catch {
    // Notifications unavailable — the timer still works in the foreground.
  }
}

/** Schedule the "rest over" notification for when the app is in the background. */
async function scheduleRestAlert(seconds: number): Promise<string | null> {
  if (isWeb || seconds < 1) return null;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return null;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(REST_CHANNEL, {
        name: 'Rest timer',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 300, 150, 300],
        lightColor: accent,
      });
    }
    return await Notifications.scheduleNotificationAsync({
      content: { title: 'Rest over', body: 'Time for your next set.', sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.round(seconds),
        channelId: REST_CHANNEL,
      },
    });
  } catch {
    return null;
  }
}

function cancelRestAlert(id: string | null) {
  if (!id || isWeb) return;
  Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

/** Rest countdown. It counts toward a fixed end time rather than ticking a
 * number down, so it stays correct when the phone locks or the app is
 * backgrounded — and a notification fires if rest ends while you're away. */
export function RestTimer({ defaultSeconds = 90, autoStartSignal = 0 }: RestTimerProps) {
  const { colors } = useAppTheme();
  const [remaining, setRemaining] = useState(defaultSeconds);
  const [running, setRunning] = useState(false);
  const [muted, setMuted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // When running: the moment rest ends (ms epoch). When paused: null.
  const endAtRef = useRef<number | null>(null);
  const alertIdRef = useRef<string | null>(null);
  const firstSignal = useRef(true);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const player = useAudioPlayer(beepSource);

  const announceDone = () => {
    if (mutedRef.current) return;
    if (isWeb) {
      webBeep();
      try { navigator.vibrate?.([300, 150, 300]); } catch { /* not supported */ }
    } else {
      try {
        player.seekTo(0);
        player.play();
      } catch { /* audio unavailable */ }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };

  const secondsLeft = () =>
    endAtRef.current ? Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)) : remaining;

  const startFrom = (seconds: number) => {
    endAtRef.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    setRunning(seconds > 0);
    askForAlertPermission();
  };

  const stop = (seconds: number) => {
    endAtRef.current = null;
    setRunning(false);
    setRemaining(seconds);
  };

  // Tick while running: recompute from the end time each time.
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      const left = secondsLeft();
      setRemaining(left);
      if (left === 0) {
        endAtRef.current = null;
        setRunning(false);
        announceDone();
      }
    }, 250);
    return () => clearInterval(iv);
  }, [running]);

  // Hand off to a notification while the app is in the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async next => {
      if (next === 'background' && endAtRef.current) {
        cancelRestAlert(alertIdRef.current);
        alertIdRef.current = await scheduleRestAlert((endAtRef.current - Date.now()) / 1000);
      } else if (next === 'active') {
        cancelRestAlert(alertIdRef.current);
        alertIdRef.current = null;
        if (endAtRef.current && Date.now() >= endAtRef.current) {
          // Rest ended while away — the notification already told them, so no second beep.
          stop(0);
        }
      }
    });
    return () => {
      sub.remove();
      cancelRestAlert(alertIdRef.current);
    };
  }, []);

  // Auto-start when the signal changes (skip the initial mount).
  useEffect(() => {
    if (firstSignal.current) { firstSignal.current = false; return; }
    startFrom(defaultSeconds);
  }, [autoStartSignal]);

  const toggleRunning = () => {
    if (running) stop(secondsLeft());
    else startFrom(remaining);
  };

  const adjust = (d: number) => {
    const next = Math.max(0, secondsLeft() + d);
    if (running) {
      if (next === 0) stop(0);
      else { endAtRef.current = Date.now() + next * 1000; setRemaining(next); }
    } else {
      setRemaining(next);
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const isDone = remaining === 0;
  const status = isDone ? 'Rest complete' : running ? 'Resting…' : 'Rest timer';

  // The design shows a single slim bar ("⏱ Rest timer · 1:30"); the controls
  // fold out underneath when you tap it.
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Pressable onPress={() => setExpanded(e => !e)} style={styles.bar}
        accessibilityRole="button" accessibilityState={{ expanded }}
        accessibilityLabel={`${status}, ${fmt(remaining)}. ${expanded ? 'Hide' : 'Show'} timer controls`}>
        <MaterialCommunityIcons name="timer-outline" size={18} color={colors.onSurface} />
        <Text variant="bodyMedium" style={[styles.status, { color: colors.onSurface }]}>{status}</Text>
        <Text style={[styles.time, { color: colors.accentText }]}>{fmt(remaining)}</Text>
        <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.onSurfaceVariant} />
      </Pressable>

      {expanded && (
        <View style={styles.panel}>
          <View style={styles.controls}>
            <IconButton icon="minus" size={18} mode="contained-tonal" onPress={() => adjust(-15)} accessibilityLabel="Remove 15 seconds" />
            <Button mode={running ? 'contained-tonal' : 'contained'} icon={running ? 'pause' : 'play'}
              onPress={toggleRunning} compact style={styles.controlBtn}
              buttonColor={running ? undefined : accent} textColor={running ? undefined : '#FFFFFF'}>
              {running ? 'Pause' : 'Start'}
            </Button>
            <IconButton icon="plus" size={18} mode="contained-tonal" onPress={() => adjust(15)} accessibilityLabel="Add 15 seconds" />
            <IconButton icon="restart" size={18} mode="contained-tonal" onPress={() => stop(defaultSeconds)} accessibilityLabel="Reset timer" />
            <IconButton
              icon={muted ? 'volume-off' : 'volume-high'}
              size={18}
              mode="contained-tonal"
              iconColor={muted ? colors.onSurfaceVariant : colors.accentText}
              onPress={() => setMuted(m => !m)}
              accessibilityLabel={muted ? 'Unmute timer sound' : 'Mute timer sound'}
            />
          </View>
          <View style={styles.presets}>
            {[60, 90, 120, 180].map(s => (
              <Button key={s} mode="text" compact onPress={() => stop(s)} labelStyle={styles.presetLabel}
                textColor={colors.accentText}>
                {s < 120 ? `${s}s` : `${s / 60}m`}
              </Button>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: shape.md, marginBottom: spacing.sm, overflow: 'hidden' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 15, height: 40 },
  status: { flex: 1 },
  time: { fontSize: 16, fontWeight: '300' },
  panel: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 2 },
  controlBtn: { minWidth: 96, marginHorizontal: spacing.xs },
  presets: { flexDirection: 'row', justifyContent: 'center' },
  presetLabel: { fontSize: 12 },
});
