import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeContext';
import { moduleColors, spacing } from '@/theme';
import { AppCard } from '@/components/common/AppCard';
import { SectionHeader } from '@/components/common/SectionHeader';

export default function LifeScreen() {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text variant="headlineMedium" style={[styles.title, { color: colors.onBackground }]}>Life</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          Organize tasks, build habits, and manage your budget
        </Text>

        <SectionHeader title="Modules" />

        <AppCard index={0} title="Todo List" icon="checkbox-marked-outline" color={moduleColors.tasks}
          subtitle="Manage tasks with priorities and due dates" onPress={() => router.push('/life/tasks')} />
        <AppCard index={1} title="Habits" icon="repeat" color={moduleColors.habits}
          subtitle="Build streaks and track daily habits" onPress={() => router.push('/life/habits')} />
        <AppCard index={2} title="Budget" icon="wallet" color={moduleColors.budget}
          subtitle="Track income, expenses, and savings" onPress={() => router.push('/life/budget')} />
        <AppCard index={3} title="Calendar" icon="calendar-month" color={colors.primary}
          subtitle="Unified view of everything in your life" onPress={() => router.push('/life/calendar')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: { fontWeight: '800' },
  subtitle: { marginTop: 2, marginBottom: spacing.md },
});
