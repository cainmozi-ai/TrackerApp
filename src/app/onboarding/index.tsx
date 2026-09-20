import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, withAlpha } from '@/theme';
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
        sex,
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
      await updateProfile({ name: name.trim() || null, sex, onboarded: true });
    }
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp} style={styles.hero}>
          <Text variant="headlineMedium" style={[styles.title, { color: colors.onBackground }]}>
            Welcome to Incus
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            A few quick details and we'll set your daily targets. You can change these anytime.
          </Text>
        </Animated.View>

        <FieldLabel label="Your name" />
        <TextInput
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          outlineStyle={styles.inputOutline}
          placeholder="Your name"
        />

        <FieldLabel label="Goal" />
        <View style={styles.segmentRow}>
          {(Object.keys(GOAL_LABELS) as Goal[]).map(value => (
            <OptionButton
              key={value}
              label={value === 'lose' ? 'Cut' : value === 'gain' ? 'Bulk' : 'Maintain'}
              selected={goal === value}
              onPress={() => setGoal(value)}
            />
          ))}
        </View>

        <FieldLabel label="Sex" />
        <View style={styles.segmentRow}>
          {(['male', 'female', 'other'] as Sex[]).map(value => (
            <OptionButton
              key={value}
              label={value.charAt(0).toUpperCase() + value.slice(1)}
              selected={sex === value}
              onPress={() => setSex(value)}
            />
          ))}
        </View>

        <View style={styles.row}>
          <CompactField label="Age" value={age} onChangeText={setAge} />
          <CompactField label="Weight (kg)" value={weight} onChangeText={setWeight} />
          <CompactField label="Height (cm)" value={height} onChangeText={setHeight} />
        </View>

        <FieldLabel label="Activity level" />
        <View style={styles.activityList}>
          {ACTIVITIES.map(a => (
            <ActivityButton key={a} label={ACTIVITY_LABELS[a].split(' (')[0]} selected={activity === a} onPress={() => setActivity(a)} />
          ))}
        </View>

        {preview && (
          <Animated.View entering={FadeInUp} style={[styles.previewCard, { backgroundColor: colors.surface }]}>
            <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>Your daily plan</Text>
            <Text variant="displaySmall" style={[styles.calories, { color: accent }]}>
              {preview.calories}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>calories / day</Text>
            <View style={styles.macroRow}>
              <Macro label="Protein" value={`${preview.protein}g`} color={accent} />
              <Macro label="Carbs" value={`${preview.carbs}g`} color={accent} />
              <Macro label="Fat" value={`${preview.fat}g`} color={accent} />
              <Macro label="Water" value={`${preview.water}`} color={accent} />
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

function FieldLabel({ label }: { label: string }) {
  const { colors } = useAppTheme();
  return <Text variant="labelMedium" style={[styles.label, { color: colors.onSurfaceVariant }]}>{label}</Text>;
}

function CompactField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.compactField}>
      <FieldLabel label={label} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        mode="outlined"
        keyboardType="numeric"
        style={styles.compactInput}
        outlineStyle={styles.inputOutline}
      />
    </View>
  );
}

function OptionButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.option, { borderColor: colors.outline }, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}
    >
      <Text variant="bodyMedium" style={{ color: selected ? colors.onPrimary : colors.onSurface }}>{label}</Text>
    </Pressable>
  );
}

function ActivityButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.activity, { borderColor: colors.outline, backgroundColor: selected ? colors.primary : colors.surface }, selected && styles.activitySelected]}
    >
      <Text variant="bodyMedium" style={{ color: selected ? colors.onPrimary : colors.onSurface }}>{label}</Text>
      {selected && <Text variant="titleMedium" style={{ color: colors.onPrimary }}>✓</Text>}
    </Pressable>
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
  content: { paddingHorizontal: spacing.lg, paddingTop: 92, paddingBottom: spacing.xl },
  hero: { alignItems: 'center', marginBottom: spacing.xl, gap: spacing.sm },
  title: { fontWeight: '400', textAlign: 'center' },
  subtitle: { maxWidth: 310, textAlign: 'center', lineHeight: 18 },
  input: { height: 48, marginBottom: spacing.md, backgroundColor: 'transparent' },
  inputOutline: { borderRadius: shape.md },
  label: { marginBottom: spacing.xs, fontWeight: '400' },
  segmentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  option: { flex: 1, height: 44, borderWidth: 1, borderRadius: shape.md, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  compactField: { flex: 1 },
  compactInput: { height: 48, textAlign: 'center', backgroundColor: 'transparent' },
  activityList: { gap: spacing.sm },
  activity: { height: 40, borderWidth: 1, borderRadius: shape.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md },
  activitySelected: { borderColor: accent },
  previewCard: { marginTop: spacing.lg, padding: spacing.lg, borderRadius: shape.lg, alignItems: 'center' },
  calories: { fontWeight: '800' },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', alignSelf: 'stretch', marginTop: spacing.md },
  macro: { alignItems: 'center' },
  footer: { padding: spacing.lg, gap: spacing.xs },
  cta: { borderRadius: shape.md },
  ctaContent: { paddingVertical: spacing.xs },
});
