import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Text, View } from './Themed';
import { ParsedExpense, Category, TransactionType } from '@/types';
import { getCategories } from '@/lib/api';

const { width } = Dimensions.get('window');

interface ExpenseReviewProps {
  expenses: ParsedExpense[];
  transcript: string;
  onConfirm: (expenses: ParsedExpense[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ExpenseReview({
  expenses: initialExpenses,
  transcript,
  onConfirm,
  onCancel,
  isLoading = false,
}: ExpenseReviewProps) {
  const [expenses, setExpenses] = useState<ParsedExpense[]>(initialExpenses);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState<number | null>(null);

  useEffect(() => {
    loadAllCategories();
  }, []);

  useEffect(() => {
    // Match suggested categories to actual category IDs
    const allCategories = [...expenseCategories, ...incomeCategories];
    if (allCategories.length > 0 && initialExpenses.length > 0) {
      const matched = initialExpenses.map(exp => {
        const relevantCategories = exp.type === 'income' ? incomeCategories : expenseCategories;
        const matchedCat = relevantCategories.find(
          cat => cat.name.toLowerCase().includes(exp.suggested_category.toLowerCase()) ||
                 exp.suggested_category.toLowerCase().includes(cat.name.toLowerCase())
        );
        return {
          ...exp,
          category_id: matchedCat?.id || null,
        };
      });
      setExpenses(matched);
    }
  }, [expenseCategories, incomeCategories, initialExpenses]);

  const loadAllCategories = async () => {
    try {
      const [expCats, incCats] = await Promise.all([
        getCategories('expense'),
        getCategories('income'),
      ]);
      setExpenseCategories(expCats);
      setIncomeCategories(incCats);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const getCategoriesForExpense = (expense: ParsedExpense): Category[] => {
    return expense.type === 'income' ? incomeCategories : expenseCategories;
  };

  const updateExpense = (index: number, field: keyof ParsedExpense, value: any) => {
    setExpenses(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeExpense = (index: number) => {
    setExpenses(prev => prev.filter((_, i) => i !== index));
  };

  const getCategoryName = (categoryId: string | null | undefined, expense: ParsedExpense): string => {
    if (!categoryId) return 'Select category';
    const allCategories = [...expenseCategories, ...incomeCategories];
    const cat = allCategories.find(c => c.id === categoryId);
    return cat ? `${cat.icon || ''} ${cat.name}`.trim() : 'Select category';
  };

  const hasIncome = expenses.some(e => e.type === 'income');
  const hasExpense = expenses.some(e => e.type !== 'income');
  const typeLabel = hasIncome && hasExpense ? 'Transactions' : hasIncome ? 'Income' : 'Expenses';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Review {typeLabel}</Text>

      {transcript && (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>You said:</Text>
          <Text style={styles.transcript}>"{transcript}"</Text>
        </View>
      )}

      <ScrollView style={styles.expenseList} showsVerticalScrollIndicator={false}>
        {expenses.map((expense, index) => (
          <View key={index} style={styles.expenseCard}>
            <View style={styles.expenseHeader}>
              <View style={styles.expenseHeaderLeft}>
                <View style={[
                  styles.typeBadge,
                  expense.type === 'income' ? styles.typeBadgeIncome : styles.typeBadgeExpense
                ]}>
                  <Text style={styles.typeBadgeText}>
                    {expense.type === 'income' ? 'Income' : 'Expense'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => removeExpense(index)}>
                <Text style={styles.removeButton}>Remove</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.label}>Amount</Text>
              <View style={styles.amountRow}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={expense.amount.toString()}
                  onChangeText={(text) => {
                    const num = parseFloat(text) || 0;
                    updateExpense(index, 'amount', num);
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                value={expense.description}
                onChangeText={(text) => updateExpense(index, 'description', text)}
                placeholder="What was this for?"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity
                style={styles.categoryButton}
                onPress={() => setShowCategoryPicker(showCategoryPicker === index ? null : index)}
              >
                <Text style={styles.categoryButtonText}>
                  {getCategoryName(expense.category_id, expense)}
                </Text>
              </TouchableOpacity>
            </View>

            {showCategoryPicker === index && (
              <View style={styles.categoryPicker}>
                {getCategoriesForExpense(expense).map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      expense.category_id === cat.id && styles.categoryOptionSelected,
                    ]}
                    onPress={() => {
                      updateExpense(index, 'category_id', cat.id);
                      setShowCategoryPicker(null);
                    }}
                  >
                    <Text style={[
                      styles.categoryOptionText,
                      expense.category_id === cat.id && styles.categoryOptionTextSelected,
                    ]}>
                      {cat.icon} {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {expenses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No expenses to save</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={isLoading}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmButton, expenses.length === 0 && styles.confirmButtonDisabled]}
          onPress={() => onConfirm(expenses)}
          disabled={expenses.length === 0 || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>
              Save {expenses.length} {typeLabel}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    color: '#000000',
    marginBottom: 20,
    fontFamily: 'Gravelo',
    letterSpacing: -1.6,
  },
  transcriptBox: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  transcriptLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
    fontFamily: 'Eina01-Light',
    letterSpacing: -0.78,
  },
  transcript: {
    fontSize: 15,
    color: '#000000',
    fontFamily: 'Eina01-Light',
    letterSpacing: -0.9,
  },
  expenseList: {
    flex: 1,
  },
  expenseCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  expenseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeBadgeExpense: {
    backgroundColor: '#000000',
  },
  typeBadgeIncome: {
    backgroundColor: '#000000',
  },
  typeBadgeText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: 'Eina01-Regular',
    letterSpacing: -0.78,
  },
  removeButton: {
    color: '#FF3B30',
    fontSize: 14,
    fontFamily: 'Eina01-Regular',
    letterSpacing: -0.84,
  },
  inputRow: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 8,
    fontFamily: 'Eina01-Light',
    letterSpacing: -0.78,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 16,
    fontSize: 15,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#000000',
    fontFamily: 'Eina01-Light',
    letterSpacing: -0.9,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  currencySymbol: {
    fontSize: 24,
    color: '#000000',
    marginRight: 8,
    fontFamily: 'Eina01-Regular',
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    color: '#000000',
    fontFamily: 'Eina01-Regular',
    letterSpacing: -1.44,
    padding: 0,
  },
  categoryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: '#000000',
  },
  categoryButtonText: {
    fontSize: 15,
    color: '#000000',
    fontFamily: 'Eina01-Light',
    letterSpacing: -0.9,
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  categoryOption: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  categoryOptionSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#000000',
    fontFamily: 'Eina01-Light',
    letterSpacing: -0.84,
  },
  categoryOptionTextSelected: {
    color: '#FFFFFF',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 15,
    fontFamily: 'Eina01-Light',
    letterSpacing: -0.9,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#000000',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#000000',
    fontFamily: 'Eina01-Regular',
    letterSpacing: -0.9,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  confirmButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'Eina01-Regular',
    letterSpacing: -0.9,
  },
});
