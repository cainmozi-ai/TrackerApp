import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, FAB, IconButton, Chip, Checkbox, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { theme, moduleColors, spacing } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useTaskStore } from '@/stores/taskStore';
import { useUserStore } from '@/stores/userStore';
import type { Task } from '@/types';

const PRIORITY_COLORS = { high: '#FF5252', medium: '#FFB74D', low: '#81C784' };

export default function TasksScreen() {
  const { tasks, loadTasks, toggleComplete, deleteTask } = useTaskStore();
  const { reward } = useUserStore();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    loadTasks();
  }, []);

  const handleToggle = async (task: Task) => {
    await toggleComplete(task.id);
    if (!task.isCompleted) {
      await reward(15, 'task', 'Completed a task', 'first_task');
    }
  };

  const filtered = filter === 'all' ? tasks
    : filter === 'active' ? tasks.filter(t => !t.isCompleted)
    : tasks.filter(t => t.isCompleted);

  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Tasks" />

      <View style={styles.filters}>
        {(['all', 'active', 'completed'] as const).map(f => (
          <Chip
            key={f}
            selected={filter === f}
            onPress={() => setFilter(f)}
            style={styles.chip}
            selectedColor={moduleColors.tasks}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Chip>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="bodyMedium" style={styles.emptyText}>
              {filter === 'all' ? 'No tasks yet. Tap + to add one!' : `No ${filter} tasks`}
            </Text>
          </View>
        ) : (
          filtered.map(task => (
            <Surface key={task.id} style={styles.taskCard} elevation={1}>
              <Checkbox
                status={task.isCompleted ? 'checked' : 'unchecked'}
                onPress={() => handleToggle(task)}
                color={moduleColors.tasks}
              />
              <View style={styles.taskContent}>
                <Text
                  variant="bodyLarge"
                  style={[styles.taskTitle, task.isCompleted && styles.completedTitle]}
                >
                  {task.title}
                </Text>
                <View style={styles.taskMeta}>
                  <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[task.priority] }]} />
                  <Text variant="labelSmall" style={styles.metaText}>{task.priority}</Text>
                  {!!task.dueDate && (
                    <Text variant="labelSmall" style={styles.metaText}> · {task.dueDate}</Text>
                  )}
                  <Text variant="labelSmall" style={styles.metaText}> · {task.category}</Text>
                </View>
              </View>
              <IconButton icon="delete-outline" size={20} onPress={() => deleteTask(task.id)} />
            </Surface>
          ))
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        color="#fff"
        onPress={() => router.push('/life/tasks/add-task')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  title: { fontWeight: '700' },
  filters: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.xs, marginBottom: spacing.sm },
  chip: { backgroundColor: theme.colors.surface },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyText: { color: theme.colors.onSurfaceVariant },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  taskContent: { flex: 1 },
  taskTitle: { fontWeight: '500' },
  completedTitle: { textDecorationLine: 'line-through', color: theme.colors.onSurfaceVariant },
  taskMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  metaText: { color: theme.colors.onSurfaceVariant },
  fab: { position: 'absolute', right: 16, bottom: 24, backgroundColor: moduleColors.tasks, borderRadius: 28 },
});
