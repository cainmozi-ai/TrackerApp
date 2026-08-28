import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text, Portal, Dialog, Button, IconButton } from 'react-native-paper';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape } from '@/theme';

interface Props {
  visible: boolean;
  /** Current start date/time of the workout. */
  initial: Date;
  onDismiss: () => void;
  /** Called with the chosen epoch-ms when the user saves. */
  onSave: (ms: number) => void;
}

const DAY = 86400000;

/** Lightweight "when did this happen?" picker — a horizontal day strip (today
 * back three weeks) plus hour/minute steppers. No native date-picker dep. */
export function WorkoutDateDialog({ visible, initial, onDismiss, onSave }: Props) {
  const { colors } = useAppTheme();
  const [dayMs, setDayMs] = useState(0);
  const [hour, setHour] = useState(12);
  const [min, setMin] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const d = new Date(initial);
    setDayMs(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
    setHour(d.getHours());
    setMin(d.getMinutes());
  }, [visible, initial]);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Array.from({ length: 21 }, (_, i) => today - i * DAY);
  const dayLabel = (ms: number) => {
    if (ms === today) return 'Today';
    if (ms === today - DAY) return 'Yesterday';
    return new Date(ms).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  };
  const pad = (n: number) => String(n).padStart(2, '0');
  const save = () => { onSave(dayMs + hour * 3600000 + min * 60000); onDismiss(); };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>When did this happen?</Dialog.Title>
        <Dialog.Content>
          <Text variant="labelSmall" style={[styles.lbl, { color: colors.onSurfaceVariant }]}>Day</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayStrip}>
            <View style={styles.dayStripRow}>
              {days.map(ms => {
                const on = ms === dayMs;
                return (
                  <Pressable key={ms} onPress={() => setDayMs(ms)}
                    style={[styles.dayChip, { backgroundColor: on ? colors.primary : colors.surfaceVariant }]}>
                    <Text variant="labelMedium" style={{ color: on ? colors.onPrimary : colors.onSurface, fontWeight: '700' }}>
                      {dayLabel(ms)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Text variant="labelSmall" style={[styles.lbl, { color: colors.onSurfaceVariant }]}>Time</Text>
          <View style={styles.timeRow}>
            <IconButton icon="minus" size={18} onPress={() => setHour(h => (h + 23) % 24)} />
            <Text variant="headlineSmall" style={[styles.timeVal, { color: colors.onSurface }]}>{pad(hour)}</Text>
            <IconButton icon="plus" size={18} onPress={() => setHour(h => (h + 1) % 24)} />
            <Text variant="headlineSmall" style={{ color: colors.onSurfaceVariant }}>:</Text>
            <IconButton icon="minus" size={18} onPress={() => setMin(m => (m + 55) % 60)} />
            <Text variant="headlineSmall" style={[styles.timeVal, { color: colors.onSurface }]}>{pad(min)}</Text>
            <IconButton icon="plus" size={18} onPress={() => setMin(m => (m + 5) % 60)} />
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button onPress={save}>Save</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  lbl: { marginBottom: spacing.xs },
  dayStrip: { marginBottom: spacing.md },
  dayStripRow: { flexDirection: 'row', gap: spacing.xs },
  dayChip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: shape.pill },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  timeVal: { fontWeight: '800', width: 42, textAlign: 'center' },
});
