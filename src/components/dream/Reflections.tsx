import { Card } from '@/src/components/ui';
import { useTheme } from '@/src/theme';
import { Reflection } from '@/src/types/item';
import { PenLine, Plus, Quote } from 'lucide-react-native';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ReflectionsProps {
    reflections?: Reflection[];
    onAdd?: () => void;
}

export function Reflections({ reflections = [], onAdd }: ReflectionsProps) {
    const { colors } = useTheme();

    const hasContent = reflections && reflections.length > 0;
    const canAdd = !!onAdd;

    // In read-only contexts (e.g., community), hide the section when no reflections exist.
    if (!hasContent && !canAdd) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Quote size={18} color={colors.statusDoing} />
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Reflections</Text>
                </View>
                {canAdd && (
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
                            {reflection.contentBlocks && reflection.contentBlocks.length > 0 ? (
                                <View style={styles.blocks}>
                                    {reflection.contentBlocks.map((block, idx) => (
                                        <View key={`${reflection.id}-${idx}`}>
                                            {block.type === 'text' && (
                                                <Text style={[styles.answer, { color: colors.textSecondary }]}>
                                                    {block.value}
                                                </Text>
                                            )}
                                            {block.type === 'image' && (
                                                <Image source={{ uri: block.value }} style={styles.blockImage} />
                                            )}
                                            {block.type === 'link' && (
                                                <Text style={[styles.link, { color: colors.primary }]}>
                                                    {block.caption ? `${block.caption}: ` : ''}{block.value}
                                                </Text>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <>
                                    {reflection.question && (
                                        <Text style={[styles.question, { color: colors.primary }]}>
                                            {reflection.question}
                                        </Text>
                                    )}
                                    {reflection.answer && (
                                        <Text style={[styles.answer, { color: colors.textSecondary }]}>
                                            {reflection.answer}
                                        </Text>
                                    )}
                                </>
                            )}
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
                    <PenLine size={32} color={colors.textMuted} />
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
    blocks: {
        gap: 8,
        marginBottom: 8,
    },
    blockImage: {
        width: '100%',
        height: 180,
        borderRadius: 10,
        marginBottom: 4,
    },
    link: {
        fontSize: 14,
        textDecorationLine: 'underline',
        lineHeight: 20,
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
    emptyIcon: {
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
