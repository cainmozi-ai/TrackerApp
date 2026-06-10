import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput, Button, IconButton, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { theme, spacing } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useTaskStore } from '@/stores/taskStore';

const CATEGORIES = ['general', 'health', 'work', 'personal', 'shopping'];

export default function AddTaskScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('general');
  const [dueDate, setDueDate] = useState('');
  const { addTask } = useTaskStore();

  const handleSave = async () => {
    if (!title.trim()) return;
    await addTask(title.trim(), {
      description: description.trim() || undefined,
      priority,
      category,
      dueDate: dueDate || undefined,
    });
    router.back();
  };

  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Add Task" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TextInput label="Task Title *" value={title} onChangeText={setTitle} style={styles.input} mode="outlined" />
        <TextInput label="Description (optional)" value={description} onChangeText={setDescription} style={styles.input} mode="outlined" multiline />
        <TextInput label="Due Date (YYYY-MM-DD)" value={dueDate} onChangeText={setDueDate} style={styles.input} mode="outlined" placeholder="2026-06-15" />

        <Text variant="labelLarge" style={styles.label}>Priority</Text>
        <SegmentedButtons
          value={priority}
          onValueChange={setPriority}
          buttons={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
          ]}
          style={styles.segmented}
        />

        <Text variant="labelLarge" style={styles.label}>Category</Text>
        <SegmentedButtons
          value={category}
          onValueChange={setCategory}
          buttons={CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
          style={styles.segmented}
          density="small"
        />

        <Button mode="contained" onPress={handleSave} style={styles.saveBtn} disabled={!title.trim()}>
          Add Task
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  title: { fontWeight: '700' },
  scrollContent: { padding: spacing.md },
  input: { marginBottom: spacing.sm, backgroundColor: theme.colors.surface },
  label: { marginTop: spacing.md, marginBottom: spacing.sm, fontWeight: '600' },
  segmented: { marginBottom: spacing.sm },
  saveBtn: { marginTop: spacing.xl },
});
