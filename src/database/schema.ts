import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import exercisesData from '@/data/exercises.json';
import programsData from '@/data/programs.json';

interface ProgramSeed {
  name: string;
  level: string;
  daysPerWeek: number;
  split: string;
  description: string;
  days: { label: string; exercises: { name: string; sets: number; repMin: number; repMax: number }[] }[];
}

let db: SQLite.SQLiteDatabase | null = null;

interface ExerciseSeed {
  name: string;
  muscleGroup: string;
  equipment: string;
  description: string;
}

const ACHIEVEMENT_SEEDS = [
  { key: 'first_meal', name: 'First Bite', description: 'Log your first meal', icon: 'food', xpReward: 25 },
  { key: 'first_workout', name: 'Getting Started', description: 'Complete your first workout', icon: 'dumbbell', xpReward: 50 },
  { key: 'first_task', name: 'Task Master', description: 'Complete your first task', icon: 'check', xpReward: 15 },
  { key: 'first_habit', name: 'Creature of Habit', description: 'Create your first habit', icon: 'repeat', xpReward: 15 },
  { key: 'first_water', name: 'First Sip', description: 'Log water for the first time', icon: 'cup-water', xpReward: 10 },
  { key: 'first_sleep', name: 'Sweet Dreams', description: 'Log your first night of sleep', icon: 'moon-waning-crescent', xpReward: 10 },
  { key: 'first_transaction', name: 'Money Minder', description: 'Log your first transaction', icon: 'wallet', xpReward: 10 },
  { key: 'water_goal', name: 'Hydrated', description: 'Hit your daily water goal', icon: 'water-check', xpReward: 25 },
  { key: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day habit streak', icon: 'fire', xpReward: 100 },
  { key: 'streak_30', name: 'Monthly Master', description: 'Maintain a 30-day habit streak', icon: 'trophy', xpReward: 500 },
  { key: 'meals_10', name: 'Meal Planner', description: 'Log 10 meals', icon: 'food-variant', xpReward: 50 },
  { key: 'meals_100', name: 'Nutrition Pro', description: 'Log 100 meals', icon: 'star', xpReward: 200 },
  { key: 'workouts_10', name: 'Gym Regular', description: 'Complete 10 workouts', icon: 'arm-flex', xpReward: 100 },
  { key: 'workouts_50', name: 'Iron Will', description: 'Complete 50 workouts', icon: 'medal', xpReward: 300 },
  { key: 'tasks_25', name: 'Productive', description: 'Complete 25 tasks', icon: 'clipboard-check', xpReward: 75 },
  { key: 'level_5', name: 'Rising Star', description: 'Reach level 5', icon: 'chevron-triple-up', xpReward: 0 },
  { key: 'level_10', name: 'Life Master', description: 'Reach level 10', icon: 'crown', xpReward: 0 },
];

const TEMPLATE_SEEDS: { name: string; description: string; exercises: { name: string; sets: number; reps: number }[] }[] = [
  {
    name: 'Push Day',
    description: 'Chest, shoulders & triceps',
    exercises: [
      { name: 'Barbell Bench Press', sets: 4, reps: 8 },
      { name: 'Incline Dumbbell Press', sets: 3, reps: 10 },
      { name: 'Overhead Press', sets: 3, reps: 8 },
      { name: 'Lateral Raise', sets: 3, reps: 15 },
      { name: 'Tricep Pushdown', sets: 3, reps: 12 },
      { name: 'Overhead Tricep Extension', sets: 3, reps: 12 },
    ],
  },
  {
    name: 'Pull Day',
    description: 'Back & biceps',
    exercises: [
      { name: 'Deadlift', sets: 3, reps: 5 },
      { name: 'Pull-Up', sets: 3, reps: 8 },
      { name: 'Barbell Row', sets: 3, reps: 10 },
      { name: 'Lat Pulldown', sets: 3, reps: 12 },
      { name: 'Face Pull', sets: 3, reps: 15 },
      { name: 'Barbell Curl', sets: 3, reps: 12 },
    ],
  },
  {
    name: 'Leg Day',
    description: 'Quads, hamstrings & glutes',
    exercises: [
      { name: 'Back Squat', sets: 4, reps: 8 },
      { name: 'Romanian Deadlift', sets: 3, reps: 10 },
      { name: 'Leg Press', sets: 3, reps: 12 },
      { name: 'Leg Curl', sets: 3, reps: 12 },
      { name: 'Calf Raise', sets: 4, reps: 15 },
    ],
  },
  {
    name: 'Full Body',
    description: 'Balanced full-body session',
    exercises: [
      { name: 'Back Squat', sets: 3, reps: 8 },
      { name: 'Barbell Bench Press', sets: 3, reps: 8 },
      { name: 'Barbell Row', sets: 3, reps: 10 },
      { name: 'Overhead Press', sets: 3, reps: 10 },
      { name: 'Plank', sets: 3, reps: 1 },
    ],
  },
];

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    // On web, expo-sqlite's persistent storage (OPFS) requires an exclusive
    // file lock that breaks with multiple tabs or hot reloads
    // (NoModificationAllowedError). Use an in-memory DB on web so the app runs
    // reliably in the browser for testing; the phone build uses the real file.
    if (Platform.OS === 'web') {
      db = await SQLite.openDatabaseAsync(':memory:');
    } else {
      db = await SQLite.openDatabaseAsync('life-tracker.db');
      await db.execAsync('PRAGMA journal_mode = WAL;');
    }
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
  return db;
}

