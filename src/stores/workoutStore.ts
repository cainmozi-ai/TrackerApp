import { create } from 'zustand';
import type { Exercise, WorkoutTemplate, WorkoutLog, WorkoutSet, TemplateExercise } from '@/types';
import { getDatabase } from '@/database/schema';
import { localNow, localDaysAgo } from '@/utils/dates';

/** Gym equipment grouped by category — drives the My Gym selector and exercise filtering. */
export const EQUIPMENT_GROUPS: { label: string; items: string[] }[] = [
  { label: 'Small Weights', items: ['Dumbbell', 'Kettlebell', 'Medicine Ball'] },
  { label: 'Bars & Plates', items: ['Barbell', 'EZ Bar', 'Trap Bar', 'Landmine', 'Weight Plate', "Farmer's Handles"] },
  { label: 'Benches & Racks', items: ['Squat Rack', 'Flat Bench', 'Incline Bench', 'Decline Bench', 'Pull-Up Bar', 'Dip Bars', 'Preacher Bench', 'Back Extension Bench', 'GHD Bench', 'Reverse Hyper Bench'] },
  { label: 'Cables', items: ['Cable Machine', 'Cable Crossover', 'Lat Pulldown', 'Cable Row Station'] },
  { label: 'Machines', items: ['Smith Machine', 'Leg Press', 'Hack Squat Machine', 'Leg Extension Machine', 'Leg Curl Machine', 'Calf Raise Machine', 'Chest Press Machine', 'Fly Machine', 'Shoulder Press Machine', 'Lateral Raise Machine', 'Row Machine', 'Preacher Curl Machine', 'Bicep Curl Machine', 'Triceps Extension Machine', 'Dip Machine', 'Assisted Weight Machine', 'Ab Crunch Machine', 'Adductor Machine', 'Abductor Machine', 'Glute Kickback Machine', 'Hammer Strength', 'T-Bar Row'] },
  { label: 'Bands', items: ['Resistance Band', 'Mini Band'] },
  { label: 'Bodyweight & Suspension', items: ['Bodyweight', 'TRX', 'Rings', 'Parallettes', 'Ab Wheel', 'Climbing Rope'] },
  { label: 'Balls & Conditioning', items: ['BOSU', 'Swiss Ball', 'Box', 'Sled', 'Tire', 'Battle Ropes', 'Jump Rope'] },
  { label: 'Cardio Machines', items: ['Treadmill', 'Exercise Bike', 'Rowing Machine', 'Elliptical', 'Stair Climber', 'Ski Erg', 'Assault Bike'] },
];

/** Flat list of every equipment item. */
export const EQUIPMENT_OPTIONS = EQUIPMENT_GROUPS.flatMap(g => g.items);

export interface ProgramDay {
  templateId: number;
  label: string;
  muscles: string[];
}

export interface Program {
  programName: string;
  level: string;
  daysPerWeek: number;
  split: string;
  days: ProgramDay[];
}

export interface DashExercise {
  id: number;
  name: string;
  logType: string;
  lastWeight: number;
  last1RM: number;
  lastVolume: number;
}

export interface WorkoutSummary {
  workout: WorkoutLog;
  exerciseCount: number;
  setCount: number;
  volume: number;
  durationMin: number;
  muscles: string[];
}

/** The measured values of one set, independent of how it's displayed. */
export interface SetValues {
  reps: number;
  weight: number;
  durationSeconds: number;
  distance: number;
  rpe?: number;
}

export interface WorkoutPR {
  exerciseName: string;
  /** What kind of best was beaten. */
  type: 'weight' | '1rm' | 'reps' | 'time' | 'distance';
  value: number;
  previous: number;
  unit?: string;
}

/** Epley estimated one-rep max. */
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export interface ProgressionEntry {
  exercise: Exercise;
  lastWeight: number;
  lastBestReps: number;
  suggestedWeight: number;
  suggestedReps: number;
  /** 'increase' = hit the top of the rep range, add weight; 'reps' = chase more reps first. */
  status: 'increase' | 'reps';
}

interface WorkoutState {
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  recentWorkouts: WorkoutLog[];
  activeWorkout: WorkoutLog | null;
  activeSets: WorkoutSet[];

