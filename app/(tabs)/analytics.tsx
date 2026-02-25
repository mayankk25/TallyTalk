import { useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LineChart, PieChart, BarChart } from 'react-native-gifted-charts';
import { Text, View } from '@/components/Themed';
import { getExpenses } from '@/lib/api';
import { Expense } from '@/types';
import { useFocusEffect } from '@react-navigation/native';
import { useCurrency } from '@/hooks/useCurrency';

const { width } = Dimensions.get('window');
// Content padding (20) + card padding (20) on each side = 80 total
const CHART_WIDTH = width - 80;

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CATEGORY_COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#FF6384', '#C9CBCF', '#7BC225', '#E8175D',
];

type SpendingViewType = 'monthly' | 'daily';

interface SelectedDay {
  day: number;
  amount: number;
  index: number;
}

export default function AnalyticsScreen() {
  const { currency, formatCurrency, refresh: refreshCurrency } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [spendingView, setSpendingView] = useState<SpendingViewType>('daily');
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
      refreshCurrency();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const loadExpenses = async () => {
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get only expenses (not income) for spending analytics
  const spendingOnly = expenses.filter(e => e.type === 'expense' || !e.type);
  const incomeOnly = expenses.filter(e => e.type === 'income');

  // Calculate current month stats
  const now = new Date();
  const currentMonthExpenses = spendingOnly.filter(e => {
    const date = new Date(e.expense_date);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const currentMonthIncome = incomeOnly.filter(e => {
    const date = new Date(e.expense_date);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const totalSpentThisMonth = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncomeThisMonth = currentMonthIncome.reduce((sum, e) => sum + e.amount, 0);
  const avgDailySpend = totalSpentThisMonth / now.getDate();

  // Spending by category (pie chart)
  const categorySpending = currentMonthExpenses.reduce((acc, expense) => {
    const categoryName = expense.category?.name || 'Other';
    acc[categoryName] = (acc[categoryName] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categorySpending)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], index) => ({
      value,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      text: name,
      focused: index === 0,
    }));

  // Monthly spending for line chart (last 6 months)
  const getMonthlySpending = () => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      const year = date.getFullYear();

      const monthTotal = spendingOnly
        .filter(e => {
          const expDate = new Date(e.expense_date);
          return expDate.getMonth() === month && expDate.getFullYear() === year;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      result.push({
        value: monthTotal,
        label: MONTHS_SHORT[month],
      });
    }
    return result;
  };

  // Daily spending for bar chart (current month)
  const getDailySpending = () => {
    const result = [];
    const totalDays = now.getDate();

    // Determine label interval based on number of days
    const labelInterval = totalDays <= 10 ? 2 : totalDays <= 20 ? 5 : 7;

    for (let day = 1; day <= totalDays; day++) {
      const dayTotal = currentMonthExpenses
        .filter(e => {
          const expDate = new Date(e.expense_date);
          return expDate.getDate() === day;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      // Show label at intervals, plus first and last day
      const showLabel = day === 1 || day === totalDays || day % labelInterval === 0;
      const isSelected = selectedDay?.day === day;

      result.push({
        value: dayTotal,
        label: showLabel ? String(day) : '',
        frontColor: isSelected ? '#FF9500' : '#000',
        labelTextStyle: { color: '#8E8E93', fontSize: 10, textAlign: 'center' },
        onPress: () => setSelectedDay({ day, amount: dayTotal, index: day - 1 }),
      });
    }
    return result;
  };

  // Top categories
  const topCategories = Object.entries(categorySpending)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const lineData = getMonthlySpending();
  const dailyData = getDailySpending();

  // Find max daily spending for chart scaling
  const maxDailySpend = Math.max(...dailyData.map(d => d.value), 1);

  // Chart dimensions
  const barWidth = 8;
  const barSpacing = 6;
  const initialSpacing = 15;
  const yAxisWidth = 35;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingDot} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Spent this month</Text>
          <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(totalSpentThisMonth)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Daily average</Text>
          <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(avgDailySpend)}</Text>
        </View>
      </View>

      {/* Income vs Expense */}
      <View style={styles.incomeExpenseCard}>
        <View style={styles.incomeExpenseRow}>
          <View style={styles.incomeExpenseItem}>
            <View style={[styles.indicator, styles.incomeIndicator]} />
            <View style={styles.incomeExpenseTextContainer}>
              <Text style={styles.incomeExpenseLabel}>Income</Text>
              <Text style={[styles.incomeExpenseValue, styles.incomeText]} numberOfLines={1} adjustsFontSizeToFit>
                +{formatCurrency(totalIncomeThisMonth)}
              </Text>
            </View>
          </View>
          <View style={styles.incomeExpenseItem}>
            <View style={[styles.indicator, styles.expenseIndicator]} />
            <View style={styles.incomeExpenseTextContainer}>
              <Text style={styles.incomeExpenseLabel}>Expenses</Text>
              <Text style={[styles.incomeExpenseValue, styles.expenseText]} numberOfLines={1} adjustsFontSizeToFit>
                -{formatCurrency(totalSpentThisMonth)}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.balanceBar}>
          <View
            style={[
              styles.incomeBar,
              { flex: totalIncomeThisMonth || 1 }
            ]}
          />
          <View
            style={[
              styles.expenseBar,
              { flex: totalSpentThisMonth || 1 }
            ]}
          />
        </View>
      </View>

      {/* Spending Trend with Toggle */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Spending Trend</Text>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                spendingView === 'monthly' && styles.toggleButtonActive,
              ]}
              onPress={() => {
                setSpendingView('monthly');
                setSelectedDay(null);
              }}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  spendingView === 'monthly' && styles.toggleButtonTextActive,
                ]}
              >
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                spendingView === 'daily' && styles.toggleButtonActive,
              ]}
              onPress={() => setSpendingView('daily')}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  spendingView === 'daily' && styles.toggleButtonTextActive,
                ]}
              >
                Daily
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {spendingView === 'monthly' ? (
          // Monthly Line Chart
          lineData.some(d => d.value > 0) ? (
            <LineChart
              data={lineData}
              width={CHART_WIDTH - 20}
              height={180}
              spacing={40}
              color="#000"
              thickness={2}
              startFillColor="rgba(0,0,0,0.1)"
              endFillColor="rgba(0,0,0,0)"
              startOpacity={0.3}
              endOpacity={0}
              areaChart
              dataPointsColor="#000"
              dataPointsRadius={5}
              xAxisColor="#E0E0E0"
              yAxisColor="#E0E0E0"
              yAxisTextStyle={styles.axisLabel}
              xAxisLabelTextStyle={styles.monthLabel}
              hideRules
              curved
              initialSpacing={20}
              endSpacing={20}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No spending data available</Text>
            </View>
          )
        ) : (
          // Daily Bar Chart
          dailyData.length > 0 ? (
            <View>
              <View style={styles.dailyChartHeader}>
                <Text style={styles.chartSubtitle}>
                  {MONTHS_SHORT[now.getMonth()]} {now.getFullYear()}
                </Text>
                {selectedDay && (
                  <View style={styles.selectedDayInfo}>
                    <Text style={styles.selectedDayDate}>
                      {MONTHS_SHORT[now.getMonth()]} {selectedDay.day}
                    </Text>
                    <Text style={styles.selectedDayAmount}>
                      {formatCurrency(selectedDay.amount)}
                    </Text>
                  </View>
                )}
              </View>
              <View>
                <BarChart
                  data={dailyData}
                  width={CHART_WIDTH - 20}
                  height={180}
                  barWidth={barWidth}
                  spacing={barSpacing}
                  xAxisColor="#E0E0E0"
                  yAxisColor="#E0E0E0"
                  yAxisTextStyle={styles.axisLabel}
                  xAxisLabelTextStyle={styles.dayLabelCenter}
                  hideRules
                  noOfSections={4}
                  maxValue={maxDailySpend * 1.2}
                  initialSpacing={initialSpacing}
                  endSpacing={15}
                  barBorderRadius={3}
                  labelsExtraHeight={20}
                  yAxisLabelWidth={yAxisWidth}
                  autoShiftLabels
                />
              </View>
              <Text style={styles.axisTitle}>Day of Month</Text>
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No daily spending data</Text>
            </View>
          )
        )}
      </View>

      {/* Category Breakdown */}
      <View style={styles.chartCard}>
        <Text style={styles.sectionTitle}>Spending by Category</Text>
        {pieData.length > 0 ? (
          <View style={styles.pieContainer}>
            <View style={styles.pieChartWrapper}>
              <PieChart
                data={pieData}
                donut
                radius={110}
                innerRadius={70}
                innerCircleColor="#fff"
                centerLabelComponent={() => (
                  <View style={styles.pieCenter}>
                    <Text style={styles.pieCenterAmount} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(totalSpentThisMonth)}</Text>
                    <Text style={styles.pieCenterLabel}>Total</Text>
                  </View>
                )}
              />
            </View>
            <View style={styles.legendContainer}>
              {pieData.slice(0, 5).map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText} numberOfLines={1} ellipsizeMode="tail">
                    {item.text}
                  </Text>
                  <Text style={styles.legendValue} numberOfLines={1}>{formatCurrency(item.value)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No spending data</Text>
          </View>
        )}
      </View>

      {/* Top Categories */}
      <View style={styles.chartCard}>
        <Text style={styles.sectionTitle}>Top Spending Categories</Text>
        {topCategories.length > 0 ? (
          <View style={styles.topCategoriesList}>
            {topCategories.map(([name, amount], index) => {
              const percentage = (amount / totalSpentThisMonth) * 100;
              return (
                <View key={name} style={styles.topCategoryItem}>
                  <View style={styles.topCategoryRank}>
                    <Text style={styles.topCategoryRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.topCategoryInfo}>
                    <View style={styles.topCategoryHeader}>
                      <Text style={styles.topCategoryName} numberOfLines={1} ellipsizeMode="tail">{name}</Text>
                      <Text style={styles.topCategoryAmount} numberOfLines={1}>{formatCurrency(amount)}</Text>
                    </View>
                    <View style={styles.topCategoryBarBg}>
                      <View
                        style={[
                          styles.topCategoryBarFill,
                          { width: `${percentage}%` },
                          { backgroundColor: CATEGORY_COLORS[index] }
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No category data</Text>
          </View>
        )}
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
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

  // Summary Cards
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 16,
    padding: 20,
  },
  summaryLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },

  // Income vs Expense
  incomeExpenseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  incomeExpenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  incomeExpenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
    flex: 1,
  },
  incomeExpenseTextContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  indicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  incomeIndicator: {
    backgroundColor: '#34C759',
  },
  expenseIndicator: {
    backgroundColor: '#FF3B30',
  },
  incomeExpenseLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
  },
  incomeExpenseValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  incomeText: {
    color: '#34C759',
  },
  expenseText: {
    color: '#FF3B30',
  },
  balanceBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  incomeBar: {
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  expenseBar: {
    backgroundColor: '#FF3B30',
    borderRadius: 4,
  },

  // Chart Cards
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  chartSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  dailyChartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  selectedDayInfo: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedDayDate: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  selectedDayAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  chartHint: {
    fontSize: 11,
    color: '#C7C7CC',
    textAlign: 'center',
    marginTop: 8,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#000',
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  axisLabel: {
    fontSize: 10,
    color: '#8E8E93',
  },
  monthLabel: {
    fontSize: 11,
    color: '#8E8E93',
  },
  dayLabel: {
    fontSize: 9,
    color: '#8E8E93',
  },
  dayLabelCenter: {
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'center',
  },
  axisTitle: {
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  yAxisTitle: {
    fontSize: 10,
    color: '#8E8E93',
    position: 'absolute',
    left: -5,
    top: 80,
    transform: [{ rotate: '-90deg' }],
  },
  noDataContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#8E8E93',
  },

  // Pie Chart
  pieContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  pieChartWrapper: {
    marginBottom: 20,
  },
  pieCenter: {
    alignItems: 'center',
  },
  pieCenterAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  pieCenterLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  legendContainer: {
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
    fontSize: 13,
    color: '#000',
    marginRight: 8,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    flexShrink: 0,
  },

  // Top Categories
  topCategoriesList: {
    gap: 12,
  },
  topCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  topCategoryRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topCategoryRankText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  topCategoryInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  topCategoryName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    flex: 1,
    marginRight: 12,
  },
  topCategoryAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    flexShrink: 0,
  },
  topCategoryBarBg: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  topCategoryBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  bottomPadding: {
    height: 40,
  },
});
