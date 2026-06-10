import { create } from 'zustand';
import type { Transaction, BudgetCategory, TransactionType } from '@/types';
import { getDatabase } from '@/database/schema';

interface BudgetState {
  transactions: Transaction[];
  categories: BudgetCategory[];
  monthlyIncome: number;
  monthlyExpenses: number;
  loadTransactions: (month?: string) => Promise<void>;
  loadCategories: () => Promise<void>;
  addTransaction: (amount: number, type: TransactionType, category: string, note?: string, date?: string) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  getCategoryTotals: (month?: string) => Promise<Record<string, number>>;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  transactions: [],
  categories: [],
  monthlyIncome: 0,
  monthlyExpenses: 0,

  loadTransactions: async (month) => {
    const db = await getDatabase();
    const targetMonth = month || getCurrentMonth();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      "SELECT * FROM transactions WHERE strftime('%Y-%m', transaction_date) = ? ORDER BY transaction_date DESC, created_at DESC",
      [targetMonth]
    );
    const mapped = rows.map(mapTransaction);
    const income = mapped.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = mapped.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    set({ transactions: mapped, monthlyIncome: income, monthlyExpenses: expenses });
  },

  loadCategories: async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM budget_categories ORDER BY is_custom, name'
    );
    set({
      categories: rows.map(r => ({
        id: r.id as number,
        name: r.name as string,
        icon: r.icon as string | null,
        color: r.color as string | null,
        monthlyLimit: r.monthly_limit as number | null,
        isCustom: (r.is_custom as number) === 1,
      })),
    });
  },

  addTransaction: async (amount, type, category, note, date) => {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO transactions (amount, type, category, note, transaction_date) VALUES (?, ?, ?, ?, ?)',
      [amount, type, category, note || null, date || new Date().toISOString().split('T')[0]]
    );
    await get().loadTransactions();
  },

  deleteTransaction: async (id) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
    await get().loadTransactions();
  },

  getCategoryTotals: async (month) => {
    const db = await getDatabase();
    const targetMonth = month || getCurrentMonth();
    const rows = await db.getAllAsync<{ category: string; total: number }>(
      "SELECT category, SUM(amount) as total FROM transactions WHERE type = 'expense' AND strftime('%Y-%m', transaction_date) = ? GROUP BY category",
      [targetMonth]
    );
    const totals: Record<string, number> = {};
    for (const row of rows) {
      totals[row.category] = row.total;
    }
    return totals;
  },
}));

function mapTransaction(r: Record<string, unknown>): Transaction {
  return {
    id: r.id as number,
    amount: r.amount as number,
    type: r.type as TransactionType,
    category: r.category as string,
    note: r.note as string | null,
    transactionDate: r.transaction_date as string,
    createdAt: r.created_at as string,
  };
}
