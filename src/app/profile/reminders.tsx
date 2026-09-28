import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Platform } from 'react-native';
import { Text, Switch, Portal, Dialog, Button, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, withAlpha } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useReminderStore, REMINDER_DEFS, formatTime, type ReminderType } from '@/stores/reminderStore';

type MdiName = keyof typeof MaterialCommunityIcons.glyphMap;

export default function RemindersScreen() {
  const { colors } = useAppTheme();
  const { reminders, permission, loadReminders, setReminder } = useReminderStore();
  const [timeFor, setTimeFor] = useState<ReminderType | null>(null);
  const [hour, setHour] = useState(18);
  const [minute, setMinute] = useState(0);

  useFocusEffect(useCallback(() => { loadReminders(); }, []));

  const openTime = (type: ReminderType) => {
    const r = reminders[type];
    setHour(r.hour); setMinute(r.minute); setTimeFor(type);
  };

  const saveTime = async () => {
    if (timeFor) await setReminder(timeFor, { hour, minute });
    setTimeFor(null);
  };

  const bump = (unit: 'h' | 'm', dir: 1 | -1) => {
    if (unit === 'h') setHour(h => (h + dir + 24) % 24);
    else setMinute(m => (m + dir * 5 + 60) % 60);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Reminders" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {Platform.OS === 'web' ? (
          <View style={[styles.note, { backgroundColor: withAlpha(accent, 0.1) }]}>
            <MaterialCommunityIcons name="information" size={18} color={accent} />
            <Text variant="bodySmall" style={{ color: colors.onSurface, flex: 1 }}>
              Reminders are delivered on your phone — install the app to receive them. You can still set your preferences here.
            </Text>
          </View>
        ) : permission === 'denied' && (
          <View style={[styles.note, { backgroundColor: withAlpha('#FF6B6B', 0.12) }]}>
            <MaterialCommunityIcons name="bell-off" size={18} color="#FF6B6B" />
            <Text variant="bodySmall" style={{ color: colors.onSurface, flex: 1 }}>
              Notifications are turned off for Incus. Enable them in your phone's settings to receive reminders.
            </Text>
          </View>
        )}

        {REMINDER_DEFS.map(def => {
          const r = reminders[def.type];
          return (
            <View key={def.type} style={[styles.row, { backgroundColor: colors.surface }]}>
              <View style={[styles.iconWrap, { backgroundColor: withAlpha(accent, 0.14) }]}>
                <MaterialCommunityIcons name={def.icon as MdiName} size={22} color={accent} />
              </View>
              <View style={styles.info}>
                <Text variant="bodyLarge" style={{ color: colors.onSurface, fontWeight: '300' }}>{def.label}</Text>
                <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{def.description}</Text>
                {r.enabled && (
                  <Text onPress={() => openTime(def.type)} variant="labelMedium" style={{ color: colors.accentText, marginTop: 2, fontWeight: '300' }}>
                    {formatTime(r.hour, r.minute)} · change
                  </Text>
                )}
              </View>
              <Switch value={r.enabled} onValueChange={v => setReminder(def.type, { enabled: v })} color={accent} />
            </View>
          );
        })}

        <Text variant="labelSmall" style={[styles.footNote, { color: colors.onSurfaceVariant }]}>
          The workout reminder fires only on days you've assigned a routine in your Weekly Split.
        </Text>
      </ScrollView>

      <Portal>
        <Dialog visible={!!timeFor} onDismiss={() => setTimeFor(null)}>
          <Dialog.Title>Reminder time</Dialog.Title>
          <Dialog.Content>
            <View style={styles.timeRow}>
              <View style={styles.timeCol}>
                <IconButton icon="chevron-up" size={26} onPress={() => bump('h', 1)} />
                <Text variant="displaySmall" style={{ color: colors.onSurface }}>{String(hour).padStart(2, '0')}</Text>
                <IconButton icon="chevron-down" size={26} onPress={() => bump('h', -1)} />
              </View>
              <Text variant="displaySmall" style={{ color: colors.onSurfaceVariant }}>:</Text>
              <View style={styles.timeCol}>
                <IconButton icon="chevron-up" size={26} onPress={() => bump('m', 1)} />
                <Text variant="displaySmall" style={{ color: colors.onSurface }}>{String(minute).padStart(2, '0')}</Text>
                <IconButton icon="chevron-down" size={26} onPress={() => bump('m', -1)} />
              </View>
            </View>
            <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
              {formatTime(hour, minute)}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setTimeFor(null)}>Cancel</Button>
            <Button mode="contained" onPress={saveTime}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  note: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: shape.md, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: shape.md, marginBottom: spacing.sm },
  iconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  footNote: { marginTop: spacing.sm, textAlign: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.sm },
  timeCol: { alignItems: 'center' },
});
