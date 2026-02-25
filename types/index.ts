export interface User {
  id: string;
  email: string;
  created_at: string;
}

export type CategoryType = 'expense' | 'income';

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  icon: string | null;
  is_default: boolean;
  type: CategoryType;
  created_at: string;
}

export type TransactionType = 'expense' | 'income';

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  description: string | null;
  category_id: string | null;
  voice_transcript: string | null;
  expense_date: string;
  created_at: string;
  category?: Category;
  type: TransactionType;
}

export interface ParsedExpense {
  amount: number;
  description: string;
  suggested_category: string;
  category_id?: string | null;
  type?: TransactionType;
}

export interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}
