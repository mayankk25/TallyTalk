import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SectionList,
  Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import EditExpenseModal from '@/components/EditExpenseModal';
import { getExpenses, deleteExpense } from '@/lib/api';
import { Expense } from '@/types';
import { useCurrency } from '@/hooks/useCurrency';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type ViewMode = 'list' | 'daily';

interface DailySection {
  title: string;
  date: Date;
  dayTotal: { income: number; expense: number };
  data: Expense[];
}

export default function TransactionsScreen() {
  const router = useRouter();
  const { currency, formatCurrency, formatAmount } = useCurrency();
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    loadExpenses();
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [allExpenses, selectedMonth, selectedYear, filterType]);

  const loadExpenses = async () => {
    try {
      const data = await getExpenses();
      setAllExpenses(data);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterExpenses = () => {
    let filtered = allExpenses.filter(expense => {
      const expenseDate = new Date(expense.expense_date);
      return (
        expenseDate.getMonth() === selectedMonth &&
        expenseDate.getFullYear() === selectedYear
      );
    });

    if (filterType !== 'all') {
      filtered = filtered.filter(expense => expense.type === filterType);
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());

    setFilteredExpenses(filtered);
  };

  // Group expenses by day for daily view
  const getDailySections = (): DailySection[] => {
    const grouped: { [key: string]: Expense[] } = {};

    filteredExpenses.forEach(expense => {
      const dateKey = expense.expense_date.split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(expense);
    });

    const sections: DailySection[] = Object.keys(grouped)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(dateKey => {
        const expenses = grouped[dateKey];
        const date = new Date(dateKey);
        const income = expenses
          .filter(e => e.type === 'income')
          .reduce((sum, e) => sum + e.amount, 0);
        const expense = expenses
          .filter(e => e.type === 'expense' || !e.type)
          .reduce((sum, e) => sum + e.amount, 0);

        return {
          title: dateKey,
          date,
          dayTotal: { income, expense },
          data: expenses,
        };
      });

    return sections;
  };

  // Swipe-to-delete handler
  const handleSwipeDelete = (id: string) => {
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
              await deleteExpense(id);
              setAllExpenses(prev => prev.filter(e => e.id !== id));
            } catch (error) {
              console.error('Failed to delete:', error);
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  };

  // Callbacks for EditExpenseModal
  const handleExpenseUpdated = (updated: Expense) => {
    setAllExpenses(prev => prev.map(e => (e.id === updated.id ? updated : e)));
  };

  const handleExpenseDeleted = (id: string) => {
    setAllExpenses(prev => prev.filter(e => e.id !== id));
  };

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const goToNextMonth = () => {
    const now = new Date();
    const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
    if (isCurrentMonth) return;

    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const isNextDisabled = () => {
    const now = new Date();
    return selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
  };

  const getTotals = () => {
    const income = filteredExpenses
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);
    const expenses = filteredExpenses
      .filter(e => e.type === 'expense' || !e.type)
      .reduce((sum, e) => sum + e.amount, 0);
    return { income, expenses, balance: income - expenses };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDayHeader = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    const dayName = DAYS_OF_WEEK[date.getDay()];
    const monthName = MONTHS_SHORT[date.getMonth()];
    return `${dayName}, ${monthName} ${date.getDate()}`;
  };

  const renderRightActions = (id: string) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => handleSwipeDelete(id)}
    >
      <FontAwesome name="trash-o" size={18} color="#fff" />
    </TouchableOpacity>
  );

  const renderExpense = ({ item }: { item: Expense }) => (
    <Swipeable renderRightActions={() => renderRightActions(item.id)}>
      <TouchableOpacity
        style={styles.transactionCard}
        onPress={() => setEditingExpense(item)}
        activeOpacity={0.7}
      >
        <View style={styles.transactionIcon}>
          <Text style={styles.transactionEmoji}>
            {item.category?.icon || (item.type === 'income' ? '💰' : '📦')}
          </Text>
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionTitle} numberOfLines={1}>
            {item.description || (item.type === 'income' ? 'Income' : 'Expense')}
          </Text>
          <Text style={styles.transactionCategory}>
            {item.category?.name || 'Uncategorized'} · {formatDate(item.expense_date)}
          </Text>
        </View>
        <Text style={[
          styles.transactionAmount,
          item.type === 'income' && styles.incomeAmount
        ]}>
          {item.type === 'income' ? '+' : '-'}{currency.symbol}{formatAmount(item.amount)}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );

  const renderDailyExpense = ({ item }: { item: Expense }) => (
    <Swipeable renderRightActions={() => renderRightActions(item.id)}>
      <TouchableOpacity
        style={styles.dailyTransactionCard}
        onPress={() => setEditingExpense(item)}
        activeOpacity={0.7}
      >
        <View style={styles.transactionIcon}>
          <Text style={styles.transactionEmoji}>
            {item.category?.icon || (item.type === 'income' ? '💰' : '📦')}
          </Text>
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionTitle} numberOfLines={1}>
            {item.description || (item.type === 'income' ? 'Income' : 'Expense')}
          </Text>
          <Text style={styles.transactionCategory}>
            {item.category?.name || 'Uncategorized'}
          </Text>
        </View>
        <Text style={[
          styles.transactionAmount,
          item.type === 'income' && styles.incomeAmount
        ]}>
          {item.type === 'income' ? '+' : '-'}{currency.symbol}{formatAmount(item.amount)}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );

  const renderSectionHeader = ({ section }: { section: DailySection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{formatDayHeader(section.date)}</Text>
      <View style={styles.sectionTotals}>
        {section.dayTotal.income > 0 && (
          <Text style={styles.sectionIncome}>+{currency.symbol}{formatAmount(section.dayTotal.income, 0)}</Text>
        )}
        {section.dayTotal.expense > 0 && (
          <Text style={styles.sectionExpense}>-{currency.symbol}{formatAmount(section.dayTotal.expense, 0)}</Text>
        )}
      </View>
    </View>
  );

  const totals = getTotals();
  const dailySections = getDailySections();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingDot} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Handle Bar */}
      <View style={styles.handleBar} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Transactions</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <FontAwesome name="times" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthArrow}>
          <FontAwesome name="chevron-left" size={16} color="#000" />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {MONTHS[selectedMonth]} {selectedYear}
        </Text>
        <TouchableOpacity
          onPress={goToNextMonth}
          style={[styles.monthArrow, isNextDisabled() && styles.monthArrowDisabled]}
          disabled={isNextDisabled()}
        >
          <FontAwesome name="chevron-right" size={16} color={isNextDisabled() ? '#C7C7CC' : '#000'} />
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryValue, styles.incomeValue]}>
              +{currency.symbol}{formatAmount(totals.income)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={[styles.summaryValue, styles.expenseValue]}>
              -{currency.symbol}{formatAmount(totals.expenses)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Balance</Text>
            <Text style={[
              styles.summaryValue,
              totals.balance >= 0 ? styles.incomeValue : styles.expenseValue
            ]}>
              {currency.symbol}{formatAmount(totals.balance)}
            </Text>
          </View>
        </View>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.controlsRow}>
        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, filterType === 'all' && styles.filterTabActive]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterTabText, filterType === 'all' && styles.filterTabTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filterType === 'expense' && styles.filterTabActive]}
            onPress={() => setFilterType('expense')}
          >
            <Text style={[styles.filterTabText, filterType === 'expense' && styles.filterTabTextActive]}>
              Expenses
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filterType === 'income' && styles.filterTabActiveIncome]}
            onPress={() => setFilterType('income')}
          >
            <Text style={[styles.filterTabText, filterType === 'income' && styles.filterTabTextActive]}>
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <FontAwesome name="list" size={14} color={viewMode === 'list' ? '#fff' : '#8E8E93'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'daily' && styles.viewToggleButtonActive]}
            onPress={() => setViewMode('daily')}
          >
            <FontAwesome name="calendar" size={14} color={viewMode === 'daily' ? '#fff' : '#8E8E93'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Transactions List */}
      {viewMode === 'list' ? (
        <FlatList
          data={filteredExpenses}
          keyExtractor={item => item.id}
          renderItem={renderExpense}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <FontAwesome name="inbox" size={32} color="#C7C7CC" />
              <Text style={styles.emptyText}>No transactions for this month</Text>
            </View>
          }
        />
      ) : (
        <SectionList
          sections={dailySections}
          keyExtractor={item => item.id}
          renderItem={renderDailyExpense}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <FontAwesome name="inbox" size={32} color="#C7C7CC" />
              <Text style={styles.emptyText}>No transactions for this month</Text>
            </View>
          }
        />
      )}

      {/* Edit Modal */}
      <EditExpenseModal
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onUpdated={handleExpenseUpdated}
        onDeleted={handleExpenseDeleted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000',
  },

  // Handle Bar
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginTop: 12,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Month Selector
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 20,
    backgroundColor: 'transparent',
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  monthArrowDisabled: {
    opacity: 0.5,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    minWidth: 150,
    textAlign: 'center',
  },

  // Summary Card
  summaryCard: {
    marginHorizontal: 20,
    marginVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#F0F0F0',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  incomeValue: {
    color: '#34C759',
  },
  expenseValue: {
    color: '#FF3B30',
  },

  // Controls Row
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },

  // Filter Tabs
  filterTabs: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  filterTabActive: {
    backgroundColor: '#000',
  },
  filterTabActiveIncome: {
    backgroundColor: '#34C759',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  filterTabTextActive: {
    color: '#fff',
  },

  // View Toggle
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 4,
  },
  viewToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewToggleButtonActive: {
    backgroundColor: '#000',
  },

  // Section Header (Daily View)
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  sectionTotals: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  sectionIncome: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34C759',
  },
  sectionExpense: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF3B30',
  },

  // List
  list: {
    paddingBottom: 40,
  },

  // Transaction Card
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  dailyTransactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  transactionEmoji: {
    fontSize: 20,
  },
  transactionDetails: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 3,
  },
  transactionCategory: {
    fontSize: 13,
    color: '#8E8E93',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  incomeAmount: {
    color: '#34C759',
  },

  // Delete Action
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    marginBottom: 8,
    marginRight: 20,
    borderRadius: 16,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
  },
});
