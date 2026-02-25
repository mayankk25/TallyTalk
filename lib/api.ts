import { supabase } from './supabase';
import { Expense, Category, TransactionType, CategoryType } from '@/types';
import { formatLocalDate, getMonthDateRange, getMonthName, isInMonth } from './dateUtils';

interface ParsedExpense {
  amount: number;
  description: string;
  suggested_category: string;
}

interface ParseVoiceResponse {
  expenses: ParsedExpense[];
  transcript: string;
}

export async function parseVoiceExpenses(audioUri: string, language: string = 'en'): Promise<ParseVoiceResponse> {
  if (__DEV__) console.log('Reading audio file from:', audioUri);
  if (__DEV__) console.log('Voice language:', language);

  // Fetch the audio file and convert to base64
  const response = await fetch(audioUri);
  const blob = await response.blob();

  if (__DEV__) console.log('Audio blob size:', blob.size, 'bytes');

  if (blob.size > 5 * 1024 * 1024) {
    throw new Error('Audio file too large. Please record a shorter message.');
  }

  // Convert blob to base64
  const base64Audio = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  if (__DEV__) console.log('Audio base64 length:', base64Audio.length);
  if (__DEV__) console.log('Calling edge function...');

  // Call edge function directly with fetch to get full error
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const funcResponse = await fetch(`${supabaseUrl}/functions/v1/parse-voice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ audio: base64Audio, language }),
  });

  const data = await funcResponse.json();
  if (__DEV__) console.log('Edge function response:', funcResponse.status, data);

  if (!funcResponse.ok) {
    throw new Error(data.error || `Server error: ${funcResponse.status}`);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data as ParseVoiceResponse;
}

export async function getCategories(type?: CategoryType): Promise<Category[]> {
  let query = supabase
    .from('categories')
    .select('*');

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query
    .order('is_default', { ascending: false })
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function saveExpense(expense: {
  amount: number;
  description: string;
  category_id: string | null;
  voice_transcript?: string;
  expense_date?: string;
  type?: TransactionType;
}): Promise<Expense> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      ...expense,
      type: expense.type || 'expense',
      user_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveMultipleExpenses(expenses: {
  amount: number;
  description: string;
  category_id: string | null;
  voice_transcript?: string;
  type?: TransactionType;
  expense_date?: string;
}[]): Promise<Expense[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  // Default to today's date in YYYY-MM-DD format if not provided (local timezone)
  const today = formatLocalDate();

  const expensesWithUser = expenses.map(exp => ({
    ...exp,
    type: exp.type || 'expense',
    expense_date: exp.expense_date || today,
    user_id: user.id,
  }));

  const { data, error } = await supabase
    .from('expenses')
    .insert(expensesWithUser)
    .select();

  if (error) throw error;
  return data || [];
}

export interface MonthlySummary {
  totalExpenses: number;
  totalIncome: number;
  balance: number;
  month: string;
  year: number;
}

/**
 * Calculate monthly totals from an array of expenses (client-side).
 * This is the preferred method as it ensures consistency across screens
 * and avoids redundant API calls.
 */
export function calculateMonthlyTotals(
  expenses: Expense[],
  month: number = new Date().getMonth(),
  year: number = new Date().getFullYear()
): MonthlySummary {
  // Filter expenses for the specified month
  const monthlyExpenses = expenses.filter(expense => {
    const expenseDate = expense.expense_date.split('T')[0]; // Handle both date and datetime strings
    return isInMonth(expenseDate, month, year);
  });

  const totalExpenses = monthlyExpenses
    .filter(e => e.type === 'expense' || !e.type)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalIncome = monthlyExpenses
    .filter(e => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    totalExpenses,
    totalIncome,
    balance: totalIncome - totalExpenses,
    month: getMonthName(month),
    year,
  };
}

/**
 * Fetch monthly summary from the database (server-side query).
 * Consider using calculateMonthlyTotals() with getExpenses() for consistency.
 */
export async function getMonthlySummary(date: Date = new Date()): Promise<MonthlySummary> {
  const year = date.getFullYear();
  const month = date.getMonth();
  const { startDate, endDate } = getMonthDateRange(date);

  const { data, error } = await supabase
    .from('expenses')
    .select('amount, type')
    .gte('expense_date', startDate)
    .lte('expense_date', endDate);

  if (error) throw error;

  const transactions = data || [];
  const totalExpenses = transactions
    .filter(t => t.type === 'expense' || !t.type)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    totalExpenses,
    totalIncome,
    balance: totalIncome - totalExpenses,
    month: getMonthName(month),
    year,
  };
}

export async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      category:categories(*)
    `)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateExpense(
  id: string,
  expense: {
    amount: number;
    description: string;
    category_id: string | null;
    expense_date?: string;
    type?: TransactionType;
  }
): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .update(expense)
    .eq('id', id)
    .select(`
      *,
      category:categories(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function deleteAccount(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) throw new Error('Not authenticated');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  const response = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete account');
  }

  // Sign out locally after server-side deletion
  await supabase.auth.signOut();
}
