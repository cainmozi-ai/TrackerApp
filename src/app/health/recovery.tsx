import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text, Portal, Dialog, TextInput, Button, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, withAlpha } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useRecoveryStore, RECOVERY_TYPES, recoveryLabel, recoveryIcon } from '@/stores/recoveryStore';

type MdiName = keyof typeof MaterialCommunityIcons.glyphMap;

export default function RecoveryScreen() {
  const { colors } = useAppTheme();
  const { today, recent, loadToday, loadRecent, addRecovery, removeRecovery } = useRecoveryStore();
  const [pickType, setPickType] = useState<string | null>(null);
  const [duration, setDuration] = useState('');

  useFocusEffect(useCallback(() => { loadToday(); loadRecent(); }, []));

  const open = (type: string) => { setPickType(type); setDuration(''); };
  const confirm = async () => {
    if (!pickType) return;
    const mins = parseInt(duration, 10);
    await addRecovery(pickType, Number.isFinite(mins) && mins > 0 ? mins : null);
    setPickType(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Recovery" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text variant="labelSmall" style={[styles.kicker, { color: colors.onSurfaceVariant }]}>LOG RECOVERY</Text>
        <View style={styles.grid}>
          {RECOVERY_TYPES.map(t => (
            <Pressable key={t.key} onPress={() => open(t.key)} style={[styles.tile, { backgroundColor: colors.surface }]}>
              <View style={[styles.tileIcon, { backgroundColor: withAlpha(accent, 0.14) }]}>
                <MaterialCommunityIcons name={t.icon as MdiName} size={22} color={accent} />
              </View>
              <Text variant="labelMedium" style={{ color: colors.onSurface }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurface }]}>Today</Text>
        {today.length === 0 ? (
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Nothing logged today — tap a modality above.</Text>
        ) : today.map(r => (
          <View key={r.id} style={[styles.row, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name={recoveryIcon(r.type) as MdiName} size={20} color={accent} />
            <Text variant="bodyMedium" style={{ color: colors.onSurface, flex: 1 }}>{recoveryLabel(r.type)}</Text>
            {!!r.durationMinutes && (
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{r.durationMinutes} min</Text>
            )}
            <IconButton icon="close" size={16} onPress={() => removeRecovery(r.id)} />
          </View>
        ))}

        {recent.length > 0 && (
          <>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurface }]}>Recent</Text>
            {recent.slice(0, 15).map(r => (
              <View key={r.id} style={styles.recentRow}>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, width: 74 }}>{r.logDate.slice(5)}</Text>
                <MaterialCommunityIcons name={recoveryIcon(r.type) as MdiName} size={16} color={colors.onSurfaceVariant} />
                <Text variant="bodySmall" style={{ color: colors.onSurface, flex: 1 }}>
                  {recoveryLabel(r.type)}{r.durationMinutes ? ` · ${r.durationMinutes} min` : ''}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={!!pickType} onDismiss={() => setPickType(null)}>
          <Dialog.Title>Log {pickType ? recoveryLabel(pickType) : ''}</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Duration (minutes, optional)" value={duration} onChangeText={setDuration}
              mode="outlined" keyboardType="numeric" placeholder="e.g. 15" autoFocus />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPickType(null)}>Cancel</Button>
            <Button onPress={confirm}>Log</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  kicker: { letterSpacing: 1, fontWeight: '300', marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  tile: { width: '31%', alignItems: 'center', paddingVertical: spacing.md, borderRadius: shape.md, gap: 6 },
  tileIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontWeight: '300', marginTop: spacing.sm, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.md, paddingVertical: 4, borderRadius: shape.sm, marginBottom: spacing.xs },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
});
