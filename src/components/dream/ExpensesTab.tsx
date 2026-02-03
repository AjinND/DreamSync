/**
 * ExpensesTab - Expense tracking tab content for Dream Detail Screen
 */

import { EmptyState } from '@/src/components/shared';
import { Card } from '@/src/components/ui';
import { useTheme } from '@/src/theme';
import { BucketItem, Expense } from '@/src/types/item';
import { DollarSign, Plus } from 'lucide-react-native';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface ExpensesTabProps {
    item: BucketItem;
    isOwner: boolean;
    onAddExpense: () => void;
}

export function ExpensesTab({ item, isOwner, onAddExpense }: ExpensesTabProps) {
    const { colors } = useTheme();
    const totalExpenses = item.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

    if (item.phase === 'dream') {
        return (
            <EmptyState
                icon={DollarSign}
                title="Start your journey first"
                description="Move this dream to 'Doing' to track expenses"
            />
        );
    }

    return (
        <View style={styles.container}>
            {/* Budget Summary */}
            <Card style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
                <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Spent</Text>
                    <Text style={[styles.summaryAmount, { color: colors.textPrimary }]}>
                        ${totalExpenses.toFixed(2)}
                    </Text>
                </View>
                {item.budget && (
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Budget</Text>
                        <Text style={[styles.summaryAmount, { color: colors.primary }]}>
                            ${item.budget.toFixed(2)}
                        </Text>
                    </View>
                )}
            </Card>

            {isOwner && (
                <TouchableOpacity
                    style={[styles.addButton, { borderColor: colors.primary }]}
                    onPress={onAddExpense}
                >
                    <Plus size={18} color={colors.primary} />
                    <Text style={[styles.addButtonText, { color: colors.primary }]}>Add Expense</Text>
                </TouchableOpacity>
            )}

            {item.expenses && item.expenses.length > 0 ? (
                item.expenses.map((expense: Expense) => (
                    <Card key={expense.id} style={[styles.expenseCard, { backgroundColor: colors.surface }]}>
                        <View style={styles.expenseLeft}>
                            <View style={[styles.expenseIcon, { backgroundColor: colors.primary + '15' }]}>
                                <DollarSign size={16} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={[styles.expenseTitle, { color: colors.textPrimary }]}>
                                    {expense.title}
                                </Text>
                                <Text style={[styles.expenseCategory, { color: colors.textMuted }]}>
                                    {expense.category}
                                </Text>
                            </View>
                        </View>
                        <Text style={[styles.expenseAmount, { color: colors.textPrimary }]}>
                            ${expense.amount.toFixed(2)}
                        </Text>
                    </Card>
                ))
            ) : (
                <EmptyState
                    icon={DollarSign}
                    title="No expenses tracked"
                    description="Keep track of what you spend on this dream"
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
    summaryCard: {
        padding: 16,
        borderRadius: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    summaryLabel: {
        fontSize: 15,
    },
    summaryAmount: {
        fontSize: 18,
        fontWeight: '700',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderRadius: 12,
        gap: 8,
    },
    addButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    expenseCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
    },
    expenseLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    expenseIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expenseTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    expenseCategory: {
        fontSize: 12,
        textTransform: 'capitalize',
    },
    expenseAmount: {
        fontSize: 16,
        fontWeight: '600',
    },
});
