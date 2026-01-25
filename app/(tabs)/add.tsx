import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import ExpenseForm from '@/components/ExpenseForm';
import { saveExpense } from '@/lib/api';
import { TransactionType } from '@/types';

export default function AddExpenseScreen() {
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleSave = async (expense: {
    amount: number;
    description: string;
    category_id: string | null;
    expense_date: string;
    type: TransactionType;
  }) => {
    setIsSaving(true);

    try {
      await saveExpense(expense);
      Alert.alert(
        'Success',
        `${expense.type === 'income' ? 'Income' : 'Expense'} saved!`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Failed to save:', error);
      Alert.alert('Error', error.message || 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ExpenseForm
      onSave={handleSave}
      onCancel={handleCancel}
      isLoading={isSaving}
    />
  );
}
