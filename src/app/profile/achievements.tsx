import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, IconButton, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, moduleColors, spacing } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useGamificationStore } from '@/stores/gamificationStore';

export default function AchievementsScreen() {
  const { achievements, loadAchievements } = useGamificationStore();

  useEffect(() => {
    loadAchievements();
  }, []);

  const unlockedCount = achievements.filter(a => a.unlockedAt).length;

  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Achievements" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.summaryCard} elevation={1}>
          <MaterialCommunityIcons name="trophy" size={32} color={moduleColors.gamification} />
          <Text variant="headlineMedium" style={styles.summaryCount}>
            {unlockedCount}/{achievements.length}
          </Text>
          <Text variant="bodyMedium" style={styles.summaryLabel}>achievements unlocked</Text>
        </Surface>

        <View style={styles.grid}>
          {achievements.map(a => {
            const unlocked = !!a.unlockedAt;
            return (
              <Surface key={a.id} style={[styles.badge, !unlocked && styles.lockedBadge]} elevation={unlocked ? 2 : 0}>
                <View style={[styles.badgeIcon, { backgroundColor: unlocked ? moduleColors.gamification + '30' : theme.colors.surfaceVariant }]}>
                  <MaterialCommunityIcons
                    name={(unlocked ? a.icon : 'lock') as any}
                    size={28}
                    color={unlocked ? moduleColors.gamification : theme.colors.onSurfaceVariant}
                  />
                </View>
                <Text variant="labelLarge" style={[styles.badgeName, !unlocked && styles.lockedText]} numberOfLines={1}>
                  {a.name}
                </Text>
                <Text variant="labelSmall" style={styles.badgeDesc} numberOfLines={2}>
                  {a.description}
                </Text>
                {a.xpReward > 0 && (
                  <Text variant="labelSmall" style={styles.badgeXp}>+{a.xpReward} XP</Text>
                )}
              </Surface>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  title: { fontWeight: '700' },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  summaryCard: { alignItems: 'center', padding: spacing.lg, borderRadius: 16, backgroundColor: theme.colors.surface, gap: 2, marginBottom: spacing.md },
  summaryCount: { fontWeight: '700', color: moduleColors.gamification },
  summaryLabel: { color: theme.colors.onSurfaceVariant },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  badge: { width: '47%', alignItems: 'center', padding: spacing.md, borderRadius: 16, backgroundColor: theme.colors.surface, gap: 4, marginBottom: spacing.sm },
  lockedBadge: { backgroundColor: theme.colors.surfaceVariant, opacity: 0.7 },
  badgeIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  badgeName: { fontWeight: '600', textAlign: 'center' },
  lockedText: { color: theme.colors.onSurfaceVariant },
  badgeDesc: { color: theme.colors.onSurfaceVariant, textAlign: 'center', minHeight: 28 },
  badgeXp: { color: moduleColors.gamification, fontWeight: '700' },
});
