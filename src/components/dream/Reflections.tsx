import { Card } from '@/src/components/ui';
import { useTheme } from '@/src/theme';
import { Reflection } from '@/src/types/item';
import { Plus, Quote } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ReflectionsProps {
    reflections?: Reflection[];
    onAdd?: () => void;
}

export function Reflections({ reflections = [], onAdd }: ReflectionsProps) {
    const { colors } = useTheme();

    const hasContent = reflections && reflections.length > 0;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Quote size={18} color={colors.statusDoing} />
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Reflections</Text>
                </View>
                {onAdd && (
                    <TouchableOpacity onPress={onAdd} style={[styles.addButton, { backgroundColor: colors.statusDoing + '15' }]}>
                        <Plus size={16} color={colors.statusDoing} />
                    </TouchableOpacity>
                )}
            </View>

            {hasContent ? (
                <>
                    {reflections.map((reflection) => (
                        <Card
                            key={reflection.id}
                            style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: colors.statusDoing }]}
                            padding="md"
                        >
                            <Text style={[styles.question, { color: colors.primary }]}>
                                {reflection.question}
                            </Text>
                            <Text style={[styles.answer, { color: colors.textSecondary }]}>
                                {reflection.answer}
                            </Text>
                            <Text style={[styles.date, { color: colors.textMuted }]}>
                                {new Date(reflection.date).toLocaleDateString()}
                            </Text>
                        </Card>
                    ))}
                </>
            ) : (
                <TouchableOpacity
                    style={[styles.emptyState, { borderColor: colors.border }]}
                    onPress={onAdd}
                >
                    <Text style={styles.emptyEmoji}>✍️</Text>
                    <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                        Time to reflect
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                        What did this dream mean to you?
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    addButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        marginBottom: 12,
        borderLeftWidth: 3,
    },
    question: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
    },
    answer: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 8,
    },
    date: {
        fontSize: 12,
    },
    emptyState: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyEmoji: {
        fontSize: 32,
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    emptySubtitle: {
        fontSize: 14,
    },
});
