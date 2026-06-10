import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput, Button, IconButton, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { theme, spacing } from '@/theme';
import { useHabitStore } from '@/stores/habitStore';
import { useUserStore } from '@/stores/userStore';

export default function AddHabitScreen() {
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const { addHabit } = useHabitStore();
  const { reward } = useUserStore();

  const handleSave = async () => {
    if (!name.trim()) return;
    await addHabit(name.trim(), undefined, frequency);
    await reward(5, 'habit', 'Created a habit', 'first_habit');
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <Text variant="titleLarge" style={styles.title}>New Habit</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.content}>
        <TextInput label="Habit Name *" value={name} onChangeText={setName} style={styles.input} mode="outlined" placeholder="e.g., Meditate, Read, Exercise" />

        <Text variant="labelLarge" style={styles.label}>Frequency</Text>
        <SegmentedButtons
          value={frequency}
          onValueChange={setFrequency}
          buttons={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
          ]}
          style={styles.segmented}
        />

        <Button mode="contained" onPress={handleSave} style={styles.saveBtn} disabled={!name.trim()}>
          Create Habit
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  title: { fontWeight: '700' },
  content: { padding: spacing.md },
  input: { marginBottom: spacing.md, backgroundColor: theme.colors.surface },
  label: { marginBottom: spacing.sm, fontWeight: '600' },
  segmented: { marginBottom: spacing.md },
  saveBtn: { marginTop: spacing.lg },
});
