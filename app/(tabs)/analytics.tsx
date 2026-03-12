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
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CATEGORY_COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#FF6384', '#C9CBCF', '#7BC225', '#E8175D',
];

type SpendingViewType = 'week' | 'daily' | 'monthly';

export default function AnalyticsScreen() {
  const { currency, formatCurrency, refresh: refreshCurrency } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [spendingView, setSpendingView] = useState<SpendingViewType>('week');

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

  // Compact y-axis formatter
  const formatChartYLabel = useCallback((label: string) => {
    const num = parseFloat(label);
    if (isNaN(num) || num === 0) return '0';
    if (num >= 1000) {
      const k = num / 1000;
      return k % 1 === 0 ? `${k.toFixed(0)}K` : `${k.toFixed(1)}K`;
    }
    return Math.round(num).toString();
  }, []);

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

  // Last 7 days bar chart data
  const getWeeklySpending = () => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayOfWeek = date.getDay();
      const dayOfMonth = date.getDate();
      const month = date.getMonth();
      const year = date.getFullYear();

      const dayTotal = spendingOnly
        .filter(e => {
          const expDate = new Date(e.expense_date);
          return expDate.getDate() === dayOfMonth &&
                 expDate.getMonth() === month &&
                 expDate.getFullYear() === year;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      result.push({
        value: dayTotal,
        label: DAY_NAMES[dayOfWeek],
        labelTextStyle: { color: '#B0B0B0', fontSize: 10, textAlign: 'center' as const },
      });
    }
    return result;
  };

  // Current month daily line chart data
  const getDailySpending = () => {
    const result = [];
    const totalDays = now.getDate();
    // Adaptive label interval based on how many days we have
    const labelInterval = totalDays <= 10 ? 1 : totalDays <= 20 ? 3 : 5;

    for (let day = 1; day <= totalDays; day++) {
      const dayTotal = currentMonthExpenses
        .filter(e => new Date(e.expense_date).getDate() === day)
        .reduce((sum, e) => sum + e.amount, 0);

      const showLabel = totalDays <= 10
        ? true
        : day === 1 || day === totalDays || day % labelInterval === 0;
      result.push({
        value: dayTotal,
        label: showLabel ? String(day) : '',
        labelTextStyle: { color: '#B0B0B0', fontSize: 10, textAlign: 'center' as const },
      });
    }
    return result;
  };

  // Top categories
  const topCategories = Object.entries(categorySpending)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const lineData = getMonthlySpending();
  const weekData = getWeeklySpending();
  const dailyData = getDailySpending();

  const maxWeekSpend = Math.max(...weekData.map(d => d.value), 1);

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
        <Text style={styles.chartTitle}>Spending Trend</Text>
        <View style={styles.viewToggle}>
          {(['week', 'daily', 'monthly'] as SpendingViewType[]).map((view) => (
            <TouchableOpacity
              key={view}
              style={[
                styles.toggleButton,
                spendingView === view && styles.toggleButtonActive,
              ]}
              onPress={() => setSpendingView(view)}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  spendingView === view && styles.toggleButtonTextActive,
                ]}
              >
                {view === 'week' ? '7 Days' : view === 'daily' ? 'Daily' : 'Monthly'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {spendingView === 'week' ? (
          // 7 Days Bar Chart
          weekData.length > 0 ? (
            <View style={{ backgroundColor: 'transparent' }}>
              <View style={styles.dailyChartHeader}>
                <Text style={styles.chartSubtitle}>Last 7 days</Text>
              </View>
              <View style={{ backgroundColor: 'transparent' }}>
                <BarChart
                  data={weekData}
                  height={180}
                  adjustToWidth
                  parentWidth={CHART_WIDTH - 20}
                  xAxisColor="#E0E0E0"
                  yAxisColor="#E0E0E0"
                  yAxisTextStyle={styles.axisLabel}
                  hideRules
                  noOfSections={4}
                  maxValue={maxWeekSpend * 1.2}
                  barBorderRadius={3}
                  labelsExtraHeight={20}
                  yAxisLabelWidth={50}
                  autoShiftLabels
                  formatYLabel={formatChartYLabel}
                  yAxisLabelPrefix={currency.symbol}
                  focusBarOnPress
                  focusedBarConfig={{ color: '#FF9500' }}
                  renderTooltip={(item: any) => (
                    <View style={styles.tooltip}>
                      <Text style={styles.tooltipText}>{formatCurrency(item.value)}</Text>
                    </View>
                  )}
                />
              </View>
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No spending data</Text>
            </View>
          )
        ) : (
          // Line Chart (Daily or Monthly)
          (() => {
            const chartData = spendingView === 'daily' ? dailyData : lineData;
            const subtitle = spendingView === 'daily'
              ? `${MONTHS_SHORT[now.getMonth()]} ${now.getFullYear()}`
              : undefined;
            const spacing = spendingView === 'daily'
              ? Math.max(8, (CHART_WIDTH - 90) / Math.max(chartData.length - 1, 1))
              : 40;

            return chartData.some(d => d.value > 0) ? (
              <View style={{ backgroundColor: 'transparent' }}>
                {subtitle && (
                  <View style={styles.dailyChartHeader}>
                    <Text style={styles.chartSubtitle}>{subtitle}</Text>
                  </View>
                )}
                <LineChart
                  data={chartData}
                  width={CHART_WIDTH - 20}
                  height={180}
                  spacing={spacing}
                  color="#000"
                  thickness={2}
                  startFillColor="rgba(0,0,0,0.1)"
                  endFillColor="rgba(0,0,0,0)"
                  startOpacity={0.2}
                  endOpacity={0}
                  areaChart
                  dataPointsColor="#000"
                  dataPointsRadius={spendingView === 'daily' ? 3 : 4}
                  xAxisColor="#E0E0E0"
                  yAxisColor="transparent"
                  yAxisTextStyle={styles.axisLabel}
                  xAxisLabelTextStyle={styles.monthLabel}
                  hideRules={false}
                  rulesType="dashed"
                  rulesColor="#F0F0F0"
                  curved={false}
                  initialSpacing={20}
                  endSpacing={20}
                  formatYLabel={formatChartYLabel}
                  yAxisLabelPrefix={currency.symbol}
                  yAxisLabelWidth={50}
                  noOfSections={4}
                  pointerConfig={{
                    pointerStripColor: 'rgba(0,0,0,0.1)',
                    pointerStripWidth: 1,
                    pointerColor: '#000',
                    radius: 5,
                    pointerLabelWidth: 120,
                    pointerLabelHeight: 30,
                    pointerLabelComponent: (items: any) => (
                      <View style={styles.tooltip}>
                        <Text style={styles.tooltipText}>{formatCurrency(items[0].value)}</Text>
                      </View>
                    ),
                  }}
                />
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No spending data available</Text>
              </View>
            );
          })()
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
                    <Text style={styles.pieCenterLabel}>{MONTHS_SHORT[now.getMonth()]}</Text>
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
    backgroundColor: 'transparent',
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
    backgroundColor: 'transparent',
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
  chartTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 20,
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
  viewToggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 2,
    marginBottom: 14,
  },
  toggleButton: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  toggleButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },
  toggleButtonTextActive: {
    color: '#000',
  },

  // Tooltip
  tooltip: {
    backgroundColor: '#000',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  axisLabel: {
    fontSize: 10,
    color: '#B0B0B0',
  },
  monthLabel: {
    fontSize: 11,
    color: '#B0B0B0',
  },
  noDataContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  noDataText: {
    fontSize: 14,
    color: '#8E8E93',
  },

  // Pie Chart
  pieContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  pieChartWrapper: {
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  pieCenter: {
    alignItems: 'center',
    backgroundColor: 'transparent',
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
    backgroundColor: 'transparent',
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
    backgroundColor: 'transparent',
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
    backgroundColor: 'transparent',
  },
});
