import { getDatabase } from '@/database/schema';
import { moduleColors } from '@/theme';

export interface DayDot {
  key: string;
  color: string;
}

export interface MarkedDates {
  [date: string]: { dots: DayDot[] };
}

export interface DaySummary {
  meals: { count: number; calories: number };
  workouts: string[];
  tasks: { title: string; completed: boolean }[];
  habits: number;
  spending: { income: number; expense: number };
  sleep: number | null;
}

async function distinctDates(sql: string): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ d: string }>(sql);
  return rows.map(r => r.d).filter(Boolean);
}

export async function getMarkedDates(): Promise<MarkedDates> {
  const marked: MarkedDates = {};
  const add = (date: string, key: string, color: string) => {
    if (!date) return;
    if (!marked[date]) marked[date] = { dots: [] };
    if (!marked[date].dots.some(d => d.key === key)) {
      marked[date].dots.push({ key, color });
    }
  };

  const meals = await distinctDates('SELECT DISTINCT log_date as d FROM food_logs');
  meals.forEach(d => add(d, 'meals', moduleColors.nutrition));

  const workouts = await distinctDates("SELECT DISTINCT date(started_at) as d FROM workout_logs WHERE finished_at IS NOT NULL");
  workouts.forEach(d => add(d, 'workout', moduleColors.workout));

  const tasks = await distinctDates('SELECT DISTINCT due_date as d FROM tasks WHERE due_date IS NOT NULL');
  tasks.forEach(d => add(d, 'tasks', moduleColors.tasks));

  const habits = await distinctDates('SELECT DISTINCT log_date as d FROM habit_logs');
  habits.forEach(d => add(d, 'habits', moduleColors.habits));

  const budget = await distinctDates('SELECT DISTINCT transaction_date as d FROM transactions');
  budget.forEach(d => add(d, 'budget', moduleColors.budget));

  const sleep = await distinctDates('SELECT DISTINCT log_date as d FROM sleep_logs');
  sleep.forEach(d => add(d, 'sleep', moduleColors.sleep));

  return marked;
}

export async function getDaySummary(date: string): Promise<DaySummary> {
  const db = await getDatabase();

  const meals = await db.getFirstAsync<{ count: number; calories: number }>(
    `SELECT COUNT(*) as count, COALESCE(SUM(f.calories * fl.servings), 0) as calories
     FROM food_logs fl JOIN foods f ON fl.food_id = f.id WHERE fl.log_date = ?`,
    [date]
  );

  const workoutRows = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM workout_logs WHERE date(started_at) = ? AND finished_at IS NOT NULL",
    [date]
  );

  const taskRows = await db.getAllAsync<{ title: string; is_completed: number }>(
    'SELECT title, is_completed FROM tasks WHERE due_date = ?',
    [date]
  );

  const habitRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM habit_logs WHERE log_date = ?',
    [date]
  );

  const incomeRow = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE transaction_date = ? AND type = 'income'",
    [date]
  );
  const expenseRow = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE transaction_date = ? AND type = 'expense'",
    [date]
  );

  const sleepRow = await db.getFirstAsync<{ duration_minutes: number }>(
    'SELECT duration_minutes FROM sleep_logs WHERE log_date = ?',
    [date]
  );

  return {
    meals: { count: meals?.count || 0, calories: Math.round(meals?.calories || 0) },
    workouts: workoutRows.map(w => w.name),
    tasks: taskRows.map(t => ({ title: t.title, completed: t.is_completed === 1 })),
    habits: habitRow?.count || 0,
    spending: { income: incomeRow?.total || 0, expense: expenseRow?.total || 0 },
    sleep: sleepRow?.duration_minutes ?? null,
  };
}
