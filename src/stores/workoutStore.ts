import { create } from 'zustand';
import type { Exercise, WorkoutTemplate, WorkoutLog, WorkoutSet, TemplateExercise } from '@/types';
import { getDatabase } from '@/database/schema';

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

interface WorkoutState {
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  recentWorkouts: WorkoutLog[];
  activeWorkout: WorkoutLog | null;
  activeSets: WorkoutSet[];

  loadExercises: (muscleGroup?: string, search?: string) => Promise<void>;
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
  logSet: (workoutId: number, exerciseId: number, setNumber: number, reps: number, weight: number, rpe?: number, setType?: string) => Promise<void>;
  removeSet: (setId: number, workoutId: number) => Promise<void>;
  getLastSets: (exerciseId: number) => Promise<WorkoutSet[]>;
  getProgressionSuggestion: (exerciseId: number, repMax: number) => Promise<{ weight: number; reps: number } | null>;
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

  loadExercises: async (muscleGroup, search) => {
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
    query += ' ORDER BY muscle_group, name';
    const rows = await db.getAllAsync<Record<string, unknown>>(query, params);
    set({ exercises: rows.map(mapExercise) });
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
        [`${programName} · ${day.day_label as string}`, day.description as string | null]
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
      `SELECT te.*, e.name, e.muscle_group, e.equipment, e.description, e.is_custom
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
    const result = await db.runAsync(
      'INSERT INTO workout_logs (template_id, name) VALUES (?, ?)',
      [templateId || null, workoutName]
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
      "UPDATE workout_logs SET finished_at = datetime('now'), notes = ? WHERE id = ?",
      [notes || null, workoutId]
    );
    set({ activeWorkout: null, activeSets: [] });
    await get().loadRecentWorkouts();
  },

  logSet: async (workoutId, exerciseId, setNumber, reps, weight, rpe, setType) => {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO workout_sets (workout_log_id, exercise_id, set_number, reps, weight, rpe, set_type, is_completed) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [workoutId, exerciseId, setNumber, reps, weight, rpe ?? null, setType || 'normal']
    );
    await refreshActiveSets(workoutId, set);
  },

  removeSet: async (setId, workoutId) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM workout_sets WHERE id = ?', [setId]);
    await refreshActiveSets(workoutId, set);
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

  getMuscleVolume: async (days = 7) => {
    const db = await getDatabase();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const rows = await db.getAllAsync<{ muscleGroup: string; sets: number }>(
      `SELECT e.muscle_group as muscleGroup, COUNT(*) as sets
       FROM workout_sets ws
       JOIN workout_logs wl ON ws.workout_log_id = wl.id
       JOIN exercises e ON ws.exercise_id = e.id
       WHERE wl.finished_at IS NOT NULL AND date(wl.started_at) >= ?
       GROUP BY e.muscle_group ORDER BY sets DESC`,
      [start.toISOString().split('T')[0]]
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
    `SELECT ws.*, e.name as exercise_name, e.muscle_group
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
        equipment: '',
        description: '',
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
    rpe: r.rpe as number | null,
    setType: (r.set_type as string | null) ?? 'normal',
    isCompleted: (r.is_completed as number) === 1,
  };
}

function mapExercise(r: Record<string, unknown>): Exercise {
  return {
    id: r.id as number,
    name: r.name as string,
    muscleGroup: r.muscle_group as string,
    equipment: r.equipment as string,
    description: r.description as string,
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
