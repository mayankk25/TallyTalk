import React, { useState } from 'react';
import { Modal, Alert } from 'react-native';
import ExpenseForm from './ExpenseForm';
import { Expense } from '@/types';
import { updateExpense, deleteExpense } from '@/lib/api';

interface EditExpenseModalProps {
  expense: Expense | null;
  onClose: () => void;
  onUpdated: (updated: Expense) => void;
  onDeleted: (id: string) => void;
}

export default function EditExpenseModal({
  expense,
  onClose,
  onUpdated,
  onDeleted,
}: EditExpenseModalProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdate = async (updatedData: {
    amount: number;
    description: string;
    category_id: string | null;
    expense_date: string;
    type: 'expense' | 'income';
  }) => {
    if (!expense) return;

    setIsSaving(true);
    try {
      const updated = await updateExpense(expense.id, updatedData);
      onUpdated(updated);
      onClose();
    } catch (error) {
      console.error('Failed to update:', error);
      Alert.alert('Error', 'Failed to update transaction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!expense) return;

    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(expense.id);
              onDeleted(expense.id);
              onClose();
            } catch (error) {
              console.error('Failed to delete:', error);
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={expense !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {expense && (
        <ExpenseForm
          expense={expense}
          onSave={handleUpdate}
          onCancel={onClose}
          onDelete={handleDelete}
          isLoading={isSaving}
        />
      )}
    </Modal>
  );
}
