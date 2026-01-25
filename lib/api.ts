import { supabase } from './supabase';
import { Expense, Category, TransactionType, CategoryType } from '@/types';

interface ParsedExpense {
  amount: number;
  description: string;
  suggested_category: string;
}

interface ParseVoiceResponse {
  expenses: ParsedExpense[];
  transcript: string;
}

export async function parseVoiceExpenses(audioUri: string): Promise<ParseVoiceResponse> {
  console.log('Reading audio file from:', audioUri);

  // Fetch the audio file and convert to base64
  const response = await fetch(audioUri);
  const blob = await response.blob();

  console.log('Audio blob size:', blob.size, 'bytes');

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

  console.log('Audio base64 length:', base64Audio.length);
  console.log('Calling edge function...');

  // Call edge function directly with fetch to get full error
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const funcResponse = await fetch(`${supabaseUrl}/functions/v1/parse-voice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ audio: base64Audio }),
  });

  const data = await funcResponse.json();
  console.log('Edge function response:', funcResponse.status, data);

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
}[]): Promise<Expense[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const expensesWithUser = expenses.map(exp => ({
    ...exp,
    type: exp.type || 'expense',
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

export async function getMonthlySummary(date: Date = new Date()): Promise<MonthlySummary> {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startDate = new Date(year, month, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

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

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return {
    totalExpenses,
    totalIncome,
    balance: totalIncome - totalExpenses,
    month: monthNames[month],
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
