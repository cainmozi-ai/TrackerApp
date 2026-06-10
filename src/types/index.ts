export interface UserProfile {
  id: number;
  name: string | null;
  age: number | null;
  weight: number | null;
  height: number | null;
  activityLevel: string | null;
  goal: string | null;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  waterTarget: number;
  monthlyBudget: number | null;
  weightUnit: 'kg' | 'lbs';
  themePref: 'light' | 'dark';
  onboarded: boolean;
  xp: number;
  level: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavedMeal {
  id: number;
  name: string;
  createdAt: string;
  items?: SavedMealItem[];
  totalCalories?: number;
}

export interface SavedMealItem {
  id: number;
  savedMealId: number;
  foodId: number;
  servings: number;
  food?: Food;
}

export interface Food {
  id: number;
  name: string;
  brand: string | null;
  barcode: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  servingSize: number;
  servingUnit: string;
  isCustom: boolean;
  isFavorite: boolean;
  createdAt: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodLog {
  id: number;
  foodId: number;
  mealType: MealType;
  servings: number;
  logDate: string;
  createdAt: string;
  food?: Food;
}

export interface WaterLog {
  id: number;
  amountMl: number;
  logDate: string;
  logTime: string;
  createdAt: string;
}

export interface WeightLog {
  id: number;
  weight: number;
  logDate: string;
  createdAt: string;
}

export interface SleepLog {
  id: number;
  bedtime: string;
  wakeTime: string;
  durationMinutes: number;
  quality: number;
  notes: string | null;
  logDate: string;
  createdAt: string;
}

export interface Exercise {
  id: number;
  name: string;
  muscleGroup: string;
  equipment: string;
  description: string;
  isCustom: boolean;
}

export interface WorkoutTemplate {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  exercises?: TemplateExercise[];
}

export interface TemplateExercise {
  id: number;
  templateId: number;
  exerciseId: number;
  targetSets: number;
  targetReps: number;
  targetRepMin: number | null;
  targetRepMax: number | null;
  targetWeight: number;
  sortOrder: number;
  exercise?: Exercise;
}

export interface WorkoutLog {
  id: number;
  templateId: number | null;
  name: string;
  startedAt: string;
  finishedAt: string | null;
  notes: string | null;
  sets?: WorkoutSet[];
}

export interface WorkoutSet {
  id: number;
  workoutLogId: number;
  exerciseId: number;
  setNumber: number;
  reps: number;
  weight: number;
  rpe: number | null;
  setType: string;
  isCompleted: boolean;
  exercise?: Exercise;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: 'low' | 'medium' | 'high';
  category: string;
  isCompleted: boolean;
  isRecurring: boolean;
  recurrencePattern: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface Habit {
  id: number;
  name: string;
  icon: string | null;
  frequency: 'daily' | 'weekly';
  targetPerWeek: number;
  createdAt: string;
  isActive: boolean;
}

export interface HabitLog {
  id: number;
  habitId: number;
  logDate: string;
  isCompleted: boolean;
  createdAt: string;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: number;
  amount: number;
  type: TransactionType;
  category: string;
  note: string | null;
  transactionDate: string;
  createdAt: string;
}

export interface BudgetCategory {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  monthlyLimit: number | null;
  isCustom: boolean;
}

export interface Achievement {
  id: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  unlockedAt: string | null;
}

export interface XpLog {
  id: number;
  amount: number;
  source: string;
  description: string;
  earnedAt: string;
}