export async function initializeDatabase(): Promise<void> {
  const database = await getDatabase();

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY DEFAULT 1,
      name TEXT,
      age INTEGER,
      weight REAL,
      height REAL,
      activity_level TEXT,
      calorie_target INTEGER DEFAULT 2000,
      protein_target INTEGER DEFAULT 150,
      carbs_target INTEGER DEFAULT 250,
      fat_target INTEGER DEFAULT 65,
      water_target INTEGER DEFAULT 8,
      monthly_budget REAL,
      weight_unit TEXT DEFAULT 'kg',
      theme_pref TEXT DEFAULT 'dark',
      onboarded INTEGER DEFAULT 0,
      goal TEXT,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT,
      barcode TEXT,
      calories REAL DEFAULT 0,
      protein REAL DEFAULT 0,
      carbs REAL DEFAULT 0,
      fat REAL DEFAULT 0,
      fiber REAL DEFAULT 0,
      sugar REAL DEFAULT 0,
      sodium REAL DEFAULT 0,
      serving_size REAL DEFAULT 100,
      serving_unit TEXT DEFAULT 'g',
      is_custom INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS food_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      food_id INTEGER REFERENCES foods(id) ON DELETE CASCADE,
      meal_type TEXT CHECK(meal_type IN ('breakfast','lunch','dinner','snack')),
      servings REAL DEFAULT 1,
      log_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meal_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      food_id INTEGER REFERENCES foods(id) ON DELETE CASCADE,
      meal_type TEXT,
      plan_date TEXT NOT NULL,
      servings REAL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS shopping_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL,
      category TEXT,
      quantity TEXT,
      is_checked INTEGER DEFAULT 0,
      week_start TEXT
    );

    CREATE TABLE IF NOT EXISTS saved_meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS saved_meal_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saved_meal_id INTEGER REFERENCES saved_meals(id) ON DELETE CASCADE,
      food_id INTEGER REFERENCES foods(id) ON DELETE CASCADE,
      servings REAL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS water_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount_ml INTEGER NOT NULL,
      log_date TEXT NOT NULL,
      log_time TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sleep_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bedtime TEXT NOT NULL,
      wake_time TEXT NOT NULL,
      duration_minutes INTEGER,
      quality INTEGER DEFAULT 3,
      notes TEXT,
      log_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weight_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weight REAL NOT NULL,
      log_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      muscle_group TEXT,
      equipment TEXT,
      description TEXT,
      is_custom INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS workout_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      level TEXT,
      days_per_week INTEGER,
      program_name TEXT,
      day_label TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS template_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER REFERENCES workout_templates(id) ON DELETE CASCADE,
      exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
      target_sets INTEGER DEFAULT 3,
      target_reps INTEGER DEFAULT 10,
      target_rep_min INTEGER,
      target_rep_max INTEGER,
      target_weight REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS workout_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER REFERENCES workout_templates(id),
      name TEXT,
      started_at TEXT DEFAULT (datetime('now')),
      finished_at TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS workout_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_log_id INTEGER REFERENCES workout_logs(id) ON DELETE CASCADE,
      exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
      set_number INTEGER,
      reps INTEGER DEFAULT 0,
      weight REAL DEFAULT 0,
      rpe REAL,
      set_type TEXT DEFAULT 'normal',
      is_completed INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      priority TEXT DEFAULT 'medium',
      category TEXT DEFAULT 'general',
      is_completed INTEGER DEFAULT 0,
      is_recurring INTEGER DEFAULT 0,
      recurrence_pattern TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      frequency TEXT DEFAULT 'daily',
      target_per_week INTEGER DEFAULT 7,
      created_at TEXT DEFAULT (datetime('now')),
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER REFERENCES habits(id) ON DELETE CASCADE,
      log_date TEXT NOT NULL,
      is_completed INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      type TEXT CHECK(type IN ('income', 'expense')),
      category TEXT,
      note TEXT,
      transaction_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS budget_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      monthly_limit REAL,
      is_custom INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      xp_reward INTEGER DEFAULT 0,
      unlocked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS xp_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount INTEGER,
      source TEXT,
      description TEXT,
      earned_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT,
      end_time TEXT,
      color TEXT,
      event_type TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  await runMigrations(database);
  await seedDefaultData(database);
}

/** Add columns introduced after launch to pre-existing (native) databases.
 * Each ALTER is wrapped so a "duplicate column" error is ignored. */
