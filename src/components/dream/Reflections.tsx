import { Card } from '@/src/components/ui';
import { useTheme } from '@/src/theme';
import { Reflection } from '@/src/types/item';
import { Quote } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

interface ReflectionsProps {
    reflections?: Reflection[];
    onAdd?: () => void;
}

export function Reflections({ reflections = [], onAdd }: ReflectionsProps) {
    const { colors } = useTheme();

    if (!reflections || reflections.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Quote size={18} color={colors.statusDoing} />
                <Text style={[styles.title, { color: colors.textPrimary }]}>Reflections</Text>
            </View>

            {reflections.map((reflection) => (
                <Card key={reflection.id} style={[styles.card, { backgroundColor: colors.surface }]} padding="md">
                    <Text style={[styles.question, { color: colors.primary }]}>
                        {reflection.question}
                    </Text>
                    <Text style={[styles.answer, { color: colors.textSecondary }]}>
                        {reflection.answer}
                    </Text>
                </Card>
            ))}
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
        gap: 8,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    card: {
        marginBottom: 12,
        backgroundColor: '#FEFBF6', // Force warm cream for reflections if needed, or use surface
        borderLeftWidth: 3,
        borderLeftColor: '#FBBF24', // Accent color for reflection strip
    },
    question: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
    },
    answer: {
        fontSize: 16,
        lineHeight: 24,
    },
});