  loadExercises: (muscleGroup?: string, search?: string, equipmentIn?: string[]) => Promise<void>;
  getExercise: (id: number) => Promise<Exercise | null>;
  addCustomExercise: (name: string, muscleGroup: string, equipment: string) => Promise<number>;
  loadTemplates: () => Promise<void>;
  loadPrograms: (level?: string) => Promise<Program[]>;
  cloneProgram: (programName: string) => Promise<void>;
  loadRecentWorkouts: (limit?: number) => Promise<void>;
  createTemplate: (name: string, description?: string) => Promise<number>;
  deleteTemplate: (id: number) => Promise<void>;
  getTemplateExercises: (templateId: number) => Promise<TemplateExercise[]>;
  addExerciseToTemplate: (templateId: number, exerciseId: number, sets: number, reps: number, weight: number) => Promise<void>;
  removeTemplateExercise: (id: number) => Promise<void>;
  startWorkout: (templateId?: number, name?: string) => Promise<number>;
  getActiveWorkout: () => Promise<WorkoutLog | null>;
  discardWorkout: (workoutId: number) => Promise<void>;
  loadActiveSets: (workoutId: number) => Promise<void>;
  finishWorkout: (workoutId: number, notes?: string) => Promise<void>;
  logSet: (workoutId: number, exerciseId: number, setNumber: number, entry: SetValues, setType?: string) => Promise<void>;
  updateSet: (setId: number, workoutId: number, entry: SetValues, setType?: string) => Promise<void>;
  removeSet: (setId: number, workoutId: number) => Promise<void>;
  getExerciseBest: (exerciseId: number, excludeWorkoutId?: number) => Promise<{ maxWeight: number; max1RM: number }>;
  detectPRs: (workoutId: number) => Promise<WorkoutPR[]>;
  getWorkoutDetail: (workoutId: number) => Promise<{ workout: WorkoutLog; sets: WorkoutSet[] } | null>;
  deleteWorkout: (workoutId: number) => Promise<void>;
  getWeekWorkoutCount: () => Promise<number>;
  getWeekTrainingStats: (days?: number) => Promise<{ muscles: number; sets: number; exercises: number }>;
  getTopExercises: (limit?: number) => Promise<DashExercise[]>;
  getWorkoutSummaries: (limit?: number) => Promise<WorkoutSummary[]>;
  getLastSets: (exerciseId: number) => Promise<WorkoutSet[]>;
  getProgressionSuggestion: (exerciseId: number, repMax: number) => Promise<{ weight: number; reps: number } | null>;
  getProgressionReport: () => Promise<ProgressionEntry[]>;
  getExerciseHistory: (exerciseId: number) => Promise<{ date: string; maxWeight: number; volume: number }[]>;
  getMuscleVolume: (days?: number) => Promise<{ muscleGroup: string; sets: number }[]>;
  getWorkoutDates: () => Promise<string[]>;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  exercises: [],
  templates: [],
  recentWorkouts: [],
  activeWorkout: null,
  activeSets: [],

  loadExercises: async (muscleGroup, search, equipmentIn) => {
    const db = await getDatabase();
    let query = 'SELECT * FROM exercises WHERE 1=1';
    const params: (string | number)[] = [];
    if (muscleGroup && muscleGroup !== 'All') {
      query += ' AND muscle_group = ?';
      params.push(muscleGroup);
    }
    if (search) {
      query += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }
    if (equipmentIn && equipmentIn.length > 0) {
      // Custom exercises always show — the user made them for their own gym.
      query += ` AND (is_custom = 1 OR equipment IN (${equipmentIn.map(() => '?').join(',')}))`;
      params.push(...equipmentIn);
    }
    // Targets sort alphabetically, which naturally groups heads together
    // (e.g. "Biceps — long head" rows sit beside "Biceps — short head").
    query += ' ORDER BY muscle_group, target, name';
    const rows = await db.getAllAsync<Record<string, unknown>>(query, params);
    set({ exercises: rows.map(mapExercise) });
  },

