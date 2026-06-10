// Calorie & macro targets via the Mifflin–St Jeor equation.

export type Sex = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (little/no exercise)',
  light: 'Light (1–3 days/week)',
  moderate: 'Moderate (3–5 days/week)',
  active: 'Active (6–7 days/week)',
  very_active: 'Very active (hard daily / physical job)',
};

const GOAL_ADJUSTMENT: Record<Goal, number> = {
  lose: -500,
  maintain: 0,
  gain: 400,
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose: 'Lose weight',
  maintain: 'Maintain',
  gain: 'Gain muscle',
};

export interface TargetInputs {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  activity: ActivityLevel;
  goal: Goal;
}

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number; // glasses (250 ml)
}

/** Mifflin–St Jeor basal metabolic rate (kcal/day). */
export function calcBMR(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const sexOffset = sex === 'male' ? 5 : sex === 'female' ? -161 : -78; // 'other' = average
  return base + sexOffset;
}

export function calcTDEE(bmr: number, activity: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activity];
}

/** Full daily targets. Protein scales with bodyweight; fat is 25% of calories;
 * carbs fill the remainder. Water ≈ 35 ml/kg, expressed in 250 ml glasses. */
export function calcTargets(inputs: TargetInputs): NutritionTargets {
  const { sex, weightKg, heightCm, age, activity, goal } = inputs;
  const bmr = calcBMR(sex, weightKg, heightCm, age);
  const tdee = calcTDEE(bmr, activity);
  const calories = Math.max(1200, Math.round((tdee + GOAL_ADJUSTMENT[goal]) / 10) * 10);

  const protein = Math.round(weightKg * (goal === 'gain' ? 2.2 : 2.0));
  const fatCalories = calories * 0.25;
  const fat = Math.round(fatCalories / 9);
  const proteinCalories = protein * 4;
  const carbs = Math.max(0, Math.round((calories - proteinCalories - fatCalories) / 4));

  const water = Math.min(14, Math.max(6, Math.round((weightKg * 35) / 250)));

  return { calories, protein, carbs, fat, water };
}

const KCAL_PER_KG = 7700;

export interface ExpenditureResult {
  /** Estimated maintenance calories (TDEE), or null if not enough data. */
  expenditure: number | null;
  /** Days of intake data available. */
  days: number;
  /** Weight-trend change per week (kg), signed. */
  weeklyRateKg: number | null;
}

/** Adaptive TDEE via energy balance (MacroFactor-style):
 * TDEE ≈ average daily intake − (kcal stored/lost as weight change per day).
 * Needs ≥7 intake days and a weight trend spanning ≥6 days. */
export function estimateExpenditure(
  intake: { date: string; calories: number }[],
  trend: { date: string; trend: number }[]
): ExpenditureResult {
  if (intake.length < 7 || trend.length < 2) {
    return { expenditure: null, days: intake.length, weeklyRateKg: null };
  }
  const first = trend[0];
  const last = trend[trend.length - 1];
  const daySpan = (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86_400_000;
  if (daySpan < 6) return { expenditure: null, days: intake.length, weeklyRateKg: null };

  const deltaKg = last.trend - first.trend;
  const avgIntake = intake.reduce((s, d) => s + d.calories, 0) / intake.length;
  const expenditure = Math.round(avgIntake - (deltaKg * KCAL_PER_KG) / daySpan);
  const weeklyRateKg = Math.round((deltaKg / daySpan) * 7 * 100) / 100;
  return { expenditure, days: intake.length, weeklyRateKg };
}

/** Full recommended targets from an estimated expenditure + goal + weight. */
export function targetsFromExpenditure(expenditure: number, goal: Goal, weightKg: number): NutritionTargets {
  const calories = Math.max(1200, Math.round((expenditure + GOAL_ADJUSTMENT[goal]) / 10) * 10);
  const protein = Math.round(weightKg * (goal === 'gain' ? 2.2 : 2.0));
  const fatCalories = calories * 0.25;
  const fat = Math.round(fatCalories / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fatCalories) / 4));
  const water = Math.min(14, Math.max(6, Math.round((weightKg * 35) / 250)));
  return { calories, protein, carbs, fat, water };
}
