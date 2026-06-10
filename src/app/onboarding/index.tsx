import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, moduleColors, withAlpha } from '@/theme';
import { useUserStore } from '@/stores/userStore';
import {
  calcTargets, ACTIVITY_LABELS, GOAL_LABELS,
  type Sex, type ActivityLevel, type Goal,
} from '@/utils/calories';

const ACTIVITIES: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];

export default function OnboardingScreen() {
  const { colors } = useAppTheme();
  const { updateProfile } = useUserStore();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');

  const ageN = parseInt(age) || 0;
  const weightN = parseFloat(weight) || 0;
  const heightN = parseFloat(height) || 0;
  const canCompute = ageN > 0 && weightN > 0 && heightN > 0;
  const preview = canCompute
    ? calcTargets({ sex, weightKg: weightN, heightCm: heightN, age: ageN, activity, goal })
    : null;

  const finish = async (withPlan: boolean) => {
    if (withPlan && preview) {
      await updateProfile({
        name: name.trim() || null,
        age: ageN,
        weight: weightN,
        height: heightN,
        activityLevel: activity,
        goal,
        calorieTarget: preview.calories,
        proteinTarget: preview.protein,
        carbsTarget: preview.carbs,
        fatTarget: preview.fat,
        waterTarget: preview.water,
        onboarded: true,
      });
    } else {
      await updateProfile({ name: name.trim() || null, onboarded: true });
    }
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp} style={styles.hero}>
          <View style={[styles.logo, { backgroundColor: withAlpha(colors.primary, 0.15) }]}>
            <MaterialCommunityIcons name="rocket-launch" size={40} color={colors.primary} />
          </View>
          <Text variant="headlineMedium" style={[styles.title, { color: colors.onBackground }]}>
            Welcome to Life Tracker
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            A few quick details and we'll set your daily targets. You can change these anytime.
          </Text>
        </Animated.View>

        <TextInput label="Your name" value={name} onChangeText={setName} mode="outlined" style={styles.input} />

        <Text variant="labelLarge" style={[styles.label, { color: colors.onBackground }]}>Goal</Text>
        <SegmentedButtons
          value={goal}
          onValueChange={v => setGoal(v as Goal)}
          buttons={(Object.keys(GOAL_LABELS) as Goal[]).map(g => ({ value: g, label: GOAL_LABELS[g].split(' ')[0] }))}
          style={styles.segmented}
        />

        <Text variant="labelLarge" style={[styles.label, { color: colors.onBackground }]}>Sex</Text>
        <SegmentedButtons
          value={sex}
          onValueChange={v => setSex(v as Sex)}
          buttons={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
          ]}
          style={styles.segmented}
        />

        <View style={styles.row}>
          <TextInput label="Age" value={age} onChangeText={setAge} mode="outlined" keyboardType="numeric" style={styles.thirdInput} />
          <TextInput label="Weight (kg)" value={weight} onChangeText={setWeight} mode="outlined" keyboardType="numeric" style={styles.thirdInput} />
          <TextInput label="Height (cm)" value={height} onChangeText={setHeight} mode="outlined" keyboardType="numeric" style={styles.thirdInput} />
        </View>

        <Text variant="labelLarge" style={[styles.label, { color: colors.onBackground }]}>Activity level</Text>
        <View style={styles.chipWrap}>
          {ACTIVITIES.map(a => (
            <Chip key={a} selected={activity === a} onPress={() => setActivity(a)} style={styles.chip} showSelectedOverlay>
              {ACTIVITY_LABELS[a].split(' (')[0]}
            </Chip>
          ))}
        </View>

        {preview && (
          <Animated.View entering={FadeInUp} style={[styles.previewCard, { backgroundColor: colors.surface }]}>
            <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>Your daily plan</Text>
            <Text variant="displaySmall" style={[styles.calories, { color: moduleColors.nutrition }]}>
              {preview.calories}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>calories / day</Text>
            <View style={styles.macroRow}>
              <Macro label="Protein" value={`${preview.protein}g`} color="#FF6584" />
              <Macro label="Carbs" value={`${preview.carbs}g`} color="#4FC3F7" />
              <Macro label="Fat" value={`${preview.fat}g`} color="#FFB74D" />
              <Macro label="Water" value={`${preview.water}`} color={moduleColors.water} />
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={() => finish(true)}
          disabled={!canCompute}
          style={styles.cta}
          contentStyle={styles.ctaContent}
        >
          {canCompute ? 'Start Tracking' : 'Fill in your details'}
        </Button>
        <Button mode="text" onPress={() => finish(false)}>Skip for now</Button>
      </View>
    </SafeAreaView>
  );
}

function Macro({ label, value, color }: { label: string; value: string; color: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.macro}>
      <Text variant="titleMedium" style={{ color, fontWeight: '700' }}>{value}</Text>
      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  hero: { alignItems: 'center', marginBottom: spacing.lg, gap: spacing.xs },
  logo: { width: 80, height: 80, borderRadius: shape.pill, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  title: { fontWeight: '800', textAlign: 'center' },
  subtitle: { textAlign: 'center', lineHeight: 20 },
  input: { marginBottom: spacing.sm },
  label: { marginTop: spacing.md, marginBottom: spacing.sm, fontWeight: '700' },
  segmented: { marginBottom: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  thirdInput: { flex: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {},
  previewCard: { marginTop: spacing.lg, padding: spacing.lg, borderRadius: shape.lg, alignItems: 'center' },
  calories: { fontWeight: '800' },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', alignSelf: 'stretch', marginTop: spacing.md },
  macro: { alignItems: 'center' },
  footer: { padding: spacing.lg, gap: spacing.xs },
  cta: { borderRadius: shape.pill },
  ctaContent: { paddingVertical: spacing.xs },
});