  getExercise: async (id) => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM exercises WHERE id = ?',
      [id]
    );
    return row ? mapExercise(row) : null;
  },

  addCustomExercise: async (name, muscleGroup, equipment) => {
    const db = await getDatabase();
    const result = await db.runAsync(
      'INSERT INTO exercises (name, muscle_group, equipment, description, is_custom) VALUES (?, ?, ?, ?, 1)',
      [name, muscleGroup, equipment, '']
    );
    await get().loadExercises();
    return result.lastInsertRowId;
  },

  loadTemplates: async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM workout_templates WHERE program_name IS NULL ORDER BY created_at DESC'
    );
    set({
      templates: rows.map(r => ({
        id: r.id as number,
        name: r.name as string,
        description: r.description as string | null,
        createdAt: r.created_at as string,
      })),
    });
  },

  loadPrograms: async (level) => {
    const db = await getDatabase();
    const query = level
      ? 'SELECT * FROM workout_templates WHERE program_name IS NOT NULL AND level = ? ORDER BY program_name, id'
      : 'SELECT * FROM workout_templates WHERE program_name IS NOT NULL ORDER BY program_name, id';
    const rows = await db.getAllAsync<Record<string, unknown>>(query, level ? [level] : []);
    const map = new Map<string, Program>();
    for (const r of rows) {
      const programName = r.program_name as string;
      const templateId = r.id as number;
      const muscleRows = await db.getAllAsync<{ m: string }>(
        `SELECT DISTINCT e.muscle_group as m FROM template_exercises te
         JOIN exercises e ON te.exercise_id = e.id WHERE te.template_id = ?`,
        [templateId]
      );
      const muscles = muscleRows.map(x => x.m).filter(Boolean);
      if (!map.has(programName)) {
        map.set(programName, {
          programName,
          level: r.level as string,
          daysPerWeek: r.days_per_week as number,
          split: (r.description as string) || '',
          days: [],
        });
      }
      map.get(programName)!.days.push({ templateId, label: r.day_label as string, muscles });
    }
    return Array.from(map.values());
  },

  cloneProgram: async (programName) => {
    const db = await getDatabase();
    const days = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM workout_templates WHERE program_name = ? ORDER BY id',
      [programName]
    );
    for (const day of days) {
      const result = await db.runAsync(
        'INSERT INTO workout_templates (name, description) VALUES (?, ?)',
        [`${programName} Â· ${day.day_label as string}`, day.description as string | null]
      );
      const newId = result.lastInsertRowId;
      const exs = await db.getAllAsync<Record<string, unknown>>(
        'SELECT * FROM template_exercises WHERE template_id = ? ORDER BY sort_order',
        [day.id as number]
      );
      for (const ex of exs) {
        await db.runAsync(
          'INSERT INTO template_exercises (template_id, exercise_id, target_sets, target_reps, target_rep_min, target_rep_max, target_weight, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [newId, ex.exercise_id as number, ex.target_sets as number, ex.target_reps as number,
           ex.target_rep_min as number | null, ex.target_rep_max as number | null, ex.target_weight as number, ex.sort_order as number]
        );
      }
    }
    await get().loadTemplates();
  },

  loadRecentWorkouts: async (limit = 20) => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM workout_logs WHERE finished_at IS NOT NULL ORDER BY started_at DESC LIMIT ?',
      [limit]
    );
    set({ recentWorkouts: rows.map(mapWorkoutLog) });
  },

  createTemplate: async (name, description) => {
    const db = await getDatabase();
    const result = await db.runAsync(
      'INSERT INTO workout_templates (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    await get().loadTemplates();
    return result.lastInsertRowId;
  },

  deleteTemplate: async (id) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM template_exercises WHERE template_id = ?', [id]);
    await db.runAsync('DELETE FROM workout_templates WHERE id = ?', [id]);
    await get().loadTemplates();
  },

  getTemplateExercises: async (templateId) => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT te.*, e.name, e.muscle_group, e.target, e.log_type, e.equipment, e.description, e.is_custom
       FROM template_exercises te JOIN exercises e ON te.exercise_id = e.id
       WHERE te.template_id = ? ORDER BY te.sort_order`,
      [templateId]
    );
    return rows.map(r => ({
      id: r.id as number,
      templateId: r.template_id as number,
      exerciseId: r.exercise_id as number,
      targetSets: r.target_sets as number,
      targetReps: r.target_reps as number,
      targetRepMin: (r.target_rep_min as number | null) ?? null,
      targetRepMax: (r.target_rep_max as number | null) ?? null,
      targetWeight: r.target_weight as number,
      sortOrder: r.sort_order as number,
      exercise: {
        id: r.exercise_id as number,
        name: r.name as string,
        muscleGroup: r.muscle_group as string,
        equipment: r.equipment as string,
        description: r.description as string,
        target: (r.target as string | null) ?? '',
        primaryMuscles: [],
        secondaryMuscles: [],
        mechanic: 'compound',
        region: 'upper',
        logType: (r.log_type as string | null) ?? 'weight_reps',
        tips: [],
        isCustom: (r.is_custom as number) === 1,
      },
    }));
  },

  addExerciseToTemplate: async (templateId, exerciseId, sets, reps, weight) => {
    const db = await getDatabase();
    const maxOrder = await db.getFirstAsync<{ m: number }>(
      'SELECT COALESCE(MAX(sort_order), -1) as m FROM template_exercises WHERE template_id = ?',
      [templateId]
    );
    await db.runAsync(
      'INSERT INTO template_exercises (template_id, exercise_id, target_sets, target_reps, target_weight, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [templateId, exerciseId, sets, reps, weight, (maxOrder?.m ?? -1) + 1]
    );
  },

  removeTemplateExercise: async (id) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM template_exercises WHERE id = ?', [id]);
  },

  startWorkout: async (templateId, name) => {
    const db = await getDatabase();
    const workoutName = name || 'Quick Workout';
    // Explicit local timestamp — the column default is UTC, which puts late-night
    // sessions on the wrong day.
    const result = await db.runAsync(
      'INSERT INTO workout_logs (template_id, name, started_at) VALUES (?, ?, ?)',
      [templateId || null, workoutName, localNow()]
    );
    const workout = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM workout_logs WHERE id = ?',
      [result.lastInsertRowId]
    );
    if (workout) set({ activeWorkout: mapWorkoutLog(workout), activeSets: [] });
    return result.lastInsertRowId;
  },

  getActiveWorkout: async () => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM workout_logs WHERE finished_at IS NULL ORDER BY started_at DESC LIMIT 1'
    );
    return row ? mapWorkoutLog(row) : null;
  },

  discardWorkout: async (workoutId) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM workout_sets WHERE workout_log_id = ?', [workoutId]);
    await db.runAsync('DELETE FROM workout_logs WHERE id = ?', [workoutId]);
    set({ activeWorkout: null, activeSets: [] });
  },

  loadActiveSets: async (workoutId) => {
    await refreshActiveSets(workoutId, set);
  },

  finishWorkout: async (workoutId, notes) => {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE workout_logs SET finished_at = ?, notes = ? WHERE id = ?',
      [localNow(), notes || null, workoutId]
    );
    set({ activeWorkout: null, activeSets: [] });
    await get().loadRecentWorkouts();
  },

  logSet: async (workoutId, exerciseId, setNumber, entry, setType) => {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO workout_sets (workout_log_id, exercise_id, set_number, reps, weight, duration_seconds, distance, rpe, set_type, is_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
      [workoutId, exerciseId, setNumber, entry.reps, entry.weight, entry.durationSeconds, entry.distance, entry.rpe ?? null, setType || 'normal']
    );
    await refreshActiveSets(workoutId, set);
  },

  updateSet: async (setId, workoutId, entry, setType) => {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE workout_sets SET reps = ?, weight = ?, duration_seconds = ?, distance = ?, rpe = ?, set_type = ? WHERE id = ?',
      [entry.reps, entry.weight, entry.durationSeconds, entry.distance, entry.rpe ?? null, setType || 'normal', setId]
    );
    await refreshActiveSets(workoutId, set);
  },

  removeSet: async (setId, workoutId) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM workout_sets WHERE id = ?', [setId]);
    await refreshActiveSets(workoutId, set);
  },

  getExerciseBest: async (exerciseId, excludeWorkoutId) => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ weight: number; reps: number }>(
      `SELECT ws.weight, ws.reps FROM workout_sets ws
       JOIN workout_logs wl ON ws.workout_log_id = wl.id
       WHERE ws.exercise_id = ? AND wl.finished_at IS NOT NULL AND ws.set_type != 'warmup'
         AND (? IS NULL OR ws.workout_log_id != ?)`,
      [exerciseId, excludeWorkoutId ?? null, excludeWorkoutId ?? null]
    );
    let maxWeight = 0, max1RM = 0;
    for (const r of rows) {
      if (r.weight > maxWeight) maxWeight = r.weight;
      const e = estimate1RM(r.weight, r.reps);
      if (e > max1RM) max1RM = e;
    }
    return { maxWeight, max1RM };
  },

  detectPRs: async (workoutId) => {
    const db = await getDatabase();
    const exIds = await db.getAllAsync<{ exercise_id: number; name: string; log_type: string | null }>(
      `SELECT DISTINCT ws.exercise_id, e.name, e.log_type FROM workout_sets ws
       JOIN exercises e ON ws.exercise_id = e.id
       WHERE ws.workout_log_id = ? AND ws.set_type != 'warmup'`,
      [workoutId]
    );
    const prs: WorkoutPR[] = [];
    for (const ex of exIds) {
      const logType = ex.log_type ?? 'weight_reps';
      const sets = await db.getAllAsync<{ weight: number; reps: number; duration_seconds: number; distance: number }>(
        "SELECT weight, reps, duration_seconds, distance FROM workout_sets WHERE workout_log_id = ? AND exercise_id = ? AND set_type != 'warmup'",
        [workoutId, ex.exercise_id]
      );
      // The best from every OTHER finished workout — a first session is a baseline, not a PR.
      const prev = await db.getFirstAsync<{ w: number; r: number; d: number; dist: number }>(
        `SELECT COALESCE(MAX(ws.weight),0) as w, COALESCE(MAX(ws.reps),0) as r,
                COALESCE(MAX(ws.duration_seconds),0) as d, COALESCE(MAX(ws.distance),0) as dist
         FROM workout_sets ws JOIN workout_logs wl ON ws.workout_log_id = wl.id
         WHERE ws.exercise_id = ? AND wl.finished_at IS NOT NULL
           AND ws.set_type != 'warmup' AND ws.workout_log_id != ?`,
        [ex.exercise_id, workoutId]
      );

      if (logType === 'cardio') {
        const thisDist = Math.max(...sets.map(s => s.distance), 0);
        const thisDur = Math.max(...sets.map(s => s.duration_seconds), 0);
        if ((prev?.dist ?? 0) > 0 && thisDist > prev!.dist) {
          prs.push({ exerciseName: ex.name, type: 'distance', value: thisDist, previous: prev!.dist, unit: 'km' });
        } else if ((prev?.d ?? 0) > 0 && thisDur > prev!.d) {
          prs.push({ exerciseName: ex.name, type: 'time', value: thisDur, previous: prev!.d });
        }
      } else if (logType === 'duration') {
        const thisDur = Math.max(...sets.map(s => s.duration_seconds), 0);
        if ((prev?.d ?? 0) > 0 && thisDur > prev!.d) {
          prs.push({ exerciseName: ex.name, type: 'time', value: thisDur, previous: prev!.d });
        }
      } else if (logType === 'bodyweight') {
        // Beating heaviest added load is the strongest signal; else most reps.
        const thisWeight = Math.max(...sets.map(s => s.weight), 0);
        const thisReps = Math.max(...sets.map(s => s.reps), 0);
        if ((prev?.w ?? 0) > 0 && thisWeight > prev!.w) {
          prs.push({ exerciseName: ex.name, type: 'weight', value: thisWeight, previous: prev!.w });
        } else if ((prev?.r ?? 0) > 0 && thisReps > prev!.r) {
          prs.push({ exerciseName: ex.name, type: 'reps', value: thisReps, previous: prev!.r });
        }
      } else {
        const thisMaxWeight = Math.max(...sets.map(s => s.weight), 0);
        const thisMax1RM = Math.max(...sets.map(s => estimate1RM(s.weight, s.reps)), 0);
        const prev1RM = await db.getFirstAsync<{ m: number }>(
          `SELECT COALESCE(MAX(ws.weight * (1 + ws.reps / 30.0)), 0) as m
           FROM workout_sets ws JOIN workout_logs wl ON ws.workout_log_id = wl.id
           WHERE ws.exercise_id = ? AND wl.finished_at IS NOT NULL
             AND ws.set_type != 'warmup' AND ws.workout_log_id != ?`,
          [ex.exercise_id, workoutId]
        );
        if ((prev?.w ?? 0) > 0 && thisMaxWeight > prev!.w) {
          prs.push({ exerciseName: ex.name, type: 'weight', value: thisMaxWeight, previous: prev!.w });
        } else if ((prev1RM?.m ?? 0) > 0 && thisMax1RM > Math.round((prev1RM!.m) * 10) / 10) {
          prs.push({ exerciseName: ex.name, type: '1rm', value: thisMax1RM, previous: Math.round(prev1RM!.m * 10) / 10 });
        }
      }
    }
    return prs;
  },

  getWorkoutDetail: async (workoutId) => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM workout_logs WHERE id = ?',
      [workoutId]
    );
    if (!row) return null;
    const setRows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT ws.*, e.name as exercise_name, e.muscle_group, e.log_type
       FROM workout_sets ws JOIN exercises e ON ws.exercise_id = e.id
       WHERE ws.workout_log_id = ? ORDER BY ws.exercise_id, ws.set_number`,
      [workoutId]
    );
    const sets = setRows.map(r => ({
      ...mapSet(r),
      exercise: {
        id: r.exercise_id as number,
        name: r.exercise_name as string,
        muscleGroup: r.muscle_group as string,
        logType: (r.log_type as string | null) ?? 'weight_reps',
        equipment: '',
        description: '',
        target: '',
        primaryMuscles: [],
        secondaryMuscles: [],
        mechanic: 'compound',
        region: 'upper',
        tips: [],
        isCustom: false,
      },
    }));
    return { workout: mapWorkoutLog(row), sets };
  },

  deleteWorkout: async (workoutId) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM workout_sets WHERE workout_log_id = ?', [workoutId]);
    await db.runAsync('DELETE FROM workout_logs WHERE id = ?', [workoutId]);
    await get().loadRecentWorkouts();
  },

  getWorkoutSummaries: async (limit = 15) => {
    const db = await getDatabase();
    const workouts = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM workout_logs WHERE finished_at IS NOT NULL ORDER BY started_at DESC LIMIT ?',
      [limit]
    );
    const out: WorkoutSummary[] = [];
    for (const w of workouts) {
      const id = w.id as number;
      const agg = await db.getFirstAsync<{ exs: number; sets: number; vol: number }>(
        `SELECT COUNT(DISTINCT exercise_id) as exs, COUNT(*) as sets, COALESCE(SUM(weight * reps), 0) as vol
         FROM workout_sets WHERE workout_log_id = ?`,
        [id]
      );
      const muscleRows = await db.getAllAsync<{ m: string }>(
        `SELECT DISTINCT e.muscle_group as m FROM workout_sets ws
         JOIN exercises e ON ws.exercise_id = e.id WHERE ws.workout_log_id = ?`,
        [id]
      );
      const workout = mapWorkoutLog(w);
      const ms = workout.finishedAt
        ? new Date(workout.finishedAt.replace(' ', 'T') + 'Z').getTime() - new Date(workout.startedAt.replace(' ', 'T') + 'Z').getTime()
        : 0;
      out.push({
        workout,
        exerciseCount: agg?.exs ?? 0,
        setCount: agg?.sets ?? 0,
        volume: Math.round(agg?.vol ?? 0),
        durationMin: Math.max(1, Math.round(ms / 60000)),
        muscles: muscleRows.map(r => r.m).filter(Boolean),
      });
    }
    return out;
  },

  getWeekWorkoutCount: async () => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM workout_logs WHERE finished_at IS NOT NULL AND date(started_at) >= ?',
      [localDaysAgo(7)]
    );
    return row?.count ?? 0;
  },

  getWeekTrainingStats: async (days = 7) => {
    const db = await getDatabase();
    const start = localDaysAgo(days);
    const row = await db.getFirstAsync<{ sets: number; exercises: number }>(
      `SELECT COUNT(*) as sets, COUNT(DISTINCT ws.exercise_id) as exercises
       FROM workout_sets ws JOIN workout_logs wl ON ws.workout_log_id = wl.id
       WHERE wl.finished_at IS NOT NULL AND date(wl.started_at) >= ? AND ws.set_type != 'warmup'`,
      [start]
    );
    const muscleRow = await db.getFirstAsync<{ groups: number }>(
      `SELECT COUNT(DISTINCT e.muscle_group) as groups
       FROM workout_sets ws JOIN workout_logs wl ON ws.workout_log_id = wl.id
       JOIN exercises e ON ws.exercise_id = e.id
       WHERE wl.finished_at IS NOT NULL AND date(wl.started_at) >= ? AND ws.set_type != 'warmup'`,
      [start]
    );
    return { muscles: muscleRow?.groups ?? 0, sets: row?.sets ?? 0, exercises: row?.exercises ?? 0 };
  },

  getTopExercises: async (limit = 4) => {
    const db = await getDatabase();
    // Most-recently-trained exercises across finished workouts.
    const rows = await db.getAllAsync<{ id: number; name: string; log_type: string | null }>(
      `SELECT e.id, e.name, e.log_type, MAX(wl.started_at) as last_trained
       FROM workout_sets ws JOIN workout_logs wl ON ws.workout_log_id = wl.id
       JOIN exercises e ON ws.exercise_id = e.id
       WHERE wl.finished_at IS NOT NULL
       GROUP BY e.id ORDER BY last_trained DESC LIMIT ?`,
      [limit]
    );
    const out: DashExercise[] = [];
    for (const r of rows) {
      const last = await get().getLastSets(r.id);
      const working = last.filter(s => s.setType !== 'warmup');
      const lastWeight = working.length ? Math.max(...working.map(s => s.weight)) : 0;
      const last1RM = working.reduce((b, s) => Math.max(b, estimate1RM(s.weight, s.reps)), 0);
      const lastVolume = working.reduce((sum, s) => sum + s.weight * s.reps, 0);
      out.push({ id: r.id, name: r.name, logType: r.log_type ?? 'weight_reps', lastWeight, last1RM, lastVolume: Math.round(lastVolume) });
    }
    return out;
  },

  getLastSets: async (exerciseId) => {
    const db = await getDatabase();
    const lastWorkout = await db.getFirstAsync<{ workout_log_id: number }>(
      `SELECT ws.workout_log_id FROM workout_sets ws
       JOIN workout_logs wl ON ws.workout_log_id = wl.id
       WHERE ws.exercise_id = ? AND wl.finished_at IS NOT NULL
       ORDER BY wl.started_at DESC LIMIT 1`,
      [exerciseId]
    );
    if (!lastWorkout) return [];
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM workout_sets WHERE workout_log_id = ? AND exercise_id = ? ORDER BY set_number',
      [lastWorkout.workout_log_id, exerciseId]
    );
    return rows.map(mapSet);
  },

  getProgressionSuggestion: async (exerciseId, repMax) => {
    const last = await get().getLastSets(exerciseId);
    if (last.length === 0) return null;
    const topWeight = Math.max(...last.map(s => s.weight));
    const workingSets = last.filter(s => s.weight === topWeight);
    const hitTop = workingSets.length > 0 && workingSets.every(s => s.reps >= repMax);
    if (hitTop) {
      // Progress load; smaller jump for lighter lifts.
      const increment = topWeight >= 40 ? 2.5 : 1.25;
      const minReps = Math.max(1, repMax - 3);
      return { weight: Math.round((topWeight + increment) * 100) / 100, reps: minReps };
    }
    // Stay at weight, aim for one more rep than last time (capped at repMax).
    const lastReps = workingSets.length ? Math.max(...workingSets.map(s => s.reps)) : repMax;
    return { weight: topWeight, reps: Math.min(repMax, lastReps + 1) };
  },

  getProgressionReport: async () => {
    const db = await getDatabase();
    // Every exercise the user has trained in a finished workout, most recent first.
    const trained = await db.getAllAsync<Record<string, unknown>>(
      `SELECT e.*, MAX(wl.started_at) as last_trained
       FROM workout_sets ws
       JOIN workout_logs wl ON ws.workout_log_id = wl.id
       JOIN exercises e ON ws.exercise_id = e.id
       WHERE wl.finished_at IS NOT NULL AND ws.set_type != 'warmup'
       GROUP BY e.id ORDER BY last_trained DESC LIMIT 12`
    );
    const report: ProgressionEntry[] = [];
    for (const row of trained) {
      const exercise = mapExercise(row);
      // Weight-based progression only — cardio/duration/bodyweight don't fit the
      // "add 2.5 kg when you hit the top of the rep range" model.
      if (exercise.logType !== 'weight_reps') continue;
      // Use the exercise's template rep target when it has one, else 12.
      const target = await db.getFirstAsync<{ rep_max: number | null }>(
        'SELECT MAX(COALESCE(target_rep_max, target_reps)) as rep_max FROM template_exercises WHERE exercise_id = ?',
        [exercise.id]
      );
      const repMax = target?.rep_max || 12;
      const last = await get().getLastSets(exercise.id);
      const working = last.filter(s => s.setType !== 'warmup');
      if (working.length === 0) continue;
      const lastWeight = Math.max(...working.map(s => s.weight));
      const topSets = working.filter(s => s.weight === lastWeight);
      const lastBestReps = Math.max(...topSets.map(s => s.reps));
      const sug = await get().getProgressionSuggestion(exercise.id, repMax);
      if (!sug) continue;
      report.push({
        exercise,
        lastWeight,
        lastBestReps,
        suggestedWeight: sug.weight,
        suggestedReps: sug.reps,
        status: sug.weight > lastWeight ? 'increase' : 'reps',
      });
    }
    return report;
  },

  getMuscleVolume: async (days = 7) => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ muscleGroup: string; sets: number }>(
      `SELECT e.muscle_group as muscleGroup, COUNT(*) as sets
       FROM workout_sets ws
       JOIN workout_logs wl ON ws.workout_log_id = wl.id
       JOIN exercises e ON ws.exercise_id = e.id
       WHERE wl.finished_at IS NOT NULL AND date(wl.started_at) >= ?
       GROUP BY e.muscle_group ORDER BY sets DESC`,
      [localDaysAgo(days)]
    );
    return rows.filter(r => r.muscleGroup);
  },

  getExerciseHistory: async (exerciseId) => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ date: string; maxWeight: number; volume: number }>(
      `SELECT date(wl.started_at) as date,
              MAX(ws.weight) as maxWeight,
              SUM(ws.weight * ws.reps) as volume
       FROM workout_sets ws JOIN workout_logs wl ON ws.workout_log_id = wl.id
       WHERE ws.exercise_id = ? AND wl.finished_at IS NOT NULL
       GROUP BY date(wl.started_at) ORDER BY date(wl.started_at) ASC LIMIT 30`,
      [exerciseId]
    );
    return rows;
  },

  getWorkoutDates: async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ date: string }>(
      `SELECT DISTINCT date(started_at) as date FROM workout_logs WHERE finished_at IS NOT NULL`
    );
    return rows.map(r => r.date);
  },
}));

