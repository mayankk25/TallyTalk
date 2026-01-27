import { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  SectionList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View } from '@/components/Themed';
import EditExpenseModal from '@/components/EditExpenseModal';
import VoiceRecorder from '@/components/VoiceRecorder';
import ExpenseReview from '@/components/ExpenseReview';
import OnboardingModal from '@/components/OnboardingModal';
import { hasCompletedOnboarding, setOnboardingComplete, getVoiceLanguage } from '@/lib/storage';
import {
  getExpenses,
  deleteExpense,
  getMonthlySummary,
  MonthlySummary,
  parseVoiceExpenses,
  saveMultipleExpenses,
} from '@/lib/api';
import { Expense, ParsedExpense } from '@/types';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDeepLink } from '../_layout';
import { useCurrency } from '@/hooks/useCurrency';

const { width } = Dimensions.get('window');

interface DaySection {
  title: string;
  date: Date;
  data: Expense[];
}

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ openRecorder?: string }>();
  const { shouldOpenRecorder, clearRecorderFlag } = useDeepLink();
  const { currency, formatCurrency, formatAmount, refresh: refreshCurrency } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Voice recording state
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedExpenses, setParsedExpenses] = useState<ParsedExpense[]>([]);
  const [transcript, setTranscript] = useState('');
  const [voiceScreen, setVoiceScreen] = useState<'record' | 'review'>('record');

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Handle deep link from widget (via context)
  useEffect(() => {
    if (shouldOpenRecorder && !loading) {
      setShowVoiceModal(true);
      clearRecorderFlag();
    }
  }, [shouldOpenRecorder, loading, clearRecorderFlag]);

  // Handle deep link from widget (via URL param)
  useEffect(() => {
    if (params.openRecorder === 'true' && !loading) {
      setShowVoiceModal(true);
      // Clear the param by replacing with clean URL
      router.replace('/(tabs)');
    }
  }, [params.openRecorder, loading]);

  // Check onboarding status on mount
  useEffect(() => {
    const checkOnboarding = async () => {
      const completed = await hasCompletedOnboarding();
      if (!completed) {
        setShowOnboarding(true);
      }
    };
    checkOnboarding();
  }, []);

  const handleOnboardingComplete = async () => {
    await setOnboardingComplete();
    setShowOnboarding(false);
  };

  const loadData = async () => {
    try {
      const [expensesData, summaryData] = await Promise.all([
        getExpenses(),
        getMonthlySummary(),
      ]);
      setExpenses(expensesData);
      setSummary(summaryData);

      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      refreshCurrency();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Group expenses by day
  const getSections = (): DaySection[] => {
    const grouped: { [key: string]: Expense[] } = {};

    // Sort expenses by date descending first
    const sortedExpenses = [...expenses].sort(
      (a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
    );

    sortedExpenses.forEach(expense => {
      const dateKey = expense.expense_date.split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(expense);
    });

    return Object.keys(grouped)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(dateKey => ({
        title: dateKey,
        date: new Date(dateKey),
        data: grouped[dateKey],
      }));
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
              setExpenses(prev => prev.filter(e => e.id !== id));
              loadData();
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
    setExpenses(prev => prev.map(e => (e.id === updated.id ? updated : e)));
    loadData();
  };

  const handleExpenseDeleted = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    loadData();
  };

  // Voice recording handlers
  const handleRecordingComplete = async (uri: string) => {
    setIsProcessing(true);
    try {
      const language = await getVoiceLanguage();
      const result = await parseVoiceExpenses(uri, language);
      setParsedExpenses(result.expenses);
      setTranscript(result.transcript);
      setVoiceScreen('review');
    } catch (error: any) {
      console.error('Failed to parse voice:', error);
      Alert.alert('Error', error.message || 'Failed to process recording');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceConfirm = async (expenses: ParsedExpense[]) => {
    setIsSaving(true);
    try {
      const expensesToSave = expenses.map(exp => ({
        amount: exp.amount,
        description: exp.description,
        category_id: exp.category_id || null,
        voice_transcript: transcript,
        type: exp.type || 'expense',
      }));

      await saveMultipleExpenses(expensesToSave);
      const incomeCount = expenses.filter(e => e.type === 'income').length;
      const expenseCount = expenses.filter(e => e.type !== 'income').length;
      let message = '';
      if (incomeCount > 0 && expenseCount > 0) {
        message = `${incomeCount} income and ${expenseCount} expense${expenseCount !== 1 ? 's' : ''} added`;
      } else if (incomeCount > 0) {
        message = `${incomeCount} income${incomeCount !== 1 ? 's' : ''} added`;
      } else {
        message = `${expenseCount} expense${expenseCount !== 1 ? 's' : ''} added`;
      }
      Alert.alert('Saved', message);
      resetVoiceModal();
      loadData();
    } catch (error: any) {
      console.error('Failed to save:', error);
      Alert.alert('Error', error.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const resetVoiceModal = () => {
    setShowVoiceModal(false);
    setVoiceScreen('record');
    setParsedExpenses([]);
    setTranscript('');
  };

  const formatDateHeader = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
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
    </Animated.View>
  );

  const renderSectionHeader = ({ section }: { section: DaySection }) => (
    <View style={styles.daySectionHeader}>
      <Text style={styles.daySectionTitle}>{formatDateHeader(section.date)}</Text>
    </View>
  );

  const renderHeader = () => (
    <Animated.View
      style={[
        styles.headerContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>
          {summary?.month} Balance
        </Text>
        <Text style={[
          styles.balanceAmount,
          (summary?.balance || 0) < 0 && styles.negativeBalance
        ]}>
          {formatCurrency(Math.abs(summary?.balance || 0))}
        </Text>
        {(summary?.balance || 0) < 0 && (
          <Text style={styles.balanceNote}>over budget</Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={styles.statDot} />
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Income</Text>
              <Text style={styles.statValue}>
                {formatCurrency(summary?.totalIncome || 0, 0)}
              </Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statDot, styles.expenseDot]} />
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Spent</Text>
              <Text style={styles.statValue}>
                {formatCurrency(summary?.totalExpenses || 0, 0)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Transactions Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Transactions</Text>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => router.push('/transactions')}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <FontAwesome name="chevron-right" size={12} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <FontAwesome name="inbox" size={32} color="#C7C7CC" />
      </View>
      <Text style={styles.emptyTitle}>No transactions yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the mic button to add your first expense
      </Text>
    </View>
  );

  const sections = getSections();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingDot} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={renderExpense}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#000"
          />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowVoiceModal(true)}
        activeOpacity={0.9}
      >
        <FontAwesome name="microphone" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Voice Recording Modal - only render content when visible to prevent auto-start */}
      {showVoiceModal && (
        <Modal
          visible={showVoiceModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={resetVoiceModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={resetVoiceModal}
            >
              <FontAwesome name="times" size={20} color="#8E8E93" />
            </TouchableOpacity>

            {voiceScreen === 'record' ? (
              <View style={styles.voiceContainer}>
                <Text style={styles.voiceTitle}>Add Transaction</Text>
                <Text style={styles.voiceSubtitle}>
                  Say something like "Spent $20 on lunch" or "Received $500 salary"
                </Text>
                <View style={styles.recorderWrapper}>
                  <VoiceRecorder
                    onRecordingComplete={handleRecordingComplete}
                    isProcessing={isProcessing}
                    autoStart={true}
                  />
                </View>
              </View>
            ) : (
              <ExpenseReview
                expenses={parsedExpenses}
                transcript={transcript}
                onConfirm={handleVoiceConfirm}
                onCancel={resetVoiceModal}
                isLoading={isSaving}
              />
            )}
          </View>
        </Modal>
      )}

      {/* Edit Modal */}
      <EditExpenseModal
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onUpdated={handleExpenseUpdated}
        onDeleted={handleExpenseDeleted}
      />

      {/* Onboarding Modal */}
      <OnboardingModal
        visible={showOnboarding}
        onComplete={handleOnboardingComplete}
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
  list: {
    paddingBottom: 100,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },

  // Balance Card
  balanceCard: {
    backgroundColor: '#000',
    borderRadius: 24,
    padding: 28,
    marginBottom: 32,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: 4,
  },
  negativeBalance: {
    color: '#FF6B6B',
  },
  balanceNote: {
    color: '#FF6B6B',
    fontSize: 13,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'transparent',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  expenseDot: {
    backgroundColor: '#FF6B6B',
  },
  statContent: {
    backgroundColor: 'transparent',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#007AFF',
  },

  // Day Section Header
  daySectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FAFAFA',
  },
  daySectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5E5',
    alignSelf: 'center',
    marginTop: 12,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  voiceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  voiceTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  voiceSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 48,
  },
  recorderWrapper: {
    alignItems: 'center',
  },
});
