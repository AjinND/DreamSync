import { Input } from '@/src/components/ui';
import { useTheme } from '@/src/theme';
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

interface AddReflectionModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (question: string, answer: string) => void;
}

const SAMPLE_QUESTIONS = [
    "Why did this dream matter to me?",
    "What did I learn from this experience?",
    "How has this changed me as a person?",
    "What would I do differently next time?",
    "Who helped me achieve this dream?",
];

export function AddReflectionModal({ visible, onClose, onSave }: AddReflectionModalProps) {
    const { colors } = useTheme();
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!question.trim() || !answer.trim()) return;
        setLoading(true);
        try {
            await onSave(question.trim(), answer.trim());
            setQuestion('');
            setAnswer('');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const selectQuestion = (q: string) => {
        setQuestion(q);
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
                                Add Reflection
                            </Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <X size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Sample Questions */}
                        <Text style={[styles.label, { color: colors.textSecondary }]}>
                            Pick a question or write your own:
                        </Text>
                        <View style={styles.questionsContainer}>
                            {SAMPLE_QUESTIONS.map((q, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[
                                        styles.questionChip,
                                        { backgroundColor: question === q ? colors.primary + '20' : colors.surface },
                                        { borderColor: question === q ? colors.primary : colors.border }
                                    ]}
                                    onPress={() => selectQuestion(q)}
                                >
                                    <Text style={[
                                        styles.questionChipText,
                                        { color: question === q ? colors.primary : colors.textSecondary }
                                    ]}>
                                        {q}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Custom Question */}
                        <Input
                            label="Question"
                            placeholder="Or type your own question..."
                            value={question}
                            onChangeText={setQuestion}
                        />

                        {/* Answer */}
                        <Input
                            label="Your Answer"
                            placeholder="Write your reflection..."
                            value={answer}
                            onChangeText={setAnswer}
                            multiline
                            numberOfLines={4}
                            style={{ minHeight: 100, textAlignVertical: 'top' }}
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
                                    (!question.trim() || !answer.trim()) && { opacity: 0.5 }
                                ]}
                                onPress={handleSave}
                                disabled={!question.trim() || !answer.trim() || loading}
                            >
                                <Text style={styles.saveText}>
                                    {loading ? 'Saving...' : 'Save Reflection'}
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
        marginBottom: 12,
    },
    questionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    questionChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    questionChipText: {
        fontSize: 12,
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
