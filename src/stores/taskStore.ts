import { create } from 'zustand';
import type { SQLiteBindValue } from 'expo-sqlite';
import type { Task } from '@/types';
import { getDatabase } from '@/database/schema';

interface TaskState {
  tasks: Task[];
  loadTasks: (filter?: { category?: string; priority?: string; completed?: boolean }) => Promise<void>;
  addTask: (title: string, options?: { description?: string; dueDate?: string; priority?: string; category?: string; isRecurring?: boolean; recurrencePattern?: string }) => Promise<void>;
  toggleComplete: (taskId: number) => Promise<void>;
  deleteTask: (taskId: number) => Promise<void>;
  updateTask: (taskId: number, updates: Partial<Task>) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],

  loadTasks: async (filter) => {
    const db = await getDatabase();
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params: SQLiteBindValue[] = [];

    if (filter?.category) { query += ' AND category = ?'; params.push(filter.category); }
    if (filter?.priority) { query += ' AND priority = ?'; params.push(filter.priority); }
    if (filter?.completed !== undefined) { query += ' AND is_completed = ?'; params.push(filter.completed ? 1 : 0); }

    query += ' ORDER BY is_completed ASC, CASE priority WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 WHEN \'low\' THEN 3 END, due_date ASC NULLS LAST, created_at DESC';

    const rows = await db.getAllAsync<Record<string, unknown>>(query, params);
    set({ tasks: rows.map(mapTask) });
  },

  addTask: async (title, options) => {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO tasks (title, description, due_date, priority, category, is_recurring, recurrence_pattern) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, options?.description || null, options?.dueDate || null,
       options?.priority || 'medium', options?.category || 'general',
       options?.isRecurring ? 1 : 0, options?.recurrencePattern || null]
    );
    await get().loadTasks();
  },

  toggleComplete: async (taskId) => {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE tasks SET is_completed = CASE WHEN is_completed = 1 THEN 0 ELSE 1 END, completed_at = CASE WHEN is_completed = 0 THEN datetime('now') ELSE NULL END WHERE id = ?",
      [taskId]
    );
    await get().loadTasks();
  },

  deleteTask: async (taskId) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM tasks WHERE id = ?', [taskId]);
    await get().loadTasks();
  },

  updateTask: async (taskId, updates) => {
    const db = await getDatabase();
    const fields: string[] = [];
    const values: SQLiteBindValue[] = [];
    const keyMap: Record<string, string> = {
      title: 'title', description: 'description', dueDate: 'due_date',
      priority: 'priority', category: 'category',
    };
    for (const [key, val] of Object.entries(updates)) {
      const dbKey = keyMap[key];
      if (dbKey && val !== undefined) {
        fields.push(`${dbKey} = ?`);
        values.push(val as SQLiteBindValue);
      }
    }
    if (fields.length > 0) {
      values.push(taskId);
      await db.runAsync(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
      await get().loadTasks();
    }
  },
}));

function mapTask(r: Record<string, unknown>): Task {
  return {
    id: r.id as number,
    title: r.title as string,
    description: r.description as string | null,
    dueDate: r.due_date as string | null,
    priority: r.priority as 'low' | 'medium' | 'high',
    category: r.category as string,
    isCompleted: (r.is_completed as number) === 1,
    isRecurring: (r.is_recurring as number) === 1,
    recurrencePattern: r.recurrence_pattern as string | null,
    createdAt: r.created_at as string,
    completedAt: r.completed_at as string | null,
  };
}