async function refreshActiveSets(
  workoutId: number,
  set: (partial: Partial<WorkoutState>) => void
): Promise<void> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ws.*, e.name as exercise_name, e.muscle_group, e.log_type
     FROM workout_sets ws JOIN exercises e ON ws.exercise_id = e.id
     WHERE ws.workout_log_id = ? ORDER BY ws.exercise_id, ws.set_number`,
    [workoutId]
  );
  set({
    activeSets: rows.map(r => ({
      ...mapSet(r),
      exercise: {
        id: r.exercise_id as number,
        name: r.exercise_name as string,
        muscleGroup: r.muscle_group as string,
        logType: (r.log_type as string | null) ?? 'weight_reps',
        equipment: '',
        description: '',
        target: '',
        primaryMuscles: [],
        secondaryMuscles: [],
        mechanic: 'compound',
        region: 'upper',
        tips: [],
        isCustom: false,
      },
    })),
  });
}

function mapSet(r: Record<string, unknown>): WorkoutSet {
  return {
    id: r.id as number,
    workoutLogId: r.workout_log_id as number,
    exerciseId: r.exercise_id as number,
    setNumber: r.set_number as number,
    reps: r.reps as number,
    weight: r.weight as number,
    durationSeconds: (r.duration_seconds as number | null) ?? 0,
    distance: (r.distance as number | null) ?? 0,
    rpe: r.rpe as number | null,
    setType: (r.set_type as string | null) ?? 'normal',
    isCompleted: (r.is_completed as number) === 1,
  };
}

function parseStrArray(raw: unknown): string[] {
  try {
    const parsed = JSON.parse((raw as string | null) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapExercise(r: Record<string, unknown>): Exercise {
  return {
    id: r.id as number,
    name: r.name as string,
    muscleGroup: r.muscle_group as string,
    target: (r.target as string | null) ?? '',
    primaryMuscles: parseStrArray(r.primary_muscles),
    secondaryMuscles: parseStrArray(r.secondary_muscles),
    mechanic: (r.mechanic as string | null) ?? 'compound',
    region: (r.region as string | null) ?? 'upper',
    logType: (r.log_type as string | null) ?? 'weight_reps',
    equipment: r.equipment as string,
    description: r.description as string,
    tips: parseStrArray(r.tips),
    isCustom: (r.is_custom as number) === 1,
  };
}

function mapWorkoutLog(r: Record<string, unknown>): WorkoutLog {
  return {
    id: r.id as number,
    templateId: r.template_id as number | null,
    name: r.name as string,
    startedAt: r.started_at as string,
    finishedAt: r.finished_at as string | null,
    notes: r.notes as string | null,
  };
}
