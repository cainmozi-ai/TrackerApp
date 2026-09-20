import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeContext';
import { shape, spacing, accent } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ProgressRing } from '@/components/common/ProgressRing';
import { useUserStore } from '@/stores/userStore';
import { useWaterStore } from '@/stores/waterStore';

const QUICK_ADDS = [
  { label: '+1 Glass', amount: 250 },
  { label: '+250ml', amount: 250 },
  { label: '+500ml', amount: 500 },
  { label: '+1L', amount: 1000 },
];

export default function WaterScreen() {
  const { colors } = useAppTheme();
  const { profile, loadProfile } = useUserStore();
  const { todayLogs, todayTotal, loadTodayLogs, addWater } = useWaterStore();
  const [customOpen, setCustomOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  useFocusEffect(useCallback(() => {
    loadProfile();
    loadTodayLogs();
  }, []));

  const targetMl = (profile?.waterTarget ?? 8) * 250;
  const glasses = Math.round((todayTotal / 250) * 10) / 10;
  const add = async (amount: number) => { await addWater(amount); };
  const saveCustom = async () => {
    const amount = Number(customAmount);
    if (amount > 0) await add(amount);
    setCustomAmount('');
    setCustomOpen(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Fluid Intake" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: colors.surface }]}>
          <ProgressRing progress={todayTotal / targetMl} size={170} strokeWidth={16} color={accent} value={String(glasses)} label={`of ${profile?.waterTarget ?? 8} glasses`} />
          <Text variant="bodyMedium" style={{ color: colors.onSurface, marginTop: spacing.sm }}>
            {todayTotal}ml / {targetMl}ml
          </Text>
        </View>

        <View style={styles.quickGrid}>
          {QUICK_ADDS.map(item => (
            <Button key={item.label} mode="contained-tonal" style={styles.quickButton} contentStyle={styles.quickContent} onPress={() => add(item.amount)}>
              {item.label}
            </Button>
          ))}
        </View>
        <Button mode="outlined" style={styles.customButton} contentStyle={styles.quickContent} onPress={() => setCustomOpen(true)}>Custom</Button>

        <Text variant="titleSmall" style={[styles.section, { color: colors.onSurface }]}>Today&apos;s Log</Text>
        <View style={styles.logList}>
          {todayLogs.length === 0 ? (
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>No fluid logged yet.</Text>
          ) : todayLogs.map(log => (
            <View key={log.id} style={[styles.logRow, { backgroundColor: colors.surface }]}>
              <View style={styles.dot} />
              <Text variant="bodyMedium" style={[styles.logAmount, { color: colors.onSurface }]}>{log.amountMl}ml</Text>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{log.logTime.slice(0, 5)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <Portal>
        <Dialog visible={customOpen} onDismiss={() => setCustomOpen(false)}>
          <Dialog.Title>Add fluid</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Millilitres" value={customAmount} onChangeText={setCustomAmount} keyboardType="numeric" mode="outlined" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCustomOpen(false)}>Cancel</Button>
            <Button onPress={saveCustom} disabled={!(Number(customAmount) > 0)}>Add</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  hero: { height: 250, borderRadius: shape.lg, justifyContent: 'center', alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.md },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickButton: { width: '48.8%', borderRadius: shape.md },
  quickContent: { height: 44 },
  customButton: { marginTop: spacing.sm, borderRadius: shape.md },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm },
  logList: { gap: spacing.sm },
  logRow: { height: 44, borderRadius: shape.md, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: accent, marginRight: spacing.sm },
  logAmount: { flex: 1 },
});