async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const alters = [
    "ALTER TABLE user_profile ADD COLUMN theme_pref TEXT DEFAULT 'dark'",
    'ALTER TABLE user_profile ADD COLUMN onboarded INTEGER DEFAULT 0',
    'ALTER TABLE user_profile ADD COLUMN goal TEXT',
    // Phase 10 — smarter workout logging
    "ALTER TABLE workout_sets ADD COLUMN set_type TEXT DEFAULT 'normal'",
    'ALTER TABLE template_exercises ADD COLUMN target_rep_min INTEGER',
    'ALTER TABLE template_exercises ADD COLUMN target_rep_max INTEGER',
    // Phase 11 — program library
    'ALTER TABLE workout_templates ADD COLUMN level TEXT',
    'ALTER TABLE workout_templates ADD COLUMN days_per_week INTEGER',
    'ALTER TABLE workout_templates ADD COLUMN program_name TEXT',
    'ALTER TABLE workout_templates ADD COLUMN day_label TEXT',
  ];
  for (const sql of alters) {
    try {
      await db.execAsync(sql);
    } catch {
      // Column already exists — ignore.
    }
  }
}

async function seedDefaultData(db: SQLite.SQLiteDatabase): Promise<void> {
  const profileExists = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM user_profile'
  );
  if (!profileExists || profileExists.count === 0) {
    await db.runAsync('INSERT INTO user_profile (id) VALUES (1)');
  }

  const categoriesExist = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM budget_categories'
  );
  if (!categoriesExist || categoriesExist.count === 0) {
    await db.execAsync(`
      INSERT INTO budget_categories (name, icon, color, is_custom) VALUES
        ('Food', 'food', '#FF6584', 0),
        ('Transport', 'car', '#4FC3F7', 0),
        ('Entertainment', 'movie', '#B388FF', 0),
        ('Bills', 'file-document', '#FF8A65', 0),
        ('Health', 'heart-pulse', '#81C784', 0),
        ('Shopping', 'cart', '#FFB74D', 0),
        ('Other', 'dots-horizontal', '#90A4AE', 0);
    `);
  }

  await seedExercises(db);
  await seedAchievements(db);
  await seedStarterTemplates(db);
  await seedPrograms(db);
}

async function seedPrograms(db: SQLite.SQLiteDatabase): Promise<void> {
  const exist = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM workout_templates WHERE program_name IS NOT NULL'
  );
  if (exist && exist.count > 0) return;

  const programs = programsData as ProgramSeed[];
  for (const program of programs) {
    for (const day of program.days) {
      const result = await db.runAsync(
        'INSERT INTO workout_templates (name, description, level, days_per_week, program_name, day_label) VALUES (?, ?, ?, ?, ?, ?)',
        [day.label, program.split, program.level, program.daysPerWeek, program.name, day.label]
      );
      const templateId = result.lastInsertRowId;
      let order = 0;
      for (const ex of day.exercises) {
        const found = await db.getFirstAsync<{ id: number }>(
          'SELECT id FROM exercises WHERE name = ?',
          [ex.name]
        );
        if (found) {
          await db.runAsync(
            'INSERT INTO template_exercises (template_id, exercise_id, target_sets, target_reps, target_rep_min, target_rep_max, target_weight, sort_order) VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
            [templateId, found.id, ex.sets, ex.repMax, ex.repMin, ex.repMax, order++]
          );
        }
      }
    }
  }
}

async function seedExercises(db: SQLite.SQLiteDatabase): Promise<void> {
  const exist = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM exercises'
  );
  if (exist && exist.count > 0) return;

  const exercises = exercisesData as ExerciseSeed[];
  await db.withTransactionAsync(async () => {
    for (const ex of exercises) {
      await db.runAsync(
        'INSERT INTO exercises (name, muscle_group, equipment, description, is_custom) VALUES (?, ?, ?, ?, 0)',
        [ex.name, ex.muscleGroup, ex.equipment, ex.description]
      );
    }
  });
}

async function seedAchievements(db: SQLite.SQLiteDatabase): Promise<void> {
  const exist = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM achievements'
  );
  if (exist && exist.count > 0) return;

  for (const a of ACHIEVEMENT_SEEDS) {
    await db.runAsync(
      'INSERT INTO achievements (key, name, description, icon, xp_reward) VALUES (?, ?, ?, ?, ?)',
      [a.key, a.name, a.description, a.icon, a.xpReward]
    );
  }
}

async function seedStarterTemplates(db: SQLite.SQLiteDatabase): Promise<void> {
  const exist = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM workout_templates'
  );
  if (exist && exist.count > 0) return;

  for (const tpl of TEMPLATE_SEEDS) {
    const result = await db.runAsync(
      'INSERT INTO workout_templates (name, description) VALUES (?, ?)',
      [tpl.name, tpl.description]
    );
    const templateId = result.lastInsertRowId;
    let order = 0;
    for (const ex of tpl.exercises) {
      const found = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM exercises WHERE name = ?',
        [ex.name]
      );
      if (found) {
        await db.runAsync(
          'INSERT INTO template_exercises (template_id, exercise_id, target_sets, target_reps, target_weight, sort_order) VALUES (?, ?, ?, ?, 0, ?)',
          [templateId, found.id, ex.sets, ex.reps, order++]
        );
      }
    }
  }
}
