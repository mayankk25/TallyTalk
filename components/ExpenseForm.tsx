import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Text, View } from './Themed';
import { Category, Expense, TransactionType } from '@/types';
import { getCategories } from '@/lib/api';

interface ExpenseFormProps {
  expense?: Expense | null;
  defaultType?: TransactionType;
  onSave: (expense: {
    amount: number;
    description: string;
    category_id: string | null;
    expense_date: string;
    type: TransactionType;
  }) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

export default function ExpenseForm({
  expense,
  defaultType = 'expense',
  onSave,
  onCancel,
  onDelete,
  isLoading = false,
}: ExpenseFormProps) {
  const [type, setType] = useState<TransactionType>(expense?.type || defaultType);
  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [description, setDescription] = useState(expense?.description || '');
  const [categoryId, setCategoryId] = useState<string | null>(expense?.category_id || null);
  const [expenseDate, setExpenseDate] = useState(
    expense?.expense_date ? new Date(expense.expense_date) : new Date()
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadCategories(type);
  }, [type]);

  const loadCategories = async (transactionType: TransactionType) => {
    try {
      const cats = await getCategories(transactionType);
      setCategories(cats);
      // Reset category selection when type changes
      if (cats.length > 0 && !cats.find(c => c.id === categoryId)) {
        setCategoryId(null);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const getCategoryName = (): string => {
    if (!categoryId) return 'Select';
    const cat = categories.find(c => c.id === categoryId);
    return cat ? `${cat.icon || ''} ${cat.name}`.trim() : 'Select';
  };

  const formatDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    onSave({
      amount: parsedAmount,
      description: description.trim(),
      category_id: categoryId,
      expense_date: expenseDate.toISOString().split('T')[0],
      type,
    });
  };

  const isValid = parseFloat(amount) > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Handle bar */}
      <View style={styles.handleBar} />

      {/* Close button */}
      <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
        <Text style={styles.closeButtonText}>Cancel</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Type Toggle */}
        <View style={styles.typeContainer}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              type === 'expense' && styles.typeButtonActiveExpense,
            ]}
            onPress={() => setType('expense')}
          >
            <Text style={[
              styles.typeButtonText,
              type === 'expense' && styles.typeButtonTextActive,
            ]}>
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              type === 'income' && styles.typeButtonActiveIncome,
            ]}
            onPress={() => setType('income')}
          >
            <Text style={[
              styles.typeButtonText,
              type === 'income' && styles.typeButtonTextActive,
            ]}>
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={[
              styles.amountInput,
              type === 'income' && styles.amountInputIncome,
            ]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#C7C7CC"
            autoFocus={!expense}
          />
        </View>

        {/* Description */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={styles.fieldInput}
            value={description}
            onChangeText={setDescription}
            placeholder={type === 'income' ? 'e.g., Salary' : 'e.g., Coffee'}
            placeholderTextColor="#C7C7CC"
          />
        </View>

        {/* Category */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Category</Text>
          <TouchableOpacity
            style={styles.fieldButton}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <Text style={[
              styles.fieldButtonText,
              !categoryId && styles.fieldButtonPlaceholder,
            ]}>
              {getCategoryName()}
            </Text>
          </TouchableOpacity>
        </View>

        {showCategoryPicker && (
          <View style={styles.categoryGrid}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  categoryId === cat.id && styles.categoryChipSelected,
                ]}
                onPress={() => {
                  setCategoryId(cat.id);
                  setShowCategoryPicker(false);
                }}
              >
                <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                <Text style={[
                  styles.categoryChipText,
                  categoryId === cat.id && styles.categoryChipTextSelected,
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Date */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Date</Text>
          <TouchableOpacity
            style={styles.fieldButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.fieldButtonText}>{formatDate(expenseDate)}</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={expenseDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) setExpenseDate(date);
            }}
            maximumDate={new Date()}
          />
        )}
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              expense && onDelete && styles.saveButtonWithDelete,
              !isValid && styles.saveButtonDisabled,
              type === 'income' && isValid && styles.saveButtonIncome,
            ]}
            onPress={handleSave}
            disabled={!isValid || isLoading}
            activeOpacity={0.9}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {expense ? 'Update' : 'Save'}
              </Text>
            )}
          </TouchableOpacity>
          {expense && onDelete && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={onDelete}
              disabled={isLoading}
              activeOpacity={0.9}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5E5',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 20,
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },

  // Type Toggle
  typeContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeButtonActiveExpense: {
    backgroundColor: '#000',
  },
  typeButtonActiveIncome: {
    backgroundColor: '#34C759',
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  typeButtonTextActive: {
    color: '#fff',
  },

  // Amount
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    backgroundColor: 'transparent',
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '300',
    color: '#C7C7CC',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 56,
    fontWeight: '700',
    color: '#000',
    minWidth: 60,
    textAlign: 'center',
  },
  amountInputIncome: {
    color: '#34C759',
  },

  // Fields
  fieldContainer: {
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  fieldButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
  },
  fieldButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  fieldButtonPlaceholder: {
    color: '#C7C7CC',
  },

  // Category Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -12,
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  categoryChipSelected: {
    backgroundColor: '#000',
  },
  categoryChipIcon: {
    fontSize: 16,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },

  // Footer
  footer: {
    padding: 24,
    paddingBottom: 40,
    backgroundColor: 'transparent',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
    flex: 1,
  },
  deleteButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FF3B30',
  },
  saveButton: {
    backgroundColor: '#000',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    flex: 1,
  },
  saveButtonWithDelete: {
    flex: 1,
  },
  saveButtonIncome: {
    backgroundColor: '#34C759',
  },
  saveButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
});
