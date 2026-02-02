import { Input } from '@/src/components/ui';
import { useTheme } from '@/src/theme';
import { Expense } from '@/src/types/item';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface AddExpenseModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (title: string, amount: number, category: Expense['category']) => void;
}

const CATEGORIES: { id: Expense['category']; label: string; emoji: string }[] = [
    { id: 'transport', label: 'Transport', emoji: '✈️' },
    { id: 'accommodation', label: 'Stay', emoji: '🏨' },
    { id: 'food', label: 'Food', emoji: '🍽️' },
    { id: 'activities', label: 'Activities', emoji: '🎯' },
    { id: 'gear', label: 'Gear', emoji: '🎒' },
    { id: 'other', label: 'Other', emoji: '📦' },
];

export function AddExpenseModal({ visible, onClose, onSave }: AddExpenseModalProps) {
    const { colors } = useTheme();
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<Expense['category']>('other');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        const parsedAmount = parseFloat(amount);
        if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

        setLoading(true);
        try {
            await onSave(title.trim(), parsedAmount, category);
            setTitle('');
            setAmount('');
            setCategory('other');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <View style={[styles.container, { backgroundColor: colors.background }]}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: colors.textPrimary }]}>
                                Add Expense
                            </Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <X size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Category Selector */}
                        <Text style={[styles.label, { color: colors.textSecondary }]}>
                            Category
                        </Text>
                        <View style={styles.categoryGrid}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryButton,
                                        { backgroundColor: category === cat.id ? colors.primary + '20' : colors.surface },
                                        { borderColor: category === cat.id ? colors.primary : colors.border }
                                    ]}
                                    onPress={() => setCategory(cat.id)}
                                >
                                    <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                                    <Text style={[
                                        styles.categoryText,
                                        { color: category === cat.id ? colors.primary : colors.textSecondary }
                                    ]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Title */}
                        <Input
                            label="What was it for?"
                            placeholder="e.g., Round-trip flight to Bali"
                            value={title}
                            onChangeText={setTitle}
                        />

                        {/* Amount */}
                        <Input
                            label="Amount"
                            placeholder="0.00"
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                        />

                        {/* Actions */}
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={[styles.cancelButton, { borderColor: colors.border }]}
                                onPress={onClose}
                            >
                                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.saveButton,
                                    { backgroundColor: colors.primary },
                                    (!title.trim() || !amount) && { opacity: 0.5 }
                                ]}
                                onPress={handleSave}
                                disabled={!title.trim() || !amount || loading}
                            >
                                <Text style={styles.saveText}>
                                    {loading ? 'Saving...' : 'Save'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    keyboardView: {
        width: '100%',
    },
    container: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeButton: {
        padding: 4,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    categoryButton: {
        width: '31%',
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 4,
    },
    categoryEmoji: {
        fontSize: 20,
    },
    categoryText: {
        fontSize: 11,
        fontWeight: '500',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
    },
    saveButton: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
});
